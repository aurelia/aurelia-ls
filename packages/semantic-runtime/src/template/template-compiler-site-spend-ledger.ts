import type { ProductHandle } from '../kernel/handles.js';
import {
  TemplateCompilerNormalizedSite,
  TemplateCompilerNormalizedTextSite,
} from './template-compiler-normalized-site-index.js';
import type { TemplateCompilerNormalizedSiteIndex } from './template-compiler-normalized-site-index.js';
import {
  TemplateCompilerInvocationPhase,
} from './template-compiler-execution.js';
import type {
  TemplateCompilerExecutionLaneReference,
  TemplateCompilerExecutionSession,
  TemplateCompilerInvocationBootstrapClosure,
  TemplateCompilerOperation,
} from './template-compiler-execution.js';
import type {
  TemplateCompilerExtractedLocalBindable,
  TemplateCompilerExtractedLocalTemplate,
} from './template-compiler-local-extraction.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerCommentOccurrence,
  TemplateCompilerDoctypeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
import type { TemplateCompilerNodeOccurrence } from './template-compiler-occurrence.js';

export type TemplateCompilerNormalizedSiteBundle =
  | TemplateCompilerNormalizedSite
  | TemplateCompilerNormalizedTextSite;

export type TemplateCompilerSpendOccurrence =
  | TemplateCompilerAttributeOccurrence
  | TemplateCompilerTextOccurrence;

export type TemplateCompilerOccurrenceOnlyTarget =
  | TemplateCompilerNodeOccurrence
  | TemplateCompilerAttributeOccurrence;

/** Candidate accounting disposition assigned to one authored-precedent site bundle. */
export const enum TemplateCompilerSiteSpendDisposition {
  BrowserCompatible = 'browser-compatible',
  BrowserReloweringRequired = 'browser-relowering-required',
  LocalDeclarationConsumed = 'local-declaration-consumed',
  LocalBindableMetadataConsumed = 'local-bindable-metadata-consumed',
  TransferredToChildInvocation = 'transferred-to-child-invocation',
  InertTemplateContent = 'inert-template-content',
  LetContentSuppressed = 'let-content-suppressed',
}

/** Caller-classified candidate occurrence that intentionally has no authored-precedent bundle spend. */
export const enum TemplateCompilerOccurrenceOnlyDisposition {
  StaticTextPassThrough = 'static-text-pass-through',
  BrowserImpliedElementPassThrough = 'browser-implied-element-pass-through',
  IgnoredComment = 'ignored-comment',
  IgnoredDoctype = 'ignored-doctype',
  GeneratedSiteNeedsLowering = 'generated-site-needs-lowering',
  NonSingularBrowserOrigin = 'non-singular-browser-origin',
}

export const enum TemplateCompilerSiteSpendConflictKind {
  SiteAlreadySpent = 'site-already-spent',
  OccurrenceAlreadySpent = 'occurrence-already-spent',
  ForeignIndexBundle = 'foreign-index-bundle',
  SiteOccurrenceKindMismatch = 'site-occurrence-kind-mismatch',
  InvalidDisposition = 'invalid-disposition',
  InvalidEventOrdinal = 'invalid-event-ordinal',
  SiteEventOrdinalMismatch = 'site-event-ordinal-mismatch',
  MissingLocalExclusionAuthority = 'missing-local-exclusion-authority',
  UnexpectedLocalExclusionAuthority = 'unexpected-local-exclusion-authority',
  InvalidLocalExclusionAuthority = 'invalid-local-exclusion-authority',
  InvalidOccurrenceDisposition = 'invalid-occurrence-disposition',
  DuplicateAuthoredRemainderEvidence = 'duplicate-authored-remainder-evidence',
  AuthoredRemainderAlreadyRecorded = 'authored-remainder-already-recorded',
  AuthoredRemainderForSpentSite = 'authored-remainder-for-spent-site',
}

