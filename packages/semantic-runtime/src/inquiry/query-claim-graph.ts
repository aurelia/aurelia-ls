import type {
  SemanticRuntimeInquiryProfile,
} from '../telemetry/inquiry-profile.js';
import {
  diffSemanticRuntimeKernelCounts,
  type SemanticRuntimeKernelCountSnapshot,
} from '../telemetry/kernel-density.js';
import type {
  KernelStoreDisposalSummary,
  KernelStoreMarker,
} from '../kernel/store.js';
import {
  queryClaimRetentionPolicyForProfile,
  queryClaimAppEpochDisposalPolicy,
  queryClaimDisposalPolicy,
  queryClaimQueryTypeProjectionDisposalPolicy,
  queryClaimSessionEndDisposalPolicy,
  queryClaimSourceEpochDisposalPolicy,
  QueryClaimAnswerLocalKernelPolicy,
  QueryClaimDisposalReason,
  QueryClaimRetentionKind,
  type QueryClaimDisposalPolicy,
  type QueryClaimRetentionPolicy,
  type SemanticQueryMaterializationPolicy,
} from './query-claim-policy.js';

const MAX_QUERY_ANSWER_PAYLOAD_ESTIMATE_BYTES = 1024 * 1024;

export const enum QueryClaimEvaluationState {
  /** The claim exists, but the answer-producing closure has not run yet. */
  Pending = 'pending',
  /** The answer-producing closure ran and the graph retained the configured outcome shape. */
  Answered = 'answered',
  /** The answer-producing closure threw before producing a public answer. */
  Failed = 'failed',
  /** The claim was explicitly invalidated or disposed by policy. */
  Disposed = 'disposed',
}

export interface QueryClaimRequestInput {
  readonly queryKind: string;
  readonly queryKey: string;
  readonly locusKey: string;
  /**
   * Epoch/dependency keys that can invalidate this answer outcome.
   *
   * Keep these separate from `locusKey`: a cursor answer's exact locus can be one source offset, while its validity
   * still depends on the containing source file and project epoch.
   */
  readonly epochKeys?: readonly string[];
  readonly materializationPolicy: SemanticQueryMaterializationPolicy;
}

export interface QueryClaimAnswerBoundary {
  /**
   * Optional gate for retained public answer reuse.
   *
   * Use this when a caller must materialize the answer closure for policy side effects even though a small answer value
   * is available, such as `retain-app` routed queries that need to warm an app epoch for later tools.
   */
  readonly shouldReuseRetainedAnswer?: () => boolean;
  /** Optional store marker for reclaiming answer-local kernel records after the public answer has been shaped. */
  readonly readKernelMarker?: () => KernelStoreMarker;
  /**
   * Optional cheap kernel snapshot reader for measuring query-time side effects.
   *
   * The resulting deltas are inclusive: a composed answer such as app overview includes nested query work. Snapshot
   * totals therefore report root-query deltas separately from all-claim deltas so nested composition stays visible
   * without accidentally becoming the aggregate cost model.
   */
  readonly readKernelSnapshot?: () => SemanticRuntimeKernelCountSnapshot;
  /** Dispose kernel/product/hot-detail records created after a marker when the query profile does not retain them. */
  readonly disposeKernelSince?: (marker: KernelStoreMarker) => KernelStoreDisposalSummary;
  /**
   * Dispose non-marker answer side effects after the public answer is shaped.
   *
   * Use this for policy-owned boundaries such as one-off routed app queries where an opened app epoch is reclaimed by
   * app-cache policy rather than by the query graph's marker. The graph records this next to the answer outcome so
   * telemetry can distinguish "materialized during answer" from "retained after answer".
   */
  readonly disposeAnswerSideEffects?: () => QueryClaimAnswerDisposalSummary | null;
}

export interface QueryClaimAnswerDisposalSummary {
  readonly kernel?: KernelStoreDisposalSummary;
  /** Nested query-claim records disposed by answer-side policy, such as reclaiming an opened app epoch. */
  readonly queryClaims?: number;
  /** Process-local TypeScript dependency SourceFile cache entries cleared by answer-side policy. */
  readonly typeSystemDependencyCache?: QueryClaimTypeSystemDependencyCacheDisposalSummary;
}

export interface QueryClaimTypeSystemDependencyCacheDisposalSummary {
  readonly policy: string;
  readonly sourceFiles: number;
  readonly sourceTextCharacters: number;
  readonly nodeModuleSourceFiles: number;
  readonly nodeModuleSourceTextCharacters: number;
  readonly declarationSourceFiles: number;
  readonly declarationSourceTextCharacters: number;
  readonly defaultLibrarySourceFiles: number;
  readonly defaultLibrarySourceTextCharacters: number;
  readonly externalDeclarationSourceFiles: number;
  readonly externalDeclarationSourceTextCharacters: number;
  readonly remainingSourceFiles: number;
}

export interface QueryClaimAnswerShape {
  readonly outcome: string;
  readonly summary: string;
  readonly value: unknown;
  readonly page?: unknown;
}

export interface QueryClaimRecord {
  /** Store-local monotonic id for the answer-facing query claim. */
  readonly id: number;
  /** App/query-session sequence id; useful for seeing nested answers such as app overview -> diagnostics. */
  readonly sequence: number;
  /** Parent query claim id when this answer was materialized inside another query answer. */
  readonly parentId: number | null;
  /** Nesting depth inside the answer graph; root public queries are depth 0. */
  readonly depth: number;
  /** Query kind or route-query kind that produced the answer. */
  readonly queryKind: string;
  /** Stable key of the query shape and locus within this app session. */
  readonly queryKey: string;
  /** Coarse locus key, usually the app project plus optional source/cursor information. */
  readonly locusKey: string;
  /** Dependency/epoch keys that can invalidate this claim without matching the exact answer locus. */
  readonly epochKeys: readonly string[];
  /** Declared query materialization policy from the query catalog. */
  readonly materializationPolicy: SemanticQueryMaterializationPolicy;
  /** Current answer-boundary state for this claim. */
  readonly evaluationState: QueryClaimEvaluationState;
  /** Answer outcome projected to the public API, after resolution. */
  readonly outcome: string | null;
  /** Summary retained according to the graph policy. */
  readonly summary: string | null;
  /** Approximate payload shape retained as telemetry without serializing or storing the payload itself. */
  readonly approximatePayloadBytes: number;
  /** Row count or scalar-answer count when cheaply known. */
  readonly rowCount: number;
  /** Whether the graph retained the public answer value after resolution. */
  readonly retainedAnswerValue: boolean;
  /** Disposal reason when this record is retained as a tombstone or read before removal. */
  readonly disposalReason: QueryClaimDisposalReason | null;
  /** Inclusive kernel record delta observed while materializing this answer. */
  readonly kernelRecordDelta: number;
  /** Inclusive kernel product delta observed while materializing this answer. */
  readonly kernelProductDelta: number;
  /** Inclusive product-detail delta observed while materializing this answer. */
  readonly kernelProductDetailDelta: number;
  /** Inclusive hot-detail delta observed while materializing this answer. */
  readonly kernelHotDetailDelta: number;
  /** Inclusive kernel handle-character delta observed while materializing this answer. */
  readonly kernelHandleCharacterDelta: number;
  /** Kernel records discarded after the answer was shaped because the query profile does not retain products. */
  readonly disposedKernelRecords: number;
  /** Product details discarded with answer-local kernel products. */
  readonly disposedProductDetails: number;
  /** Hot details discarded with answer-local kernel products. */
  readonly disposedHotDetails: number;
  /** Kernel record handle-character mass discarded with answer-local kernel products. */
  readonly disposedKernelHandleCharacters: number;
  /** Nested query-claim records discarded by answer-side disposal policy. */
  readonly disposedQueryClaimRecords: number;
  /** TypeScript dependency SourceFile cache entries cleared by answer-side disposal policy. */
  readonly clearedTypeSystemDependencySourceFiles: number;
  /** Source-text characters cleared from the TypeScript dependency SourceFile cache by answer-side policy. */
  readonly clearedTypeSystemDependencySourceTextCharacters: number;
  readonly clearedTypeSystemDependencyNodeModuleSourceFiles: number;
  readonly clearedTypeSystemDependencyNodeModuleSourceTextCharacters: number;
  readonly clearedTypeSystemDependencyDeclarationSourceFiles: number;
  readonly clearedTypeSystemDependencyDeclarationSourceTextCharacters: number;
  readonly clearedTypeSystemDependencyDefaultLibrarySourceFiles: number;
  readonly clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters: number;
  readonly clearedTypeSystemDependencyExternalDeclarationSourceFiles: number;
  readonly clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters: number;
  /** Last TypeScript dependency SourceFile cache clear policy applied to this claim, when any. */
  readonly typeSystemDependencyCacheClearPolicy: string | null;
  /** Approximate retained kernel records after answer-side disposal; can be negative when this answer reclaims prior work. */
  readonly netKernelRecordDelta: number;
  /** Approximate retained product details after answer-side disposal. */
  readonly netProductDetailDelta: number;
  /** Approximate retained hot details after answer-side disposal. */
  readonly netHotDetailDelta: number;
  /** Approximate retained kernel handle-character delta after answer-side disposal. */
  readonly netKernelHandleCharacterDelta: number;
}

