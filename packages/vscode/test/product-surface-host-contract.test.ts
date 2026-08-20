import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

interface SettlementResult {
  readonly error: string | null;
  readonly settlement: null | {
    readonly reportKind: string;
    readonly itemCount: number;
    readonly observedAttemptCount: number;
    readonly observedCurrentAttemptCount: number;
    readonly observedCanceledAttemptCount: number;
    readonly observedSubsequentAttemptCount: number;
  };
}

const localRequire = createRequire(import.meta.url);
const { parseDiagnosticProviderSettlement } = localRequire(
  "./extension-host/diagnostic-provider-settlement.cjs",
) as {
  parseDiagnosticProviderSettlement(
    this: void,
    events: readonly Record<string, unknown>[],
    uri: string,
    documentVersion: number,
    observationStart: number,
  ): SettlementResult;
};
const { admittedAuthoredRoot, authenticatedFixtureFilePaths } = localRequire(
  "./extension-host/authored-resource-path.cjs",
) as {
  admittedAuthoredRoot(
    this: void,
    filePath: string,
    roots: readonly string[],
    authenticatedRelativePathsByRoot?: ReadonlyMap<string, ReadonlySet<string>>,
    resolveRealPath?: ((filePath: string) => string) | null,
  ): string | null;
  authenticatedFixtureFilePaths(
    this: void,
    fixture: {
      readonly files?: readonly { readonly relativePath?: unknown }[];
      readonly [key: string]: unknown;
    },
  ): ReadonlySet<string>;
};
const { applyWorkspaceFolderUpdate } = localRequire(
  "./extension-host/workspace-folder-update.cjs",
) as {
  applyWorkspaceFolderUpdate(
    this: void,
    start: number,
    deleteCount: number,
    additions: readonly unknown[],
    message: string,
    dependencies: {
      readonly workspace: {
        onDidChangeWorkspaceFolders(listener: (event: unknown) => void): { dispose(): void };
        updateWorkspaceFolders(start: number, deleteCount: number, ...additions: readonly unknown[]): boolean;
      };
      readonly wait: (predicate: () => boolean, message: string, timeoutMs: number) => Promise<void>;
    },
  ): Promise<unknown>;
};
const { acceptNativeQuickPickOrdinal, driveNativeQuickPickOrdinal } = localRequire(
  "./extension-host/native-quick-pick-driver.cjs",
) as {
  acceptNativeQuickPickOrdinal(this: void, options: NativeQuickPickAcceptOptions): Promise<QuickPickEvent>;
  driveNativeQuickPickOrdinal(this: void, options: NativeQuickPickDriveOptions): Promise<QuickPickEvent>;
};
const {
  assertExactFactKeys,
  assertFinalRecoveredWorkspaceFingerprints,
  assertScopedPublicationFingerprintCoherence,
  assertScopedStablePendingEvidence,
  baselineTreeFactKeys,
  closeTextDocumentWithNativeEditor,
  predecessorRaceFactKeys,
  publicationContainsProjectIssue,
  publicationHasExactProjectIssueNodeIds,
  publicationNodeDurableShape,
} = localRequire(
  "./extension-host/resource-discovery-host-driver.cjs",
) as {
  assertExactFactKeys(
    this: void,
    value: Record<string, unknown>,
    expectedKeys: readonly string[],
    label: string,
  ): Record<string, unknown>;
  assertFinalRecoveredWorkspaceFingerprints(
    this: void,
    nodes: readonly HostObservation[],
    recoveries: readonly { readonly workspaceIdentity: string; readonly fingerprint: string }[],
    label: string,
  ): void;
  assertScopedPublicationFingerprintCoherence(
    this: void,
    publication: HostObservation,
    nodes: readonly HostObservation[],
    label: string,
  ): number;
  assertScopedStablePendingEvidence(this: void, value: {
    readonly observations: readonly HostObservation[];
    readonly invalidated: HostObservation;
    readonly blocked: HostObservation;
    readonly barrierControlId: string;
    readonly blockedWorkspaceKey: string;
    readonly label: string;
  }): { readonly pendingTreePublicationCount: number; readonly pendingViewStateCount: number };
  baselineTreeFactKeys: readonly string[];
  closeTextDocumentWithNativeEditor(
    this: void,
    document: HostDocument,
    message: string,
    dependencies: {
      readonly workspace: {
        readonly textDocuments: readonly HostDocument[];
        onDidCloseTextDocument(listener: (document: HostDocument) => void): { dispose(): void };
      };
      readonly window: {
        readonly tabGroups: {
          readonly all: readonly { readonly tabs: readonly HostTab[] }[];
          close(tabs: readonly HostTab[], preserveFocus?: boolean): Promise<boolean>;
        };
      };
      readonly wait: (predicate: () => boolean, message: string, timeoutMs: number) => Promise<void>;
    },
  ): Promise<string>;
  publicationContainsProjectIssue(
    this: void,
    observations: readonly HostObservation[],
    publication: HostObservation,
    projectKey: string,
  ): boolean;
  publicationHasExactProjectIssueNodeIds(
    this: void,
    observations: readonly HostObservation[],
    publication: HostObservation,
    expectedNodeIds: readonly string[],
  ): boolean;
  predecessorRaceFactKeys: readonly string[];
  publicationNodeDurableShape(this: void, node: HostObservation): Record<string, unknown>;
};

interface HostDocument {
  readonly uri: { toString(): string };
}

interface HostTab {
  readonly input: { readonly uri?: { toString(): string } };
}

interface HostObservation extends Record<string, unknown> {
  readonly source: string;
  readonly observationId: string;
  readonly phase: string;
}

interface QuickPickEvent extends Record<string, unknown> {
  readonly observationId: string;
}

interface QuickPickModel {
  readonly ready: { readonly observationId: string; readonly modelOrdinal: number };
  readonly items: readonly {
    readonly itemKind: string;
    readonly itemOrdinal: number;
    readonly label: string;
  }[];
}

interface NativeQuickPickDriveOptions {
  readonly command: string;
  readonly flowStart: number;
  readonly model: QuickPickModel;
  readonly targetOrdinal: number;
  readonly observations: () => readonly QuickPickEvent[];
  readonly dispatchSelectNext: () => Promise<void>;
  readonly waitForActive: (
    start: number,
    predicate: (event: QuickPickEvent) => boolean,
    message: string,
  ) => Promise<QuickPickEvent>;
}

interface NativeQuickPickAcceptOptions {
  readonly command: string;
  readonly flowStart: number;
  readonly model: QuickPickModel;
  readonly targetOrdinal: number;
  readonly observations: () => readonly QuickPickEvent[];
  readonly dispatchAccept: () => Promise<void>;
  readonly waitForAccept: (
    start: number,
    predicate: (event: QuickPickEvent) => boolean,
    message: string,
  ) => Promise<QuickPickEvent>;
  readonly closeQuickPick: () => Promise<void>;
  readonly waitForSettlement: (timeoutMs: number) => Promise<void>;
  readonly delay?: (milliseconds: number) => Promise<void>;
}

const uri = "file:///workspace/src/app.html";