/** One local-extraction disposition captured from the exact post-bootstrap occurrence topology. */
export class TemplateCompilerLocalSiteExclusionReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly occurrence: TemplateCompilerSpendOccurrence,
    readonly disposition:
      | TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed
      | TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed
      | TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
    readonly causeOperation: TemplateCompilerOperation,
    readonly destinationLane: TemplateCompilerExecutionLaneReference | null,
    readonly extraction: TemplateCompilerExtractedLocalTemplate,
    readonly bindable: TemplateCompilerExtractedLocalBindable | null,
  ) {
    this.#authority = authority;
  }

  isOwnedBy(authority: object): boolean {
    return this.#authority === authority;
  }
}

const localSiteExclusionConstructionAuthority = {};

/**
 * Nominal event-time snapshot of every local declaration, bindable-metadata, and child-transfer site exclusion.
 *
 * Capture is intentionally allowed only at the exact closure forest revision, before any child or sibling work. The
 * snapshot remains stable after capture; later topology is not consulted while accounting individual bundles.
 */
export class TemplateCompilerLocalSiteExclusionAuthority {
  static capture(
    execution: TemplateCompilerExecutionSession,
    closure: TemplateCompilerInvocationBootstrapClosure,
  ): TemplateCompilerLocalSiteExclusionAuthority {
    if (
      execution.bootstrapClosure(closure.lane) !== closure
      || execution.invocationPhase(closure.lane) !== TemplateCompilerInvocationPhase.BootstrapClosed
      || closure.lane.targetPlan != null
      || execution.sequence.readContexts().some((context) => context.lane === closure.lane)
      || execution.sequence.readLaneOperations(closure.lane).length !== closure.laneOperationCount
      || execution.forest.mutationRevision !== closure.forestMutationRevision
      || closure.childLaneTransfers.some((transfer) =>
        execution.invocationPhase(transfer.childLane) !== TemplateCompilerInvocationPhase.CompilerHooks
        || execution.sequence.readLaneOperations(transfer.childLane).length !== 0
      )
    ) {
      throw new Error(
        `Compiler invocation lane '${closure.lane.localKey}' has no current pre-child local-exclusion frontier.`,
      );
    }
    const authority = new TemplateCompilerLocalSiteExclusionAuthority(
      localSiteExclusionConstructionAuthority,
      execution,
      closure,
    );
    authority.captureRows();
    return authority;
  }

  readonly #receiptAuthority = {};
  readonly #receiptsByOccurrence = new Map<
    TemplateCompilerSpendOccurrence,
    TemplateCompilerLocalSiteExclusionReceipt
  >();

  private constructor(
    constructionAuthority: object,
    readonly execution: TemplateCompilerExecutionSession,
    readonly closure: TemplateCompilerInvocationBootstrapClosure,
  ) {
    if (constructionAuthority !== localSiteExclusionConstructionAuthority) {
      throw new Error('Local site exclusion authority was not captured by this module.');
    }
  }

  receiptFor(
    occurrence: TemplateCompilerSpendOccurrence,
  ): TemplateCompilerLocalSiteExclusionReceipt | null {
    return this.#receiptsByOccurrence.get(occurrence) ?? null;
  }