export interface QueryClaimGraphSnapshot {
  readonly profile: SemanticRuntimeInquiryProfile;
  readonly retentionKind: QueryClaimRetentionKind;
  readonly answerLocalKernelPolicy: QueryClaimAnswerLocalKernelPolicy;
  readonly createdRecords: number;
  readonly retainedRecords: number;
  readonly records: number;
  /** Retained root public query claims; nested child claims stay linked by parent/depth for composition x-rays. */
  readonly rootRecords: number;
  /** Retained non-root public query claims produced while materializing another answer. */
  readonly childRecords: number;
  /** Maximum retained nested answer depth; 0 means only root public queries are retained. */
  readonly maxDepth: number;
  /** Retained parent -> child answer dependency edges. */
  readonly retainedDependencyEdges: number;
  /** Distinct retained parent claim ids that currently own one or more child answer claims. */
  readonly distinctParentClaimIds: number;
  /** Distinct outcome keys retained for answer-value reuse checks. */
  readonly distinctOutcomeKeys: number;
  /** Distinct query-kind buckets retained in the graph-owned invalidation index. */
  readonly distinctQueryKinds: number;
  /** Distinct locus buckets retained in the graph-owned invalidation index. */
  readonly distinctLocusKeys: number;
  /** Distinct epoch/dependency buckets retained for source/app/session invalidation. */
  readonly distinctEpochKeys: number;
  /** Distinct materialization-policy buckets retained for projection cleanup. */
  readonly distinctMaterializationPolicies: number;
  /** Retained query-key character mass; use this before compacting query identity strings. */
  readonly retainedQueryKeyCharacters: number;
  /** Retained locus-key character mass. */
  readonly retainedLocusKeyCharacters: number;
  /** Retained epoch-key character mass. */
  readonly retainedEpochKeyCharacters: number;
  /** Retained outcome-key character mass. */
  readonly retainedOutcomeKeyCharacters: number;
  readonly pending: number;
  readonly answered: number;
  readonly failed: number;
  readonly disposed: number;
  readonly projectionOnly: number;
  readonly queryTypeProjection: number;
  readonly staticCatalog: number;
  readonly approximatePayloadBytes: number;
  readonly retainedAnswerBytes: number;
  readonly retainedAnswerValues: number;
  readonly retainedAnswerHits: number;
  readonly retainedRecordLimit: number | null;
  readonly budgetDisposedRecords: number;
  readonly retainedAnswerTotalByteLimit: number | null;
  readonly budgetDisposedAnswerValues: number;
  readonly budgetDisposedAnswerBytes: number;
  readonly rows: number;
  readonly rootKernelRecordDelta: number;
  readonly rootKernelProductDelta: number;
  readonly rootKernelProductDetailDelta: number;
  readonly rootKernelHotDetailDelta: number;
  readonly rootKernelHandleCharacterDelta: number;
  readonly allKernelRecordDelta: number;
  readonly allKernelProductDelta: number;
  readonly allKernelProductDetailDelta: number;
  readonly allKernelHotDetailDelta: number;
  readonly allKernelHandleCharacterDelta: number;
  readonly disposedKernelRecords: number;
  readonly disposedProductDetails: number;
  readonly disposedHotDetails: number;
  readonly disposedKernelHandleCharacters: number;
  readonly disposedQueryClaimRecords: number;
  readonly clearedTypeSystemDependencySourceFiles: number;
  readonly clearedTypeSystemDependencySourceTextCharacters: number;
  readonly clearedTypeSystemDependencyNodeModuleSourceFiles: number;
  readonly clearedTypeSystemDependencyNodeModuleSourceTextCharacters: number;
  readonly clearedTypeSystemDependencyDeclarationSourceFiles: number;
  readonly clearedTypeSystemDependencyDeclarationSourceTextCharacters: number;
  readonly clearedTypeSystemDependencyDefaultLibrarySourceFiles: number;
  readonly clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters: number;
  readonly clearedTypeSystemDependencyExternalDeclarationSourceFiles: number;
  readonly clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters: number;
  readonly netKernelRecordDelta: number;
  readonly netProductDetailDelta: number;
  readonly netHotDetailDelta: number;
  readonly netKernelHandleCharacterDelta: number;
}

export interface QueryClaimGraphDisposalSummary {
  readonly profile: SemanticRuntimeInquiryProfile;
  readonly reason: QueryClaimDisposalReason;
  readonly retentionKind: QueryClaimRetentionKind;
  readonly retentionKinds: readonly QueryClaimRetentionKind[];
  readonly materializationPolicies: readonly SemanticQueryMaterializationPolicy[];
  readonly queryKinds: readonly string[];
  readonly locusKeys: readonly string[];
  readonly epochKeys: readonly string[];
  readonly candidateRecords: number;
  readonly matchedRecords: number;
  readonly disposedRecords: number;
  readonly disposedPending: number;
  readonly disposedAnswered: number;
  readonly disposedFailed: number;
  readonly disposedProjectionOnly: number;
  readonly disposedQueryTypeProjection: number;
  readonly disposedStaticCatalog: number;
}

export class QueryAnswerClaim<TAnswer extends QueryClaimAnswerShape> {
  private resolved = false;

  constructor(
    private readonly graph: QueryClaimGraph,
    private readonly node: QueryClaimNode,
    private readonly materialize: () => TAnswer,
    private readonly boundary: QueryClaimAnswerBoundary = {},
  ) {}

  readAnswer(): TAnswer {
    if (this.resolved) {
      return this.graph.readRetainedClaimAnswer<TAnswer>(this.node);
    }
    const answer = this.graph.materializeNode(this.node, this.materialize, this.boundary);
    this.resolved = true;
    return answer;
  }
}

/**
 * Answer-facing claim graph for query outcomes.
 *
 * This sits between semantic construction and public API serialization. Durable app facts still belong in the kernel;
 * query claims explain what an answer spent or materialized, and give inquiry routing a place to apply
 * retention/disposal policy without turning every answer-local fact into a durable product.
 */
export class QueryClaimGraph {
  private nextId = 1;
  private nextSequence = 1;
  private readonly storage = new QueryClaimGraphStorage();
  private readonly activeStack: QueryClaimNode[] = [];
  private readonly counters = new QueryClaimGraphCounters();

  constructor(
    readonly profile: SemanticRuntimeInquiryProfile,
    readonly retentionPolicy: QueryClaimRetentionPolicy = queryClaimRetentionPolicyForProfile(profile),
  ) {}

  claim<TAnswer extends QueryClaimAnswerShape>(
    input: QueryClaimRequestInput,
    materialize: () => TAnswer,
    boundary: QueryClaimAnswerBoundary = {},
  ): QueryAnswerClaim<TAnswer> {
    const node = this.createNode(input);
    return new QueryAnswerClaim(this, node, materialize, boundary);
  }

  answer<TAnswer extends QueryClaimAnswerShape>(
    input: QueryClaimRequestInput,
    materialize: () => TAnswer,
    boundary: QueryClaimAnswerBoundary = {},
  ): TAnswer {
    if (boundary.shouldReuseRetainedAnswer?.() !== false) {
      const retained = this.readReusableRetainedAnswer<TAnswer>(input);
      if (retained != null) {
        this.counters.recordRetainedAnswerHit();
        this.applyAnswerSideEffectDisposal(retained.node, boundary);
        return retained.answer;
      }
    }
    return this.claim(input, materialize, boundary).readAnswer();
  }

