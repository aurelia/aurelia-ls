import { describe, expect, test, vi } from "vitest";
import type { LanguageClient, LanguageClientOptions } from "vscode-languageclient/node";
import { AureliaLanguageClient } from "../../out/client-core.js";
import { LspFacade } from "../../out/core/lsp-facade.js";
import {
  AureliaActivationMode,
  isWorkspaceNativeProjectConfigurationUri,
  isWorkspaceProjectManifestUri,
  readWorkspaceActivationAdmission,
} from "../../out/workspace-activation.js";
import type { WorkspaceStatusResponse } from "@aurelia-ls/language-server/protocol";
import type { VscodeApi } from "../../out/vscode-api.js";
import { createTestServices } from "../helpers/test-helpers.js";
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
  readonly resourceResponse?: (workspaceUri: string) => unknown | Promise<unknown>;
}

describe("workspace activation admission", () => {
  test("uses dependency keys, open facade imports, and resource-scoped overrides without treating HTML as proof", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [
        { name: "plain", uri: "file:///work/plain" },
        { name: "manifest", uri: "file:///work/manifest" },
        { name: "source", uri: "file:///work/source" },
        { name: "side-effect", uri: "file:///work/side-effect" },
        { name: "configured", uri: "file:///work/configured" },
        { name: "forced", uri: "file:///work/forced" },
        { name: "disabled", uri: "file:///work/disabled" },
      ],
      files: {
        "file:///work/plain/src/view.html": "<template></template>",
        "file:///work/manifest/package.json": JSON.stringify({ devDependencies: { "@aurelia/runtime-html": "latest" } }),
        "file:///work/configured/aurelia.project.json": JSON.stringify({ version: 1 }),
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
    expect((await readWorkspaceActivationAdmission(vscode as unknown as VscodeApi, folders[4] as never))?.evidence)
      .toBe("native-project-configuration");
    expect((await readWorkspaceActivationAdmission(vscode as unknown as VscodeApi, folders[5] as never))?.mode)
      .toBe(AureliaActivationMode.On);
    expect(await readWorkspaceActivationAdmission(vscode as unknown as VscodeApi, folders[6] as never)).toBeNull();
  });

  test("evaluates ignored topology directories relative to the workspace root", () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/dist/app" }],
    });
    const folder = vscode.workspace.workspaceFolders![0]!;

    expect(isWorkspaceProjectManifestUri(folder as never, vscode.Uri.parse("file:///work/dist/app/package.json") as never))
      .toBe(true);
    expect(isWorkspaceNativeProjectConfigurationUri(
      folder as never,
      vscode.Uri.parse("file:///work/dist/app/aurelia.project.json") as never,
    )).toBe(true);
    expect(isWorkspaceProjectManifestUri(
      folder as never,
      vscode.Uri.parse("file:///work/dist/app/generated/dist/package.json") as never,
    )).toBe(false);
    expect(isWorkspaceNativeProjectConfigurationUri(
      folder as never,
      vscode.Uri.parse("file:///work/dist/app/node_modules/pkg/aurelia.project.json") as never,
    )).toBe(false);
  });
});

