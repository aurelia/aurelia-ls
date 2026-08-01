import { describe, expect, test, vi } from "vitest";
import type { LanguageClient, LanguageClientOptions } from "vscode-languageclient/node";
import { AureliaLanguageClient } from "../../out/client-core.js";
import { LspFacade } from "../../out/core/lsp-facade.js";
import {
  AureliaActivationMode,
  readWorkspaceActivationAdmission,
} from "../../out/workspace-activation.js";
import type { WorkspaceStatusResponse } from "@aurelia-ls/language-server/protocol";
import type { VscodeApi } from "../../out/vscode-api.js";
import { createTestObservability } from "../helpers/test-helpers.js";
import { createVscodeApi, stubExtensionContext } from "../helpers/vscode-stub.js";

type ProjectAnalysisKind = "app-world" | "resource-library-authoring" | "aurelia-package-inspection" | "outside-aurelia";

interface FakeRawClient {
  readonly raw: LanguageClient;
  readonly workspaceUri: string;
  readonly options: LanguageClientOptions;
  readonly notifications: Map<string, (payload: unknown) => void>;
  readonly start: ReturnType<typeof vi.fn>;
  readonly stop: ReturnType<typeof vi.fn>;
  readonly sendRequest: ReturnType<typeof vi.fn>;
  readonly sendNotification: ReturnType<typeof vi.fn>;
  readonly convertWorkspaceEdit: ReturnType<typeof vi.fn>;
  emit(method: string, payload: unknown): void;
}

interface ClientHarness {
  readonly clients: FakeRawClient[];
  readonly createClient: ReturnType<typeof vi.fn>;
  readonly statusByWorkspace: Map<string, WorkspaceStatusResponse | null>;
}

interface ClientHarnessOptions {
  readonly workspaceStatus?: (
    workspaceUri: string,
    requestIndex: number,
  ) => WorkspaceStatusResponse | null | Promise<WorkspaceStatusResponse | null>;
  readonly clientStart?: (workspaceUri: string, clientIndex: number) => void | Promise<void>;
  readonly clientStop?: (workspaceUri: string, clientIndex: number) => void | Promise<void>;
  readonly clientNotification?: (
    workspaceUri: string,
    method: string,
    params: unknown,
    notificationIndex: number,
  ) => void | Promise<void>;
}

describe("workspace activation admission", () => {
  test("uses dependency keys, open facade imports, and resource-scoped overrides without treating HTML as proof", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [
        { name: "plain", uri: "file:///work/plain" },
        { name: "manifest", uri: "file:///work/manifest" },
        { name: "source", uri: "file:///work/source" },
        { name: "side-effect", uri: "file:///work/side-effect" },
        { name: "forced", uri: "file:///work/forced" },
        { name: "disabled", uri: "file:///work/disabled" },
      ],
      files: {
        "file:///work/plain/src/view.html": "<template></template>",
        "file:///work/manifest/package.json": JSON.stringify({ devDependencies: { "@aurelia/runtime-html": "latest" } }),
      },
      openDocuments: [{
        uri: "file:///work/source/src/main.ts",
        languageId: "typescript",
        text: 'import { Aurelia } from "aurelia";',
      }, {
        uri: "file:///work/side-effect/src/main.ts",
        languageId: "typescript",
        text: 'import "@aurelia/runtime-html";',
      }],
      workspaceConfiguration: {
        "file:///work/forced": { "aurelia.activationMode": "on" },
        "file:///work/disabled": { "aurelia.activationMode": "off" },
      },
    });
    const folders = vscode.workspace.workspaceFolders ?? [];

    expect(await readWorkspaceActivationAdmission(vscode as unknown as VscodeApi, folders[0] as never)).toBeNull();
    expect((await readWorkspaceActivationAdmission(vscode as unknown as VscodeApi, folders[1] as never))?.evidence)
      .toBe("package-manifest");
    expect((await readWorkspaceActivationAdmission(vscode as unknown as VscodeApi, folders[2] as never))?.evidence)
      .toBe("open-source-document");
    expect((await readWorkspaceActivationAdmission(vscode as unknown as VscodeApi, folders[3] as never))?.evidence)
      .toBe("open-source-document");
    expect((await readWorkspaceActivationAdmission(vscode as unknown as VscodeApi, folders[4] as never))?.mode)
      .toBe(AureliaActivationMode.On);
    expect(await readWorkspaceActivationAdmission(vscode as unknown as VscodeApi, folders[5] as never)).toBeNull();
  });
});