  readRecords(): readonly QueryClaimRecord[] {
    return this.storage.readRecords();
  }

  readRecentRecords(limit: number): readonly QueryClaimRecord[] {
    return this.storage.readRecentRecords(limit);
  }

  dispose(policy: QueryClaimDisposalPolicy = queryClaimDisposalPolicy(QueryClaimDisposalReason.Manual)): number {
    return this.disposeWithSummary(policy).disposedRecords;
  }

  disposeWithSummary(
    policy: QueryClaimDisposalPolicy = queryClaimDisposalPolicy(QueryClaimDisposalReason.Manual),
  ): QueryClaimGraphDisposalSummary {
    let disposed = 0;
    let matched = 0;
    const counters = emptyQueryClaimDisposalCounters();
    const candidates = this.storage.candidateNodesForDisposalPolicy(policy);
    for (const node of candidates) {
      if (this.activeStack.includes(node)) {
        continue;
      }
      if (!node.matches(policy, this.retentionPolicy.retentionKind)) {
        continue;
      }
      if (!this.storage.hasNode(node)) {
        continue;
      }
      matched += 1;
      const disposedRecords = this.disposeRetainedNodeWithRecords(node, policy.reason);
      for (const record of disposedRecords) {
        recordQueryClaimDisposalShape(counters, record);
      }
      disposed += disposedRecords.length;
    }
    return {
      profile: this.profile,
      reason: policy.reason,
      retentionKind: this.retentionPolicy.retentionKind,
      retentionKinds: policy.retentionKinds ?? [],
      materializationPolicies: policy.materializationPolicies ?? [],
      queryKinds: policy.queryKinds ?? [],
      locusKeys: policy.locusKeys ?? [],
      epochKeys: policy.epochKeys ?? [],
      candidateRecords: candidates.length,
      matchedRecords: matched,
      disposedRecords: disposed,
      ...counters,
    };
  }

  disposeForSessionEnd(): number {
    return this.dispose(queryClaimSessionEndDisposalPolicy());
  }

  disposeForAppEpoch(): number {
    return this.dispose(queryClaimAppEpochDisposalPolicy());
  }

  disposeForSourceEpoch(epochKeys?: readonly string[]): number {
    return this.dispose(queryClaimSourceEpochDisposalPolicy(epochKeys));
  }

  disposeQueryTypeProjectionClaims(reason: QueryClaimDisposalReason = QueryClaimDisposalReason.Manual): number {
    return this.dispose(queryClaimQueryTypeProjectionDisposalPolicy(reason));
  }

  snapshot(): QueryClaimGraphSnapshot {
    const indexes = this.storage.readIndexCardinality();
    const keyCharacters = this.storage.readKeyCharacters();
    const retainedShape = this.storage.readRetainedShape();
    return {
      profile: this.profile,
      retentionKind: this.retentionPolicy.retentionKind,
      answerLocalKernelPolicy: this.retentionPolicy.answerLocalKernelPolicy,
      createdRecords: this.counters.createdRecords,
      retainedRecords: this.storage.retainedCount,
      records: this.storage.retainedCount,
      rootRecords: retainedShape.rootRecords,
      childRecords: this.storage.retainedCount - retainedShape.rootRecords,
      maxDepth: retainedShape.maxDepth,
      retainedDependencyEdges: retainedShape.dependencyEdges,
      distinctParentClaimIds: retainedShape.parentClaimIds,
      distinctOutcomeKeys: indexes.outcomeKeys,
      distinctQueryKinds: indexes.queryKinds,
      distinctLocusKeys: indexes.locusKeys,
      distinctEpochKeys: indexes.epochKeys,
      distinctMaterializationPolicies: indexes.materializationPolicies,
      retainedQueryKeyCharacters: keyCharacters.queryKeyCharacters,
      retainedLocusKeyCharacters: keyCharacters.locusKeyCharacters,
      retainedEpochKeyCharacters: keyCharacters.epochKeyCharacters,
      retainedOutcomeKeyCharacters: keyCharacters.outcomeKeyCharacters,
      pending: retainedShape.pending,
      answered: this.counters.answeredRecords,
      failed: this.counters.failedRecords,
      disposed: this.counters.disposedRecords,
      projectionOnly: this.counters.projectionOnly,
      queryTypeProjection: this.counters.queryTypeProjection,
      staticCatalog: this.counters.staticCatalog,
      approximatePayloadBytes: this.counters.approximatePayloadBytes,
      retainedAnswerBytes: retainedShape.retainedAnswerBytes,
      retainedAnswerValues: retainedShape.retainedAnswerValues,
      retainedAnswerHits: this.counters.retainedAnswerHits,
      retainedRecordLimit: this.retentionPolicy.retainedRecordLimit,
      budgetDisposedRecords: this.counters.budgetDisposedRecords,
      retainedAnswerTotalByteLimit: this.retentionPolicy.retainedAnswerTotalByteLimit,
      budgetDisposedAnswerValues: this.counters.budgetDisposedAnswerValues,
      budgetDisposedAnswerBytes: this.counters.budgetDisposedAnswerBytes,
      rows: this.counters.rows,
      rootKernelRecordDelta: this.counters.rootKernelRecordDelta,
      rootKernelProductDelta: this.counters.rootKernelProductDelta,
      rootKernelProductDetailDelta: this.counters.rootKernelProductDetailDelta,
      rootKernelHotDetailDelta: this.counters.rootKernelHotDetailDelta,
      rootKernelHandleCharacterDelta: this.counters.rootKernelHandleCharacterDelta,
      allKernelRecordDelta: this.counters.allKernelRecordDelta,
      allKernelProductDelta: this.counters.allKernelProductDelta,
      allKernelProductDetailDelta: this.counters.allKernelProductDetailDelta,
      allKernelHotDetailDelta: this.counters.allKernelHotDetailDelta,
      allKernelHandleCharacterDelta: this.counters.allKernelHandleCharacterDelta,
      disposedKernelRecords: this.counters.disposedKernelRecords,
      disposedProductDetails: this.counters.disposedProductDetails,
      disposedHotDetails: this.counters.disposedHotDetails,
      disposedKernelHandleCharacters: this.counters.disposedKernelHandleCharacters,
      disposedQueryClaimRecords: this.counters.disposedQueryClaimRecords,
      clearedTypeSystemDependencySourceFiles: this.counters.clearedTypeSystemDependencySourceFiles,
      clearedTypeSystemDependencySourceTextCharacters: this.counters.clearedTypeSystemDependencySourceTextCharacters,
      clearedTypeSystemDependencyNodeModuleSourceFiles: this.counters.clearedTypeSystemDependencyNodeModuleSourceFiles,
      clearedTypeSystemDependencyNodeModuleSourceTextCharacters: this.counters.clearedTypeSystemDependencyNodeModuleSourceTextCharacters,
      clearedTypeSystemDependencyDeclarationSourceFiles: this.counters.clearedTypeSystemDependencyDeclarationSourceFiles,
      clearedTypeSystemDependencyDeclarationSourceTextCharacters: this.counters.clearedTypeSystemDependencyDeclarationSourceTextCharacters,
      clearedTypeSystemDependencyDefaultLibrarySourceFiles: this.counters.clearedTypeSystemDependencyDefaultLibrarySourceFiles,
      clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters: this.counters.clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters,
      clearedTypeSystemDependencyExternalDeclarationSourceFiles: this.counters.clearedTypeSystemDependencyExternalDeclarationSourceFiles,
      clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters: this.counters.clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters,
      netKernelRecordDelta: this.counters.rootKernelRecordDelta - this.counters.disposedKernelRecords,
      netProductDetailDelta: this.counters.rootKernelProductDetailDelta - this.counters.disposedProductDetails,
      netHotDetailDelta: this.counters.rootKernelHotDetailDelta - this.counters.disposedHotDetails,
      netKernelHandleCharacterDelta:
        this.counters.rootKernelHandleCharacterDelta - this.counters.disposedKernelHandleCharacters,
    };
  }

