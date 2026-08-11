import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CancellationToken } from "vscode";
import {
  EXTENSION_HOST_OBSERVATION_EVENT,
  type ExtensionHostObservation,
} from "../../../out/extension-host-observation.js";
import {
  ResourceQuickPickTitleActionKind,
  showResourceQuickPick,
} from "../../../out/features/resource-discovery/quick-pick.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

describe("resource discovery Quick Pick", () => {
  const observationEnv = "AURELIA_LS_EXTENSION_HOST_OBSERVATION";
  const acceptanceEnv = "AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE";
  let previousObservationEnv: string | undefined;
  let previousAcceptanceEnv: string | undefined;

  beforeEach(() => {
    previousObservationEnv = process.env[observationEnv];
    previousAcceptanceEnv = process.env[acceptanceEnv];
    process.env[observationEnv] = "1";
    process.env[acceptanceEnv] = "1";
  });

  afterEach(() => {
    if (previousObservationEnv == null) delete process.env[observationEnv];
    else process.env[observationEnv] = previousObservationEnv;
    if (previousAcceptanceEnv == null) delete process.env[acceptanceEnv];
    else process.env[acceptanceEnv] = previousAcceptanceEnv;
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
        { phase: "model-start" },
        { phase: "shown" },
        { phase: "model-item", itemOrdinal: 0, itemKind: "item", label: "app" },
        { phase: "model-ready", itemCount: 1, title: "Choose project" },
        { phase: "active-changed", activeLabel: "app" },
        { phase: "accept", selectedLabel: "app" },
        { phase: "outcome", status: "selected" },
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
        { phase: "model-start" },
        { phase: "shown" },
        { phase: "model-ready", itemCount: 0, title: "No resources" },
        { phase: "hidden" },
        { phase: "cancelled" },
        { phase: "outcome", status: "cancelled" },
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
        { phase: "model-start" },
        { phase: "shown" },
        { phase: "hidden" },
        { phase: "cancelled" },
        { phase: "outcome", status: "cancelled" },
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
        { phase: "model-start" },
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
    process.env[acceptanceEnv] = "0";
    const observation = recordObservations();
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;
    const items = [{ label: "app" }];
    const indexOf = vi.spyOn(items, "indexOf");
    const iterator = vi.spyOn(items, Symbol.iterator);

    try {
      const outcome = showResourceQuickPick(vscode, "Resources", async () => ({
        title: "Resources",
        placeholder: "Choose one",
        items,
      }));
      await vi.waitFor(() => expect(recorded.quickPicks[0]?.busy).toBe(false));
      recorded.quickPicks[0]!.accept(0);
      await expect(outcome).resolves.toEqual({ status: "selected", value: { label: "app" } });
      expect(observation.events).toEqual([]);
      expect(indexOf).not.toHaveBeenCalled();
      expect(iterator).not.toHaveBeenCalled();
    } finally {
      observation.dispose();
    }
  });

  test("returns Back as a distinct outcome in a multi-step flow", async () => {
    const observation = recordObservations();
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;
    try {
      const outcome = showResourceQuickPick(vscode, "Resources", async () => ({
        title: "Choose project",
        placeholder: "Choose one",
        items: [{ kind: -1, label: "Projects" }, { label: "app" }],
        step: 2,
        totalSteps: 3,
      }), true, undefined, undefined, 2);
      await vi.waitFor(() => expect(recorded.quickPicks[0]?.items).toHaveLength(2));
      recorded.quickPicks[0]!.back();

      await expect(outcome).resolves.toEqual({ status: "back" });
      expectObservationSequence(observation.events, [
        { phase: "model-start" },
        { phase: "shown" },
        { phase: "model-item", itemOrdinal: 0, itemKind: "separator", label: "Projects" },
        { phase: "model-item", itemOrdinal: 1, itemKind: "item", label: "app" },
        { phase: "model-button", buttonKind: "back", buttonOrdinal: 0 },
        { phase: "model-ready", itemCount: 2, title: "Choose project", step: 2, totalSteps: 3 },
        { phase: "back" },
        { phase: "outcome", status: "back" },
        { phase: "hidden" },
        { phase: "finished", status: "back" },
        { phase: "disposed" },
      ], 2);
    } finally {
      observation.dispose();
    }
  });

  test("keeps one command correlation id while separating repeated model ordinals", async () => {
    const observation = recordObservations();
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;
    try {
      const first = showResourceQuickPick(
        vscode,
        "Resources",
        async () => ({ title: "Choose project", placeholder: "Project", items: [{ label: "app" }] }),
        false,
        "go-to-available-resource:shared",
        undefined,
        1,
      );
      await vi.waitFor(() => expect(recorded.quickPicks[0]?.busy).toBe(false));
      recorded.quickPicks[0]!.hide();
      await expect(first).resolves.toEqual({ status: "cancelled" });

      const second = showResourceQuickPick(
        vscode,
        "Resources",
        async () => ({ title: "Choose resource", placeholder: "Resource", items: [{ label: "card" }] }),
        true,
        "go-to-available-resource:shared",
        undefined,
        2,
      );
      await vi.waitFor(() => expect(recorded.quickPicks[1]?.busy).toBe(false));
      recorded.quickPicks[1]!.accept(0);
      await expect(second).resolves.toEqual({ status: "selected", value: { label: "card" } });

      expect(new Set(observation.events.map((event) => event.observationId))).toEqual(
        new Set(["go-to-available-resource:shared"]),
      );
      expect(observation.events.filter((event) => event.modelOrdinal === 1).map((event) => event.phase)).toEqual([
        "model-start",
        "shown",
        "model-item",
        "model-ready",
        "hidden",
        "cancelled",
        "outcome",
        "finished",
        "disposed",
      ]);
      expect(observation.events.filter((event) => event.modelOrdinal === 2).map((event) => event.phase)).toEqual([
        "model-start",
        "shown",
        "model-item",
        "model-button",
        "model-ready",
        "active-changed",
        "accept",
        "outcome",
        "hidden",
        "finished",
        "disposed",
      ]);
    } finally {
      observation.dispose();
    }
  });

  test("runs a typed title action without settling or hiding the picker", async () => {
    const observation = recordObservations();
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;
    const onTitleAction = vi.fn();
    let settled = false;

    try {
      const outcome = showResourceQuickPick(
        vscode,
        "Resources",
        async () => ({
          title: "Resources — incomplete",
          placeholder: "Choose one",
          items: [{ label: "app" }],
          titleActions: [
            ResourceQuickPickTitleActionKind.OpenOutput,
            ResourceQuickPickTitleActionKind.OpenOutput,
          ],
        }),
        false,
        undefined,
        onTitleAction,
      );
      void outcome.then(() => { settled = true; });
      await vi.waitFor(() => expect(recorded.quickPicks[0]?.busy).toBe(false));

      expect(recorded.quickPicks[0]?.buttons).toEqual([{
        iconPath: expect.objectContaining({ id: "output" }),
        tooltip: "Open Aurelia Output",
      }]);
      recorded.quickPicks[0]!.triggerButton(0);

      expect(onTitleAction).toHaveBeenCalledWith(ResourceQuickPickTitleActionKind.OpenOutput);
      expect(recorded.quickPicks[0]?.visible).toBe(true);
      expect(settled).toBe(false);

      recorded.quickPicks[0]!.hide();
      await expect(outcome).resolves.toEqual({ status: "cancelled" });
      expectObservationSequence(observation.events, [
        { phase: "model-start" },
        { phase: "shown" },
        { phase: "model-item", itemOrdinal: 0, itemKind: "item", label: "app" },
        { phase: "model-button", buttonKind: "open-output", buttonOrdinal: 0 },
        { phase: "model-ready", itemCount: 1, title: "Resources — incomplete" },
        { phase: "title-action", action: "open-output" },
        { phase: "hidden" },
        { phase: "cancelled" },
        { phase: "outcome", status: "cancelled" },
        { phase: "finished", status: "cancelled" },
        { phase: "disposed" },
      ]);
    } finally {
      observation.dispose();
    }
  });

  test("keeps Open Output non-closing when it shares the title bar with Back", async () => {
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;
    const onTitleAction = vi.fn();

    const outcome = showResourceQuickPick(
      vscode,
      "Resources",
      async () => ({
        title: "Resources — incomplete",
        placeholder: "Choose one",
        items: [{ label: "app" }],
        titleActions: [ResourceQuickPickTitleActionKind.OpenOutput],
        step: 2,
        totalSteps: 3,
      }),
      true,
      undefined,
      onTitleAction,
    );
    await vi.waitFor(() => expect(recorded.quickPicks[0]?.busy).toBe(false));

    expect(recorded.quickPicks[0]?.buttons).toEqual([
      stubVscode.QuickInputButtons.Back,
      { iconPath: expect.objectContaining({ id: "output" }), tooltip: "Open Aurelia Output" },
    ]);
    recorded.quickPicks[0]!.triggerButton(1);

    expect(onTitleAction).toHaveBeenCalledWith(ResourceQuickPickTitleActionKind.OpenOutput);
    expect(recorded.quickPicks[0]?.visible).toBe(true);

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
  modelOrdinal = 1,
): void {
  expect(events).toHaveLength(expected.length);
  const observationId = events[0]?.observationId;
  expect(observationId).toMatch(/^quick-pick:\d+$/);
  expect(events.map((event) => event.phase)).toEqual(expected.map((event) => event.phase));
  for (const [index, event] of events.entries()) {
    expect(event).toEqual(expect.objectContaining(expected[index]!));
    expect(event.source).toBe("resource-quick-pick");
    expect(event.observationId).toBe(observationId);
    expect(event.modelOrdinal).toBe(modelOrdinal);
    expect(Object.getPrototypeOf(event)).toBe(Object.prototype);
    expect(Object.isFrozen(event)).toBe(true);
  }
}