describe("Extension Host product-surface contracts", () => {
  test("keeps mixed-case hover identity in the shared current/minimum product journey", () => {
    const source = readFileSync(
      new URL("./extension-host/suite/product-surface.test.cjs", import.meta.url),
      "utf8",
    );
    const title = "preserves authored mixed-case hover identity over browser-normalized resources";
    const start = source.indexOf(`test("${title}"`);
    const end = source.indexOf("\n  test(", start + 1);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const journey = source.slice(start, end);

    expect(journey).toContain("async function()");
    expect(journey).toContain("this.timeout(600_000)");
    for (const witness of [
      "<PrOdUcT-CaRd",
      "</pRoDuCt-CaRd>",
      "DiSpLaY-HiNt",
      "item.BiNd",
      "preview.quantity | StockLabel",
    ]) {
      expect(journey).toContain(witness);
    }
    expect(journey).toContain("exactHoverMatchingAt(");
    expect(journey).toContain("mixed-case custom-element opening");
    expect(journey).toContain("mixed-case custom-element closing");
    expect(journey).toContain("mixed-case custom attribute");
    expect(journey).toContain("mixed-case binding command");
    expect(journey).toContain("wrong-case expression resources must not reuse browser-normalized identity");
    expect(journey).toContain('readFileSync(document.uri.fsPath, "utf8")');
    expect(journey).toContain('executeCommand("workbench.action.files.revert")');
    expect(journey).toContain("!document.isDirty");
    expect(journey).toContain("the mixed-case hover journey should start from a clean disk-equal template");
    expect(journey).toContain("the in-memory mixed-case journey must not mutate the fixture on disk");
    expect(journey).toContain("mixed-case hover cleanup should restore the canonical resource answer");
    expect(journey).toContain("finally {");
    expect(journey).not.toContain("this.skip");
    expect(journey).not.toContain(".save(");

    const helperStart = source.indexOf("async function exactHoverMatchingAt(");
    const helperEnd = source.indexOf("\nasync function noHoverAt(", helperStart);
    expect(helperStart).toBeGreaterThanOrEqual(0);
    expect(helperEnd).toBeGreaterThan(helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toContain("matches.length");
    expect(helper).toContain("hover.range instanceof vscode.Range");
    expect(helper).toContain("document.getText(hover.range), token");
  });

  test("keeps declaration and ambiguity host journeys sequential but independently bounded", () => {
    const source = readFileSync(
      new URL("./extension-host/suite/product-surface.test.cjs", import.meta.url),
      "utf8",
    );
    const declarationTitle = "navigates the exact Resource Discovery declaration witnesses";
    const ambiguityTitle = "adjudicates both native Resource Discovery ambiguities and open coverage";
    const declarationStart = source.indexOf(`test("${declarationTitle}"`);
    const ambiguityStart = source.indexOf(`test("${ambiguityTitle}"`);
    expect(declarationStart).toBeGreaterThanOrEqual(0);
    expect(ambiguityStart).toBeGreaterThan(declarationStart);
    expect(source.indexOf("test(", declarationStart + 1)).toBe(ambiguityStart);
    expect(source.slice(declarationStart, ambiguityStart)).toMatch(/this\.timeout\(420_000\)/u);
    const followingTestStart = source.indexOf("test(", ambiguityStart + 1);
    expect(followingTestStart).toBeGreaterThan(ambiguityStart);
    const ambiguityJourney = source.slice(ambiguityStart, followingTestStart);
    expect(ambiguityJourney).toMatch(/this\.timeout\(420_000\)/u);
    expect(ambiguityJourney).toContain('"unadmitted-plugin-app.html"');
    expect(ambiguityJourney).toContain('setTextDocumentLanguage(churnControl, "plaintext")');
    expect(ambiguityJourney).toContain('setTextDocumentLanguage(churnControl, "html")');
    expect(ambiguityJourney).toContain("unrelated ownership retry wave");
    expect(ambiguityJourney).toContain("replaceDocumentText(churnControl, churnControlChanged)");
    expect(ambiguityJourney).toContain('executeCommand("workbench.action.files.revert")');
    expect(ambiguityJourney).toContain('ambiguitySuppression.update("suppressNative", true');
    expect(ambiguityJourney).toContain('ambiguitySuppression.update("suppressNative", false');
    expect(ambiguityJourney).toContain("templateDiagnosticsSuppressNative(ambiguityUri)");
    expect(ambiguityJourney).not.toContain('ambiguitySuppression.get("suppressNative")');
    expect(ambiguityJourney).toContain(
      'restoreWorkspaceFolderSettings(ambiguitySettingsSnapshot, "ambiguity suppression cleanup")',
    );
    expect(ambiguityJourney).toContain("ambiguity settings-byte cleanup must leave effective suppression current");
    expect(ambiguityJourney).toContain("assertSingleBackgroundLanguageTransition(");
    expect(ambiguityJourney).toContain("unrelated clean HTML churn");
  });

  test("keeps disk-equal declaration disposal semantically quiet", () => {
    const source = readFileSync(
      new URL("./extension-host/suite/product-surface.test.cjs", import.meta.url),
      "utf8",
    );
    const title = "restarts active-template availability across both stale-scope F1-to-F2 mutations";
    const start = source.indexOf(`test("${title}"`);
    const end = source.indexOf("\n  test(", start + 1);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const journey = source.slice(start, end);

    expect(journey).toContain("Both declarations are restored and saved above");
    expect(journey).toContain("routedInvalidations");
    expect(journey).toContain("treePublications");
    expect(journey).toContain("must not invalidate routed semantics");
    expect(journey).toContain("must not republish retained rows");
    expect(journey).toContain("afterCleanClosePublication");
    expect(journey).toContain("publicationNodeDurableShape");
    expect(journey).not.toContain("should settle through a routed semantic invalidation");
  });

  test("keeps disk-equal declaration reopen semantically quiet before explicit recovery refresh", () => {
    const source = readFileSync(
      new URL("./extension-host/suite/product-surface.test.cjs", import.meta.url),
      "utf8",
    );
    const start = source.indexOf("async function recoverTreeNavigationWithPrimaryRetry(");
    const end = source.indexOf("\nasync function recoverAvailableNavigationWithPrimaryRetry(", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const helper = source.slice(start, end);

    expect(helper).toContain("reopenTrace");
    expect(helper).toContain("reopenInvalidations");
    expect(helper).toContain("reopenPublications");
    expect(helper).toContain("clean reopened declaration must not invalidate routed semantics");
    expect(helper).toContain("clean reopened declaration must not republish the recovered tree");
    expect(helper).toContain("newest navigation clean reopen explicit recovery refresh");
    expect(helper).not.toContain("reopened declaration should settle through its exact routed semantic invalidation");
  });

  test("settles on a current full receipt followed by serialized unChanged reuse", () => {
    const events = [
      request("full", 2),
      response("full", 2, "full", 2),
      request("reuse", 2, true),
      response("reuse", 2, "unChanged", null),
    ];

    expect(parse(events, 2, 0)).toEqual(expect.objectContaining({
      error: null,
      settlement: expect.objectContaining({
        reportKind: "full",
        itemCount: 2,
        observedAttemptCount: 2,
        observedCurrentAttemptCount: 2,
        observedCanceledAttemptCount: 0,
        observedSubsequentAttemptCount: 1,
      }),
    }));
  });

  test("admits an older-version canceled predecessor before current full and unChanged", () => {
    const events = [
      request("old", 1),
      canceled("old", 1),
      request("full", 2),
      response("full", 2, "full", 0),
      request("reuse", 2, true),
      response("reuse", 2, "unChanged", null),
    ];

    expect(parse(events, 2, 0).settlement).toEqual(expect.objectContaining({
      itemCount: 0,
      observedAttemptCount: 3,
      observedCurrentAttemptCount: 2,
      observedCanceledAttemptCount: 1,
      observedSubsequentAttemptCount: 1,
    }));
  });

  test("admits a client-canceled owner replacement before the excluded document's empty full response", () => {
    const events = [
      request("retiring-owner", 1),
      clientCanceled("retiring-owner", 1),
      request("replacement-owner", 1),
      response("replacement-owner", 1, "full", 0),
    ];

    expect(parse(events, 1, 0)).toEqual(expect.objectContaining({
      error: null,
      settlement: expect.objectContaining({
        observationId: "replacement-owner",
        reportKind: "full",
        itemCount: 0,
        resultIdPresent: true,
        observedAttemptCount: 2,
        observedCurrentAttemptCount: 2,
        observedCanceledAttemptCount: 1,
        observedSubsequentAttemptCount: 0,
      }),
    }));
  });

  test("rejects current unChanged before the required post-cursor full", () => {
    const events = [
      request("reuse", 2, true),
      response("reuse", 2, "unChanged", null),
      request("full", 2),
      response("full", 2, "full", 1),
    ];

    expect(parse(events, 2, 0)).toEqual(expect.objectContaining({
      error: expect.stringContaining("before the required current full report"),
      settlement: null,
    }));
  });

  test("keeps a current full pending across an explicit retrigger until its response", () => {
    const pendingEvents = [
      request("full", 2),
      response("full", 2, "full", 1),
      request("retrigger", 2, true),
      canceled("retrigger", 2),
    ];

    expect(parse(pendingEvents, 2, 0)).toEqual(expect.objectContaining({
      error: null,
      settlement: null,
    }));

    const settledEvents = [
      ...pendingEvents,
      request("reuse", 2, true),
      response("reuse", 2, "unChanged", null),
    ];
    expect(parse(settledEvents, 2, 0).settlement).toEqual(expect.objectContaining({
      reportKind: "full",
      observedAttemptCount: 3,
      observedCurrentAttemptCount: 3,
      observedCanceledAttemptCount: 1,
      observedSubsequentAttemptCount: 2,
    }));
  });

  test("uses the latest validated current full as the settlement receipt", () => {
    const events = [
      request("initial", 2),
      response("initial", 2, "full", 1),
      request("replacement", 2, true),
      response("replacement", 2, "full", 3),
    ];

    expect(parse(events, 2, 0).settlement).toEqual(expect.objectContaining({
      reportKind: "full",
      itemCount: 3,
      observationId: "replacement",
      observedSubsequentAttemptCount: 1,
    }));
  });

  test.each([
    ["lowercase reuse kind", request("reuse", 2, true), response("reuse", 2, "unchanged", null), "unsupported report kind"],
    ["reuse without previous id", request("reuse", 2), response("reuse", 2, "unChanged", null), "without a previous result id"],
    ["reuse with items", request("reuse", 2, true), response("reuse", 2, "unChanged", 0), "invalid unchanged report"],
    ["reuse without result id", request("reuse", 2, true), response("reuse", 2, "unChanged", null, false), "invalid unchanged report"],
  ])("rejects malformed subsequent %s", (_label, reuseRequest, reuseResponse, message) => {
    const events = [
      request("full", 2),
      response("full", 2, "full", 1),
      reuseRequest,
      reuseResponse,
    ];
    expect(parse(events, 2, 0).error).toContain(message);
  });

  test("rejects unexpected versions, overlaps, reused ids, and unauthenticated failure", () => {
    expect(parse([
      request("full", 2),
      response("full", 2, "full", 1),
      request("later", 3, true),
      response("later", 3, "full", 0),
    ], 2, 0).error).toContain("unexpected document version 3");
    expect(parse([
      request("first", 2),
      request("second", 2),
    ], 2, 0).error).toContain("overlapped");
    expect(parse([
      request("same", 2),
      response("same", 2, "full", 0),
      request("same", 2, true),
    ], 2, 0).error).toContain("reused an observation id");
    expect(parse([
      request("failed", 2),
      { ...canceled("failed", 2), errorName: "Error", serverRetriggerRequested: false },
    ], 2, 0).error).toContain("without authenticated cancellation");
  });

  test.each([
    [
      "response without cancellation state",
      { ...response("terminal", 2, "full", 1), cancellationRequested: undefined },
      "no boolean cancellation state",
    ],
    [
      "response with failure fields",
      { ...response("terminal", 2, "full", 1), serverRetriggerRequested: false },
      "failed-only terminal fields",
    ],
    [
      "failure without client cancellation state",
      { ...canceled("terminal", 2), cancellationRequested: undefined },
      "no complete boolean cancellation state",
    ],
    [
      "failure without retrigger state",
      { ...canceled("terminal", 2), serverRetriggerRequested: undefined },
      "no complete boolean cancellation state",
    ],
    [
      "failure with response fields",
      { ...canceled("terminal", 2), reportKind: "full", itemCount: 0, resultIdPresent: true },
      "response-only terminal fields",
    ],
  ])("rejects malformed terminal shape: %s", (_label, terminal, message) => {
    const events = [request("terminal", 2), terminal];
    expect(parse(events, 2, 0).error).toContain(message);
  });

  test("authenticates resource documents with path boundaries and caller-selected roots", () => {
    const primary = path.resolve("C:/workspace/hello-world");
    const routed = path.resolve("C:/workspace/routed-storefront");
    const routedApp = path.join(routed, "src", "app.ts");

    expect(admittedAuthoredRoot(routedApp, [primary, routed])).toBe(routed);
    expect(admittedAuthoredRoot(routedApp, [primary])).toBeNull();
    expect(admittedAuthoredRoot(path.join(primary, "src", "my-app.ts"), [primary])).toBe(primary);
    expect(admittedAuthoredRoot(path.join(primary, "src-sibling", "escape.ts"), [primary])).toBeNull();
  });

  test("admits only exact authenticated nested fixture paths for the selected routed root", () => {
    const primary = path.resolve("C:/workspace/hello-world");
    const routed = path.resolve("C:/workspace/routed-storefront");
    const outside = path.resolve(routed, "..", "outside", "escape.ts");
    const overlapRelativePath = "host-corpus/overlap/src/admitted-plugin-app.ts";
    const currentOnlyRelativePath = "host-corpus/page-drain/src/main.ts";
    const minimumPaths = new Set([
      overlapRelativePath,
      "../outside/escape.ts",
      outside,
    ]);
    const currentPaths = new Set([...minimumPaths, currentOnlyRelativePath]);
    const minimum = new Map([[routed, minimumPaths]]);
    const current = new Map([[routed, currentPaths]]);
    const lexicalRealPath = (filePath: string): string => path.resolve(filePath);

    expect(admittedAuthoredRoot(
      path.join(routed, ...overlapRelativePath.split("/")),
      [primary, routed],
      minimum,
      lexicalRealPath,
    )).toBe(routed);
    expect(admittedAuthoredRoot(
      path.join(primary, "src", "my-app.ts"),
      [primary],
      minimum,
      lexicalRealPath,
    )).toBe(primary);
    expect(admittedAuthoredRoot(
      path.join(routed, "host-corpus", "overlap", "src-sibling", "escape.ts"),
      [routed],
      minimum,
      lexicalRealPath,
    )).toBeNull();
    expect(admittedAuthoredRoot(outside, [routed], minimum, lexicalRealPath)).toBeNull();
    expect(admittedAuthoredRoot(
      path.resolve("C:/absolute-outside/escape.ts"),
      [routed],
      minimum,
      lexicalRealPath,
    )).toBeNull();
    expect(admittedAuthoredRoot(
      path.join(routed, "host-corpus", "overlap", "src", "unlisted.ts"),
      [routed],
      minimum,
      lexicalRealPath,
    )).toBeNull();
    expect(admittedAuthoredRoot(
      path.join(routed, ...currentOnlyRelativePath.split("/")),
      [routed],
      minimum,
      lexicalRealPath,
    )).toBeNull();
    expect(admittedAuthoredRoot(
      path.join(routed, ...currentOnlyRelativePath.split("/")),
      [routed],
      current,
      lexicalRealPath,
    )).toBe(routed);
  });

  test("derives nested admission only from exact rendered fixture file receipts", () => {
    const admitted = "host-corpus/overlap/src/admitted-plugin-app.ts";
    const metadataOnly = "host-corpus/overlap/src/witness-only.ts";
    const paths = authenticatedFixtureFilePaths({
      files: [{ relativePath: admitted }],
      projects: [{ relativeFiles: [metadataOnly] }],
      witnesses: { nested: { relativePath: metadataOnly } },
    });

    expect([...paths]).toEqual([admitted]);
    expect(paths.has(metadataOnly)).toBe(false);
  });

  test("rejects an exact lexical fixture path whose real path escapes the selected root", () => {
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), "aurelia-authored-root-"));
    try {
      const routed = path.join(temporaryRoot, "routed");
      const outside = path.join(temporaryRoot, "outside");
      const nested = path.join(routed, "host-corpus", "overlap", "src");
      mkdirSync(nested, { recursive: true });
      mkdirSync(outside, { recursive: true });
      const admitted = path.join(nested, "admitted-plugin-app.ts");
      const escaped = path.join(outside, "escaped.ts");
      writeFileSync(admitted, "export class AdmittedPluginApp {}\n", "utf8");
      writeFileSync(escaped, "export class Escaped {}\n", "utf8");
      const link = path.join(routed, "host-corpus", "escape");
      symlinkSync(outside, link, process.platform === "win32" ? "junction" : "dir");
      const authenticatedPaths = new Map([[routed, new Set([
        "host-corpus/overlap/src/admitted-plugin-app.ts",
        "host-corpus/escape/escaped.ts",
      ])]]);

      expect(admittedAuthoredRoot(admitted, [routed], authenticatedPaths, realpathSync)).toBe(routed);
      expect(admittedAuthoredRoot(
        path.join(link, "escaped.ts"),
        [routed],
        authenticatedPaths,
        realpathSync,
      )).toBeNull();
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });

  test("awaits one asynchronous workspace-folder change event and disposes its listener", async () => {
    const change = { added: ["secondary"], removed: [] };
    let listener = (_event: unknown): void => undefined;
    let disposeCount = 0;
    const workspace = {
      onDidChangeWorkspaceFolders(next: (event: unknown) => void) {
        listener = next;
        return { dispose: () => { disposeCount += 1; } };
      },
      updateWorkspaceFolders() {
        queueMicrotask(() => listener(change));
        return true;
      },
    };

    await expect(applyWorkspaceFolderUpdate(0, 0, ["secondary"], "async update", {
      workspace,
      wait: waitForInjectedPredicate,
    })).resolves.toBe(change);
    expect(disposeCount).toBe(1);
  });

  test("captures a synchronous workspace-folder change event registered before dispatch", async () => {
    const change = { added: [], removed: ["primary"] };
    let listener = (_event: unknown): void => undefined;
    let disposeCount = 0;
    const workspace = {
      onDidChangeWorkspaceFolders(next: (event: unknown) => void) {
        listener = next;
        return { dispose: () => { disposeCount += 1; } };
      },
      updateWorkspaceFolders() {
        listener(change);
        return true;
      },
    };

    await expect(applyWorkspaceFolderUpdate(0, 1, [], "sync update", {
      workspace,
      wait: waitForInjectedPredicate,
    })).resolves.toBe(change);
    expect(disposeCount).toBe(1);
  });

  test("fails closed and disposes when VS Code rejects a workspace-folder update", async () => {
    let disposeCount = 0;
    const workspace = {
      onDidChangeWorkspaceFolders() {
        return { dispose: () => { disposeCount += 1; } };
      },
      updateWorkspaceFolders() {
        return false;
      },
    };

    await expect(applyWorkspaceFolderUpdate(0, 0, [], "rejected update", {
      workspace,
      wait: waitForInjectedPredicate,
    })).rejects.toThrow(/should be admitted by VS Code/u);
    expect(disposeCount).toBe(1);
  });

  test("disposes its workspace-folder listener when the correlated event times out", async () => {
    let disposeCount = 0;
    const workspace = {
      onDidChangeWorkspaceFolders() {
        return { dispose: () => { disposeCount += 1; } };
      },
      updateWorkspaceFolders() {
        return true;
      },
    };

    await expect(applyWorkspaceFolderUpdate(0, 0, [], "timed-out update", {
      workspace,
      wait: () => Promise.reject(new Error("workspace event timed out")),
    })).rejects.toThrow(/workspace event timed out/u);
    expect(disposeCount).toBe(1);
  });

  test("atomically replaces a scrambled workspace list with the exact original order", async () => {
    const original = ["primary", "routed", "excluded", "plain"];
    const folders = ["routed", "excluded", "plain", "secondary", "primary"];
    let listener = (_event: unknown): void => undefined;
    const workspace = {
      onDidChangeWorkspaceFolders(next: (event: unknown) => void) {
        listener = next;
        return { dispose: () => undefined };
      },
      updateWorkspaceFolders(start: number, deleteCount: number, ...additions: readonly unknown[]) {
        folders.splice(start, deleteCount, ...additions.map(String));
        listener({ added: original, removed: ["secondary"] });
        return true;
      },
    };

    await applyWorkspaceFolderUpdate(0, folders.length, original, "atomic restore", {
      workspace,
      wait: waitForInjectedPredicate,
    });
    expect(folders).toEqual(original);
  });

  test("closes every exact URI tab as one lifecycle without trusting the active editor", async () => {
    const document = (key: string): HostDocument => ({ uri: { toString: () => key } });
    const tab = (key: string): HostTab => ({ input: { uri: { toString: () => key } } });
    const target = document("file:///workspace/left/duplicate-card.ts");
    const unrelated = document("file:///workspace/overlap/src/shared-plugin-app.ts");
    const targetTabs = [tab(target.uri.toString()), tab(target.uri.toString())];
    const unrelatedTab = tab(unrelated.uri.toString());
    const groups = [
      { tabs: [targetTabs[0]!] },
      { tabs: [unrelatedTab, targetTabs[1]!] },
    ];
    const textDocuments = [target, unrelated];
    const order: string[] = [];
    let closeListener = (_document: HostDocument): void => undefined;
    let disposeCount = 0;
    let closeRequest: readonly HostTab[] | null = null;
    const workspace = {
      textDocuments,
      onDidCloseTextDocument(listener: (closed: HostDocument) => void) {
        order.push("listen");
        closeListener = listener;
        return { dispose: () => { disposeCount += 1; order.push("dispose"); } };
      },
    };
    const window = {
      tabGroups: {
        all: groups,
        activeTabGroup: { activeTab: unrelatedTab },
        async close(closing: readonly HostTab[], preserveFocus?: boolean) {
          order.push("close");
          expect(preserveFocus).toBe(true);
          expect(window.tabGroups.activeTabGroup.activeTab).toBe(unrelatedTab);
          closeRequest = closing;
          for (const group of groups) {
            for (let index = group.tabs.length - 1; index >= 0; index -= 1) {
              if (closing.includes(group.tabs[index]!)) group.tabs.splice(index, 1);
            }
          }
          textDocuments.splice(textDocuments.indexOf(target), 1);
          closeListener(target);
          order.push("event");
          return true;
        },
      },
    };

    await expect(closeTextDocumentWithNativeEditor(
      target,
      "injected exact-tab cleanup",
      {
        workspace,
        window,
        wait: async (predicate) => {
          expect(predicate()).toBe(true);
          order.push("wait");
        },
      },
    )).resolves.toBe(target.uri.toString());

    expect(closeRequest).toEqual(targetTabs);
    expect(closeRequest).not.toContain(unrelatedTab);
    expect(groups.flatMap((group) => group.tabs)).toEqual([unrelatedTab]);
    expect(textDocuments).toEqual([unrelated]);
    expect(order).toEqual(["listen", "close", "event", "wait", "dispose"]);
    expect(disposeCount).toBe(1);
  });

  test("fails closed when the open document has no exact text tab", async () => {
    const target: HostDocument = { uri: { toString: () => "file:///workspace/left/duplicate-card.ts" } };
    let closeCount = 0;
    const workspace = {
      textDocuments: [target],
      onDidCloseTextDocument() {
        return { dispose: () => undefined };
      },
    };
    const window = {
      tabGroups: {
        all: [{ tabs: [{ input: { uri: { toString: () => "file:///workspace/unrelated.ts" } } }] }],
        close() {
          closeCount += 1;
          return Promise.resolve(true);
        },
      },
    };

    await expect(closeTextDocumentWithNativeEditor(target, "injected missing-tab cleanup", {
      workspace,
      window,
      wait: waitForInjectedPredicate,
    })).rejects.toThrow(/must have at least one exact text tab/u);
    expect(closeCount).toBe(0);
  });

  test("fails closed when one exact tab is ambiguously present in multiple groups", async () => {
    const key = "file:///workspace/left/duplicate-card.ts";
    const target: HostDocument = { uri: { toString: () => key } };
    const exactTab: HostTab = { input: { uri: { toString: () => key } } };
    let closeCount = 0;
    const workspace = {
      textDocuments: [target],
      onDidCloseTextDocument() {
        return { dispose: () => undefined };
      },
    };
    const window = {
      tabGroups: {
        all: [{ tabs: [exactTab] }, { tabs: [exactTab] }],
        close() {
          closeCount += 1;
          return Promise.resolve(true);
        },
      },
    };

    await expect(closeTextDocumentWithNativeEditor(target, "injected ambiguous-tab cleanup", {
      workspace,
      window,
      wait: waitForInjectedPredicate,
    })).rejects.toThrow(/is ambiguous across VS Code tab groups/u);
    expect(closeCount).toBe(0);
  });

  test("fails closed and disposes its listener when VS Code rejects the exact tab close", async () => {
    const key = "file:///workspace/left/duplicate-card.ts";
    const target: HostDocument = { uri: { toString: () => key } };
    const exactTab: HostTab = { input: { uri: { toString: () => key } } };
    let disposeCount = 0;
    let waitCount = 0;
    const workspace = {
      textDocuments: [target],
      onDidCloseTextDocument() {
        return { dispose: () => { disposeCount += 1; } };
      },
    };
    const window = {
      tabGroups: {
        all: [{ tabs: [exactTab] }],
        close(closing: readonly HostTab[], preserveFocus?: boolean) {
          expect(closing).toEqual([exactTab]);
          expect(preserveFocus).toBe(true);
          return Promise.resolve(false);
        },
      },
    };

    await expect(closeTextDocumentWithNativeEditor(target, "injected rejected-tab cleanup", {
      workspace,
      window,
      wait: () => {
        waitCount += 1;
        return Promise.resolve();
      },
    })).rejects.toThrow(/must be admitted by VS Code/u);
    expect(disposeCount).toBe(1);
    expect(waitCount).toBe(0);
  });

  test("accepts exact public document and editor absence when VS Code omits the close receipt", async () => {
    const key = "file:///workspace/left/duplicate-card.ts";
    const target: HostDocument = { uri: { toString: () => key } };
    const exactTab: HostTab = { input: { uri: { toString: () => key } } };
    const textDocuments = [target];
    const groups = [{ tabs: [exactTab] }];
    const order: string[] = [];
    const workspace = {
      textDocuments,
      onDidCloseTextDocument() {
        order.push("listen");
        return { dispose: () => { order.push("dispose"); } };
      },
    };
    const window = {
      tabGroups: {
        all: groups,
        close() {
          order.push("close");
          groups[0]!.tabs.splice(0, 1);
          textDocuments.splice(0, 1);
          return Promise.resolve(true);
        },
      },
    };

    await expect(closeTextDocumentWithNativeEditor(target, "injected silent-tab cleanup", {
      workspace,
      window,
      wait: async (predicate) => {
        order.push("wait");
        expect(predicate()).toBe(true);
      },
    })).resolves.toBe(key);
    expect(order).toEqual(["listen", "close", "wait", "dispose"]);
  });

  test("accepts an exact editor close when VS Code retains the document open but hidden", async () => {
    const key = "file:///workspace/left/duplicate-card.ts";
    const target: HostDocument = { uri: { toString: () => key } };
    const exactTab: HostTab = { input: { uri: { toString: () => key } } };
    const groups = [{ tabs: [exactTab] }];
    let disposeCount = 0;
    const workspace = {
      textDocuments: [target],
      onDidCloseTextDocument() {
        return { dispose: () => { disposeCount += 1; } };
      },
    };
    const window = {
      visibleTextEditors: [{ document: target }],
      tabGroups: {
        all: groups,
        close() {
          groups[0]!.tabs.splice(0, 1);
          window.visibleTextEditors.splice(0, 1);
          return Promise.resolve(true);
        },
      },
    };

    await expect(closeTextDocumentWithNativeEditor(target, "injected retained-document cleanup", {
      workspace,
      window,
      wait: async (predicate) => { expect(predicate()).toBe(true); },
    })).resolves.toBe(key);
    expect(workspace.textDocuments).toEqual([target]);
    expect(window.visibleTextEditors).toEqual([]);
    expect(disposeCount).toBe(1);
  });

  test("rejects an admitted close that leaves an exact target tab open", async () => {
    const key = "file:///workspace/left/duplicate-card.ts";
    const target: HostDocument = { uri: { toString: () => key } };
    const targetTabs: HostTab[] = [
      { input: { uri: { toString: () => key } } },
      { input: { uri: { toString: () => key } } },
    ];
    const textDocuments = [target];
    const groups = [{ tabs: [...targetTabs] }];
    let closeListener = (_document: HostDocument): void => undefined;
    let disposeCount = 0;
    const workspace = {
      textDocuments,
      onDidCloseTextDocument(listener: (closed: HostDocument) => void) {
        closeListener = listener;
        return { dispose: () => { disposeCount += 1; } };
      },
    };
    const window = {
      tabGroups: {
        all: groups,
        close(closing: readonly HostTab[]) {
          expect(closing).toEqual(targetTabs);
          groups[0]!.tabs.splice(0, 1);
          textDocuments.splice(0, 1);
          closeListener(target);
          return Promise.resolve(true);
        },
      },
    };

    await expect(closeTextDocumentWithNativeEditor(target, "injected partial-tab cleanup", {
      workspace,
      window,
      wait: async (predicate) => { expect(predicate()).toBe(true); },
    })).rejects.toThrow(/must have no remaining exact text tabs/u);
    expect(groups[0]!.tabs).toEqual([targetTabs[1]]);
    expect(disposeCount).toBe(1);
  });

  test("rejects duplicate matching document-close receipts for one exact tab close", async () => {
    const key = "file:///workspace/left/duplicate-card.ts";
    const target: HostDocument = { uri: { toString: () => key } };
    const exactTab: HostTab = { input: { uri: { toString: () => key } } };
    const textDocuments = [target];
    const groups = [{ tabs: [exactTab] }];
    let closeListener = (_document: HostDocument): void => undefined;
    let disposeCount = 0;
    const workspace = {
      textDocuments,
      onDidCloseTextDocument(listener: (closed: HostDocument) => void) {
        closeListener = listener;
        return { dispose: () => { disposeCount += 1; } };
      },
    };
    const window = {
      tabGroups: {
        all: groups,
        close() {
          groups[0]!.tabs.splice(0, 1);
          textDocuments.splice(0, 1);
          closeListener(target);
          closeListener(target);
          return Promise.resolve(true);
        },
      },
    };

    await expect(closeTextDocumentWithNativeEditor(target, "injected duplicate-receipt cleanup", {
      workspace,
      window,
      wait: async (predicate) => { expect(predicate()).toBe(true); },
    })).rejects.toThrow(/may correlate at most one native close event/u);
    expect(disposeCount).toBe(1);
  });

  test("rejects a clean current publication after an issue-bearing generation is superseded", () => {
    const clean = currentPublicationFrame("resource-explorer:1", 42, [
      projectPublicationNode("resource-explorer:1", 42, "host-beta", "resourceProject"),
    ]);
    const observations: HostObservation[] = [
      hostObservation("resource-discovery-host-control", "c2-partial-host-beta", "fault-applied"),
      projectPublicationNode("resource-explorer:1", 41, "host-beta", "resourceProjectIssue"),
      {
        ...hostObservation("resource-explorer", "resource-explorer:1", "discarded"),
        generation: 41,
        currentGeneration: 42,
        reason: "superseded",
      },
      ...clean.observations,
    ];

    expect(publicationContainsProjectIssue(observations, clean.publication, "host-beta")).toBe(false);
  });

  test("accepts only the correlated current publication containing the intended project issue", () => {
    const frame = currentPublicationFrame("resource-explorer:1", 43, [
      projectPublicationNode("resource-explorer:1", 43, "host-alpha", "resourceProjectIssue"),
      projectPublicationNode("resource-explorer:1", 43, "host-beta", "resourceProjectIssue"),
    ]);
    const observations: HostObservation[] = [
      projectPublicationNode("resource-explorer:other", 43, "host-beta", "resourceProjectIssue"),
      projectPublicationNode("resource-explorer:1", 42, "host-beta", "resourceProjectIssue"),
      ...frame.observations,
    ];

    expect(publicationContainsProjectIssue(observations, frame.publication, "host-beta")).toBe(true);
  });

  test("rejects a clean aggregate successor after the controlled all-error generation is discarded", () => {
    const expectedNodeIds = [
      "tree-node:primary",
      "tree-node:host-alpha",
      "tree-node:host-beta",
      "tree-node:host-guardrail",
      "tree-node:host-open",
    ];
    const clean = currentPublicationFrame("resource-explorer:aggregate", 42, [
      projectPublicationNode(
        "resource-explorer:aggregate",
        42,
        "primary",
        "resourceProject",
        "tree-node:primary",
      ),
      projectPublicationNode(
        "resource-explorer:aggregate",
        42,
        "host-alpha",
        "resourceProject",
        "tree-node:host-alpha",
      ),
      projectPublicationNode(
        "resource-explorer:aggregate",
        42,
        "host-beta",
        "resourceProject",
        "tree-node:host-beta",
      ),
      projectPublicationNode(
        "resource-explorer:aggregate",
        42,
        "host-guardrail",
        "resourceProjectIssue",
        "tree-node:host-guardrail",
      ),
      projectPublicationNode(
        "resource-explorer:aggregate",
        42,
        "host-open",
        "resourceProjectIssue",
        "tree-node:host-open",
      ),
    ]);
    const observations: HostObservation[] = [
      hostObservation("resource-discovery-host-control", "c2-total-workspaces", "fault-applied"),
      ...expectedNodeIds.map((nodeId) => projectPublicationNode(
        "resource-explorer:aggregate",
        41,
        nodeId.slice("tree-node:".length),
        "resourceProjectIssue",
        nodeId,
      )),
      {
        ...hostObservation("resource-explorer", "resource-explorer:aggregate", "discarded"),
        generation: 41,
        currentGeneration: 42,
        reason: "superseded",
      },
      ...clean.observations,
    ];

    expect(publicationHasExactProjectIssueNodeIds(
      observations,
      clean.publication,
      expectedNodeIds,
    )).toBe(false);
  });

  test("accepts only one exact correlated aggregate project-issue generation", () => {
    const expectedNodeIds = [
      "tree-node:primary",
      "tree-node:host-alpha",
      "tree-node:host-beta",
      "tree-node:host-guardrail",
      "tree-node:host-open",
    ];
    const sourceNodes = expectedNodeIds.map((nodeId) => projectPublicationNode(
      "resource-explorer:aggregate",
      43,
      nodeId.slice("tree-node:".length),
      "resourceProjectIssue",
      nodeId,
    ));
    const frame = currentPublicationFrame("resource-explorer:aggregate", 43, sourceNodes);
    const observations = [
      projectPublicationNode(
        "resource-explorer:other",
        43,
        "primary",
        "resourceProjectIssue",
        "tree-node:primary",
      ),
      projectPublicationNode(
        "resource-explorer:aggregate",
        44,
        "primary",
        "resourceProjectIssue",
        "tree-node:primary",
      ),
      ...frame.observations,
    ];

    expect(publicationHasExactProjectIssueNodeIds(
      observations,
      frame.publication,
      expectedNodeIds,
    )).toBe(true);
    expect(publicationHasExactProjectIssueNodeIds(
      observations.filter((event) => event !== frame.nodes[0]),
      frame.publication,
      expectedNodeIds,
    )).toBe(false);
    const extra = currentPublicationFrame("resource-explorer:aggregate", 43, [
      ...sourceNodes,
      projectPublicationNode(
        "resource-explorer:aggregate",
        43,
        "extra",
        "resourceProjectIssue",
        "tree-node:extra",
      ),
    ]);
    expect(publicationHasExactProjectIssueNodeIds(
      extra.observations,
      extra.publication,
      expectedNodeIds,
    )).toBe(false);
    const duplicateId = currentPublicationFrame("resource-explorer:aggregate", 43, [
      sourceNodes[0]!,
      { ...sourceNodes[1]!, nodeId: sourceNodes[0]!.nodeId },
      ...sourceNodes.slice(2),
    ]);
    expect(publicationHasExactProjectIssueNodeIds(
      duplicateId.observations,
      duplicateId.publication,
      expectedNodeIds,
    )).toBe(false);
    expect(publicationHasExactProjectIssueNodeIds(
      observations,
      { ...frame.publication, observationId: "resource-explorer:other" },
      expectedNodeIds,
    )).toBe(false);
    expect(publicationHasExactProjectIssueNodeIds(
      observations,
      { ...frame.publication, generation: 44 },
      expectedNodeIds,
    )).toBe(false);
  });

  test("rejects nodes and completions not uniquely bound to the supplied publication frame", () => {
    const expectedNodeIds = [
      "tree-node:primary",
      "tree-node:host-alpha",
      "tree-node:host-beta",
      "tree-node:host-guardrail",
      "tree-node:host-open",
    ];
    const frame = currentPublicationFrame(
      "resource-explorer:aggregate",
      43,
      expectedNodeIds.map((nodeId) => projectPublicationNode(
        "resource-explorer:aggregate",
        43,
        nodeId.slice("tree-node:".length),
        "resourceProjectIssue",
        nodeId,
      )),
    );
    expect(publicationHasExactProjectIssueNodeIds(
      [frame.start, frame.publication, ...frame.nodes],
      frame.publication,
      expectedNodeIds,
    )).toBe(false);
    expect(publicationHasExactProjectIssueNodeIds(
      [...frame.observations, frame.publication],
      frame.publication,
      expectedNodeIds,
    )).toBe(false);
    expect(publicationHasExactProjectIssueNodeIds(
      [...frame.observations, { ...frame.publication }],
      frame.publication,
      expectedNodeIds,
    )).toBe(false);
    expect(publicationHasExactProjectIssueNodeIds(
      frame.observations,
      { ...frame.publication },
      expectedNodeIds,
    )).toBe(false);
    expect(publicationHasExactProjectIssueNodeIds(
      [frame.start, ...frame.nodes.slice(0, 2), frame.publication, ...frame.nodes.slice(2)],
      frame.publication,
      expectedNodeIds,
    )).toBe(false);
  });

  test("keeps baseline and predecessor evidence schemas exact", () => {
    const baseline = Object.fromEntries(baselineTreeFactKeys.map((key) => [key, null]));
    const predecessor = Object.fromEntries(predecessorRaceFactKeys.map((key) => [key, null]));
    expect(() => assertExactFactKeys(baseline, baselineTreeFactKeys, "baseline")).not.toThrow();
    expect(() => assertExactFactKeys(predecessor, predecessorRaceFactKeys, "predecessor")).not.toThrow();
    expect(() => assertExactFactKeys(
      { ...baseline, loadingState: null },
      baselineTreeFactKeys,
      "baseline",
    )).toThrow(/keys changed/u);
    const { pendingTreePublicationCount: _omitted, ...missingPublication } = predecessor;
    expect(() => assertExactFactKeys(
      missingPublication,
      predecessorRaceFactKeys,
      "predecessor",
    )).toThrow(/keys changed/u);
    const { pendingInvalidated: _missingInvalidation, ...missingUpdatingInvalidation } = predecessor;
    expect(() => assertExactFactKeys(
      missingUpdatingInvalidation,
      predecessorRaceFactKeys,
      "predecessor",
    )).toThrow(/keys changed/u);
    expect(() => assertExactFactKeys(
      { ...predecessor, forged: null },
      predecessorRaceFactKeys,
      "predecessor",
    )).toThrow(/keys changed/u);
  });

  test("authenticates a scoped pending refresh without transient tree publication", () => {
    const evidence = scopedStablePendingEvidence();
    expect(assertScopedStablePendingEvidence(evidence)).toEqual({
      pendingTreePublicationCount: 0,
      pendingViewStateCount: 0,
    });

    const invalidatedWrongWorkspace = {
      ...evidence.invalidated,
      workspaceKey: "file:///workspace/forged",
    };
    expect(() => assertScopedStablePendingEvidence({
      ...evidence,
      observations: evidence.observations.map((event) =>
        event === evidence.invalidated ? invalidatedWrongWorkspace : event),
      invalidated: invalidatedWrongWorkspace,
    })).toThrow(/invalidation workspace/u);
    const blockedWrongControl = {
      ...evidence.blocked,
      observationId: "c2-tree-forged",
    };
    expect(() => assertScopedStablePendingEvidence({
      ...evidence,
      observations: evidence.observations.map((event) =>
        event === evidence.blocked ? blockedWrongControl : event),
      blocked: blockedWrongControl,
    })).toThrow(/barrier control id/u);
    const blockedWrongStage = { ...evidence.blocked, stage: "before-request" };
    expect(() => assertScopedStablePendingEvidence({
      ...evidence,
      observations: evidence.observations.map((event) =>
        event === evidence.blocked ? blockedWrongStage : event),
      blocked: blockedWrongStage,
    })).toThrow(/barrier stage/u);

    for (const transient of [
      hostObservation("resource-explorer", "resource-explorer:pending", "publish-start"),
      hostObservation("resource-explorer", "resource-explorer:pending", "publish-node"),
      hostObservation("resource-explorer", "resource-explorer:pending", "publish-complete"),
    ]) {
      expect(() => assertScopedStablePendingEvidence({
        ...evidence,
        observations: [evidence.invalidated, transient, evidence.progress, evidence.blocked],
      })).toThrow(/must not republish retained tree rows/u);
    }
    expect(() => assertScopedStablePendingEvidence({
      ...evidence,
      observations: [
        evidence.invalidated,
        hostObservation("resource-explorer", "resource-explorer:pending", "view-state"),
        evidence.progress,
        evidence.blocked,
      ],
    })).toThrow(/must not insert transient view-state copy/u);
    expect(() => assertScopedStablePendingEvidence({
      ...evidence,
      observations: [evidence.blocked, evidence.progress, evidence.invalidated],
    })).toThrow(/must order invalidation < barrier/u);
    expect(() => assertScopedStablePendingEvidence({
      ...evidence,
      invalidated: { ...evidence.invalidated },
    })).toThrow(/occur exactly once/u);
  });

  test("separates durable node shape from scoped epoch-token coherence", () => {
    const workspaceA = "workspace:a";
    const workspaceB = "workspace:b";
    const oldNode = scopedPublicationNode("target", workspaceA, "epoch:old", "epoch:old");
    const currentNode = scopedPublicationNode("target", workspaceA, "epoch:new", "epoch:new");
    expect(publicationNodeDurableShape(currentNode)).toEqual(publicationNodeDurableShape(oldNode));
    const publication = {
      ...currentPublication("resource-explorer:scoped", 52, 2, 2),
      workspaceIdentity: workspaceA,
      fingerprint: "epoch:new",
      nodeCount: 2,
    };
    const unrelated = scopedPublicationNode("unrelated", workspaceB, "epoch:b", null);
    expect(() => assertScopedPublicationFingerprintCoherence(
      publication,
      [currentNode, unrelated],
      "recovered",
    )).not.toThrow();

    for (const changed of [
      { ...currentNode, navigationFingerprint: "epoch:old" },
      { ...currentNode, navigationFingerprint: null },
      { ...currentNode, implementationFingerprint: "epoch:old" },
      { ...currentNode, implementationFingerprint: null },
    ]) {
      expect(() => assertScopedPublicationFingerprintCoherence(
        publication,
        [changed, unrelated],
        "recovered",
      )).toThrow();
    }
    expect(publicationNodeDurableShape({ ...currentNode, label: "changed" }))
      .not.toEqual(publicationNodeDurableShape(oldNode));
  });

  test("requires final serial recovery rows to carry each workspace's latest token", () => {
    const nodes = [
      scopedPublicationNode("a", "workspace:a", "epoch:a:new", "epoch:a:new"),
      scopedPublicationNode("b", "workspace:b", "epoch:b:new", null),
    ];
    const recoveries = [
      { workspaceIdentity: "workspace:a", fingerprint: "epoch:a:new" },
      { workspaceIdentity: "workspace:b", fingerprint: "epoch:b:new" },
    ];
    expect(() => assertFinalRecoveredWorkspaceFingerprints(nodes, recoveries, "final")).not.toThrow();
    expect(() => assertFinalRecoveredWorkspaceFingerprints(
      [{ ...nodes[0], implementationFingerprint: "epoch:a:old" }, nodes[1]],
      recoveries,
      "final",
    )).toThrow(/latest fingerprint/u);
    expect(() => assertFinalRecoveredWorkspaceFingerprints(nodes, [
      recoveries[0],
      { workspaceIdentity: "workspace:b", fingerprint: "epoch:b:old" },
    ], "final")).toThrow(/latest fingerprint/u);
  });

  test("cycles away and back when the requested Quick Pick row is already active", async () => {
    const model = quickPickModel(2);
    const events: QuickPickEvent[] = [modelReadyQuickPickEvent(1), activeQuickPickEvent(1, 0)];
    const previousOrdinals = [0, 1];
    const nextOrdinals = [1, 0];
    let dispatchCount = 0;
    const active = await driveNativeQuickPickOrdinal({
      command: "aurelia.goToAvailableResource",
      flowStart: 0,
      model,
      targetOrdinal: 0,
      observations: () => events,
      dispatchSelectNext: () => {
        events.push(activeQuickPickEvent(1, previousOrdinals[dispatchCount]!));
        events.push({ ...activeQuickPickEvent(1, 1), observationId: "quick-pick:stale" });
        events.push(activeQuickPickEvent(99, 1));
        events.push(activeQuickPickEvent(1, nextOrdinals[dispatchCount++]));
        return Promise.resolve();
      },
      waitForActive: async (start, predicate) => await waitForInjectedReceipt(events, start, predicate),
    });

    expect(active.itemOrdinal).toBe(0);
    expect(dispatchCount).toBe(2);
  });

  test("authenticates delayed native default activation before cycling away and back", async () => {
    const model = quickPickModel(2);
    const events: QuickPickEvent[] = [modelReadyQuickPickEvent(1)];
    const nextOrdinals = [1, 0];
    let dispatchCount = 0;
    const defaultActivation = Promise.resolve().then(() => {
      events.push({ ...activeQuickPickEvent(1, 1), observationId: "quick-pick:stale" });
      events.push(activeQuickPickEvent(99, 1));
      events.push(activeQuickPickEvent(1, 0));
    });
    const active = await driveNativeQuickPickOrdinal({
      command: "aurelia.goToAvailableResource",
      flowStart: 0,
      model,
      targetOrdinal: 0,
      observations: () => events,
      dispatchSelectNext: async () => {
        dispatchCount += 1;
        await defaultActivation;
        events.push(activeQuickPickEvent(1, nextOrdinals[dispatchCount - 1]!));
      },
      waitForActive: async (start, predicate) => await waitForInjectedReceipt(events, start, predicate),
    });

    expect(active.itemOrdinal).toBe(0);
    expect(dispatchCount).toBe(2);
    expect(events.filter((event) => event.observationId === "quick-pick:1"
      && event.phase === "active-changed"
      && event.modelOrdinal === 1).map((event) => event.itemOrdinal)).toEqual([0, 1, 0]);
  });

  test("rejects a correlated Select Next jump that skips the expected native ordinal", async () => {
    const model = quickPickModel(3);
    const events: QuickPickEvent[] = [modelReadyQuickPickEvent(1), activeQuickPickEvent(1, 0)];
    let dispatchCount = 0;

    await expect(driveNativeQuickPickOrdinal({
      command: "aurelia.goToAvailableResource",
      flowStart: 0,
      model,
      targetOrdinal: 2,
      observations: () => events,
      dispatchSelectNext: () => {
        dispatchCount += 1;
        events.push(activeQuickPickEvent(1, 2));
        return Promise.resolve();
      },
      waitForActive: async (start, predicate) => await waitForInjectedReceipt(events, start, predicate),
    })).rejects.toThrow(/Select Next activated ordinal 2; expected 1 after 0/u);
    expect(dispatchCount).toBe(1);
  });

  test("awaits each Select Next dispatch before issuing the next native cycle", async () => {
    const model = quickPickModel(3);
    const events: QuickPickEvent[] = [modelReadyQuickPickEvent(1), activeQuickPickEvent(1, 0)];
    let releaseFirst = (): void => undefined;
    const firstDispatch = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let dispatchCount = 0;
    const driving = driveNativeQuickPickOrdinal({
      command: "aurelia.goToAvailableResource",
      flowStart: 0,
      model,
      targetOrdinal: 2,
      observations: () => events,
      dispatchSelectNext: async () => {
        dispatchCount += 1;
        events.push(activeQuickPickEvent(1, dispatchCount));
        if (dispatchCount === 1) await firstDispatch;
      },
      waitForActive: async (start, predicate) => await waitForInjectedReceipt(events, start, predicate),
    });

    await Promise.resolve();
    expect(dispatchCount).toBe(1);
    releaseFirst();
    await expect(driving).resolves.toEqual(expect.objectContaining({ itemOrdinal: 2 }));
    expect(dispatchCount).toBe(2);
  });

  test("rejects a wrong accepted ordinal and closes the native Quick Pick", async () => {
    const model = quickPickModel(2);
    const events: QuickPickEvent[] = [modelReadyQuickPickEvent(1), activeQuickPickEvent(1, 0)];
    let closed = false;
    await expect(acceptNativeQuickPickOrdinal({
      command: "aurelia.goToAvailableResource",
      flowStart: 0,
      model,
      targetOrdinal: 0,
      observations: () => events,
      dispatchAccept: () => {
        events.push(acceptQuickPickEvent(1, 1, "item-1"));
        return Promise.resolve();
      },
      waitForAccept: async (start, predicate) => await waitForInjectedReceipt(events, start, predicate),
      closeQuickPick: () => { closed = true; return Promise.resolve(); },
      waitForSettlement: () => Promise.resolve(),
      delay: () => Promise.resolve(),
    })).rejects.toThrow(/accepted ordinal 1; expected 0/u);
    expect(closed).toBe(true);
  });

  test("rejects a correct accepted ordinal with the wrong label and closes the native Quick Pick", async () => {
    const model = quickPickModel(2);
    const events: QuickPickEvent[] = [modelReadyQuickPickEvent(1), activeQuickPickEvent(1, 0)];
    let closed = false;
    await expect(acceptNativeQuickPickOrdinal({
      command: "aurelia.goToAvailableResource",
      flowStart: 0,
      model,
      targetOrdinal: 0,
      observations: () => events,
      dispatchAccept: () => {
        events.push(acceptQuickPickEvent(1, 0, "wrong-label"));
        return Promise.resolve();
      },
      waitForAccept: async (start, predicate) => await waitForInjectedReceipt(events, start, predicate),
      closeQuickPick: () => { closed = true; return Promise.resolve(); },
      waitForSettlement: () => Promise.resolve(),
      delay: () => Promise.resolve(),
    })).rejects.toThrow(/accepted label wrong-label; expected item-0/u);
    expect(closed).toBe(true);
  });

  test("closes without accepting when the latest correlated native row is not the target", async () => {
    const model = quickPickModel(2);
    const events: QuickPickEvent[] = [
      modelReadyQuickPickEvent(1),
      activeQuickPickEvent(1, 0),
      { ...activeQuickPickEvent(1, 0), observationId: "quick-pick:stale" },
      activeQuickPickEvent(99, 0),
      activeQuickPickEvent(1, 1),
    ];
    let dispatchCount = 0;
    let closed = false;
    await expect(acceptNativeQuickPickOrdinal({
      command: "aurelia.goToAvailableResource",
      flowStart: 0,
      model,
      targetOrdinal: 0,
      observations: () => events,
      dispatchAccept: () => { dispatchCount += 1; return Promise.resolve(); },
      waitForAccept: async (start, predicate) => await waitForInjectedReceipt(events, start, predicate),
      closeQuickPick: () => { closed = true; return Promise.resolve(); },
      waitForSettlement: () => Promise.resolve(),
      delay: () => Promise.resolve(),
    })).rejects.toThrow(/latest active ordinal 1; expected 0 before accept/u);
    expect(dispatchCount).toBe(0);
    expect(closed).toBe(true);
  });

  test("closes and reports the full correlated trace after an acceptance timeout", async () => {
    const model = quickPickModel(2);
    const events: QuickPickEvent[] = [
      modelReadyQuickPickEvent(1),
      activeQuickPickEvent(1, 0),
    ];
    let closed = false;
    await expect(acceptNativeQuickPickOrdinal({
      command: "aurelia.goToAvailableResource",
      flowStart: 0,
      model,
      targetOrdinal: 0,
      observations: () => events,
      dispatchAccept: () => Promise.resolve(),
      waitForAccept: () => Promise.reject(new Error("accept timed out")),
      closeQuickPick: () => { closed = true; return Promise.resolve(); },
      waitForSettlement: () => Promise.reject(new Error("still running")),
      delay: () => Promise.resolve(),
    })).rejects.toThrow(/settlement=still-running-after-5000ms; correlatedTrace=.*active-changed/u);
    expect(closed).toBe(true);
  });
});

