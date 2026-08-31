import { createHmac } from "node:crypto";
import { getHeapStatistics } from "node:v8";
import {
  readSemanticRuntimeMemorySample,
  semanticRuntimeProcessTypeSystemCacheOverview,
  type SemanticRuntimeCountRow,
  type SemanticRuntimeMemorySample,
  type SemanticRuntimeSessionAnalysisCacheOverviewResult,
  type SemanticRuntimeTypeSystemDependencyCacheSummary,
} from "@aurelia-ls/semantic-runtime";
import {
  AURELIA_SUPPORT_SNAPSHOT_SCHEMA,
  type AureliaSupportAnalysisCacheSnapshot,
  type AureliaSupportCachedAppSnapshot,
  type AureliaSupportCountRow,
  type AureliaSupportKernelSnapshot,
  type AureliaSupportRequestOutcome,
  type AureliaSupportRequestSnapshot,
  type AureliaSupportRequestStaleFacts,
  type AureliaSupportSnapshotParams,
  type AureliaSupportSnapshotResponse,
} from "./protocol.js";
import type { ServerContext } from "./context.js";
import { readLifecycleSupportSnapshot } from "./handlers/lifecycle.js";

export const SUPPORT_SNAPSHOT_MAXIMUM_FEATURE_AGGREGATES = 64;
export const SUPPORT_SNAPSHOT_MAXIMUM_RECENT_TERMINALS = 128;
export const SUPPORT_SNAPSHOT_MAXIMUM_IN_FLIGHT_ROWS = 32;
export const SUPPORT_SNAPSHOT_MAXIMUM_CACHED_APPS = 16;
export const SUPPORT_SNAPSHOT_MAXIMUM_BREAKDOWN_ROWS = 8;
export const SUPPORT_SNAPSHOT_MAXIMUM_SERIALIZED_BYTES = 512 * 1024;

const INTERNAL_IN_FLIGHT_DETAIL_LIMIT = 256;
const INTERNAL_DOCUMENT_URI_CHARACTER_LIMIT = 4_096;

interface MutableRequestAggregate {
  feature: string;
  started: number;
  succeeded: number;
  clientCancelled: number;
  stale: number;
  failed: number;
  clientCancelledWithUnderlyingStale: number;
  totalDurationMilliseconds: number;
  maximumDurationMilliseconds: number;
}

interface InternalTerminalEvent {
  readonly sequence: number;
  readonly feature: string;
  readonly outcome: AureliaSupportRequestOutcome;
  readonly durationMilliseconds: number;
  readonly documentUri: string | null;
  readonly clientCancellationRequested: boolean;
  readonly underlyingStale: boolean;
  readonly staleFacts: AureliaSupportRequestStaleFacts | null;
}

interface InternalInFlightRequest {
  readonly sequence: number;
  readonly feature: string;
  readonly startedAt: number;
  readonly documentUri: string | null;
}

export interface LanguageServerRequestTerminalFacts {
  readonly outcome: AureliaSupportRequestOutcome;
  readonly clientCancellationRequested?: boolean;
  readonly underlyingStale?: boolean;
  readonly staleFacts?: AureliaSupportRequestStaleFacts | null;
}

export interface LanguageServerRequestObservation {
  finish(facts: LanguageServerRequestTerminalFacts): void;
}

export interface LanguageServerSupportLedgerOptions {
  readonly monotonicNow?: () => number;
}

/**
 * Process-local, bounded operational evidence. Raw document identities are HMACed at ingress and are never retained.
 */
export class LanguageServerSupportLedger {
  readonly #monotonicNow: () => number;
  readonly #aggregates = new Map<string, MutableRequestAggregate>();
  readonly #recentTerminals: InternalTerminalEvent[] = [];
  readonly #inFlight = new Map<number, InternalInFlightRequest>();
  #nextSequence = 1;
  readonly #omittedFeatures = new Set<string>();
  #omittedRecentTerminalCount = 0;
  #overflowInFlightCount = 0;
  #oldestOverflowInFlightStartedAt: number | null = null;

