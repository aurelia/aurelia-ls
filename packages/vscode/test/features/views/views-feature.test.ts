import type { Disposable } from "vscode";
import { describe, expect, test, vi } from "vitest";
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

function createHarness(options: {
  readonly visible?: boolean;
  readonly getResourceInventory?: (options?: unknown) => Promise<unknown>;
} = {}) {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const visibility = createEmitter<{ readonly visible: boolean }>();
  const analysisChanged = createEmitter<unknown>();
  const sessionsChanged = createEmitter<unknown>();
  let visible = options.visible === true;
  const view = {
    get visible() { return visible; },
    onDidChangeVisibility: visibility.event,
    message: undefined as string | undefined,
    description: undefined as string | undefined,
    dispose: vi.fn(),
  };
  Object.assign(stubVscode.window, {
    createTreeView: vi.fn(() => view),
  });

  const getResourceInventory = vi.fn(options.getResourceInventory ?? (async () => null));
  const contributions: Disposable[] = [];
  ViewsFeature.activate({
    vscode: stubVscode as unknown as VscodeApi,
    lsp: {
      getResourceInventory,
      onAnalysisChanged: analysisChanged.event,
    },
    languageClient: {
      onDidChangeSessions: sessionsChanged.event,
    },
    logger: { debug: vi.fn(), warn: vi.fn() },
  } as never, (contribution) => {
    contributions.push(contribution);
    return contribution;
  });

  return {
    getResourceInventory,
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

describe("ViewsFeature resource inventory lifecycle", () => {
  test("scopes settled source invalidation to its workspace and keeps topology refresh aggregate", async () => {
    const first = inventorySnapshot("file:///work/a", "file:///work/b");
    const getResourceInventory = vi.fn(async (options?: { readonly workspaceKey?: string }) =>
      options?.workspaceKey == null ? first : inventorySnapshot(options.workspaceKey));
    const harness = createHarness({ visible: true, getResourceInventory });

    await vi.waitFor(() => expect(harness.getResourceInventory).toHaveBeenCalledOnce());
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

  test("lets an in-flight workspace refresh finish before one full invalidation clears its scoped tail", async () => {
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