async function waitForInjectedPredicate(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error("Injected predicate did not settle.");
}

async function waitForInjectedReceipt(
  events: readonly QuickPickEvent[],
  start: number,
  predicate: (event: QuickPickEvent) => boolean,
): Promise<QuickPickEvent> {
  let receipt: QuickPickEvent | undefined;
  await waitForInjectedPredicate(() => {
    receipt = events.slice(start).find(predicate);
    return receipt != null;
  });
  if (receipt == null) throw new Error("Injected receipt did not settle.");
  return receipt;
}

function quickPickModel(itemCount: number): QuickPickModel {
  return {
    ready: { observationId: "quick-pick:1", modelOrdinal: 1 },
    items: Array.from({ length: itemCount }, (_value, itemOrdinal) => ({
      itemKind: "item",
      itemOrdinal,
      label: `item-${itemOrdinal}`,
    })),
  };
}

function modelReadyQuickPickEvent(modelOrdinal: number): QuickPickEvent {
  return {
    source: "resource-quick-pick",
    observationId: "quick-pick:1",
    phase: "model-ready",
    modelOrdinal,
  };
}

function activeQuickPickEvent(modelOrdinal: number, itemOrdinal: number): QuickPickEvent {
  return {
    source: "resource-quick-pick",
    observationId: "quick-pick:1",
    phase: "active-changed",
    modelOrdinal,
    itemOrdinal,
  };
}