  constructor(options: LanguageServerSupportLedgerOptions = {}) {
    this.#monotonicNow = options.monotonicNow ?? (() => performance.now());
  }

  beginRequest(feature: string, documentUri?: string): LanguageServerRequestObservation {
    const normalizedFeature = safeFeatureLabel(feature);
    const aggregate = this.#aggregateFor(normalizedFeature);
    aggregate.started += 1;
    const sequence = this.#nextSequence++;
    const startedAt = this.#monotonicNow();
    const retainedDocumentUri = boundedDocumentUri(documentUri);
    let tracked = false;
    if (this.#inFlight.size < INTERNAL_IN_FLIGHT_DETAIL_LIMIT) {
      this.#inFlight.set(sequence, {
        sequence,
        feature: aggregate.feature,
        startedAt,
        documentUri: retainedDocumentUri,
      });
      tracked = true;
    } else {
      this.#overflowInFlightCount += 1;
      this.#oldestOverflowInFlightStartedAt = this.#oldestOverflowInFlightStartedAt == null
        ? startedAt
        : Math.min(this.#oldestOverflowInFlightStartedAt, startedAt);
    }
    let finished = false;
    return Object.freeze({
      finish: (facts: LanguageServerRequestTerminalFacts): void => {
        if (finished) return;
        finished = true;
        const finishedAt = this.#monotonicNow();
        if (tracked) {
          this.#inFlight.delete(sequence);
        } else {
          this.#overflowInFlightCount = Math.max(0, this.#overflowInFlightCount - 1);
          if (this.#overflowInFlightCount === 0) this.#oldestOverflowInFlightStartedAt = null;
        }
        const durationMilliseconds = boundedMilliseconds(finishedAt - startedAt);
        recordOutcome(aggregate, facts.outcome);
        if (facts.outcome === "client-cancelled" && facts.underlyingStale === true) {
          aggregate.clientCancelledWithUnderlyingStale += 1;
        }
        aggregate.totalDurationMilliseconds += durationMilliseconds;
        aggregate.maximumDurationMilliseconds = Math.max(
          aggregate.maximumDurationMilliseconds,
          durationMilliseconds,
        );
        this.#recentTerminals.push(Object.freeze({
          sequence,
          feature: aggregate.feature,
          outcome: facts.outcome,
          durationMilliseconds,
          documentUri: retainedDocumentUri,
          clientCancellationRequested: facts.clientCancellationRequested === true,
          underlyingStale: facts.underlyingStale === true,
          staleFacts: facts.staleFacts == null ? null : Object.freeze({ ...facts.staleFacts }),
        }));
        if (this.#recentTerminals.length > SUPPORT_SNAPSHOT_MAXIMUM_RECENT_TERMINALS) {
          this.#recentTerminals.shift();
          this.#omittedRecentTerminalCount += 1;
        }
      },
    });
  }

  snapshot(identitySalt: Uint8Array): AureliaSupportRequestSnapshot {
    const now = this.#monotonicNow();
    const identifyDocument = (uri: string | null): string | null => uri == null
      ? null
      : reportIdentity(identitySalt, "document", uri);
    const inFlightRows = [...this.#inFlight.values()]
      .sort((left, right) => left.startedAt - right.startedAt || left.sequence - right.sequence)
      .slice(0, SUPPORT_SNAPSHOT_MAXIMUM_IN_FLIGHT_ROWS)
      .map((request) => Object.freeze({
        sequence: request.sequence,
        feature: request.feature,
        ageMilliseconds: boundedMilliseconds(now - request.startedAt),
        documentId: identifyDocument(request.documentUri),
      }));
    const oldestTracked = [...this.#inFlight.values()].reduce<number | null>(
      (oldest, request) => oldest == null ? request.startedAt : Math.min(oldest, request.startedAt),
      null,
    );
    const oldestStartedAt = oldestTracked == null
      ? this.#oldestOverflowInFlightStartedAt
      : this.#oldestOverflowInFlightStartedAt == null
        ? oldestTracked
        : Math.min(oldestTracked, this.#oldestOverflowInFlightStartedAt);
    const inFlightCount = this.#inFlight.size + this.#overflowInFlightCount;
    const aggregates = [...this.#aggregates.values()]
      .sort((left, right) => left.feature.localeCompare(right.feature))
      .map((aggregate) => Object.freeze({ ...aggregate }));
    return Object.freeze({
      aggregateCount: aggregates.length,
      aggregates: Object.freeze(aggregates),
      omittedAggregateCount: this.#omittedFeatures.size,
      recentTerminalCount: this.#recentTerminals.length,
      recentTerminals: Object.freeze(this.#recentTerminals.map((event) => Object.freeze({
        sequence: event.sequence,
        feature: event.feature,
        outcome: event.outcome,
        durationMilliseconds: event.durationMilliseconds,
        documentId: identifyDocument(event.documentUri),
        clientCancellationRequested: event.clientCancellationRequested,
        underlyingStale: event.underlyingStale,
        staleFacts: event.staleFacts,
      }))),
      omittedRecentTerminalCount: this.#omittedRecentTerminalCount,
      inFlightCount,
      oldestInFlightAgeMilliseconds: oldestStartedAt == null
        ? null
        : boundedMilliseconds(now - oldestStartedAt),
      inFlight: Object.freeze(inFlightRows),
      omittedInFlightCount: Math.max(0, inFlightCount - inFlightRows.length),
    });
  }

  #aggregateFor(feature: string): MutableRequestAggregate {
    const existing = this.#aggregates.get(feature);
    if (existing != null) return existing;
    if (this.#aggregates.size >= SUPPORT_SNAPSHOT_MAXIMUM_FEATURE_AGGREGATES - 1) {
      this.#omittedFeatures.add(feature);
      return this.#aggregates.get("other") ?? this.#installAggregate("other");
    }
    return this.#installAggregate(feature);
  }

  #installAggregate(feature: string): MutableRequestAggregate {
    const aggregate: MutableRequestAggregate = {
      feature,
      started: 0,
      succeeded: 0,
      clientCancelled: 0,
      stale: 0,
      failed: 0,
      clientCancelledWithUnderlyingStale: 0,
      totalDurationMilliseconds: 0,
      maximumDurationMilliseconds: 0,
    };
    this.#aggregates.set(feature, aggregate);
    return aggregate;
  }

}