describe("AureliaLanguageClient workspace ownership", () => {
  test("does not retain an automatic candidate without semantic confirmation", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "candidate", uri: "file:///work/candidate" }],
      files: {
        "file:///work/candidate/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const harness = createClientHarness(new Map([
      ["file:///work/candidate", null],
    ]));
    const manager = createManager(vscode, harness);

    await manager.start(stubExtensionContext(vscode));

    expect(manager.sessions).toEqual([]);
    expect(harness.clients).toHaveLength(1);
    expect(harness.clients[0]?.stop).toHaveBeenCalledTimes(1);
    await manager.stop();
  });

  test("starts scoped clients for disjoint roots and leaves untitled/out-of-root documents unclaimed", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [
        { name: "app", uri: "file:///work/app" },
        { name: "library", uri: "file:///work/library" },
        { name: "plain", uri: "file:///work/plain" },
      ],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
        "file:///work/library/package.json": JSON.stringify({ peerDependencies: { "@aurelia/runtime-html": "latest" } }),
        "file:///work/plain/src/view.html": "<template></template>",
      },
    });
    const harness = createClientHarness(new Map([
      ["file:///work/app", workspaceStatus("app-world")],
      ["file:///work/library", workspaceStatus("resource-library-authoring")],
    ]));
    const manager = createManager(vscode, harness);

    await manager.start(stubExtensionContext(vscode));

    expect(manager.sessions.map((session) => session.workspace.name)).toEqual(["app", "library"]);
    expect(harness.clients).toHaveLength(2);
    for (const client of harness.clients) {
      expect(client.options.workspaceFolder?.uri.toString()).toBe(client.workspaceUri);
      expect(client.options.documentSelector).not.toContainEqual(expect.objectContaining({ scheme: "untitled" }));
      expect(client.options.documentSelector).toContainEqual(expect.objectContaining({
        scheme: "file",
        pattern: expect.objectContaining({ baseUri: client.workspaceUri, pattern: "**/*" }),
      }));
    }
    expect(manager.clientForUri("file:///work/app/src/main.ts")).toBe(harness.clients[0]?.raw);
    expect(manager.clientForUri("file:///work/library/src/card.html")).toBe(harness.clients[1]?.raw);
    expect(manager.clientForUri("file:///elsewhere/view.html")).toBeUndefined();
    expect(manager.clientForUri("untitled:Untitled-1")).toBeUndefined();

    await manager.stop();
    expect(harness.clients.every((client) => client.stop.mock.calls.length === 1)).toBe(true);
  });

  test("rejects a false-positive outer candidate before assigning its nested Aurelia workspace", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [
        { name: "outer", uri: "file:///work/repo" },
        { name: "inner", uri: "file:///work/repo/packages/app" },
      ],
      files: {
        "file:///work/repo/package.json": JSON.stringify({ devDependencies: { "@aurelia/testing": "latest" } }),
        "file:///work/repo/packages/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const harness = createClientHarness(new Map([
      ["file:///work/repo", workspaceStatus("outside-aurelia")],
      ["file:///work/repo/packages/app", workspaceStatus("app-world")],
    ]));
    const manager = createManager(vscode, harness);

    await manager.start(stubExtensionContext(vscode));

    expect(harness.clients).toHaveLength(2);
    expect(harness.clients[0]?.stop).toHaveBeenCalledTimes(1);
    expect(manager.sessions.map((session) => session.workspace.name)).toEqual(["inner"]);
    expect(manager.clientForUri("file:///work/repo/packages/app/src/main.ts")).toBe(harness.clients[1]?.raw);
    await manager.stop();
  });

  test("reconciles project-shape withdrawal, explicit off, and newly added workspace folders", async () => {
    const configuration: Record<string, Record<string, unknown>> = {};
    const { vscode, recorded } = createVscodeApi({
      workspaceFolders: [{ name: "first", uri: "file:///work/first" }],
      files: {
        "file:///work/first/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
      workspaceConfiguration: configuration,
    });
    const statusByWorkspace = new Map([
      ["file:///work/first", workspaceStatus("app-world")],
      ["file:///work/second", workspaceStatus("aurelia-package-inspection")],
    ]);
    const harness = createClientHarness(statusByWorkspace);
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    expect(manager.sessions).toHaveLength(1);

    statusByWorkspace.set("file:///work/first", workspaceStatus("outside-aurelia"));
    recorded.deleteFile("file:///work/first/package.json");
    const packageWatcher = recorded.fileWatchers.find((watcher) => watcher.globPattern === "**/package.json")!;
    packageWatcher.fireDelete(vscode.Uri.parse("file:///work/first/node_modules/aurelia/package.json"));
    await Promise.resolve();
    expect(harness.clients[0]?.sendNotification).not.toHaveBeenCalled();
    packageWatcher.fireDelete(vscode.Uri.parse("file:///work/first/package.json"));
    await vi.waitFor(() => expect(manager.sessions).toHaveLength(0));
    expect(harness.clients[0]?.sendNotification).toHaveBeenCalledWith(
      "workspace/didChangeWatchedFiles",
      { changes: [{ uri: "file:///work/first/package.json", type: 3 }] },
    );
    expect(harness.clients[0]!.sendNotification.mock.invocationCallOrder[0]).toBeLessThan(
      harness.clients[0]!.sendRequest.mock.invocationCallOrder.at(-1)!,
    );

    vscode.workspace.workspaceFolders?.push({
      name: "second",
      index: 1,
      uri: vscode.Uri.parse("file:///work/second"),
    });
    recorded.setFile(
      "file:///work/second/package.json",
      JSON.stringify({ peerDependencies: { "@aurelia/runtime-html": "latest" } }),
    );
    await manager.reconcile();
    expect(manager.sessions.map((session) => session.workspace.name)).toEqual(["second"]);

    configuration["file:///work/second"] = { "aurelia.activationMode": "off" };
    await manager.reconcile();
    expect(manager.sessions).toHaveLength(0);
    await manager.stop();
  });

  test("reconfirms source-only admission on save and withdraws a rejected session", async () => {
    vi.useFakeTimers();
    const { vscode, recorded } = createVscodeApi({
      workspaceFolders: [{ name: "source", uri: "file:///work/source" }],
      openDocuments: [{
        uri: "file:///work/source/src/main.ts",
        languageId: "typescript",
        text: 'import { Aurelia } from "aurelia";',
      }],
    });
    const statusByWorkspace = new Map([
      ["file:///work/source", workspaceStatus("app-world")],
    ]);
    const harness = createClientHarness(statusByWorkspace);
    const manager = createManager(vscode, harness);
    try {
      await manager.start(stubExtensionContext(vscode));
      expect(manager.sessions[0]?.activationEvidence).toBe("open-source-document");

      statusByWorkspace.set("file:///work/source", workspaceStatus("outside-aurelia"));
      const document = vscode.workspace.textDocuments[0]!;
      document.text = "export const value = 1;";
      recorded.fireDocumentSaved(document);
      await vi.advanceTimersByTimeAsync(300);

      expect(manager.sessions).toHaveLength(0);
    } finally {
      await manager.stop();
      vi.useRealTimers();
    }
  });

  test("re-arms workspace listeners when the manager starts after being stopped", async () => {
    const { vscode, recorded } = createVscodeApi({
      workspaceFolders: [{ name: "first", uri: "file:///work/first" }],
      files: {
        "file:///work/first/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const harness = createClientHarness(new Map([
      ["file:///work/first", workspaceStatus("app-world")],
      ["file:///work/second", workspaceStatus("app-world")],
    ]));
    const manager = createManager(vscode, harness);

    await manager.start(stubExtensionContext(vscode));
    await manager.stop();
    await manager.start(stubExtensionContext(vscode));

    vscode.workspace.workspaceFolders?.push({
      name: "second",
      index: 1,
      uri: vscode.Uri.parse("file:///work/second"),
    });
    recorded.setFile(
      "file:///work/second/package.json",
      JSON.stringify({ dependencies: { aurelia: "latest" } }),
    );
    recorded.fireWorkspaceFoldersChanged();

    await vi.waitFor(() => {
      expect(manager.sessions.map((session) => session.workspace.name)).toEqual(["first", "second"]);
    });
    await manager.stop();
  });

  test("preserves a package topology change when a newer reconciliation supersedes its request", async () => {
    const { vscode, recorded } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/app" }],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const harness = createClientHarness(new Map([
      ["file:///work/app", workspaceStatus("app-world")],
    ]));
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    const packageWatcher = recorded.fileWatchers.find((watcher) => watcher.globPattern === "**/package.json")!;

    packageWatcher.fireChange(vscode.Uri.parse("file:///work/app/package.json"));
    recorded.fireWorkspaceFoldersChanged();

    await vi.waitFor(() => expect(harness.clients[0]?.sendNotification).toHaveBeenCalledWith(
      "workspace/didChangeWatchedFiles",
      { changes: [{ uri: "file:///work/app/package.json", type: 2 }] },
    ));
    await vi.waitFor(() => expect(harness.clients[0]?.sendRequest).toHaveBeenCalledTimes(2));
    expect(harness.clients[0]!.sendNotification.mock.invocationCallOrder[0]).toBeLessThan(
      harness.clients[0]!.sendRequest.mock.invocationCallOrder[1]!,
    );
    await manager.stop();
  });

  test("retains a failed package topology notification for the next reconciliation", async () => {
    const { vscode, recorded } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/app" }],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const harness = createClientHarness(new Map([
      ["file:///work/app", workspaceStatus("app-world")],
    ]), {
      clientNotification: (_workspaceUri, _method, _params, notificationIndex) => {
        if (notificationIndex === 0) throw new Error("notification failed");
      },
    });
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    const packageWatcher = recorded.fileWatchers.find((watcher) => watcher.globPattern === "**/package.json")!;

    packageWatcher.fireChange(vscode.Uri.parse("file:///work/app/package.json"));
    await vi.waitFor(() => expect(harness.clients[0]?.sendNotification).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(harness.clients[0]?.sendRequest).toHaveBeenCalledTimes(2));
    await manager.reconcile();

    expect(harness.clients[0]?.sendNotification).toHaveBeenCalledTimes(2);
    expect(harness.clients[0]?.sendNotification).toHaveBeenLastCalledWith(
      "workspace/didChangeWatchedFiles",
      { changes: [{ uri: "file:///work/app/package.json", type: 2 }] },
    );
    await manager.stop();
  });

  test("makes every overlapping reconciliation await the state it requested", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/app" }],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const status = workspaceStatus("app-world");
    const firstGate = deferred<WorkspaceStatusResponse | null>();
    const secondGate = deferred<WorkspaceStatusResponse | null>();
    const harness = createClientHarness(new Map([["file:///work/app", status]]), {
      workspaceStatus: (_workspaceUri, requestIndex) => {
        if (requestIndex === 1) return firstGate.promise;
        if (requestIndex === 2) return secondGate.promise;
        return status;
      },
    });
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));

    const first = manager.reconcile({ reconfirmExisting: true });
    await vi.waitFor(() => expect(harness.clients[0]?.sendRequest).toHaveBeenCalledTimes(2));
    let secondSettled = false;
    const second = manager.reconcile({ reconfirmExisting: true }).then(() => {
      secondSettled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(secondSettled).toBe(false);

    firstGate.resolve(status);
    await vi.waitFor(() => expect(harness.clients[0]?.sendRequest).toHaveBeenCalledTimes(3));
    expect(secondSettled).toBe(false);
    secondGate.resolve(status);
    await Promise.all([first, second]);
    expect(harness.clients[0]?.sendRequest).toHaveBeenCalledTimes(3);
    await manager.stop();
  });

  test("does not publish a candidate that finishes semantic confirmation after stop", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/app" }],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const statusGate = deferred<WorkspaceStatusResponse | null>();
    const harness = createClientHarness(new Map(), {
      workspaceStatus: () => statusGate.promise,
    });
    const manager = createManager(vscode, harness);
    const publications: string[][] = [];
    manager.onDidChangeSessions((sessions) => {
      publications.push(sessions.map((session) => session.workspace.name));
    });

    const starting = manager.start(stubExtensionContext(vscode));
    await vi.waitFor(() => expect(harness.clients[0]?.sendRequest).toHaveBeenCalledWith("aurelia/workspaceStatus"));
    const stopping = manager.stop();
    statusGate.resolve(workspaceStatus("app-world"));
    await Promise.all([starting, stopping]);

    expect(manager.sessions).toEqual([]);
    expect(harness.clients[0]?.stop).toHaveBeenCalledTimes(1);
    expect(publications).toEqual([]);
    expect(sessionWatchers(harness.clients[0]!).every((watcher) => watcher.disposed)).toBe(true);
  });

  test("lets stop preempt semantic confirmation that never settles", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/app" }],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const never = new Promise<WorkspaceStatusResponse | null>(() => {});
    const harness = createClientHarness(new Map(), {
      workspaceStatus: () => never,
    });
    const manager = createManager(vscode, harness);

    const starting = manager.start(stubExtensionContext(vscode));
    await vi.waitFor(() => expect(harness.clients[0]?.sendRequest).toHaveBeenCalledWith("aurelia/workspaceStatus"));
    const stopping = manager.stop();
    const stopped = await Promise.race([
      stopping.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 100)),
    ]);

    expect(stopped).toBe(true);
    await starting;
    expect(manager.sessions).toEqual([]);
    expect(harness.clients[0]?.stop).toHaveBeenCalledTimes(1);
    expect(sessionWatchers(harness.clients[0]!).every((watcher) => watcher.disposed)).toBe(true);
  });

  test("retires a client that finishes starting after shutdown has completed", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/app" }],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const startGate = deferred<void>();
    let startupComplete = false;
    const harness = createClientHarness(new Map([
      ["file:///work/app", workspaceStatus("app-world")],
    ]), {
      clientStart: async () => {
        await startGate.promise;
        startupComplete = true;
      },
      clientStop: () => {
        if (!startupComplete) throw new Error("client is still starting");
      },
    });
    const manager = createManager(vscode, harness);

    const starting = manager.start(stubExtensionContext(vscode));
    await vi.waitFor(() => expect(harness.clients[0]?.start).toHaveBeenCalledTimes(1));
    await manager.stop();
    await starting;

    expect(harness.clients[0]?.stop).not.toHaveBeenCalled();
    expect(sessionWatchers(harness.clients[0]!).every((watcher) => watcher.disposed)).toBe(true);

    startGate.resolve(undefined);
    await vi.waitFor(() => expect(harness.clients[0]?.stop).toHaveBeenCalledTimes(1));
    expect(manager.sessions).toEqual([]);
  });

  test("does not resurrect a replacement session when stop interrupts restart confirmation", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/app" }],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const status = workspaceStatus("app-world");
    const restartGate = deferred<WorkspaceStatusResponse | null>();
    const harness = createClientHarness(new Map([["file:///work/app", status]]), {
      workspaceStatus: (_workspaceUri, requestIndex) => requestIndex === 0 ? status : restartGate.promise,
    });
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    const publications: string[][] = [];
    manager.onDidChangeSessions((sessions) => {
      publications.push(sessions.map((session) => session.workspace.name));
    });

    const restarting = manager.restart(stubExtensionContext(vscode));
    await vi.waitFor(() => expect(harness.clients).toHaveLength(2));
    const stopping = manager.stop();
    restartGate.resolve(status);
    await Promise.all([restarting, stopping]);

    expect(manager.sessions).toEqual([]);
    expect(publications).toEqual([[]]);
    expect(harness.clients[0]?.stop).toHaveBeenCalledTimes(1);
    expect(harness.clients[1]?.stop).toHaveBeenCalledTimes(1);
    expect(sessionWatchers(harness.clients[1]!).every((watcher) => watcher.disposed)).toBe(true);
  });

  test("restarts cleanly when the request supersedes initial semantic admission", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/app" }],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const status = workspaceStatus("app-world");
    const initialGate = deferred<WorkspaceStatusResponse | null>();
    const harness = createClientHarness(new Map([["file:///work/app", status]]), {
      workspaceStatus: (_workspaceUri, requestIndex) => requestIndex === 0 ? initialGate.promise : status,
    });
    const manager = createManager(vscode, harness);
    const context = stubExtensionContext(vscode);

    const starting = manager.start(context);
    await vi.waitFor(() => expect(harness.clients).toHaveLength(1));
    const restarting = manager.restart(context);
    initialGate.resolve(status);
    await Promise.all([starting, restarting]);

    expect(harness.clients).toHaveLength(2);
    expect(harness.clients[0]?.stop).toHaveBeenCalledTimes(1);
    expect(manager.sessions[0]?.client).toBe(harness.clients[1]?.raw);
    await manager.stop();
  });

  test("orders a new start after stop has retired the previous client", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/app" }],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const stopGate = deferred<void>();
    const harness = createClientHarness(new Map([
      ["file:///work/app", workspaceStatus("app-world")],
    ]), {
      clientStop: (_workspaceUri, clientIndex) => clientIndex === 0 ? stopGate.promise : undefined,
    });
    const manager = createManager(vscode, harness);
    const context = stubExtensionContext(vscode);
    await manager.start(context);

    const stopping = manager.stop();
    const starting = manager.start(context);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(harness.clients).toHaveLength(1);

    stopGate.resolve(undefined);
    await Promise.all([stopping, starting]);
    expect(harness.clients).toHaveLength(2);
    expect(manager.sessions[0]?.client).toBe(harness.clients[1]?.raw);
    expect(harness.clients[0]?.stop).toHaveBeenCalledTimes(1);
    await manager.stop();
  });

  test("keeps restart failure local to one workspace root", async () => {
    const { vscode } = twoWorkspaceApi();
    const statusByWorkspace = new Map([
      ["file:///work/a", workspaceStatus("app-world")],
      ["file:///work/b", workspaceStatus("app-world")],
    ]);
    const harness = createClientHarness(statusByWorkspace, {
      clientStart: (_workspaceUri, clientIndex) => {
        if (clientIndex === 2) throw new Error("replacement failed");
      },
    });
    const manager = createManager(vscode, harness);
    const context = stubExtensionContext(vscode);
    await manager.start(context);
    const originalA = harness.clients[0]!;
    const originalB = harness.clients[1]!;

    await manager.restart(context);

    expect(manager.sessions.find((session) => session.workspace.name === "a")?.client).toBe(originalA.raw);
    expect(manager.sessions.find((session) => session.workspace.name === "b")?.client).toBe(harness.clients[3]?.raw);
    expect(originalA.stop).not.toHaveBeenCalled();
    expect(originalB.stop).toHaveBeenCalledTimes(1);
    expect(harness.clients[2]?.stop).toHaveBeenCalledTimes(1);

    await manager.reconcile({ reconfirmExisting: true });
    expect(manager.sessions).toHaveLength(2);
    await manager.stop();
  });

  test("cuts over each independent root before starting the next replacement", async () => {
    const { vscode } = twoWorkspaceApi();
    const status = workspaceStatus("app-world");
    const secondRootGate = deferred<WorkspaceStatusResponse | null>();
    const harness = createClientHarness(new Map([
      ["file:///work/a", status],
      ["file:///work/b", status],
    ]), {
      workspaceStatus: (_workspaceUri, requestIndex) => requestIndex === 3 ? secondRootGate.promise : status,
    });
    const manager = createManager(vscode, harness);
    const context = stubExtensionContext(vscode);
    await manager.start(context);

    const restarting = manager.restart(context);
    await vi.waitFor(() => expect(harness.clients).toHaveLength(4));

    expect(manager.sessions.find((session) => session.workspace.name === "a")?.client).toBe(harness.clients[2]?.raw);
    expect(manager.sessions.find((session) => session.workspace.name === "b")?.client).toBe(harness.clients[1]?.raw);
    expect(harness.clients[0]?.stop).toHaveBeenCalledTimes(1);

    secondRootGate.resolve(status);
    await restarting;
    expect(manager.sessions.find((session) => session.workspace.name === "b")?.client).toBe(harness.clients[3]?.raw);
    expect(harness.clients[1]?.stop).toHaveBeenCalledTimes(1);
    await manager.stop();
  });

  test("does not publish a replacement after its workspace root is removed", async () => {
    const { vscode, recorded } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/app" }],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const replacementStart = deferred<void>();
    const harness = createClientHarness(new Map([
      ["file:///work/app", workspaceStatus("app-world")],
    ]), {
      clientStart: (_workspaceUri, clientIndex) => clientIndex === 1 ? replacementStart.promise : undefined,
    });
    const manager = createManager(vscode, harness);
    const context = stubExtensionContext(vscode);
    await manager.start(context);
    const publications: string[][] = [];
    manager.onDidChangeSessions((sessions) => {
      publications.push(sessions.map((session) => session.workspace.name));
    });

    const restarting = manager.restart(context);
    await vi.waitFor(() => expect(harness.clients[1]?.start).toHaveBeenCalledTimes(1));
    vscode.workspace.workspaceFolders?.splice(0, 1);
    recorded.fireWorkspaceFoldersChanged();
    await vi.waitFor(() => expect(manager.sessions).toEqual([]));
    await restarting;

    expect(publications).toEqual([[]]);
    expect(sessionWatchers(harness.clients[1]!).every((watcher) => watcher.disposed)).toBe(true);

    replacementStart.resolve(undefined);
    await vi.waitFor(() => expect(harness.clients[1]?.stop).toHaveBeenCalledTimes(1));
    expect(publications).toEqual([[]]);
    await manager.stop();
  });

  test("rolls back partial listener installation so a later start can retry", async () => {
    const { vscode, recorded } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/app" }],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const createWatcher = vscode.workspace.createFileSystemWatcher.bind(vscode.workspace);
    let shouldFail = true;
    vscode.workspace.createFileSystemWatcher = ((pattern: unknown) => {
      const watcher = createWatcher(pattern);
      if (pattern === "**/package.json" && shouldFail) {
        shouldFail = false;
        watcher.onDidChange = () => {
          throw new Error("watcher registration failed");
        };
      }
      return watcher;
    }) as typeof vscode.workspace.createFileSystemWatcher;
    const harness = createClientHarness(new Map([
      ["file:///work/app", workspaceStatus("app-world")],
    ]));
    const manager = createManager(vscode, harness);
    const context = stubExtensionContext(vscode);

    await expect(manager.start(context)).rejects.toThrow("watcher registration failed");
    expect(recorded.fileWatchers[0]?.disposed).toBe(true);

    await manager.start(context);
    expect(manager.sessions).toHaveLength(1);
    await manager.stop();
  });
});

