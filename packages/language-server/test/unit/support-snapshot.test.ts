import { describe, expect, test, vi } from "vitest";
import { createHmac } from "node:crypto";
import { ErrorCodes, LSPErrorCodes } from "vscode-languageserver/node";
import type { ServerContext } from "../../src/context.js";
import {
  LanguageServerSupportLedger,
  SUPPORT_SNAPSHOT_MAXIMUM_CACHED_APPS,
  SUPPORT_SNAPSHOT_MAXIMUM_FEATURE_AGGREGATES,
  SUPPORT_SNAPSHOT_MAXIMUM_IN_FLIGHT_ROWS,
  SUPPORT_SNAPSHOT_MAXIMUM_RECENT_TERMINALS,
  SUPPORT_SNAPSHOT_MAXIMUM_SERIALIZED_BYTES,
  createLanguageServerSupportSnapshot,
  supportIdentitySalt,
} from "../../src/support-snapshot.js";
import { handleSupportSnapshot } from "../../src/handlers/custom.js";

const reportSalt = new Uint8Array(32).fill(23);
const reportSaltText = Buffer.from(reportSalt).toString("base64url");

describe("language-server support snapshot", () => {
  test("keeps request evidence bounded and pseudonymizes documents without retaining report salt", () => {
    let now = 0;
    const ledger = new LanguageServerSupportLedger({
      monotonicNow: () => now,
    });
    const secretUri = "file:///C:/private/tenant/game/src/player.html";

    for (let index = 0; index < 140; index += 1) {
      const request = ledger.beginRequest(`feature-${index % 80}`, secretUri);
      now += 2;
      request.finish({ outcome: index % 2 === 0 ? "succeeded" : "failed" });
    }
    const inFlight = Array.from({ length: 40 }, (_, index) => {
      now += 1;
      return ledger.beginRequest("hover", `${secretUri}?open=${index}`);
    });
    now += 25;

    const snapshot = ledger.snapshot(reportSalt);
    expect(snapshot.aggregates).toHaveLength(SUPPORT_SNAPSHOT_MAXIMUM_FEATURE_AGGREGATES);
    expect(snapshot.omittedAggregateCount).toBe(18);
    expect(snapshot.recentTerminals).toHaveLength(SUPPORT_SNAPSHOT_MAXIMUM_RECENT_TERMINALS);
    expect(snapshot.omittedRecentTerminalCount).toBe(12);
    expect(snapshot.inFlightCount).toBe(40);
    expect(snapshot.inFlight).toHaveLength(SUPPORT_SNAPSHOT_MAXIMUM_IN_FLIGHT_ROWS);
    expect(snapshot.omittedInFlightCount).toBe(8);
    expect(snapshot.oldestInFlightAgeMilliseconds).toBeGreaterThan(25);
    expect(snapshot.recentTerminals[0]?.documentId).toMatch(/^document:[a-f0-9]{20}$/);
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain(secretUri);
    expect(serialized).not.toContain(reportSaltText);

    inFlight.forEach((request) => request.finish({ outcome: "client-cancelled" }));
  });

  test("keeps same-document correlation stable within one report and rotates it with the report salt", () => {
    let now = 0;
    const ledger = new LanguageServerSupportLedger({
      monotonicNow: () => now,
    });
    const uri = "file:///private/app.html";
    const first = ledger.beginRequest("hover", uri);
    now += 1;
    first.finish({ outcome: "succeeded" });
    const second = ledger.beginRequest("completion", uri);
    now += 1;
    second.finish({ outcome: "succeeded" });

    const one = ledger.snapshot(reportSalt);
    const two = ledger.snapshot(new Uint8Array(32).fill(24));
    expect(one.recentTerminals[0]?.documentId).toBe(one.recentTerminals[1]?.documentId);
    expect(one.recentTerminals[0]?.documentId).toBe(
      `document:${createHmac("sha256", reportSalt).update("document").update("\0").update(uri).digest("hex").slice(0, 20)}`,
    );
    expect(two.recentTerminals[0]?.documentId).toBe(two.recentTerminals[1]?.documentId);
    expect(one.recentTerminals[0]?.documentId).not.toBe(two.recentTerminals[0]?.documentId);
  });

  test("does not retain an unbounded document URI in the request ledger", () => {
    const ledger = new LanguageServerSupportLedger();
    const privateTail = "PRIVATE_LONG_URI_CANARY";
    const uri = `file:///${"a".repeat(5_000)}${privateTail}`;
    const request = ledger.beginRequest("hover", uri);
    request.finish({ outcome: "failed" });

    const snapshot = ledger.snapshot(reportSalt);
    expect(snapshot.recentTerminals[0]?.documentId).toBeNull();
    expect(JSON.stringify(snapshot)).not.toContain(privateTail);
  });

  test("projects existing cache state without app work or private source-shaped fields", async () => {
    const detachedAnalysisCacheOverview = vi.fn(() => fakeAnalysisCacheOverview());
    const ctx = {
      supportLedger: new LanguageServerSupportLedger(),
      semanticRuntime: {
        detachedAnalysisCacheOverview,
        supportState: () => ({
          workspaceConfigured: true,
          workspaceGeneration: 7,
          requestEpoch: 12,
          diagnosticCacheEntries: 2,
          retiringWorkspaceCount: 0,
          retirementFailureCount: 0,
          closing: false,
          disposalStarted: false,
        }),
      },
    } as unknown as ServerContext;

    const response = await createLanguageServerSupportSnapshot(
      ctx,
      { identitySalt: reportSaltText },
      {
        now: () => new Date("2026-08-31T12:00:00.000Z"),
        processMemory: fakeMemory,
        heapLimitBytes: () => 2_147_483_648,
        processTypeSystemCache: fakeTypeSystemCache,
      },
    );

    expect(detachedAnalysisCacheOverview).toHaveBeenCalledOnce();
    expect(detachedAnalysisCacheOverview).toHaveBeenCalledWith({
      includeKernelBreakdowns: false,
      includeDetailDensity: false,
      includeQueryClaimRows: false,
      rowLimit: 8,
      cachedAppLimit: SUPPORT_SNAPSHOT_MAXIMUM_CACHED_APPS,
    });
    expect(response.analysisCache).toMatchObject({
      status: "available",
      cachedAppCount: 1,
      typeSystemProjectCount: 1,
      cachedApps: [expect.objectContaining({
        projectId: expect.stringMatching(/^project:[a-f0-9]{20}$/),
        analysisDepth: "binding-observation",
      })],
    });
    expect(response.process.memory.heapLimitBytes).toBe(2_147_483_648);
    expect(response.analysisCache.status === "available"
      ? response.analysisCache.cachedApps[0]?.profile.topPhases
      : []).toEqual([
        { name: "template-compilation", milliseconds: 200, itemCount: 3 },
        { name: "other", milliseconds: 100, itemCount: 1 },
      ]);
    expect(response.semanticSession).toMatchObject({ workspaceGeneration: 7, requestEpoch: 12 });
    expect(Buffer.byteLength(JSON.stringify(response), "utf8"))
      .toBeLessThanOrEqual(SUPPORT_SNAPSHOT_MAXIMUM_SERIALIZED_BYTES);

    const serialized = JSON.stringify(response);
    for (const secret of [
      "C:\\private\\tenant\\game",
      "file:///C:/private/tenant/game",
      "PRIVATE SOURCE TEXT",
      "private-project-key",
      "private-handle",
      reportSaltText,
    ]) {
      expect(serialized).not.toContain(secret);
    }
    expect((response.analysisCache as { cachedApps?: unknown[] }).cachedApps)
      .toHaveLength(Math.min(1, SUPPORT_SNAPSHOT_MAXIMUM_CACHED_APPS));
  });

  test("rejects noncanonical or wrong-sized report salts", () => {
    for (const identitySalt of ["", "not-base64url", Buffer.alloc(31).toString("base64url"), `${reportSaltText}=`]) {
      expect(() => supportIdentitySalt({ identitySalt })).toThrow(/identitySalt/u);
    }
    expect([...supportIdentitySalt({ identitySalt: reportSaltText })]).toEqual([...reportSalt]);
  });

  test("maps invalid input and client cancellation at the detached protocol boundary", () => {
    expect(captureFailure(() => handleSupportSnapshot(
      {} as ServerContext,
      { identitySalt: "invalid" },
      { isCancellationRequested: false } as never,
    ))).toMatchObject({ code: ErrorCodes.InvalidParams });
    expect(captureFailure(() => handleSupportSnapshot(
      {} as ServerContext,
      { identitySalt: reportSaltText },
      { isCancellationRequested: true } as never,
    ))).toMatchObject({ code: LSPErrorCodes.RequestCancelled });
  });
});

