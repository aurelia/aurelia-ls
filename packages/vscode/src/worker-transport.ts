import { Worker } from "node:worker_threads";
import {
  AbstractMessageReader,
  AbstractMessageWriter,
  CancellationReceiverStrategy,
  Disposable,
  SharedArraySenderStrategy,
  type CancellationStrategy,
  type DataCallback,
  type Message,
} from "vscode-jsonrpc/node";
import type { MessageTransports } from "vscode-languageclient/node";

export const EXPERIMENTAL_WORKER_TRANSPORT_ENV = "AURELIA_LS_EXPERIMENTAL_WORKER_TRANSPORT";
export const FORCE_IPC_TRANSPORT_ENV = "AURELIA_LS_FORCE_IPC_TRANSPORT";

const DEFAULT_WORKER_SHUTDOWN_GRACE_MS = 2_000;
const DEBUG_FLAGS = new Set(["--debug", "--debug-brk", "--inspect", "--inspect-brk"]);

export type ExperimentalWorkerTransportEvent =
  | { readonly type: "online" }
  | { readonly type: "stdout"; readonly text: string }
  | { readonly type: "stderr"; readonly text: string }
  | { readonly type: "error"; readonly error: Error }
  | { readonly type: "exit"; readonly code: number }
  | { readonly type: "force-terminate"; readonly graceMilliseconds: number };

export interface ExperimentalWorkerTransportOptions {
  readonly shutdownGraceMilliseconds?: number;
  readonly createWorker?: (serverModule: string) => Worker;
  readonly onEvent?: (event: ExperimentalWorkerTransportEvent) => void;
}

export interface ExperimentalWorkerMessageTransports extends MessageTransports {
  /** Resolves once for either a graceful or abnormal Worker exit. */
  readonly exited: Promise<number>;
  /** Immediate, idempotent cleanup without exposing the underlying Worker. */
  terminate(): Promise<number>;
}

/** The worker experiment is deliberately excluded from debugging and emergency IPC sessions. */
export function shouldUseExperimentalWorkerTransport(
  env: Readonly<Record<string, string | undefined>> = process.env,
  execArgv: readonly string[] = process.execArgv,
): boolean {
  return env[FORCE_IPC_TRANSPORT_ENV] !== "1"
    && env[EXPERIMENTAL_WORKER_TRANSPORT_ENV] === "1"
    && !execArgv.some(isNodeDebugFlag);
}

/** Client half of the asymmetric shared-array cancellation contract. */
export function createExperimentalWorkerCancellationStrategy(): CancellationStrategy {
  return {
    receiver: CancellationReceiverStrategy.Message,
    sender: new SharedArraySenderStrategy(),
  };
}

/**
 * Start one language-server worker for one language-client session.
 *
 * The LSP shutdown/exit sequence remains authoritative. A delayed termination
 * is only a backstop when a worker does not retire after its connection ends.
 */
export function createExperimentalWorkerMessageTransports(
  serverModule: string,
  options: ExperimentalWorkerTransportOptions = {},
): ExperimentalWorkerMessageTransports {
  const shutdownGraceMilliseconds = options.shutdownGraceMilliseconds
    ?? DEFAULT_WORKER_SHUTDOWN_GRACE_MS;
  if (!Number.isFinite(shutdownGraceMilliseconds) || shutdownGraceMilliseconds < 0) {
    throw new RangeError("Worker shutdown grace must be a finite, non-negative number");
  }

  const worker = options.createWorker?.(serverModule) ?? new Worker(serverModule, {
    stdout: true,
    stderr: true,
  });
  worker.unref();
  const lifetime = new WorkerLifetime(
    worker,
    shutdownGraceMilliseconds,
    options.onEvent,
  );
  const reader = new OwnedWorkerMessageReader(worker, lifetime);
  const writer = new OwnedWorkerMessageWriter(worker, lifetime);
  lifetime.attach(reader, writer);

  return {
    reader,
    writer,
    exited: lifetime.exited,
    terminate: () => lifetime.terminate(),
  };
}

function isNodeDebugFlag(argument: string): boolean {
  if (DEBUG_FLAGS.has(argument)) return true;
  return argument.startsWith("--debug=")
    || argument.startsWith("--debug-brk=")
    || argument.startsWith("--inspect=")
    || argument.startsWith("--inspect-brk=");
}

class WorkerLifetime {
  readonly #worker: Worker;
  readonly #shutdownGraceMilliseconds: number;
  readonly #onEvent: ((event: ExperimentalWorkerTransportEvent) => void) | undefined;
  readonly exited: Promise<number>;
  #resolveExited!: (code: number) => void;
  #reader: OwnedWorkerMessageReader | undefined;
  #writer: OwnedWorkerMessageWriter | undefined;
  #exitCode: number | undefined;
  #terminationTimer: ReturnType<typeof setTimeout> | undefined;
  #terminationPromise: Promise<number> | undefined;