  materializeNode<TAnswer extends QueryClaimAnswerShape>(
    node: QueryClaimNode,
    materialize: () => TAnswer,
    boundary: QueryClaimAnswerBoundary,
  ): TAnswer {
    if (node.isDisposed()) {
      throw new Error(
        `Cannot materialize disposed query claim '${node.queryKind}' at locus '${node.locusKey}'.`,
      );
    }
    const marker = boundary.readKernelMarker?.() ?? null;
    const before = boundary.readKernelSnapshot?.() ?? null;
    this.activeStack.push(node);
    let answer: TAnswer | null = null;
    let failed = false;
    let failure: unknown = null;
    try {
      answer = materialize();
    } catch (error) {
      const after = boundary.readKernelSnapshot?.() ?? null;
      this.failNode(node, error, kernelDelta(before, after));
      this.applyAnswerLocalKernelPolicy(node, marker, boundary);
      this.applyAnswerSideEffectDisposal(node, boundary);
      failed = true;
      failure = error;
    } finally {
      this.activeStack.pop();
    }
    if (failed) {
      this.enforceRetainedRecordLimit();
      throw failure;
    }
    const resolvedAnswer = answer as TAnswer;
    const after = boundary.readKernelSnapshot?.() ?? null;
    const approximatePayloadBytes = approximateQueryAnswerPayloadBytes(resolvedAnswer);
    const rowCount = queryAnswerRowCount(resolvedAnswer.value);
    const delta = kernelDelta(before, after);
    node.resolve({
      outcome: resolvedAnswer.outcome,
      summary: this.retentionPolicy.retainAnswerSummary ? resolvedAnswer.summary : null,
      approximatePayloadBytes: this.retentionPolicy.retainPayloadShape ? approximatePayloadBytes : 0,
      rowCount: this.retentionPolicy.retainPayloadShape ? rowCount : 0,
      retainedAnswerValue: this.shouldRetainAnswerValue(node, approximatePayloadBytes),
      kernelDelta: delta,
    });
    this.counters.recordAnswered(node);
    this.applyAnswerLocalKernelPolicy(node, marker, boundary);
    this.applyAnswerSideEffectDisposal(node, boundary);
    if (node.retainedAnswerValue) {
      this.storage.retainAnswerValue(node, resolvedAnswer);
    }
    if (this.retentionPolicy.retentionKind === QueryClaimRetentionKind.DiscardAfterAnswer) {
      this.disposeRetainedNode(node, QueryClaimDisposalReason.AnswerDiscarded);
    }
    this.enforceRetainedRecordLimit();
    this.enforceRetainedAnswerValueByteLimit();
    return resolvedAnswer;
  }

  readRetainedClaimAnswer<TAnswer extends QueryClaimAnswerShape>(
    node: QueryClaimNode,
  ): TAnswer {
    if (node.isDisposed()) {
      throw new Error(
        `Cannot read disposed query claim '${node.queryKind}' at locus '${node.locusKey}'.`,
      );
    }
    const answer = node.readRetainedAnswer<TAnswer>();
    if (answer == null) {
      throw new Error(
        `Cannot reread query claim '${node.queryKind}' at locus '${node.locusKey}' because this inquiry profile does not retain answer values.`,
      );
    }
    return answer;
  }

  private applyAnswerLocalKernelPolicy(
    node: QueryClaimNode,
    marker: KernelStoreMarker | null,
    boundary: QueryClaimAnswerBoundary,
  ): void {
    if (
      this.retentionPolicy.answerLocalKernelPolicy === QueryClaimAnswerLocalKernelPolicy.RetainInOwnerEpoch
      || marker == null
      || boundary.disposeKernelSince == null
    ) {
      return;
    }
    const disposal = boundary.disposeKernelSince(marker);
    node.recordKernelDisposal(disposal);
    this.counters.recordKernelDisposal(disposal);
  }

  private applyAnswerSideEffectDisposal(
    node: QueryClaimNode,
    boundary: QueryClaimAnswerBoundary,
  ): void {
    const disposal = boundary.disposeAnswerSideEffects?.() ?? null;
    if (disposal == null) {
      return;
    }
    if (disposal.kernel != null) {
      node.recordKernelDisposal(disposal.kernel);
      this.counters.recordKernelDisposal(disposal.kernel);
    }
    if (disposal.queryClaims != null && disposal.queryClaims > 0) {
      node.recordQueryClaimDisposal(disposal.queryClaims);
      this.counters.recordQueryClaimDisposal(disposal.queryClaims);
    }
    if (disposal.typeSystemDependencyCache != null) {
      node.recordTypeSystemDependencyCacheDisposal(disposal.typeSystemDependencyCache);
      this.counters.recordTypeSystemDependencyCacheDisposal(disposal.typeSystemDependencyCache);
    }
  }

  private failNode(
    node: QueryClaimNode,
    error: unknown,
    delta: QueryClaimKernelDelta,
  ): void {
    node.fail(errorSummary(error), delta);
    this.counters.recordFailed(node);
    if (this.retentionPolicy.retentionKind === QueryClaimRetentionKind.DiscardAfterAnswer) {
      this.disposeRetainedNode(node, QueryClaimDisposalReason.AnswerDiscarded);
    }
  }

  private createNode(input: QueryClaimRequestInput): QueryClaimNode {
    const parent = this.activeStack[this.activeStack.length - 1] ?? null;
    const node = new QueryClaimNode(
      this.nextId,
      this.nextSequence,
      parent?.id ?? null,
      this.activeStack.length,
      input.queryKind,
      input.queryKey,
      input.locusKey,
      normalizeQueryClaimEpochKeys(input),
      input.materializationPolicy,
    );
    this.nextId += 1;
    this.nextSequence += 1;
    this.counters.recordCreated(node);
    this.retainNode(node);
    return node;
  }

  private readReusableRetainedAnswer<TAnswer extends QueryClaimAnswerShape>(
    input: QueryClaimRequestInput,
  ): { readonly node: QueryClaimNode; readonly answer: TAnswer } | null {
    if (!this.canRetainAnswerValueForPolicy(input.materializationPolicy)) {
      return null;
    }
    return this.storage.readReusableRetainedAnswer(input);
  }

  private canRetainAnswerValueForPolicy(
    materializationPolicy: SemanticQueryMaterializationPolicy,
  ): boolean {
    return this.retentionPolicy.retainAnswerValue
      && this.retentionPolicy.retainedAnswerMaterializationPolicies.includes(materializationPolicy);
  }

  private retainNode(node: QueryClaimNode): void {
    this.storage.retainNode(node);
  }

  private enforceRetainedRecordLimit(): void {
    const limit = this.retentionPolicy.retainedRecordLimit;
    if (limit == null || limit < 0) {
      return;
    }
    while (this.storage.retainedCount > limit) {
      const node = this.storage.findFirstRetainBudgetDisposable(this.activeStack);
      if (node == null) {
        return;
      }
      this.disposeRetainedNode(node, QueryClaimDisposalReason.RetentionBudgetExceeded);
    }
  }

  private enforceRetainedAnswerValueByteLimit(): void {
    const limit = this.retentionPolicy.retainedAnswerTotalByteLimit;
    if (limit == null || limit < 0) {
      return;
    }
    while (this.storage.retainedAnswerBytes > limit) {
      const node = this.storage.findFirstRetainedAnswerValueDisposable(this.activeStack);
      if (node == null) {
        return;
      }
      const disposedBytes = this.storage.disposeRetainedAnswerValue(node);
      this.counters.recordBudgetDisposedAnswerValue(disposedBytes);
    }
  }

  private disposeRetainedNode(node: QueryClaimNode, reason: QueryClaimDisposalReason): number {
    return this.disposeRetainedNodeWithRecords(node, reason).length;
  }

  private disposeRetainedNodeWithRecords(node: QueryClaimNode, reason: QueryClaimDisposalReason): readonly QueryClaimRecord[] {
    const records: QueryClaimRecord[] = [];
    for (const dependent of this.storage.retainedDependentAncestorsFor(node)) {
      if (this.activeStack.includes(dependent)) {
        continue;
      }
      const record = this.disposeSingleRetainedNode(dependent, reason);
      if (record != null) {
        records.push(record);
      }
    }
    const record = this.disposeSingleRetainedNode(node, reason);
    if (record != null) {
      records.push(record);
    }
    return records;
  }

