import path from 'node:path';

import type { ResolvedSemanticSourceWorld } from '../boot/source-world.js';
import {
  type ComputationGenerationReference,
  type ComputationLifecycleRegistry,
  type ComputationRead,
} from '../kernel/computation-lifecycle.js';
import {
  SemanticRuntimeProjectInputRead,
  SemanticRuntimeProjectInputReadKind,
  type SemanticRuntimeProjectInputAuthority,
} from '../kernel/project-input.js';
import {
  GenerationCurrentnessClock,
  type GenerationCurrentnessWitness,
} from '../kernel/generation-authority.js';
import { sourceTextContentRevision } from '../kernel/source-text-revision.js';
import type { QueryClaimAnswerLease } from '../inquiry/query-claim-graph.js';
import {
  SEMANTIC_RUNTIME_ANALYSIS_BASIS_SCHEMA_VERSION,
  SEMANTIC_RUNTIME_API_VERSION,
  type SemanticRuntimeAnalysisBasis,
  type SemanticRuntimeAnswer,
} from './contracts.js';

export const SEMANTIC_RUNTIME_ANALYSIS_RECEIPT_KIND = 'semantic-runtime-analysis-receipt/1' as const;

const PORTABLE_SEMANTIC_FACT_DOMAINS = new Set([
  'project-compiler-options-environment',
  'static-project-evaluation-profile',
]);

export interface SemanticRuntimeAnalysisReceiptValidation {
  readonly isCurrent: boolean;
  readonly runtimeIncarnationCurrent: boolean;
  readonly changedReadKeys: readonly string[];
  readonly changedSemanticFactKeys: readonly string[];
}

interface SemanticRuntimeAnalysisSourceWorldStamp {
  readonly semanticWorkspaceKey: string;
  readonly sourceWorldRevision: string;
}

/**
 * Process-private answer-lifetime authority for one SemanticRuntime instance.
 *
 * Advancing invalidates detached answers after a global cache clear without changing portable semantic identity.
 * Closing additionally prevents the retired runtime from minting new answer receipts. Equivalent source-world rebinds
 * deliberately retain this authority because their portable semantic plan is unchanged.
 */
export class SemanticRuntimeAnalysisLifetimeAuthority {
  private readonly currentness = new GenerationCurrentnessClock();
  private closed = false;

  capture(): GenerationCurrentnessWitness {
    if (this.closed) {
      throw new Error('Cannot capture an analysis receipt from a retired semantic-runtime incarnation.');
    }
    return this.currentness.capture('semantic-runtime-analysis-lifetime');
  }

  advance(): void {
    if (!this.closed) {
      this.currentness.advance();
    }
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.currentness.advance();
  }
}

/**
 * Detached executable proof for one semantic answer.
 *
 * It retains exact host-read callbacks and small immutable environment reads, never an app emission, computation
 * state, kernel handle graph, request epoch, or consumer object. Query-claim graphs own and dispose their instance;
 * answer envelopes and enclosing operations receive independent forks.
 */
export class SemanticRuntimeAnalysisReceipt implements QueryClaimAnswerLease {
  readonly kind = SEMANTIC_RUNTIME_ANALYSIS_RECEIPT_KIND;
  readonly basis: SemanticRuntimeAnalysisBasis;
  private disposed = false;

  constructor(
    private readonly sourceWorld: SemanticRuntimeAnalysisSourceWorldStamp,
    private readonly projectInputAuthority: SemanticRuntimeProjectInputAuthority,
    private readonly lifetimeAuthority: SemanticRuntimeAnalysisLifetimeAuthority,
    private readonly lifetimeWitness: GenerationCurrentnessWitness,
    readonly projectInputReads: readonly SemanticRuntimeProjectInputRead[],
    readonly semanticFactReads: readonly ComputationRead[],
  ) {
    for (const read of projectInputReads) {
      if (!read.belongsTo(projectInputAuthority)) {
        throw new Error('Semantic analysis receipt contains a read from another project-input authority.');
      }
    }
    this.projectInputReads = Object.freeze([...projectInputReads]);
    this.semanticFactReads = Object.freeze([...semanticFactReads]);
    this.basis = semanticRuntimeAnalysisBasis(
      sourceWorld,
      this.projectInputReads,
      this.semanticFactReads,
    );
  }

