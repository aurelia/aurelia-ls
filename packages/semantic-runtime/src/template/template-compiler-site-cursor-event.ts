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
import { TemplateCompilerSiteSpendDisposition } from './template-compiler-site-spend-ledger.js';
import type { HtmlElement } from './html-ir.js';
import type {
  TemplateCompilerProcessContentPlan,
  TemplateCompilerProcessContentResult,
} from './template-compiler-process-content.js';
import type { TemplateCompilerLiveAttributeContribution } from './template-compiler-live-attribute-assembly.js';
import type { TemplateCompilerTextInstructionStaging } from './template-compiler-text-instruction-staging.js';

export const enum TemplateCompilerSiteCursorEventKind {
  Phase = 'phase',
  Element = 'element',
  ProcessContent = 'process-content',
  Attribute = 'attribute',
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
  BeforeProcessContent = 'before-process-content',
  AtLiveAttributeRelowering = 'at-live-attribute-relowering',
  ReachedLiveAttributeOpen = 'reached-live-attribute-open',
  ReachedLiveAttributeInvalid = 'reached-live-attribute-invalid',
  HydrateElementEnvelopeOpen = 'hydrate-element-envelope-open',
  HydrateElementEnvelopeInvalid = 'hydrate-element-envelope-invalid',
  ReachedNormalizedOpen = 'reached-normalized-open',
  ReachedNormalizedInvalid = 'reached-normalized-invalid',
  LetElementLoweringRequired = 'let-element-lowering-required',
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

export class TemplateCompilerSiteCursorTextEvent extends TemplateCompilerSiteCursorEvent {
  constructor(
    authority: object,
    ordinal: number,
    readonly text: TemplateCompilerTextOccurrence,
    readonly parent: TemplateCompilerParentOccurrence,
    readonly parentOrdinal: number,
    readonly capturedSuccessor: TemplateCompilerNodeOccurrence | null,
    readonly browserOriginState: TemplateCompilerPreWalkBrowserOriginState,
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
