import type { Disposable } from "vscode";
import type { Event } from "vscode";
import {
  AURELIA_LANGUAGE_CLIENT_FORCE_TERMINATE,
  type AureliaLanguageClientSession,
} from "./client-core.js";
import {
  emitExtensionHostObservation,
  type ExtensionHostObservationValue,
} from "./extension-host-observation.js";
import {
  workerRestartHostAcceptanceEnabled,
} from "./worker-restart-host-acceptance.js";
export {
  WORKER_RESTART_HOST_ACCEPTANCE_ENV,
  workerRestartHostAcceptanceEnabled,
} from "./worker-restart-host-acceptance.js";

export const WORKER_RESTART_HOST_CONTROL_EVENT = "aurelia-ls:worker-restart-host-control";
export const WORKER_RESTART_HOST_CONTROL_SCHEMA = "aurelia-worker-restart-host-control/1";

interface WorkerRestartLanguageClient {
  readonly sessions: readonly AureliaLanguageClientSession[];
  readonly onDidChangeSessions: Event<readonly AureliaLanguageClientSession[]>;
}

interface WorkerRestartPayload {
  readonly schemaVersion: typeof WORKER_RESTART_HOST_CONTROL_SCHEMA;
  readonly action: "crash-active-worker";
  readonly controlId: string;
  readonly workspaceKey: string;
}

interface PendingRestart {
  readonly controlId: string;
  readonly workspaceKey: string;
  readonly previousIncarnation: number;
  withdrawn: boolean;
}

type ForceTerminableClient = AureliaLanguageClientSession["client"] & {
  readonly [AURELIA_LANGUAGE_CLIENT_FORCE_TERMINATE]?: () => Promise<unknown>;
};

const CONTROL_ID_LIMIT = 128;
const WORKSPACE_KEY_LIMIT = 2_048;

/**
 * Install the real-Worker crash seam only for the exact Extension Host
 * acceptance lane. Ordinary extension activation creates no listener or
 * controller state.
 */
export function createWorkerRestartHostControl(
  languageClient: WorkerRestartLanguageClient,
): Disposable | undefined {
  if (!workerRestartHostAcceptanceEnabled()) return undefined;
  return new WorkerRestartHostControl(languageClient);
}

/** Record the active-editor ownership state only in the restart acceptance lane. */
export function emitWorkerRestartContextObservation(
  detail: Readonly<{
    active: boolean;
    documentOwned: boolean;
    templateOwned: boolean;
    languageId: string | null;
    workspaceKey: string | null;
    incarnation: number | null;
  }>,
): void {
  emitWorkerRestartObservation({
    source: "worker-restart-context",
    observationId: "active-document",
    phase: "context-committed",
    ...detail,
  });
}

class WorkerRestartHostControl implements Disposable {
  readonly #languageClient: WorkerRestartLanguageClient;
  readonly #processListener: (payload: unknown) => void;
  readonly #sessionSubscription: Disposable;
  #pending: PendingRestart | undefined;
  #disposed = false;

