import { describe, expect, test, vi } from "vitest";
import {
  EXTENSION_HOST_OBSERVATION_EVENT,
  type ExtensionHostObservation,
} from "../../../out/extension-host-observation.js";
import { openResourceNavigation } from "../../../out/features/resource-discovery/navigation.js";
import type { ResourceNavigationRequest } from "../../../out/types.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

function location(role: string, line: number) {
  return {
    uri: "file:///repo/src/product-card.ts",
    range: { start: { line, character: 2 }, end: { line, character: 14 } },
    role,
    label: `src/product-card.ts:${line + 1}`,
  };
}

function available(role: string, line: number) {
  return { state: "available" as const, location: location(role, line) };
}

function inventory(options: { readonly pathless?: boolean } = {}) {
  const navigation = options.pathless
    ? { state: "unavailable" as const, reason: "external-catalog" as const }
    : available("public-name", 3);
  return {
    workspaces: [{
      key: "file:///repo",
      name: "repo",
      uri: "file:///repo",
      status: "ready" as const,
      response: {
        fingerprint: "current",
        projects: [{
          status: "ready" as const,
          project: { projectKey: "app" },
          answer: {
            schemaVersion: "0.2",
            result: "answered" as const,
            selection: "not-applicable" as const,
            coverage: "complete" as const,
            summary: "complete",
            page: null,
          },
          resources: [{
            identityKey: "resource:card",
            name: "product-card",
            metadataState: "full-definition" as const,
            navigation,
            aliases: [{ identityKey: "alias:store-card", navigation: available("alias", 5) }],
            bindables: [{ identityKey: "bindable:label", navigation: available("bindable-name", 7) }],
            sources: {
              implementation: options.pathless
                ? { state: "absent" as const }
                : available("implementation", 11),
            },
          }],
        }],
      },
    }],
  };
}

function request(
  role: ResourceNavigationRequest["role"],
  childIdentityKey?: string,
): ResourceNavigationRequest {
  return {
    workspaceKey: "file:///repo",
    fingerprint: "stale",
    projectKey: "app",
    resourceIdentityKey: "resource:card",
    role,
    ...(childIdentityKey == null ? {} : { childIdentityKey }),
  };
}

function harness(response: unknown) {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const logger = { debug: vi.fn() };
  const lsp = { getResourceInventory: vi.fn(async () => response) };
  return {
    lsp,
    logger,
    recorded,
    vscode: stubVscode as unknown as VscodeApi,
  };
}