  constructor(
    worker: Worker,
    shutdownGraceMilliseconds: number,
    onEvent: ((event: ExperimentalWorkerTransportEvent) => void) | undefined,
  ) {
    this.#worker = worker;
    this.#shutdownGraceMilliseconds = shutdownGraceMilliseconds;
    this.#onEvent = onEvent;
    this.exited = new Promise<number>((resolve) => {
      this.#resolveExited = resolve;
    });

    worker.once("online", () => this.#report({ type: "online" }));
    worker.stdout?.on("data", (chunk: Buffer | string) => {
      this.#report({ type: "stdout", text: chunk.toString() });
    });
    worker.stderr?.on("data", (chunk: Buffer | string) => {
      this.#report({ type: "stderr", text: chunk.toString() });
    });
    worker.once("error", (error) => this.#handleError(error));
    worker.once("exit", (code) => this.#handleExit(code));
  }

  attach(reader: OwnedWorkerMessageReader, writer: OwnedWorkerMessageWriter): void {
    this.#reader = reader;
    this.#writer = writer;
  }

  requestGracefulStop(): void {
    if (
      this.#exitCode != null
      || this.#terminationTimer != null
      || this.#terminationPromise != null
    ) return;
    this.#terminationTimer = setTimeout(() => {
      this.#terminationTimer = undefined;
      if (this.#exitCode != null) return;
      this.#report({
        type: "force-terminate",
        graceMilliseconds: this.#shutdownGraceMilliseconds,
      });
      void this.terminate().catch(() => undefined);
    }, this.#shutdownGraceMilliseconds);
    this.#terminationTimer.unref();
  }

  terminate(): Promise<number> {
    if (this.#exitCode != null) return Promise.resolve(this.#exitCode);
    if (this.#terminationTimer != null) {
      clearTimeout(this.#terminationTimer);
      this.#terminationTimer = undefined;
    }
    if (this.#terminationPromise == null) {
      this.#terminationPromise = this.#worker.terminate()
        .then(() => this.exited);
    }
    return this.#terminationPromise;
  }

  #handleError(error: Error): void {
    this.#report({ type: "error", error });
    this.#writer?.signalError(error);
  }

  #handleExit(code: number): void {
    if (this.#exitCode != null) return;
    this.#exitCode = code;
    if (this.#terminationTimer != null) {
      clearTimeout(this.#terminationTimer);
      this.#terminationTimer = undefined;
    }
    this.#report({ type: "exit", code });
    this.#reader?.signalClose();
    this.#writer?.signalClose();
    this.#resolveExited(code);
  }

  #report(event: ExperimentalWorkerTransportEvent): void {
    try {
      this.#onEvent?.(event);
    } catch {
      // Observability must not change transport lifetime semantics.
    }
  }
}

class OwnedWorkerMessageReader extends AbstractMessageReader {
  readonly #worker: Worker;
  readonly #lifetime: WorkerLifetime;
  #messageListener: ((message: Message) => void) | undefined;
  #listened = false;
  #closeDelivered = false;
  #disposed = false;

  constructor(worker: Worker, lifetime: WorkerLifetime) {
    super();
    this.#worker = worker;
    this.#lifetime = lifetime;
  }

  override listen(callback: DataCallback): Disposable {
    if (this.#listened) {
      throw new Error("Worker message reader can only listen once");
    }
    this.#listened = true;
    const listener = (message: Message): void => callback(message);
    this.#messageListener = listener;
    this.#worker.on("message", listener);
    return Disposable.create(() => {
      if (this.#messageListener !== listener) return;
      this.#worker.off("message", listener);
      this.#messageListener = undefined;
    });
  }

  signalClose(): void {
    if (this.#disposed || this.#closeDelivered) return;
    this.#closeDelivered = true;
    this.fireClose();
  }

  override dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#messageListener != null) {
      this.#worker.off("message", this.#messageListener);
      this.#messageListener = undefined;
    }
    super.dispose();
    this.#lifetime.requestGracefulStop();
  }
}

class OwnedWorkerMessageWriter extends AbstractMessageWriter {
  readonly #worker: Worker;
  readonly #lifetime: WorkerLifetime;
  #errorCount = 0;
  #terminalErrorDelivered = false;
  #closeDelivered = false;
  #disposed = false;

  constructor(worker: Worker, lifetime: WorkerLifetime) {
    super();
    this.#worker = worker;
    this.#lifetime = lifetime;
  }

  write(message: Message): Promise<void> {
    try {
      this.#worker.postMessage(message);
      this.#errorCount = 0;
      if (isShutdownRequest(message)) {
        this.#lifetime.requestGracefulStop();
      }
      return Promise.resolve();
    } catch (error) {
      const writeError = error instanceof Error
        ? error
        : new Error("Worker message write failed", { cause: error });
      this.#errorCount += 1;
      this.fireError(writeError, message, this.#errorCount);
      return Promise.reject(writeError);
    }
  }

  signalError(error: Error): void {
    if (this.#disposed || this.#terminalErrorDelivered) return;
    this.#terminalErrorDelivered = true;
    this.fireError(error, undefined, 1);
  }

  signalClose(): void {
    if (this.#disposed || this.#closeDelivered) return;
    this.#closeDelivered = true;
    this.fireClose();
  }

  end(): void {
    this.#lifetime.requestGracefulStop();
  }

  override dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    super.dispose();
    this.#lifetime.requestGracefulStop();
  }
}

function isShutdownRequest(message: Message): boolean {
  return "method" in message
    && message.method === "shutdown"
    && "id" in message;
}
