import { describe, expect, test, vi } from "vitest";
import type { LanguageClient, LanguageClientOptions } from "vscode-languageclient/node";
import { AureliaLanguageClient } from "../../out/client-core.js";
import { LspFacade } from "../../out/core/lsp-facade.js";
import { EXTENSION_HOST_OBSERVATION_EVENT } from "../../out/extension-host-observation.js";
import {
  createResourceDiscoveryHostControl,
  RESOURCE_DISCOVERY_HOST_CONTROL_EVENT,
  RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
  ResourceDiscoveryHostControl,
} from "../../out/resource-discovery-host-control.js";
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
    clientIndex: number,
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
  readonly templateAvailabilityResponse?: (workspaceUri: string) => unknown | Promise<unknown>;
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
      for (const language of ["jsonc", "json"]) {
        expect(client.options.documentSelector).not.toContainEqual(expect.objectContaining({
          scheme: "file",
          language,
          pattern: expect.objectContaining({ baseUri: client.workspaceUri, pattern: "**/*" }),
        }));
        expect(client.options.documentSelector).toContainEqual(expect.objectContaining({
          scheme: "file",
          language,
          pattern: expect.objectContaining({
            baseUri: client.workspaceUri,
            pattern: "**/aurelia.project.json",
          }),
        }));
      }
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
      projectConfigurationParserDiagnostics: "client",
      typeScriptProgramDiagnostics: "client",
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
      projectConfigurationParserDiagnostics: "client",
      typeScriptProgramDiagnostics: "client",
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
      projectConfigurationParserDiagnostics: "client",
      typeScriptProgramDiagnostics: "client",
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

  test("replaces created sessions rolled back while a later candidate is confirming", async () => {
    const { vscode } = twoWorkspaceApi();
    const secondStatus = deferred<WorkspaceStatusResponse | null>();
    const harness = createClientHarness(new Map(), {
      workspaceStatus: (workspaceUri, _requestIndex, clientIndex) => {
        if (workspaceUri === "file:///work/b" && clientIndex === 1) {
          return secondStatus.promise;
        }
        return workspaceStatus("app-world");
      },
    });
    const manager = createManager(vscode, harness);

    const starting = manager.start(stubExtensionContext(vscode));
    await vi.waitFor(() => expect(manager.sessions.map((session) => session.workspace.name)).toEqual(["a"]));
    await vi.waitFor(() => expect(harness.clients).toHaveLength(2));
    expect(manager.sessions[0]?.client).toBe(harness.clients[0]?.raw);

    const current = manager.reconcile();
    await Promise.all([starting, current]);

    expect(harness.clients).toHaveLength(4);
    expect(harness.clients[0]?.stop).toHaveBeenCalledTimes(1);
    expect(harness.clients[1]?.stop).toHaveBeenCalledTimes(1);
    expect(manager.sessions.map((session) => session.client)).toEqual([
      harness.clients[2]?.raw,
      harness.clients[3]?.raw,
    ]);
    expect(manager.sessions.every((session) =>
      harness.clients.find((client) => client.raw === session.client)?.stop.mock.calls.length === 0
    )).toBe(true);
    await manager.stop();
  });

  test("replaces a published sibling when primary withdrawal invalidates later reconfirmation", async () => {
    const primaryUri = "file:///work/z-root";
    const secondaryUri = "file:///work/a-root";
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "primary", uri: primaryUri }],
      files: {
        [`${primaryUri}/package.json`]: JSON.stringify({ dependencies: { aurelia: "latest" } }),
        [`${secondaryUri}/package.json`]: JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const blockedPrimaryStatus = deferred<WorkspaceStatusResponse | null>();
    const retiredClients = new Set<number>();
    const harness = createClientHarness(new Map(), {
      workspaceStatus: (workspaceUri, requestIndex, clientIndex) => {
        if (workspaceUri === primaryUri && requestIndex === 2) {
          return blockedPrimaryStatus.promise;
        }
        if (retiredClients.has(clientIndex)) {
          throw new Error("Client is not running");
        }
        return workspaceStatus("app-world");
      },
      clientStop: (_workspaceUri, clientIndex) => {
        retiredClients.add(clientIndex);
      },
    });
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));

    vscode.workspace.workspaceFolders?.push({
      name: "secondary",
      index: 1,
      uri: vscode.Uri.parse(secondaryUri),
    });
    const adding = manager.reconcile({ reconfirmExisting: true });
    await vi.waitFor(() => expect(manager.sessions.map((session) => session.workspace.name)).toEqual([
      "secondary",
      "primary",
    ]));
    await vi.waitFor(() => expect(harness.clients[0]?.sendRequest).toHaveBeenCalledTimes(2));
    expect(manager.sessions.find((session) => session.workspace.name === "secondary")?.client)
      .toBe(harness.clients[1]?.raw);

    const primaryIndex = vscode.workspace.workspaceFolders?.findIndex((folder) =>
      folder.uri.toString() === primaryUri
    ) ?? -1;
    expect(primaryIndex).toBeGreaterThanOrEqual(0);
    vscode.workspace.workspaceFolders?.splice(primaryIndex, 1);
    const removing = manager.reconcile({ reconfirmExisting: true });
    await Promise.all([adding, removing]);

    expect(harness.clients).toHaveLength(3);
    expect(harness.clients[0]?.stop).toHaveBeenCalledTimes(1);
    expect(harness.clients[1]?.stop).toHaveBeenCalledTimes(1);
    expect(manager.sessions).toEqual([
      expect.objectContaining({
        workspace: expect.objectContaining({ name: "secondary" }),
        client: harness.clients[2]?.raw,
      }),
    ]);
    expect(harness.clients[2]?.stop).not.toHaveBeenCalled();
    await manager.stop();
  });

  test("does not resurrect a primary when stop invalidates a partially published reconcile", async () => {
    const primaryUri = "file:///work/z-root";
    const secondaryUri = "file:///work/a-root";
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "primary", uri: primaryUri }],
      files: {
        [`${primaryUri}/package.json`]: JSON.stringify({ dependencies: { aurelia: "latest" } }),
        [`${secondaryUri}/package.json`]: JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    const blockedPrimaryStatus = deferred<WorkspaceStatusResponse | null>();
    const harness = createClientHarness(new Map(), {
      workspaceStatus: (workspaceUri, requestIndex) => {
        if (workspaceUri === primaryUri && requestIndex === 2) {
          return blockedPrimaryStatus.promise;
        }
        return workspaceStatus("app-world");
      },
    });
    const manager = createManager(vscode, harness);
    const publications: string[][] = [];
    manager.onDidChangeSessions((sessions) => {
      publications.push(sessions.map((session) => session.workspace.name));
    });
    await manager.start(stubExtensionContext(vscode));

    vscode.workspace.workspaceFolders?.push({
      name: "secondary",
      index: 1,
      uri: vscode.Uri.parse(secondaryUri),
    });
    const adding = manager.reconcile({ reconfirmExisting: true });
    await vi.waitFor(() => expect(manager.sessions.map((session) => session.workspace.name)).toEqual([
      "secondary",
      "primary",
    ]));
    await vi.waitFor(() => expect(harness.clients[0]?.sendRequest).toHaveBeenCalledTimes(2));

    const stopping = manager.stop();
    await Promise.all([adding, stopping]);

    expect(manager.sessions).toEqual([]);
    expect(harness.clients).toHaveLength(2);
    expect(harness.clients.every((client) => client.stop.mock.calls.length > 0)).toBe(true);
    const firstEmptyPublication = publications.findIndex((sessions) => sessions.length === 0);
    expect(firstEmptyPublication).toBeGreaterThanOrEqual(0);
    expect(publications.slice(firstEmptyPublication + 1).every((sessions) => sessions.length === 0)).toBe(true);
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

describe("resource discovery host controls", () => {
  test("allocates no controller or process listener unless both acceptance gates are exact", () => {
    const previousObservation = process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION;
    const previousAcceptance = process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE;
    const listeners = process.listenerCount(RESOURCE_DISCOVERY_HOST_CONTROL_EVENT);
    try {
      delete process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION;
      delete process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE;
      expect(createResourceDiscoveryHostControl({ admittedWorkspaceKeys: () => ["file:///work/app"] })).toBeUndefined();
      process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE = "1";
      expect(createResourceDiscoveryHostControl({ admittedWorkspaceKeys: () => ["file:///work/app"] })).toBeUndefined();
      delete process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE;
      process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION = "1";
      expect(createResourceDiscoveryHostControl({ admittedWorkspaceKeys: () => ["file:///work/app"] })).toBeUndefined();
      expect(process.listenerCount(RESOURCE_DISCOVERY_HOST_CONTROL_EVENT)).toBe(listeners);
      process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE = "1";
      const controller = createResourceDiscoveryHostControl({ admittedWorkspaceKeys: () => ["file:///work/app"] });
      expect(controller).toBeDefined();
      expect(process.listenerCount(RESOURCE_DISCOVERY_HOST_CONTROL_EVENT)).toBe(listeners + 1);
      controller?.dispose();
      expect(process.listenerCount(RESOURCE_DISCOVERY_HOST_CONTROL_EVENT)).toBe(listeners);
    } finally {
      restoreEnvironment("AURELIA_LS_EXTENSION_HOST_OBSERVATION", previousObservation);
      restoreEnvironment("AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE", previousAcceptance);
    }
  });

  test("enforces strict one-shot barrier, release, reset, cancellation, rejection, and disposal", async () => {
    await withResourceDiscoveryHostAcceptance(async (events) => {
      const workspaceKey = "file:///work/app";
      const controller = new ResourceDiscoveryHostControl({
        admittedWorkspaceKeys: () => [workspaceKey],
        installProcessListener: false,
      });
      controller.noteInventory([{
        key: workspaceKey,
        status: "ready",
        response: { projects: [{ status: "ready", project: { projectKey: "app" } }] },
      }]);
      controller.dispatch(armControl("barrier:one", {
        operation: "inventory",
        stage: "before-dispatch",
        workspaceKey,
        includeTypeSurfaces: true,
      }));
      const first = controller.beforeDispatch({
        operation: "inventory",
        workspaceKeys: [workspaceKey],
        includeTypeSurfaces: true,
      });
      await vi.waitFor(() => expect(events.some((event) =>
        event.observationId === "barrier:one" && event.phase === "blocked"
      )).toBe(true));
      controller.dispatch(releaseControl("barrier:one"));
      await expect(first).resolves.toBe(1);
      await expect(controller.beforeDispatch({
        operation: "inventory",
        workspaceKeys: [workspaceKey],
        includeTypeSurfaces: true,
      })).resolves.toBe(2);
      expect(events.filter((event) => event.observationId === "barrier:one" && event.phase === "blocked"))
        .toHaveLength(1);

      controller.dispatch(armControl("barrier:synchronous-release", {
        operation: "inventory",
        stage: "after-response",
        workspaceKey,
        includeTypeSurfaces: true,
      }));
      const releaseOnBlock = (event: { readonly observationId?: unknown; readonly phase?: unknown }): void => {
        if (event.observationId === "barrier:synchronous-release" && event.phase === "blocked") {
          controller.dispatch(releaseControl("barrier:synchronous-release"));
        }
      };
      process.on(EXTENSION_HOST_OBSERVATION_EVENT, releaseOnBlock);
      try {
        await expect(controller.afterResponse(
          { operation: "inventory", workspaceKeys: [workspaceKey], includeTypeSurfaces: true },
          3,
          "f-synchronous",
          { fingerprint: "f-synchronous" },
          (value) => ({ applied: false, value }),
        )).resolves.toEqual({ fingerprint: "f-synchronous" });
      } finally {
        process.off(EXTENSION_HOST_OBSERVATION_EVENT, releaseOnBlock);
      }

      controller.dispatch(armControl("barrier:cancel", {
        operation: "availability",
        stage: "before-dispatch",
        workspaceKey,
        projectKey: "app",
      }));
      const cancellation = testCancellationToken();
      const cancelled = controller.beforeDispatch({
        operation: "availability",
        workspaceKeys: [workspaceKey],
        projectKey: "app",
      }, cancellation.token as never);
      await vi.waitFor(() => expect(controller.liveControlCount).toBe(1));
      cancellation.cancel();
      await expect(cancelled).rejects.toMatchObject({ name: "Canceled", code: -32800 });

      controller.dispatch(armControl("barrier:reset", {
        operation: "availability",
        stage: "after-response",
        workspaceKey,
        projectKey: "app",
      }));
      const reset = controller.afterResponse(
        { operation: "availability", workspaceKeys: [workspaceKey], projectKey: "app" },
        4,
        "f1",
        { fingerprint: "f1" },
        (value) => ({ applied: false, value }),
      );
      await vi.waitFor(() => expect(controller.liveControlCount).toBe(1));
      controller.dispatch(resetControl("barrier:reset"));
      await expect(reset).rejects.toThrow("was reset");

      controller.dispatch({ ...releaseControl("missing"), unexpected: true });
      controller.dispatch(releaseControl("missing"));
      controller.dispatch({ ...armControl("bad", {
        operation: "availability",
        stage: "before-dispatch",
        workspaceKey,
      }), stableCode: "forbidden" });
      controller.dispatch({
        schemaVersion: RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
        action: "unknown",
        controlId: "unknown-action",
      });
      controller.dispatch({
        ...armControl("unknown-effect", {
          operation: "inventory",
          stage: "after-response",
          workspaceKey,
          includeTypeSurfaces: true,
        }),
        effect: "unknown-effect",
      });
      controller.dispatch(armControl("bad-workspace", {
        operation: "inventory",
        stage: "after-response",
        workspaceKey: "file:///work/not-admitted",
        includeTypeSurfaces: true,
        effect: "newest-error-once",
      }));
      controller.dispatch(armControl("bad-project", {
        operation: "inventory",
        stage: "after-response",
        workspaceKey,
        includeTypeSurfaces: true,
        projectKey: "not-admitted",
        effect: "project-error-once",
      }));
      controller.dispatch(armControl("all-on-minimum", {
        operation: "inventory",
        stage: "after-response",
        workspaceKey,
        includeTypeSurfaces: true,
        effect: "all-error-once",
      }));
      controller.dispatch(armControl("duplicate-live", {
        operation: "availability",
        stage: "before-dispatch",
        workspaceKey,
        projectKey: "app",
      }));
      controller.dispatch(armControl("duplicate-live", {
        operation: "availability",
        stage: "before-dispatch",
        workspaceKey,
        projectKey: "app",
      }));
      controller.dispatch(resetControl("duplicate-live"));
      expect(events.filter((event) => event.phase === "rejected").map((event) => event.reason)).toEqual([
        "release-fields-invalid",
        "barrier-not-blocked",
        "barrier-stable-code-forbidden",
        "action-unsupported",
        "effect-unsupported",
        "workspace-not-admitted",
        "project-not-admitted",
        "effect-not-admitted-in-lane",
        "duplicate-control-id",
      ]);

      controller.dispatch(armControl("barrier:dispose", {
        operation: "availability",
        stage: "before-dispatch",
        workspaceKey,
      }));
      const disposed = controller.beforeDispatch({ operation: "availability", workspaceKeys: [workspaceKey] });
      await vi.waitFor(() => expect(controller.liveControlCount).toBe(1));
      controller.dispose();
      await expect(disposed).rejects.toThrow("was disposed");
      expect(controller.liveControlCount).toBe(0);
      expect(events.at(-1)).toMatchObject({ phase: "disposed", controlCount: 1 });
      let disposedControlIdReads = 0;
      let disposedExtraReads = 0;
      const hostileDisposedPayload: Record<string, unknown> = {};
      Object.defineProperties(hostileDisposedPayload, {
        controlId: {
          enumerable: true,
          get: () => ++disposedControlIdReads === 1 ? "disposed:hostile" : null,
        },
        extra: {
          enumerable: true,
          get: () => {
            disposedExtraReads += 1;
            return "ignored";
          },
        },
      });
      expect(() => controller.dispatch(hostileDisposedPayload)).not.toThrow();
      expect({ disposedControlIdReads, disposedExtraReads }).toEqual({
        disposedControlIdReads: 1,
        disposedExtraReads: 1,
      });
      expect(events.at(-1)).toMatchObject({
        observationId: "disposed:hostile",
        phase: "rejected",
        reason: "controller-disposed",
      });
      for (const event of events) {
        expect(Object.isFrozen(event)).toBe(true);
        expect(Object.values(event).every((value) => value === null || ["string", "number", "boolean"].includes(typeof value)))
          .toBe(true);
      }
    });
  });

  test("rejects inherited controls and meaningless request match axes while admitting null-prototype payloads", async () => {
    await withResourceDiscoveryHostAcceptance(async (events) => {
      const workspaceKey = "file:///work/app";
      const controller = new ResourceDiscoveryHostControl({
        admittedWorkspaceKeys: () => [workspaceKey],
        installProcessListener: false,
      });
      controller.noteInventory([{
        key: workspaceKey,
        status: "ready",
        response: { projects: [{ status: "ready", project: { projectKey: "app" } }] },
      }]);
      try {
        const inherited = Object.create(armControl("inherited-control", {
          operation: "inventory",
          stage: "before-dispatch",
          workspaceKey,
          includeTypeSurfaces: true,
        })) as unknown;
        expect(() => controller.dispatch(inherited)).not.toThrow();

        const inheritedMatch = Object.create({ workspaceKey });
        controller.dispatch({
          ...armControl("inherited-match", {
            operation: "availability",
            stage: "before-dispatch",
            workspaceKey,
          }),
          match: inheritedMatch,
        });
        controller.dispatch({
          ...armControl("availability-extra-axis", {
            operation: "availability",
            stage: "before-dispatch",
            workspaceKey,
          }),
          match: { workspaceKey, includeTypeSurfaces: undefined },
        });
        controller.dispatch(armControl("inventory-project-barrier", {
          operation: "inventory",
          stage: "before-dispatch",
          workspaceKey,
          includeTypeSurfaces: true,
          projectKey: "app",
        }));
        controller.dispatch(armControl("inventory-project-all", {
          operation: "inventory",
          stage: "after-response",
          workspaceKey,
          includeTypeSurfaces: true,
          projectKey: "app",
          effect: "all-error-once",
        }));
        controller.dispatch({
          ...armControl("null-include-type-surfaces", {
            operation: "inventory",
            stage: "before-dispatch",
            workspaceKey,
            includeTypeSurfaces: true,
          }),
          match: { workspaceKey, includeTypeSurfaces: null },
        });
        controller.dispatch({
          ...armControl("null-project-key", {
            operation: "availability",
            stage: "before-dispatch",
            workspaceKey,
          }),
          match: { workspaceKey, projectKey: null },
        });
        controller.dispatch({
          ...armControl("null-stable-code", {
            operation: "availability",
            stage: "before-dispatch",
            workspaceKey,
          }),
          stableCode: null,
        });

        const nullMatch = Object.assign(Object.create(null), {
          workspaceKey,
          projectKey: "app",
        });
        const nullPayload = Object.assign(Object.create(null), {
          schemaVersion: RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
          action: "arm",
          controlId: "null-prototype",
          operation: "availability",
          stage: "before-dispatch",
          match: nullMatch,
          effect: "barrier",
        });
        expect(() => controller.dispatch(nullPayload)).not.toThrow();
        expect(controller.liveControlCount).toBe(1);
        controller.dispatch(resetControl("null-prototype"));

        const rejected = events.filter((event) => event.phase === "rejected");
        expect(rejected.map((event) => ({ observationId: event.observationId, reason: event.reason }))).toEqual([
          { observationId: "host-control", reason: "payload-not-plain-object" },
          { observationId: "inherited-match", reason: "match-fields-invalid" },
          { observationId: "availability-extra-axis", reason: "include-type-surfaces-invalid" },
          { observationId: "inventory-project-barrier", reason: "inventory-project-match-forbidden" },
          { observationId: "inventory-project-all", reason: "inventory-project-match-forbidden" },
          { observationId: "null-include-type-surfaces", reason: "include-type-surfaces-invalid" },
          { observationId: "null-project-key", reason: "project-key-invalid" },
          { observationId: "null-stable-code", reason: "stable-code-invalid" },
        ]);
        expect(events).toContainEqual(expect.objectContaining({
          observationId: "null-prototype",
          phase: "armed",
        }));
      } finally {
        controller.dispose();
      }
    });
  });

  test("normalizes accepted controls from own fields under Object.prototype pollution", async () => {
    await withResourceDiscoveryHostAcceptance(async (events) => {
      const workspaceKey = "file:///work/app";
      const controller = new ResourceDiscoveryHostControl({
        admittedWorkspaceKeys: () => [workspaceKey],
        installProcessListener: false,
      });
      const pollution = {
        controlId: "polluted-control",
        projectKey: "polluted-project",
        includeTypeSurfaces: true,
        stableCode: "POLLUTED_STABLE_CODE",
      } as const;
      const previous = new Map<string, PropertyDescriptor | undefined>();
      try {
        for (const [key, value] of Object.entries(pollution)) {
          previous.set(key, Object.getOwnPropertyDescriptor(Object.prototype, key));
          Object.defineProperty(Object.prototype, key, {
            configurable: true,
            enumerable: false,
            value,
            writable: true,
          });
        }

        const acceptedPayload = {
          schemaVersion: RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
          action: "arm",
          controlId: "pollution:barrier",
          operation: "availability",
          stage: "before-dispatch",
          match: { workspaceKey },
          effect: "barrier",
        };
        controller.dispatch(acceptedPayload);
        acceptedPayload.match.workspaceKey = "file:///work/mutated-after-dispatch";
        const blocked = controller.beforeDispatch({
          operation: "availability",
          workspaceKeys: [workspaceKey],
          projectKey: "actual-project",
        });
        await vi.waitFor(() => expect(events).toContainEqual(expect.objectContaining({
          observationId: "pollution:barrier",
          phase: "blocked",
        })));
        controller.dispatch(releaseControl("pollution:barrier"));
        await expect(blocked).resolves.toBe(1);

        controller.dispatch({
          schemaVersion: RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
          action: "arm",
          controlId: "pollution:reset-target",
          operation: "availability",
          stage: "before-dispatch",
          match: { workspaceKey },
          effect: "barrier",
        });
        controller.dispatch({
          schemaVersion: RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
          action: "reset",
        });
        expect(controller.liveControlCount).toBe(0);
        expect(events.filter((event) => event.phase === "rejected")).toEqual([]);
        expect(events).toContainEqual(expect.objectContaining({
          observationId: "pollution:reset-target",
          phase: "reset",
        }));
      } finally {
        controller.dispose();
        for (const [key, descriptor] of previous) {
          if (descriptor == null) delete (Object.prototype as Record<string, unknown>)[key];
          else Object.defineProperty(Object.prototype, key, descriptor);
        }
      }
    });
  });

  test("rejects null reset ids and snapshots every owned accessor exactly once", async () => {
    await withResourceDiscoveryHostAcceptance(async (events) => {
      const workspaceKey = "file:///work/app";
      const controller = new ResourceDiscoveryHostControl({
        admittedWorkspaceKeys: () => [workspaceKey],
        installProcessListener: false,
      });
      controller.noteInventory([{
        key: workspaceKey,
        status: "ready",
        response: { projects: [{ status: "ready", project: { projectKey: "app" } }] },
      }]);
      const counts = new Map<string, number>();
      const once = (name: string, value: unknown, subsequent: unknown = value): (() => unknown) => () => {
        const count = (counts.get(name) ?? 0) + 1;
        counts.set(name, count);
        return count === 1 ? value : subsequent;
      };
      const accessorRecord = (
        fields: Readonly<Record<string, () => unknown>>,
      ): Record<string, unknown> => {
        const record: Record<string, unknown> = {};
        for (const [key, get] of Object.entries(fields)) {
          Object.defineProperty(record, key, { configurable: true, enumerable: true, get });
        }
        return record;
      };
      try {
        controller.dispatch(armControl("reset:null-target", {
          operation: "availability",
          stage: "before-dispatch",
          workspaceKey,
        }));
        controller.dispatch({
          schemaVersion: RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
          action: "reset",
          controlId: null,
        });
        expect(controller.liveControlCount).toBe(1);
        expect(events).toContainEqual(expect.objectContaining({
          observationId: "host-control",
          phase: "rejected",
          reason: "control-id-invalid",
        }));
        controller.dispatch(resetControl("reset:null-target"));

        const match = accessorRecord({
          workspaceKey: once("match.workspaceKey", workspaceKey, "file:///poisoned"),
          projectKey: once("match.projectKey", "app", "poisoned"),
        });
        const validChanging = accessorRecord({
          schemaVersion: once("schemaVersion", RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA, "poisoned"),
          action: once("action", "arm", "reset"),
          controlId: once("controlId", "getter:valid", "getter:poisoned"),
          operation: once("operation", "availability", "inventory"),
          stage: once("stage", "before-dispatch", "after-response"),
          match: once("match", match, null),
          effect: once("effect", "barrier", "unknown-effect"),
        });
        expect(() => controller.dispatch(validChanging)).not.toThrow();
        expect(controller.liveControlCount).toBe(1);
        expect([...counts.values()]).toEqual(new Array(counts.size).fill(1));
        const blocked = controller.beforeDispatch({
          operation: "availability",
          workspaceKeys: [workspaceKey],
          projectKey: "app",
        });
        await vi.waitFor(() => expect(events).toContainEqual(expect.objectContaining({
          observationId: "getter:valid",
          phase: "blocked",
        })));
        controller.dispatch(releaseControl("getter:valid"));
        await expect(blocked).resolves.toBe(1);

        let invalidEffectReads = 0;
        const invalidChanging = {
          ...armControl("getter:invalid", {
            operation: "availability",
            stage: "before-dispatch",
            workspaceKey,
          }),
        } as Record<string, unknown>;
        Object.defineProperty(invalidChanging, "effect", {
          configurable: true,
          enumerable: true,
          get: () => ++invalidEffectReads === 1 ? "unknown-effect" : "barrier",
        });
        controller.dispatch(invalidChanging);
        expect(invalidEffectReads).toBe(1);
        expect(controller.liveControlCount).toBe(0);
        expect(events).toContainEqual(expect.objectContaining({
          observationId: "getter:invalid",
          phase: "rejected",
          reason: "effect-unsupported",
        }));

        const throwingReads = { schemaVersion: 0, action: 0, extra: 0 };
        const throwing = accessorRecord({
          schemaVersion: () => {
            throwingReads.schemaVersion += 1;
            throw new Error("untrusted getter");
          },
          action: () => {
            throwingReads.action += 1;
            return "arm";
          },
          extra: () => {
            throwingReads.extra += 1;
            return "untrusted";
          },
        });
        expect(() => controller.dispatch(throwing)).not.toThrow();
        expect(throwingReads).toEqual({ schemaVersion: 1, action: 1, extra: 1 });
        expect(events.at(-1)).toMatchObject({
          observationId: "host-control",
          phase: "rejected",
          reason: "payload-read-failed",
        });
      } finally {
        controller.dispose();
      }
    });
  });

  test("applies exact aggregate faults once and keeps genuine sibling rows intact", async () => {
    await withResourceDiscoveryHostAcceptance(async (events) => {
      const workspaceUri = "file:///work/app";
      const { vscode } = createVscodeApi({
        workspaceFolders: [{ name: "app", uri: workspaceUri }],
        files: { [`${workspaceUri}/package.json`]: JSON.stringify({ dependencies: { aurelia: "latest" } }) },
      });
      const harness = createClientHarness(new Map([
        [workspaceUri, workspaceStatus("app-world")],
      ]), {
        resourceResponse: () => {
          const base = resourceResponse(workspaceUri);
          const first = base.projects[0]!;
          return {
            ...base,
            projects: [first, {
              ...first,
              project: { ...first.project, projectKey: `${workspaceUri}:sibling` },
              resources: first.resources.map((resource) => ({ ...resource, projectKey: `${workspaceUri}:sibling` })),
            }],
          };
        },
      });
      const manager = createManager(vscode, harness);
      await manager.start(stubExtensionContext(vscode));
      const { logger } = createTestServices(vscode as unknown as VscodeApi);
      const facade = new LspFacade(manager, logger);
      try {
        const baseline = await facade.getResourceInventory({ workspaceKey: workspaceUri, includeTypeSurfaces: true });
        expect(baseline?.workspaces[0]?.status).toBe("ready");

        emitHostControl(armControl("fault:project", {
          operation: "inventory",
          stage: "after-response",
          workspaceKey: workspaceUri,
          includeTypeSurfaces: true,
          projectKey: `${workspaceUri}:app`,
          effect: "project-error-once",
          stableCode: "RD_PROJECT_ONCE",
        }));
        const faulted = await facade.getResourceInventory({ workspaceKey: workspaceUri, includeTypeSurfaces: true });
        const faultedProjects = faulted?.workspaces[0]?.status === "ready"
          ? faulted.workspaces[0].response.projects
          : [];
        expect(faultedProjects.map((project) => project.status)).toEqual(["error", "ready"]);
        expect(faultedProjects[0]).toMatchObject({ message: expect.stringContaining("RD_PROJECT_ONCE") });
        const recovered = await facade.getResourceInventory({ workspaceKey: workspaceUri, includeTypeSurfaces: true });
        expect(recovered?.workspaces[0]?.status === "ready"
          ? recovered.workspaces[0].response.projects.map((project) => project.status)
          : []).toEqual(["ready", "ready"]);

        emitHostControl(armControl("fault:newest", {
          operation: "inventory",
          stage: "after-response",
          workspaceKey: workspaceUri,
          includeTypeSurfaces: true,
          effect: "newest-error-once",
          stableCode: "RD_NEWEST_ONCE",
        }));
        const newest = await facade.getResourceInventory({ workspaceKey: workspaceUri, includeTypeSurfaces: true });
        expect(newest?.workspaces[0]).toMatchObject({ status: "error", error: expect.stringContaining("RD_NEWEST_ONCE") });
        expect((await facade.getResourceInventory({ workspaceKey: workspaceUri, includeTypeSurfaces: true }))?.workspaces[0]?.status)
          .toBe("ready");

        emitHostControl(armControl("fault:all", {
          operation: "inventory",
          stage: "after-response",
          workspaceKey: workspaceUri,
          includeTypeSurfaces: true,
          effect: "all-error-once",
          stableCode: "RD_ALL_ONCE",
        }));
        const all = await facade.getResourceInventory({ workspaceKey: workspaceUri, includeTypeSurfaces: true });
        expect(all?.workspaces[0]?.status === "ready"
          ? all.workspaces[0].response.projects.map((project) => project.status)
          : []).toEqual(["error", "error"]);
        expect(events.filter((event) => event.phase === "fault-applied").map((event) => event.observationId))
          .toEqual(["fault:project", "fault:newest", "fault:all"]);
      } finally {
        facade.dispose();
        await manager.stop();
      }
    }, true);
  });

  test("applies an all-project fault across admitted workspace boundaries once", async () => {
    await withResourceDiscoveryHostAcceptance(async (events) => {
      const workspaceA = "file:///work/a";
      const workspaceB = "file:///work/b";
      const { vscode } = twoWorkspaceApi();
      let failWorkspaceB = false;
      const harness = createClientHarness(new Map([
        [workspaceA, workspaceStatus("app-world")],
        [workspaceB, workspaceStatus("app-world")],
      ]), {
        resourceResponse: (workspaceUri) => {
          if (failWorkspaceB && workspaceUri === workspaceB) {
            throw new Error("private workspace B transport failure");
          }
          return resourceResponse(workspaceUri);
        },
      });
      const manager = createManager(vscode, harness);
      await manager.start(stubExtensionContext(vscode));
      const { logger } = createTestServices(vscode as unknown as VscodeApi);
      const facade = new LspFacade(manager, logger);
      try {
        emitHostControl(armControl("barrier:aggregate:a", {
          operation: "inventory",
          stage: "after-response",
          workspaceKey: workspaceA,
          includeTypeSurfaces: true,
        }));
        const aggregate = facade.getResourceInventory({ includeTypeSurfaces: true });
        await vi.waitFor(() => expect(events.find((event) =>
          event.observationId === "barrier:aggregate:a" && event.phase === "blocked"
        )).toMatchObject({ responseFingerprint: null }));
        emitHostControl(releaseControl("barrier:aggregate:a"));
        await aggregate;

        failWorkspaceB = true;
        emitHostControl(armControl("barrier:mixed:a", {
          operation: "inventory",
          stage: "after-response",
          workspaceKey: workspaceA,
          includeTypeSurfaces: true,
        }));
        const mixed = facade.getResourceInventory({ includeTypeSurfaces: true });
        await vi.waitFor(() => expect(events.find((event) =>
          event.observationId === "barrier:mixed:a" && event.phase === "blocked"
        )).toMatchObject({ responseFingerprint: null }));
        emitHostControl(releaseControl("barrier:mixed:a"));
        await mixed;
        failWorkspaceB = false;

        emitHostControl(armControl("fault:all:a", {
          operation: "inventory",
          stage: "after-response",
          workspaceKey: workspaceA,
          includeTypeSurfaces: true,
          effect: "all-error-once",
          stableCode: "RD_ALL_A_ONCE",
        }));

        const faulted = await facade.getResourceInventory({ includeTypeSurfaces: true });
        expect(faulted?.workspaces.map((workspace) => ({
          key: workspace.key,
          status: workspace.status,
          projectStatuses: workspace.status === "ready"
            ? workspace.response.projects.map((project) => project.status)
            : [],
        }))).toEqual([
          { key: workspaceA, status: "ready", projectStatuses: ["error"] },
          { key: workspaceB, status: "ready", projectStatuses: ["error"] },
        ]);

        const recovered = await facade.getResourceInventory({ includeTypeSurfaces: true });
        expect(recovered?.workspaces.map((workspace) => workspace.status === "ready"
          ? workspace.response.projects.map((project) => project.status)
          : [])).toEqual([["ready"], ["ready"]]);
      } finally {
        facade.dispose();
        await manager.stop();
      }
    }, true);
  });
});

describe("LspFacade workspace routing", () => {
  test("dispatches inventory synchronously when no host controller exists", async () => {
    const previousObservation = process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION;
    const previousAcceptance = process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE;
    delete process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION;
    delete process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE;
    const workspaceUri = "file:///work/app";
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: workspaceUri }],
      files: { [`${workspaceUri}/package.json`]: JSON.stringify({ dependencies: { aurelia: "latest" } }) },
    });
    const harness = createClientHarness(new Map([[workspaceUri, workspaceStatus("app-world")]]));
    const manager = createManager(vscode, harness);
    let facade: LspFacade | undefined;
    try {
      await manager.start(stubExtensionContext(vscode));
      const { logger } = createTestServices(vscode as unknown as VscodeApi);
      facade = new LspFacade(manager, logger);
      const client = harness.clients[0]!;
      client.sendRequest.mockClear();

      const inventory = facade.getResourceInventory({ workspaceKey: workspaceUri });

      expect(client.sendRequest).toHaveBeenCalledTimes(1);
      expect(client.sendRequest).toHaveBeenCalledWith("aurelia/resourceInventory", {}, undefined);
      await expect(inventory).resolves.toEqual(expect.objectContaining({
        workspaces: [expect.objectContaining({ status: "ready" })],
      }));
    } finally {
      facade?.dispose();
      await manager.stop();
      restoreEnvironment("AURELIA_LS_EXTENSION_HOST_OBSERVATION", previousObservation);
      restoreEnvironment("AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE", previousAcceptance);
    }
  });

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

    const limitations = await facade.getAnalysisLimitations();
    expect(limitations?.workspaces.map((workspace) => workspace.name)).toEqual(["a", "b"]);
    expect(limitations?.workspaces.map((workspace) =>
      workspace.status === "ready" ? workspace.response.fingerprint : null
    )).toEqual(["file:///work/a:limitations", "file:///work/b:limitations"]);
    expect(harness.clients[0]?.sendRequest).toHaveBeenCalledWith(
      "aurelia/analysisLimitations",
      undefined,
      undefined,
    );
    expect(harness.clients[1]?.sendRequest).toHaveBeenCalledWith(
      "aurelia/analysisLimitations",
      undefined,
      undefined,
    );

    const workspaceAInventoryCalls = harness.clients[0]!.sendRequest.mock.calls
      .filter(([method]) => method === "aurelia/resourceInventory").length;
    const workspaceBInventoryCalls = harness.clients[1]!.sendRequest.mock.calls
      .filter(([method]) => method === "aurelia/resourceInventory").length;
    await facade.getResourceInventory({
      workspaceKey: "file:///work/b",
      includeTypeSurfaces: true,
    });
    expect(harness.clients[0]!.sendRequest.mock.calls
      .filter(([method]) => method === "aurelia/resourceInventory")).toHaveLength(workspaceAInventoryCalls);
    expect(harness.clients[1]!.sendRequest.mock.calls
      .filter(([method]) => method === "aurelia/resourceInventory")).toHaveLength(workspaceBInventoryCalls + 1);
    expect(harness.clients[1]?.sendRequest).toHaveBeenLastCalledWith(
      "aurelia/resourceInventory",
      { includeTypeSurfaces: true },
      undefined,
    );

    const missingInventory = await facade.getResourceInventory({ workspaceKey: "file:///work/missing" });
    expect(missingInventory).toBeNull();
    expect(harness.clients[0]!.sendRequest.mock.calls
      .filter(([method]) => method === "aurelia/resourceInventory")).toHaveLength(workspaceAInventoryCalls);
    expect(harness.clients[1]!.sendRequest.mock.calls
      .filter(([method]) => method === "aurelia/resourceInventory")).toHaveLength(workspaceBInventoryCalls + 1);

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

  test("records only nonhealthy resource snapshots with causal structured Output detail", async () => {
    const workspaceUri = "file:///work/app";
    const { vscode, recorded } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: workspaceUri }],
      files: {
        [`${workspaceUri}/package.json`]: JSON.stringify({ dependencies: { aurelia: "latest" } }),
      },
    });
    let currentInventory: unknown = resourceResponse(workspaceUri);
    let currentAvailability: unknown = templateAvailabilityResponse(workspaceUri);
    const harness = createClientHarness(new Map([
      [workspaceUri, workspaceStatus("app-world")],
    ]), {
      resourceResponse: () => currentInventory,
      templateAvailabilityResponse: () => currentAvailability,
    });
    const manager = createManager(vscode, harness);
    await manager.start(stubExtensionContext(vscode));
    const { logger } = createTestServices(vscode as unknown as VscodeApi);
    const facade = new LspFacade(manager, logger);
    const inventoryVariant = (
      answer: Record<string, unknown> = {},
      completeness: Record<string, unknown> = {},
    ) => {
      const base = resourceResponse(workspaceUri);
      const project = base.projects[0]!;
      return {
        ...base,
        projects: [{
          ...project,
          answer: { ...project.answer, ...answer },
          completeness: { ...project.completeness, ...completeness },
        }],
      };
    };
    const availabilityVariant = (
      answer: Record<string, unknown> = {},
      completeness: Record<string, unknown> = {},
    ) => {
      const base = templateAvailabilityResponse(workspaceUri);
      const selection = base.projectSelection;
      return {
        ...base,
        projectSelection: {
          ...selection,
          answer: { ...selection.answer, ...answer },
          completeness: { ...selection.completeness, ...completeness },
        },
      };
    };
    const issueLogs = () => recorded.outputLogs.filter((line) => line.includes(".issue"));

    // Intentional compiler exclusion and row-level metadata counts are healthy
    // when the semantic answer still reports complete coverage.
    currentInventory = inventoryVariant({}, {
      excludedCompilerSyntax: 19,
      headerOnly: 2,
      visibilityOnly: 1,
    });
    await facade.getResourceInventory();
    await facade.getTemplateResourceAvailability(`${workspaceUri}/src/app.html`, { line: 0, character: 0 });
    expect(issueLogs()).toEqual([]);

    const projectError = resourceResponse(workspaceUri);
    currentInventory = {
      ...projectError,
      projects: [{
        status: "error",
        project: projectError.projects[0]!.project,
        message: "private project admission detail",
      }],
    };
    await facade.getResourceInventory();
    for (const result of ["failed", "invalid", "unsupported"] as const) {
      currentInventory = inventoryVariant({ result, summary: `private inventory ${result}` });
      await facade.getResourceInventory();
    }
    currentInventory = inventoryVariant({ coverage: "open", summary: "private inventory open" });
    await facade.getResourceInventory();
    currentInventory = inventoryVariant({}, { unnamedDefinitions: 1, unresolvedModules: 2, openVisibility: 3 });
    await facade.getResourceInventory();

    for (const result of ["failed", "invalid", "unsupported"] as const) {
      currentAvailability = availabilityVariant({ result, summary: `private availability ${result}` });
      await facade.getTemplateResourceAvailability(`${workspaceUri}/src/app.html`, { line: 0, character: 0 });
    }
    currentAvailability = availabilityVariant({ coverage: "open", summary: "private availability open" });
    await facade.getTemplateResourceAvailability(`${workspaceUri}/src/app.html`, { line: 0, character: 0 });
    currentAvailability = availabilityVariant({}, { unnamedDefinitions: 1, unresolvedModules: 2, openVisibility: 3 });
    await facade.getTemplateResourceAvailability(`${workspaceUri}/src/app.html`, { line: 0, character: 0 });

    const output = issueLogs().join("\n");
    expect(output).toContain("resource-inventory.project.issue");
    expect(output).toContain("status=error");
    expect(output).toContain("message=\"private project admission detail\"");
    expect(output).toContain("result=failed");
    expect(output).toContain("result=invalid");
    expect(output).toContain("result=unsupported");
    expect(output).toContain("coverage=open");
    expect(output).toContain("unnamedDefinitions\":1");
    expect(output).toContain("template-resource-availability.issue");
    expect(output).toContain("summary=\"private availability open\"");
    expect(output).toContain(`workspace=${workspaceUri}`);
    expect(output).toContain(`project=${workspaceUri}:app`);

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