describe("LspFacade workspace routing", () => {
  test("routes URI requests and conversions while preserving workspace identity in aggregate resources", async () => {
    const { vscode } = twoWorkspaceApi();
    const harness = createClientHarness(new Map([
      ["file:///work/a", workspaceStatus("app-world")],
      ["file:///work/b", workspaceStatus("app-world")],
    ]));
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    const { observability } = createTestObservability(vscode as unknown as VscodeApi);
    const facade = new LspFacade(manager, observability);

    const related = await facade.getRelatedFile("file:///work/b/src/card.ts");
    expect(related).toEqual({ uri: "file:///work/b/related.html", kind: "template" });
    expect(harness.clients[1]?.sendRequest).toHaveBeenCalledWith(
      "aurelia/getRelatedFile",
      { uri: "file:///work/b/src/card.ts" },
      undefined,
    );

    const resources = await facade.getResources();
    expect(resources?.resources).toHaveLength(2);
    expect(resources?.resources.map((resource) => [resource.name, resource.workspace?.name])).toEqual([
      ["shared-name", "a"],
      ["shared-name", "b"],
    ]);
    expect(resources?.workspaces?.map((workspace) => workspace.resourceCount)).toEqual([1, 1]);

    const converted = await facade.convertWorkspaceEdit(
      "file:///work/b/src/card.ts",
      { changes: {} },
      { isCancellationRequested: false } as never,
    );
    expect(converted).toEqual({ convertedBy: "file:///work/b" });
    expect(harness.clients[1]?.convertWorkspaceEdit).toHaveBeenCalledTimes(1);

    facade.dispose();
    await manager.stop();
  });

  test("multicasts one raw notification, honors local disposal, and rebinds exactly once after restart", async () => {
    const { vscode } = twoWorkspaceApi();
    const harness = createClientHarness(new Map([
      ["file:///work/a", workspaceStatus("app-world")],
      ["file:///work/b", workspaceStatus("app-world")],
    ]));
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    const { observability } = createTestObservability(vscode as unknown as VscodeApi);
    const facade = new LspFacade(manager, observability);
    const first = vi.fn();
    const second = vi.fn();
    const firstSubscription = facade.onWorkspaceChanged(first);
    facade.onWorkspaceChanged(second);

    harness.clients[0]?.emit("aurelia/workspaceChanged", { fingerprint: "1", domains: ["resources"] });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0]?.[0].workspace.name).toBe("a");

    firstSubscription.dispose();
    harness.clients[0]?.emit("aurelia/workspaceChanged", { fingerprint: "2", domains: ["resources"] });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);

    const retired = harness.clients[0]!;
    await manager.restart(stubExtensionContext(vscode));
    const replacement = harness.clients.filter((client) => client.workspaceUri === "file:///work/a").at(-1)!;
    retired.emit("aurelia/workspaceChanged", { fingerprint: "old", domains: ["resources"] });
    replacement.emit("aurelia/workspaceChanged", { fingerprint: "new", domains: ["resources"] });
    expect(second).toHaveBeenCalledTimes(3);

    facade.dispose();
    await manager.stop();
  });
});