function acceptQuickPickEvent(modelOrdinal: number, itemOrdinal: number, selectedLabel: string): QuickPickEvent {
  return {
    source: "resource-quick-pick",
    observationId: "quick-pick:1",
    phase: "accept",
    modelOrdinal,
    itemOrdinal,
    selectedLabel,
  };
}

function scopedPublicationNode(
  nodeId: string,
  workspaceIdentity: string,
  navigationFingerprint: string,
  implementationFingerprint: string | null,
): HostObservation {
  return {
    ...hostObservation("resource-explorer", "resource-explorer:scoped", "publish-node"),
    generation: 52,
    publicationKind: "current",
    ordinal: 0,
    parentId: null,
    nodeId,
    nodeKind: "resource",
    label: nodeId,
    description: "resource",
    accessibilityLabel: `Resource ${nodeId}`,
    contextValue: "resource",
    command: "aurelia.openResourceDeclaration",
    navigationWorkspaceIdentity: workspaceIdentity,
    navigationProjectKey: "app",
    navigationFingerprint,
    navigationResourceIdentity: `resource:${nodeId}`,
    navigationChildIdentity: null,
    navigationRole: "resource",
    navigationPlacement: "preview",
    implementationAvailable: implementationFingerprint != null,
    implementationWorkspaceIdentity: implementationFingerprint == null ? null : workspaceIdentity,
    implementationProjectKey: implementationFingerprint == null ? null : "app",
    implementationFingerprint,
    implementationResourceIdentity: implementationFingerprint == null ? null : `resource:${nodeId}`,
    implementationRole: implementationFingerprint == null ? null : "implementation",
    implementationPlacement: implementationFingerprint == null ? null : "preview",
    collapsible: false,
    defaultExpanded: false,
    rowStates: "",
    answerResult: "answered",
    answerCoverage: "complete",
    answerRowCount: 1,
  };
}

