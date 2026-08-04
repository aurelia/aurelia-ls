import type {
  QueryClaimAnswerLease,
  QueryClaimAnswerDisposalCollector,
  QueryClaimAnswerTransactionBoundary,
  QueryClaimProvisionalAnswerHandle,
} from '../inquiry/query-claim-graph.js';
import type { SemanticRuntimeProjectInputRead } from '../kernel/project-input.js';
import {
  SemanticRuntimeAnalysisReceipt,
  SemanticRuntimeAnalysisReceiptBuilder,
} from './analysis-receipt.js';

const enum SemanticAnswerTransactionPhase {
  Open = 'open',
  ProofValidated = 'proof-validated',
  Committing = 'committing',
  Committed = 'committed',
  RolledBack = 'rolled-back',
}

/**
 * One synchronous answer-publication transaction shared by nested runtime and app claims.
 *
 * Semantic computations remain ordinary immutable caches. This boundary owns only exact answer proofs and provisional
 * query-claim publication, so a failed outer answer cannot expose a child DTO that delegated currentness to that outer
 * proof.
 */
export class SemanticAnswerTransaction {
  readonly token = Object.freeze({ kind: 'semantic-answer-transaction' });
  private readonly provisionalAnswers: QueryClaimProvisionalAnswerHandle[] = [];
  private readonly activeBuilders: SemanticRuntimeAnalysisReceiptBuilder[] = [];
  private readonly deferredReceipts: SemanticRuntimeAnalysisReceipt[] = [];
  private rootBuilder: SemanticRuntimeAnalysisReceiptBuilder | null = null;
  private rootValidatedReceipt: SemanticRuntimeAnalysisReceipt | null = null;
  private rootValidatedMutationOrdinal: number | null = null;
  private phase = SemanticAnswerTransactionPhase.Open;

  savepoint(): number {
    this.assertOpen();
    return this.provisionalAnswers.length;
  }

  boundaryFor(owner: SemanticRuntimeAnalysisReceiptBuilder): QueryClaimAnswerTransactionBoundary {
    this.assertOpen();
    this.rootBuilder ??= owner;
    return {
      token: this.token,
      assertAnswerAdmissionOpen: () => this.assertOpen(),
      enlistProvisionalAnswer: (answer) => this.enlist(answer),
      shouldDeferAnswerLeaseCurrentness: (lease) => this.shouldDeferAnswerLeaseCurrentness(owner, lease),
      didValidateAnswerLease: (lease) => this.didValidateAnswerLease(owner, lease),
    };
  }

  enterBuilder(builder: SemanticRuntimeAnalysisReceiptBuilder): void {
    this.assertOpen();
    this.rootBuilder ??= builder;
    this.activeBuilders.push(builder);
  }

  leaveBuilder(builder: SemanticRuntimeAnalysisReceiptBuilder): void {
    const active = this.activeBuilders.pop();
    if (active !== builder) {
      throw new Error('Semantic answer transaction builders closed out of order.');
    }
  }

  observeReceipt(
    owner: SemanticRuntimeAnalysisReceiptBuilder,
    receipt: SemanticRuntimeAnalysisReceipt,
  ): SemanticRuntimeAnalysisReceipt {
    this.assertOpen();
    for (const builder of this.activeBuilders) {
      if (builder !== owner) {
        builder.observeReceipt(receipt);
      }
    }
    return receipt.fork();
  }

  observeProjectInputReads(reads: readonly SemanticRuntimeProjectInputRead[]): void {
    this.assertOpen();
    for (const builder of this.activeBuilders) {
      builder.observeProjectInputReads(reads);
    }
  }

  /** Preserve coherent reads from a failed nested branch because they influenced its enclosing answer's control flow. */
  observeFailedBuilder(owner: SemanticRuntimeAnalysisReceiptBuilder): void {
    this.assertOpen();
    for (const builder of this.activeBuilders) {
      if (builder !== owner) {
        builder.observeBuilder(owner);
      }
    }
  }

  tryObserveFailedBuilder(owner: SemanticRuntimeAnalysisReceiptBuilder): boolean {
    if (this.phase !== SemanticAnswerTransactionPhase.Open) {
      return false;
    }
    this.observeFailedBuilder(owner);
    return true;
  }

  rollbackTo(savepoint: number): void {
    if (
      this.phase !== SemanticAnswerTransactionPhase.Open
      && this.phase !== SemanticAnswerTransactionPhase.ProofValidated
    ) {
      throw new Error(`Cannot roll back a semantic answer savepoint while phase is '${this.phase}'.`);
    }
    if (savepoint < 0 || savepoint > this.provisionalAnswers.length) {
      throw new Error(`Invalid semantic answer transaction savepoint '${savepoint}'.`);
    }
    const disposals: (() => void)[] = [];
    this.withdrawAnswersFrom(savepoint, (disposal) => disposals.push(disposal));
    if (this.phase === SemanticAnswerTransactionPhase.ProofValidated) {
      this.rootValidatedReceipt?.dispose();
      this.rootValidatedReceipt = null;
      this.rootValidatedMutationOrdinal = null;
      this.phase = SemanticAnswerTransactionPhase.Open;
    }
    this.runDeferredDisposals(disposals);
  }

  rollback(): void {
    if (this.phase === SemanticAnswerTransactionPhase.RolledBack) {
      return;
    }
    if (
      this.phase === SemanticAnswerTransactionPhase.Committing
      || this.phase === SemanticAnswerTransactionPhase.Committed
    ) {
      throw new Error(`Cannot roll back a ${this.phase} semantic answer transaction.`);
    }
    const disposals: (() => void)[] = [];
    this.withdrawAnswersFrom(0, (disposal) => disposals.push(disposal));
    this.phase = SemanticAnswerTransactionPhase.RolledBack;
    this.releaseProofState();
    this.runDeferredDisposals(disposals);
  }