function armControl(
  controlId: string,
  input: {
    readonly operation: "inventory" | "availability";
    readonly stage: "before-dispatch" | "after-response";
    readonly workspaceKey: string;
    readonly includeTypeSurfaces?: boolean;
    readonly projectKey?: string;
    readonly effect?: "barrier" | "project-error-once" | "all-error-once" | "newest-error-once";
    readonly stableCode?: string;
  },
) {
  return {
    schemaVersion: RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
    action: "arm" as const,
    controlId,
    operation: input.operation,
    stage: input.stage,
    match: {
      workspaceKey: input.workspaceKey,
      ...(input.includeTypeSurfaces == null ? {} : { includeTypeSurfaces: input.includeTypeSurfaces }),
      ...(input.projectKey == null ? {} : { projectKey: input.projectKey }),
    },
    effect: input.effect ?? "barrier",
    ...(input.stableCode == null ? {} : { stableCode: input.stableCode }),
  };
}

function releaseControl(controlId: string) {
  return {
    schemaVersion: RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
    action: "release" as const,
    controlId,
  };
}

function emitHostControl(payload: unknown): void {
  const host = process as unknown as { emit(eventName: string, payload: unknown): boolean };
  host.emit(RESOURCE_DISCOVERY_HOST_CONTROL_EVENT, payload);
}