  validate(): SemanticRuntimeAnalysisReceiptValidation {
    if (this.disposed) {
      return Object.freeze({
        isCurrent: false,
        runtimeIncarnationCurrent: false,
        changedReadKeys: Object.freeze([]),
        changedSemanticFactKeys: Object.freeze([]),
      });
    }
    const runtimeIncarnationCurrentBeforeReads = this.lifetimeWitness.isCurrent();
    if (!runtimeIncarnationCurrentBeforeReads) {
      return Object.freeze({
        isCurrent: false,
        runtimeIncarnationCurrent: false,
        changedReadKeys: Object.freeze([]),
        changedSemanticFactKeys: Object.freeze([]),
      });
    }
    const projectInputEventSequence = this.projectInputAuthority.currentEventSequence;
    const directlyChangedReadKeys = this.projectInputReads
      .filter((read) => !read.validateObservedValue().isCurrent)
      .map((read) => read.readKey);
    const changedSemanticFactKeys = this.semanticFactReads
      .filter((read) => !read.validate().isCurrent)
      .map(semanticFactKey);
    const reentrantChangedReadKeys = this.projectInputAuthority.currentEventSequence === projectInputEventSequence
      ? []
      : this.projectInputReads
        .filter((read) => this.projectInputAuthority.mayHaveChanged(read.descriptor, projectInputEventSequence))
        .map((read) => read.readKey);
    const changedReadKeys = [...new Set([
      ...directlyChangedReadKeys,
      ...reentrantChangedReadKeys,
    ])].sort();
    // Validation callbacks are allowed to re-enter the runtime. A cache clear or retirement during one of those
    // callbacks must invalidate this receipt even when every individual input still reports its observed value.
    const runtimeIncarnationCurrent = !this.disposed && this.lifetimeWitness.isCurrent();
    return Object.freeze({
      isCurrent: runtimeIncarnationCurrent
        && changedReadKeys.length === 0
        && changedSemanticFactKeys.length === 0,
      runtimeIncarnationCurrent,
      changedReadKeys: Object.freeze(changedReadKeys),
      changedSemanticFactKeys: Object.freeze(changedSemanticFactKeys),
    });
  }

  isCurrent(): boolean {
    return this.validate().isCurrent;
  }

  /** Independent proof for an answer envelope or enclosing operation; ownership never aliases the graph lease. */
  fork(): SemanticRuntimeAnalysisReceipt {
    if (this.disposed) {
      throw new Error('Cannot fork a disposed semantic-runtime analysis receipt.');
    }
    return new SemanticRuntimeAnalysisReceipt(
      this.sourceWorld,
      this.projectInputAuthority,
      this.lifetimeAuthority,
      this.lifetimeWitness,
      this.projectInputReads,
      this.semanticFactReads,
    );
  }

  belongsTo(lifetimeAuthority: SemanticRuntimeAnalysisLifetimeAuthority): boolean {
    return this.lifetimeAuthority === lifetimeAuthority;
  }

  isRuntimeIncarnationCurrent(): boolean {
    return !this.disposed && this.lifetimeWitness.isCurrent();
  }

  dispose(): void {
    this.disposed = true;
  }
}

/** Mutable, answer-local composition boundary. Conflicting exact revisions fail instead of producing a mixed basis. */
export class SemanticRuntimeAnalysisReceiptBuilder {
  private readonly projectInputReadsByKey = new Map<string, SemanticRuntimeProjectInputRead>();
  private readonly semanticFactReadsByKey = new Map<string, ComputationRead>();
  private readonly sourceWorld: SemanticRuntimeAnalysisSourceWorldStamp;
  private readonly projectInputAuthority: SemanticRuntimeProjectInputAuthority;
  private readonly lifetimeWitness: GenerationCurrentnessWitness;
  private mutationOrdinal = 0;

