import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type { AttributeParserParseResult } from './attribute-syntax.js';
import type { TemplateCompilerAttributeOwnerProgressionSite } from './attribute-owner-progression.js';
import type { TemplateResolvedResource } from './compiler-world.js';
import type { TemplateCompilerObservedValue } from './compiler-read-view.js';
import type { TemplateCompilerReachedAttributeScalarReceipt } from './template-compiler-execution.js';
import type {
  TemplateCompilerNormalizedSite,
  TemplateCompilerNormalizedTextSite,
} from './template-compiler-normalized-site-index.js';
import type { TemplateCompilerLiveAttributeOwnerSite } from './template-compiler-live-attribute-owner.js';
import type {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  TemplateCompilerNodeOccurrence,
  TemplateCompilerParentOccurrence,
  TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
import type {
  TemplateCompilerPreWalkBrowserOriginState,
  TemplateCompilerPreWalkRemainderReceipt,
} from './template-compiler-prewalk-remainder.js';
import type {
  TemplateCompilerAuthoredSiteRemainderEvidence,
  TemplateCompilerNormalizedSiteBundle,
  TemplateCompilerOccurrenceOnlyRow,
  TemplateCompilerSiteSpend,
} from './template-compiler-site-spend-ledger.js';
import {
  TemplateCompilerOccurrenceOnlyDisposition,
  TemplateCompilerSiteSpendDisposition,
} from './template-compiler-site-spend-ledger.js';
import type {
  TemplateCompilerProjectionLogicalExtractionPreparation,
  TemplateCompilerProjectionLogicalExtractionRealization,
  TemplateCompilerProjectionRealizedEntrantBand,
  TemplateCompilerProjectionSlotConsumptionReceipt,
} from './template-compiler-projection-logical-extraction.js';
import type {
  TemplateCompilerTemplateControllerTransitionPreparation,
  TemplateCompilerTemplateControllerTransitionRealization,
} from './template-compiler-template-controller-transition.js';
import type { TemplateCompilerSiteCursorLogicalEntrantWork } from './template-compiler-site-cursor-task.js';
import type { HtmlElement, HtmlText } from './html-ir.js';
import type {
  TemplateCompilerProcessContentPlan,
  TemplateCompilerProcessContentResult,
} from './template-compiler-process-content.js';
import type { TemplateCompilerLiveAttributeContribution } from './template-compiler-live-attribute-assembly.js';
import type { TemplateCompilerTextInstructionStaging } from './template-compiler-text-instruction-staging.js';
import type { TemplateCompilerLetElementStaging } from './template-compiler-let-element-staging.js';
import {
  isTemplateCompilerProcessContentSettledForHost,
  TemplateCompilerHydrateElementProjectionState,
  type TemplateCompilerHydrateElementEnvelopeDraft,
} from './template-compiler-hydrate-element-staging.js';

export const enum TemplateCompilerSiteCursorEventKind {
  Phase = 'phase',
  Element = 'element',
  LetElement = 'let-element',
  ProcessContent = 'process-content',
  Attribute = 'attribute',
  TemplateControllerTransition = 'template-controller-transition',
  ProjectionExtraction = 'projection-extraction',
  ContainerlessPlacement = 'containerless-placement',
  Text = 'text',
  IgnoredNode = 'ignored-node',
  SubtreeExclusion = 'subtree-exclusion',
  SurrogateValidation = 'surrogate-validation',
  Frontier = 'frontier',
}

export const enum TemplateCompilerSiteCursorPhaseKind {
  PreWalkRemainders = 'pre-walk-remainders',
  ContentStart = 'content-start',
  ContentEnd = 'content-end',
  SurrogateValidationStart = 'surrogate-validation-start',
  SurrogateValidationEnd = 'surrogate-validation-end',
  SurrogateEnd = 'surrogate-end',
}

export const enum TemplateCompilerSiteCursorFrontierKind {
  CurrentnessLost = 'currentness-lost',
  GeneratedSiteNeedsLowering = 'generated-site-needs-lowering',
  NonSingularBrowserOrigin = 'non-singular-browser-origin',
  AuthoredPrecedentMismatch = 'authored-precedent-mismatch',
  AsElementScalarOpen = 'as-element-scalar-open',
  ElementResolutionOpen = 'element-resolution-open',
  NativeSlotRootOpen = 'native-slot-root-open',
  NativeSlotWithoutShadowDomInvalid = 'native-slot-without-shadow-dom-invalid',
  BeforeProcessContent = 'before-process-content',
  AtLiveAttributeRelowering = 'at-live-attribute-relowering',
  ReachedLiveAttributeOpen = 'reached-live-attribute-open',
  ReachedLiveAttributeInvalid = 'reached-live-attribute-invalid',
  HydrateElementEnvelopeOpen = 'hydrate-element-envelope-open',
  HydrateElementEnvelopeInvalid = 'hydrate-element-envelope-invalid',
  ReachedNormalizedOpen = 'reached-normalized-open',
  ReachedNormalizedInvalid = 'reached-normalized-invalid',
  LetElementOpen = 'let-element-open',
  InvalidLetCommand = 'invalid-let-command',
  UnknownLetBindingCommand = 'unknown-let-binding-command',
  InvalidLetExpression = 'invalid-let-expression',
  AfterAttributesBeforeTemplateController = 'after-attributes-before-template-controller',
  AfterAttributesBeforeProjection = 'after-attributes-before-projection',
  AfterAttributesBeforeContainerless = 'after-attributes-before-containerless',
  TextReloweringRequired = 'text-relowering-required',
  AuthoredCompilerMarkerReserved = 'authored-compiler-marker-reserved',
  SurrogateValidationOpen = 'surrogate-validation-open',
  InvalidSurrogateAttribute = 'invalid-surrogate-attribute',
  SurrogateClassificationRequired = 'surrogate-classification-required',
  AccountingMismatch = 'accounting-mismatch',
}

export const enum TemplateCompilerSiteCursorSiteOutcome {
  Complete = 'complete',
  Open = 'open',
  Invalid = 'invalid',
  ReloweringRequired = 'relowering-required',
  NotApplicable = 'not-applicable',
}

export const enum TemplateCompilerSiteCursorSurrogateValidationOutcome {
  Valid = 'valid',
  Open = 'open',
  Refused = 'refused',
}

export abstract class TemplateCompilerSiteCursorEvent {
  readonly #authority: object;

  protected constructor(
    authority: object,
    readonly ordinal: number,
    readonly eventKind: TemplateCompilerSiteCursorEventKind,
  ) {
    this.#authority = authority;
  }

  isOwnedBy(authority: object): boolean {
    return this.#authority === authority;
  }
}

export class TemplateCompilerSiteCursorPhaseEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly phaseKind: TemplateCompilerSiteCursorPhaseKind,
    readonly remainderReceipts: readonly TemplateCompilerPreWalkRemainderReceipt[] = [],
    readonly remainderEvidence: readonly TemplateCompilerAuthoredSiteRemainderEvidence[] = [],
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.Phase);
  }
}

export class TemplateCompilerSiteCursorElementEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly element: TemplateCompilerElementOccurrence,
    readonly parent: TemplateCompilerParentOccurrence,
    readonly parentOrdinal: number,
    readonly capturedSuccessor: TemplateCompilerNodeOccurrence | null,
    readonly authoredElement: HtmlElement | null,
    readonly browserOriginState: TemplateCompilerPreWalkBrowserOriginState,
    readonly occurrenceOnlyRow: TemplateCompilerOccurrenceOnlyRow | null,
    readonly lookupName: string,
    readonly asElementScalar: TemplateCompilerReachedAttributeScalarReceipt | null,
    readonly elementRead: TemplateCompilerObservedValue<TemplateResolvedResource | null> | null,
    readonly elementDefinition: CustomElementDefinition | null,
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.Element);
  }
}

/** Exact dedicated `<let>` lowering after its element reach and child suppression. */
export class TemplateCompilerSiteCursorLetElementEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly elementEvent: TemplateCompilerSiteCursorElementEvent,
    readonly staging: TemplateCompilerLetElementStaging,
    readonly spends: readonly TemplateCompilerSiteSpend[],
    readonly occurrenceOnlyRows: readonly TemplateCompilerOccurrenceOnlyRow[],
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.LetElement);
    if (!this.isCoherent()) throw new Error('Compiler let event lost element, staging, or spend ownership.');
  }

  isCoherent(): boolean {
    return this.staging.isModuleConstructed()
      && this.staging.element === this.elementEvent.element
      && this.spends.length + this.occurrenceOnlyRows.length === this.staging.reachedAttributes.length
      && this.staging.reachedAttributes.every((reached) => reached.bundle == null
        ? this.occurrenceOnlyRows.some((row) => row.occurrence === reached.occurrence)
        : this.spends.some((spend) =>
            spend.occurrence === reached.occurrence && spend.bundle === reached.bundle
          ))
      && this.spends.every((spend) => this.staging.reachedAttributes.some((reached) =>
        reached.bundle != null
        && spend.occurrence === reached.occurrence
        && spend.bundle === reached.bundle
      ))
      && this.occurrenceOnlyRows.every((row) => this.staging.reachedAttributes.some((reached) =>
        reached.bundle == null && row.occurrence === reached.occurrence
      ));
  }
}

export class TemplateCompilerSiteCursorProcessContentEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly host: TemplateCompilerElementOccurrence,
    readonly plan: TemplateCompilerProcessContentPlan,
    readonly result: TemplateCompilerProcessContentResult,
    readonly removedSpends: readonly TemplateCompilerSiteSpend[],
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.ProcessContent);
    if (!this.isCoherent()) {
      throw new Error('Compiler processContent cursor event lost exact plan, operation, or removal spending authority.');
    }
  }

  isCoherent(): boolean {
    return this.result.plan === this.plan
      && this.plan.host === this.host
      && this.removedSpends.every((spend) =>
        spend.disposition === TemplateCompilerSiteSpendDisposition.ProcessContentRemoved
        && spend.siteEventOrdinal == null
        && spend.causeOperation === this.result.operation
        && this.result.authorizesRemovedSiteOccurrence(spend.occurrence)
      );
  }
}

export class TemplateCompilerSiteCursorAttributeEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly owner: TemplateCompilerElementOccurrence,
    readonly attribute: TemplateCompilerAttributeOccurrence,
    readonly forestOrdinal: number,
    readonly jitLiveOrdinal: number,
    readonly scalar: TemplateCompilerReachedAttributeScalarReceipt,
    readonly browserOriginState: TemplateCompilerPreWalkBrowserOriginState,
    readonly bundle: TemplateCompilerNormalizedSite | null,
    readonly spend: TemplateCompilerSiteSpend | null,
    readonly occurrenceOnlyRow: TemplateCompilerOccurrenceOnlyRow | null,
    readonly siteOutcome: TemplateCompilerSiteCursorSiteOutcome,
    readonly authoredProgression: TemplateCompilerAttributeOwnerProgressionSite | null,
    readonly liveOwnerSite: TemplateCompilerLiveAttributeOwnerSite,
    readonly liveContribution: TemplateCompilerLiveAttributeContribution | null = null,
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.Attribute);
    if (!this.isCoherent()) {
      throw new Error('Compiler live attribute cursor event lost its reached frame or disposition authority.');
    }
  }

  isCoherent(): boolean {
    return this.liveContribution == null
      || (
        this.liveContribution.frame.attribute === this.attribute
        && this.liveContribution.frame.liveSite === this.liveOwnerSite
        && this.liveContribution.frame.scalar === this.scalar
        && this.liveContribution.frame.source.originState === this.browserOriginState
        && this.liveContribution.disposition === this.liveOwnerSite.disposition
      );
  }
}

/** Exact source-owned transition from one reached host through its complete ordered TC context chain. */
export class TemplateCompilerSiteCursorTemplateControllerTransitionEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly host: TemplateCompilerElementOccurrence,
    readonly preparation: TemplateCompilerTemplateControllerTransitionPreparation,
    readonly realization: TemplateCompilerTemplateControllerTransitionRealization,
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.TemplateControllerTransition);
    if (!this.isCoherent()) {
      throw new Error('Compiler template-controller transition event lost its host or realized context chain.');
    }
  }

  isCoherent(): boolean {
    return this.preparation.isModuleConstructed()
      && this.realization.isModuleConstructed()
      && this.realization.request.preparation === this.preparation
      && this.preparation.host === this.host
      && this.preparation.request.reachedElement.elementEvent.element === this.host
      && this.preparation.request.reachedElement.elementEvent.ordinal < this.ordinal
      && this.realization.leafRehoming.host === this.host
      && this.realization.contexts.length === this.preparation.drafts.length;
  }
}

/** Exact task work staged for one realized projection entrant band, including an intentional empty band. */
export class TemplateCompilerSiteCursorProjectionEntrantBandStaging {
  readonly works: readonly TemplateCompilerSiteCursorLogicalEntrantWork[];

  constructor(
    readonly band: TemplateCompilerProjectionRealizedEntrantBand,
    works: readonly TemplateCompilerSiteCursorLogicalEntrantWork[],
  ) {
    this.works = [...works];
    if (!this.isCoherent()) {
      throw new Error('Compiler projection entrant staging lost its realized work identities or order.');
    }
  }

