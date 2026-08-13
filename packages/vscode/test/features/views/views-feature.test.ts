import type { Disposable } from "vscode";
import { describe, expect, test, vi } from "vitest";
import {
  EXTENSION_HOST_OBSERVATION_EVENT,
  type ExtensionHostObservation,
} from "../../../out/extension-host-observation.js";
import { ViewsFeature } from "../../../out/features/views/views-feature.js";
import { AureliaCommand } from "../../../out/product-contract.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi } from "../../helpers/vscode-stub.js";

interface TestEmitter<T> {
  readonly event: (listener: (value: T) => void) => Disposable;
  fire(value: T): void;
}

function createEmitter<T>(): TestEmitter<T> {
  const listeners = new Set<(value: T) => void>();
  return {
    event: (listener) => {
      listeners.add(listener);
      return { dispose: () => listeners.delete(listener) };
    },
    fire: (value) => {
      for (const listener of [...listeners]) listener(value);
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => { resolve = accept; });
  return { promise, resolve };
}

function inventorySnapshot(...workspaceKeys: readonly string[]) {
  return {
    workspaces: workspaceKeys.map((key) => ({
      key,
      name: key.split("/").at(-1) ?? key,
      uri: key,
      status: "ready" as const,
      response: { fingerprint: `${key}:current`, projects: [] },
    })),
  };
}

function failedInventorySnapshot(...workspaceKeys: readonly string[]) {
  return {
    workspaces: workspaceKeys.map((key) => ({
      key,
      name: key.split("/").at(-1) ?? key,
      uri: key,
      status: "error" as const,
      error: "internal detail",
    })),
  };
}

function navigableInventorySnapshot(includeResource = true) {
  const location = (role: string, line: number) => ({
    state: "available" as const,
    location: {
      uri: "file:///work/a/src/product-card.ts",
      range: { start: { line, character: 1 }, end: { line, character: 13 } },
      role,
      label: `src/product-card.ts:${line + 1}`,
    },
  });
  const absent = { state: "absent" as const };
  const resource = {
    identityKey: "resource:product-card",
    projectKey: "app",
    kind: "custom-element",
    name: "product-card",
    registrationKey: "au:resource:custom-element:product-card",
    aliases: [],
    bindables: [],
    declarationModes: ["decorator"],
    metadataState: "full-definition",
    origin: {
      kind: "project",
      projectKey: "app",
      packageName: null,
      moduleKey: "src/product-card.ts",
      catalogGroup: null,
    },
    locality: { kind: "project", ownerIdentityKey: null, ownerName: null, ownerSource: absent },
    sources: {
      publicName: location("public-name", 1),
      declaration: location("declaration", 0),
      implementation: location("implementation", 5),
    },
    navigation: location("public-name", 1),
  };
  return {
    workspaces: [{
      key: "file:///work/a",
      name: "a",
      uri: "file:///work/a",
      status: "ready" as const,
      response: {
        fingerprint: "current",
        projects: [{
          status: "ready" as const,
          project: {
            projectKey: "app",
            rootUri: "file:///work/a",
            sourceFiles: 2,
            shapeKind: "aurelia-app",
            analysisKind: "full",
          },
          answer: {
            schemaVersion: "0.2",
            result: "answered",
            selection: "not-applicable",
            coverage: "complete",
            summary: "complete",
            page: null,
          },
          typeSurfacesIncluded: true,
          resources: includeResource ? [resource] : [],
          completeness: {
            fullDefinitions: includeResource ? 1 : 0,
            headerOnly: 0,
            visibilityOnly: 0,
            localTemplates: 0,
            excludedCompilerSyntax: 0,
            unnamedDefinitions: 0,
            unresolvedModules: 0,
            openVisibility: 0,
          },
        }],
      },
    }],
  };
}

function createHarness(options: {
  readonly visible?: boolean;
  readonly getResourceInventory?: (options?: unknown) => Promise<unknown>;
  readonly getAnalysisLimitations?: (options?: unknown) => Promise<unknown>;
  readonly informationAction?: "Retry" | "Open Aurelia Output";
} = {}) {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const visibility = createEmitter<{ readonly visible: boolean }>();
  const analysisChanged = createEmitter<unknown>();
  const sessionsChanged = createEmitter<unknown>();
  let visible = options.visible === true;
  let treeDataProvider: { getChildren(element?: unknown): unknown } | null = null;
  const view = {
    get visible() { return visible; },
    onDidChangeVisibility: visibility.event,
    message: undefined as string | undefined,
    description: undefined as string | undefined,
    dispose: vi.fn(),
  };
  const withProgress = vi.fn(async (
    _options: unknown,
    task: () => Promise<unknown>,
  ) => await task());
  const showInformationMessage = vi.fn(async (message: string, ..._actions: readonly string[]) => {
    recorded.infoMessages.push(message);
    return options.informationAction;
  });
  Object.assign(stubVscode.window, {
    createTreeView: vi.fn((_id: string, options: { treeDataProvider: typeof treeDataProvider }) => {
      treeDataProvider = options.treeDataProvider;
      return view;
    }),
    withProgress,
    showInformationMessage,
  });

  const getResourceInventory = vi.fn(options.getResourceInventory ?? (async () => null));
  const getAnalysisLimitations = vi.fn(options.getAnalysisLimitations ?? (async () => null));
  const logger = { debug: vi.fn(), warn: vi.fn(), show: vi.fn() };
  const contributions: Disposable[] = [];
  ViewsFeature.activate({
    vscode: stubVscode as unknown as VscodeApi,
    lsp: {
      getResourceInventory,
      getAnalysisLimitations,
      onAnalysisChanged: analysisChanged.event,
    },
    languageClient: {
      onDidChangeSessions: sessionsChanged.event,
    },
    logger,
  } as never, (contribution) => {
    contributions.push(contribution);
    return contribution;
  });

  return {
    getAnalysisLimitations,
    getResourceInventory,
    logger,
    recorded,
    get treeDataProvider() { return treeDataProvider; },
    view,
    vscode: stubVscode,
    withProgress,
    showInformationMessage,
    fireAnalysisChanged: (
      workspaceKey = "file:///work/a",
      changeKind: "source-text" | "topology" = "source-text",
    ) => analysisChanged.fire({
      fingerprint: `${workspaceKey}:next`,
      changeKind,
      workspace: { key: workspaceKey, name: workspaceKey.split("/").at(-1) ?? workspaceKey, uri: workspaceKey },
    }),
    fireSessionsChanged: () => sessionsChanged.fire({}),
    setVisible(next: boolean) {
      visible = next;
      visibility.fire({ visible: next });
    },
    refreshCommand: () => recorded.commandHandlers.get(AureliaCommand.RefreshResourceExplorer)?.(),
    dispose() {
      for (const contribution of contributions.reverse()) contribution.dispose();
    },
  };
}

async function waitForRootCount(
  provider: { getChildren(element?: unknown): unknown } | null,
  count: number,
): Promise<void> {
  if (provider == null) throw new Error("Resource tree provider was not registered.");
  await vi.waitFor(async () => expect(await Promise.resolve(provider.getChildren())).toHaveLength(count));
}

async function resourceRoots(
  provider: { getChildren(element?: unknown): unknown } | null,
): Promise<ReadonlyArray<{ readonly label: string; readonly description?: string; readonly accessibilityLabel: string }>> {
  if (provider == null) throw new Error("Resource tree provider was not registered.");
  return await Promise.resolve(provider.getChildren()) as ReadonlyArray<{
    readonly label: string;
    readonly description?: string;
    readonly accessibilityLabel: string;
  }>;
}

describe("ViewsFeature resource inventory lifecycle", () => {
  test("observes visibility, progress, matching supersede, and requeue as one view lifecycle", async () => {
    const observation = captureViewObservations();
    try {
      const predecessor = deferred<unknown>();
      const getResourceInventory = vi.fn()
        .mockResolvedValueOnce(inventorySnapshot("file:///work/a", "file:///work/b"))
        .mockImplementationOnce(() => predecessor.promise)
        .mockResolvedValueOnce(inventorySnapshot("file:///work/a"));
      const harness = createHarness({ visible: true, getResourceInventory });
      await waitForRootCount(harness.treeDataProvider, 2);

      harness.fireAnalysisChanged("file:///work/a");
      await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(2));
      harness.fireAnalysisChanged("file:///work/a");
      predecessor.resolve(failedInventorySnapshot("file:///work/a"));
      await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(3));
      harness.setVisible(false);
      harness.setVisible(true);

      expect(observation.events).toEqual(expect.arrayContaining([
        expect.objectContaining({ phase: "visibility", visible: true }),
        expect.objectContaining({ phase: "progress", status: "started" }),
        expect.objectContaining({ phase: "progress", status: "finished" }),
        expect.objectContaining({
          phase: "invalidation",
          scope: "workspace",
          workspaceKey: "file:///work/a",
        }),
        expect.objectContaining({
          phase: "superseded",
          activeScope: "file:///work/a",
          replacementScope: "file:///work/a",
        }),
        expect.objectContaining({ phase: "requeued", scope: "workspace", workspaceKey: "file:///work/a" }),
        expect.objectContaining({ phase: "visibility", visible: false }),
      ]));
      expect(new Set(observation.events.map((event) => event.observationId))).toHaveLength(1);
      expect(observation.events.every(Object.isFrozen)).toBe(true);
      expect(observation.events.every((event) => Object.values(event).every(isObservationPrimitive))).toBe(true);
      harness.dispose();
    } finally {
      observation.dispose();
    }
  });

  test("uses native view-scoped progress and registers the bounded tree action set", async () => {
    const harness = createHarness({ visible: true });
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledOnce());

    expect(harness.withProgress).toHaveBeenCalledWith(
      { location: { viewId: "aureliaResourceExplorer" } },
      expect.any(Function),
    );
    for (const command of [
      AureliaCommand.ExplainResourceAvailability,
      AureliaCommand.OpenResourceDeclaration,
      AureliaCommand.OpenResourceImplementation,
      AureliaCommand.OpenResourceToSide,
      AureliaCommand.RetryResourceProject,
      AureliaCommand.OpenAureliaOutput,
    ]) {
      expect(harness.recorded.commandHandlers.has(command)).toBe(true);
    }
    harness.recorded.commandHandlers.get(AureliaCommand.OpenAureliaOutput)?.();
    expect(harness.logger.show).toHaveBeenCalledWith(true);
    harness.dispose();
  });

  test("executes declaration, implementation, and beside against current re-resolved sources", async () => {
    const current = navigableInventorySnapshot();
    const harness = createHarness({ visible: true, getResourceInventory: async () => current });
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledOnce());
    await vi.waitFor(async () => expect(
      await Promise.resolve(harness.treeDataProvider?.getChildren()),
    ).toHaveLength(1));
    const groups = await Promise.resolve(harness.treeDataProvider?.getChildren()) as readonly unknown[];
    const resources = await Promise.resolve(harness.treeDataProvider?.getChildren(groups[0])) as readonly unknown[];
    const node = resources[0];

    await harness.recorded.commandHandlers.get(AureliaCommand.OpenResourceDeclaration)?.(node);
    await harness.recorded.commandHandlers.get(AureliaCommand.OpenResourceImplementation)?.(node);
    await harness.recorded.commandHandlers.get(AureliaCommand.OpenResourceToSide)?.(node);

    const options = harness.recorded.shownDocuments.map((entry) => entry.opts as {
      readonly selection?: { readonly start?: { readonly line?: number } };
      readonly viewColumn?: number;
    });
    expect(options.map((entry) => entry.selection?.start?.line)).toEqual([1, 5, 1]);
    expect(options[2]?.viewColumn).toBe(harness.vscode.ViewColumn.Beside);
    harness.dispose();
  });

  test("refuses a retired tree object before issuing another inventory request", async () => {
    let current = navigableInventorySnapshot();
    const harness = createHarness({ visible: true, getResourceInventory: async () => current });
    await vi.waitFor(async () => expect(
      await Promise.resolve(harness.treeDataProvider?.getChildren()),
    ).toHaveLength(1));
    const groups = await Promise.resolve(harness.treeDataProvider?.getChildren()) as readonly unknown[];
    const resources = await Promise.resolve(harness.treeDataProvider?.getChildren(groups[0])) as readonly unknown[];
    const retired = resources[0];
    current = navigableInventorySnapshot(false);
    await harness.refreshCommand();
    const callsBefore = harness.getResourceInventory.mock.calls.length;

    await expect(harness.recorded.commandHandlers.get(AureliaCommand.OpenResourceDeclaration)?.(retired))
      .resolves.toBe(false);
    expect(harness.getResourceInventory).toHaveBeenCalledTimes(callsBefore);
    expect(harness.recorded.shownDocuments).toHaveLength(0);
    harness.dispose();
  });

  test("offers actionable recovery without exposing an operational navigation exception", async () => {
    const observation = captureViewObservations();
    try {
      let calls = 0;
      const harness = createHarness({
        visible: true,
        informationAction: "Open Aurelia Output",
        getResourceInventory: async () => {
          if (calls++ === 0) return navigableInventorySnapshot();
          throw new Error("C:\\private\\workspace\\raw failure");
        },
      });
      await vi.waitFor(async () => expect(
        await Promise.resolve(harness.treeDataProvider?.getChildren()),
      ).toHaveLength(1));
      const groups = await Promise.resolve(harness.treeDataProvider?.getChildren()) as readonly unknown[];
      const resources = await Promise.resolve(harness.treeDataProvider?.getChildren(groups[0])) as readonly unknown[];

      await harness.recorded.commandHandlers.get(AureliaCommand.OpenResourceDeclaration)?.(resources[0]);

      expect(harness.showInformationMessage).toHaveBeenCalledWith(
        "The Aurelia resource could not be opened. Try again or open Aurelia Output for details.",
        "Retry",
        "Open Aurelia Output",
      );
      expect(observation.events).toEqual(expect.arrayContaining([
        expect.objectContaining({
          phase: "recovery-presented",
          action: "declaration",
          actionCount: 2,
          message: "The Aurelia resource could not be opened. Try again or open Aurelia Output for details.",
          retryActionLabel: "Retry",
          outputActionLabel: "Open Aurelia Output",
        }),
        expect.objectContaining({
          phase: "recovery-choice",
          action: "declaration",
          choice: "Open Aurelia Output",
        }),
        expect.objectContaining({
          phase: "output-requested",
          origin: "navigation-recovery",
          action: "declaration",
        }),
      ]));
      expect(JSON.stringify(observation.events)).not.toContain("private");
      expect(harness.recorded.infoMessages.join(" ")).not.toContain("private");
      expect(harness.logger.show).toHaveBeenCalledWith(true);
      harness.dispose();
    } finally {
      observation.dispose();
    }
  });

  test("Retry refreshes, re-resolves, and executes the original tree navigation action", async () => {
    let calls = 0;
    const harness = createHarness({
      visible: true,
      informationAction: "Retry",
      getResourceInventory: async () => {
        calls += 1;
        if (calls === 2) throw new Error("private transient navigation failure");
        return navigableInventorySnapshot();
      },
    });
    await vi.waitFor(async () => expect(
      await Promise.resolve(harness.treeDataProvider?.getChildren()),
    ).toHaveLength(1));
    const groups = await Promise.resolve(harness.treeDataProvider?.getChildren()) as readonly unknown[];
    const resources = await Promise.resolve(harness.treeDataProvider?.getChildren(groups[0])) as readonly unknown[];

    await expect(harness.recorded.commandHandlers.get(AureliaCommand.OpenResourceDeclaration)?.(resources[0]))
      .resolves.toBe(true);

    expect(harness.getResourceInventory).toHaveBeenCalledTimes(4);
    expect(harness.recorded.shownDocuments).toHaveLength(1);
    expect(harness.recorded.shownDocuments[0]?.opts).toMatchObject({
      selection: { start: { line: 1, character: 1 }, end: { line: 1, character: 13 } },
    });
    expect(harness.recorded.infoMessages.join(" ")).not.toContain("private");
    harness.dispose();
  });

  test("Retry refuses a stable tree identity retired by the recovery refresh", async () => {
    let calls = 0;
    const harness = createHarness({
      visible: true,
      informationAction: "Retry",
      getResourceInventory: async () => {
        calls += 1;
        if (calls === 2) throw new Error("private transient navigation failure");
        return calls === 3 ? navigableInventorySnapshot(false) : navigableInventorySnapshot();
      },
    });
    await vi.waitFor(async () => expect(
      await Promise.resolve(harness.treeDataProvider?.getChildren()),
    ).toHaveLength(1));
    const groups = await Promise.resolve(harness.treeDataProvider?.getChildren()) as readonly unknown[];
    const resources = await Promise.resolve(harness.treeDataProvider?.getChildren(groups[0])) as readonly unknown[];

    await expect(harness.recorded.commandHandlers.get(AureliaCommand.OpenResourceDeclaration)?.(resources[0]))
      .resolves.toBe(false);

    expect(harness.getResourceInventory).toHaveBeenCalledTimes(3);
    expect(harness.recorded.shownDocuments).toEqual([]);
    harness.dispose();
  });

  test("routes a shifted failed project answer through safe tree recovery without opening", async () => {
    const initial = navigableInventorySnapshot();
    const failed = navigableInventorySnapshot();
    failed.workspaces[0]!.response.projects[0]!.answer.result = "failed";
    failed.workspaces[0]!.response.projects[0]!.answer.summary = "private C:\\workspace\\semantic failure";
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(failed);
    const harness = createHarness({ visible: true, getResourceInventory });
    await vi.waitFor(async () => expect(
      await Promise.resolve(harness.treeDataProvider?.getChildren()),
    ).toHaveLength(1));
    const groups = await Promise.resolve(harness.treeDataProvider?.getChildren()) as readonly unknown[];
    const resources = await Promise.resolve(harness.treeDataProvider?.getChildren(groups[0])) as readonly unknown[];

    await harness.recorded.commandHandlers.get(AureliaCommand.OpenResourceDeclaration)?.(resources[0]);

    expect(harness.showInformationMessage).toHaveBeenCalledWith(
      "The Aurelia resource could not be opened. Try again or open Aurelia Output for details.",
      "Retry",
      "Open Aurelia Output",
    );
    expect(harness.recorded.infoMessages.join(" ")).not.toContain("private");
    expect(harness.recorded.openedDocuments).toEqual([]);
    harness.dispose();
  });

  test("retries only the affected project workspace selected by its current issue root", async () => {
    const observation = captureViewObservations();
    try {
      const first = failedInventorySnapshot("file:///work/a", "file:///work/b");
      const getResourceInventory = vi.fn(async (options?: { readonly workspaceKey?: string }) =>
        options?.workspaceKey == null ? first : failedInventorySnapshot(options.workspaceKey));
      const harness = createHarness({ visible: true, getResourceInventory });
      await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledOnce());
      await vi.waitFor(async () => expect(
        await Promise.resolve(harness.treeDataProvider?.getChildren()),
      ).toHaveLength(2));
      const roots = await Promise.resolve(harness.treeDataProvider?.getChildren()) as Array<{
        readonly label: string;
      }>;

      await harness.recorded.commandHandlers.get(AureliaCommand.RetryResourceProject)?.(roots[1]);
      await harness.recorded.commandHandlers.get(AureliaCommand.OpenAureliaOutput)?.();

      expect(harness.getResourceInventory).toHaveBeenLastCalledWith({
        workspaceKey: "file:///work/b",
        includeTypeSurfaces: true,
      });
      expect(observation.events).toEqual(expect.arrayContaining([
        expect.objectContaining({ phase: "retry", workspaceKey: "file:///work/b", admitted: true }),
        expect.objectContaining({ phase: "output-requested", origin: "tree-action" }),
      ]));
      harness.dispose();
    } finally {
      observation.dispose();
    }
  });

  test("scopes settled source invalidation to its workspace and keeps topology refresh aggregate", async () => {
    const first = inventorySnapshot("file:///work/a", "file:///work/b");
    const getResourceInventory = vi.fn(async (options?: { readonly workspaceKey?: string }) =>
      options?.workspaceKey == null ? first : inventorySnapshot(options.workspaceKey));
    const harness = createHarness({ visible: true, getResourceInventory });

    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledOnce());
    await waitForRootCount(harness.treeDataProvider, 2);
    expect(harness.getResourceInventory).toHaveBeenLastCalledWith({ includeTypeSurfaces: true });

    harness.fireAnalysisChanged("file:///work/a");
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledTimes(2));
    expect(harness.getResourceInventory).toHaveBeenLastCalledWith({
      workspaceKey: "file:///work/a",
      includeTypeSurfaces: true,
    });

    harness.fireAnalysisChanged("file:///work/a", "topology");
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledTimes(3));
    expect(harness.getResourceInventory).toHaveBeenLastCalledWith({ includeTypeSurfaces: true });
    harness.dispose();
  });

  test("lets a queued full invalidation dominate hidden workspace keys", async () => {
    const getResourceInventory = vi.fn(async () => inventorySnapshot("file:///work/a", "file:///work/b"));
    const harness = createHarness({ visible: true, getResourceInventory });
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledOnce());
    await waitForRootCount(harness.treeDataProvider, 2);

    harness.setVisible(false);
    harness.fireAnalysisChanged("file:///work/a");
    harness.fireAnalysisChanged("file:///work/b");
    harness.fireAnalysisChanged("file:///work/a", "topology");
    harness.setVisible(true);

    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledTimes(2));
    expect(harness.getResourceInventory).toHaveBeenLastCalledWith({ includeTypeSurfaces: true });
    harness.dispose();
  });

  test("coalesces repeated workspace invalidations without dropping an independent root", async () => {
    const firstWorkspaceRefresh = deferred<unknown>();
    let workspaceACalls = 0;
    const getResourceInventory = vi.fn((options?: { readonly workspaceKey?: string }) => {
      if (options?.workspaceKey === "file:///work/a" && workspaceACalls++ === 0) {
        return firstWorkspaceRefresh.promise;
      }
      return Promise.resolve(options?.workspaceKey == null
        ? inventorySnapshot("file:///work/a", "file:///work/b")
        : inventorySnapshot(options.workspaceKey));
    });
    const harness = createHarness({ visible: true, getResourceInventory });
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledOnce());
    await waitForRootCount(harness.treeDataProvider, 2);

    harness.fireAnalysisChanged("file:///work/a");
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledTimes(2));
    harness.fireAnalysisChanged("file:///work/a");
    harness.fireAnalysisChanged("file:///work/a");
    harness.fireAnalysisChanged("file:///work/b");
    expect(harness.getResourceInventory).toHaveBeenCalledTimes(2);

    firstWorkspaceRefresh.resolve(inventorySnapshot("file:///work/a"));
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledTimes(4));
    expect(harness.getResourceInventory.mock.calls.map(([options]) => options)).toEqual([
      { includeTypeSurfaces: true },
      { workspaceKey: "file:///work/a", includeTypeSurfaces: true },
      { workspaceKey: "file:///work/a", includeTypeSurfaces: true },
      { workspaceKey: "file:///work/b", includeTypeSurfaces: true },
    ]);
    harness.dispose();
  });

  test("supersedes a held workspace predecessor and publishes only its trailing current result", async () => {
    const predecessor = deferred<unknown>();
    const trailing = deferred<unknown>();
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(inventorySnapshot("file:///work/a", "file:///work/b"))
      .mockImplementationOnce(() => predecessor.promise)
      .mockImplementationOnce(() => trailing.promise);
    const harness = createHarness({ visible: true, getResourceInventory });
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledOnce());
    await waitForRootCount(harness.treeDataProvider, 2);

    harness.fireAnalysisChanged("file:///work/a");
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(2));
    harness.fireAnalysisChanged("file:///work/a");
    predecessor.resolve(failedInventorySnapshot("file:///work/a"));
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(3));

    expect(JSON.stringify(await Promise.resolve(harness.treeDataProvider?.getChildren())))
      .not.toContain("Couldn't load Aurelia resources");
    expect(getResourceInventory.mock.calls.map(([options]) => options)).toEqual([
      { includeTypeSurfaces: true },
      { workspaceKey: "file:///work/a", includeTypeSurfaces: true },
      { workspaceKey: "file:///work/a", includeTypeSurfaces: true },
    ]);
    trailing.resolve(inventorySnapshot("file:///work/a"));
    await vi.waitFor(() => expect(harness.view.message).toBeUndefined());
    harness.dispose();
  });

  test("deduplicates a scoped updating publication until its superseding trailing refresh settles", async () => {
    const observation = captureResourceDiscoveryObservations("resource-explorer", "resource-explorer-view");
    const predecessor = deferred<unknown>();
    const trailing = deferred<unknown>();
    const next = deferred<unknown>();
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(inventorySnapshot("file:///work/a", "file:///work/b"))
      .mockImplementationOnce(() => predecessor.promise)
      .mockImplementationOnce(() => trailing.promise)
      .mockImplementationOnce(() => next.promise);
    const harness = createHarness({ visible: true, getResourceInventory });
    try {
      await waitForRootCount(harness.treeDataProvider, 2);
      observation.events.length = 0;

      harness.fireAnalysisChanged("file:///work/a");
      await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(2));
      harness.fireAnalysisChanged("file:///work/a");

      const viewInvalidations = observation.events.filter((event) =>
        event.source === "resource-explorer-view"
          && event.phase === "invalidation"
          && event.scope === "workspace"
          && event.workspaceKey === "file:///work/a"
      );
      const superseded = observation.events.find((event) =>
        event.source === "resource-explorer-view"
          && event.phase === "superseded"
          && event.activeScope === "file:///work/a"
          && event.replacementScope === "file:///work/a"
      );
      const requeued = observation.events.filter((event) =>
        event.source === "resource-explorer-view"
          && event.phase === "requeued"
          && event.scope === "workspace"
          && event.workspaceKey === "file:///work/a"
      );
      expect(viewInvalidations).toHaveLength(2);
      expect(superseded).toBeDefined();
      expect(requeued).toHaveLength(2);
      expect(observation.events.indexOf(viewInvalidations[1]!)).toBeLessThan(observation.events.indexOf(superseded!));
      expect(observation.events.indexOf(superseded!)).toBeLessThan(observation.events.indexOf(requeued[1]!));
      expect(observation.events.filter(isUpdatingPublication)).toHaveLength(1);

      predecessor.resolve(failedInventorySnapshot("file:///work/a"));
      await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(3));
      expect(observation.events.filter(isUpdatingPublication)).toHaveLength(1);

      trailing.resolve(inventorySnapshot("file:///work/a"));
      await vi.waitFor(() => expect(observation.events.filter(isCurrentPublication)).toHaveLength(1));
      await vi.waitFor(async () => expect(
        (await resourceRoots(harness.treeDataProvider)).every((root) => !root.accessibilityLabel.includes("updating")),
      ).toBe(true));
      await Promise.resolve();

      const firstUpdating = observation.events.find(isUpdatingPublication)!;
      const trailingCurrent = observation.events.find(isCurrentPublication)!;
      harness.fireAnalysisChanged("file:///work/a");
      await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(4));

      const updatingPublications = observation.events.filter(isUpdatingPublication);
      expect(updatingPublications).toHaveLength(2);
      expect(updatingPublications[1]).toEqual(expect.objectContaining({
        observationId: firstUpdating.observationId,
        generation: trailingCurrent.generation,
        publicationKind: "updating",
        fingerprint: null,
      }));

      next.resolve(inventorySnapshot("file:///work/a"));
      await vi.waitFor(() => expect(observation.events.filter(isCurrentPublication)).toHaveLength(2));
    } finally {
      predecessor.resolve(failedInventorySnapshot("file:///work/a"));
      trailing.resolve(inventorySnapshot("file:///work/a"));
      next.resolve(inventorySnapshot("file:///work/a"));
      harness.dispose();
      observation.dispose();
    }
  });

  test("promotes a source invalidation over a held full request and publishes only its full retry", async () => {
    const observation = captureResourceDiscoveryObservations("resource-explorer", "resource-explorer-view");
    const predecessor = deferred<unknown>();
    const trailing = deferred<unknown>();
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(inventorySnapshot("file:///work/a", "file:///work/b"))
      .mockImplementationOnce(() => predecessor.promise)
      .mockImplementationOnce(() => trailing.promise);
    const harness = createHarness({ visible: true, getResourceInventory });
    try {
      await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledOnce());
      await waitForRootCount(harness.treeDataProvider, 2);
      observation.events.length = 0;

      harness.fireAnalysisChanged("file:///work/a", "topology");
      await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(2));
      harness.fireAnalysisChanged("file:///work/a");

      const workspaceInvalidation = observation.events.find((event) =>
        event.source === "resource-explorer-view"
          && event.phase === "invalidation"
          && event.scope === "workspace"
          && event.workspaceKey === "file:///work/a"
      );
      const superseded = observation.events.find((event) =>
        event.source === "resource-explorer-view"
          && event.phase === "superseded"
          && event.activeScope === "all"
          && event.replacementScope === "all"
          && event.workspaceKey === "file:///work/a"
      );
      const requeued = observation.events.find((event) =>
        event.source === "resource-explorer-view"
          && event.phase === "requeued"
          && event.scope === "all"
          && event.workspaceKey === "file:///work/a"
      );
      expect(workspaceInvalidation).toBeDefined();
      expect(superseded).toBeDefined();
      expect(requeued).toBeDefined();
      expect(observation.events.indexOf(workspaceInvalidation!))
        .toBeLessThan(observation.events.indexOf(superseded!));
      expect(observation.events.indexOf(superseded!))
        .toBeLessThan(observation.events.indexOf(requeued!));

      predecessor.resolve(failedInventorySnapshot("file:///work/a", "file:///work/b"));
      await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(3));
      const discarded = observation.events.find((event) =>
        event.source === "resource-explorer"
          && event.phase === "discarded"
          && event.reason === "superseded"
      );
      expect(discarded).toBeDefined();
      expect(observation.events.indexOf(requeued!)).toBeLessThan(observation.events.indexOf(discarded!));
      expect(observation.events.filter(isCurrentPublication)).toHaveLength(0);
      expect(JSON.stringify(await Promise.resolve(harness.treeDataProvider?.getChildren())))
        .not.toContain("Couldn't load Aurelia resources");

      trailing.resolve(inventorySnapshot("file:///work/a", "file:///work/b"));
      await vi.waitFor(() => expect(observation.events.filter(isCurrentPublication)).toHaveLength(1));
      const current = observation.events.find(isCurrentPublication)!;
      expect(observation.events.indexOf(discarded!)).toBeLessThan(observation.events.indexOf(current));
      expect(current).toEqual(expect.objectContaining({ workspaceIdentity: null, fingerprint: null }));
      expect(harness.view.message).toBeUndefined();
      expect(getResourceInventory.mock.calls.map(([options]) => options)).toEqual([
        { includeTypeSurfaces: true },
        { includeTypeSurfaces: true },
        { includeTypeSurfaces: true },
      ]);
    } finally {
      predecessor.resolve(failedInventorySnapshot("file:///work/a", "file:///work/b"));
      trailing.resolve(inventorySnapshot("file:///work/a", "file:///work/b"));
      harness.dispose();
      observation.dispose();
    }
  });

  test("allows held workspace A to publish when only unrelated workspace B is invalidated", async () => {
    const workspaceA = deferred<unknown>();
    const workspaceB = deferred<unknown>();
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(inventorySnapshot("file:///work/a", "file:///work/b"))
      .mockImplementationOnce(() => workspaceA.promise)
      .mockImplementationOnce(() => workspaceB.promise);
    const harness = createHarness({ visible: true, getResourceInventory });
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledOnce());
    await waitForRootCount(harness.treeDataProvider, 2);

    harness.fireAnalysisChanged("file:///work/a");
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(2));
    harness.fireAnalysisChanged("file:///work/b");
    workspaceA.resolve(navigableInventorySnapshot());
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(3));

    expect(JSON.stringify(await Promise.resolve(harness.treeDataProvider?.getChildren())))
      .toContain("product-card");
    expect(getResourceInventory.mock.calls[2]?.[0]).toEqual({
      workspaceKey: "file:///work/b",
      includeTypeSurfaces: true,
    });
    workspaceB.resolve(inventorySnapshot("file:///work/b"));
    await Promise.resolve();
    harness.dispose();
  });

  test("keeps every dirty workspace visibly updating until its own latest request settles", async () => {
    const workspaceA = deferred<unknown>();
    const workspaceB = deferred<unknown>();
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(inventorySnapshot("file:///work/a", "file:///work/b"))
      .mockImplementationOnce(() => workspaceA.promise)
      .mockImplementationOnce(() => workspaceB.promise);
    const harness = createHarness({ visible: true, getResourceInventory });
    await waitForRootCount(harness.treeDataProvider, 2);

    harness.fireAnalysisChanged("file:///work/a");
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(2));
    harness.fireAnalysisChanged("file:///work/b");

    let roots = await resourceRoots(harness.treeDataProvider);
    expect(roots).toHaveLength(2);
    expect(roots.every((root) => root.description?.includes("updating") === true)).toBe(true);
    expect(roots.every((root) => root.accessibilityLabel.includes("updating"))).toBe(true);

    workspaceA.resolve(inventorySnapshot("file:///work/a"));
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(3));
    roots = await resourceRoots(harness.treeDataProvider);
    const rootA = roots.find((root) => root.label === "a");
    const rootB = roots.find((root) => root.label === "b");
    expect(rootA?.description).not.toContain("updating");
    expect(rootA?.accessibilityLabel).not.toContain("updating");
    expect(rootB?.description).toContain("updating");
    expect(rootB?.accessibilityLabel).toContain("updating");

    workspaceB.resolve(inventorySnapshot("file:///work/b"));
    await vi.waitFor(async () => expect(
      (await resourceRoots(harness.treeDataProvider)).every((root) => !root.accessibilityLabel.includes("updating")),
    ).toBe(true));
    harness.dispose();
  });

  test("preserves queued updating scopes when the active predecessor is superseded", async () => {
    const predecessorA = deferred<unknown>();
    const workspaceB = deferred<unknown>();
    const trailingA = deferred<unknown>();
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(inventorySnapshot("file:///work/a", "file:///work/b"))
      .mockImplementationOnce(() => predecessorA.promise)
      .mockImplementationOnce(() => workspaceB.promise)
      .mockImplementationOnce(() => trailingA.promise);
    const harness = createHarness({ visible: true, getResourceInventory });
    await waitForRootCount(harness.treeDataProvider, 2);

    harness.fireAnalysisChanged("file:///work/a");
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(2));
    harness.fireAnalysisChanged("file:///work/b");
    harness.fireAnalysisChanged("file:///work/a");
    predecessorA.resolve(failedInventorySnapshot("file:///work/a"));
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(3));

    const roots = await resourceRoots(harness.treeDataProvider);
    expect(roots.every((root) => root.accessibilityLabel.includes("updating"))).toBe(true);
    expect(JSON.stringify(roots)).not.toContain("out of date");

    workspaceB.resolve(inventorySnapshot("file:///work/b"));
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(4));
    trailingA.resolve(inventorySnapshot("file:///work/a"));
    await vi.waitFor(() => expect(harness.view.message).toBeUndefined());
    harness.dispose();
  });

  test("marks hidden invalidations immediately without querying until reveal", async () => {
    const getResourceInventory = vi.fn(async (options?: { readonly workspaceKey?: string }) =>
      options?.workspaceKey == null
        ? inventorySnapshot("file:///work/a", "file:///work/b")
        : inventorySnapshot(options.workspaceKey));
    const harness = createHarness({ visible: true, getResourceInventory });
    await waitForRootCount(harness.treeDataProvider, 2);
    harness.setVisible(false);

    harness.fireAnalysisChanged("file:///work/b");

    expect(getResourceInventory).toHaveBeenCalledOnce();
    const roots = await resourceRoots(harness.treeDataProvider);
    expect(roots.find((root) => root.label === "a")?.accessibilityLabel).not.toContain("updating");
    expect(roots.find((root) => root.label === "b")?.accessibilityLabel).toContain("updating");

    harness.setVisible(true);
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(2));
    harness.dispose();
  });

  test("turns only a failed active scope stale while another dirty scope keeps updating", async () => {
    const workspaceA = deferred<unknown>();
    const workspaceB = deferred<unknown>();
    const getResourceInventory = vi.fn()
      .mockResolvedValueOnce(inventorySnapshot("file:///work/a", "file:///work/b"))
      .mockImplementationOnce(() => workspaceA.promise)
      .mockImplementationOnce(() => workspaceB.promise);
    const harness = createHarness({ visible: true, getResourceInventory });
    await waitForRootCount(harness.treeDataProvider, 2);

    harness.fireAnalysisChanged("file:///work/a");
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(2));
    harness.fireAnalysisChanged("file:///work/b");
    workspaceA.resolve(failedInventorySnapshot("file:///work/a"));
    await vi.waitFor(() => expect(getResourceInventory).toHaveBeenCalledTimes(3));

    const roots = await resourceRoots(harness.treeDataProvider);
    const rootA = roots.find((root) => root.label === "a");
    const rootB = roots.find((root) => root.label === "b");
    expect(rootA?.accessibilityLabel).toContain("out of date");
    expect(rootA?.accessibilityLabel).not.toContain("updating");
    expect(rootB?.accessibilityLabel).toContain("updating");
    expect(rootB?.accessibilityLabel).not.toContain("out of date");

    workspaceB.resolve(inventorySnapshot("file:///work/b"));
    await Promise.resolve();
    harness.dispose();
  });

  test("retries full after a topology invalidation supersedes an in-flight workspace refresh", async () => {
    const workspaceARefresh = deferred<unknown>();
    let workspaceACalls = 0;
    const getResourceInventory = vi.fn((options?: { readonly workspaceKey?: string }) => {
      if (options?.workspaceKey === "file:///work/a" && workspaceACalls++ === 0) {
        return workspaceARefresh.promise;
      }
      return Promise.resolve(inventorySnapshot("file:///work/a", "file:///work/b"));
    });
    const harness = createHarness({ visible: true, getResourceInventory });
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledOnce());
    await waitForRootCount(harness.treeDataProvider, 2);

    harness.fireAnalysisChanged("file:///work/a");
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledTimes(2));
    harness.fireAnalysisChanged("file:///work/b");
    harness.fireAnalysisChanged("file:///work/a", "topology");
    expect(harness.getResourceInventory).toHaveBeenCalledTimes(2);

    workspaceARefresh.resolve(inventorySnapshot("file:///work/a"));
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledTimes(3));
    await Promise.resolve();
    expect(harness.getResourceInventory.mock.calls.map(([options]) => options)).toEqual([
      { includeTypeSurfaces: true },
      { workspaceKey: "file:///work/a", includeTypeSurfaces: true },
      { includeTypeSurfaces: true },
    ]);
    harness.dispose();
  });

  test("defers hidden work and folds hidden invalidations into one rich refresh on reveal", async () => {
    const harness = createHarness();

    expect(harness.getResourceInventory).not.toHaveBeenCalled();
    harness.fireAnalysisChanged();
    harness.fireAnalysisChanged();
    harness.fireSessionsChanged();
    expect(harness.getResourceInventory).not.toHaveBeenCalled();

    harness.setVisible(true);
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledOnce());
    expect(harness.getResourceInventory).toHaveBeenCalledWith({ includeTypeSurfaces: true });

    harness.setVisible(false);
    harness.fireAnalysisChanged();
    harness.fireSessionsChanged();
    expect(harness.getResourceInventory).toHaveBeenCalledOnce();

    harness.setVisible(true);
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledTimes(2));
    harness.dispose();
  });

  test("coalesces visible invalidations received during a refresh into one trailing refresh", async () => {
    const first = deferred<null>();
    const getResourceInventory = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(null);
    const harness = createHarness({ visible: true, getResourceInventory });

    expect(harness.getResourceInventory).toHaveBeenCalledOnce();
    harness.fireAnalysisChanged();
    harness.fireAnalysisChanged();
    harness.fireSessionsChanged();
    expect(harness.getResourceInventory).toHaveBeenCalledOnce();

    first.resolve(null);
    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    expect(harness.getResourceInventory).toHaveBeenCalledTimes(2);
    harness.dispose();
  });

  test("lets an explicit refresh demand one rich snapshot while hidden", async () => {
    const harness = createHarness();

    await harness.refreshCommand();
    expect(harness.getResourceInventory).toHaveBeenCalledOnce();
    expect(harness.getResourceInventory).toHaveBeenCalledWith({ includeTypeSurfaces: true });

    harness.setVisible(true);
    await Promise.resolve();
    expect(harness.getResourceInventory).toHaveBeenCalledOnce();

    harness.setVisible(false);
    harness.fireAnalysisChanged();
    await harness.refreshCommand();
    expect(harness.getResourceInventory).toHaveBeenCalledTimes(2);

    harness.setVisible(true);
    await Promise.resolve();
    expect(harness.getResourceInventory).toHaveBeenCalledTimes(2);
    harness.dispose();
  });

  test("does not start a queued refresh after feature disposal", async () => {
    const first = deferred<null>();
    const getResourceInventory = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(null);
    const harness = createHarness({ visible: true, getResourceInventory });

    harness.fireAnalysisChanged();
    harness.dispose();
    first.resolve(null);
    await Promise.resolve();
    await Promise.resolve();
    harness.fireAnalysisChanged();
    harness.fireSessionsChanged();
    harness.setVisible(true);
    await Promise.resolve();

    expect(harness.getResourceInventory).toHaveBeenCalledOnce();
  });
});