describe("openResourceNavigation", () => {
  test("observes exact re-resolution and opened URI, range, role, and placement", async () => {
    const observation = captureNavigationObservations();
    try {
      const current = harness(inventory());
      await expect(openResourceNavigation(
        current.vscode,
        current.lsp as never,
        current.logger as never,
        { ...request("implementation"), placement: "beside" },
      )).resolves.toBe(true);

      expect(observation.events).toEqual([
        expect.objectContaining({
          phase: "start",
          requestedFingerprint: "stale",
          workspaceKey: "file:///repo",
          projectKey: "app",
          resourceIdentity: "resource:card",
          childIdentity: null,
          role: "implementation",
          placement: "beside",
        }),
        expect.objectContaining({ phase: "refreshed", currentFingerprint: "current" }),
        expect.objectContaining({
          phase: "opened",
          currentFingerprint: "current",
          uri: "file:///repo/src/product-card.ts",
          startLine: 11,
          startCharacter: 2,
          endLine: 11,
          endCharacter: 14,
        }),
      ]);
      expect(new Set(observation.events.map((event) => event.observationId))).toHaveLength(1);
      expect(observation.events.every(Object.isFrozen)).toBe(true);
      expect(observation.events.every((event) => Object.values(event).every(isObservationPrimitive))).toBe(true);
    } finally {
      observation.dispose();
    }
  });

  test("observes a conclusive refusal and authenticates that the editor did not move", async () => {
    const observation = captureNavigationObservations();
    try {
      const response = inventory() as any;
      response.workspaces[0].response.projects[0].resources = [];
      const current = harness(response);

      await expect(openResourceNavigation(
        current.vscode,
        current.lsp as never,
        current.logger as never,
        request("resource"),
      )).resolves.toBe(false);

      expect(observation.events).toEqual([
        expect.objectContaining({ phase: "start", role: "resource", placement: "preview" }),
        expect.objectContaining({
          phase: "refused",
          category: "resource-removed",
          currentFingerprint: "current",
          editorUnchanged: true,
          message: "That Aurelia resource no longer exists in the current analysis.",
        }),
      ]);
      expect(observation.events.some((event) => event.phase === "opened")).toBe(false);
      expect(current.recorded.shownDocuments).toEqual([]);
    } finally {
      observation.dispose();
    }
  });

  test("isolates hostile editor capture, editor re-read, and observation emission", async () => {
    const observation = captureNavigationObservations();
    const throwOnOpened = (event: ExtensionHostObservation): void => {
      if (event.source === "resource-navigation" && event.phase === "opened") {
        throw new Error("hostile navigation observation listener");
      }
    };
    process.on(EXTENSION_HOST_OBSERVATION_EVENT, throwOnOpened);
    try {
      const captureFailure = harness(inventory());
      Object.defineProperty(captureFailure.vscode.window, "activeTextEditor", {
        configurable: true,
        get: () => { throw new Error("hostile initial editor getter"); },
      });

      await expect(openResourceNavigation(
        captureFailure.vscode,
        captureFailure.lsp as never,
        captureFailure.logger as never,
        request("resource"),
      )).resolves.toBe(true);
      expect(captureFailure.recorded.openedDocuments.at(-1)?.uri.toString()).toBe(
        "file:///repo/src/product-card.ts",
      );
      expect(observation.events).toContainEqual(expect.objectContaining({
        phase: "opened",
        resourceIdentity: "resource:card",
      }));

      const removedResponse = inventory() as any;
      removedResponse.workspaces[0].response.projects[0].resources = [];
      const reReadFailure = harness(removedResponse);
      let editorReads = 0;
      Object.defineProperty(reReadFailure.vscode.window, "activeTextEditor", {
        configurable: true,
        get: () => {
          editorReads += 1;
          if (editorReads === 1) return undefined;
          throw new Error("hostile editor re-read");
        },
      });

      await expect(openResourceNavigation(
        reReadFailure.vscode,
        reReadFailure.lsp as never,
        reReadFailure.logger as never,
        request("resource"),
      )).resolves.toBe(false);
      expect(editorReads).toBe(2);
      expect(reReadFailure.recorded.infoMessages).toEqual([
        "That Aurelia resource no longer exists in the current analysis.",
      ]);
      expect(reReadFailure.recorded.openedDocuments).toEqual([]);
    } finally {
      process.off(EXTENSION_HOST_OBSERVATION_EVENT, throwOnOpened);
      observation.dispose();
    }
  });

  test.each([
    ["resource", undefined, 3],
    ["implementation", undefined, 11],
    ["alias", "alias:store-card", 5],
    ["bindable", "bindable:label", 7],
  ] as const)("re-resolves the current %s source by stable identity", async (role, child, line) => {
    const current = harness(inventory());

    await expect(openResourceNavigation(
      current.vscode,
      current.lsp as never,
      current.logger as never,
      request(role, child),
    )).resolves.toBe(true);

    expect(current.lsp.getResourceInventory).toHaveBeenCalledWith({ workspaceKey: "file:///repo" });
    expect(current.recorded.shownDocuments[0]?.opts).toEqual(expect.objectContaining({
      preview: true,
      selection: expect.objectContaining({
        start: expect.objectContaining({ line }),
      }),
    }));
  });

  test("opens beside only after exact current implementation re-resolution", async () => {
    const current = harness(inventory());

    await openResourceNavigation(
      current.vscode,
      current.lsp as never,
      current.logger as never,
      { ...request("implementation"), placement: "beside" },
    );

    expect(current.recorded.shownDocuments[0]?.opts).toEqual(expect.objectContaining({
      preview: true,
      viewColumn: current.vscode.ViewColumn.Beside,
    }));
  });

  test("keeps pathless and retired identities actionless without a fallback open", async () => {
    const pathless = harness(inventory({ pathless: true }));
    await expect(openResourceNavigation(
      pathless.vscode,
      pathless.lsp as never,
      pathless.logger as never,
      request("resource"),
    )).resolves.toBe(false);
    expect(pathless.recorded.shownDocuments).toHaveLength(0);
    expect(pathless.recorded.infoMessages).toEqual(["Source location unavailable for product-card."]);

    const retired = harness({ ...inventory(), workspaces: [] });
    await expect(openResourceNavigation(
      retired.vscode,
      retired.lsp as never,
      retired.logger as never,
      request("resource"),
    )).resolves.toBe(false);
    expect(retired.recorded.shownDocuments).toHaveLength(0);
  });

  test("signals an expected strict-snapshot change before looking up a retired identity", async () => {
    const shifted = harness(inventory());

    await expect(openResourceNavigation(
      shifted.vscode,
      shifted.lsp as never,
      shifted.logger as never,
      { ...request("resource"), currentness: "strict-snapshot" },
    )).rejects.toMatchObject({
      code: "AURELIA_RESOURCE_SNAPSHOT_CHANGED",
      currentFingerprint: "current",
      resourcePresence: "present",
    });
    expect(shifted.recorded.infoMessages).toEqual([]);
    expect(shifted.recorded.shownDocuments).toEqual([]);

    const missingWorkspace = harness({ workspaces: [] });
    await expect(openResourceNavigation(
      missingWorkspace.vscode,
      missingWorkspace.lsp as never,
      missingWorkspace.logger as never,
      { ...request("resource"), currentness: "strict-snapshot" },
    )).rejects.toMatchObject({
      code: "AURELIA_RESOURCE_SNAPSHOT_CHANGED",
      currentFingerprint: null,
      resourcePresence: "unconfirmed",
    });
    expect(missingWorkspace.recorded.infoMessages).toEqual([]);

    const unsupportedResponse = inventory() as any;
    unsupportedResponse.workspaces[0].response.projects[0].answer.result = "unsupported";
    const unsupported = harness(unsupportedResponse);
    await expect(openResourceNavigation(
      unsupported.vscode,
      unsupported.lsp as never,
      unsupported.logger as never,
      { ...request("resource"), currentness: "strict-snapshot" },
    )).rejects.toMatchObject({
      code: "AURELIA_RESOURCE_SNAPSHOT_CHANGED",
      currentFingerprint: "current",
      resourcePresence: "unconfirmed",
    });
    expect(unsupported.recorded.infoMessages).toEqual([]);

    const absentResponse = inventory() as any;
    absentResponse.workspaces[0].response.projects[0].resources = [];
    const absent = harness(absentResponse);
    await expect(openResourceNavigation(
      absent.vscode,
      absent.lsp as never,
      absent.logger as never,
      { ...request("resource"), currentness: "strict-snapshot" },
    )).rejects.toMatchObject({
      currentFingerprint: "current",
      resourcePresence: "absent",
    });

    absentResponse.workspaces[0].response.projects[0].answer.coverage = "open";
    const unconfirmed = harness(absentResponse);
    await expect(openResourceNavigation(
      unconfirmed.vscode,
      unconfirmed.lsp as never,
      unconfirmed.logger as never,
      { ...request("resource"), currentness: "strict-snapshot" },
    )).rejects.toMatchObject({
      currentFingerprint: "current",
      resourcePresence: "unconfirmed",
    });
  });

  test("does not capture editor facts when the resource-discovery observation gate is disabled", async () => {
    const previousObservation = process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION;
    const previousAcceptance = process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE;
    process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION = "1";
    process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE = "0";
    try {
      const current = harness(inventory());
      const editorRead = vi.fn(() => null);
      Object.defineProperty(current.vscode.window, "activeTextEditor", {
        configurable: true,
        get: editorRead,
      });

      await expect(openResourceNavigation(
        current.vscode,
        current.lsp as never,
        current.logger as never,
        request("resource"),
      )).resolves.toBe(true);
      expect(editorRead).not.toHaveBeenCalled();
    } finally {
      restoreEnvironment("AURELIA_LS_EXTENSION_HOST_OBSERVATION", previousObservation);
      restoreEnvironment("AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE", previousAcceptance);
    }
  });

  test.each(["failed", "invalid"] as const)(
    "throws operational %s project answers before resolving a malformed resource row",
    async (result) => {
      const response = inventory() as any;
      response.workspaces[0].response.projects[0].answer = {
        ...response.workspaces[0].response.projects[0].answer,
        result,
        summary: "private C:\\workspace\\semantic failure",
      };
      const current = harness(response);

      await expect(openResourceNavigation(
        current.vscode,
        current.lsp as never,
        current.logger as never,
        request("resource"),
      )).rejects.toThrow(result);
      expect(current.recorded.infoMessages).toEqual([]);
      expect(current.recorded.shownDocuments).toEqual([]);
    },
  );

  test("keeps unsupported navigation distinct and never opens its malformed resource row", async () => {
    const response = inventory() as any;
    response.workspaces[0].response.projects[0].answer = {
      ...response.workspaces[0].response.projects[0].answer,
      result: "unsupported",
      summary: "private unsupported detail",
    };
    const current = harness(response);

    await expect(openResourceNavigation(
      current.vscode,
      current.lsp as never,
      current.logger as never,
      request("resource"),
    )).resolves.toBe(false);
    expect(current.recorded.infoMessages).toEqual([
      "Resource navigation isn't supported for this Aurelia project.",
    ]);
    expect(current.recorded.shownDocuments).toEqual([]);
  });

  test("does not claim removal when incomplete discovery cannot confirm an identity", async () => {
    const response = inventory() as any;
    response.workspaces[0].response.projects[0].answer.coverage = "open";
    response.workspaces[0].response.projects[0].resources = [];
    const current = harness(response);

    await expect(openResourceNavigation(
      current.vscode,
      current.lsp as never,
      current.logger as never,
      request("resource"),
    )).rejects.toThrow("could not be confirmed");
    await expect(openResourceNavigation(
      current.vscode,
      current.lsp as never,
      current.logger as never,
      { ...request("resource"), fingerprint: "current", currentness: "strict-snapshot" },
    )).rejects.not.toMatchObject({ code: "AURELIA_RESOURCE_SNAPSHOT_CHANGED" });
    expect(current.recorded.infoMessages).not.toContain(
      "That Aurelia resource no longer exists in the current analysis.",
    );
    expect(current.recorded.shownDocuments).toEqual([]);
  });

  test("requires complete coverage and full metadata before declaring a child detail retired", async () => {
    const incomplete = inventory() as any;
    incomplete.workspaces[0].response.projects[0].resources[0].metadataState = "header-only";
    incomplete.workspaces[0].response.projects[0].resources[0].aliases = [];
    const incompleteHarness = harness(incomplete);

    await expect(openResourceNavigation(
      incompleteHarness.vscode,
      incompleteHarness.lsp as never,
      incompleteHarness.logger as never,
      request("alias", "alias:store-card"),
    )).rejects.toThrow("could not be confirmed");
    expect(incompleteHarness.recorded.infoMessages).toEqual([]);

    const complete = inventory() as any;
    complete.workspaces[0].response.projects[0].resources[0].aliases = [];
    const completeHarness = harness(complete);
    await expect(openResourceNavigation(
      completeHarness.vscode,
      completeHarness.lsp as never,
      completeHarness.logger as never,
      request("alias", "alias:store-card"),
    )).resolves.toBe(false);
    expect(completeHarness.recorded.infoMessages).toEqual([
      "That Aurelia resource detail no longer exists in the current analysis.",
    ]);
    expect(completeHarness.recorded.shownDocuments).toEqual([]);
  });

  test("throws workspace and project transport errors for the safe outer recovery boundary", async () => {
    const workspaceFailure = inventory() as any;
    workspaceFailure.workspaces[0] = {
      key: "file:///repo",
      name: "repo",
      uri: "file:///repo",
      status: "error",
      error: "private workspace failure",
    };
    const workspaceHarness = harness(workspaceFailure);
    await expect(openResourceNavigation(
      workspaceHarness.vscode,
      workspaceHarness.lsp as never,
      workspaceHarness.logger as never,
      request("resource"),
    )).rejects.toThrow("private workspace failure");

    const projectFailure = inventory() as any;
    projectFailure.workspaces[0].response.projects[0] = {
      status: "error",
      project: { projectKey: "app" },
      message: "private project failure",
    };
    const projectHarness = harness(projectFailure);
    await expect(openResourceNavigation(
      projectHarness.vscode,
      projectHarness.lsp as never,
      projectHarness.logger as never,
      request("resource"),
    )).rejects.toThrow("private project failure");
    expect([...workspaceHarness.recorded.infoMessages, ...projectHarness.recorded.infoMessages]).toEqual([]);
  });
});

