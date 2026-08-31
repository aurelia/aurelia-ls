import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHmac } from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  AURELIA_SUPPORT_REPORT_SCHEMA,
  readPersistedSupportLogTails,
  sanitizePersistedLogText,
  SupportReportIdentities,
  SupportReportService,
} from "../out/support-report.js";
import type { VscodeApi } from "../out/vscode-api.js";
import { createVscodeApi, stubExtensionContext } from "./helpers/vscode-stub.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })));
});

describe("SupportReportService", () => {
  test("opens a source-free, pseudonymized, locally reviewable JSON report", async () => {
    const privateWorkspace = "file:///C:/Users/fred/private-rpg";
    const privateDocument = `${privateWorkspace}/src/ui-pvp-local.html`;
    const { vscode: stubVscode, recorded } = createVscodeApi({
      workspaceFolders: [{ name: "private-rpg", uri: privateWorkspace }],
      openDocuments: [{
        uri: privateDocument,
        languageId: "html",
        text: "DO_NOT_COPY_THIS_SOURCE_TEXT",
      }],
    });
    stubVscode.window.activeTextEditor = { document: stubVscode.workspace.textDocuments[0] };
    const vscode = stubVscode as unknown as VscodeApi;
    const context = stubExtensionContext(stubVscode);
    const service = new SupportReportService(context, vscode, {
      transportMode: "worker",
      now: () => new Date("2026-08-31T17:30:00.000Z"),
      randomSalt: () => new Uint8Array(32).fill(7),
      reportId: () => "report-id",
      readLogTails: async () => ({
        tails: [{
          channelName: "Aurelia Language Server (private-rpg)",
          text: [
            "[aurelia-ls] [hover] cancelled semantic-runtime request for C:\\Users\\fred\\private-rpg\\src\\ui-pvp-local.html",
            "[aurelia-ls] failure in file:///C:/Users/fred/private-rpg/src/app.ts",
            "[aurelia-ls] rechecking ui-pvp-local.html",
            "authored markup <div class=\"private-secret-value\"></div>",
          ].join("\n"),
          sourceBytes: 512,
          returnedBytes: 320,
          truncated: true,
        }],
        failures: [],
      }),
    });
    service.attachLanguageClient({
      supportState: (identify: (kind: string, value: string) => string) => ({
        status: "available",
        lifecycle: {
          startConsumed: true,
          started: true,
          acceptingRequests: true,
          stopping: false,
          lifecycleGeneration: 4,
          pendingGlobalReconciliation: false,
          pendingTopologyChangeCount: 0,
          retiringClientCount: 0,
          transitioningClientCount: 0,
        },
        sessionCount: 1,
        sessions: [{
          workspaceId: identify("workspace", privateWorkspace),
          publication: "published",
          activationMode: "auto",
          activationEvidence: "package-manifest",
          availability: "active",
          incarnation: 1,
          clientState: "running",
          nativeProjectConfigurationCount: 0,
          excludedFolderCount: 0,
          projectRootHintCount: 1,
          status: null,
        }],
      }),
      semanticSessionStateForUri: () => "active",
    } as never);
    service.registerResourceExplorerState(() => ({
      visible: true,
      acceptingRefreshes: true,
      dirtyAll: false,
      dirtyWorkspaceCount: 0,
      forcedWhileHidden: false,
      refreshInFlight: false,
      activeRefreshScope: "none",
      provider: {
        phase: "current",
        refreshGeneration: 3,
        treeRootCount: 1,
        hasInventory: true,
        updatingAll: false,
        updatingWorkspaceCount: 0,
        staleWorkspaceCount: 0,
        hasIssues: false,
        hasAnalysisReview: false,
        counts: { boundaries: 1, projects: 1, resources: 12, failures: 0, incomplete: 0 },
      },
    }));
    const workerError = Object.assign(
      new Error("Worker failed at C:\\Users\\fred\\private-rpg\\src\\app.ts"),
      { code: "ERR_WORKER_OUT_OF_MEMORY" },
    );
    service.recordWorkerTransportEvent(
      { id: `aurelia-ls:${privateWorkspace}`, name: "Aurelia Language Server (private-rpg)" },
      { type: "error", error: workerError },
    );
    service.recordWorkerTransportEvent(
      { id: `aurelia-ls:${privateWorkspace}`, name: "Aurelia Language Server (private-rpg)" },
      { type: "stderr", text: "RAW_WORKER_STDERR_DO_NOT_RETAIN C:\\Users\\fred\\private-rpg" },
    );

    await service.openReport();

    const document = recorded.openedDocuments.at(-1);
    expect(document?.languageId).toBe("json");
    expect(recorded.shownDocuments.at(-1)?.opts).toEqual({ preview: false });
    const report = JSON.parse(document?.getText() ?? "null") as any;
    expect(report).toMatchObject({
      schemaVersion: AURELIA_SUPPORT_REPORT_SCHEMA,
      reportId: "report-id",
      privacy: {
        automaticUpload: false,
        sourceFilesRead: false,
        configurationFilesRead: false,
        packageManifestsRead: false,
        persistedLogCaveat: expect.stringContaining("may still contain authored identifiers or short text"),
        reviewBeforeSharing: true,
      },
      worker: {
        transportMode: "worker",
        recentEvents: [
          {
            type: "error",
            error: { code: "ERR_WORKER_OUT_OF_MEMORY", messageKind: "worker-out-of-memory" },
          },
          { type: "stderr", characterCount: 57, lineCount: 1 },
        ],
      },
      resourceExplorer: {
        provider: { phase: "current", counts: { resources: 12 } },
      },
      collection: { complete: true, failures: [] },
    });
    expect(report.workspace.folders[0].workspaceId).toBe(report.client.sessions[0].workspaceId);
    const serialized = JSON.stringify(report);
    for (const secret of [
      "DO_NOT_COPY_THIS_SOURCE_TEXT",
      "private-rpg",
      "ui-pvp-local.html",
      "C:\\Users\\fred",
      "file:///C:/Users/fred",
      "private-secret-value",
      "RAW_WORKER_STDERR_DO_NOT_RETAIN",
    ]) {
      expect(serialized).not.toContain(secret);
    }
    expect(serialized).toContain("workspace:");
    expect(serialized).toContain("<source-name:");
  });

  test("uses a fresh identity domain for every report", async () => {
    const workspaceUri = "file:///private/workspace";
    const { vscode: stubVscode } = createVscodeApi({
      workspaceFolders: [{ name: "private", uri: workspaceUri }],
    });
    let salt = 0;
    const service = new SupportReportService(
      stubExtensionContext(stubVscode),
      stubVscode as unknown as VscodeApi,
      {
        transportMode: "worker",
        randomSalt: () => new Uint8Array(32).fill(++salt),
        readLogTails: async () => ({ tails: [], failures: [] }),
      },
    );

    const first = await service.createReport() as any;
    const second = await service.createReport() as any;

    expect(first.workspace.folders[0].workspaceId).not.toBe(second.workspace.folders[0].workspaceId);
    expect(JSON.stringify(first)).not.toContain(workspaceUri);
    expect(JSON.stringify(second)).not.toContain(workspaceUri);
    expect(JSON.stringify(first)).not.toContain("salt");
  });

  test("returns a partial report when optional owners and persisted logs fail", async () => {
    const { vscode: stubVscode } = createVscodeApi();
    const service = new SupportReportService(
      stubExtensionContext(stubVscode),
      stubVscode as unknown as VscodeApi,
      {
        transportMode: "ipc",
        randomSalt: () => new Uint8Array(32).fill(3),
        readLogTails: async () => { throw Object.assign(new Error("private failure"), { code: "EIO" }); },
      },
    );
    service.attachLanguageClient({ supportState: () => { throw new Error("dead server"); } } as never);
    service.registerResourceExplorerState(() => { throw new Error("disposed view"); });
    service.recordWorkerTransportEvent(
      { id: "dead", name: "dead" },
      { type: "exit", code: 1 },
    );

    const report = await service.createReport() as any;

    expect(report.client).toEqual({ status: "unavailable" });
    expect(report.resourceExplorer).toEqual({ status: "unavailable" });
    expect(report.persistedLogs).toEqual([]);
    expect(report.worker.recentEvents).toEqual([expect.objectContaining({ type: "exit", code: 1 })]);
    expect(report.collection.complete).toBe(false);
    expect(report.collection.failures).toEqual(expect.arrayContaining([
      { section: "client", reason: "Error" },
      { section: "resourceExplorer", reason: "Error" },
      { section: "persistedLogs", reason: "Error (EIO)" },
    ]));
    expect(JSON.stringify(report)).not.toContain("private failure");
    expect(JSON.stringify(report)).not.toContain("dead server");
    expect(JSON.stringify(report)).not.toContain("disposed view");
  });

  test("collects bounded server snapshots with the private per-report salt", async () => {
    const workspaceUri = "file:///private/server-workspace";
    const documentUri = `${workspaceUri}/src/app.html`;
    const { vscode: stubVscode } = createVscodeApi({
      workspaceFolders: [{ name: "private", uri: workspaceUri }],
      openDocuments: [{ uri: documentUri, languageId: "html", text: "PRIVATE SOURCE" }],
    });
    stubVscode.window.activeTextEditor = { document: stubVscode.workspace.textDocuments[0] };
    const requests: Array<{ method: string; params: unknown }> = [];
    const service = new SupportReportService(
      stubExtensionContext(stubVscode),
      stubVscode as unknown as VscodeApi,
      {
        transportMode: "worker",
        randomSalt: () => new Uint8Array(32).fill(12),
        readLogTails: async () => ({ tails: [], failures: [] }),
      },
    );
    service.attachLanguageClient({
      sessions: [{
        workspace: { key: workspaceUri, uri: workspaceUri },
        incarnation: 3,
        client: {
          sendRequest: async (method: string, params: unknown) => {
            requests.push({ method, params });
            const identitySalt = Buffer.from(
              (params as { identitySalt: string }).identitySalt,
              "base64url",
            );
            return {
              schemaVersion: "aurelia-support-snapshot/1",
              requests: {
                aggregateCount: 0,
                recentTerminals: [{
                  documentId: `document:${createHmac("sha256", identitySalt)
                    .update("document")
                    .update("\0")
                    .update(documentUri)
                    .digest("hex")
                    .slice(0, 20)}`,
                }],
              },
              privateSource: "DO_NOT_EMBED_SERVER_OVERRIDE_SOURCE",
            };
          },
        },
      }],
      supportState: () => ({ status: "available", lifecycle: {}, sessionCount: 0, sessions: [] }),
      semanticSessionStateForUri: () => "active",
    } as never);

    const report = await service.createReport() as any;

    expect(requests).toEqual([{
      method: "aurelia/supportSnapshot",
      params: { identitySalt: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/u) },
    }]);
    expect(report.servers).toMatchObject({
      status: "available",
      sessionCount: 1,
      omittedSessionCount: 0,
      snapshots: [{
        workspaceId: report.workspace.folders[0].workspaceId,
        incarnation: 3,
        status: "available",
        snapshot: { schemaVersion: "aurelia-support-snapshot/1" },
      }],
    });
    expect(report.servers.snapshots[0].snapshot.requests.recentTerminals[0].documentId)
      .toBe(report.workspace.activeDocument.documentId);
    const requestSalt = (requests[0]?.params as { identitySalt: string }).identitySalt;
    expect(JSON.stringify(report)).not.toContain(requestSalt);
    expect(JSON.stringify(report)).not.toContain(workspaceUri);
    expect(JSON.stringify(report)).not.toContain("DO_NOT_EMBED_SERVER_OVERRIDE_SOURCE");
  });

  test("keeps responsive server evidence when another server misses the deadline", async () => {
    const { vscode: stubVscode } = createVscodeApi();
    const never = new Promise<never>(() => undefined);
    let cancellationObserved = false;
    const service = new SupportReportService(
      stubExtensionContext(stubVscode),
      stubVscode as unknown as VscodeApi,
      {
        transportMode: "worker",
        randomSalt: () => new Uint8Array(32).fill(13),
        readLogTails: async () => ({ tails: [], failures: [] }),
        serverSnapshotDeadlineMilliseconds: 5,
      },
    );
    service.attachLanguageClient({
      sessions: [
        {
          workspace: { key: "file:///responsive", uri: "file:///responsive" },
          incarnation: 1,
          client: { sendRequest: async () => ({ schemaVersion: "aurelia-support-snapshot/1" }) },
        },
        {
          workspace: { key: "file:///hung", uri: "file:///hung" },
          incarnation: 2,
          client: {
            sendRequest: async (_method: string, _params: unknown, token: {
              readonly onCancellationRequested: (listener: () => void) => unknown;
            }) => {
              token.onCancellationRequested(() => { cancellationObserved = true; });
              return await never;
            },
          },
        },
      ],
      supportState: () => ({ status: "available", lifecycle: {}, sessionCount: 0, sessions: [] }),
      semanticSessionStateForUri: () => "active",
    } as never);

    const report = await service.createReport() as any;

    expect(report.servers.snapshots).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: "available" }),
      expect.objectContaining({ status: "unavailable", reason: "Error (SUPPORT_SNAPSHOT_TIMEOUT)" }),
    ]));
    expect(report.collection.complete).toBe(false);
    expect(report.collection.failures).toContainEqual({
      section: "servers[0]",
      reason: "Error (SUPPORT_SNAPSHOT_TIMEOUT)",
    });
    expect(cancellationObserved).toBe(true);
  });

  test("drops a server snapshot that would exceed the combined server payload budget", async () => {
    const { vscode: stubVscode } = createVscodeApi();
    const service = new SupportReportService(
      stubExtensionContext(stubVscode),
      stubVscode as unknown as VscodeApi,
      {
        transportMode: "worker",
        randomSalt: () => new Uint8Array(32).fill(14),
        readLogTails: async () => ({ tails: [], failures: [] }),
      },
    );
    const event = {
      sequence: 1,
      feature: "hover",
      outcome: "failed",
      durationMilliseconds: 1,
      documentId: null,
      clientCancellationRequested: false,
      underlyingStale: false,
      staleFacts: null,
    };
    service.attachLanguageClient({
      sessions: [{
        workspace: { key: "file:///large", uri: "file:///large" },
        incarnation: 1,
        client: {
          sendRequest: async () => ({
            schemaVersion: "aurelia-support-snapshot/1",
            requests: { recentTerminals: Array.from({ length: 8_000 }, () => event) },
          }),
        },
      }],
      supportState: () => ({
        status: "available",
        lifecycle: { lifecycleGeneration: 1 },
        sessionCount: 0,
        sessions: [],
      }),
      semanticSessionStateForUri: () => "active",
    } as never);

    const report = await service.createReport() as any;

    expect(report.servers.snapshots).toEqual([
      expect.objectContaining({ status: "unavailable", reason: "SnapshotSizeLimitExceeded" }),
    ]);
    expect(report.servers.returnedSnapshotBytes).toBe(0);
    expect(report.collection.failures).toContainEqual({
      section: "servers[0]",
      reason: "SnapshotSizeLimitExceeded",
    });
    expect(Buffer.byteLength(JSON.stringify(report), "utf8")).toBeLessThan(1_024 * 1_024);
  });

  test("does not trust live support payloads from an explicit server override", async () => {
    vi.stubEnv("AURELIA_LS_SERVER_PATH", "C:\\private\\override-server.cjs");
    const { vscode: stubVscode } = createVscodeApi();
    const sendRequest = vi.fn(async () => ({ schemaVersion: "aurelia-support-snapshot/1" }));
    const service = new SupportReportService(
      stubExtensionContext(stubVscode),
      stubVscode as unknown as VscodeApi,
      {
        transportMode: "worker",
        randomSalt: () => new Uint8Array(32).fill(15),
        readLogTails: async () => ({ tails: [], failures: [] }),
      },
    );
    service.attachLanguageClient({
      sessions: [{
        workspace: { key: "file:///override", uri: "file:///override" },
        incarnation: 1,
        client: { sendRequest },
      }],
      supportState: () => ({
        status: "available",
        lifecycle: { lifecycleGeneration: 1 },
        sessionCount: 0,
        sessions: [],
      }),
      semanticSessionStateForUri: () => "active",
    } as never);

    const report = await service.createReport() as any;

    expect(sendRequest).not.toHaveBeenCalled();
    expect(report.servers).toEqual({ status: "unavailable", reason: "ServerOverridePresent" });
    expect(report.collection.failures).toContainEqual({
      section: "servers",
      reason: "ServerOverridePresent",
    });
    expect(JSON.stringify(report)).not.toContain("override-server.cjs");
  });

  test("refuses a snapshot returned by a replaced session incarnation", async () => {
    const { vscode: stubVscode } = createVscodeApi();
    const workspace = { key: "file:///changing", uri: "file:///changing" };
    const languageClient: { sessions: any[]; supportState: () => any; semanticSessionStateForUri: () => string } = {
      sessions: [],
      supportState: () => ({
        status: "available",
        lifecycle: { lifecycleGeneration: languageClient.sessions[0]?.incarnation ?? 0 },
        sessionCount: languageClient.sessions.length,
        sessions: [],
      }),
      semanticSessionStateForUri: () => "active",
    };
    const client = {
      sendRequest: async () => {
        languageClient.sessions = [{ workspace, incarnation: 2, client }];
        return { schemaVersion: "aurelia-support-snapshot/1" };
      },
    };
    languageClient.sessions = [{ workspace, incarnation: 1, client }];
    const service = new SupportReportService(
      stubExtensionContext(stubVscode),
      stubVscode as unknown as VscodeApi,
      {
        transportMode: "worker",
        randomSalt: () => new Uint8Array(32).fill(16),
        readLogTails: async () => ({ tails: [], failures: [] }),
      },
    );
    service.attachLanguageClient(languageClient as never);

    const report = await service.createReport() as any;

    expect(report.servers.snapshots).toEqual([
      expect.objectContaining({
        incarnation: 1,
        status: "unavailable",
        reason: "Error (SUPPORT_SNAPSHOT_SESSION_CHANGED)",
      }),
    ]);
    expect(report.servers.clientStateChangedDuringCollection).toBe(true);
    expect(report.collection.failures).toContainEqual({
      section: "servers[0]",
      reason: "Error (SUPPORT_SNAPSHOT_SESSION_CHANGED)",
    });
  });
});