export interface LanguageServerSupportSnapshotDependencies {
  readonly now?: () => Date;
  readonly processMemory?: () => SemanticRuntimeMemorySample;
  readonly heapLimitBytes?: () => number;
  readonly processTypeSystemCache?: () => SemanticRuntimeTypeSystemDependencyCacheSummary;
}

export function createLanguageServerSupportSnapshot(
  ctx: ServerContext,
  params: AureliaSupportSnapshotParams,
  dependencies: LanguageServerSupportSnapshotDependencies = {},
): AureliaSupportSnapshotResponse {
  const identitySalt = supportIdentitySalt(params);
  const analysisCache = readSafeAnalysisCache(ctx, identitySalt);
  const memory = (dependencies.processMemory ?? readSemanticRuntimeMemorySample)();
  const typeSystem = (dependencies.processTypeSystemCache ?? (() =>
    semanticRuntimeProcessTypeSystemCacheOverview({
      includeTypeSystemDependencyEntries: false,
      rowLimit: 0,
    })))();
  const heapLimitBytes = (dependencies.heapLimitBytes ?? (() => getHeapStatistics().heap_size_limit))();
  const response: AureliaSupportSnapshotResponse = {
    schemaVersion: AURELIA_SUPPORT_SNAPSHOT_SCHEMA,
    capturedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    process: {
      uptimeMilliseconds: boundedMilliseconds(process.uptime() * 1_000),
      nodeVersion: process.versions.node,
      platform: process.platform,
      architecture: process.arch,
      memory: {
        ...memory,
        heapLimitBytes: nonNegativeInteger(heapLimitBytes),
      },
      typeSystemDependencyCache: projectTypeSystemCache(typeSystem),
    },
    requests: ctx.supportLedger.snapshot(identitySalt),
    lifecycle: readLifecycleSupportSnapshot(ctx),
    semanticSession: ctx.semanticRuntime.supportState(),
    analysisCache,
    bounds: supportSnapshotBounds(),
  };
  return boundSerializedSupportSnapshot(response);
}

