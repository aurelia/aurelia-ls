import { describe, expect, test, vi } from "vitest";
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
    )).rejects.toMatchObject({ code: "AURELIA_RESOURCE_SNAPSHOT_CHANGED" });
    expect(shifted.recorded.infoMessages).toEqual([]);
    expect(shifted.recorded.shownDocuments).toEqual([]);

    const missingWorkspace = harness({ workspaces: [] });
    await expect(openResourceNavigation(
      missingWorkspace.vscode,
      missingWorkspace.lsp as never,
      missingWorkspace.logger as never,
      { ...request("resource"), currentness: "strict-snapshot" },
    )).rejects.toMatchObject({ code: "AURELIA_RESOURCE_SNAPSHOT_CHANGED" });
    expect(missingWorkspace.recorded.infoMessages).toEqual([]);

    const unsupportedResponse = inventory() as any;
    unsupportedResponse.workspaces[0].response.projects[0].answer.result = "unsupported";
    const unsupported = harness(unsupportedResponse);
    await expect(openResourceNavigation(
      unsupported.vscode,
      unsupported.lsp as never,
      unsupported.logger as never,
      { ...request("resource"), currentness: "strict-snapshot" },
    )).rejects.toMatchObject({ code: "AURELIA_RESOURCE_SNAPSHOT_CHANGED" });
    expect(unsupported.recorded.infoMessages).toEqual([]);
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