  private disposeSingleRetainedNode(node: QueryClaimNode, reason: QueryClaimDisposalReason): QueryClaimRecord | null {
    if (!this.storage.hasNode(node)) {
      return null;
    }
    const record = node.toRecord();
    if (!this.storage.removeNode(node)) {
      return null;
    }
    node.dispose(reason);
    this.counters.recordDisposed(node, reason);
    return record;
  }

  private shouldRetainAnswerValue(
    node: QueryClaimNode,
    approximatePayloadBytes: number,
  ): boolean {
    return this.canRetainAnswerValueForPolicy(node.materializationPolicy)
      && approximatePayloadBytes <= this.retentionPolicy.retainedAnswerByteLimit;
  }
}

interface QueryClaimGraphIndexCardinality {
  readonly outcomeKeys: number;
  readonly queryKinds: number;
  readonly locusKeys: number;
  readonly epochKeys: number;
  readonly materializationPolicies: number;
}

interface QueryClaimGraphKeyCharacters {
  readonly queryKeyCharacters: number;
  readonly locusKeyCharacters: number;
  readonly epochKeyCharacters: number;
  readonly outcomeKeyCharacters: number;
}

interface QueryClaimGraphRetainedShape {
  readonly pending: number;
  readonly rootRecords: number;
  readonly maxDepth: number;
  readonly dependencyEdges: number;
  readonly parentClaimIds: number;
  readonly retainedAnswerValues: number;
  readonly retainedAnswerBytes: number;
}

/**
 * Retained query-outcome storage plus invalidation indexes.
 *
 * The graph owns materialization and policy decisions; this object owns the indexed answer-history shape that makes
 * reuse, source invalidation, query-family disposal, and retention-budget pruning graph-owned instead of adapter scans.
 */
class QueryClaimGraphStorage {
  private readonly nodes: QueryClaimNode[] = [];
  private readonly nodesById = new Map<number, QueryClaimNode>();
  private readonly childNodesByParentId = new Map<number, QueryClaimNode[]>();
  private readonly nodesByOutcomeKey = new Map<string, QueryClaimNode[]>();
  private readonly nodesByQueryKind = new Map<string, QueryClaimNode[]>();
  private readonly nodesByLocusKey = new Map<string, QueryClaimNode[]>();
  private readonly nodesByEpochKey = new Map<string, QueryClaimNode[]>();
  private readonly nodesByMaterializationPolicy = new Map<SemanticQueryMaterializationPolicy, QueryClaimNode[]>();
  private retainedAnswerByteTotal = 0;

  get retainedCount(): number {
    return this.nodes.length;
  }

  get retainedAnswerBytes(): number {
    return this.retainedAnswerByteTotal;
  }

  readRecords(): readonly QueryClaimRecord[] {
    return this.nodes.map((node) => node.toRecord());
  }

  readRecentRecords(limit: number): readonly QueryClaimRecord[] {
    if (limit <= 0) {
      return [];
    }
    return this.nodes
      .slice(Math.max(0, this.nodes.length - limit))
      .map((node) => node.toRecord());
  }

  readIndexCardinality(): QueryClaimGraphIndexCardinality {
    return {
      outcomeKeys: this.nodesByOutcomeKey.size,
      queryKinds: this.nodesByQueryKind.size,
      locusKeys: this.nodesByLocusKey.size,
      epochKeys: this.nodesByEpochKey.size,
      materializationPolicies: this.nodesByMaterializationPolicy.size,
    };
  }

  readKeyCharacters(): QueryClaimGraphKeyCharacters {
    let queryKeyCharacters = 0;
    let locusKeyCharacters = 0;
    let epochKeyCharacters = 0;
    let outcomeKeyCharacters = 0;
    for (const node of this.nodes) {
      queryKeyCharacters += node.queryKey.length;
      locusKeyCharacters += node.locusKey.length;
      outcomeKeyCharacters += node.outcomeKey.length;
      for (const epochKey of node.epochKeys) {
        epochKeyCharacters += epochKey.length;
      }
    }
    return {
      queryKeyCharacters,
      locusKeyCharacters,
      epochKeyCharacters,
      outcomeKeyCharacters,
    };
  }

  readRetainedShape(): QueryClaimGraphRetainedShape {
    let pending = 0;
    let rootRecords = 0;
    let maxDepth = 0;
    let retainedAnswerValues = 0;
    for (const node of this.nodes) {
      if (node.isPending()) {
        pending += 1;
      }
      if (node.depth === 0) {
        rootRecords += 1;
      }
      maxDepth = Math.max(maxDepth, node.depth);
      if (node.retainedAnswerValue) {
        retainedAnswerValues += 1;
      }
    }
    return {
      pending,
      rootRecords,
      maxDepth,
      dependencyEdges: this.readDependencyEdgeCount(),
      parentClaimIds: this.childNodesByParentId.size,
      retainedAnswerValues,
      retainedAnswerBytes: this.retainedAnswerByteTotal,
    };
  }

  retainNode(node: QueryClaimNode): void {
    this.nodes.push(node);
    this.nodesById.set(node.id, node);
    if (node.parentId != null) {
      addNodeToIndex(this.childNodesByParentId, node.parentId, node);
    }
    addNodeToIndex(this.nodesByOutcomeKey, node.outcomeKey, node);
    addNodeToIndex(this.nodesByQueryKind, node.queryKind, node);
    addNodeToIndex(this.nodesByLocusKey, node.locusKey, node);
    addNodeToIndex(this.nodesByMaterializationPolicy, node.materializationPolicy, node);
    for (const epochKey of node.epochKeys) {
      addNodeToIndex(this.nodesByEpochKey, epochKey, node);
    }
  }

  removeNode(node: QueryClaimNode): boolean {
    const index = this.nodes.indexOf(node);
    if (index < 0) {
      return false;
    }
    this.disposeRetainedAnswerValue(node);
    this.nodes.splice(index, 1);
    this.removeNodeFromIndexes(node);
    return true;
  }

  hasNode(node: QueryClaimNode): boolean {
    return this.nodesById.get(node.id) === node;
  }

  retainedDependentAncestorsFor(node: QueryClaimNode): readonly QueryClaimNode[] {
    const dependents: QueryClaimNode[] = [];
    const seen = new Set<number>([node.id]);
    let parentId = node.parentId;
    while (parentId != null) {
      const parent = this.nodesById.get(parentId);
      if (parent == null || seen.has(parent.id)) {
        break;
      }
      dependents.push(parent);
      seen.add(parent.id);
      parentId = parent.parentId;
    }
    return dependents;
  }

  retainAnswerValue<TAnswer extends QueryClaimAnswerShape>(
    node: QueryClaimNode,
    answer: TAnswer,
  ): void {
    node.retainAnswer(answer);
    this.retainedAnswerByteTotal += node.approximateRetainedAnswerBytes;
  }

  disposeRetainedAnswerValue(node: QueryClaimNode): number {
    const disposedBytes = node.disposeRetainedAnswerValue();
    this.retainedAnswerByteTotal = Math.max(0, this.retainedAnswerByteTotal - disposedBytes);
    return disposedBytes;
  }

