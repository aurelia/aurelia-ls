import type { ProductHandle } from '../kernel/handles.js';
import {
  TemplateCompilerNormalizedSite,
  TemplateCompilerNormalizedTextSite,
} from './template-compiler-normalized-site-index.js';
import type { TemplateCompilerNormalizedSiteIndex } from './template-compiler-normalized-site-index.js';
import {
  TemplateCompilerAttributeDetachmentMutation,
  TemplateCompilerExecutionLaneReference,
  TemplateCompilerMutationBatchState,
  TemplateCompilerNodeDetachmentMutation,
  TemplateCompilerOccurrenceOperationTarget,
  TemplateCompilerOperation,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationKind,
} from './template-compiler-execution.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerCommentOccurrence,
  TemplateCompilerDoctypeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
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

/** Exact disposition assigned to one authored-precedent site bundle. */
export const enum TemplateCompilerSiteSpendDisposition {
  BrowserCompatible = 'browser-compatible',
  BrowserReloweringRequired = 'browser-relowering-required',
  LocalDeclarationConsumed = 'local-declaration-consumed',
  LocalBindableMetadataConsumed = 'local-bindable-metadata-consumed',
  TransferredToChildInvocation = 'transferred-to-child-invocation',
  InertTemplateContent = 'inert-template-content',
}

/** Live occurrence that intentionally has no authored-precedent bundle spend. */
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
  EventOrdinalAlreadySpent = 'event-ordinal-already-spent',
  MissingCauseOperation = 'missing-cause-operation',
  UnexpectedCauseOperation = 'unexpected-cause-operation',
  InvalidCauseOperation = 'invalid-cause-operation',
  MissingDestinationLane = 'missing-destination-lane',
  UnexpectedDestinationLane = 'unexpected-destination-lane',
  InvalidDestinationLane = 'invalid-destination-lane',
  InvalidOccurrenceDisposition = 'invalid-occurrence-disposition',
  DuplicateAuthoredRemainderEvidence = 'duplicate-authored-remainder-evidence',
  AuthoredRemainderAlreadyRecorded = 'authored-remainder-already-recorded',
  AuthoredRemainderForSpentSite = 'authored-remainder-for-spent-site',
}