export function supportIdentitySalt(params: AureliaSupportSnapshotParams): Uint8Array {
  const value = params?.identitySalt;
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value)) {
    throw new TypeError("Aurelia support snapshot identitySalt must be canonical base64url for 32 bytes.");
  }
  const bytes = Buffer.from(value, "base64url");
  if (bytes.byteLength !== 32 || bytes.toString("base64url") !== value) {
    throw new TypeError("Aurelia support snapshot identitySalt must be canonical base64url for 32 bytes.");
  }
  return bytes;
}

function supportSnapshotBounds(): AureliaSupportSnapshotResponse["bounds"] {
  return {
    maximumFeatureAggregates: SUPPORT_SNAPSHOT_MAXIMUM_FEATURE_AGGREGATES,
    maximumRecentTerminals: SUPPORT_SNAPSHOT_MAXIMUM_RECENT_TERMINALS,
    maximumInFlightRows: SUPPORT_SNAPSHOT_MAXIMUM_IN_FLIGHT_ROWS,
    maximumCachedApps: SUPPORT_SNAPSHOT_MAXIMUM_CACHED_APPS,
    maximumBreakdownRows: SUPPORT_SNAPSHOT_MAXIMUM_BREAKDOWN_ROWS,
    maximumSerializedBytes: SUPPORT_SNAPSHOT_MAXIMUM_SERIALIZED_BYTES,
  };
}

function readSafeAnalysisCache(
  ctx: ServerContext,
  identitySalt: Uint8Array,
): AureliaSupportAnalysisCacheSnapshot {
  let cache: SemanticRuntimeSessionAnalysisCacheOverviewResult | null;
  try {
    cache = ctx.semanticRuntime.detachedAnalysisCacheOverview({
      includeKernelBreakdowns: false,
      includeDetailDensity: false,
      includeQueryClaimRows: false,
      rowLimit: SUPPORT_SNAPSHOT_MAXIMUM_BREAKDOWN_ROWS,
      cachedAppLimit: SUPPORT_SNAPSHOT_MAXIMUM_CACHED_APPS,
    });
  } catch {
    cache = null;
  }
  if (cache == null) return { status: "unavailable" };
  const cachedApps = cache.cachedApps.slice(0, SUPPORT_SNAPSHOT_MAXIMUM_CACHED_APPS)
    .map((app): AureliaSupportCachedAppSnapshot => ({
      projectId: reportIdentity(identitySalt, "project", app.projectKey),
      analysisDepth: safeOperationalLabel(String(app.analysisDepth), "unknown"),
      templateAnalysisBreadth: safeOperationalLabel(String(app.templateAnalysisBreadth), "unknown"),
      includeAuthoringTemplates: app.includeAuthoringTemplates,
      authoringTemplateSourceFileCount: nonNegativeInteger(app.authoringTemplateSourceFileCount),
      authoringTemplateLimit: app.authoringTemplateLimit == null
        ? null
        : nonNegativeInteger(app.authoringTemplateLimit),
      profile: {
        inquiryProfile: safeOperationalLabel(app.profile.inquiryProfile, "unknown"),
        totalMilliseconds: boundedMilliseconds(app.profile.totalMilliseconds),
        phaseCount: nonNegativeInteger(app.profile.phaseCount),
        topPhases: app.profile.topPhases.slice(0, SUPPORT_SNAPSHOT_MAXIMUM_BREAKDOWN_ROWS).map((phase) => ({
          name: safeOperationalLabel(phase.name, "other"),
          milliseconds: boundedMilliseconds(phase.milliseconds),
          itemCount: phase.itemCount == null ? null : nonNegativeInteger(phase.itemCount),
        })),
        typeSystemAcquisitionKind: safeOperationalLabel(
          String(app.profile.typeSystemAcquisition.acquisitionKind),
          "unknown",
        ),
        typeSystemAcquisitionMilliseconds: boundedMilliseconds(
          app.profile.typeSystemAcquisition.acquisitionMilliseconds,
        ),
        typeSystemConstructionMilliseconds: boundedMilliseconds(
          app.profile.typeSystemAcquisition.constructionMilliseconds,
        ),
        programSourceFileCount: nonNegativeInteger(app.profile.programSourceFiles.total),
        programProjectSourceFileCount: nonNegativeInteger(app.profile.programSourceFiles.projectSources),
        programNodeModuleSourceFileCount: nonNegativeInteger(app.profile.programSourceFiles.nodeModuleSources),
        programDeclarationSourceFileCount: nonNegativeInteger(app.profile.programSourceFiles.declarationSources),
        programDefaultLibrarySourceFileCount: nonNegativeInteger(app.profile.programSourceFiles.defaultLibrarySources),
        programSourceTextCharacters: nonNegativeInteger(app.profile.programSourceFiles.sourceTextCharacters),
      },
      queryClaims: projectQueryClaims(app.queryClaims),
    }));
  return {
    status: "available",
    cachedAppCount: nonNegativeInteger(cache.cachedAppCount),
    typeSystemProjectCount: nonNegativeInteger(cache.typeSystemProjectCount),
    cachedApps,
    omittedCachedAppCount: Math.max(0, cache.cachedAppCount - cachedApps.length),
    runtimeQueryClaims: cache.runtimeQueryClaimProfiles
      .slice(0, SUPPORT_SNAPSHOT_MAXIMUM_BREAKDOWN_ROWS)
      .map((profile) => projectQueryClaims(profile.queryClaims)),
    workspaceKernel: projectKernel(cache.workspaceKernel),
  };
}

