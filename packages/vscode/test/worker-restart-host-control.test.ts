import { afterEach, describe, expect, test, vi } from "vitest";
import type { AureliaLanguageClientSession } from "../out/client-core.js";
import { AURELIA_LANGUAGE_CLIENT_FORCE_TERMINATE } from "../out/client-core.js";
import { EXTENSION_HOST_OBSERVATION_EVENT } from "../out/extension-host-observation.js";
import {
  createWorkerRestartHostControl,
  emitWorkerRestartContextObservation,
  WORKER_RESTART_HOST_ACCEPTANCE_ENV,
  WORKER_RESTART_HOST_CONTROL_EVENT,
  WORKER_RESTART_HOST_CONTROL_SCHEMA,
} from "../out/worker-restart-host-control.js";

const OBSERVATION_ENV = "AURELIA_LS_EXTENSION_HOST_OBSERVATION";
const originalObservation = process.env[OBSERVATION_ENV];
const originalAcceptance = process.env[WORKER_RESTART_HOST_ACCEPTANCE_ENV];

afterEach(() => {
  restoreEnvironment(OBSERVATION_ENV, originalObservation);
  restoreEnvironment(WORKER_RESTART_HOST_ACCEPTANCE_ENV, originalAcceptance);
});

describe("Worker restart Extension Host control", () => {
  test("installs no production listener without both exact acceptance gates", () => {
    const manager = createManagerHarness([]);
    const baseline = process.listenerCount(WORKER_RESTART_HOST_CONTROL_EVENT);

    delete process.env[OBSERVATION_ENV];
    process.env[WORKER_RESTART_HOST_ACCEPTANCE_ENV] = "1";
    expect(createWorkerRestartHostControl(manager.manager)).toBeUndefined();
    process.env[OBSERVATION_ENV] = "1";
    delete process.env[WORKER_RESTART_HOST_ACCEPTANCE_ENV];
    expect(createWorkerRestartHostControl(manager.manager)).toBeUndefined();

    expect(process.listenerCount(WORKER_RESTART_HOST_CONTROL_EVENT)).toBe(baseline);
  });

  test("terminates the exact active Worker and receipts withdrawal plus a newer incarnation", async () => {
    enableAcceptance();
    const terminate = vi.fn(async () => 1);
    const first = session("file:///work/app", 3, terminate);
    const manager = createManagerHarness([first]);
    const observations: Array<Record<string, unknown>> = [];
    const observe = (event: unknown): void => {
      if (event != null && typeof event === "object") {
        observations.push(event as Record<string, unknown>);
      }
    };
    process.on(EXTENSION_HOST_OBSERVATION_EVENT, observe);
    const control = createWorkerRestartHostControl(manager.manager)!;
    try {
      emitControl({
        schemaVersion: WORKER_RESTART_HOST_CONTROL_SCHEMA,
        action: "crash-active-worker",
        controlId: "restart-1",
        workspaceKey: first.workspace.key,
      });
      await vi.waitFor(() => expect(terminate).toHaveBeenCalledOnce());

      manager.publish([]);
      manager.publish([{ ...first, incarnation: 4 }]);

      expect(observations.filter((event) => event.observationId === "restart-1").map((event) => event.phase))
        .toEqual(expect.arrayContaining([
          "crash-requested",
          "worker-exited",
          "session-withdrawn",
          "session-republished",
        ]));
      expect(observations).toContainEqual(expect.objectContaining({
        observationId: "restart-1",
        phase: "session-republished",
        previousIncarnation: 3,
        incarnation: 4,
      }));
    } finally {
      control.dispose();
      process.removeListener(EXTENSION_HOST_OBSERVATION_EVENT, observe);
    }
  });

  test("rejects an absent workspace and emits context facts only inside the exact lane", () => {
    enableAcceptance();
    const manager = createManagerHarness([]);
    const observations: Array<Record<string, unknown>> = [];
    const observe = (event: unknown): void => {
      if (event != null && typeof event === "object") {
        observations.push(event as Record<string, unknown>);
      }
    };
    process.on(EXTENSION_HOST_OBSERVATION_EVENT, observe);
    const control = createWorkerRestartHostControl(manager.manager)!;
    try {
      emitControl({
        schemaVersion: WORKER_RESTART_HOST_CONTROL_SCHEMA,
        action: "crash-active-worker",
        controlId: "missing",
        workspaceKey: "file:///work/missing",
      });
      emitWorkerRestartContextObservation({
        active: true,
        documentOwned: true,
        templateOwned: true,
        languageId: "html",
        workspaceKey: "file:///work/app",
        incarnation: 2,
      });
      delete process.env[WORKER_RESTART_HOST_ACCEPTANCE_ENV];
      emitWorkerRestartContextObservation({
        active: false,
        documentOwned: false,
        templateOwned: false,
        languageId: null,
        workspaceKey: null,
        incarnation: null,
      });

      expect(observations).toContainEqual(expect.objectContaining({
        observationId: "missing",
        phase: "rejected",
        reason: "workspace-not-active",
      }));
      expect(observations.filter((event) => event.source === "worker-restart-context"))
        .toEqual([expect.objectContaining({
          phase: "context-committed",
          active: true,
          documentOwned: true,
          templateOwned: true,
          incarnation: 2,
        })]);
    } finally {
      control.dispose();
      process.removeListener(EXTENSION_HOST_OBSERVATION_EVENT, observe);
    }
  });
});

function createManagerHarness(initial: readonly AureliaLanguageClientSession[]): {
  readonly manager: {
    readonly sessions: readonly AureliaLanguageClientSession[];
    readonly onDidChangeSessions: (
      listener: (sessions: readonly AureliaLanguageClientSession[]) => void,
    ) => { dispose(): void };
  };
  publish(sessions: readonly AureliaLanguageClientSession[]): void;
} {
  let sessions = initial;
  const listeners = new Set<(sessions: readonly AureliaLanguageClientSession[]) => void>();
  return {
    manager: {
      get sessions() {
        return sessions;
      },
      onDidChangeSessions(listener) {
        listeners.add(listener);
        return { dispose: () => listeners.delete(listener) };
      },
    },
    publish(next) {
      sessions = next;
      for (const listener of [...listeners]) listener(next);
    },
  };
}

function session(
  workspaceKey: string,
  incarnation: number,
  terminate: () => Promise<unknown>,
): AureliaLanguageClientSession {
  return {
    workspace: { key: workspaceKey, uri: workspaceKey, name: "app" },
    folder: {} as AureliaLanguageClientSession["folder"],
    client: { [AURELIA_LANGUAGE_CLIENT_FORCE_TERMINATE]: terminate } as unknown as AureliaLanguageClientSession["client"],
    activationMode: "on" as AureliaLanguageClientSession["activationMode"],
    activationEvidence: "explicit-mode" as AureliaLanguageClientSession["activationEvidence"],
    nativeProjectConfigurationUris: [],
    status: null,
    excludedFolders: [],
    projectRootHintFolders: [],
    fileEvents: [],
    incarnation,
    availability: "active",
  };
}

function enableAcceptance(): void {
  process.env[OBSERVATION_ENV] = "1";
  process.env[WORKER_RESTART_HOST_ACCEPTANCE_ENV] = "1";
}

function emitControl(payload: unknown): void {
  const host = process as unknown as { emit(eventName: string, payload: unknown): boolean };
  host.emit(WORKER_RESTART_HOST_CONTROL_EVENT, payload);
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value == null) delete process.env[name];
  else process.env[name] = value;
}