function captureViewObservations(): {
  readonly events: ExtensionHostObservation[];
  dispose(): void;
} {
  return captureResourceDiscoveryObservations("resource-explorer-view");
}

function captureResourceDiscoveryObservations(...sources: readonly string[]): {
  readonly events: ExtensionHostObservation[];
  dispose(): void;
} {
  const observationEnv = "AURELIA_LS_EXTENSION_HOST_OBSERVATION";
  const acceptanceEnv = "AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE";
  const previousObservation = process.env[observationEnv];
  const previousAcceptance = process.env[acceptanceEnv];
  const events: ExtensionHostObservation[] = [];
  const admittedSources = new Set(sources);
  const listener = (event: ExtensionHostObservation): void => {
    if (admittedSources.has(event.source)) events.push(event);
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

function isUpdatingPublication(event: ExtensionHostObservation): boolean {
  return event.source === "resource-explorer"
    && event.phase === "publish-complete"
    && event.publicationKind === "updating";
}

function isCurrentPublication(event: ExtensionHostObservation): boolean {
  return event.source === "resource-explorer"
    && event.phase === "publish-complete"
    && event.publicationKind === "current";
}

function isObservationPrimitive(value: unknown): boolean {
  return value == null || ["string", "number", "boolean"].includes(typeof value);
}