  isCoherent(): boolean {
    return this.band.isModuleConstructed()
      && this.works.length === this.band.entrants.length
      && this.works.every((work, ordinal) => {
        const entrant = this.band.entrants[ordinal];
        return entrant != null
          && work.isModuleConstructed()
          && work.context === this.band.context
          && work.entrantAuthority === entrant
          && work.node === entrant.node
          && work.physicalSource.source === entrant.source
          && work.physicalSource.sourceOrdinal === entrant.planned.source.sourceOrdinal
          && work.logicalOrdinal === entrant.planned.logicalOrdinal
          && work.logicalSuccessor === entrant.planned.logicalSuccessor;
      });
  }
}

/** Exact host-time projection redistribution and `[au-slot]` accounting decision. */
export class TemplateCompilerSiteCursorProjectionExtractionEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly host: TemplateCompilerElementOccurrence,
    readonly preparation: TemplateCompilerProjectionLogicalExtractionPreparation,
    readonly realization: TemplateCompilerProjectionLogicalExtractionRealization,
    readonly entrantBandStagings: readonly TemplateCompilerSiteCursorProjectionEntrantBandStaging[],
    readonly authoredSlotSpends: readonly TemplateCompilerSiteSpend[],
    readonly occurrenceOnlySlotRows: readonly TemplateCompilerOccurrenceOnlyRow[],
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.ProjectionExtraction);
    if (!this.isCoherent()) {
      throw new Error('Compiler projection extraction event lost its host, context realization, or slot accounting.');
    }
  }

  isCoherent(): boolean {
    if (
      !this.preparation.isModuleConstructed()
      || !this.realization.isModuleConstructed()
      || this.preparation.request.envelope.element !== this.host
      || this.preparation.elementEvent.element !== this.host
      || this.preparation.elementEvent.ordinal >= this.ordinal
      || this.realization.request.preparation !== this.preparation
      || this.entrantBandStagings.length !== this.realization.entrantBands.length
      || this.entrantBandStagings.some((staging, ordinal) =>
        staging.band !== this.realization.entrantBands[ordinal]
        || !staging.isCoherent()
      )
    ) return false;
    const rows = new Map<
      TemplateCompilerProjectionSlotConsumptionReceipt,
      TemplateCompilerSiteSpend | TemplateCompilerOccurrenceOnlyRow
    >();
    for (const spend of this.authoredSlotSpends) {
      const consumption = spend.projectionSlotConsumption;
      if (
        consumption == null
        || spend.disposition !== TemplateCompilerSiteSpendDisposition.ProjectionSlotAttributeConsumed
        || spend.siteEventOrdinal != null
        || spend.occurrence !== consumption.attribute
        || rows.has(consumption)
      ) return false;
      rows.set(consumption, spend);
    }
    for (const row of this.occurrenceOnlySlotRows) {
      const consumption = row.projectionSlotConsumption;
      if (
        consumption == null
        || row.disposition !== TemplateCompilerOccurrenceOnlyDisposition.ProjectionSlotAttributeConsumed
        || row.siteEventOrdinal != null
        || row.occurrence !== consumption.attribute
        || rows.has(consumption)
      ) return false;
      rows.set(consumption, row);
    }
    return rows.size === this.preparation.slotConsumptions.length
      && this.preparation.slotConsumptions.every((consumption) => rows.has(consumption));
  }
}

/** Exact cursor decision to suppress empty host content and defer physical replacement to target execution. */
export class TemplateCompilerSiteCursorContainerlessPlacementEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly element: TemplateCompilerElementOccurrence,
    readonly parent: TemplateCompilerParentOccurrence,
    readonly parentOrdinal: number,
    readonly capturedSuccessor: TemplateCompilerNodeOccurrence | null,
    readonly envelope: TemplateCompilerHydrateElementEnvelopeDraft,
    readonly projectionExtraction: TemplateCompilerSiteCursorProjectionExtractionEvent | null = null,
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.ContainerlessPlacement);
    const projectionFree = envelope.projection.state === TemplateCompilerHydrateElementProjectionState.None
      && projectionExtraction == null
      && element.readChildren().length === 0;
    const projectionExtracted = envelope.projection.state === TemplateCompilerHydrateElementProjectionState.PendingExtraction
      && projectionExtraction?.host === element
      && projectionExtraction.preparation.request.envelope === envelope
      && projectionExtraction.preparation.residuals.length === 0
      && projectionExtraction.ordinal < ordinal;
    if (
      envelope.element !== element
      || !envelope.containerless.effective
      || !isTemplateCompilerProcessContentSettledForHost(element, envelope.processContent)
      || (!projectionFree && !projectionExtracted)
    ) {
      throw new Error('Containerless placement event requires one logically empty ordinary host.');
    }
  }
}

export class TemplateCompilerSiteCursorTextEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly text: TemplateCompilerTextOccurrence,
    readonly parent: TemplateCompilerParentOccurrence,
    readonly parentOrdinal: number,
    readonly capturedSuccessor: TemplateCompilerNodeOccurrence | null,
    readonly browserOriginState: TemplateCompilerPreWalkBrowserOriginState,
    readonly authoredText: HtmlText | null,
    readonly bundle: TemplateCompilerNormalizedTextSite | null,
    readonly spend: TemplateCompilerSiteSpend | null,
    readonly occurrenceOnlyRow: TemplateCompilerOccurrenceOnlyRow | null,
    readonly siteOutcome: TemplateCompilerSiteCursorSiteOutcome,
    readonly instructionStaging: TemplateCompilerTextInstructionStaging | null = null,
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.Text);
    if (!this.isCoherent()) {
      throw new Error('Compiler live text cursor event lost exact parser-hole instruction staging authority.');
    }
  }

  isCoherent(): boolean {
    if (this.bundle != null && this.authoredText !== this.bundle.text) return false;
    const expectsStaging = this.siteOutcome === TemplateCompilerSiteCursorSiteOutcome.Complete
      && this.spend?.disposition === TemplateCompilerSiteSpendDisposition.BrowserCompatible
      && this.bundle?.expressionParse.result.kind === ExpressionParseResultKind.InterpolationSuccess;
    if (!expectsStaging) return this.instructionStaging == null;
    const staging = this.instructionStaging;
    return staging != null
      && staging.isModuleConstructed()
      && staging.occurrenceKey === this.text.occurrenceKey
      && staging.node.productHandle === this.bundle?.text.productHandle
      && staging.expressionProductHandle === this.bundle?.expressionParse.productHandle
      && staging.parseResult === this.bundle?.expressionParse.result;
  }
}

export class TemplateCompilerSiteCursorIgnoredNodeEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly node: TemplateCompilerNodeOccurrence,
    readonly parent: TemplateCompilerParentOccurrence,
    readonly parentOrdinal: number,
    readonly capturedSuccessor: TemplateCompilerNodeOccurrence | null,
    readonly occurrenceOnlyRow: TemplateCompilerOccurrenceOnlyRow,
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.IgnoredNode);
  }
}

export class TemplateCompilerSiteCursorSubtreeExclusionEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly owner: TemplateCompilerElementOccurrence,
    readonly root: TemplateCompilerFragmentOccurrence | TemplateCompilerNodeOccurrence,
    readonly disposition:
      | TemplateCompilerSiteSpendDisposition.InertTemplateContent
      | TemplateCompilerSiteSpendDisposition.LetContentSuppressed,
    readonly spends: readonly TemplateCompilerSiteSpend[],
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.SubtreeExclusion);
  }
}

export class TemplateCompilerSiteCursorSurrogateValidationEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly carrier: TemplateCompilerElementOccurrence,
    readonly attribute: TemplateCompilerAttributeOccurrence,
    readonly forestOrdinal: number,
    readonly scalar: TemplateCompilerReachedAttributeScalarReceipt,
    readonly parsed: TemplateCompilerObservedValue<AttributeParserParseResult>,
    readonly outcome: TemplateCompilerSiteCursorSurrogateValidationOutcome,
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.SurrogateValidation);
  }
}

export class TemplateCompilerSiteCursorFrontier extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly phaseKind: TemplateCompilerSiteCursorPhaseKind,
    readonly frontierKind: TemplateCompilerSiteCursorFrontierKind,
    readonly node: TemplateCompilerNodeOccurrence | null,
    readonly attribute: TemplateCompilerAttributeOccurrence | null,
    readonly bundle: TemplateCompilerNormalizedSiteBundle | null,
    readonly capturedSuccessor: TemplateCompilerNodeOccurrence | null,
    readonly nextSiteEventOrdinal: number,
    readonly forestMutationRevision: number,
    readonly globalOperationCount: number,
    readonly summary: string,
  ) {
    super(authority, ordinal, TemplateCompilerSiteCursorEventKind.Frontier);
  }
}