function scopedStablePendingEvidence() {
  const workspaceKey = "file:///workspace/routed";
  const barrierControlId = "c2-tree-predecessor";
  const invalidated = {
    ...hostObservation("resource-explorer-view", "resource-explorer-view:invalidated", "invalidation"),
    scope: "workspace",
    workspaceKey,
  };
  const progress = hostObservation("resource-explorer-view", "resource-explorer-view:progress", "progress");
  const blocked = {
    ...hostObservation("resource-discovery-host-control", barrierControlId, "blocked"),
    operation: "inventory",
    stage: "after-response",
    requestOrdinal: 7,
    workspaceKey,
    includeTypeSurfaces: true,
    responseFingerprint: "semantic-runtime:routed-response",
  };
  return {
    observations: [invalidated, progress, blocked],
    invalidated,
    progress,
    blocked,
    barrierControlId,
    blockedWorkspaceKey: workspaceKey,
    label: "scoped pending",
  };
}

function hostObservation(source: string, observationId: string, phase: string): HostObservation {
  return { source, observationId, phase };
}

function projectPublicationNode(
  observationId: string,
  generation: number,
  projectKey: string,
  contextValue: string,
  nodeId = `tree-node:${projectKey}`,
): HostObservation {
  return {
    ...hostObservation("resource-explorer", observationId, "publish-node"),
    generation,
    publicationKind: "current",
    nodeId,
    nodeKind: "project",
    label: `routed-catalog-storefront · ${projectKey}`,
    contextValue,
  };
}