  commit(): void {
    if (this.phase !== SemanticAnswerTransactionPhase.ProofValidated) {
      throw new Error(`Cannot commit semantic answer transaction while phase is '${this.phase}'.`);
    }
    const rootBuilder = this.requireRootBuilder();
    if (rootBuilder.readMutationOrdinal() !== this.rootValidatedMutationOrdinal) {
      this.rollback();
      throw new Error('Semantic answer proof changed after root currentness validation.');
    }
    if (this.rootValidatedReceipt?.isRuntimeIncarnationCurrent() !== true) {
      this.rollback();
      throw new Error('Semantic answer runtime incarnation changed after root currentness validation.');
    }
    this.phase = SemanticAnswerTransactionPhase.Committing;
    const commitGroups = new Map<object, QueryClaimProvisionalAnswerHandle>();
    const disposals: (() => void)[] = [];
    const collectDisposal: QueryClaimAnswerDisposalCollector = (disposal) => disposals.push(disposal);
    try {
      for (const answer of this.provisionalAnswers) {
        answer.publish();
        commitGroups.set(answer.commitGroup, answer);
      }
      for (const answer of commitGroups.values()) {
        answer.settleCommit(collectDisposal);
      }
      this.phase = SemanticAnswerTransactionPhase.Committed;
      this.provisionalAnswers.length = 0;
      this.releaseProofState();
    } catch (error) {
      // Every publish is reversible and completes before the callback-free settle phase starts. Settlement has no
      // readiness branch and invokes no caller code, so reaching this path during settle indicates an internal bug;
      // withdrawing all still-provisional handles is the strongest safe recovery available.
      this.withdrawAnswersFrom(0, collectDisposal);
      this.phase = SemanticAnswerTransactionPhase.RolledBack;
      this.releaseProofState();
      this.runDeferredDisposals(disposals);
      throw error;
    }
    this.runDeferredDisposals(disposals);
  }

  private enlist(answer: QueryClaimProvisionalAnswerHandle): void {
    this.assertOpen();
    this.provisionalAnswers.push(answer);
  }

  private withdrawAnswersFrom(
    savepoint: number,
    collectDisposal: QueryClaimAnswerDisposalCollector,
  ): void {
    for (let index = this.provisionalAnswers.length - 1; index >= savepoint; index -= 1) {
      this.provisionalAnswers[index]?.rollback(collectDisposal);
    }
    this.provisionalAnswers.splice(savepoint);
  }

  private releaseProofState(): void {
    this.rootValidatedReceipt?.dispose();
    this.rootValidatedReceipt = null;
    this.rootValidatedMutationOrdinal = null;
    this.deferredReceipts.length = 0;
    this.activeBuilders.length = 0;
  }

  private runDeferredDisposals(disposals: readonly (() => void)[]): void {
    for (const dispose of disposals) {
      try {
        dispose();
      } catch {
        // Graph release closures are already best-effort; keep the transaction terminal if a foreign callback escapes.
      }
    }
  }

  private shouldDeferAnswerLeaseCurrentness(
    owner: SemanticRuntimeAnalysisReceiptBuilder,
    lease: QueryClaimAnswerLease,
  ): boolean {
    this.assertOpen();
    const receipt = semanticAnalysisReceipt(lease);
    const rootBuilder = this.requireRootBuilder();
    if (owner === rootBuilder) {
      for (const deferred of this.deferredReceipts) {
        rootBuilder.assertSubsumesReceipt(deferred);
      }
      return false;
    }
    if (!this.activeBuilders.includes(rootBuilder)) {
      throw new Error('Fresh nested answer lease cannot delegate currentness outside the active root materializer.');
    }
    rootBuilder.assertSubsumesReceipt(receipt);
    this.deferredReceipts.push(receipt);
    return true;
  }

  private didValidateAnswerLease(
    owner: SemanticRuntimeAnalysisReceiptBuilder,
    lease: QueryClaimAnswerLease,
  ): void {
    const rootBuilder = this.requireRootBuilder();
    if (owner !== rootBuilder) {
      return;
    }
    this.assertOpen();
    const receipt = semanticAnalysisReceipt(lease);
    for (const deferred of this.deferredReceipts) {
      rootBuilder.assertSubsumesReceipt(deferred);
    }
    this.rootValidatedReceipt?.dispose();
    this.rootValidatedReceipt = receipt.fork();
    this.rootValidatedMutationOrdinal = rootBuilder.readMutationOrdinal();
    this.phase = SemanticAnswerTransactionPhase.ProofValidated;
  }

  private requireRootBuilder(): SemanticRuntimeAnalysisReceiptBuilder {
    if (this.rootBuilder == null) {
      throw new Error('Semantic answer transaction has no root receipt builder.');
    }
    return this.rootBuilder;
  }

  private assertOpen(): void {
    if (this.phase !== SemanticAnswerTransactionPhase.Open) {
      throw new Error(`Semantic answer transaction is not open (phase '${this.phase}').`);
    }
  }
}

function semanticAnalysisReceipt(lease: QueryClaimAnswerLease): SemanticRuntimeAnalysisReceipt {
  if (!(lease instanceof SemanticRuntimeAnalysisReceipt)) {
    throw new Error(`Semantic answer lease '${lease.kind}' is not a semantic-runtime analysis receipt.`);
  }
  return lease;
}