  readReusableRetainedAnswer<TAnswer extends QueryClaimAnswerShape>(
    input: QueryClaimRequestInput,
  ): { readonly node: QueryClaimNode; readonly answer: TAnswer } | null {
    const candidates = this.nodesByOutcomeKey.get(queryClaimOutcomeKey(input)) ?? [];
    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      const node = candidates[index];
      if (node?.canReuseAnswer(input) !== true) {
        continue;
      }
      const answer = node.readRetainedAnswer<TAnswer>();
      if (answer != null) {
        return {
          node,
          answer,
        };
      }
    }
    return null;
  }

  findFirstRetainBudgetDisposable(activeStack: readonly QueryClaimNode[]): QueryClaimNode | null {
    return this.nodes.find((node) =>
      node.isRetainBudgetDisposable() && !activeStack.includes(node)
    ) ?? null;
  }

  findFirstRetainedAnswerValueDisposable(activeStack: readonly QueryClaimNode[]): QueryClaimNode | null {
    return this.nodes.find((node) =>
      node.retainedAnswerValue && !activeStack.includes(node)
    ) ?? null;
  }

  candidateNodesForDisposalPolicy(policy: QueryClaimDisposalPolicy): readonly QueryClaimNode[] {
    const buckets: QueryClaimNode[][] = [];
    this.collectIndexedBuckets(buckets, this.nodesByMaterializationPolicy, policy.materializationPolicies);
    this.collectIndexedBuckets(buckets, this.nodesByQueryKind, policy.queryKinds);
    this.collectIndexedBuckets(buckets, this.nodesByLocusKey, policy.locusKeys);
    this.collectIndexedBuckets(buckets, this.nodesByEpochKey, policy.epochKeys);
    if (buckets.length === 0) {
      return [...this.nodes].reverse();
    }
    const smallestBucket = buckets.reduce((smallest, bucket) =>
      bucket.length < smallest.length ? bucket : smallest
    );
    return [...new Set(smallestBucket)].reverse();
  }

  private collectIndexedBuckets<TKey extends string>(
    target: QueryClaimNode[][],
    index: ReadonlyMap<TKey, QueryClaimNode[]>,
    keys: readonly TKey[] | undefined,
  ): void {
    if (keys == null) {
      return;
    }
    const combined: QueryClaimNode[] = [];
    for (const key of keys) {
      combined.push(...(index.get(key) ?? []));
    }
    target.push(combined);
  }

  private removeNodeFromIndexes(node: QueryClaimNode): void {
    this.nodesById.delete(node.id);
    if (node.parentId != null) {
      removeNodeFromIndex(this.childNodesByParentId, node.parentId, node);
    }
    removeNodeFromIndex(this.nodesByOutcomeKey, node.outcomeKey, node);
    removeNodeFromIndex(this.nodesByQueryKind, node.queryKind, node);
    removeNodeFromIndex(this.nodesByLocusKey, node.locusKey, node);
    removeNodeFromIndex(this.nodesByMaterializationPolicy, node.materializationPolicy, node);
    for (const epochKey of node.epochKeys) {
      removeNodeFromIndex(this.nodesByEpochKey, epochKey, node);
    }
  }

  private readDependencyEdgeCount(): number {
    let edges = 0;
    for (const bucket of this.childNodesByParentId.values()) {
      edges += bucket.length;
    }
    return edges;
  }
}

class QueryClaimNode {
  private evaluationState = QueryClaimEvaluationState.Pending;
  private outcome: string | null = null;
  private summary: string | null = null;
  private approximatePayloadBytes = 0;
  private rowCount = 0;
  private retainedAnswer: QueryClaimAnswerShape | null = null;
  private disposalReason: QueryClaimDisposalReason | null = null;
  private kernelDelta = emptyKernelDelta();
  private kernelDisposal = emptyKernelDisposal();
  private queryClaimDisposalRecords = 0;
  private typeSystemDependencyCacheClearPolicy: string | null = null;
  private clearedTypeSystemDependencySourceFiles = 0;
  private clearedTypeSystemDependencySourceTextCharacters = 0;
  private clearedTypeSystemDependencyNodeModuleSourceFiles = 0;
  private clearedTypeSystemDependencyNodeModuleSourceTextCharacters = 0;
  private clearedTypeSystemDependencyDeclarationSourceFiles = 0;
  private clearedTypeSystemDependencyDeclarationSourceTextCharacters = 0;
  private clearedTypeSystemDependencyDefaultLibrarySourceFiles = 0;
  private clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters = 0;
  private clearedTypeSystemDependencyExternalDeclarationSourceFiles = 0;
  private clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters = 0;
  retainedAnswerValue = false;

  constructor(
    readonly id: number,
    readonly sequence: number,
    readonly parentId: number | null,
    readonly depth: number,
    readonly queryKind: string,
    readonly queryKey: string,
    readonly locusKey: string,
    readonly epochKeys: readonly string[],
    readonly materializationPolicy: SemanticQueryMaterializationPolicy,
  ) {}

  get outcomeKey(): string {
    return queryClaimOutcomeKey({
      queryKind: this.queryKind,
      queryKey: this.queryKey,
      locusKey: this.locusKey,
      materializationPolicy: this.materializationPolicy,
    });
  }

  get approximateRetainedAnswerBytes(): number {
    return this.retainedAnswerValue ? this.approximatePayloadBytes : 0;
  }

  resolve(shape: {
    readonly outcome: string;
    readonly summary: string | null;
    readonly approximatePayloadBytes: number;
    readonly rowCount: number;
    readonly retainedAnswerValue: boolean;
    readonly kernelDelta: QueryClaimKernelDelta;
  }): void {
    this.evaluationState = QueryClaimEvaluationState.Answered;
    this.outcome = shape.outcome;
    this.summary = shape.summary;
    this.approximatePayloadBytes = shape.approximatePayloadBytes;
    this.rowCount = shape.rowCount;
    this.retainedAnswerValue = shape.retainedAnswerValue;
    this.kernelDelta = shape.kernelDelta;
  }

  fail(
    summary: string,
    kernelDelta: QueryClaimKernelDelta,
  ): void {
    this.evaluationState = QueryClaimEvaluationState.Failed;
    this.outcome = 'failed';
    this.summary = summary;
    this.kernelDelta = kernelDelta;
  }

  retainAnswer<TAnswer extends QueryClaimAnswerShape>(answer: TAnswer): TAnswer {
    this.retainedAnswer = answer;
    return answer;
  }

  readRetainedAnswer<TAnswer extends QueryClaimAnswerShape>(): TAnswer | null {
    return this.retainedAnswerValue ? this.retainedAnswer as TAnswer | null : null;
  }

  disposeRetainedAnswerValue(): number {
    if (!this.retainedAnswerValue) {
      return 0;
    }
    const bytes = this.approximatePayloadBytes;
    this.retainedAnswer = null;
    this.retainedAnswerValue = false;
    return bytes;
  }

  dispose(reason: QueryClaimDisposalReason): void {
    this.evaluationState = QueryClaimEvaluationState.Disposed;
    this.retainedAnswer = null;
    this.retainedAnswerValue = false;
    this.disposalReason = reason;
  }

  isDisposed(): boolean {
    return this.evaluationState === QueryClaimEvaluationState.Disposed;
  }

  isPending(): boolean {
    return this.evaluationState === QueryClaimEvaluationState.Pending;
  }

  recordKernelDisposal(disposal: KernelStoreDisposalSummary): void {
    this.kernelDisposal = {
      records: this.kernelDisposal.records + disposal.records,
      productDetails: this.kernelDisposal.productDetails + disposal.productDetails,
      hotDetails: this.kernelDisposal.hotDetails + disposal.hotDetails,
      handleCharacters: this.kernelDisposal.handleCharacters + disposal.handleCharacters,
    };
  }

  recordQueryClaimDisposal(records: number): void {
    this.queryClaimDisposalRecords += records;
  }

  recordTypeSystemDependencyCacheDisposal(disposal: QueryClaimTypeSystemDependencyCacheDisposalSummary): void {
    this.typeSystemDependencyCacheClearPolicy = disposal.policy;
    this.clearedTypeSystemDependencySourceFiles += disposal.sourceFiles;
    this.clearedTypeSystemDependencySourceTextCharacters += disposal.sourceTextCharacters;
    this.clearedTypeSystemDependencyNodeModuleSourceFiles += disposal.nodeModuleSourceFiles;
    this.clearedTypeSystemDependencyNodeModuleSourceTextCharacters += disposal.nodeModuleSourceTextCharacters;
    this.clearedTypeSystemDependencyDeclarationSourceFiles += disposal.declarationSourceFiles;
    this.clearedTypeSystemDependencyDeclarationSourceTextCharacters += disposal.declarationSourceTextCharacters;
    this.clearedTypeSystemDependencyDefaultLibrarySourceFiles += disposal.defaultLibrarySourceFiles;
    this.clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters += disposal.defaultLibrarySourceTextCharacters;
    this.clearedTypeSystemDependencyExternalDeclarationSourceFiles += disposal.externalDeclarationSourceFiles;
    this.clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters += disposal.externalDeclarationSourceTextCharacters;
  }

  matches(
    policy: QueryClaimDisposalPolicy,
    retentionKind: QueryClaimRetentionKind,
  ): boolean {
    return includesIfPresent(policy.retentionKinds, retentionKind)
      && includesIfPresent(policy.materializationPolicies, this.materializationPolicy)
      && includesIfPresent(policy.queryKinds, this.queryKind)
      && includesIfPresent(policy.locusKeys, this.locusKey)
      && intersectsIfPresent(policy.epochKeys, this.epochKeys);
  }