function currentPublication(
  observationId: string,
  generation: number,
  nodeCount: number,
  rootCount: number,
): HostObservation {
  return {
    ...hostObservation("resource-explorer", observationId, "publish-complete"),
    generation,
    publicationKind: "current",
    nodeCount,
    rootCount,
    workspaceIdentity: null,
    fingerprint: null,
  };
}

function currentPublicationFrame(
  observationId: string,
  generation: number,
  sourceNodes: readonly HostObservation[],
): {
  readonly start: HostObservation;
  readonly nodes: readonly HostObservation[];
  readonly publication: HostObservation;
  readonly observations: readonly HostObservation[];
} {
  const nodes = sourceNodes.map((node, ordinal) => ({
    ...node,
    source: "resource-explorer",
    observationId,
    phase: "publish-node",
    generation,
    publicationKind: "current",
    ordinal,
    parentId: null,
  }));
  const rootCount = nodes.length;
  const start = {
    ...hostObservation("resource-explorer", observationId, "publish-start"),
    generation,
    publicationKind: "current",
    rootCount,
    workspaceIdentity: null,
    fingerprint: null,
  };
  const publication = currentPublication(observationId, generation, nodes.length, rootCount);
  return { start, nodes, publication, observations: [start, ...nodes, publication] };
}