  constructor(
    sourceWorld: ResolvedSemanticSourceWorld,
    private readonly lifetimeAuthority: SemanticRuntimeAnalysisLifetimeAuthority,
  ) {
    this.sourceWorld = Object.freeze({
      semanticWorkspaceKey: sourceWorld.semanticWorkspaceKey,
      sourceWorldRevision: sourceWorld.sourceWorldRevision,
    });
    this.projectInputAuthority = sourceWorld.projectInputAuthority;
    this.lifetimeWitness = lifetimeAuthority.capture();
  }

  observeProjectInputReads(reads: readonly SemanticRuntimeProjectInputRead[]): void {
    for (const read of reads) {
      if (!read.belongsTo(this.projectInputAuthority)) {
        throw new Error('Cannot compose a semantic answer from another project-input authority.');
      }
      const existing = this.projectInputReadsByKey.get(read.readKey);
      if (existing != null && existing.observedRevision !== read.observedRevision) {
        throw new Error(
          `Semantic answer basis contains conflicting revisions for '${read.readKey}': `
          + `${existing.observedRevision} and ${read.observedRevision}.`,
        );
      }
      this.projectInputReadsByKey.set(read.readKey, read);
      this.mutationOrdinal += 1;
    }
  }

  /**
   * Read source text as part of the final consumer operation without widening a project or source-world generation.
   * An absorbed answer's exact FileContent read wins, ensuring source-span mapping uses the same immutable text that
   * produced the semantic answer. Otherwise one operation-local read is captured and memoized by its canonical key.
   */
  readSourceText(fileName: string): string | undefined {
    if (!path.isAbsolute(fileName)) {
      throw new Error(`Managed semantic workspace source-text reads require an absolute host path: '${fileName}'.`);
    }
    const readKey = this.projectInputAuthority.fileContentReadKey(fileName);
    let read = this.projectInputReadsByKey.get(readKey);
    if (read == null) {
      read = this.projectInputAuthority.captureExactFileContentRead(fileName);
      this.observeProjectInputReads([read]);
    }
    if (read.kind !== SemanticRuntimeProjectInputReadKind.FileContent) {
      throw new Error(`Project-input read key '${readKey}' does not identify source text.`);
    }
    const value = read.value;
    if (value !== undefined && typeof value !== 'string') {
      throw new Error(`Project-input source-text read '${readKey}' produced a non-text value.`);
    }
    return value;
  }

  observeCommittedGeneration(
    lifecycle: ComputationLifecycleRegistry,
    generation: ComputationGenerationReference,
  ): void {
    const reads = lifecycle.readCommittedGenerationReadClosure(
      generation,
      isPortableSemanticAnalysisRead,
    );
    this.observeProjectInputReads(
      reads.filter((read): read is SemanticRuntimeProjectInputRead =>
        read instanceof SemanticRuntimeProjectInputRead),
    );
    this.observeSemanticFactReads(
      reads.filter((read) => !(read instanceof SemanticRuntimeProjectInputRead)),
    );
  }

  observeReceipt(receipt: SemanticRuntimeAnalysisReceipt): void {
    if (!receipt.belongsTo(this.lifetimeAuthority)) {
      throw new Error('Cannot compose a semantic answer receipt from another runtime incarnation.');
    }
    if (!receipt.isRuntimeIncarnationCurrent()) {
      throw new Error('Cannot compose a semantic answer receipt whose runtime incarnation is no longer current.');
    }
    if (
      receipt.basis.semanticWorkspaceKey !== this.sourceWorld.semanticWorkspaceKey
      || receipt.basis.sourceWorldRevision !== this.sourceWorld.sourceWorldRevision
    ) {
      throw new Error(
        `Cannot compose semantic answer basis '${receipt.basis.revision}' from another resolved source world.`,
      );
    }
    this.observeProjectInputReads(receipt.projectInputReads);
    this.observeSemanticFactReads(receipt.semanticFactReads);
  }