  owns(receipt: TemplateCompilerLocalSiteExclusionReceipt): boolean {
    return receipt.isOwnedBy(this.#receiptAuthority)
      && this.#receiptsByOccurrence.get(receipt.occurrence) === receipt;
  }

  private captureRows(): void {
    const attributeDetachments = new Map<TemplateCompilerAttributeOccurrence, TemplateCompilerOperation>();
    const nodeDetachments = new Map<TemplateCompilerNodeOccurrence, TemplateCompilerOperation>();
    for (const operation of this.closure.localExtraction.operations) {
      for (const mutation of operation.mutationBatch.attributeDetachmentMutations) {
        if (attributeDetachments.has(mutation.attribute)) {
          throw new Error(`Local exclusion attribute '${mutation.attribute.occurrenceKey}' is detached more than once.`);
        }
        attributeDetachments.set(mutation.attribute, operation);
      }
      for (const mutation of operation.mutationBatch.nodeDetachmentMutations) {
        if (nodeDetachments.has(mutation.node)) {
          throw new Error(`Local exclusion node '${mutation.node.occurrenceKey}' is detached more than once.`);
        }
        nodeDetachments.set(mutation.node, operation);
      }
    }

    for (const transfer of this.closure.childLaneTransfers) {
      const extraction = transfer.extraction;
      const declarationOperation = attributeDetachments.get(extraction.declarationAttribute) ?? null;
      if (declarationOperation == null) {
        throw new Error(`Local declaration '${extraction.name}' has no exact attribute-detachment operation.`);
      }
      this.addReceipt(
        extraction.declarationAttribute,
        TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed,
        declarationOperation,
        null,
        extraction,
        null,
      );
      for (const bindable of extraction.bindables) {
        if (nodeDetachments.get(bindable.element) !== bindable.detachmentOperation) {
          throw new Error(`Local bindable '${bindable.propertyName}' has no exact node-detachment operation.`);
        }
        for (const occurrence of siteOccurrencesInSubtree(bindable.element)) {
          this.addReceipt(
            occurrence,
            TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed,
            bindable.detachmentOperation,
            null,
            extraction,
            bindable,
          );
        }
      }
      if (nodeDetachments.get(extraction.carrier) !== extraction.carrierDetachmentOperation) {
        throw new Error(`Local carrier '${extraction.name}' has no exact node-detachment operation.`);
      }
      for (const occurrence of siteOccurrencesInSubtree(extraction.carrier)) {
        this.addReceipt(
          occurrence,
          TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
          extraction.carrierDetachmentOperation,
          transfer.childLane,
          extraction,
          null,
        );
      }
    }
  }

  private addReceipt(
    occurrence: TemplateCompilerSpendOccurrence,
    disposition:
      | TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed
      | TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed
      | TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation,
    causeOperation: TemplateCompilerOperation,
    destinationLane: TemplateCompilerExecutionLaneReference | null,
    extraction: TemplateCompilerExtractedLocalTemplate,
    bindable: TemplateCompilerExtractedLocalBindable | null,
  ): void {
    if (this.#receiptsByOccurrence.has(occurrence)) {
      throw new Error(`Local exclusion occurrence '${occurrence.occurrenceKey}' has more than one disposition.`);
    }
    this.#receiptsByOccurrence.set(occurrence, new TemplateCompilerLocalSiteExclusionReceipt(
      this.#receiptAuthority,
      occurrence,
      disposition,
      causeOperation,
      destinationLane,
      extraction,
      bindable,
    ));
  }
}

/** One successful authored-site accounting row. */
export class TemplateCompilerSiteSpend {
  constructor(
    readonly ordinal: number,
    readonly bundle: TemplateCompilerNormalizedSiteBundle,
    readonly occurrence: TemplateCompilerSpendOccurrence,
    readonly disposition: TemplateCompilerSiteSpendDisposition,
    readonly siteEventOrdinal: number | null,
    readonly causeOperation: TemplateCompilerOperation | null,
    readonly destinationLane: TemplateCompilerExecutionLaneReference | null,
  ) {}
}

/** One reached occurrence deliberately outside authored-precedent spending. */
export class TemplateCompilerOccurrenceOnlyRow {
  constructor(
    readonly ordinal: number,
    readonly occurrence: TemplateCompilerOccurrenceOnlyTarget,
    readonly disposition: TemplateCompilerOccurrenceOnlyDisposition,
    readonly siteEventOrdinal: number,
  ) {}
}

/** Typed failed attempt; failed attempts never reserve a site, occurrence, or event ordinal. */
export class TemplateCompilerSiteSpendConflict {
  constructor(
    readonly ordinal: number,
    readonly conflictKind: TemplateCompilerSiteSpendConflictKind,
    readonly bundle: TemplateCompilerNormalizedSiteBundle | null,
    readonly occurrence: TemplateCompilerOccurrenceOnlyTarget | null,
    readonly disposition: TemplateCompilerSiteSpendDisposition | TemplateCompilerOccurrenceOnlyDisposition | null,
  ) {}
}

/** Named evidence for one authored remainder. Evidence never satisfies the corresponding spend. */
export class TemplateCompilerAuthoredSiteRemainderEvidence {
  constructor(
    readonly bundle: TemplateCompilerNormalizedSiteBundle,
    readonly reasonKind: string,
    readonly summary: string,
  ) {
    if (reasonKind.length === 0 || summary.length === 0) {
      throw new Error('Authored site remainder evidence requires a non-empty reason and summary.');
    }
  }
}