describe("persisted support log tails", () => {
  test("reads only bounded .log tails from the extension log directory", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "aurelia-support-report-"));
    temporaryDirectories.push(directory);
    const prefix = "discard-me\n".repeat(8_000);
    await writeFile(path.join(directory, "Aurelia LS (Client).log"), `${prefix}TAIL_MARKER\n`, "utf8");
    await writeFile(path.join(directory, "authored-source.ts"), "DO_NOT_READ", "utf8");
    const { vscode } = createVscodeApi();

    const result = await readPersistedSupportLogTails(vscode.Uri.file(directory) as never);

    expect(result.failures).toEqual([]);
    expect(result.tails).toHaveLength(1);
    expect(result.tails[0]).toMatchObject({ truncated: true, returnedBytes: 64 * 1_024 });
    expect(result.tails[0]?.text).toContain("TAIL_MARKER");
    expect(JSON.stringify(result)).not.toContain("DO_NOT_READ");
  });

  test("pseudonymizes path-shaped and source-shaped log values deterministically", () => {
    const identities = new SupportReportIdentities(new Uint8Array(32).fill(9));
    const input = [
      "request failed for C:\\Users\\Fred Smith\\My Game\\src\\shop.html after SECRET42",
      "failure at 'C:\\Users\\Fred Smith\\My Game\\generated output'",
      "file:///C:/private/game/src/shop.ts",
      "shop.html",
      "unquoted C:\\Users\\Fred Doe\\secret-project",
      "unc \\\\private-server\\Fred Doe\\secret-project",
      "unix /Users/Fred Doe/secret-project",
    ].join("\n");
    const first = JSON.stringify(sanitizePersistedLogText(input, identities));
    const second = JSON.stringify(sanitizePersistedLogText(input, identities));

    expect(first).toBe(second);
    expect(first).not.toContain("private");
    expect(first).not.toContain("shop");
    expect(first).not.toContain("Fred Smith");
    expect(first).not.toContain("My Game");
    expect(first).not.toContain("Fred Doe");
    expect(first).not.toContain("secret-project");
    expect(first).not.toContain("private-server");
    expect(first).not.toContain("SECRET42");
    expect(first).toContain("<path:");
    expect(first).toContain("<source-name:");
    expect(first).toContain("<log-identifier:");
  });
});