  canReuseAnswer(input: QueryClaimRequestInput): boolean {
    const epochKeys = normalizeQueryClaimEpochKeys(input);
    return this.evaluationState === QueryClaimEvaluationState.Answered
      && this.retainedAnswerValue
      && this.queryKind === input.queryKind
      && this.queryKey === input.queryKey
      && this.locusKey === input.locusKey
      && this.materializationPolicy === input.materializationPolicy
      && sameQueryClaimEpochKeys(this.epochKeys, epochKeys);
  }

  isRetainBudgetDisposable(): boolean {
    return this.evaluationState === QueryClaimEvaluationState.Answered
      || this.evaluationState === QueryClaimEvaluationState.Failed;
  }

  toRecord(): QueryClaimRecord {
    return {
      id: this.id,
      sequence: this.sequence,
      parentId: this.parentId,
      depth: this.depth,
      queryKind: this.queryKind,
      queryKey: this.queryKey,
      locusKey: this.locusKey,
      epochKeys: this.epochKeys,
      materializationPolicy: this.materializationPolicy,
      evaluationState: this.evaluationState,
      outcome: this.outcome,
      summary: this.summary,
      approximatePayloadBytes: this.approximatePayloadBytes,
      rowCount: this.rowCount,
      retainedAnswerValue: this.retainedAnswerValue,
      disposalReason: this.disposalReason,
      kernelRecordDelta: this.kernelDelta.totalRecords,
      kernelProductDelta: this.kernelDelta.products,
      kernelProductDetailDelta: this.kernelDelta.productDetails,
      kernelHotDetailDelta: this.kernelDelta.hotDetails,
      kernelHandleCharacterDelta: this.kernelDelta.handleCharacters,
      disposedKernelRecords: this.kernelDisposal.records,
      disposedProductDetails: this.kernelDisposal.productDetails,
      disposedHotDetails: this.kernelDisposal.hotDetails,
      disposedKernelHandleCharacters: this.kernelDisposal.handleCharacters,
      disposedQueryClaimRecords: this.queryClaimDisposalRecords,
      clearedTypeSystemDependencySourceFiles: this.clearedTypeSystemDependencySourceFiles,
      clearedTypeSystemDependencySourceTextCharacters: this.clearedTypeSystemDependencySourceTextCharacters,
      clearedTypeSystemDependencyNodeModuleSourceFiles: this.clearedTypeSystemDependencyNodeModuleSourceFiles,
      clearedTypeSystemDependencyNodeModuleSourceTextCharacters: this.clearedTypeSystemDependencyNodeModuleSourceTextCharacters,
      clearedTypeSystemDependencyDeclarationSourceFiles: this.clearedTypeSystemDependencyDeclarationSourceFiles,
      clearedTypeSystemDependencyDeclarationSourceTextCharacters: this.clearedTypeSystemDependencyDeclarationSourceTextCharacters,
      clearedTypeSystemDependencyDefaultLibrarySourceFiles: this.clearedTypeSystemDependencyDefaultLibrarySourceFiles,
      clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters: this.clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters,
      clearedTypeSystemDependencyExternalDeclarationSourceFiles: this.clearedTypeSystemDependencyExternalDeclarationSourceFiles,
      clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters: this.clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters,
      typeSystemDependencyCacheClearPolicy: this.typeSystemDependencyCacheClearPolicy,
      netKernelRecordDelta: this.kernelDelta.totalRecords - this.kernelDisposal.records,
      netProductDetailDelta: this.kernelDelta.productDetails - this.kernelDisposal.productDetails,
      netHotDetailDelta: this.kernelDelta.hotDetails - this.kernelDisposal.hotDetails,
      netKernelHandleCharacterDelta: this.kernelDelta.handleCharacters - this.kernelDisposal.handleCharacters,
    };
  }

  readCounters(): QueryClaimCounterInput {
    return {
      materializationPolicy: this.materializationPolicy,
      approximatePayloadBytes: this.approximatePayloadBytes,
      rowCount: this.rowCount,
      retainedAnswerValue: this.retainedAnswerValue,
      depth: this.depth,
      kernelDelta: this.kernelDelta,
    };
  }
}

function queryClaimOutcomeKey(input: QueryClaimRequestInput): string {
  return [
    input.materializationPolicy,
    input.queryKind,
    input.queryKey,
    input.locusKey,
  ].join('\u0000');
}

function normalizeQueryClaimEpochKeys(input: QueryClaimRequestInput): readonly string[] {
  const epochKeys = input.epochKeys ?? [input.locusKey];
  return [...new Set(epochKeys.filter((key) => key.length > 0))].sort();
}

function sameQueryClaimEpochKeys(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length
    && left.every((key, index) => key === right[index]);
}

function addNodeToIndex<TKey extends string | number>(
  index: Map<TKey, QueryClaimNode[]>,
  key: TKey,
  node: QueryClaimNode,
): void {
  let bucket = index.get(key);
  if (bucket === undefined) {
    bucket = [];
    index.set(key, bucket);
  }
  bucket.push(node);
}

function removeNodeFromIndex<TKey extends string | number>(
  index: Map<TKey, QueryClaimNode[]>,
  key: TKey,
  node: QueryClaimNode,
): void {
  const bucket = index.get(key);
  if (bucket == null) {
    return;
  }
  const nodeIndex = bucket.indexOf(node);
  if (nodeIndex >= 0) {
    bucket.splice(nodeIndex, 1);
  }
  if (bucket.length === 0) {
    index.delete(key);
  }
}

interface QueryClaimKernelDelta {
  readonly totalRecords: number;
  readonly products: number;
  readonly productDetails: number;
  readonly hotDetails: number;
  readonly handleCharacters: number;
}

interface QueryClaimCounterInput {
  readonly materializationPolicy: SemanticQueryMaterializationPolicy;
  readonly approximatePayloadBytes: number;
  readonly rowCount: number;
  readonly retainedAnswerValue: boolean;
  readonly depth: number;
  readonly kernelDelta: QueryClaimKernelDelta;
}

interface QueryClaimDisposalCounters {
  disposedPending: number;
  disposedAnswered: number;
  disposedFailed: number;
  disposedProjectionOnly: number;
  disposedQueryTypeProjection: number;
  disposedStaticCatalog: number;
}

function emptyQueryClaimDisposalCounters(): QueryClaimDisposalCounters {
  return {
    disposedPending: 0,
    disposedAnswered: 0,
    disposedFailed: 0,
    disposedProjectionOnly: 0,
    disposedQueryTypeProjection: 0,
    disposedStaticCatalog: 0,
  };
}

function recordQueryClaimDisposalShape(
  counters: QueryClaimDisposalCounters,
  record: QueryClaimRecord,
): void {
  switch (record.evaluationState) {
    case QueryClaimEvaluationState.Pending:
      counters.disposedPending += 1;
      break;
    case QueryClaimEvaluationState.Answered:
      counters.disposedAnswered += 1;
      break;
    case QueryClaimEvaluationState.Failed:
      counters.disposedFailed += 1;
      break;
    case QueryClaimEvaluationState.Disposed:
      break;
  }
  switch (record.materializationPolicy) {
    case 'projection-only':
      counters.disposedProjectionOnly += 1;
      break;
    case 'query-type-projection':
      counters.disposedQueryTypeProjection += 1;
      break;
    case 'static-catalog':
      counters.disposedStaticCatalog += 1;
      break;
  }
}