  constructor(languageClient: WorkerRestartLanguageClient) {
    this.#languageClient = languageClient;
    this.#processListener = (payload: unknown) => this.#dispatch(payload);
    this.#sessionSubscription = languageClient.onDidChangeSessions((sessions) => {
      this.#observeSessionPublication(sessions);
    });
    process.on(WORKER_RESTART_HOST_CONTROL_EVENT, this.#processListener);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    process.removeListener(WORKER_RESTART_HOST_CONTROL_EVENT, this.#processListener);
    this.#sessionSubscription.dispose();
    const pending = this.#pending;
    this.#pending = undefined;
    if (pending != null) {
      this.#observe(pending.controlId, "disposed", {
        workspaceKey: pending.workspaceKey,
        previousIncarnation: pending.previousIncarnation,
        withdrawn: pending.withdrawn,
      });
    }
  }

  #dispatch(raw: unknown): void {
    const parsed = parseWorkerRestartPayload(raw);
    if (!parsed.ok) {
      this.#observe(parsed.controlId, "rejected", { reason: parsed.reason });
      return;
    }
    const payload = parsed.payload;
    if (this.#disposed) {
      this.#observe(payload.controlId, "rejected", { reason: "controller-disposed" });
      return;
    }
    if (this.#pending != null) {
      this.#observe(payload.controlId, "rejected", { reason: "restart-already-pending" });
      return;
    }
    const matches = this.#languageClient.sessions.filter(
      (session) => session.workspace.key === payload.workspaceKey,
    );
    if (matches.length !== 1) {
      this.#observe(payload.controlId, "rejected", {
        reason: matches.length === 0 ? "workspace-not-active" : "workspace-not-unique",
        workspaceKey: payload.workspaceKey,
      });
      return;
    }
    const session = matches[0]!;
    const terminate = (session.client as ForceTerminableClient)[AURELIA_LANGUAGE_CLIENT_FORCE_TERMINATE];
    if (terminate == null) {
      this.#observe(payload.controlId, "rejected", {
        reason: "active-client-is-not-worker-transport",
        workspaceKey: payload.workspaceKey,
      });
      return;
    }

    const pending: PendingRestart = {
      controlId: payload.controlId,
      workspaceKey: payload.workspaceKey,
      previousIncarnation: session.incarnation,
      withdrawn: false,
    };
    this.#pending = pending;
    this.#observe(payload.controlId, "crash-requested", {
      workspaceKey: payload.workspaceKey,
      previousIncarnation: session.incarnation,
    });
    void Promise.resolve()
      .then(() => terminate())
      .then(
        () => {
          this.#observe(payload.controlId, "worker-exited", {
            workspaceKey: payload.workspaceKey,
            previousIncarnation: session.incarnation,
          });
        },
        (error: unknown) => {
          if (this.#pending === pending) this.#pending = undefined;
          this.#observe(payload.controlId, "crash-failed", {
            workspaceKey: payload.workspaceKey,
            message: error instanceof Error ? error.message : String(error),
          });
        },
      );
  }

  #observeSessionPublication(sessions: readonly AureliaLanguageClientSession[]): void {
    const pending = this.#pending;
    if (pending == null) return;
    const active = sessions.find((session) => session.workspace.key === pending.workspaceKey);
    if (!pending.withdrawn) {
      if (active != null) return;
      pending.withdrawn = true;
      this.#observe(pending.controlId, "session-withdrawn", {
        workspaceKey: pending.workspaceKey,
        previousIncarnation: pending.previousIncarnation,
        nextIncarnation: pending.previousIncarnation + 1,
      });
      return;
    }
    if (active == null || active.incarnation <= pending.previousIncarnation) return;
    this.#pending = undefined;
    this.#observe(pending.controlId, "session-republished", {
      workspaceKey: pending.workspaceKey,
      previousIncarnation: pending.previousIncarnation,
      incarnation: active.incarnation,
    });
  }

  #observe(
    controlId: string,
    phase: string,
    detail: Readonly<Record<string, ExtensionHostObservationValue>> = {},
  ): void {
    emitWorkerRestartObservation({
      source: "worker-restart-host-control",
      observationId: controlId,
      phase,
      ...detail,
    });
  }
}

function emitWorkerRestartObservation(
  event: Readonly<{
    source: string;
    observationId: string;
    phase: string;
    [key: string]: ExtensionHostObservationValue;
  }>,
): void {
  if (!workerRestartHostAcceptanceEnabled()) return;
  emitExtensionHostObservation(event);
}

function parseWorkerRestartPayload(
  raw: unknown,
): { readonly ok: true; readonly payload: WorkerRestartPayload }
  | { readonly ok: false; readonly controlId: string; readonly reason: string } {
  let input: Readonly<Record<string, unknown>>;
  try {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, controlId: "worker-restart", reason: "payload-not-plain-object" };
    }
    const prototype: unknown = Object.getPrototypeOf(raw);
    if (prototype !== Object.prototype && prototype !== null) {
      return { ok: false, controlId: "worker-restart", reason: "payload-not-plain-object" };
    }
    const candidate = raw as Record<string, unknown>;
    input = Object.fromEntries(
      Object.keys(candidate).map((key) => [key, candidate[key]]),
    );
  } catch {
    return { ok: false, controlId: "worker-restart", reason: "payload-read-failed" };
  }
  const controlId = boundedString(input.controlId, CONTROL_ID_LIMIT) ?? "worker-restart";
  if (input.schemaVersion !== WORKER_RESTART_HOST_CONTROL_SCHEMA) {
    return { ok: false, controlId, reason: "schema-version-mismatch" };
  }
  if (input.action !== "crash-active-worker") {
    return { ok: false, controlId, reason: "unknown-action" };
  }
  if (boundedString(input.controlId, CONTROL_ID_LIMIT) == null) {
    return { ok: false, controlId, reason: "invalid-control-id" };
  }
  const workspaceKey = boundedString(input.workspaceKey, WORKSPACE_KEY_LIMIT);
  if (workspaceKey == null) {
    return { ok: false, controlId, reason: "invalid-workspace-key" };
  }
  return {
    ok: true,
    payload: {
      schemaVersion: WORKER_RESTART_HOST_CONTROL_SCHEMA,
      action: "crash-active-worker",
      controlId,
      workspaceKey,
    },
  };
}

function boundedString(value: unknown, limit: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= limit
    ? value
    : null;
}