function captureFailure(read: () => unknown): unknown {
  try {
    read();
    return null;
  } catch (error) {
    return error;
  }
}

function fakeAnalysisCacheOverview() {
  return {
    displayText: "PRIVATE SOURCE TEXT file:///C:/private/tenant/game",
    cachedAppCount: 1,
    typeSystemProjectCount: 1,
    cachedApps: [{
      projectKey: "private-project-key",
      analysisDepth: "binding-observation",
      templateAnalysisBreadth: "resource-local",
      includeAuthoringTemplates: true,
      authoringTemplateSourceFileCount: 1,
      authoringTemplateLimit: 1,
      profile: {
        inquiryProfile: "lsp-cursor",
        totalMilliseconds: 321.2,
        phaseCount: 2,
        topPhases: [
          { name: "template-compilation", milliseconds: 200.4, itemCount: 3 },
          { name: "C:/private/tenant/game", milliseconds: 100, itemCount: 1 },
        ],
        typeSystemAcquisition: {
          acquisitionKind: "computed",
          acquisitionMilliseconds: 10,
          constructionMilliseconds: 8,
        },
        programSourceFiles: {
          total: 20,
          projectSources: 5,
          nodeModuleSources: 10,
          declarationSources: 12,
          defaultLibrarySources: 4,
          sourceTextCharacters: 50_000,
        },
      },
      queryClaims: fakeQueryClaims(),
    }],
    runtimeQueryClaimProfiles: [{ inquiryProfile: "lsp-cursor", queryClaims: fakeQueryClaims() }],
    workspaceKernel: {
      totalRecords: 100,
      addresses: 10,
      identities: 10,
      evidence: 10,
      provenance: 10,
      claims: 30,
      openSeams: 1,
      products: 20,
      materializations: 9,
      productDetails: 20,
      hotDetails: 4,
      handleCharacters: 8_000,
      recordKinds: [
        { key: "semantic-claim", count: 30 },
        { key: "file:///C:/private/tenant/game", count: 1 },
      ],
      productKinds: [{ key: "binding.runtime-binding", count: 20 }],
      productDetailKinds: [{ key: "binding.runtime-binding", count: 20 }],
      hotDetailKinds: [{ key: "type-system.type-member", count: 4 }],
      openSeamKinds: [{ key: "runtime-boundary", count: 1 }],
    },
    retention: { notes: ["PRIVATE SOURCE TEXT"] },
    summary: "PRIVATE SOURCE TEXT",
  };
}

