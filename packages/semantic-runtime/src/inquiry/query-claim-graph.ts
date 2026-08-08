import type {
  SemanticRuntimeInquiryProfile,
} from '../telemetry/inquiry-profile.js';
import {
  InquiryAnswerCoverage,
  InquiryAnswerResult,
  InquiryAnswerSelection,
} from './answer.js';
import {
  diffSemanticRuntimeKernelCounts,
  type SemanticRuntimeKernelCountSnapshot,
} from '../telemetry/kernel-density.js';
import type {
  KernelStoreDisposalSummary,
  KernelStoreLifetimeMarker,
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
  /** The answer-producing closure ran and the graph retained the configured answer shape. */
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
  /** Response-shaping policy applied before this answer is retained; distinct policy must not share retained DTOs. */
  readonly responsePolicyKey: string;
  /**
   * Epoch/dependency keys that can invalidate this answer.
   *
   * Keep these separate from `locusKey`: a cursor answer's exact locus can be one source offset, while its validity
   * still depends on the containing source file and project epoch.
   */
  readonly epochKeys?: readonly string[];
  readonly materializationPolicy: SemanticQueryMaterializationPolicy;
}

/** Opaque currentness and lifetime capability sealed for one materialized or retained public answer. */
export interface QueryClaimAnswerLease {
  /** Stable protocol kind used to prevent consumers from reusing an answer under the wrong validation contract. */
  readonly kind: string;
  isCurrent(): boolean;
  /** Release resources retained solely for answer reuse. The graph invokes this at most once. */
  dispose(): void;
}

/** One graph-owned provisional answer enlisted in a wider synchronous answer transaction. */
export interface QueryClaimProvisionalAnswerHandle {
  /** Stable per-graph identity used to settle retention budgets once after every sibling publishes. */
  readonly commitGroup: object;
  /** Make this answer visible in committed graph indexes. Reversible until {@link settleCommit}. */
  publish(): void;
  /** Withdraw this exact answer without cascading through committed ancestor dependencies. Idempotent. */
  rollback(deferDisposal?: QueryClaimAnswerDisposalCollector): void;
  /**
   * Infallibly seal every published answer in this token/group and apply graph retention budgets once.
   * Caller-owned release callbacks may be deferred until the coordinating transaction is observably closed.
   */
  settleCommit(deferDisposal?: QueryClaimAnswerDisposalCollector): void;
}

/** Collect a best-effort caller-owned release until a multi-graph mutation reaches an observable terminal state. */
export type QueryClaimAnswerDisposalCollector = (disposal: () => void) => void;

/** Runtime-owned coordination boundary for one synchronous nested answer transaction. */
export interface QueryClaimAnswerTransactionBoundary {
  /** Opaque transaction identity used for provisional visibility, reuse, and policy disposal. */
  readonly token: object;
  /** Refuse answer or lazy-claim work after the transaction closes semantic admission. */
  assertAnswerAdmissionOpen(): void;
  /** Transfer one graph-owned provisional answer handle to the transaction coordinator. */
  enlistProvisionalAnswer(handle: QueryClaimProvisionalAnswerHandle): void;
  /** Whether this fresh/provisional lease is covered by a later aggregate root proof. */
  shouldDeferAnswerLeaseCurrentness(lease: QueryClaimAnswerLease): boolean;
  /** Observe each lease whose currentness the graph validated immediately. */
  didValidateAnswerLease(lease: QueryClaimAnswerLease): void;
}