describe("AureliaLanguageClient workspace ownership", () => {
  test("uses native config to recover and retain a session without an app world", async () => {
    const { vscode, recorded } = createVscodeApi({
      workspaceFolders: [{ name: "candidate", uri: "file:///work/candidate" }],
      files: {
        "file:///work/candidate/src/main.ts": "export class App {}",
      },
    });
    const statusByWorkspace = new Map([
      ["file:///work/candidate", workspaceStatus("outside-aurelia")],
    ]);
    const harness = createClientHarness(statusByWorkspace);
    const manager = createManager(vscode, harness);

    await manager.start(stubExtensionContext(vscode));
    expect(manager.sessions).toEqual([]);
    expect(harness.clients).toEqual([]);
    const configWatcher = recorded.fileWatchers.find((watcher) => watcher.globPattern === "**/aurelia.project.json")!;

    const configUri = vscode.Uri.parse("file:///work/candidate/aurelia.project.json");
    recorded.setFile(configUri.toString(), JSON.stringify({ version: 1 }));
    statusByWorkspace.set("file:///work/candidate", workspaceStatus("outside-aurelia", {
      nativeProjectConfigurationUris: [configUri.toString()],
    }));
    configWatcher.fireCreate(configUri);
    await vi.waitFor(() => expect(manager.sessions).toHaveLength(1));
    expect(manager.sessions[0]?.activationEvidence).toBe("native-project-configuration");

    configWatcher.fireChange(configUri);
    await vi.waitFor(() => expect(harness.clients[0]?.sendNotification).toHaveBeenCalledWith(
      "workspace/didChangeWatchedFiles",
      { changes: [{ uri: configUri.toString(), type: 2 }] },
    ));

    statusByWorkspace.set("file:///work/candidate", workspaceStatus("outside-aurelia"));
    recorded.deleteFile(configUri.toString());
    configWatcher.fireDelete(configUri);
    await vi.waitFor(() => expect(manager.sessions).toHaveLength(0));
    expect(harness.clients[0]?.sendNotification).toHaveBeenCalledWith(
      "workspace/didChangeWatchedFiles",
      { changes: [{ uri: configUri.toString(), type: 3 }] },
    );

    await manager.stop();
    expect(configWatcher.disposed).toBe(true);
  });

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
      expect(client.options.diagnosticPullOptions).toEqual({ onChange: false, onFocus: true });
      expect(client.options.documentSelector).not.toContainEqual(expect.objectContaining({ scheme: "untitled" }));
      expect(client.options.documentSelector).toContainEqual(expect.objectContaining({
        scheme: "file",
        pattern: expect.objectContaining({ baseUri: client.workspaceUri, pattern: "**/*" }),
      }));
      expect(client.options.synchronize?.fileEvents).toEqual([
        expect.objectContaining({
          globPattern: expect.objectContaining({
            pattern: "**/*.{html,css,json,ts,tsx,js,jsx,mts,cts,mjs,cjs}",
          }),
        }),
      ]);
    }
    expect(manager.clientForUri("file:///work/app/src/main.ts")).toBe(harness.clients[0]?.raw);
    expect(manager.clientForUri("file:///work/library/src/card.html")).toBe(harness.clients[1]?.raw);
    expect(manager.clientForUri("file:///elsewhere/view.html")).toBeUndefined();
    expect(manager.clientForUri("untitled:Untitled-1")).toBeUndefined();

    await manager.stop();
    expect(harness.clients.every((client) => client.stop.mock.calls.length === 1)).toBe(true);
  });

  test("treats nested off as a hard subtree boundary and replaces the owning session when it changes", async () => {
    const configuration: Record<string, Record<string, unknown>> = {
      "file:///work/repo/packages/disabled": { "aurelia.activationMode": "off" },
      "file:///work/repo/packages/disabled/examples/reentry": { "aurelia.activationMode": "on" },
    };
    const { vscode } = createVscodeApi({
      workspaceFolders: [
        { name: "outer", uri: "file:///work/repo" },
        { name: "disabled", uri: "file:///work/repo/packages/disabled" },
        { name: "reentry", uri: "file:///work/repo/packages/disabled/examples/reentry" },
      ],
      files: {
        "file:///work/repo/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
        "file:///work/repo/packages/disabled/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
        "file:///work/repo/packages/disabled/examples/reentry/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
      workspaceConfiguration: configuration,
    });
    const harness = createClientHarness(new Map([
      ["file:///work/repo", workspaceStatus("app-world")],
    ]));
    const manager = createManager(vscode, harness);

    await manager.start(stubExtensionContext(vscode));

    expect(manager.sessions).toHaveLength(1);
    expect(manager.sessions[0]?.excludedFolders.map((folder) => folder.name)).toEqual(["disabled"]);
    expect(harness.clients[0]?.options.initializationOptions).toEqual({
      excludedWorkspaceRootUris: ["file:///work/repo/packages/disabled"],
      projectRootHintUris: ["file:///work/repo"],
    });
    expect(manager.clientForUri("file:///work/repo/src/main.ts")).toBe(harness.clients[0]?.raw);
    expect(manager.clientForUri("file:///work/repo/packages/disabled/src/main.ts")).toBeUndefined();
    expect(manager.clientForUri("file:///work/repo/packages/disabled/examples/reentry/src/main.ts")).toBeUndefined();

    configuration["file:///work/repo/packages/disabled"] = { "aurelia.activationMode": "auto" };
    await manager.reconcile();

    expect(harness.clients).toHaveLength(2);
    expect(harness.clients[0]?.stop).toHaveBeenCalledOnce();
    expect(harness.clients[0]!.stop.mock.invocationCallOrder[0]).toBeLessThan(
      harness.clients[1]!.start.mock.invocationCallOrder[0]!,
    );
    expect(manager.sessions).toHaveLength(1);
    expect(manager.sessions[0]?.excludedFolders).toEqual([]);
    expect(harness.clients[1]?.options.initializationOptions).toEqual({
      excludedWorkspaceRootUris: [],
      projectRootHintUris: [
        "file:///work/repo",
        "file:///work/repo/packages/disabled",
        "file:///work/repo/packages/disabled/examples/reentry",
      ],
    });
    expect(manager.clientForUri("file:///work/repo/packages/disabled/src/main.ts")).toBe(harness.clients[1]?.raw);
    await manager.stop();
  });

  test("does not offer a missing or non-directory workspace folder as live semantic root evidence", async () => {
    const { vscode, recorded } = createVscodeApi({
      workspaceFolders: [
        { name: "outer", uri: "file:///work/repo" },
        { name: "stale", uri: "file:///work/repo/packages/stale" },
        { name: "file", uri: "file:///work/repo/packages/replaced-by-file" },
      ],
      files: {
        "file:///work/repo/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
        "file:///work/repo/packages/replaced-by-file": "not a directory",
      },
    });
    recorded.deleteFile("file:///work/repo/packages/stale");
    const harness = createClientHarness(new Map([
      ["file:///work/repo", workspaceStatus("app-world")],
    ]));
    const manager = createManager(vscode, harness);

    await manager.start(stubExtensionContext(vscode));

    expect(manager.sessions).toHaveLength(1);
    expect(harness.clients[0]?.options.initializationOptions).toEqual({
      excludedWorkspaceRootUris: [],
      projectRootHintUris: ["file:///work/repo"],
    });
    await manager.stop();
  });

  test("does not serialize workspace reconciliation behind server process retirement", async () => {
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
      clientStop: () => stopGate.promise,
    });
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));

    vscode.workspace.workspaceFolders?.splice(0, 1);
    const reconciliation = manager.reconcile();
    const reconciled = await Promise.race([
      reconciliation.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 100)),
    ]);

    expect(reconciled).toBe(true);
    expect(manager.sessions).toEqual([]);
    expect(harness.clients[0]?.stop).toHaveBeenCalledWith(30_000);

    stopGate.resolve(undefined);
    await manager.stop();
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

  test("hands a rejected outer topology to its nested workspace without reconfirming a disjoint session", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [
        { name: "repo", uri: "file:///work/repo" },
        { name: "app", uri: "file:///work/repo/packages/app" },
        { name: "other", uri: "file:///work/other" },
      ],
      files: {
        "file:///work/repo/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
        "file:///work/repo/packages/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
        "file:///work/other/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const statusByWorkspace = new Map([
      ["file:///work/repo", workspaceStatus("app-world", { fingerprint: "repo:g1" })],
      ["file:///work/repo/packages/app", workspaceStatus("app-world", { fingerprint: "app:g1" })],
      ["file:///work/other", workspaceStatus("app-world", { fingerprint: "other:g1" })],
    ]);
    const harness = createClientHarness(statusByWorkspace);
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    const { logger } = createTestServices(vscode as unknown as VscodeApi);
    const facade = new LspFacade(manager, logger);
    const topology = vi.fn();
    facade.onAnalysisChanged(topology);
    const outer = harness.clients.find((client) => client.workspaceUri === "file:///work/repo")!;
    const disjoint = harness.clients.find((client) => client.workspaceUri === "file:///work/other")!;

    statusByWorkspace.set("file:///work/repo", workspaceStatus("outside-aurelia", { fingerprint: "repo:g2" }));
    outer.emit("aurelia/analysisChanged", { fingerprint: "repo:g2", changeKind: "topology" });

    await vi.waitFor(() => expect(manager.sessions.map((session) => session.workspace.name).sort())
      .toEqual(["app", "other"]));
    expect(topology).not.toHaveBeenCalled();
    expect(disjoint.sendRequest).toHaveBeenCalledTimes(1);
    expect(disjoint.stop).not.toHaveBeenCalled();
    expect(outer.stop).toHaveBeenCalledTimes(1);

    facade.dispose();
    await manager.stop();
  });

  test("retains an open deleted native config and retires after close returns authority to the missing file", async () => {
    const configUri = "file:///work/configured/aurelia.project.json";
    const { vscode, recorded } = createVscodeApi({
      workspaceFolders: [{ name: "configured", uri: "file:///work/configured" }],
      files: { [configUri]: JSON.stringify({ version: 1 }) },
      openDocuments: [{ uri: configUri, languageId: "json", text: JSON.stringify({ version: 1 }) }],
    });
    const statusByWorkspace = new Map([
      ["file:///work/configured", workspaceStatus("outside-aurelia", {
        fingerprint: "config:g1",
        nativeProjectConfigurationUris: [configUri],
      })],
    ]);
    const harness = createClientHarness(statusByWorkspace);
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    const { logger } = createTestServices(vscode as unknown as VscodeApi);
    const facade = new LspFacade(manager, logger);
    facade.onAnalysisChanged(() => {});
    const client = harness.clients[0]!;

    recorded.deleteFile(configUri);
    statusByWorkspace.set("file:///work/configured", workspaceStatus("outside-aurelia", {
      fingerprint: "config:g2",
      nativeProjectConfigurationUris: [configUri],
    }));
    client.emit("aurelia/analysisChanged", { fingerprint: "config:g2", changeKind: "topology" });
    await vi.waitFor(() => expect(client.sendRequest).toHaveBeenCalledTimes(2));
    expect(manager.sessions).toHaveLength(1);
    expect(client.sendRequest).toHaveBeenLastCalledWith("aurelia/workspaceStatus", {
      nativeProjectConfigurationUris: [configUri],
    });

    recorded.fireDocumentClosed(vscode.workspace.textDocuments[0]!);
    statusByWorkspace.set("file:///work/configured", workspaceStatus("outside-aurelia", {
      fingerprint: "config:g3",
    }));
    client.emit("aurelia/analysisChanged", { fingerprint: "config:g3", changeKind: "topology" });
    await vi.waitFor(() => expect(manager.sessions).toHaveLength(0));
    expect(client.sendRequest).toHaveBeenLastCalledWith("aurelia/workspaceStatus", {
      nativeProjectConfigurationUris: [],
    });

    facade.dispose();
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
    await vi.waitFor(() => expect(harness.clients[0]?.sendRequest).toHaveBeenCalledWith(
      "aurelia/workspaceStatus",
      { nativeProjectConfigurationUris: [] },
    ));
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
    await vi.waitFor(() => expect(harness.clients[0]?.sendRequest).toHaveBeenCalledWith(
      "aurelia/workspaceStatus",
      { nativeProjectConfigurationUris: [] },
    ));
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

  test("rolls back partial listener installation and keeps start single-use", async () => {
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

    await expect(manager.start(context)).rejects.toThrow("may start only once");
    await manager.stop();
  });
});