function captureNavigationObservations(): {
  readonly events: ExtensionHostObservation[];
  dispose(): void;
} {
  const observationEnv = "AURELIA_LS_EXTENSION_HOST_OBSERVATION";
  const acceptanceEnv = "AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE";
  const previousObservation = process.env[observationEnv];
  const previousAcceptance = process.env[acceptanceEnv];
  const events: ExtensionHostObservation[] = [];
  const listener = (event: ExtensionHostObservation): void => {
    if (event.source === "resource-navigation") events.push(event);
  };
  process.env[observationEnv] = "1";
  process.env[acceptanceEnv] = "1";
  process.on(EXTENSION_HOST_OBSERVATION_EVENT, listener);
  return {
    events,
    dispose: () => {
      process.off(EXTENSION_HOST_OBSERVATION_EVENT, listener);
      if (previousObservation == null) delete process.env[observationEnv];
      else process.env[observationEnv] = previousObservation;
      if (previousAcceptance == null) delete process.env[acceptanceEnv];
      else process.env[acceptanceEnv] = previousAcceptance;
    },
  };
}

function isObservationPrimitive(value: unknown): boolean {
  return value == null || ["string", "number", "boolean"].includes(typeof value);
}

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value == null) delete process.env[key];
  else process.env[key] = value;
}