function projectKernel(
  kernel: SemanticRuntimeSessionAnalysisCacheOverviewResult["workspaceKernel"],
): AureliaSupportKernelSnapshot {
  const breakdown = "recordKinds" in kernel ? kernel : null;
  return {
    totalRecords: nonNegativeInteger(kernel.totalRecords),
    addresses: nonNegativeInteger(kernel.addresses),
    identities: nonNegativeInteger(kernel.identities),
    evidence: nonNegativeInteger(kernel.evidence),
    provenance: nonNegativeInteger(kernel.provenance),
    claims: nonNegativeInteger(kernel.claims),
    openSeams: nonNegativeInteger(kernel.openSeams),
    products: nonNegativeInteger(kernel.products),
    materializations: nonNegativeInteger(kernel.materializations),
    productDetails: nonNegativeInteger(kernel.productDetails),
    hotDetails: nonNegativeInteger(kernel.hotDetails),
    handleCharacters: nonNegativeInteger(kernel.handleCharacters),
    recordKinds: projectCountRows(breakdown?.recordKinds ?? []),
    productKinds: projectCountRows(breakdown?.productKinds ?? []),
    productDetailKinds: projectCountRows(breakdown?.productDetailKinds ?? []),
    hotDetailKinds: projectCountRows(breakdown?.hotDetailKinds ?? []),
    openSeamKinds: projectCountRows(breakdown?.openSeamKinds ?? []),
  };
}

function projectCountRows(rows: readonly SemanticRuntimeCountRow[]): readonly AureliaSupportCountRow[] {
  return rows.slice(0, SUPPORT_SNAPSHOT_MAXIMUM_BREAKDOWN_ROWS).map((row) => ({
    key: safeOperationalLabel(row.key, "other"),
    count: nonNegativeInteger(row.count),
  }));
}