/** One successful authored-site accounting row. */
export class TemplateCompilerSiteSpend {
  constructor(
    readonly ordinal: number,
    readonly bundle: TemplateCompilerNormalizedSiteBundle,
    readonly occurrence: TemplateCompilerSpendOccurrence,
    readonly disposition: TemplateCompilerSiteSpendDisposition,
    readonly eventOrdinal: number | null,
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
    readonly eventOrdinal: number,
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

/** Minimal structural contract accepted from the later browser cursor. */
export interface TemplateCompilerSiteSpendFrontier {
  readonly frontierKind: string;
}

export class TemplateCompilerSiteBlockedByFrontier {
  constructor(
    readonly bundle: TemplateCompilerNormalizedSiteBundle,
    readonly frontier: TemplateCompilerSiteSpendFrontier,
  ) {}
}

export const enum TemplateCompilerSiteSpendLedgerState {
  /** Every authored bundle has one non-open disposition and no accounting conflict remains. */
  Accounted = 'accounted',
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
    readonly frontier: TemplateCompilerSiteSpendFrontier | null,
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
      : hasOpenSpend || hasOpenOccurrence || frontier != null || rawUnspent.length > 0
        ? TemplateCompilerSiteSpendLedgerState.Open
        : TemplateCompilerSiteSpendLedgerState.Accounted;
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
 * without being promoted into successful spends.
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
  private readonly events = new Map<number, TemplateCompilerSiteSpend | TemplateCompilerOccurrenceOnlyRow>();
  private readonly remainderByBundle = new Map<
    TemplateCompilerNormalizedSiteBundle,
    TemplateCompilerAuthoredSiteRemainderEvidence
  >();
  private readonly extractionOccurrencesByOperation = new Map<
    TemplateCompilerOperation,
    ReadonlySet<TemplateCompilerSpendOccurrence>
  >();
  private finishedResult: TemplateCompilerSiteSpendLedgerResult | null = null;
  private finishedFrontier: TemplateCompilerSiteSpendFrontier | null = null;

  constructor(readonly index: TemplateCompilerNormalizedSiteIndex) {}

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
    eventOrdinal: number,
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
    const eventConflict = this.validateEventOrdinal(eventOrdinal, bundle, occurrence, disposition);
    if (eventConflict != null) return eventConflict;
    return this.commitSpend(bundle, occurrence, disposition, eventOrdinal, null, null);
  }

  exclude(
    bundle: TemplateCompilerNormalizedSiteBundle,
    occurrence: TemplateCompilerSpendOccurrence,
    disposition:
      | TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed
      | TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed
      | TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation
      | TemplateCompilerSiteSpendDisposition.InertTemplateContent,
    causeOperation: TemplateCompilerOperation | null = null,
    destinationLane: TemplateCompilerExecutionLaneReference | null = null,
  ): TemplateCompilerSiteSpendAttempt {
    this.assertOpen();
    const common = this.validateCommonSpend(bundle, occurrence, disposition);
    if (common != null) return common;
    switch (disposition) {
      case TemplateCompilerSiteSpendDisposition.LocalDeclarationConsumed: {
        const causeConflict = this.validateExtractionCause(
          bundle,
          occurrence,
          disposition,
          causeOperation,
          'attribute',
        );
        if (causeConflict != null) return causeConflict;
        if (destinationLane != null) {
          return this.conflict(
            TemplateCompilerSiteSpendConflictKind.UnexpectedDestinationLane,
            bundle,
            occurrence,
            disposition,
          );
        }
        break;
      }
      case TemplateCompilerSiteSpendDisposition.LocalBindableMetadataConsumed: {
        const causeConflict = this.validateExtractionCause(
          bundle,
          occurrence,
          disposition,
          causeOperation,
          'node',
        );
        if (causeConflict != null) return causeConflict;
        if (destinationLane != null) {
          return this.conflict(
            TemplateCompilerSiteSpendConflictKind.UnexpectedDestinationLane,
            bundle,
            occurrence,
            disposition,
          );
        }
        break;
      }
      case TemplateCompilerSiteSpendDisposition.TransferredToChildInvocation: {
        const causeConflict = this.validateExtractionCause(
          bundle,
          occurrence,
          disposition,
          causeOperation,
          'node',
        );
        if (causeConflict != null) return causeConflict;
        if (destinationLane == null) {
          return this.conflict(
            TemplateCompilerSiteSpendConflictKind.MissingDestinationLane,
            bundle,
            occurrence,
            disposition,
          );
        }
        const detachedCarrier = causeOperation!.mutationBatch.nodeDetachmentMutations[0]?.node ?? null;
        const carrierDetachment = causeOperation!.mutationBatch.nodeDetachmentMutations[0] ?? null;
        if (
          !(destinationLane instanceof TemplateCompilerExecutionLaneReference)
          || destinationLane === causeOperation!.lane
          || !(detachedCarrier instanceof TemplateCompilerElementOccurrence)
          || detachedCarrier.templateContent == null
          || destinationLane.compilerCarrier !== detachedCarrier
          || destinationLane.compilerContent !== detachedCarrier.templateContent
          || carrierDetachment?.previousParent !== causeOperation!.lane.compilerContent
          || carrierDetachment.previousEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
        ) {
          return this.conflict(
            TemplateCompilerSiteSpendConflictKind.InvalidDestinationLane,
            bundle,
            occurrence,
            disposition,
          );
        }
        break;
      }
      case TemplateCompilerSiteSpendDisposition.InertTemplateContent:
        if (causeOperation != null) {
          return this.conflict(
            TemplateCompilerSiteSpendConflictKind.UnexpectedCauseOperation,
            bundle,
            occurrence,
            disposition,
          );
        }
        if (destinationLane != null) {
          return this.conflict(
            TemplateCompilerSiteSpendConflictKind.UnexpectedDestinationLane,
            bundle,
            occurrence,
            disposition,
          );
        }
        break;
      default:
        return this.conflict(
          TemplateCompilerSiteSpendConflictKind.InvalidDisposition,
          bundle,
          occurrence,
          disposition,
        );
    }
    return this.commitSpend(bundle, occurrence, disposition, null, causeOperation, destinationLane);
  }

  recordOccurrenceOnly(
    occurrence: TemplateCompilerOccurrenceOnlyTarget,
    disposition: TemplateCompilerOccurrenceOnlyDisposition,
    eventOrdinal: number,
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
    const eventConflict = this.validateEventOrdinal(eventOrdinal, null, occurrence, disposition);
    if (eventConflict != null) return eventConflict;
    const row = new TemplateCompilerOccurrenceOnlyRow(
      this.occurrenceOnlyRows.length,
      occurrence,
      disposition,
      eventOrdinal,
    );
    this.occurrenceOnlyRows.push(row);
    this.rowsByOccurrence.set(occurrence, row);
    this.events.set(eventOrdinal, row);
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

  finish(frontier: TemplateCompilerSiteSpendFrontier | null = null): TemplateCompilerSiteSpendLedgerResult {
    if (this.finishedResult != null) {
      if (frontier !== this.finishedFrontier) {
        throw new Error('Site spend ledger was already finished against another frontier.');
      }
      return this.finishedResult;
    }
    const unspent: TemplateCompilerNormalizedSiteBundle[] = [];
    for (const bundle of this.index.attributeSites) {
      if (!this.spendsByBundle.has(bundle)) unspent.push(bundle);
    }
    for (const bundle of this.index.textSites) {
      if (!this.spendsByBundle.has(bundle)) unspent.push(bundle);
    }
    const blockedByFrontier = frontier == null
      ? []
      : unspent
        .filter((bundle) => !this.remainderByBundle.has(bundle))
        .map((bundle) => new TemplateCompilerSiteBlockedByFrontier(bundle, frontier));
    const result = new TemplateCompilerSiteSpendLedgerResult(
      this.spends,
      this.occurrenceOnlyRows,
      this.conflicts,
      this.authoredRemainderEvidence,
      unspent,
      blockedByFrontier,
      frontier,
    );
    this.finishedFrontier = frontier;
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

  private validateEventOrdinal(
    eventOrdinal: number,
    bundle: TemplateCompilerNormalizedSiteBundle | null,
    occurrence: TemplateCompilerOccurrenceOnlyTarget,
    disposition: TemplateCompilerSiteSpendDisposition | TemplateCompilerOccurrenceOnlyDisposition,
  ): TemplateCompilerSiteSpendConflict | null {
    if (!Number.isSafeInteger(eventOrdinal) || eventOrdinal < 0) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.InvalidEventOrdinal,
        bundle,
        occurrence,
        disposition,
      );
    }
    if (this.events.has(eventOrdinal)) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.EventOrdinalAlreadySpent,
        bundle,
        occurrence,
        disposition,
      );
    }
    return null;
  }

  private validateExtractionCause(
    bundle: TemplateCompilerNormalizedSiteBundle,
    occurrence: TemplateCompilerSpendOccurrence,
    disposition: TemplateCompilerSiteSpendDisposition,
    causeOperation: TemplateCompilerOperation | null,
    topologyKind: 'attribute' | 'node',
  ): TemplateCompilerSiteSpendConflict | null {
    if (causeOperation == null) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.MissingCauseOperation,
        bundle,
        occurrence,
        disposition,
      );
    }
    if (
      !(causeOperation instanceof TemplateCompilerOperation)
      || causeOperation.operationKind !== TemplateCompilerOperationKind.LocalTemplateExtraction
      || causeOperation.completion.completionKind !== TemplateCompilerOperationCompletionKind.Complete
      || causeOperation.mutationBatch.state !== TemplateCompilerMutationBatchState.Committed
    ) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.InvalidCauseOperation,
        bundle,
        occurrence,
        disposition,
      );
    }
    const target = causeOperation.target;
    if (topologyKind === 'attribute') {
      const detachments = causeOperation.mutationBatch.attributeDetachmentMutations;
      if (
        !(occurrence instanceof TemplateCompilerAttributeOccurrence)
        || causeOperation.mutationBatch.topologyMutations.length !== 1
        || detachments.length !== 1
        || !(detachments[0] instanceof TemplateCompilerAttributeDetachmentMutation)
        || detachments[0].attribute !== occurrence
        || !(target instanceof TemplateCompilerOccurrenceOperationTarget)
        || target.occurrence !== occurrence
      ) {
        return this.conflict(
          TemplateCompilerSiteSpendConflictKind.InvalidCauseOperation,
          bundle,
          occurrence,
          disposition,
        );
      }
      return null;
    }
    const detachments = causeOperation.mutationBatch.nodeDetachmentMutations;
    const detachedNode = detachments[0]?.node ?? null;
    if (
      causeOperation.mutationBatch.topologyMutations.length !== 1
      || detachments.length !== 1
      || !(detachments[0] instanceof TemplateCompilerNodeDetachmentMutation)
      || detachedNode == null
      || !this.extractionOccurrences(causeOperation, detachedNode).has(occurrence)
      || !(target instanceof TemplateCompilerOccurrenceOperationTarget)
      || target.occurrence !== detachedNode
    ) {
      return this.conflict(
        TemplateCompilerSiteSpendConflictKind.InvalidCauseOperation,
        bundle,
        occurrence,
        disposition,
      );
    }
    return null;
  }

  private extractionOccurrences(
    operation: TemplateCompilerOperation,
    root: TemplateCompilerNodeOccurrence,
  ): ReadonlySet<TemplateCompilerSpendOccurrence> {
    const existing = this.extractionOccurrencesByOperation.get(operation) ?? null;
    if (existing != null) return existing;
    const occurrences = new Set<TemplateCompilerSpendOccurrence>();
    const pending: TemplateCompilerNodeOccurrence[] = [root];
    while (pending.length > 0) {
      const node = pending.pop()!;
      if (node instanceof TemplateCompilerTextOccurrence) occurrences.add(node);
      if (node instanceof TemplateCompilerElementOccurrence) {
        for (const attribute of node.readAttributes()) occurrences.add(attribute);
        if (node.templateContent != null) pending.push(node.templateContent);
      }
      pending.push(...node.readChildren());
    }
    this.extractionOccurrencesByOperation.set(operation, occurrences);
    return occurrences;
  }

  private commitSpend(
    bundle: TemplateCompilerNormalizedSiteBundle,
    occurrence: TemplateCompilerSpendOccurrence,
    disposition: TemplateCompilerSiteSpendDisposition,
    eventOrdinal: number | null,
    causeOperation: TemplateCompilerOperation | null,
    destinationLane: TemplateCompilerExecutionLaneReference | null,
  ): TemplateCompilerSiteSpend {
    const spend = new TemplateCompilerSiteSpend(
      this.spends.length,
      bundle,
      occurrence,
      disposition,
      eventOrdinal,
      causeOperation,
      destinationLane,
    );
    this.spends.push(spend);
    this.spendsByBundle.set(bundle, spend);
    this.spendsByProductHandle.set(templateCompilerNormalizedSiteBundleProductHandle(bundle), spend);
    this.rowsByOccurrence.set(occurrence, spend);
    if (eventOrdinal != null) this.events.set(eventOrdinal, spend);
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