  /** Compose another in-flight builder without validating or transferring ownership of either proof. */
  observeBuilder(builder: SemanticRuntimeAnalysisReceiptBuilder): void {
    if (
      builder.lifetimeAuthority !== this.lifetimeAuthority
      || builder.projectInputAuthority !== this.projectInputAuthority
      || builder.sourceWorld.semanticWorkspaceKey !== this.sourceWorld.semanticWorkspaceKey
      || builder.sourceWorld.sourceWorldRevision !== this.sourceWorld.sourceWorldRevision
    ) {
      throw new Error('Cannot compose semantic answer reads from another runtime or resolved source world.');
    }
    this.observeProjectInputReads([...builder.projectInputReadsByKey.values()]);
    this.observeSemanticFactReads([...builder.semanticFactReadsByKey.values()]);
  }

  /** Assert that this aggregate builder contains every exact key/revision carried by a delegated child proof. */
  assertSubsumesReceipt(receipt: SemanticRuntimeAnalysisReceipt): void {
    if (
      !receipt.belongsTo(this.lifetimeAuthority)
      || receipt.basis.semanticWorkspaceKey !== this.sourceWorld.semanticWorkspaceKey
      || receipt.basis.sourceWorldRevision !== this.sourceWorld.sourceWorldRevision
    ) {
      throw new Error('Cannot compare semantic answer basis from another runtime or resolved source world.');
    }
    for (const read of receipt.projectInputReads) {
      const aggregate = this.projectInputReadsByKey.get(read.readKey);
      if (aggregate?.observedRevision !== read.observedRevision) {
        throw new Error(
          `Aggregate semantic answer proof does not subsume project-input read '${read.readKey}' `
          + `at revision '${read.observedRevision}'.`,
        );
      }
    }
    for (const read of receipt.semanticFactReads) {
      const key = semanticFactKey(read);
      const aggregate = this.semanticFactReadsByKey.get(key);
      if (aggregate?.observedRevision !== read.observedRevision) {
        throw new Error(
          `Aggregate semantic answer proof does not subsume semantic fact '${key}' `
          + `at revision '${read.observedRevision}'.`,
        );
      }
    }
  }

  /** Monotonic mutation stamp used to keep a validated root proof closed through transaction publication. */
  readMutationOrdinal(): number {
    return this.mutationOrdinal;
  }

  /**
   * Compose a retained operation proof only when it is still exact for this pinned runtime and source world.
   * Stale or unrelated capabilities are ordinary cache misses; conflicting current reads remain invariant failures.
   */
  tryObserveReceipt(receipt: SemanticRuntimeAnalysisReceipt): boolean {
    if (
      !receipt.belongsTo(this.lifetimeAuthority)
      || !receipt.isRuntimeIncarnationCurrent()
      || receipt.basis.semanticWorkspaceKey !== this.sourceWorld.semanticWorkspaceKey
      || receipt.basis.sourceWorldRevision !== this.sourceWorld.sourceWorldRevision
      || !receipt.validate().isCurrent
    ) {
      return false;
    }
    this.observeProjectInputReads(receipt.projectInputReads);
    this.observeSemanticFactReads(receipt.semanticFactReads);
    return true;
  }

  seal(): SemanticRuntimeAnalysisReceipt {
    return new SemanticRuntimeAnalysisReceipt(
      this.sourceWorld,
      this.projectInputAuthority,
      this.lifetimeAuthority,
      this.lifetimeWitness,
      [...this.projectInputReadsByKey.values()].sort((left, right) => left.readKey.localeCompare(right.readKey)),
      [...this.semanticFactReadsByKey.values()].sort((left, right) =>
        semanticFactKey(left).localeCompare(semanticFactKey(right))),
    );
  }

