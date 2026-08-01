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
): ClientHarness {
  const clients: FakeRawClient[] = [];
  const createClient = vi.fn((
    _id: string,
    _name: string,
    _serverOptions: unknown,
    options: LanguageClientOptions,
  ) => {
    const workspaceUri = options.workspaceFolder?.uri.toString() ?? "";
    const notifications = new Map<string, (payload: unknown) => void>();
    const start = vi.fn(async () => undefined);
    const stop = vi.fn(async () => undefined);
    const sendNotification = vi.fn(async () => undefined);
    const convertWorkspaceEdit = vi.fn(async () => ({ convertedBy: workspaceUri }));
    const sendRequest = vi.fn(async (method: string, params?: unknown, token?: unknown) => {
      void params;
      void token;
      switch (method) {
        case "aurelia/workspaceStatus":
          return statusByWorkspace.get(workspaceUri) ?? null;
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