function projectQueryClaims(
  snapshot: SemanticRuntimeSessionAnalysisCacheOverviewResult["cachedApps"][number]["queryClaims"],
) {
  return {
    profile: safeOperationalLabel(String(snapshot.profile), "unknown"),
    retentionKind: safeOperationalLabel(String(snapshot.retentionKind), "unknown"),
    answerLocalKernelPolicy: safeOperationalLabel(String(snapshot.answerLocalKernelPolicy), "unknown"),
    createdRecords: nonNegativeInteger(snapshot.createdRecords),
    retainedRecords: nonNegativeInteger(snapshot.retainedRecords),
    rootRecords: nonNegativeInteger(snapshot.rootRecords),
    childRecords: nonNegativeInteger(snapshot.childRecords),
    maxDepth: nonNegativeInteger(snapshot.maxDepth),
    pending: nonNegativeInteger(snapshot.pending),
    answered: nonNegativeInteger(snapshot.answered),
    failed: nonNegativeInteger(snapshot.failed),
    disposed: nonNegativeInteger(snapshot.disposed),
    projectionOnly: nonNegativeInteger(snapshot.projectionOnly),
    queryTypeProjection: nonNegativeInteger(snapshot.queryTypeProjection),
    staticCatalog: nonNegativeInteger(snapshot.staticCatalog),
    approximatePayloadBytes: nonNegativeInteger(snapshot.approximatePayloadBytes),
    retainedAnswerBytes: nonNegativeInteger(snapshot.retainedAnswerBytes),
    retainedAnswerValues: nonNegativeInteger(snapshot.retainedAnswerValues),
    retainedAnswerHits: nonNegativeInteger(snapshot.retainedAnswerHits),
    retainedRecordLimit: snapshot.retainedRecordLimit == null
      ? null
      : nonNegativeInteger(snapshot.retainedRecordLimit),
    budgetDisposedRecords: nonNegativeInteger(snapshot.budgetDisposedRecords),
    disposedKernelRecords: nonNegativeInteger(snapshot.disposedKernelRecords),
    disposedProductDetails: nonNegativeInteger(snapshot.disposedProductDetails),
    disposedHotDetails: nonNegativeInteger(snapshot.disposedHotDetails),
    disposedKernelHandleCharacters: nonNegativeInteger(snapshot.disposedKernelHandleCharacters),
    clearedTypeSystemDependencySourceFiles: nonNegativeInteger(
      snapshot.clearedTypeSystemDependencySourceFiles,
    ),
    clearedTypeSystemDependencySourceTextCharacters: nonNegativeInteger(
      snapshot.clearedTypeSystemDependencySourceTextCharacters,
    ),
    netKernelRecordDelta: finiteInteger(snapshot.netKernelRecordDelta),
    netProductDetailDelta: finiteInteger(snapshot.netProductDetailDelta),
    netHotDetailDelta: finiteInteger(snapshot.netHotDetailDelta),
    netKernelHandleCharacterDelta: finiteInteger(snapshot.netKernelHandleCharacterDelta),
  };
}

function projectTypeSystemCache(
  cache: SemanticRuntimeTypeSystemDependencyCacheSummary,
): AureliaSupportSnapshotResponse["process"]["typeSystemDependencyCache"] {
  return {
    entries: nonNegativeInteger(cache.entries),
    entryLimit: nonNegativeInteger(cache.entryLimit),
    sourceTextCharacters: nonNegativeInteger(cache.sourceTextCharacters),
    sourceTextCharacterLimit: nonNegativeInteger(cache.sourceTextCharacterLimit),
    distinctCanonicalPaths: nonNegativeInteger(cache.distinctCanonicalPaths),
    duplicateCanonicalPathEntries: nonNegativeInteger(cache.duplicateCanonicalPathEntries),
    nodeModuleEntries: nonNegativeInteger(cache.nodeModuleEntries),
    nodeModuleSourceTextCharacters: nonNegativeInteger(cache.nodeModuleSourceTextCharacters),
    declarationEntries: nonNegativeInteger(cache.declarationEntries),
    declarationSourceTextCharacters: nonNegativeInteger(cache.declarationSourceTextCharacters),
    defaultLibraryEntries: nonNegativeInteger(cache.defaultLibraryEntries),
    defaultLibrarySourceTextCharacters: nonNegativeInteger(cache.defaultLibrarySourceTextCharacters),
    externalDeclarationEntries: nonNegativeInteger(cache.externalDeclarationEntries),
    externalDeclarationSourceTextCharacters: nonNegativeInteger(cache.externalDeclarationSourceTextCharacters),
    hits: nonNegativeInteger(cache.hits),
    misses: nonNegativeInteger(cache.misses),
    writes: nonNegativeInteger(cache.writes),
    writeSourceTextCharacters: nonNegativeInteger(cache.writeSourceTextCharacters),
    supersededRevisionEvictions: nonNegativeInteger(cache.supersededRevisionEvictions),
    capacityEvictions: nonNegativeInteger(cache.capacityEvictions),
    bypasses: nonNegativeInteger(cache.bypasses),
    clearOperations: nonNegativeInteger(cache.clearOperations),
    clearedEntries: nonNegativeInteger(cache.clearedEntries),
    clearedSourceTextCharacters: nonNegativeInteger(cache.clearedSourceTextCharacters),
    dominantSourceTextBucket: safeOperationalLabel(String(cache.dominantSourceTextBucket), "unknown"),
    suggestedClearPolicy: safeOperationalLabel(String(cache.suggestedClearPolicy), "unknown"),
    suggestedClearSourceTextCharacters: nonNegativeInteger(cache.suggestedClearSourceTextCharacters),
  };
}