describe("LspFacade workspace routing", () => {
  test("routes URI requests and conversions while preserving workspace-owned inventory snapshots", async () => {
    const { vscode } = twoWorkspaceApi();
    const harness = createClientHarness(new Map([
      ["file:///work/a", workspaceStatus("app-world")],
      ["file:///work/b", workspaceStatus("app-world")],
    ]));
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    const { logger } = createTestServices(vscode as unknown as VscodeApi);
    const facade = new LspFacade(manager, logger);

    const related = await facade.getRelatedFiles("file:///work/b/src/card.ts");
    expect(related).toEqual([{
      uri: "file:///work/b/related.html",
      role: "component-template",
      elementName: "related-element",
      className: "RelatedElement",
    }]);
    expect(harness.clients[1]?.sendRequest).toHaveBeenCalledWith(
      "aurelia/getRelatedFiles",
      { uri: "file:///work/b/src/card.ts" },
      undefined,
    );

    const ownership = await facade.getSourceOwnership("file:///work/b/src/card.ts");
    expect(ownership).toEqual(expect.objectContaining({
      fingerprint: "file:///work/b:ownership",
      sourceUri: "file:///work/b/src/card.ts",
      workspace: expect.objectContaining({ name: "b" }),
      owners: [expect.objectContaining({ projectKey: "file:///work/b:app" })],
    }));
    expect(harness.clients[1]?.sendRequest).toHaveBeenCalledWith(
      "aurelia/sourceOwnership",
      { uri: "file:///work/b/src/card.ts" },
      undefined,
    );

    const prototypePosition = Object.assign(Object.create({
      get line(): number { return this._line; },
      get character(): number { return this._character; },
    }), { _line: 28, _character: 15 }) as { readonly line: number; readonly character: number };
    expect(structuredClone(prototypePosition)).not.toHaveProperty("line");

    await facade.getTemplateResourceAvailability(
      "file:///work/b/src/my-app.html",
      prototypePosition,
      "file:///work/b:app",
      "template:my-app",
    );
    expect(harness.clients[1]?.sendRequest).toHaveBeenCalledWith(
      "aurelia/templateResourceAvailability",
      {
        uri: "file:///work/b/src/my-app.html",
        position: { line: 28, character: 15 },
        projectKey: "file:///work/b:app",
        templateResourceScopeIdentityKey: "template:my-app",
      },
      undefined,
    );

    await facade.renameFromTs(
      "file:///work/b/src/card.ts",
      prototypePosition,
      "renamedCard",
    );
    expect(harness.clients[1]?.sendRequest).toHaveBeenCalledWith(
      "aurelia/renameFromTs",
      {
        uri: "file:///work/b/src/card.ts",
        position: { line: 28, character: 15 },
        newName: "renamedCard",
      },
      undefined,
    );

    const inventory = await facade.getResourceInventory();
    expect(inventory?.workspaces.map((workspace) => workspace.name)).toEqual(["a", "b"]);
    expect(inventory?.workspaces.map((workspace) =>
      workspace.status === "ready"
        ? workspace.response.projects.flatMap((project) => project.status === "ready" ? project.resources : []).map((resource) => resource.name)
        : []
    )).toEqual([["shared-name"], ["shared-name"]]);
    expect(harness.clients[0]?.sendRequest).toHaveBeenCalledWith(
      "aurelia/resourceInventory",
      {},
      undefined,
    );
    expect(harness.clients[1]?.sendRequest).toHaveBeenCalledWith(
      "aurelia/resourceInventory",
      {},
      undefined,
    );

    await facade.getResourceInventory({
      workspaceKey: "file:///work/b",
      includeTypeSurfaces: true,
    });
    expect(harness.clients[1]?.sendRequest).toHaveBeenLastCalledWith(
      "aurelia/resourceInventory",
      { includeTypeSurfaces: true },
      undefined,
    );

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

  test("preserves a failed resource workspace beside healthy aggregate results", async () => {
    const { vscode } = twoWorkspaceApi();
    const harness = createClientHarness(new Map([
      ["file:///work/a", workspaceStatus("app-world")],
      ["file:///work/b", workspaceStatus("app-world")],
    ]), {
      resourceResponse: (workspaceUri) => {
        if (workspaceUri === "file:///work/b") throw new Error("resource inventory failed");
        return resourceResponse(workspaceUri);
      },
    });
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    const { logger } = createTestServices(vscode as unknown as VscodeApi);
    const facade = new LspFacade(manager, logger);

    const inventory = await facade.getResourceInventory();

    expect(inventory?.workspaces.map((workspace) => workspace.status)).toEqual(["ready", "error"]);
    expect(inventory?.workspaces[0]).toEqual(expect.objectContaining({
      name: "a",
      status: "ready",
    }));
    expect(inventory?.workspaces[1]).toEqual(expect.objectContaining({
      status: "error",
      error: "resource inventory failed",
    }));

    facade.dispose();
    await manager.stop();
  });

  test("multicasts one raw notification and rebinds when workspace ownership changes", async () => {
    const { vscode, recorded } = twoWorkspaceApi();
    const harness = createClientHarness(new Map([
      ["file:///work/a", workspaceStatus("app-world")],
      ["file:///work/b", workspaceStatus("app-world")],
    ]));
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    const { logger } = createTestServices(vscode as unknown as VscodeApi);
    const facade = new LspFacade(manager, logger);
    const first = vi.fn();
    const second = vi.fn();
    const firstSubscription = facade.onAnalysisChanged(first);
    facade.onAnalysisChanged(second);

    harness.clients[0]?.emit("aurelia/analysisChanged", { fingerprint: "1" });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0]?.[0].workspace.name).toBe("a");

    firstSubscription.dispose();
    harness.clients[0]?.emit("aurelia/analysisChanged", { fingerprint: "2" });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);

    const retired = harness.clients[0]!;
    vscode.workspace.workspaceFolders?.splice(0, 1);
    recorded.fireWorkspaceFoldersChanged();
    await vi.waitFor(() => expect(manager.sessions.map((session) => session.workspace.name)).toEqual(["b"]));
    retired.emit("aurelia/analysisChanged", { fingerprint: "old" });
    harness.clients[1]?.emit("aurelia/analysisChanged", { fingerprint: "new" });
    expect(second).toHaveBeenCalledTimes(3);

    facade.dispose();
    await manager.stop();
  });

  test("gates settled topology by semantic fingerprint and does not publish status-only session changes", async () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///work/app" }],
      files: {
        "file:///work/app/package.json": JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const statusByWorkspace = new Map([
      ["file:///work/app", workspaceStatus("app-world", { fingerprint: "app:g1" })],
    ]);
    const harness = createClientHarness(statusByWorkspace);
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    const sessionChanges = vi.fn();
    manager.onDidChangeSessions(sessionChanges);
    const { logger } = createTestServices(vscode as unknown as VscodeApi);
    const facade = new LspFacade(manager, logger);
    const topology = vi.fn();
    facade.onAnalysisChanged(topology);
    const client = harness.clients[0]!;

    client.emit("aurelia/analysisChanged", { fingerprint: "app:g1", changeKind: "topology" });
    await vi.waitFor(() => expect(topology).toHaveBeenCalledTimes(1));
    expect(client.sendRequest).toHaveBeenCalledTimes(1);

    statusByWorkspace.set("file:///work/app", workspaceStatus("app-world", { fingerprint: "app:g2" }));
    client.emit("aurelia/analysisChanged", { fingerprint: "app:g2", changeKind: "topology" });
    await vi.waitFor(() => expect(topology).toHaveBeenCalledTimes(2));
    expect(client.sendRequest).toHaveBeenCalledTimes(2);
    expect(manager.sessions[0]?.status?.fingerprint).toBe("app:g2");
    expect(sessionChanges).not.toHaveBeenCalled();

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
  const { logger } = createTestServices(vscode as unknown as VscodeApi);
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
        case "aurelia/resourceInventory":
          return harnessOptions.resourceResponse?.(workspaceUri) ?? resourceResponse(workspaceUri);
        case "aurelia/sourceOwnership":
          return sourceOwnershipResponse(workspaceUri, (params as { uri: string }).uri);
        case "aurelia/templateResourceAvailability":
          return {
            fingerprint: `${workspaceUri}:availability`,
            projectSelection: { status: "absent", candidates: [] },
          };
        case "aurelia/renameFromTs":
          return { status: "not-applicable", reason: "not-an-aurelia-symbol" };
        case "aurelia/getRelatedFiles":
          return [{
            uri: `${workspaceUri}/related.html`,
            role: "component-template",
            elementName: "related-element",
            className: "RelatedElement",
          }];
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

function resourceResponse(workspaceUri: string) {
  const answer = {
    schemaVersion: "0.2",
    result: "answered",
    selection: "not-applicable",
    coverage: "complete",
    summary: "complete",
    page: null,
  };
  return {
    fingerprint: workspaceUri,
    projects: [{
      status: "ready",
      project: {
        projectKey: `${workspaceUri}:app`,
        rootUri: workspaceUri,
        sourceFiles: 1,
        shapeKind: "app",
        analysisKind: "app-world",
      },
      answer,
      resources: [{
        identityKey: `resource:${workspaceUri}:shared-name:v1`,
        projectKey: `${workspaceUri}:app`,
        kind: "custom-element",
        name: "shared-name",
        registrationKey: "au:resource:custom-element:shared-name",
        aliases: [],
        bindables: [],
        declarationModes: ["decorator"],
        metadataState: "full-definition",
        origin: {
          kind: "project",
          projectKey: `${workspaceUri}:app`,
          packageName: null,
          moduleKey: "src/shared-name.ts",
          catalogGroup: null,
        },
        locality: {
          kind: "project",
          ownerIdentityKey: null,
          ownerName: null,
          ownerSource: { state: "absent" },
        },
        sources: {
          publicName: { state: "absent" },
          declaration: { state: "absent" },
          implementation: { state: "absent" },
        },
        navigation: { state: "unavailable", reason: "no-authored-source" },
      }],
      completeness: {
        fullDefinitions: 1,
        headerOnly: 0,
        visibilityOnly: 0,
        localTemplates: 0,
        excludedCompilerSyntax: 0,
        unnamedDefinitions: 0,
        unresolvedModules: 0,
        openVisibility: 0,
      },
    }],
  };
}

function sourceOwnershipResponse(workspaceUri: string, sourceUri: string) {
  return {
    fingerprint: `${workspaceUri}:ownership`,
    sourceUri,
    answer: {
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: "owned",
      page: null,
    },
    owners: [{
      projectKey: `${workspaceUri}:app`,
      rootUri: workspaceUri,
      projectPath: sourceUri.slice(`${workspaceUri}/`.length),
      role: "app-source",
    }],
  };
}

function workspaceStatus(
  analysisKind: ProjectAnalysisKind,
  options: {
    readonly fingerprint?: string;
    readonly nativeProjectConfigurationUris?: readonly string[];
  } = {},
): WorkspaceStatusResponse {
  const nativeProjectConfigurationUris = options.nativeProjectConfigurationUris ?? [];
  return {
    fingerprint: options.fingerprint ?? `${analysisKind}:fingerprint`,
    answer: {
      schemaVersion: "0.2",
      result: "answered",
      selection: "not-applicable",
      coverage: "complete",
      summary: analysisKind,
      page: null,
    },
    projectAnalysisCounts: [{ analysisKind, count: 1 }],
    nativeProjectConfigurations: {
      answer: {
        schemaVersion: "0.2",
        result: "answered",
        selection: "not-applicable",
        coverage: "complete",
        summary: `${nativeProjectConfigurationUris.length} native project configuration(s)`,
        page: null,
      },
      rows: nativeProjectConfigurationUris.map((sourceUri, index) => ({
        projectKey: `configured-${index}`,
        projectRootUri: sourceUri.replace(/\/aurelia\.project\.json$/u, ""),
        sourceUri,
        appliedExcludedSourceRootUris: [],
        diagnosticCount: 0,
      })),
    },
  };
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