export const enum TemplateCompilerSiteSpendCompletionKind {
  Complete = 'complete',
  Blocked = 'blocked',
}

const siteSpendCompletionAuthority = {};

/** Nominal accounting completion supplied by the later cursor or caller-owned candidate walk. */
export class TemplateCompilerSiteSpendCompletion {
  static complete(nextSiteEventOrdinal: number): TemplateCompilerSiteSpendCompletion {
    return new TemplateCompilerSiteSpendCompletion(
      siteSpendCompletionAuthority,
      TemplateCompilerSiteSpendCompletionKind.Complete,
      null,
      nextSiteEventOrdinal,
    );
  }

  static blocked(frontierKind: string, nextSiteEventOrdinal: number): TemplateCompilerSiteSpendCompletion {
    if (frontierKind.length === 0) {
      throw new Error('Blocked site accounting completion requires a non-empty frontier kind.');
    }
    return new TemplateCompilerSiteSpendCompletion(
      siteSpendCompletionAuthority,
      TemplateCompilerSiteSpendCompletionKind.Blocked,
      frontierKind,
      nextSiteEventOrdinal,
    );
  }

  private constructor(
    authority: object,
    readonly completionKind: TemplateCompilerSiteSpendCompletionKind,
    readonly frontierKind: string | null,
    readonly nextSiteEventOrdinal: number,
  ) {
    this.#authority = authority;
    if (authority !== siteSpendCompletionAuthority) {
      throw new Error('Site spend completion belongs to another construction authority.');
    }
    if (!Number.isSafeInteger(nextSiteEventOrdinal) || nextSiteEventOrdinal < 0) {
      throw new Error(`Site accounting completion has invalid next event ordinal ${nextSiteEventOrdinal}.`);
    }
  }

  readonly #authority: object;

  isNominal(): boolean {
    return this.#authority === siteSpendCompletionAuthority;
  }
}

export class TemplateCompilerSiteBlockedByFrontier {
  constructor(
    readonly bundle: TemplateCompilerNormalizedSiteBundle,
    readonly completion: TemplateCompilerSiteSpendCompletion,
  ) {}
}

export const enum TemplateCompilerSiteSpendLedgerState {
  /** Every authored bundle has one non-open candidate row; this is not cursor/origin execution proof. */
  AllSitesAccounted = 'all-sites-accounted',
  /** Relowering, an occurrence-only semantic gap, a frontier, or an unspent authored bundle remains. */
  Open = 'open',
  /** At least one attempted accounting relation violated the ledger contract. */
  Mismatch = 'mismatch',
}

export class TemplateCompilerSiteSpendLedgerResult {
  readonly state: TemplateCompilerSiteSpendLedgerState;

  constructor(
    readonly spends: readonly TemplateCompilerSiteSpend[],
    readonly occurrenceOnlyRows: readonly TemplateCompilerOccurrenceOnlyRow[],
    readonly conflicts: readonly TemplateCompilerSiteSpendConflict[],
    readonly authoredRemainderEvidence: readonly TemplateCompilerAuthoredSiteRemainderEvidence[],
    readonly rawUnspent: readonly TemplateCompilerNormalizedSiteBundle[],
    readonly blockedByFrontier: readonly TemplateCompilerSiteBlockedByFrontier[],
    readonly completion: TemplateCompilerSiteSpendCompletion,
  ) {
    const hasOpenSpend = spends.some((spend) =>
      spend.disposition === TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired
    );
    const hasOpenOccurrence = occurrenceOnlyRows.some((row) =>
      row.disposition === TemplateCompilerOccurrenceOnlyDisposition.GeneratedSiteNeedsLowering
      || row.disposition === TemplateCompilerOccurrenceOnlyDisposition.NonSingularBrowserOrigin
    );
    this.state = conflicts.length > 0
      ? TemplateCompilerSiteSpendLedgerState.Mismatch
      : hasOpenSpend
          || hasOpenOccurrence
          || completion.completionKind === TemplateCompilerSiteSpendCompletionKind.Blocked
          || rawUnspent.length > 0
        ? TemplateCompilerSiteSpendLedgerState.Open
        : TemplateCompilerSiteSpendLedgerState.AllSitesAccounted;
  }
}