function boundSerializedSupportSnapshot(
  response: AureliaSupportSnapshotResponse,
): AureliaSupportSnapshotResponse {
  if (Buffer.byteLength(JSON.stringify(response), "utf8") <= SUPPORT_SNAPSHOT_MAXIMUM_SERIALIZED_BYTES) {
    return response;
  }
  const recentTerminalLimit = Math.min(32, response.requests.recentTerminals.length);
  const recentTerminals = response.requests.recentTerminals.slice(-recentTerminalLimit);
  const inFlight = response.requests.inFlight.slice(0, 16);
  const analysisCache = response.analysisCache.status === "unavailable"
    ? response.analysisCache
    : {
        ...response.analysisCache,
        cachedApps: [],
        omittedCachedAppCount:
          response.analysisCache.omittedCachedAppCount + response.analysisCache.cachedApps.length,
      };
  const reduced: AureliaSupportSnapshotResponse = {
    ...response,
    requests: {
      ...response.requests,
      recentTerminalCount: recentTerminals.length,
      recentTerminals,
      omittedRecentTerminalCount:
        response.requests.omittedRecentTerminalCount
        + response.requests.recentTerminals.length
        - recentTerminals.length,
      inFlight,
      omittedInFlightCount: Math.max(0, response.requests.inFlightCount - inFlight.length),
    },
    analysisCache,
  };
  if (Buffer.byteLength(JSON.stringify(reduced), "utf8") > SUPPORT_SNAPSHOT_MAXIMUM_SERIALIZED_BYTES) {
    throw new RangeError("Aurelia support snapshot exceeded its serialized payload bound after reduction.");
  }
  return reduced;
}

function recordOutcome(aggregate: MutableRequestAggregate, outcome: AureliaSupportRequestOutcome): void {
  switch (outcome) {
    case "succeeded":
      aggregate.succeeded += 1;
      return;
    case "client-cancelled":
      aggregate.clientCancelled += 1;
      return;
    case "stale":
      aggregate.stale += 1;
      return;
    case "failed":
      aggregate.failed += 1;
  }
}

function reportIdentity(identitySalt: Uint8Array, kind: string, value: string): string {
  const digest = createHmac("sha256", identitySalt)
    .update(kind)
    .update("\0")
    .update(value)
    .digest("hex")
    .slice(0, 20);
  return `${kind}:${digest}`;
}

function safeOperationalLabel(value: string, fallback: string): string {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value) ? value : fallback;
}

function safeFeatureLabel(value: string): string {
  return /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,79}$/.test(value) ? value : "other";
}

function boundedDocumentUri(uri: string | undefined): string | null {
  return uri != null && uri.length <= INTERNAL_DOCUMENT_URI_CHARACTER_LIMIT ? uri : null;
}

function boundedMilliseconds(value: number): number {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));
}

function nonNegativeInteger(value: number): number {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, finiteInteger(value)));
}

function finiteInteger(value: number): number {
  return Math.max(Number.MIN_SAFE_INTEGER, Math.min(
    Number.MAX_SAFE_INTEGER,
    Math.round(Number.isFinite(value) ? value : 0),
  ));
}