function twoWorkspaceApi() {
  return createVscodeApi({
    workspaceFolders: [
      { name: "a", uri: "file:///work/a" },
      { name: "b", uri: "file:///work/b" },
    ],
    files: {
      "file:///work/a/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      "file:///work/b/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
    },
  });
}

function createManager(vscode: ReturnType<typeof createVscodeApi>["vscode"], harness: ClientHarness) {
  const { logger } = createTestObservability(vscode as unknown as VscodeApi);
  return new AureliaLanguageClient(logger, vscode as unknown as VscodeApi, {
    createClient: harness.createClient as never,
  });
}

function createClientHarness(
  statusByWorkspace: Map<string, WorkspaceStatusResponse | null>,
  harnessOptions: ClientHarnessOptions = {},
): ClientHarness {
  const clients: FakeRawClient[] = [];
  let workspaceStatusRequestCount = 0;
  let notificationCount = 0;
  const createClient = vi.fn((
    _id: string,
    _name: string,
    _serverOptions: unknown,
    options: LanguageClientOptions,
  ) => {
    const clientIndex = clients.length;
    const workspaceUri = options.workspaceFolder?.uri.toString() ?? "";
    const notifications = new Map<string, (payload: unknown) => void>();
    const start = vi.fn(async () => harnessOptions.clientStart?.(workspaceUri, clientIndex));
    const stop = vi.fn(async () => harnessOptions.clientStop?.(workspaceUri, clientIndex));
    const sendNotification = vi.fn(async (method: string, params: unknown) => {
      const notificationIndex = notificationCount++;
      await harnessOptions.clientNotification?.(workspaceUri, method, params, notificationIndex);
    });
    const convertWorkspaceEdit = vi.fn(async () => ({ convertedBy: workspaceUri }));
    const sendRequest = vi.fn(async (method: string, params?: unknown, token?: unknown) => {
      void params;
      void token;
      switch (method) {
        case "aurelia/workspaceStatus": {
          const requestIndex = workspaceStatusRequestCount++;
          if (harnessOptions.workspaceStatus != null) {
            return harnessOptions.workspaceStatus(workspaceUri, requestIndex);
          }
          return statusByWorkspace.get(workspaceUri) ?? null;
        }
        case "aurelia/capabilities":
          return { contracts: { query: { version: "1" } } };
        case "aurelia/getResources":
          return {
            fingerprint: workspaceUri,
            resources: [{
              name: "shared-name",
              kind: "custom-element",
              bindableCount: 0,
              bindables: [],
              scope: "global",
            }],
            templateCount: 1,
            inlineTemplateCount: 0,
          };
        case "aurelia/getRelatedFile":
          return { uri: `${workspaceUri}/related.html`, kind: "template" };
        default:
          return null;
      }
    });
    const raw = {
      start,
      stop,
      sendRequest,
      sendNotification,
      onNotification: vi.fn((method: string, handler: (payload: unknown) => void) => {
        notifications.set(method, handler);
        return {
          dispose: () => {
            if (notifications.get(method) === handler) notifications.delete(method);
          },
        };
      }),
      protocol2CodeConverter: { asWorkspaceEdit: convertWorkspaceEdit },
    } as unknown as LanguageClient;
    const client: FakeRawClient = {
      raw,
      workspaceUri,
      options,
      notifications,
      start,
      stop,
      sendRequest,
      sendNotification,
      convertWorkspaceEdit,
      emit(method, payload) {
        notifications.get(method)?.(payload);
      },
    };
    clients.push(client);
    return raw;
  });
  return { clients, createClient, statusByWorkspace };
}

function workspaceStatus(analysisKind: ProjectAnalysisKind): WorkspaceStatusResponse {
  return {
    schemaVersion: "0.2",
    result: "answered",
    selection: "not-applicable",
    coverage: "complete",
    summary: analysisKind,
    value: {
      workspaceRoot: "/work",
      workspaceKey: "work",
      displayText: analysisKind,
      projectShapeCounts: [],
      projectAnalysisCounts: [{ analysisKind, count: 1 }],
      defaultAppProjectKey: analysisKind === "app-world" ? "app" : null,
      appCandidates: [],
      projects: [],
    },
    page: null,
  } as WorkspaceStatusResponse;
}

function sessionWatchers(client: FakeRawClient): Array<{ disposed: boolean }> {
  const fileEvents = client.options.synchronize?.fileEvents;
  return (Array.isArray(fileEvents) ? fileEvents : fileEvents == null ? [] : [fileEvents]) as unknown as Array<{
    disposed: boolean;
  }>;
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}