export type TemplateCompilerSiteSpendAttempt =
  | TemplateCompilerSiteSpend
  | TemplateCompilerSiteSpendConflict;

export type TemplateCompilerOccurrenceOnlyAttempt =
  | TemplateCompilerOccurrenceOnlyRow
  | TemplateCompilerSiteSpendConflict;

/**
 * Mutable product-free accounting owner for one authored-precedent index.
 *
 * Bundle and occurrence identity are both exclusive. Named remainder evidence and frontier blocking remain visible
 * without being promoted into successful spends. Browser compatibility, inertness, and occurrence-only rows remain
 * caller-classified candidates until the later cursor supplies its own nominal origin/reachability receipts; this
 * ledger never upgrades accounting completeness into compiler execution proof.
 */
export class TemplateCompilerSiteSpendLedger {
  private readonly spends: TemplateCompilerSiteSpend[] = [];
  private readonly occurrenceOnlyRows: TemplateCompilerOccurrenceOnlyRow[] = [];
  private readonly conflicts: TemplateCompilerSiteSpendConflict[] = [];
  private readonly authoredRemainderEvidence: TemplateCompilerAuthoredSiteRemainderEvidence[] = [];
  private readonly spendsByBundle = new Map<TemplateCompilerNormalizedSiteBundle, TemplateCompilerSiteSpend>();
  private readonly spendsByProductHandle = new Map<ProductHandle, TemplateCompilerSiteSpend>();
  private readonly rowsByOccurrence = new Map<
    TemplateCompilerOccurrenceOnlyTarget,
    TemplateCompilerSiteSpend | TemplateCompilerOccurrenceOnlyRow
  >();
  private readonly remainderByBundle = new Map<
    TemplateCompilerNormalizedSiteBundle,
    TemplateCompilerAuthoredSiteRemainderEvidence
  >();
  private finishedResult: TemplateCompilerSiteSpendLedgerResult | null = null;
  private finishedCompletion: TemplateCompilerSiteSpendCompletion | null = null;
  private _nextSiteEventOrdinal = 0;

  constructor(readonly index: TemplateCompilerNormalizedSiteIndex) {}

  /** Next contiguous ledger-local site-event ordinal; unrelated cursor element events do not create gaps here. */
  get nextSiteEventOrdinal(): number {
    return this._nextSiteEventOrdinal;
  }

  spendForBundle(bundle: TemplateCompilerNormalizedSiteBundle): TemplateCompilerSiteSpend | null {
    return this.spendsByBundle.get(bundle) ?? null;
  }

  spendForProductHandle(productHandle: ProductHandle): TemplateCompilerSiteSpend | null {
    return this.spendsByProductHandle.get(productHandle) ?? null;
  }

  rowForOccurrence(
    occurrence: TemplateCompilerOccurrenceOnlyTarget,
  ): TemplateCompilerSiteSpend | TemplateCompilerOccurrenceOnlyRow | null {
    return this.rowsByOccurrence.get(occurrence) ?? null;
  }