  private observeSemanticFactReads(reads: readonly ComputationRead[]): void {
    for (const read of reads) {
      if (!PORTABLE_SEMANTIC_FACT_DOMAINS.has(read.domain)) {
        throw new Error(`Computation read '${read.domain}:${read.readKey}' is not a portable semantic basis fact.`);
      }
      const key = semanticFactKey(read);
      const existing = this.semanticFactReadsByKey.get(key);
      if (existing != null && existing.observedRevision !== read.observedRevision) {
        throw new Error(
          `Semantic answer basis contains conflicting revisions for '${key}': `
          + `${existing.observedRevision} and ${read.observedRevision}.`,
        );
      }
      this.semanticFactReadsByKey.set(key, read);
      this.mutationOrdinal += 1;
    }
  }
}

const semanticRuntimeAnalysisReceiptSymbol = Symbol('semantic-runtime-analysis-receipt');

/** Attach a portable basis plus a non-serializable executable receipt to a public answer envelope. */
export function withSemanticRuntimeAnalysisReceipt<TValue>(
  answer: SemanticRuntimeAnswer<TValue>,
  receipt: SemanticRuntimeAnalysisReceipt,
): SemanticRuntimeAnswer<TValue> {
  const projected: SemanticRuntimeAnswer<TValue> = {
    ...answer,
    analysisBasis: receipt.basis,
  };
  Object.defineProperty(projected, semanticRuntimeAnalysisReceiptSymbol, {
    value: receipt.fork(),
    enumerable: true,
    configurable: false,
    writable: false,
  });
  return projected;
}

/** Read the process-private proof carried by an answer. Object spread preserves the enumerable symbol carrier. */
export function semanticRuntimeAnalysisReceiptFor(
  answer: SemanticRuntimeAnswer<unknown>,
): SemanticRuntimeAnalysisReceipt | null {
  const candidate = (answer as SemanticRuntimeAnswer<unknown> & {
    readonly [semanticRuntimeAnalysisReceiptSymbol]?: unknown;
  })[semanticRuntimeAnalysisReceiptSymbol];
  return candidate instanceof SemanticRuntimeAnalysisReceipt ? candidate : null;
}

function isPortableSemanticAnalysisRead(read: ComputationRead): read is ComputationRead {
  return read instanceof SemanticRuntimeProjectInputRead
    || PORTABLE_SEMANTIC_FACT_DOMAINS.has(read.domain);
}

function semanticRuntimeAnalysisBasis(
  sourceWorld: SemanticRuntimeAnalysisSourceWorldStamp,
  projectInputReads: readonly SemanticRuntimeProjectInputRead[],
  semanticFactReads: readonly ComputationRead[],
): SemanticRuntimeAnalysisBasis {
  const semanticModelFacts = {
    projectInputs: projectInputReads.map((read) => ({
      kind: read.kind,
      readKey: read.readKey,
      observedRevision: read.observedRevision,
    })),
    semanticEnvironment: semanticFactReads.map((read) => ({
      domain: read.domain,
      readKey: read.readKey,
      observedRevision: read.observedRevision,
    })),
  };
  const semanticModelRevision = `${SEMANTIC_RUNTIME_ANALYSIS_BASIS_SCHEMA_VERSION}:model:${
    sourceTextContentRevision(JSON.stringify(semanticModelFacts))
  }`;
  const identity = {
    schemaVersion: SEMANTIC_RUNTIME_ANALYSIS_BASIS_SCHEMA_VERSION,
    runtimeApiVersion: SEMANTIC_RUNTIME_API_VERSION,
    semanticWorkspaceKey: sourceWorld.semanticWorkspaceKey,
    sourceWorldRevision: sourceWorld.sourceWorldRevision,
    semanticModelRevision,
  };
  return Object.freeze({
    ...identity,
    revision: `${SEMANTIC_RUNTIME_ANALYSIS_BASIS_SCHEMA_VERSION}:${
      sourceTextContentRevision(JSON.stringify(identity))
    }`,
  });
}

function semanticFactKey(read: ComputationRead): string {
  return `${read.domain}:${read.readKey}`;
}
