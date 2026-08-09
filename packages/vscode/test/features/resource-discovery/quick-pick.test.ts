import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CancellationToken } from "vscode";
import {
  EXTENSION_HOST_OBSERVATION_EVENT,
  type ExtensionHostObservation,
} from "../../../out/extension-host-observation.js";
import { showResourceQuickPick } from "../../../out/features/resource-discovery/quick-pick.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

describe("resource discovery Quick Pick", () => {
  const observationEnv = "AURELIA_LS_EXTENSION_HOST_OBSERVATION";
  let previousObservationEnv: string | undefined;

  beforeEach(() => {
    previousObservationEnv = process.env[observationEnv];
    process.env[observationEnv] = "1";
  });

  afterEach(() => {
    if (previousObservationEnv == null) delete process.env[observationEnv];
    else process.env[observationEnv] = previousObservationEnv;
  });

  test("observes a ready picker through selection and disposal", async () => {
    const observation = recordObservations();
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;

    try {
      const outcome = showResourceQuickPick(vscode, "Resources", async () => ({
        title: "Choose project",
        placeholder: "Choose one",
        items: [{ label: "app" }],
      }));
      await vi.waitFor(() => expect(recorded.quickPicks[0]?.busy).toBe(false));
      recorded.quickPicks[0]!.accept(0);

      await expect(outcome).resolves.toEqual({ status: "selected", value: { label: "app" } });
      expectObservationSequence(observation.events, [
        { phase: "shown" },
        { phase: "model-ready", itemCount: 1, title: "Choose project" },
        { phase: "active-changed", activeLabel: "app" },
        { phase: "accept", selectedLabel: "app" },
        { phase: "hidden" },
        { phase: "finished", status: "selected" },
        { phase: "disposed" },
      ]);
    } finally {
      observation.dispose();
    }
  });

  test("observes an empty ready model before cancellation and disposal", async () => {
    const observation = recordObservations();
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;

    try {
      const outcome = showResourceQuickPick(vscode, "Resources", async () => ({
        title: "No resources",
        placeholder: "Nothing available",
        items: [],
      }));
      await vi.waitFor(() => expect(recorded.quickPicks[0]?.busy).toBe(false));
      recorded.quickPicks[0]!.hide();

      await expect(outcome).resolves.toEqual({ status: "cancelled" });
      expectObservationSequence(observation.events, [
        { phase: "shown" },
        { phase: "model-ready", itemCount: 0, title: "No resources" },
        { phase: "hidden" },
        { phase: "finished", status: "cancelled" },
        { phase: "disposed" },
      ]);
    } finally {
      observation.dispose();
    }
  });

  test("observes closure during load and cancels the in-flight work", async () => {
    const observation = recordObservations();
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;
    let requestToken: CancellationToken | null = null;
    const never = new Promise<never>(() => {});

    try {
      const outcome = showResourceQuickPick(vscode, "Resources", async (token) => {
        requestToken = token;
        return await never;
      });
      await vi.waitFor(() => expect(recorded.quickPicks).toHaveLength(1));
      recorded.quickPicks[0]!.hide();

      await expect(outcome).resolves.toEqual({ status: "cancelled" });
      expect(requestToken?.isCancellationRequested).toBe(true);
      expectObservationSequence(observation.events, [
        { phase: "shown" },
        { phase: "hidden" },
        { phase: "finished", status: "cancelled" },
        { phase: "disposed" },
      ]);
    } finally {
      observation.dispose();
    }
  });

  test("observes load failure without retaining error details", async () => {
    const observation = recordObservations();
    const { vscode: stubVscode } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;

    try {
      const outcome = showResourceQuickPick(vscode, "Resources", async () => {
        throw new Error("private C:\\workspace\\detail");
      });

      await expect(outcome).rejects.toThrow("private C:\\workspace\\detail");
      expectObservationSequence(observation.events, [
        { phase: "shown" },
        { phase: "load-failed" },
        { phase: "hidden" },
        { phase: "finished", status: "failed" },
        { phase: "disposed" },
      ]);
      expect(JSON.stringify(observation.events)).not.toContain("workspace");
    } finally {
      observation.dispose();
    }
  });

  test("publishes no observations without the explicit Extension Host test gate", async () => {
    process.env[observationEnv] = "0";
    const observation = recordObservations();
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;

    try {
      const outcome = showResourceQuickPick(vscode, "Resources", async () => ({
        title: "Resources",
        placeholder: "Choose one",
        items: [],
      }));
      await vi.waitFor(() => expect(recorded.quickPicks[0]?.busy).toBe(false));
      recorded.quickPicks[0]!.hide();
      await expect(outcome).resolves.toEqual({ status: "cancelled" });
      expect(observation.events).toEqual([]);
    } finally {
      observation.dispose();
    }
  });

  test("returns Back as a distinct outcome in a multi-step flow", async () => {
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;

    const outcome = showResourceQuickPick(vscode, "Resources", async () => ({
      title: "Choose project",
      placeholder: "Choose one",
      items: [{ label: "app" }],
      step: 2,
      totalSteps: 3,
    }), true);
    await vi.waitFor(() => expect(recorded.quickPicks[0]?.items).toHaveLength(1));
    recorded.quickPicks[0]!.back();

    await expect(outcome).resolves.toEqual({ status: "back" });
  });
});

type ExpectedObservation = Readonly<Record<string, string | number | boolean | null>> & {
  readonly phase: string;
};

function recordObservations(): {
  readonly events: ExtensionHostObservation[];
  dispose(): void;
} {
  const events: ExtensionHostObservation[] = [];
  const listener = (event: ExtensionHostObservation): void => {
    if (event.source === "resource-quick-pick") events.push(event);
  };
  const host = process as unknown as {
    on(eventName: string, listener: (event: ExtensionHostObservation) => void): void;
    off(eventName: string, listener: (event: ExtensionHostObservation) => void): void;
  };
  host.on(EXTENSION_HOST_OBSERVATION_EVENT, listener);
  return {
    events,
    dispose: () => host.off(EXTENSION_HOST_OBSERVATION_EVENT, listener),
  };
}

function expectObservationSequence(
  events: readonly ExtensionHostObservation[],
  expected: readonly ExpectedObservation[],
): void {
  expect(events).toHaveLength(expected.length);
  const observationId = events[0]?.observationId;
  expect(observationId).toMatch(/^quick-pick:\d+$/);
  expect(events.map(({ source: _source, observationId: _observationId, ...event }) => event)).toEqual(expected);
  for (const event of events) {
    expect(event.source).toBe("resource-quick-pick");
    expect(event.observationId).toBe(observationId);
    expect(Object.getPrototypeOf(event)).toBe(Object.prototype);
    expect(Object.isFrozen(event)).toBe(true);
  }
}