function parse(events: readonly Record<string, unknown>[], version: number, start: number) {
  return parseDiagnosticProviderSettlement(events, uri, version, start);
}

function request(observationId: string, documentVersion: number, previousResultIdPresent = false) {
  return providerEvent({
    observationId,
    documentVersion,
    phase: "request",
    previousResultIdPresent,
  });
}

function response(
  observationId: string,
  documentVersion: number,
  reportKind: string,
  itemCount: number | null,
  resultIdPresent = true,
) {
  return providerEvent({
    observationId,
    documentVersion,
    phase: "response",
    reportKind,
    itemCount,
    resultIdPresent,
    cancellationRequested: false,
  });
}

function canceled(observationId: string, documentVersion: number) {
  return providerEvent({
    observationId,
    documentVersion,
    phase: "failed",
    errorName: "Canceled",
    cancellationRequested: false,
    serverRetriggerRequested: true,
  });
}

function clientCanceled(observationId: string, documentVersion: number) {
  return providerEvent({
    observationId,
    documentVersion,
    phase: "failed",
    errorName: "Canceled",
    cancellationRequested: true,
    serverRetriggerRequested: false,
  });
}

function providerEvent(fields: Record<string, unknown>) {
  return {
    source: "language-client-provider",
    operation: "diagnostics",
    uri,
    ...fields,
  };
}