export interface QueryClaimAnswerBoundary {
  /**
   * Optional gate for retained public answer reuse.
   *
   * Use this when a caller must materialize the answer closure for policy side effects even though a small answer value
   * is available, such as `retain-app` routed queries that need to warm an app epoch for later tools.
   */
  readonly shouldReuseRetainedAnswer?: () => boolean;
  /** Optional wider synchronous transaction that keeps fresh nested answers provisional until one root proof commits. */
  readonly answerTransaction?: QueryClaimAnswerTransactionBoundary;
  /** Require retained reuse to carry a current lease of this exact kind. Unleased legacy answers are not reused. */
  readonly requiredAnswerLeaseKind?: string;
  /**
   * Compose a retained lease with request-local planning reads before reuse validation or same-token delegation.
   *
   * The graph owns and releases a distinct returned lease after validation and observation; the retained node continues
   * to own its historical lease. The callback must leave its request-local proof owner unchanged when composition fails
   * so the graph can discard the stale candidate and materialize a replacement.
   */
  readonly composeRetainedAnswerLease?: (lease: QueryClaimAnswerLease) => QueryClaimAnswerLease;
  /**
   * Seal a detached lease after answer materialization and before either kernel-local or answer-side disposal runs.
   * The graph owns a returned lease: it retains it with a retained answer value or releases it after observation.
   * A thrown error or a returned stale lease fails the claim; `null` is accepted only when no lease kind is required.
   */
  readonly sealAnswerLease?: (answer: QueryClaimAnswerShape) => QueryClaimAnswerLease | null;
  /**
   * Observe a successfully validated lease so an enclosing operation can compose its own private currentness proof.
   * This does not transfer ownership of the lease itself; a thrown observation error fails a fresh claim.
   */
  readonly observeAnswerLease?: (lease: QueryClaimAnswerLease) => void;
  /** Optional store marker for reclaiming answer-local kernel records after the public answer has been shaped. */
  readonly readKernelMarker?: () => KernelStoreLifetimeMarker;
  /**
   * Optional cheap kernel snapshot reader for measuring query-time side effects.
   *
   * The resulting deltas are inclusive: a composed answer such as app overview includes nested query work. Snapshot
   * totals therefore report root-query deltas separately from all-claim deltas so nested composition stays visible
   * without accidentally becoming the aggregate cost model.
   */
  readonly readKernelSnapshot?: () => SemanticRuntimeKernelCountSnapshot;
  /** Dispose kernel/product/hot-detail records created after a marker when the query profile does not retain them. */
  readonly disposeKernelSince?: (marker: KernelStoreLifetimeMarker) => KernelStoreDisposalSummary;
  /**
   * Dispose non-marker answer side effects after the public answer is shaped.
   *
   * Use this for policy-owned boundaries such as one-off routed app queries where an opened app epoch is reclaimed by
   * app-cache policy rather than by the query graph's marker. The graph records this next to the answer state so
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
  readonly schemaVersion?: unknown;
  readonly result: InquiryAnswerResult | `${InquiryAnswerResult}`;
  readonly selection: InquiryAnswerSelection | `${InquiryAnswerSelection}`;
  readonly coverage: InquiryAnswerCoverage | `${InquiryAnswerCoverage}`;
  readonly summary: string;
  readonly value: unknown;
  readonly page?: QueryClaimAnswerPageShape | null;
  readonly continuations?: unknown;
  readonly profile?: unknown;
}

export interface QueryClaimAnswerPageShape {
  readonly returnedRows?: unknown;
  readonly totalRows?: unknown;
  readonly exhausted?: unknown;
  readonly nextCursor?: unknown;
  readonly cursorProblem?: { readonly kind?: unknown } | null;
  readonly clamped?: unknown;
  readonly byteClamped?: unknown;
}

export interface QueryClaimPageState {
  readonly returnedRows: number;
  readonly totalRows: number | null;
  readonly exhausted: boolean;
  readonly hasNextCursor: boolean;
  readonly cursorProblemKind: string | null;
  readonly clamped: boolean;
  readonly byteClamped: boolean;
}

export interface QueryClaimRecord {
  /** Store-local monotonic id for the answer-facing query claim. */
  readonly id: number;
  /** App/query-session sequence id; useful for seeing nested answers such as app overview -> diagnostics. */
  readonly sequence: number;
  /** Active parent query claim id when this claim was created; creation provenance, not semantic ownership. */
  readonly parentId: number | null;
  /** Creation depth inside the answer graph; root-created public queries are depth 0. */
  readonly depth: number;
  /** Direct query-claim dependencies consumed by this answer, including materialized children and retained reuse. */
  readonly dependencyIds: readonly number[];
  /** Query kind or route-query kind that produced the answer. */
  readonly queryKind: string;
  /** Stable key of the query shape and locus within this app session. */
  readonly queryKey: string;
  /** Response policy that shaped the retained DTO without changing the semantic query or locus. */
  readonly responsePolicyKey: string;
  /** Coarse locus key, usually the app project plus optional source/cursor information. */
  readonly locusKey: string;
  /** Dependency/epoch keys that can invalidate this claim without matching the exact answer locus. */
  readonly epochKeys: readonly string[];
  /** Declared query materialization policy from the query catalog. */
  readonly materializationPolicy: SemanticQueryMaterializationPolicy;
  /** Current answer-boundary state for this claim. */
  readonly evaluationState: QueryClaimEvaluationState;
  /** Execution result projected to the public API, after resolution. */
  readonly result: InquiryAnswerResult | null;
  /** Cursor/locus selection state projected independently from result. */
  readonly selection: InquiryAnswerSelection | null;
  /** Semantic coverage state projected independently from transport paging. */
  readonly coverage: InquiryAnswerCoverage | null;
  /** Compact page progress retained independently from answer-value retention. */
  readonly pageState: QueryClaimPageState | null;
  /** Summary retained according to the graph policy. */
  readonly summary: string | null;
  /** Approximate payload shape retained as telemetry without serializing or storing the payload itself. */
  readonly approximatePayloadBytes: number;
  /** Rows returned in the retained payload shape when cheaply known. */
  readonly returnedRowCount: number;
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
  /** Distinct answer-reuse keys retained for answer-value reuse checks. */
  readonly distinctReuseKeys: number;
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
  /** Retained answer-reuse-key character mass. */
  readonly retainedReuseKeyCharacters: number;
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

/** One point-in-time graph view used by control-plane readers that need counters and recent rows together. */
export interface QueryClaimGraphInspection {
  readonly snapshot: QueryClaimGraphSnapshot;
  readonly recentRecords: readonly QueryClaimRecord[] | null;
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
    this.boundary.answerTransaction?.assertAnswerAdmissionOpen();
    if (this.resolved) {
      return this.graph.readRetainedClaimAnswer<TAnswer>(this.node, this.boundary);
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
  private readonly provisionalCommitGroup = Object.freeze({});
  private readonly provisionalEntriesByNode = new Map<QueryClaimNode, QueryClaimProvisionalAnswerEntry>();
  private readonly provisionalNodesByToken = new Map<object, Set<QueryClaimNode>>();
  private readonly answerDependencyIdsByDependentId = new Map<number, Set<number>>();
  private readonly answerDependentIdsByDependencyId = new Map<number, Set<number>>();

  constructor(
    readonly profile: SemanticRuntimeInquiryProfile,
    readonly retentionPolicy: QueryClaimRetentionPolicy = queryClaimRetentionPolicyForProfile(profile),
  ) {}

  claim<TAnswer extends QueryClaimAnswerShape>(
    input: QueryClaimRequestInput,
    materialize: () => TAnswer,
    boundary: QueryClaimAnswerBoundary = {},
  ): QueryAnswerClaim<TAnswer> {
    boundary.answerTransaction?.assertAnswerAdmissionOpen();
    this.assertNestedAnswerTransaction(boundary.answerTransaction);
    const node = this.createNode(input, boundary.answerTransaction);
    return new QueryAnswerClaim(this, node, materialize, boundary);
  }

  answer<TAnswer extends QueryClaimAnswerShape>(
    input: QueryClaimRequestInput,
    materialize: () => TAnswer,
    boundary: QueryClaimAnswerBoundary = {},
  ): TAnswer {
    boundary.answerTransaction?.assertAnswerAdmissionOpen();
    this.assertNestedAnswerTransaction(boundary.answerTransaction);
    if (boundary.shouldReuseRetainedAnswer?.() !== false) {
      const retained = this.readReusableRetainedAnswer<TAnswer>(input, boundary);
      if (retained != null) {
        this.counters.recordRetainedAnswerHit();
        try {
          this.applyAnswerSideEffectDisposal(retained.node, boundary);
        } catch (error) {
          if (retained.provisional) {
            this.rollbackProvisionalNode(
              retained.node,
              QueryClaimDisposalReason.AnswerTransactionRolledBack,
            );
          }
          throw error;
        }
        this.recordActiveAnswerDependency(retained.node);
        return retained.answer;
      }
    }
    return this.claim(input, materialize, boundary).readAnswer();
  }

  readRecords(transactionToken?: object): readonly QueryClaimRecord[] {
    const visibleNodes = this.visibleNodes(transactionToken);
    const dependencies = this.dependencyView(visibleNodes);
    return this.recordsFromVisibleNodes(visibleNodes, dependencies);
  }

  readRecentRecords(limit: number, transactionToken?: object): readonly QueryClaimRecord[] {
    if (limit <= 0) {
      return [];
    }
    const visibleNodes = this.visibleNodes(transactionToken);
    const dependencies = this.dependencyView(visibleNodes);
    return this.recordsFromVisibleNodes(
      visibleNodes.slice(Math.max(0, visibleNodes.length - limit)),
      dependencies,
    );
  }

  /** Capture aggregate counters and an optional recent tail from one visibility/dependency traversal. */
  inspect(
    recentRecordLimit: number | null = null,
    transactionToken?: object,
  ): QueryClaimGraphInspection {
    const visibleNodes = this.visibleNodes(transactionToken);
    const dependencies = this.dependencyView(visibleNodes);
    const recentNodes = recentRecordLimit == null
      ? null
      : visibleNodes.slice(Math.max(0, visibleNodes.length - Math.max(0, recentRecordLimit)));
    return {
      snapshot: this.snapshotFromVisibleNodes(visibleNodes, dependencies),
      recentRecords: recentNodes == null
        ? null
        : this.recordsFromVisibleNodes(recentNodes, dependencies),
    };
  }

  dispose(
    policy: QueryClaimDisposalPolicy = queryClaimDisposalPolicy(QueryClaimDisposalReason.Manual),
    transactionToken?: object,
  ): number {
    return this.disposeWithSummary(policy, transactionToken).disposedRecords;
  }

  disposeWithSummary(
    policy: QueryClaimDisposalPolicy = queryClaimDisposalPolicy(QueryClaimDisposalReason.Manual),
    transactionToken?: object,
  ): QueryClaimGraphDisposalSummary {
    let disposed = 0;
    let matched = 0;
    const counters = emptyQueryClaimDisposalCounters();
    const candidates = this.candidateNodesForDisposalPolicy(policy, transactionToken);
    const traversal = this.createDisposalTraversal(transactionToken);
    for (const node of candidates) {
      if (this.activeStack.includes(node)) {
        continue;
      }
      if (!node.matches(policy, this.retentionPolicy.retentionKind)) {
        continue;
      }
      if (
        !traversal.visibleById.has(node.id)
        || !this.hasVisibleNode(node, transactionToken)
      ) {
        continue;
      }
      matched += 1;
      const disposedRecords = this.disposeVisibleNodeWithRecords(
        node,
        policy.reason,
        transactionToken,
        traversal,
      );
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

  disposeForSessionEnd(transactionToken?: object): number {
    return this.dispose(queryClaimSessionEndDisposalPolicy(), transactionToken);
  }

  disposeForAppEpoch(transactionToken?: object): number {
    return this.dispose(queryClaimAppEpochDisposalPolicy(), transactionToken);
  }

  disposeForSourceEpoch(epochKeys?: readonly string[], transactionToken?: object): number {
    return this.dispose(queryClaimSourceEpochDisposalPolicy(epochKeys), transactionToken);
  }

  disposeQueryTypeProjectionClaims(
    reason: QueryClaimDisposalReason = QueryClaimDisposalReason.Manual,
    transactionToken?: object,
  ): number {
    return this.dispose(queryClaimQueryTypeProjectionDisposalPolicy(reason), transactionToken);
  }

  snapshot(transactionToken?: object): QueryClaimGraphSnapshot {
    const visibleNodes = this.visibleNodes(transactionToken);
    const dependencies = this.dependencyView(visibleNodes);
    return this.snapshotFromVisibleNodes(visibleNodes, dependencies);
  }

  private recordsFromVisibleNodes(
    visibleNodes: readonly QueryClaimNode[],
    dependencies: QueryClaimDependencyView,
  ): readonly QueryClaimRecord[] {
    return visibleNodes.map((node) => node.toRecord(
      dependencies.dependencyIdsByDependentId.get(node.id) ?? [],
    ));
  }

  private snapshotFromVisibleNodes(
    visibleNodes: readonly QueryClaimNode[],
    dependencies: QueryClaimDependencyView,
  ): QueryClaimGraphSnapshot {
    const indexes = queryClaimGraphIndexCardinality(visibleNodes);
    const keyCharacters = queryClaimGraphKeyCharacters(visibleNodes);
    const retainedShape = queryClaimGraphRetainedShape(visibleNodes, dependencies);
    return {
      profile: this.profile,
      retentionKind: this.retentionPolicy.retentionKind,
      answerLocalKernelPolicy: this.retentionPolicy.answerLocalKernelPolicy,
      createdRecords: this.counters.createdRecords,
      retainedRecords: visibleNodes.length,
      records: visibleNodes.length,
      rootRecords: retainedShape.rootRecords,
      childRecords: visibleNodes.length - retainedShape.rootRecords,
      maxDepth: retainedShape.maxDepth,
      retainedDependencyEdges: retainedShape.dependencyEdges,
      distinctParentClaimIds: retainedShape.parentClaimIds,
      distinctReuseKeys: indexes.reuseKeys,
      distinctQueryKinds: indexes.queryKinds,
      distinctLocusKeys: indexes.locusKeys,
      distinctEpochKeys: indexes.epochKeys,
      distinctMaterializationPolicies: indexes.materializationPolicies,
      retainedQueryKeyCharacters: keyCharacters.queryKeyCharacters,
      retainedLocusKeyCharacters: keyCharacters.locusKeyCharacters,
      retainedEpochKeyCharacters: keyCharacters.epochKeyCharacters,
      retainedReuseKeyCharacters: keyCharacters.reuseKeyCharacters,
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
    boundary.answerTransaction?.assertAnswerAdmissionOpen();
    this.assertNestedAnswerTransaction(boundary.answerTransaction);
    if (node.isDisposed()) {
      throw new Error(
        `Cannot materialize disposed query claim '${node.queryKind}' at locus '${node.locusKey}'.`,
      );
    }
    this.recordActiveAnswerDependency(node);
    const marker = boundary.readKernelMarker?.() ?? null;
    const before = boundary.readKernelSnapshot?.() ?? null;
    this.activeStack.push(node);
    try {
      try {
        const resolvedAnswer = materialize();
        const after = boundary.readKernelSnapshot?.() ?? null;
        const approximatePayloadBytes = approximateQueryAnswerPayloadBytes(resolvedAnswer);
        const returnedRowCount = queryAnswerRowCount(resolvedAnswer.value);
        const pageState = queryClaimPageState(resolvedAnswer.page);
        const delta = kernelDelta(before, after);
        let answerLease: QueryClaimAnswerLease | null = null;
        let answerLeaseFailure: Error | null = null;
        if (boundary.sealAnswerLease != null) {
          try {
            answerLease = boundary.sealAnswerLease(resolvedAnswer);
          } catch (error) {
            answerLeaseFailure = queryClaimAnswerLeaseError(error);
          }
        }
        if (answerLeaseFailure == null) {
          answerLeaseFailure = finalizeFreshOrProvisionalQueryClaimAnswerLease(
            answerLease,
            boundary.requiredAnswerLeaseKind,
            boundary,
          );
        }
        if (answerLeaseFailure != null) {
          disposeQueryClaimAnswerLease(answerLease);
          this.failNode(node, answerLeaseFailure, delta);
          this.applyAnswerLocalKernelPolicy(node, marker, boundary);
          this.applyAnswerSideEffectDisposal(node, boundary);
          throw answerLeaseFailure;
        }
        const retainAnswerValue = this.shouldRetainAnswerValue(node, approximatePayloadBytes);
        node.resolve({
          result: resolvedAnswer.result,
          selection: resolvedAnswer.selection,
          coverage: resolvedAnswer.coverage,
          pageState,
          summary: this.retentionPolicy.retainAnswerSummary ? resolvedAnswer.summary : null,
          approximatePayloadBytes: this.retentionPolicy.retainPayloadShape ? approximatePayloadBytes : 0,
          returnedRowCount: this.retentionPolicy.retainPayloadShape ? returnedRowCount : 0,
          retainedAnswerValue: retainAnswerValue,
          kernelDelta: delta,
        });
        if (node.retainedAnswerValue) {
          if (this.isProvisionalNode(node)) {
            node.retainAnswer(resolvedAnswer, answerLease);
          } else {
            this.storage.retainAnswerValue(node, resolvedAnswer, answerLease);
          }
        } else {
          disposeQueryClaimAnswerLease(answerLease);
        }
        this.counters.recordAnswered(node);
        this.applyAnswerLocalKernelPolicy(node, marker, boundary);
        this.applyAnswerSideEffectDisposal(node, boundary);
        return resolvedAnswer;
      } catch (error) {
        try {
          if (node.isPending()) {
            const after = boundary.readKernelSnapshot?.() ?? null;
            this.failNode(node, error, kernelDelta(before, after));
            this.applyAnswerLocalKernelPolicy(node, marker, boundary);
            this.applyAnswerSideEffectDisposal(node, boundary);
          }
        } finally {
          if (this.isProvisionalNode(node)) {
            this.rollbackProvisionalNode(node, QueryClaimDisposalReason.AnswerTransactionRolledBack);
          } else if (node.isAnswered()) {
            this.disposeSingleRetainedNode(node, QueryClaimDisposalReason.AnswerFinalizationFailed);
          }
        }
        throw error;
      }
    } finally {
      const active = this.activeStack.pop();
      if (active !== node) {
        if (this.isProvisionalNode(node)) {
          this.rollbackProvisionalNode(node, QueryClaimDisposalReason.AnswerTransactionRolledBack);
        }
        throw new Error('Query-claim materialization frames closed out of order.');
      }
      if (!this.isProvisionalNode(node)) {
        if (
          node.isAnswered()
          && this.retentionPolicy.retentionKind === QueryClaimRetentionKind.DiscardAfterAnswer
        ) {
          this.disposeRetainedNode(node, QueryClaimDisposalReason.AnswerDiscarded);
        }
        this.enforceRetainedRecordLimit();
        this.enforceRetainedAnswerValueByteLimit();
      }
    }
  }

  readRetainedClaimAnswer<TAnswer extends QueryClaimAnswerShape>(
    node: QueryClaimNode,
    boundary: QueryClaimAnswerBoundary = {},
  ): TAnswer {
    boundary.answerTransaction?.assertAnswerAdmissionOpen();
    this.assertNestedAnswerTransaction(boundary.answerTransaction);
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
    const provisional = this.provisionalNodeBelongsTo(node, boundary.answerTransaction?.token);
    const retainedLease = node.readAnswerLease();
    const prepared = prepareRetainedQueryClaimAnswerLease(
      retainedLease,
      boundary.requiredAnswerLeaseKind,
      boundary,
    );
    try {
      const leaseFailure = prepared.failure ?? (provisional
        ? finalizeFreshOrProvisionalQueryClaimAnswerLease(
          prepared.lease,
          boundary.requiredAnswerLeaseKind,
          boundary,
        )
        : validateCommittedQueryClaimAnswerLease(
          prepared.lease,
          boundary.requiredAnswerLeaseKind,
        ));
      if (leaseFailure != null) {
        if (provisional) {
          this.rollbackProvisionalNode(node, QueryClaimDisposalReason.AnswerLeaseInvalidated);
        } else {
          this.disposeRetainedNode(node, QueryClaimDisposalReason.AnswerLeaseInvalidated);
        }
        throw new Error(
          `Cannot reread query claim '${node.queryKind}' at locus '${node.locusKey}' because its answer lease is no longer current.`,
          { cause: leaseFailure },
        );
      }
      if (!provisional) {
        const finalizationFailure = finalizeValidatedCommittedQueryClaimAnswerLease(prepared.lease, boundary);
        if (finalizationFailure != null) {
          throw new Error(
            `Cannot finalize retained query claim '${node.queryKind}' at locus '${node.locusKey}'.`,
            { cause: finalizationFailure },
          );
        }
      }
      this.recordActiveAnswerDependency(node);
      return answer;
    } finally {
      if (prepared.releaseAfterUse) {
        disposeQueryClaimAnswerLease(prepared.lease);
      }
    }
  }

  private applyAnswerLocalKernelPolicy(
    node: QueryClaimNode,
    marker: KernelStoreLifetimeMarker | null,
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

  private createNode(
    input: QueryClaimRequestInput,
    transaction: QueryClaimAnswerTransactionBoundary | undefined,
  ): QueryClaimNode {
    const parent = this.activeStack[this.activeStack.length - 1] ?? null;
    const node = new QueryClaimNode(
      this.nextId,
      this.nextSequence,
      parent?.id ?? null,
      this.activeStack.length,
      input.queryKind,
      input.queryKey,
      input.locusKey,
      input.responsePolicyKey,
      normalizeQueryClaimEpochKeys(input),
      input.materializationPolicy,
    );
    this.nextId += 1;
    this.nextSequence += 1;
    this.counters.recordCreated(node);
    if (transaction == null) {
      this.retainNode(node);
    } else {
      const handle = this.stageProvisionalNode(transaction.token, node);
      try {
        transaction.enlistProvisionalAnswer(handle);
      } catch (error) {
        handle.rollback();
        throw error;
      }
    }
    return node;
  }

  private readReusableRetainedAnswer<TAnswer extends QueryClaimAnswerShape>(
    input: QueryClaimRequestInput,
    boundary: QueryClaimAnswerBoundary,
  ): { readonly node: QueryClaimNode; readonly answer: TAnswer; readonly provisional: boolean } | null {
    if (!this.canRetainAnswerValueForPolicy(input.materializationPolicy)) {
      return null;
    }
    const transaction = boundary.answerTransaction;
    const provisionalCandidates = transaction == null
      ? []
      : this.provisionalNodesForToken(transaction.token)
        .filter((node) => node.canReuseAnswer(input))
        .reverse();
    const candidates = [
      ...provisionalCandidates.map((node) => ({ node, provisional: true })),
      ...this.storage.readReusableRetainedAnswerCandidates(input)
        .filter((node) => !this.isProvisionalNode(node))
        .map((node) => ({ node, provisional: false })),
    ];
    for (const { node, provisional } of candidates) {
      const prepared = prepareRetainedQueryClaimAnswerLease(
        node.readAnswerLease(),
        boundary.requiredAnswerLeaseKind,
        boundary,
      );
      try {
        const leaseFailure = prepared.failure ?? (provisional
          ? finalizeFreshOrProvisionalQueryClaimAnswerLease(
            prepared.lease,
            boundary.requiredAnswerLeaseKind,
            boundary,
          )
          : validateCommittedQueryClaimAnswerLease(
            prepared.lease,
            boundary.requiredAnswerLeaseKind,
          ));
        if (leaseFailure != null) {
          if (provisional) {
            this.rollbackProvisionalNode(node, QueryClaimDisposalReason.AnswerLeaseInvalidated);
            throw new Error(
              `Cannot reuse provisional query claim '${node.queryKind}' at locus '${node.locusKey}'.`,
              { cause: leaseFailure },
            );
          } else {
            this.disposeRetainedNode(node, QueryClaimDisposalReason.AnswerLeaseInvalidated);
          }
          continue;
        }
        const answer = node.readRetainedAnswer<TAnswer>();
        if (answer != null) {
          if (!provisional) {
            const finalizationFailure = finalizeValidatedCommittedQueryClaimAnswerLease(prepared.lease, boundary);
            if (finalizationFailure != null) {
              throw new Error(
                `Cannot finalize retained query claim '${node.queryKind}' at locus '${node.locusKey}'.`,
                { cause: finalizationFailure },
              );
            }
          }
          return { node, answer, provisional };
        }
      } finally {
        if (prepared.releaseAfterUse) {
          disposeQueryClaimAnswerLease(prepared.lease);
        }
      }
    }
    return null;
  }

  private stageProvisionalNode(
    token: object,
    node: QueryClaimNode,
  ): QueryClaimProvisionalAnswerHandle {
    const handle = new QueryClaimGraphProvisionalAnswer(
      this.provisionalCommitGroup,
      () => this.publishProvisionalNode(node),
      (deferDisposal) => {
        this.rollbackProvisionalNode(
          node,
          QueryClaimDisposalReason.AnswerTransactionRolledBack,
          deferDisposal,
        );
      },
      (deferDisposal) => this.settleProvisionalCommit(token, deferDisposal),
    );
    const entry: QueryClaimProvisionalAnswerEntry = {
      token,
      node,
      state: 'staged',
    };
    this.provisionalEntriesByNode.set(node, entry);
    let nodes = this.provisionalNodesByToken.get(token);
    if (nodes == null) {
      nodes = new Set<QueryClaimNode>();
      this.provisionalNodesByToken.set(token, nodes);
    }
    nodes.add(node);
    return handle;
  }

  private publishProvisionalNode(node: QueryClaimNode): void {
    const entry = this.provisionalEntriesByNode.get(node);
    if (entry == null || entry.state === 'published') {
      return;
    }
    if (!node.isAnswered()) {
      const state = node.toRecord().evaluationState;
      this.rollbackProvisionalNode(node, QueryClaimDisposalReason.AnswerTransactionRolledBack);
      throw new Error(
        `Cannot publish provisional query claim '${node.queryKind}' at locus '${node.locusKey}' while its state is '${state}'.`,
      );
    }
    this.storage.publishNode(node);
    entry.state = 'published';
  }

  private settleProvisionalCommit(
    token: object,
    deferDisposal?: QueryClaimAnswerDisposalCollector,
  ): void {
    const entries = this.provisionalNodesForToken(token)
      .map((node) => this.provisionalEntriesByNode.get(node))
      .filter((entry): entry is QueryClaimProvisionalAnswerEntry => entry != null && entry.token === token);
    if (entries.length === 0) {
      return;
    }
    // Publication preflights every node before any graph is settled. From here through detachment and budget
    // application, settlement is deliberately callback-free and has no readiness branch that can partially commit.
    const publishedNodes = entries.map((entry) => entry.node);
    for (const entry of entries) {
      this.detachProvisionalEntry(entry);
    }
    if (this.retentionPolicy.retentionKind === QueryClaimRetentionKind.DiscardAfterAnswer) {
      const traversal = this.createDisposalTraversal(undefined);
      for (const node of publishedNodes) {
        this.disposeRetainedNode(
          node,
          QueryClaimDisposalReason.AnswerDiscarded,
          traversal,
          deferDisposal,
        );
      }
      return;
    }
    this.enforceRetainedRecordLimit(deferDisposal);
    this.enforceRetainedAnswerValueByteLimit(deferDisposal);
  }

  private rollbackProvisionalNode(
    node: QueryClaimNode,
    reason: QueryClaimDisposalReason,
    deferDisposal?: QueryClaimAnswerDisposalCollector,
  ): boolean {
    const entry = this.provisionalEntriesByNode.get(node);
    if (entry == null) {
      return false;
    }
    this.detachProvisionalEntry(entry);
    this.removeDependencyEdgesFor(node);
    const detached = entry.state === 'published'
      ? this.storage.removeNode(node)
      : null;
    const residual = node.dispose(reason);
    this.counters.recordDisposed(node, reason);
    releaseQueryClaimAnswerLease(detached?.lease ?? null, deferDisposal);
    releaseQueryClaimAnswerLease(residual.lease, deferDisposal);
    return true;
  }

  private detachProvisionalEntry(entry: QueryClaimProvisionalAnswerEntry): void {
    if (this.provisionalEntriesByNode.get(entry.node) !== entry) {
      return;
    }
    this.provisionalEntriesByNode.delete(entry.node);
    const nodes = this.provisionalNodesByToken.get(entry.token);
    if (nodes == null) {
      return;
    }
    nodes.delete(entry.node);
    if (nodes.size === 0) {
      this.provisionalNodesByToken.delete(entry.token);
    }
  }

  private provisionalNodesForToken(token: object): QueryClaimNode[] {
    return [...(this.provisionalNodesByToken.get(token) ?? [])].filter((node) =>
      this.provisionalEntriesByNode.get(node)?.token === token
    );
  }

  private isProvisionalNode(node: QueryClaimNode): boolean {
    return this.provisionalEntriesByNode.has(node);
  }

  private provisionalNodeBelongsTo(node: QueryClaimNode, token: object | undefined): boolean {
    return token != null && this.provisionalEntriesByNode.get(node)?.token === token;
  }

  private visibleNodes(transactionToken: object | undefined): QueryClaimNode[] {
    const nodes = this.storage.readNodes().filter((node) => !this.isProvisionalNode(node));
    if (transactionToken != null) {
      nodes.push(...this.provisionalNodesForToken(transactionToken));
    }
    return [...new Set(nodes)].sort((left, right) => left.sequence - right.sequence);
  }

  /** A nested answer belongs to the same publication transaction as the active parent, including retained hits. */
  private assertNestedAnswerTransaction(
    transaction: QueryClaimAnswerTransactionBoundary | undefined,
  ): void {
    const parent = this.activeStack[this.activeStack.length - 1];
    if (parent == null) {
      return;
    }
    const parentToken = this.provisionalEntriesByNode.get(parent)?.token ?? null;
    const nestedToken = transaction?.token ?? null;
    if (parentToken !== nestedToken) {
      throw new Error(
        `Nested query claim '${parent.queryKind}' cannot cross answer transaction ownership.`,
      );
    }
  }

  private recordActiveAnswerDependency(dependency: QueryClaimNode): void {
    const dependent = this.activeStack[this.activeStack.length - 1];
    if (
      dependent == null
      || dependent === dependency
      || dependent.isDisposed()
      || dependency.isDisposed()
      || (!this.storage.hasNode(dependent) && !this.isProvisionalNode(dependent))
      || (!this.storage.hasNode(dependency) && !this.isProvisionalNode(dependency))
    ) {
      return;
    }
    let dependencyIds = this.answerDependencyIdsByDependentId.get(dependent.id);
    if (dependencyIds == null) {
      dependencyIds = new Set<number>();
      this.answerDependencyIdsByDependentId.set(dependent.id, dependencyIds);
    }
    if (dependencyIds.has(dependency.id)) {
      return;
    }
    dependencyIds.add(dependency.id);
    let dependentIds = this.answerDependentIdsByDependencyId.get(dependency.id);
    if (dependentIds == null) {
      dependentIds = new Set<number>();
      this.answerDependentIdsByDependencyId.set(dependency.id, dependentIds);
    }
    dependentIds.add(dependent.id);
  }

  private removeDependencyEdgesFor(node: QueryClaimNode): void {
    const dependencyIds = this.answerDependencyIdsByDependentId.get(node.id);
    if (dependencyIds != null) {
      for (const dependencyId of dependencyIds) {
        removeQueryClaimDependencyIndex(
          this.answerDependentIdsByDependencyId,
          dependencyId,
          node.id,
        );
      }
      this.answerDependencyIdsByDependentId.delete(node.id);
    }
    const dependentIds = this.answerDependentIdsByDependencyId.get(node.id);
    if (dependentIds != null) {
      for (const dependentId of dependentIds) {
        removeQueryClaimDependencyIndex(
          this.answerDependencyIdsByDependentId,
          dependentId,
          node.id,
        );
      }
      this.answerDependentIdsByDependencyId.delete(node.id);
    }
  }

  private dependencyView(visibleNodes: readonly QueryClaimNode[]): QueryClaimDependencyView {
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
    const dependencyIdsByDependentId = new Map<number, Set<number>>();
    const dependentIdsByDependencyId = new Map<number, Set<number>>();
    const addVisibleDependency = (dependentId: number, dependencyId: number): void => {
      if (
        dependentId === dependencyId
        || !visibleNodeIds.has(dependentId)
        || !visibleNodeIds.has(dependencyId)
      ) {
        return;
      }
      addQueryClaimDependencyIndex(dependencyIdsByDependentId, dependentId, dependencyId);
      addQueryClaimDependencyIndex(dependentIdsByDependencyId, dependencyId, dependentId);
    };

    for (const [dependentId, dependencyIds] of this.answerDependencyIdsByDependentId) {
      for (const dependencyId of dependencyIds) {
        addVisibleDependency(dependentId, dependencyId);
      }
    }

    return {
      dependencyIdsByDependentId: sortedQueryClaimDependencyIndex(dependencyIdsByDependentId),
      dependentIdsByDependencyId: sortedQueryClaimDependencyIndex(dependentIdsByDependencyId),
      dependencyEdges: [...dependencyIdsByDependentId.values()]
        .reduce((count, dependencyIds) => count + dependencyIds.size, 0),
      parentClaimIds: dependencyIdsByDependentId.size,
    };
  }

  private visibleDependentAncestorsFor(
    node: QueryClaimNode,
    visibleById: ReadonlyMap<number, QueryClaimNode>,
    dependencies: QueryClaimDependencyView,
  ): readonly QueryClaimNode[] {
    const dependents: QueryClaimNode[] = [];
    const seen = new Set<number>([node.id]);
    const queue = [...(dependencies.dependentIdsByDependencyId.get(node.id) ?? [])];
    for (let index = 0; index < queue.length; index += 1) {
      const dependentId = queue[index];
      if (dependentId == null || seen.has(dependentId)) {
        continue;
      }
      seen.add(dependentId);
      const dependent = visibleById.get(dependentId);
      if (dependent == null) {
        continue;
      }
      dependents.push(dependent);
      queue.push(...(dependencies.dependentIdsByDependencyId.get(dependentId) ?? []));
    }
    return dependents;
  }

  private hasVisibleNode(node: QueryClaimNode, transactionToken: object | undefined): boolean {
    return (this.storage.hasNode(node) && !this.isProvisionalNode(node))
      || this.provisionalNodeBelongsTo(node, transactionToken);
  }

  private createDisposalTraversal(
    transactionToken: object | undefined,
  ): QueryClaimDisposalTraversal {
    const visibleNodes = this.visibleNodes(transactionToken);
    return {
      visibleById: new Map(visibleNodes.map((node) => [node.id, node])),
      dependencies: this.dependencyView(visibleNodes),
    };
  }

  private candidateNodesForDisposalPolicy(
    policy: QueryClaimDisposalPolicy,
    transactionToken: object | undefined,
  ): readonly QueryClaimNode[] {
    const committed = this.storage.candidateNodesForDisposalPolicy(policy)
      .filter((node) => !this.isProvisionalNode(node));
    const provisional = transactionToken == null
      ? []
      : this.provisionalNodesForToken(transactionToken).filter((node) =>
        node.matches(policy, this.retentionPolicy.retentionKind)
      );
    return [...new Set([...committed, ...provisional])]
      .sort((left, right) => right.sequence - left.sequence);
  }

  private disposeVisibleNodeWithRecords(
    node: QueryClaimNode,
    reason: QueryClaimDisposalReason,
    transactionToken: object | undefined,
    traversal: QueryClaimDisposalTraversal = this.createDisposalTraversal(transactionToken),
    deferDisposal?: QueryClaimAnswerDisposalCollector,
  ): readonly QueryClaimRecord[] {
    const dependentAncestors = this.visibleDependentAncestorsFor(
      node,
      traversal.visibleById,
      traversal.dependencies,
    );

    const records: QueryClaimRecord[] = [];
    for (const dependent of dependentAncestors) {
      if (this.activeStack.includes(dependent)) {
        continue;
      }
      const record = this.disposeSingleVisibleNode(
        dependent,
        reason,
        transactionToken,
        traversal.dependencies.dependencyIdsByDependentId.get(dependent.id) ?? [],
        deferDisposal,
      );
      if (record != null) {
        traversal.visibleById.delete(dependent.id);
        records.push(record);
      }
    }
    const record = this.disposeSingleVisibleNode(
      node,
      reason,
      transactionToken,
      traversal.dependencies.dependencyIdsByDependentId.get(node.id) ?? [],
      deferDisposal,
    );
    if (record != null) {
      traversal.visibleById.delete(node.id);
      records.push(record);
    }
    return records;
  }

  private disposeSingleVisibleNode(
    node: QueryClaimNode,
    reason: QueryClaimDisposalReason,
    transactionToken: object | undefined,
    dependencyIds: readonly number[],
    deferDisposal?: QueryClaimAnswerDisposalCollector,
  ): QueryClaimRecord | null {
    if (this.provisionalNodeBelongsTo(node, transactionToken)) {
      const record = node.toRecord(dependencyIds);
      return this.rollbackProvisionalNode(node, reason, deferDisposal) ? record : null;
    }
    return this.disposeSingleRetainedNode(node, reason, dependencyIds, deferDisposal);
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

  private enforceRetainedRecordLimit(
    deferDisposal?: QueryClaimAnswerDisposalCollector,
  ): void {
    const limit = this.retentionPolicy.retainedRecordLimit;
    if (limit == null || limit < 0) {
      return;
    }
    const traversal = this.createDisposalTraversal(undefined);
    const activeNodes = new Set(this.activeStack);
    const visibleDependentCountById = new Map<number, number>();
    const leafCandidates = new QueryClaimNodeSequenceHeap();
    for (const node of traversal.visibleById.values()) {
      const dependentCount = (
        traversal.dependencies.dependentIdsByDependencyId.get(node.id) ?? []
      ).filter((dependentId) => traversal.visibleById.has(dependentId)).length;
      visibleDependentCountById.set(node.id, dependentCount);
      if (dependentCount === 0 && this.isRetainBudgetCandidate(node, activeNodes)) {
        leafCandidates.push(node);
      }
    }
    while (this.committedRetainedCount() > limit) {
      let node: QueryClaimNode | null = null;
      while (node == null) {
        const candidate = leafCandidates.pop();
        if (candidate == null) {
          break;
        }
        if (
          traversal.visibleById.has(candidate.id)
          && visibleDependentCountById.get(candidate.id) === 0
          && this.isRetainBudgetCandidate(candidate, activeNodes)
        ) {
          node = candidate;
        }
      }
      // Active ancestors are temporary: let the enclosing materializer retry after it closes instead of deleting one
      // of its dependencies. With no active frame, an absent leaf means a genuine cycle and deterministic cascade is
      // the only way to make progress.
      if (node == null && activeNodes.size === 0) {
        node = this.oldestRetainBudgetCandidate(traversal, activeNodes);
      }
      if (node == null) {
        return;
      }
      const disposedRecords = this.disposeRetainedNodeWithRecords(
        node,
        QueryClaimDisposalReason.RetentionBudgetExceeded,
        traversal,
        deferDisposal,
      );
      if (disposedRecords.length === 0) {
        return;
      }
      for (const disposed of disposedRecords) {
        for (const dependencyId of traversal.dependencies.dependencyIdsByDependentId.get(disposed.id) ?? []) {
          const remainingDependents = Math.max(
            0,
            (visibleDependentCountById.get(dependencyId) ?? 0) - 1,
          );
          visibleDependentCountById.set(dependencyId, remainingDependents);
          const dependency = traversal.visibleById.get(dependencyId);
          if (
            dependency != null
            && remainingDependents === 0
            && this.isRetainBudgetCandidate(dependency, activeNodes)
          ) {
            leafCandidates.push(dependency);
          }
        }
      }
    }
  }

  private oldestRetainBudgetCandidate(
    traversal: QueryClaimDisposalTraversal,
    activeNodes: ReadonlySet<QueryClaimNode>,
  ): QueryClaimNode | null {
    for (const node of this.storage.retentionOrderedNodes()) {
      if (traversal.visibleById.has(node.id) && this.isRetainBudgetCandidate(node, activeNodes)) {
        return node;
      }
    }
    return null;
  }

  private isRetainBudgetCandidate(
    node: QueryClaimNode,
    activeNodes: ReadonlySet<QueryClaimNode>,
  ): boolean {
    return !this.isProvisionalNode(node)
      && node.isRetainBudgetDisposable()
      && !activeNodes.has(node);
  }

  private enforceRetainedAnswerValueByteLimit(
    deferDisposal?: QueryClaimAnswerDisposalCollector,
  ): void {
    const limit = this.retentionPolicy.retainedAnswerTotalByteLimit;
    if (limit == null || limit < 0) {
      return;
    }
    const activeNodes = new Set(this.activeStack);
    for (const node of this.storage.retentionOrderedNodes()) {
      if (this.committedRetainedAnswerBytes() <= limit) {
        break;
      }
      if (this.isProvisionalNode(node) || !node.retainedAnswerValue || activeNodes.has(node)) {
        continue;
      }
      const detached = this.storage.detachRetainedAnswerValue(node);
      this.counters.recordBudgetDisposedAnswerValue(detached.bytes);
      releaseQueryClaimAnswerLease(detached.lease, deferDisposal);
    }
  }

  private committedRetainedCount(): number {
    let count = this.storage.retainedCount;
    for (const node of this.provisionalEntriesByNode.keys()) {
      if (this.storage.hasNode(node)) {
        count -= 1;
      }
    }
    return count;
  }

  private committedRetainedAnswerBytes(): number {
    let bytes = this.storage.retainedAnswerBytes;
    for (const node of this.provisionalEntriesByNode.keys()) {
      if (this.storage.hasNode(node)) {
        bytes -= node.approximateRetainedAnswerBytes;
      }
    }
    return Math.max(0, bytes);
  }

  private disposeRetainedNode(
    node: QueryClaimNode,
    reason: QueryClaimDisposalReason,
    traversal?: QueryClaimDisposalTraversal,
    deferDisposal?: QueryClaimAnswerDisposalCollector,
  ): number {
    return this.disposeRetainedNodeWithRecords(node, reason, traversal, deferDisposal).length;
  }

  private disposeRetainedNodeWithRecords(
    node: QueryClaimNode,
    reason: QueryClaimDisposalReason,
    traversal?: QueryClaimDisposalTraversal,
    deferDisposal?: QueryClaimAnswerDisposalCollector,
  ): readonly QueryClaimRecord[] {
    return this.disposeVisibleNodeWithRecords(
      node,
      reason,
      undefined,
      traversal,
      deferDisposal,
    );
  }

  private disposeSingleRetainedNode(
    node: QueryClaimNode,
    reason: QueryClaimDisposalReason,
    dependencyIds?: readonly number[],
    deferDisposal?: QueryClaimAnswerDisposalCollector,
  ): QueryClaimRecord | null {
    if (!this.storage.hasNode(node) || this.isProvisionalNode(node)) {
      return null;
    }
    const record = node.toRecord(
      dependencyIds
        ?? this.dependencyView(this.visibleNodes(undefined)).dependencyIdsByDependentId.get(node.id)
        ?? [],
    );
    const detached = this.storage.removeNode(node);
    if (detached == null) {
      return null;
    }
    this.removeDependencyEdgesFor(node);
    const residual = node.dispose(reason);
    this.counters.recordDisposed(node, reason);
    releaseQueryClaimAnswerLease(detached.lease, deferDisposal);
    releaseQueryClaimAnswerLease(residual.lease, deferDisposal);
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

type QueryClaimProvisionalAnswerState = 'staged' | 'published';

interface QueryClaimProvisionalAnswerEntry {
  readonly token: object;
  readonly node: QueryClaimNode;
  state: QueryClaimProvisionalAnswerState;
}

class QueryClaimGraphProvisionalAnswer implements QueryClaimProvisionalAnswerHandle {
  constructor(
    readonly commitGroup: object,
    private readonly publishAnswer: () => void,
    private readonly rollbackAnswer: (deferDisposal?: QueryClaimAnswerDisposalCollector) => void,
    private readonly settleCommitGroup: (deferDisposal?: QueryClaimAnswerDisposalCollector) => void,
  ) {}

  publish(): void {
    this.publishAnswer();
  }

  rollback(deferDisposal?: QueryClaimAnswerDisposalCollector): void {
    this.rollbackAnswer(deferDisposal);
  }

  settleCommit(deferDisposal?: QueryClaimAnswerDisposalCollector): void {
    this.settleCommitGroup(deferDisposal);
  }
}

interface QueryClaimDependencyView {
  readonly dependencyIdsByDependentId: ReadonlyMap<number, readonly number[]>;
  readonly dependentIdsByDependencyId: ReadonlyMap<number, readonly number[]>;
  readonly dependencyEdges: number;
  readonly parentClaimIds: number;
}

interface QueryClaimDisposalTraversal {
  /** Mutable membership view; successful disposal removes a row without rebuilding the immutable topology. */
  readonly visibleById: Map<number, QueryClaimNode>;
  /** Exact dependency topology at the start of one public disposal or retention-budget drain. */
  readonly dependencies: QueryClaimDependencyView;
}

interface DetachedQueryClaimAnswerValue {
  readonly bytes: number;
  readonly lease: QueryClaimAnswerLease | null;
}

/** Deterministic oldest-first frontier for topology-aware retention pruning. */
class QueryClaimNodeSequenceHeap {
  private readonly nodes: QueryClaimNode[] = [];

  push(node: QueryClaimNode): void {
    let index = this.nodes.length;
    this.nodes.push(node);
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.nodes[parentIndex];
      if (parent == null || compareQueryClaimNodeSequence(parent, node) <= 0) {
        break;
      }
      this.nodes[index] = parent;
      index = parentIndex;
    }
    this.nodes[index] = node;
  }

  pop(): QueryClaimNode | null {
    const first = this.nodes[0];
    const last = this.nodes.pop();
    if (first == null) {
      return null;
    }
    if (last == null || this.nodes.length === 0) {
      return first;
    }
    let index = 0;
    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = leftIndex + 1;
      const left = this.nodes[leftIndex];
      const right = this.nodes[rightIndex];
      if (left == null) {
        break;
      }
      const nextIndex = right != null && compareQueryClaimNodeSequence(right, left) < 0
        ? rightIndex
        : leftIndex;
      const next = this.nodes[nextIndex]!;
      if (compareQueryClaimNodeSequence(last, next) <= 0) {
        break;
      }
      this.nodes[index] = next;
      index = nextIndex;
    }
    this.nodes[index] = last;
    return first;
  }
}

function compareQueryClaimNodeSequence(left: QueryClaimNode, right: QueryClaimNode): number {
  return left.sequence - right.sequence || left.id - right.id;
}

interface QueryClaimGraphIndexCardinality {
  readonly reuseKeys: number;
  readonly queryKinds: number;
  readonly locusKeys: number;
  readonly epochKeys: number;
  readonly materializationPolicies: number;
}

interface QueryClaimGraphKeyCharacters {
  readonly queryKeyCharacters: number;
  readonly locusKeyCharacters: number;
  readonly epochKeyCharacters: number;
  readonly reuseKeyCharacters: number;
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

function queryClaimGraphIndexCardinality(
  nodes: readonly QueryClaimNode[],
): QueryClaimGraphIndexCardinality {
  const reuseKeys = new Set<string>();
  const queryKinds = new Set<string>();
  const locusKeys = new Set<string>();
  const epochKeys = new Set<string>();
  const materializationPolicies = new Set<SemanticQueryMaterializationPolicy>();
  for (const node of nodes) {
    reuseKeys.add(node.reuseKey);
    queryKinds.add(node.queryKind);
    locusKeys.add(node.locusKey);
    materializationPolicies.add(node.materializationPolicy);
    for (const epochKey of node.epochKeys) {
      epochKeys.add(epochKey);
    }
  }
  return {
    reuseKeys: reuseKeys.size,
    queryKinds: queryKinds.size,
    locusKeys: locusKeys.size,
    epochKeys: epochKeys.size,
    materializationPolicies: materializationPolicies.size,
  };
}

function queryClaimGraphKeyCharacters(
  nodes: readonly QueryClaimNode[],
): QueryClaimGraphKeyCharacters {
  let queryKeyCharacters = 0;
  let locusKeyCharacters = 0;
  let epochKeyCharacters = 0;
  let reuseKeyCharacters = 0;
  for (const node of nodes) {
    queryKeyCharacters += node.queryKey.length;
    locusKeyCharacters += node.locusKey.length;
    reuseKeyCharacters += node.reuseKey.length;
    for (const epochKey of node.epochKeys) {
      epochKeyCharacters += epochKey.length;
    }
  }
  return {
    queryKeyCharacters,
    locusKeyCharacters,
    epochKeyCharacters,
    reuseKeyCharacters,
  };
}

function queryClaimGraphRetainedShape(
  nodes: readonly QueryClaimNode[],
  dependencies: QueryClaimDependencyView,
): QueryClaimGraphRetainedShape {
  let pending = 0;
  let rootRecords = 0;
  let maxDepth = 0;
  let retainedAnswerValues = 0;
  let retainedAnswerBytes = 0;
  for (const node of nodes) {
    if (node.isPending()) {
      pending += 1;
    }
    if (node.depth === 0) {
      rootRecords += 1;
    }
    if (node.retainedAnswerValue) {
      retainedAnswerValues += 1;
      retainedAnswerBytes += node.approximateRetainedAnswerBytes;
    }
    maxDepth = Math.max(maxDepth, node.depth);
  }
  return {
    pending,
    rootRecords,
    maxDepth,
    dependencyEdges: dependencies.dependencyEdges,
    parentClaimIds: dependencies.parentClaimIds,
    retainedAnswerValues,
    retainedAnswerBytes,
  };
}

/**
 * Retained query-answer storage plus invalidation indexes.
 *
 * The graph owns materialization and policy decisions; this object owns the indexed answer-history shape that makes
 * reuse, source invalidation, query-family disposal, and retention-budget pruning graph-owned instead of adapter scans.
 */
class QueryClaimGraphStorage {
  private readonly nodes = new Set<QueryClaimNode>();
  private readonly nodesById = new Map<number, QueryClaimNode>();
  private readonly nodesByReuseKey = new Map<string, Set<QueryClaimNode>>();
  private readonly nodesByQueryKind = new Map<string, Set<QueryClaimNode>>();
  private readonly nodesByLocusKey = new Map<string, Set<QueryClaimNode>>();
  private readonly nodesByEpochKey = new Map<string, Set<QueryClaimNode>>();
  private readonly nodesByMaterializationPolicy = new Map<SemanticQueryMaterializationPolicy, Set<QueryClaimNode>>();
  private retainedAnswerByteTotal = 0;

  get retainedCount(): number {
    return this.nodes.size;
  }

  get retainedAnswerBytes(): number {
    return this.retainedAnswerByteTotal;
  }

  readNodes(): readonly QueryClaimNode[] {
    return [...this.nodes];
  }

  /** Stable oldest-first iteration without copying the retained set during a multi-victim budget drain. */
  retentionOrderedNodes(): Iterable<QueryClaimNode> {
    return this.nodes.values();
  }

  retainNode(node: QueryClaimNode): void {
    this.nodes.add(node);
    this.nodesById.set(node.id, node);
    addNodeToIndex(this.nodesByReuseKey, node.reuseKey, node);
    addNodeToIndex(this.nodesByQueryKind, node.queryKind, node);
    addNodeToIndex(this.nodesByLocusKey, node.locusKey, node);
    addNodeToIndex(this.nodesByMaterializationPolicy, node.materializationPolicy, node);
    for (const epochKey of node.epochKeys) {
      addNodeToIndex(this.nodesByEpochKey, epochKey, node);
    }
  }

  publishNode(node: QueryClaimNode): void {
    if (this.hasNode(node)) {
      return;
    }
    this.retainNode(node);
    this.retainedAnswerByteTotal += node.approximateRetainedAnswerBytes;
  }

  /** Atomically hide a node and detach its lease before any caller-owned disposal callback can run. */
  removeNode(node: QueryClaimNode): DetachedQueryClaimAnswerValue | null {
    if (!this.nodes.delete(node)) {
      return null;
    }
    this.removeNodeFromIndexes(node);
    const detached = node.detachRetainedAnswerValue();
    this.retainedAnswerByteTotal = Math.max(0, this.retainedAnswerByteTotal - detached.bytes);
    return detached;
  }

  hasNode(node: QueryClaimNode): boolean {
    return this.nodesById.get(node.id) === node;
  }

  retainAnswerValue<TAnswer extends QueryClaimAnswerShape>(
    node: QueryClaimNode,
    answer: TAnswer,
    lease: QueryClaimAnswerLease | null,
  ): void {
    node.retainAnswer(answer, lease);
    this.retainedAnswerByteTotal += node.approximateRetainedAnswerBytes;
  }

  detachRetainedAnswerValue(node: QueryClaimNode): DetachedQueryClaimAnswerValue {
    const detached = node.detachRetainedAnswerValue();
    this.retainedAnswerByteTotal = Math.max(0, this.retainedAnswerByteTotal - detached.bytes);
    return detached;
  }

  readReusableRetainedAnswerCandidates(
    input: QueryClaimRequestInput,
  ): readonly QueryClaimNode[] {
    const candidates = [...(this.nodesByReuseKey.get(queryClaimReuseKey(input)) ?? [])];
    const reusable: QueryClaimNode[] = [];
    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      const node = candidates[index];
      if (node?.canReuseAnswer(input) !== true) {
        continue;
      }
      reusable.push(node);
    }
    return reusable;
  }

  candidateNodesForDisposalPolicy(policy: QueryClaimDisposalPolicy): readonly QueryClaimNode[] {
    const buckets: Set<QueryClaimNode>[] = [];
    this.collectIndexedBuckets(buckets, this.nodesByMaterializationPolicy, policy.materializationPolicies);
    this.collectIndexedBuckets(buckets, this.nodesByQueryKind, policy.queryKinds);
    this.collectIndexedBuckets(buckets, this.nodesByLocusKey, policy.locusKeys);
    this.collectIndexedBuckets(buckets, this.nodesByEpochKey, policy.epochKeys);
    if (buckets.length === 0) {
      return [...this.nodes].reverse();
    }
    const smallestBucket = buckets.reduce((smallest, bucket) =>
      bucket.size < smallest.size ? bucket : smallest
    );
    return [...smallestBucket].reverse();
  }

  private collectIndexedBuckets<TKey extends string>(
    target: Set<QueryClaimNode>[],
    index: ReadonlyMap<TKey, ReadonlySet<QueryClaimNode>>,
    keys: readonly TKey[] | undefined,
  ): void {
    if (keys == null) {
      return;
    }
    const combined = new Set<QueryClaimNode>();
    for (const key of keys) {
      for (const node of index.get(key) ?? []) {
        combined.add(node);
      }
    }
    target.push(combined);
  }

  private removeNodeFromIndexes(node: QueryClaimNode): void {
    this.nodesById.delete(node.id);
    removeNodeFromIndex(this.nodesByReuseKey, node.reuseKey, node);
    removeNodeFromIndex(this.nodesByQueryKind, node.queryKind, node);
    removeNodeFromIndex(this.nodesByLocusKey, node.locusKey, node);
    removeNodeFromIndex(this.nodesByMaterializationPolicy, node.materializationPolicy, node);
    for (const epochKey of node.epochKeys) {
      removeNodeFromIndex(this.nodesByEpochKey, epochKey, node);
    }
  }

}

class QueryClaimNode {
  private evaluationState = QueryClaimEvaluationState.Pending;
  private result: InquiryAnswerResult | null = null;
  private selection: InquiryAnswerSelection | null = null;
  private coverage: InquiryAnswerCoverage | null = null;
  private pageState: QueryClaimPageState | null = null;
  private summary: string | null = null;
  private approximatePayloadBytes = 0;
  private returnedRowCount = 0;
  private retainedAnswer: QueryClaimAnswerShape | null = null;
  private retainedAnswerLease: QueryClaimAnswerLease | null = null;
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
    readonly responsePolicyKey: string,
    readonly epochKeys: readonly string[],
    readonly materializationPolicy: SemanticQueryMaterializationPolicy,
  ) {}

  get reuseKey(): string {
    return queryClaimReuseKey({
      queryKind: this.queryKind,
      queryKey: this.queryKey,
      locusKey: this.locusKey,
      responsePolicyKey: this.responsePolicyKey,
      materializationPolicy: this.materializationPolicy,
    });
  }

  get approximateRetainedAnswerBytes(): number {
    return this.retainedAnswerValue ? this.approximatePayloadBytes : 0;
  }

  resolve(shape: {
    readonly result: InquiryAnswerResult | `${InquiryAnswerResult}`;
    readonly selection: InquiryAnswerSelection | `${InquiryAnswerSelection}`;
    readonly coverage: InquiryAnswerCoverage | `${InquiryAnswerCoverage}`;
    readonly pageState: QueryClaimPageState | null;
    readonly summary: string | null;
    readonly approximatePayloadBytes: number;
    readonly returnedRowCount: number;
    readonly retainedAnswerValue: boolean;
    readonly kernelDelta: QueryClaimKernelDelta;
  }): void {
    this.evaluationState = QueryClaimEvaluationState.Answered;
    this.result = shape.result as InquiryAnswerResult;
    this.selection = shape.selection as InquiryAnswerSelection;
    this.coverage = shape.coverage as InquiryAnswerCoverage;
    this.pageState = shape.pageState;
    this.summary = shape.summary;
    this.approximatePayloadBytes = shape.approximatePayloadBytes;
    this.returnedRowCount = shape.returnedRowCount;
    this.retainedAnswerValue = shape.retainedAnswerValue;
    this.kernelDelta = shape.kernelDelta;
  }

  fail(
    summary: string,
    kernelDelta: QueryClaimKernelDelta,
  ): void {
    this.evaluationState = QueryClaimEvaluationState.Failed;
    this.result = InquiryAnswerResult.Failed;
    this.selection = InquiryAnswerSelection.NotApplicable;
    this.coverage = InquiryAnswerCoverage.NotApplicable;
    this.pageState = null;
    this.summary = summary;
    this.kernelDelta = kernelDelta;
  }

  retainAnswer<TAnswer extends QueryClaimAnswerShape>(
    answer: TAnswer,
    lease: QueryClaimAnswerLease | null,
  ): TAnswer {
    this.retainedAnswer = answer;
    this.retainedAnswerLease = lease;
    return answer;
  }

  readRetainedAnswer<TAnswer extends QueryClaimAnswerShape>(): TAnswer | null {
    return this.retainedAnswerValue ? this.retainedAnswer as TAnswer | null : null;
  }

  readAnswerLease(): QueryClaimAnswerLease | null {
    return this.retainedAnswerLease;
  }

  detachRetainedAnswerValue(): DetachedQueryClaimAnswerValue {
    const bytes = this.retainedAnswerValue ? this.approximatePayloadBytes : 0;
    this.retainedAnswer = null;
    this.retainedAnswerValue = false;
    const lease = this.retainedAnswerLease;
    this.retainedAnswerLease = null;
    return { bytes, lease };
  }

  dispose(reason: QueryClaimDisposalReason): DetachedQueryClaimAnswerValue {
    this.evaluationState = QueryClaimEvaluationState.Disposed;
    this.disposalReason = reason;
    return this.detachRetainedAnswerValue();
  }

  isDisposed(): boolean {
    return this.evaluationState === QueryClaimEvaluationState.Disposed;
  }

  isPending(): boolean {
    return this.evaluationState === QueryClaimEvaluationState.Pending;
  }

  isAnswered(): boolean {
    return this.evaluationState === QueryClaimEvaluationState.Answered;
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
      && this.responsePolicyKey === input.responsePolicyKey
      && this.materializationPolicy === input.materializationPolicy
      && sameQueryClaimEpochKeys(this.epochKeys, epochKeys);
  }

  isRetainBudgetDisposable(): boolean {
    return this.evaluationState === QueryClaimEvaluationState.Answered
      || this.evaluationState === QueryClaimEvaluationState.Failed;
  }

  toRecord(dependencyIds: readonly number[] = []): QueryClaimRecord {
    return {
      id: this.id,
      sequence: this.sequence,
      parentId: this.parentId,
      depth: this.depth,
      dependencyIds,
      queryKind: this.queryKind,
      queryKey: this.queryKey,
      responsePolicyKey: this.responsePolicyKey,
      locusKey: this.locusKey,
      epochKeys: this.epochKeys,
      materializationPolicy: this.materializationPolicy,
      evaluationState: this.evaluationState,
      result: this.result,
      selection: this.selection,
      coverage: this.coverage,
      pageState: this.pageState,
      summary: this.summary,
      approximatePayloadBytes: this.approximatePayloadBytes,
      returnedRowCount: this.returnedRowCount,
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
      rowCount: this.returnedRowCount,
      retainedAnswerValue: this.retainedAnswerValue,
      depth: this.depth,
      kernelDelta: this.kernelDelta,
    };
  }
}

function queryClaimReuseKey(input: QueryClaimRequestInput): string {
  return [
    input.materializationPolicy,
    input.queryKind,
    input.queryKey,
    input.locusKey,
    input.responsePolicyKey,
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

function addQueryClaimDependencyIndex(
  index: Map<number, Set<number>>,
  key: number,
  value: number,
): void {
  let values = index.get(key);
  if (values == null) {
    values = new Set<number>();
    index.set(key, values);
  }
  values.add(value);
}

function removeQueryClaimDependencyIndex(
  index: Map<number, Set<number>>,
  key: number,
  value: number,
): void {
  const values = index.get(key);
  if (values == null) {
    return;
  }
  values.delete(value);
  if (values.size === 0) {
    index.delete(key);
  }
}

function sortedQueryClaimDependencyIndex(
  index: ReadonlyMap<number, ReadonlySet<number>>,
): ReadonlyMap<number, readonly number[]> {
  return new Map([...index].map(([key, values]) => [
    key,
    [...values].sort((left, right) => left - right),
  ]));
}

function addNodeToIndex<TKey extends string | number>(
  index: Map<TKey, Set<QueryClaimNode>>,
  key: TKey,
  node: QueryClaimNode,
): void {
  let bucket = index.get(key);
  if (bucket === undefined) {
    bucket = new Set<QueryClaimNode>();
    index.set(key, bucket);
  }
  bucket.add(node);
}

function removeNodeFromIndex<TKey extends string | number>(
  index: Map<TKey, Set<QueryClaimNode>>,
  key: TKey,
  node: QueryClaimNode,
): void {
  const bucket = index.get(key);
  if (bucket == null) {
    return;
  }
  bucket.delete(node);
  if (bucket.size === 0) {
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

function queryClaimAnswerLeaseStructuralFailure(
  lease: QueryClaimAnswerLease | null,
  requiredKind: string | undefined,
): Error | null {
  if (lease == null) {
    return requiredKind == null
      ? null
      : new Error(`Required query answer lease '${requiredKind}' was not sealed.`);
  }
  return requiredKind != null && lease.kind !== requiredKind
    ? new Error(
      `Query answer lease '${lease.kind}' does not satisfy required lease kind '${requiredKind}'.`,
    )
    : null;
}

interface PreparedRetainedQueryClaimAnswerLease {
  readonly lease: QueryClaimAnswerLease | null;
  readonly releaseAfterUse: boolean;
  readonly failure: Error | null;
}

/**
 * Compose the historical graph-owned lease with invocation-local proof without transferring either ownership.
 *
 * Structural validation happens on both the historical capability and the composed result. A distinct composed lease
 * belongs to this invocation and must be released after validation/observation; the node keeps its historical lease.
 */
function prepareRetainedQueryClaimAnswerLease(
  retainedLease: QueryClaimAnswerLease | null,
  requiredKind: string | undefined,
  boundary: QueryClaimAnswerBoundary,
): PreparedRetainedQueryClaimAnswerLease {
  let failure = queryClaimAnswerLeaseStructuralFailure(retainedLease, requiredKind);
  let lease = retainedLease;
  let releaseAfterUse = false;
  if (failure == null && retainedLease != null && boundary.composeRetainedAnswerLease != null) {
    try {
      lease = boundary.composeRetainedAnswerLease(retainedLease);
      releaseAfterUse = lease !== retainedLease;
    } catch (error) {
      failure = queryClaimAnswerLeaseError(error);
    }
  }
  if (failure == null) {
    failure = queryClaimAnswerLeaseStructuralFailure(lease, requiredKind);
  }
  return { lease, releaseAfterUse, failure };
}

function queryClaimAnswerLeaseCurrentnessFailure(
  lease: QueryClaimAnswerLease,
): Error | null {
  try {
    return lease.isCurrent()
      ? null
      : new Error(`Query answer lease '${lease.kind}' is no longer current.`);
  } catch (error) {
    return new Error('Query answer lease currentness validation failed.', { cause: error });
  }
}

/**
 * Finalize a fresh or same-token provisional lease.
 *
 * Observation deliberately precedes the transaction's defer/currentness decision: nested receipt observation composes
 * the child proof into the active root builder, which is what makes a subsequent subsumption/delegation check lawful.
 * A failed fresh/provisional finalization aborts that transaction branch, so observing before currentness cannot pollute
 * a successful replacement candidate.
 */
function finalizeFreshOrProvisionalQueryClaimAnswerLease(
  lease: QueryClaimAnswerLease | null,
  requiredKind: string | undefined,
  boundary: QueryClaimAnswerBoundary,
): Error | null {
  const structuralFailure = queryClaimAnswerLeaseStructuralFailure(lease, requiredKind);
  if (structuralFailure != null || lease == null) {
    return structuralFailure;
  }
  const transaction = boundary.answerTransaction;
  if (transaction == null) {
    const currentnessFailure = queryClaimAnswerLeaseCurrentnessFailure(lease);
    if (currentnessFailure != null) {
      return currentnessFailure;
    }
    try {
      boundary.observeAnswerLease?.(lease);
      return null;
    } catch (error) {
      return queryClaimAnswerLeaseError(error);
    }
  }
  try {
    boundary.observeAnswerLease?.(lease);
  } catch (error) {
    return queryClaimAnswerLeaseError(error);
  }

  try {
    if (transaction.shouldDeferAnswerLeaseCurrentness(lease)) {
      return null;
    }
  } catch (error) {
    return queryClaimAnswerLeaseError(error);
  }

  const currentnessFailure = queryClaimAnswerLeaseCurrentnessFailure(lease);
  if (currentnessFailure != null) {
    return currentnessFailure;
  }
  try {
    transaction.didValidateAnswerLease(lease);
    return null;
  } catch (error) {
    return queryClaimAnswerLeaseError(error);
  }
}

/** Validate a committed candidate before observing it, so a stale historical receipt cannot taint a replacement. */
function validateCommittedQueryClaimAnswerLease(
  lease: QueryClaimAnswerLease | null,
  requiredKind: string | undefined,
): Error | null {
  const structuralFailure = queryClaimAnswerLeaseStructuralFailure(lease, requiredKind);
  if (structuralFailure != null || lease == null) {
    return structuralFailure;
  }
  return queryClaimAnswerLeaseCurrentnessFailure(lease);
}

/** Observe a committed lease only after full currentness validation, then notify the transaction's proof boundary. */
function finalizeValidatedCommittedQueryClaimAnswerLease(
  lease: QueryClaimAnswerLease | null,
  boundary: QueryClaimAnswerBoundary,
): Error | null {
  if (lease == null) {
    return null;
  }
  try {
    boundary.observeAnswerLease?.(lease);
    boundary.answerTransaction?.didValidateAnswerLease(lease);
    return null;
  } catch (error) {
    return queryClaimAnswerLeaseError(error);
  }
}

function queryClaimAnswerLeaseError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error(errorSummary(error));
}

function disposeQueryClaimAnswerLease(lease: QueryClaimAnswerLease | null): void {
  if (lease == null) {
    return;
  }
  try {
    lease.dispose();
  } catch {
    // Disposal is best-effort, but ownership is still released and the graph never invokes this lease again.
  }
}

function releaseQueryClaimAnswerLease(
  lease: QueryClaimAnswerLease | null,
  deferDisposal?: QueryClaimAnswerDisposalCollector,
): void {
  if (lease == null) {
    return;
  }
  const disposal = (): void => disposeQueryClaimAnswerLease(lease);
  if (deferDisposal == null) {
    disposal();
  } else {
    deferDisposal(disposal);
  }
}

export function approximateQueryAnswerPayloadBytes(answer: QueryClaimAnswerShape): number {
  return approximateScalarBytes(answer.schemaVersion)
    + approximateScalarBytes(answer.result)
    + approximateScalarBytes(answer.selection)
    + approximateScalarBytes(answer.coverage)
    + approximateScalarBytes(answer.summary)
    + approximatePayloadValueBytes(answer.value, MAX_QUERY_ANSWER_PAYLOAD_ESTIMATE_BYTES)
    + (answer.page == null ? 0 : approximatePayloadValueBytes(answer.page, MAX_QUERY_ANSWER_PAYLOAD_ESTIMATE_BYTES))
    + (answer.continuations == null ? 0 : approximatePayloadValueBytes(answer.continuations, MAX_QUERY_ANSWER_PAYLOAD_ESTIMATE_BYTES))
    + (answer.profile == null ? 0 : approximatePayloadValueBytes(answer.profile, MAX_QUERY_ANSWER_PAYLOAD_ESTIMATE_BYTES));
}

function queryClaimPageState(
  page: QueryClaimAnswerPageShape | null | undefined,
): QueryClaimPageState | null {
  if (page == null) {
    return null;
  }
  return {
    returnedRows: finiteNonNegativeInteger(page.returnedRows) ?? 0,
    totalRows: finiteNonNegativeInteger(page.totalRows),
    exhausted: page.exhausted === true,
    hasNextCursor: typeof page.nextCursor === 'string' && page.nextCursor.length > 0,
    cursorProblemKind: typeof page.cursorProblem?.kind === 'string'
      ? page.cursorProblem.kind
      : null,
    clamped: page.clamped === true,
    byteClamped: page.byteClamped === true,
  };
}

function finiteNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
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