function resetControl(controlId?: string) {
  return {
    schemaVersion: RESOURCE_DISCOVERY_HOST_CONTROL_SCHEMA,
    action: "reset" as const,
    ...(controlId == null ? {} : { controlId }),
  };
}

function testCancellationToken() {
  const listeners = new Set<() => void>();
  let cancelled = false;
  return {
    token: {
      get isCancellationRequested() { return cancelled; },
      onCancellationRequested(listener: () => void) {
        listeners.add(listener);
        return { dispose: () => listeners.delete(listener) };
      },
    },
    cancel() {
      if (cancelled) return;
      cancelled = true;
      for (const listener of [...listeners]) listener();
    },
  };
}

async function withResourceDiscoveryHostAcceptance(
  run: (events: Array<Readonly<Record<string, string | number | boolean | null>>>) => Promise<void>,
  currentStable = false,
): Promise<void> {
  const environment = [
    "AURELIA_LS_EXTENSION_HOST_OBSERVATION",
    "AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE",
    "AURELIA_LS_EXTENSION_HOST_EXPECTED_VERSION",
  ] as const;
  const previous = new Map(environment.map((key) => [key, process.env[key]]));
  const events: Array<Readonly<Record<string, string | number | boolean | null>>> = [];
  const listener = (event: Readonly<Record<string, string | number | boolean | null>>) => events.push(event);
  process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION = "1";
  process.env.AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE = "1";
  process.env.AURELIA_LS_EXTENSION_HOST_EXPECTED_VERSION = currentStable ? "stable" : "1.91.0";
  process.on(EXTENSION_HOST_OBSERVATION_EVENT, listener);
  try {
    await run(events);
  } finally {
    process.removeListener(EXTENSION_HOST_OBSERVATION_EVENT, listener);
    for (const key of environment) restoreEnvironment(key, previous.get(key));
  }
}

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value == null) delete process.env[key];
  else process.env[key] = value;
}

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
            return harnessOptions.workspaceStatus(workspaceUri, requestIndex, clientIndex);
          }
          return statusByWorkspace.get(workspaceUri) ?? null;
        }
        case "aurelia/resourceInventory":
          return harnessOptions.resourceResponse?.(workspaceUri) ?? resourceResponse(workspaceUri);
        case "aurelia/analysisLimitations":
          return { fingerprint: `${workspaceUri}:limitations`, projects: [] };
        case "aurelia/sourceOwnership":
          return sourceOwnershipResponse(workspaceUri, (params as { uri: string }).uri);
        case "aurelia/templateResourceAvailability":
          return harnessOptions.templateAvailabilityResponse?.(workspaceUri) ?? {
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

function templateAvailabilityResponse(workspaceUri: string) {
  const inventory = resourceResponse(workspaceUri);
  const project = inventory.projects[0]!.project;
  return {
    fingerprint: `${workspaceUri}:availability`,
    projectSelection: {
      status: "exact",
      project,
      answer: {
        schemaVersion: "0.2",
        result: "answered",
        selection: "exact",
        coverage: "complete",
        summary: "complete",
        page: null,
      },
      selectedTemplate: {
        templateIdentityKey: "template:app",
        scopeIdentityKey: "scope:app",
        definitionName: "app",
        compilationLane: "app-runtime",
        source: { state: "absent" },
      },
      templateCandidates: [],
      resources: [],
      completeness: {
        fullDefinitions: 1,
        headerOnly: 0,
        visibilityOnly: 0,
        localTemplates: 0,
        excludedCompilerSyntax: 19,
        unnamedDefinitions: 0,
        unresolvedModules: 0,
        openVisibility: 0,
      },
    },
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