class QueryClaimGraphCounters {
  createdRecords = 0;
  answeredRecords = 0;
  failedRecords = 0;
  disposedRecords = 0;
  projectionOnly = 0;
  queryTypeProjection = 0;
  staticCatalog = 0;
  approximatePayloadBytes = 0;
  retainedAnswerHits = 0;
  budgetDisposedRecords = 0;
  budgetDisposedAnswerValues = 0;
  budgetDisposedAnswerBytes = 0;
  rows = 0;
  rootKernelRecordDelta = 0;
  rootKernelProductDelta = 0;
  rootKernelProductDetailDelta = 0;
  rootKernelHotDetailDelta = 0;
  rootKernelHandleCharacterDelta = 0;
  allKernelRecordDelta = 0;
  allKernelProductDelta = 0;
  allKernelProductDetailDelta = 0;
  allKernelHotDetailDelta = 0;
  allKernelHandleCharacterDelta = 0;
  disposedKernelRecords = 0;
  disposedProductDetails = 0;
  disposedHotDetails = 0;
  disposedKernelHandleCharacters = 0;
  disposedQueryClaimRecords = 0;
  clearedTypeSystemDependencySourceFiles = 0;
  clearedTypeSystemDependencySourceTextCharacters = 0;
  clearedTypeSystemDependencyNodeModuleSourceFiles = 0;
  clearedTypeSystemDependencyNodeModuleSourceTextCharacters = 0;
  clearedTypeSystemDependencyDeclarationSourceFiles = 0;
  clearedTypeSystemDependencyDeclarationSourceTextCharacters = 0;
  clearedTypeSystemDependencyDefaultLibrarySourceFiles = 0;
  clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters = 0;
  clearedTypeSystemDependencyExternalDeclarationSourceFiles = 0;
  clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters = 0;

  recordCreated(node: QueryClaimNode): void {
    this.createdRecords += 1;
    switch (node.materializationPolicy) {
      case 'projection-only':
        this.projectionOnly += 1;
        break;
      case 'query-type-projection':
        this.queryTypeProjection += 1;
        break;
      case 'static-catalog':
        this.staticCatalog += 1;
        break;
    }
  }

  recordAnswered(node: QueryClaimNode): void {
    this.answeredRecords += 1;
    this.addAnswerCounters(node.readCounters());
  }

  recordFailed(node: QueryClaimNode): void {
    this.failedRecords += 1;
    this.addKernelCounters(node.readCounters());
  }

  recordDisposed(_node: QueryClaimNode, reason: QueryClaimDisposalReason): void {
    this.disposedRecords += 1;
    if (reason === QueryClaimDisposalReason.RetentionBudgetExceeded) {
      this.budgetDisposedRecords += 1;
    }
  }

  recordKernelDisposal(disposal: KernelStoreDisposalSummary): void {
    this.disposedKernelRecords += disposal.records;
    this.disposedProductDetails += disposal.productDetails;
    this.disposedHotDetails += disposal.hotDetails;
    this.disposedKernelHandleCharacters += disposal.handleCharacters;
  }

  recordQueryClaimDisposal(records: number): void {
    this.disposedQueryClaimRecords += records;
  }

  recordTypeSystemDependencyCacheDisposal(disposal: QueryClaimTypeSystemDependencyCacheDisposalSummary): void {
    this.clearedTypeSystemDependencySourceFiles += disposal.sourceFiles;
    this.clearedTypeSystemDependencySourceTextCharacters += disposal.sourceTextCharacters;
    this.clearedTypeSystemDependencyNodeModuleSourceFiles += disposal.nodeModuleSourceFiles;
    this.clearedTypeSystemDependencyNodeModuleSourceTextCharacters += disposal.nodeModuleSourceTextCharacters;
    this.clearedTypeSystemDependencyDeclarationSourceFiles += disposal.declarationSourceFiles;
    this.clearedTypeSystemDependencyDeclarationSourceTextCharacters += disposal.declarationSourceTextCharacters;
    this.clearedTypeSystemDependencyDefaultLibrarySourceFiles += disposal.defaultLibrarySourceFiles;
    this.clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters += disposal.defaultLibrarySourceTextCharacters;
    this.clearedTypeSystemDependencyExternalDeclarationSourceFiles += disposal.externalDeclarationSourceFiles;
    this.clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters += disposal.externalDeclarationSourceTextCharacters;
  }

  recordRetainedAnswerHit(): void {
    this.retainedAnswerHits += 1;
  }

  recordBudgetDisposedAnswerValue(bytes: number): void {
    this.budgetDisposedAnswerValues += 1;
    this.budgetDisposedAnswerBytes += bytes;
  }

  private addAnswerCounters(input: QueryClaimCounterInput): void {
    this.approximatePayloadBytes += input.approximatePayloadBytes;
    this.rows += input.rowCount;
    this.addKernelCounters(input);
  }

  private addKernelCounters(input: QueryClaimCounterInput): void {
    this.allKernelRecordDelta += input.kernelDelta.totalRecords;
    this.allKernelProductDelta += input.kernelDelta.products;
    this.allKernelProductDetailDelta += input.kernelDelta.productDetails;
    this.allKernelHotDetailDelta += input.kernelDelta.hotDetails;
    this.allKernelHandleCharacterDelta += input.kernelDelta.handleCharacters;
    if (input.depth === 0) {
      this.rootKernelRecordDelta += input.kernelDelta.totalRecords;
      this.rootKernelProductDelta += input.kernelDelta.products;
      this.rootKernelProductDetailDelta += input.kernelDelta.productDetails;
      this.rootKernelHotDetailDelta += input.kernelDelta.hotDetails;
      this.rootKernelHandleCharacterDelta += input.kernelDelta.handleCharacters;
    }
  }
}

export function approximateQueryAnswerPayloadBytes(answer: QueryClaimAnswerShape): number {
  return approximateScalarBytes(answer.summary)
    + approximatePayloadValueBytes(answer.value, MAX_QUERY_ANSWER_PAYLOAD_ESTIMATE_BYTES)
    + (answer.page == null ? 0 : approximatePayloadValueBytes(answer.page, MAX_QUERY_ANSWER_PAYLOAD_ESTIMATE_BYTES));
}

export function queryAnswerRowCount(value: unknown): number {
  if (value == null || typeof value !== 'object') {
    return 0;
  }
  if ('rows' in value && Array.isArray(value.rows)) {
    return value.rows.length;
  }
  if ('diagnostics' in value && Array.isArray(value.diagnostics)) {
    return value.diagnostics.length;
  }
  if ('entries' in value && Array.isArray(value.entries)) {
    return value.entries.length;
  }
  return 1;
}

function includesIfPresent<TValue>(
  values: readonly TValue[] | undefined,
  value: TValue,
): boolean {
  return values == null || values.includes(value);
}

function intersectsIfPresent<TValue>(
  values: readonly TValue[] | undefined,
  candidates: readonly TValue[],
): boolean {
  return values == null || values.some((value) => candidates.includes(value));
}

function kernelDelta(
  before: SemanticRuntimeKernelCountSnapshot | null,
  after: SemanticRuntimeKernelCountSnapshot | null,
): QueryClaimKernelDelta {
  if (before == null || after == null) {
    return emptyKernelDelta();
  }
  const delta = diffSemanticRuntimeKernelCounts(after, before);
  return {
    totalRecords: delta.totalRecords,
    products: delta.products,
    productDetails: delta.productDetails,
    hotDetails: delta.hotDetails,
    handleCharacters: delta.handleCharacters,
  };
}

function emptyKernelDelta(): QueryClaimKernelDelta {
  return {
    totalRecords: 0,
    products: 0,
    productDetails: 0,
    hotDetails: 0,
    handleCharacters: 0,
  };
}

function emptyKernelDisposal(): KernelStoreDisposalSummary {
  return {
    records: 0,
    productDetails: 0,
    hotDetails: 0,
    handleCharacters: 0,
  };
}

function approximatePayloadValueBytes(value: unknown, limit: number): number {
  let bytes = 0;
  const seen = new WeakSet<object>();
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    bytes += approximateScalarBytes(current);
    if (bytes >= limit) {
      return limit;
    }
    if (current == null || typeof current !== 'object') {
      continue;
    }
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    bytes += Array.isArray(current) ? 24 : 32;
    if (Array.isArray(current)) {
      for (let index = current.length - 1; index >= 0; index -= 1) {
        stack.push(current[index]);
      }
      continue;
    }
    const record = current as Record<string, unknown>;
    for (const key in record) {
      if (!Object.prototype.hasOwnProperty.call(record, key)) {
        continue;
      }
      bytes += approximateScalarBytes(key) + 8;
      stack.push(record[key]);
    }
  }
  return bytes;
}

function approximateScalarBytes(value: unknown): number {
  switch (typeof value) {
    case 'string':
      return value.length * 2;
    case 'number':
    case 'bigint':
      return 8;
    case 'boolean':
      return 4;
    case 'symbol':
    case 'function':
      return 24;
    case 'undefined':
      return 0;
    case 'object':
      return value == null ? 0 : 0;
  }
}

function errorSummary(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Query answer materialization failed.';
}
