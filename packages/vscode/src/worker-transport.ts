import { Worker } from "node:worker_threads";
import {
  CancellationReceiverStrategy,
  PortMessageReader,
  PortMessageWriter,
  SharedArraySenderStrategy,
  type CancellationStrategy,
} from "vscode-jsonrpc/node";
import type { MessageTransports } from "vscode-languageclient/node";

export const EXPERIMENTAL_WORKER_TRANSPORT_ENV = "AURELIA_LS_EXPERIMENTAL_WORKER_TRANSPORT";

const WORKER_SHUTDOWN_GRACE_MS = 2_000;
const DEBUG_FLAGS = new Set(["--debug", "--debug-brk", "--inspect", "--inspect-brk"]);

export interface ExperimentalWorkerMessageTransports extends MessageTransports {
  readonly worker: Worker;
}

/** The worker experiment is deliberately excluded from extension-host debugging. */
export function shouldUseExperimentalWorkerTransport(
  env: Readonly<Record<string, string | undefined>> = process.env,
  execArgv: readonly string[] = process.execArgv,
): boolean {
  return env[EXPERIMENTAL_WORKER_TRANSPORT_ENV] === "1"
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
): ExperimentalWorkerMessageTransports {
  const worker = new Worker(serverModule);
  worker.unref();
  const lifetime = new WorkerLifetime(worker);

  return {
    worker,
    reader: new OwnedWorkerMessageReader(worker, lifetime),
    writer: new OwnedWorkerMessageWriter(worker, lifetime),
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
  #exited = false;
  #terminationTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(worker: Worker) {
    this.#worker = worker;
    worker.once("exit", () => {
      this.#exited = true;
      if (this.#terminationTimer != null) {
        clearTimeout(this.#terminationTimer);
        this.#terminationTimer = undefined;
      }
    });
  }

  requestGracefulStop(): void {
    if (this.#exited || this.#terminationTimer != null) return;
    this.#terminationTimer = setTimeout(() => {
      this.#terminationTimer = undefined;
      if (!this.#exited) {
        void this.#worker.terminate().catch(() => undefined);
      }
    }, WORKER_SHUTDOWN_GRACE_MS);
    this.#terminationTimer.unref();
  }
}

class OwnedWorkerMessageReader extends PortMessageReader {
  readonly #lifetime: WorkerLifetime;

  constructor(worker: Worker, lifetime: WorkerLifetime) {
    super(worker);
    this.#lifetime = lifetime;
    worker.once("exit", () => this.fireClose());
  }

  override dispose(): void {
    super.dispose();
    this.#lifetime.requestGracefulStop();
  }
}

class OwnedWorkerMessageWriter extends PortMessageWriter {
  readonly #lifetime: WorkerLifetime;

  constructor(worker: Worker, lifetime: WorkerLifetime) {
    super(worker);
    this.#lifetime = lifetime;
  }

  override end(): void {
    super.end();
    this.#lifetime.requestGracefulStop();
  }

  override dispose(): void {
    super.dispose();
    this.#lifetime.requestGracefulStop();
  }
}