  bind(
    bundle: TemplateCompilerNormalizedSiteBundle,
    occurrence: TemplateCompilerSpendOccurrence,
    disposition:
      | TemplateCompilerSiteSpendDisposition.BrowserCompatible
      | TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired,
    siteEventOrdinal: number,
  ): TemplateCompilerSiteSpendAttempt {
    this.assertOpen();
    const common = this.validateCommonSpend(bundle, occurrence, disposition);
    if (common != null) return common;
    if (
      disposition !== TemplateCompilerSiteSpendDisposition.BrowserCompatible
      && disposition !== TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired
    ) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.InvalidDisposition,
        bundle,
        occurrence,
        disposition,
      );
    }
    const eventConflict = this.validateSiteEventOrdinal(siteEventOrdinal, bundle, occurrence, disposition);
    if (eventConflict != null) return eventConflict;
    return this.commitSpend(bundle, occurrence, disposition, siteEventOrdinal, null, null);
  }

  exclude(
    bundle: TemplateCompilerNormalizedSiteBundle,
    occurrence: TemplateCompilerSpendOccurrence,
    disposition:
      | TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed
      | TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed
      | TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation
      | TemplateCompilerSiteSpendDisposition.InertTemplateContent
      | TemplateCompilerSiteSpendDisposition.LetContentSuppressed,
    authority: TemplateCompilerLocalSiteExclusionAuthority | null = null,
  ): TemplateCompilerSiteSpendAttempt {
    this.assertOpen();
    const common = this.validateCommonSpend(bundle, occurrence, disposition);
    if (common != null) return common;
    if (
      disposition === TemplateCompilerSiteSpendDisposition.InertTemplateContent
      || disposition === TemplateCompilerSiteSpendDisposition.LetContentSuppressed
    ) {
      if (authority != null) {
        return this.conflict(
          TemplateCompilerSiteSpendConflictKind.UnexpectedLocalExclusionAuthority,
          bundle,
          occurrence,
          disposition,
        );
      }
      return this.commitSpend(bundle, occurrence, disposition, null, null, null);
    }
    if (
      disposition !== TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed
      && disposition !== TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed
      && disposition !== TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation
    ) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.InvalidDisposition,
        bundle,
        occurrence,
        disposition,
      );
    }
    if (authority == null) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.MissingLocalExclusionAuthority,
        bundle,
        occurrence,
        disposition,
      );
    }
    if (!(authority instanceof TemplateCompilerLocalSiteExclusionAuthority)) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.InvalidLocalExclusionAuthority,
        bundle,
        occurrence,
        disposition,
      );
    }
    const receipt = authority.receiptFor(occurrence);
    if (
      receipt == null
      || !authority.owns(receipt)
      || receipt.disposition !== disposition
    ) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.InvalidLocalExclusionAuthority,
        bundle,
        occurrence,
        disposition,
      );
    }
    return this.commitSpend(
      bundle,
      occurrence,
      disposition,
      null,
      receipt.causeOperation,
      receipt.destinationLane,
    );
  }

  recordOccurrenceOnly(
    occurrence: TemplateCompilerOccurrenceOnlyTarget,
    disposition: TemplateCompilerOccurrenceOnlyDisposition,
    siteEventOrdinal: number,
  ): TemplateCompilerOccurrenceOnlyAttempt {
    this.assertOpen();
    if (!this.validOccurrenceDisposition(occurrence, disposition)) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.InvalidOccurrenceDisposition,
        null,
        occurrence,
        disposition,
      );
    }
    const occupied = this.rowsByOccurrence.get(occurrence) ?? null;
    if (occupied != null) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.OccurrenceAlreadySpent,
        occupied instanceof TemplateCompilerSiteSpend ? occupied.bundle : null,
        occurrence,
        disposition,
      );
    }
    const eventConflict = this.validateSiteEventOrdinal(siteEventOrdinal, null, occurrence, disposition);
    if (eventConflict != null) return eventConflict;
    const row = new TemplateCompilerOccurrenceOnlyRow(
      this.occurrenceOnlyRows.length,
      occurrence,
      disposition,
      siteEventOrdinal,
    );
    this.occurrenceOnlyRows.push(row);
    this.rowsByOccurrence.set(occurrence, row);
    this._nextSiteEventOrdinal++;
    return row;
  }

  recordAuthoredRemainder(
    bundle: TemplateCompilerNormalizedSiteBundle,
    reasonKind: string,
    summary: string,
  ): TemplateCompilerAuthoredSiteRemainderEvidence | TemplateCompilerSiteSpendConflict {
    this.assertOpen();
    if (!this.isOwnedBundle(bundle)) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.ForeignIndexBundle,
        bundle,
        null,
        null,
      );
    }
    if (this.spendsByBundle.has(bundle)) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.AuthoredRemainderForSpentSite,
        bundle,
        null,
        null,
      );
    }
    if (this.remainderByBundle.has(bundle)) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.DuplicateAuthoredRemainderEvidence,
        bundle,
        null,
        null,
      );
    }
    const evidence = new TemplateCompilerAuthoredSiteRemainderEvidence(bundle, reasonKind, summary);
    this.authoredRemainderEvidence.push(evidence);
    this.remainderByBundle.set(bundle, evidence);
    return evidence;
  }

  finish(completion: TemplateCompilerSiteSpendCompletion): TemplateCompilerSiteSpendLedgerResult {
    if (!(completion instanceof TemplateCompilerSiteSpendCompletion) || !completion.isNominal()) {
      throw new Error('Site spend ledger requires one nominal completion.');
    }
    if (this.finishedResult != null) {
      if (completion !== this.finishedCompletion) {
        throw new Error('Site spend ledger was already finished against another completion.');
      }
      return this.finishedResult;
    }
    if (completion.nextSiteEventOrdinal !== this._nextSiteEventOrdinal) {
      throw new Error(
        `Site spend completion expects event ${completion.nextSiteEventOrdinal}, current event is ${this._nextSiteEventOrdinal}.`,
      );
    }
    const unspent: TemplateCompilerNormalizedSiteBundle[] = [];
    for (const bundle of this.index.attributeSites) {
      if (!this.spendsByBundle.has(bundle)) unspent.push(bundle);
    }
    for (const bundle of this.index.textSites) {
      if (!this.spendsByBundle.has(bundle)) unspent.push(bundle);
    }
    const blockedByFrontier = completion.completionKind === TemplateCompilerSiteSpendCompletionKind.Complete
      ? []
      : unspent
        .filter((bundle) => !this.remainderByBundle.has(bundle))
        .map((bundle) => new TemplateCompilerSiteBlockedByFrontier(bundle, completion));
    const result = new TemplateCompilerSiteSpendLedgerResult(
      this.spends,
      this.occurrenceOnlyRows,
      this.conflicts,
      this.authoredRemainderEvidence,
      unspent,
      blockedByFrontier,
      completion,
    );
    this.finishedCompletion = completion;
    this.finishedResult = result;
    return result;
  }

  private validateCommonSpend(
    bundle: TemplateCompilerNormalizedSiteBundle,
    occurrence: TemplateCompilerSpendOccurrence,
    disposition: TemplateCompilerSiteSpendDisposition,
  ): TemplateCompilerSiteSpendConflict | null {
    if (!this.isOwnedBundle(bundle)) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.ForeignIndexBundle,
        bundle,
        occurrence,
        disposition,
      );
    }
    const spent = this.spendsByBundle.get(bundle) ?? null;
    if (spent != null) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.SiteAlreadySpent,
        bundle,
        occurrence,
        disposition,
      );
    }
    const occupied = this.rowsByOccurrence.get(occurrence) ?? null;
    if (occupied != null) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.OccurrenceAlreadySpent,
        bundle,
        occurrence,
        disposition,
      );
    }
    if (!this.bundleMatchesOccurrence(bundle, occurrence)) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.SiteOccurrenceKindMismatch,
        bundle,
        occurrence,
        disposition,
      );
    }
    if (this.remainderByBundle.has(bundle)) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.AuthoredRemainderAlreadyRecorded,
        bundle,
        occurrence,
        disposition,
      );
    }
    return null;
  }

  private validateSiteEventOrdinal(
    siteEventOrdinal: number,
    bundle: TemplateCompilerNormalizedSiteBundle | null,
    occurrence: TemplateCompilerOccurrenceOnlyTarget,
    disposition: TemplateCompilerSiteSpendDisposition | TemplateCompilerOccurrenceOnlyDisposition,
  ): TemplateCompilerSiteSpendConflict | null {
    if (!Number.isSafeInteger(siteEventOrdinal) || siteEventOrdinal < 0) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.InvalidEventOrdinal,
        bundle,
        occurrence,
        disposition,
      );
    }
    if (siteEventOrdinal !== this._nextSiteEventOrdinal) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.SiteEventOrdinalMismatch,
        bundle,
        occurrence,
        disposition,
      );
    }
    return null;
  }

  private commitSpend(
    bundle: TemplateCompilerNormalizedSiteBundle,
    occurrence: TemplateCompilerSpendOccurrence,
    disposition: TemplateCompilerSiteSpendDisposition,
    siteEventOrdinal: number | null,
    causeOperation: TemplateCompilerOperation | null,
    destinationLane: TemplateCompilerExecutionLaneReference | null,
  ): TemplateCompilerSiteSpend {
    const spend = new TemplateCompilerSiteSpend(
      this.spends.length,
      bundle,
      occurrence,
      disposition,
      siteEventOrdinal,
      causeOperation,
      destinationLane,
    );
    this.spends.push(spend);
    this.spendsByBundle.set(bundle, spend);
    this.spendsByProductHandle.set(templateCompilerNormalizedSiteBundleProductHandle(bundle), spend);
    this.rowsByOccurrence.set(occurrence, spend);
    if (siteEventOrdinal != null) this._nextSiteEventOrdinal++;
    return spend;
  }

  private isOwnedBundle(bundle: TemplateCompilerNormalizedSiteBundle): boolean {
    return bundle instanceof TemplateCompilerNormalizedSite
      ? this.index.siteForAttribute(bundle.attributeProductHandle) === bundle
      : bundle instanceof TemplateCompilerNormalizedTextSite
        && this.index.siteForText(bundle.textProductHandle) === bundle;
  }

  private bundleMatchesOccurrence(
    bundle: TemplateCompilerNormalizedSiteBundle,
    occurrence: TemplateCompilerSpendOccurrence,
  ): boolean {
    return bundle instanceof TemplateCompilerNormalizedSite
      ? occurrence instanceof TemplateCompilerAttributeOccurrence
      : bundle instanceof TemplateCompilerNormalizedTextSite
        && occurrence instanceof TemplateCompilerTextOccurrence;
  }

  private validOccurrenceDisposition(
    occurrence: TemplateCompilerOccurrenceOnlyTarget,
    disposition: TemplateCompilerOccurrenceOnlyDisposition,
  ): boolean {
    switch (disposition) {
      case TemplateCompilerOccurrenceOnlyDisposition.StaticTextPassThrough:
        return occurrence instanceof TemplateCompilerTextOccurrence;
      case TemplateCompilerOccurrenceOnlyDisposition.BrowserImpliedElementPassThrough:
        return occurrence instanceof TemplateCompilerElementOccurrence;
      case TemplateCompilerOccurrenceOnlyDisposition.IgnoredComment:
        return occurrence instanceof TemplateCompilerCommentOccurrence;
      case TemplateCompilerOccurrenceOnlyDisposition.IgnoredDoctype:
        return occurrence instanceof TemplateCompilerDoctypeOccurrence;
      case TemplateCompilerOccurrenceOnlyDisposition.GeneratedSiteNeedsLowering:
        return occurrence.generation != null;
      case TemplateCompilerOccurrenceOnlyDisposition.NonSingularBrowserOrigin:
        return true;
    }
  }

  private conflict(
    conflictKind: TemplateCompilerSiteSpendConflictKind,
    bundle: TemplateCompilerNormalizedSiteBundle | null,
    occurrence: TemplateCompilerOccurrenceOnlyTarget | null,
    disposition: TemplateCompilerSiteSpendDisposition | TemplateCompilerOccurrenceOnlyDisposition | null,
  ): TemplateCompilerSiteSpendConflict {
    const conflict = new TemplateCompilerSiteSpendConflict(
      this.conflicts.length,
      conflictKind,
      bundle,
      occurrence,
      disposition,
    );
    this.conflicts.push(conflict);
    return conflict;
  }

  private assertOpen(): void {
    if (this.finishedResult != null) {
      throw new Error('Site spend ledger is already finished.');
    }
  }
}

export function templateCompilerNormalizedSiteBundleProductHandle(
  bundle: TemplateCompilerNormalizedSiteBundle,
): ProductHandle {
  return bundle instanceof TemplateCompilerNormalizedSite
    ? bundle.attributeProductHandle
    : bundle.textProductHandle;
}

function siteOccurrencesInSubtree(
  root: TemplateCompilerNodeOccurrence,
): readonly TemplateCompilerSpendOccurrence[] {
  const occurrences: TemplateCompilerSpendOccurrence[] = [];
  const pending: TemplateCompilerNodeOccurrence[] = [root];
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (node instanceof TemplateCompilerTextOccurrence) occurrences.push(node);
    if (node instanceof TemplateCompilerElementOccurrence) {
      occurrences.push(...node.readAttributes());
      if (node.templateContent != null) pending.push(node.templateContent);
    }
    pending.push(...node.readChildren());
  }
  return occurrences;
}