function fakeQueryClaims() {
  return {
    profile: "lsp-cursor",
    retentionKind: "retain-for-session",
    answerLocalKernelPolicy: "dispose-after-answer",
    createdRecords: 4,
    retainedRecords: 2,
    records: 2,
    rootRecords: 2,
    childRecords: 0,
    maxDepth: 0,
    pending: 0,
    answered: 2,
    failed: 0,
    disposed: 2,
    projectionOnly: 1,
    queryTypeProjection: 1,
    staticCatalog: 0,
    approximatePayloadBytes: 200,
    retainedAnswerBytes: 0,
    retainedAnswerValues: 0,
    retainedAnswerHits: 1,
    retainedRecordLimit: 512,
    budgetDisposedRecords: 0,
    disposedKernelRecords: 30,
    disposedProductDetails: 4,
    disposedHotDetails: 2,
    disposedKernelHandleCharacters: 600,
    clearedTypeSystemDependencySourceFiles: 0,
    clearedTypeSystemDependencySourceTextCharacters: 0,
    netKernelRecordDelta: -10,
    netProductDetailDelta: -2,
    netHotDetailDelta: 0,
    netKernelHandleCharacterDelta: -200,
  };
}

function fakeMemory() {
  return {
    rssBytes: 200_000_000,
    heapTotalBytes: 150_000_000,
    heapUsedBytes: 120_000_000,
    externalBytes: 1_000,
    arrayBuffersBytes: 500,
    rssOtherBytes: 49_998_500,
    v8HeapPhysicalBytes: 140_000_000,
    v8HeapAvailableBytes: 1_500_000_000,
    v8MallocedMemoryBytes: 2_000,
    v8PeakMallocedMemoryBytes: 3_000,
    v8ExternalMemoryBytes: 1_000,
    v8NativeContextCount: 2,
    v8DetachedContextCount: 0,
  };
}

function fakeTypeSystemCache() {
  return {
    entries: 10,
    entryLimit: 2_048,
    sourceTextCharacters: 20_000,
    sourceTextCharacterLimit: 32_000_000,
    distinctCanonicalPaths: 10,
    duplicateCanonicalPathEntries: 0,
    nodeModuleEntries: 8,
    nodeModuleSourceTextCharacters: 18_000,
    declarationEntries: 7,
    declarationSourceTextCharacters: 17_000,
    defaultLibraryEntries: 3,
    defaultLibrarySourceTextCharacters: 10_000,
    externalDeclarationEntries: 0,
    externalDeclarationSourceTextCharacters: 0,
    hits: 2,
    misses: 10,
    writes: 10,
    writeSourceTextCharacters: 20_000,
    supersededRevisionEvictions: 0,
    capacityEvictions: 0,
    bypasses: 1,
    clearOperations: 0,
    clearedEntries: 0,
    clearedSourceTextCharacters: 0,
    dominantSourceTextBucket: "node-modules",
    suggestedClearPolicy: "node-modules",
    suggestedClearSourceTextCharacters: 18_000,
    largestEntries: [{
      fileName: "C:\\private\\tenant\\game\\node_modules\\private.d.ts",
      canonicalPath: "C:/private/tenant/game/node_modules/private.d.ts",
      bucket: "node-modules",
      parseOptionKey: "private-handle",
      sourceTextCharacters: 100,
      isDeclarationFile: true,
    }],
  } as never;
}
