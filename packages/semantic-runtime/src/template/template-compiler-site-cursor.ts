import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import {
  AttributeClassificationKind,
  AttributeSyntaxKind,
} from './attribute-syntax.js';
import {
  TemplateCompilerAttributeOwnerProgressionDisposition,
} from './attribute-owner-progression.js';
import {
  TemplateCompilerScopeClosureState,
} from './compiler-read-view.js';
import type {
  TemplateCompilerReadView,
} from './compiler-read-view.js';
import {
  TemplateCompilerLiveAttributeDisposition,
  TemplateCompilerLiveAttributeOwnerProgression,
} from './template-compiler-live-attribute-owner.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerCommentOccurrence,
  TemplateCompilerDoctypeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  type TemplateCompilerNodeOccurrence,
  type TemplateCompilerParentOccurrence,
  TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
import {
  TemplateCompilerPreWalkRemainderAuthority,
  TemplateCompilerPreWalkBrowserOriginState,
} from './template-compiler-prewalk-remainder.js';
import {
  bindTemplateCompilerRootSiteInvocation,
  type TemplateCompilerSiteInvocationBinding,
  TemplateCompilerSiteInvocationBindingState,
} from './template-compiler-site-invocation.js';
import {
  type TemplateCompilerNormalizedSiteBundle,
  type TemplateCompilerOccurrenceOnlyRow,
  type TemplateCompilerSiteSpend,
  TemplateCompilerSiteSpendCompletion,
  TemplateCompilerSiteSpendConflict,
  TemplateCompilerSiteSpendDisposition,
  TemplateCompilerSiteSpendLedger,
  type TemplateCompilerSiteSpendLedgerResult,
  TemplateCompilerOccurrenceOnlyDisposition,
} from './template-compiler-site-spend-ledger.js';
import type { TemplateCompilerAuthoredSiteRemainderEvidence } from './template-compiler-site-spend-ledger.js';
import type { HtmlElement } from './html-ir.js';
import type { TemplateCompilerSiteExecutionDriverReference } from './template-compiler-execution.js';
import {
  executeTemplateCompilerProcessContent,
  planTemplateCompilerProcessContent,
  TemplateCompilerProcessContentPlanState,
  type TemplateCompilerProcessContentResult,
} from './template-compiler-process-content.js';
import {
  runtimeElementLookupName,
  runtimeElementResourceName,
} from './runtime-dom-name.js';
import {
  TemplateCompilerBrowserOriginRouteKind,
} from './template-compiler-authored-origin-index.js';
import { TemplateExpressionParseState, TemplateValueSiteKind } from './value-site.js';
import {
  TemplateCompilerSiteCursorAttributeEvent,
  TemplateCompilerSiteCursorElementEvent,
  type TemplateCompilerSiteCursorEvent,
  TemplateCompilerSiteCursorFrontier,
  TemplateCompilerSiteCursorFrontierKind,
  TemplateCompilerSiteCursorIgnoredNodeEvent,
  TemplateCompilerSiteCursorNormalizedOutcome,
  TemplateCompilerSiteCursorPhaseEvent,
  TemplateCompilerSiteCursorPhaseKind,
  TemplateCompilerSiteCursorProcessContentEvent,
  TemplateCompilerSiteCursorSubtreeExclusionEvent,
  TemplateCompilerSiteCursorSurrogateValidationEvent,
  TemplateCompilerSiteCursorSurrogateValidationOutcome,
  TemplateCompilerSiteCursorTextEvent,
} from './template-compiler-site-cursor-event.js';

export * from './template-compiler-site-cursor-event.js';
import {
  TemplateCompilerSiteCursorSemanticResolver,
} from './template-compiler-site-cursor-semantics.js';

const siteCursorConstructionAuthority = {};

export const enum TemplateCompilerSiteCursorAdmissionReasonKind {
  ForeignBinding = 'foreign-binding',
  ForeignPreWalkAuthority = 'foreign-pre-walk-authority',
  CompilerReadWorldMismatch = 'compiler-read-world-mismatch',
  InvocationNoLongerCurrent = 'invocation-no-longer-current',
}

export class TemplateCompilerSiteCursorAdmissionReason {
  constructor(
    readonly reasonKind: TemplateCompilerSiteCursorAdmissionReasonKind,
    readonly summary: string,
  ) {}
}

export class TemplateCompilerSiteCursorTranscript {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly binding: TemplateCompilerSiteInvocationBinding,
    readonly compilerReads: TemplateCompilerReadView,
    readonly preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority,
    readonly events: readonly TemplateCompilerSiteCursorEvent[],
    readonly ledger: TemplateCompilerSiteSpendLedgerResult,
    readonly frontier: TemplateCompilerSiteCursorFrontier | null,
    readonly startForestMutationRevision: number,
    readonly endForestMutationRevision: number,
    readonly startGlobalOperationCount: number,
    readonly endGlobalOperationCount: number,
    readonly expectedEndForestMutationRevision: number,
    readonly expectedEndGlobalOperationCount: number,
    readonly nextTranscriptOrdinal: number,
    readonly nextSiteEventOrdinal: number,
  ) {
    const expectedFrontierKind = frontier?.frontierKind ?? null;
    const frontierIsCurrentnessLoss = frontier?.frontierKind
      === TemplateCompilerSiteCursorFrontierKind.CurrentnessLost;
    const currentnessActuallyChanged = expectedEndForestMutationRevision !== endForestMutationRevision
      || expectedEndGlobalOperationCount !== endGlobalOperationCount;
    if (
      authority !== siteCursorConstructionAuthority
      || !binding.isModuleConstructed()
      || preWalkAuthority.binding !== binding
      || preWalkAuthority.index !== binding.index
      || compilerReads.world !== binding.compilerWorld
      || events.some((event, ordinal) =>
        !event.isOwnedBy(siteCursorConstructionAuthority)
        || event.ordinal !== ordinal
        || (event instanceof TemplateCompilerSiteCursorProcessContentEvent && !event.isCoherent())
      )
      || nextTranscriptOrdinal !== events.length
      || (frontier == null
        ? events.some((event) => event instanceof TemplateCompilerSiteCursorFrontier)
        : events[events.length - 1] !== frontier)
      || ledger.completion.frontierKind !== expectedFrontierKind
      || ledger.completion.nextSiteEventOrdinal !== nextSiteEventOrdinal
      || nextSiteEventOrdinal < 0
      || frontierIsCurrentnessLoss !== currentnessActuallyChanged
    ) {
      throw new Error('Template compiler site cursor transcript lost nominal ownership, order, or completion authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === siteCursorConstructionAuthority;
  }
}

export const enum TemplateCompilerSiteCursorResultState {
  Transcript = 'transcript',
  Mismatch = 'mismatch',
}

export class TemplateCompilerSiteCursorResult {
  readonly state: TemplateCompilerSiteCursorResultState;

  constructor(
    readonly transcript: TemplateCompilerSiteCursorTranscript | null,
    readonly reasons: readonly TemplateCompilerSiteCursorAdmissionReason[],
  ) {
    this.state = transcript == null
      ? TemplateCompilerSiteCursorResultState.Mismatch
      : TemplateCompilerSiteCursorResultState.Transcript;
  }
}

export interface TemplateCompilerRootSiteCursorRequest {
  readonly binding: TemplateCompilerSiteInvocationBinding;
  readonly compilerReads: TemplateCompilerReadView;
  readonly preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority;
}

interface TemplateCompilerSiteCursorContainerFrame {
  readonly parent: TemplateCompilerParentOccurrence;
  readonly children: readonly TemplateCompilerNodeOccurrence[];
  nextOrdinal: number;
}

/**
 * Execute one product-free no-local root prefix without admitting a target plan.
 * Forest mutation is admitted only through exact cursor-owned built-in site operations.
 */
export function executeTemplateCompilerRootSiteCursor(
  request: TemplateCompilerRootSiteCursorRequest,
): TemplateCompilerSiteCursorResult {
  const reasons = cursorAdmissionReasons(request);
  if (reasons.length > 0) return new TemplateCompilerSiteCursorResult(null, reasons);
  return new TemplateCompilerSiteCursorResult(new TemplateCompilerRootSiteCursor(request).execute(), []);
}

function cursorAdmissionReasons(
  request: TemplateCompilerRootSiteCursorRequest,
): readonly TemplateCompilerSiteCursorAdmissionReason[] {
  const reasons: TemplateCompilerSiteCursorAdmissionReason[] = [];
  const binding = request.binding;
  if (!binding.isModuleConstructed()) {
    reasons.push(new TemplateCompilerSiteCursorAdmissionReason(
      TemplateCompilerSiteCursorAdmissionReasonKind.ForeignBinding,
      'Root cursor requires one module-constructed site invocation binding.',
    ));
    return reasons;
  }
  if (
    !(request.preWalkAuthority instanceof TemplateCompilerPreWalkRemainderAuthority)
    || request.preWalkAuthority.binding !== binding
    || request.preWalkAuthority.index !== binding.index
  ) {
    reasons.push(new TemplateCompilerSiteCursorAdmissionReason(
      TemplateCompilerSiteCursorAdmissionReasonKind.ForeignPreWalkAuthority,
      'Root cursor requires the exact pre-walk authority captured for this binding object.',
    ));
  }
  if (request.compilerReads.world !== binding.compilerWorld) {
    reasons.push(new TemplateCompilerSiteCursorAdmissionReason(
      TemplateCompilerSiteCursorAdmissionReasonKind.CompilerReadWorldMismatch,
      'Root cursor compiler reads belong to another compiler-world object.',
    ));
  }
  const current = bindTemplateCompilerRootSiteInvocation({
    execution: binding.execution,
    bootstrapClosure: binding.bootstrapClosure,
    browserEmission: binding.browserEmission,
    graphExact: binding.graphExact,
    currentFrontDoor: binding.currentFrontDoor,
    currentFamily: binding.currentFamily,
  });
  if (
    current.state !== TemplateCompilerSiteInvocationBindingState.Exact
    || binding.execution.forest.mutationRevision !== binding.bootstrapClosure.forestMutationRevision
  ) {
    reasons.push(new TemplateCompilerSiteCursorAdmissionReason(
      TemplateCompilerSiteCursorAdmissionReasonKind.InvocationNoLongerCurrent,
      'Root cursor binding no longer owns the exact pre-target bootstrap frontier.',
    ));
  }
  return reasons;
}

class TemplateCompilerRootSiteCursor {
  private readonly binding: TemplateCompilerSiteInvocationBinding;
  private readonly compilerReads: TemplateCompilerReadView;
  private readonly preWalk: TemplateCompilerPreWalkRemainderAuthority;
  private readonly ledger: TemplateCompilerSiteSpendLedger;
  private readonly semantics: TemplateCompilerSiteCursorSemanticResolver;
  private readonly events: TemplateCompilerSiteCursorEvent[] = [];
  private readonly startForestMutationRevision: number;
  private readonly startGlobalOperationCount: number;
  private transcriptOrdinal = 0;
  private phaseKind = TemplateCompilerSiteCursorPhaseKind.PreWalkRemainders;
  private frontier: TemplateCompilerSiteCursorFrontier | null = null;
  private siteDriver: TemplateCompilerSiteExecutionDriverReference | null = null;

  constructor(readonly request: TemplateCompilerRootSiteCursorRequest) {
    this.binding = request.binding;
    this.compilerReads = request.compilerReads;
    this.preWalk = request.preWalkAuthority;
    this.ledger = new TemplateCompilerSiteSpendLedger(this.binding.index);
    this.startForestMutationRevision = this.binding.forest.mutationRevision;
    this.startGlobalOperationCount = this.binding.execution.sequence.readOperations().length;
    this.semantics = new TemplateCompilerSiteCursorSemanticResolver(
      this.binding,
      this.compilerReads,
      this.preWalk,
    );
  }

  execute(): TemplateCompilerSiteCursorTranscript {
    this.primePreWalkRemainders();
    if (this.frontier == null) this.walkContent();
    if (this.frontier == null) this.validateSurrogate();
    this.ensureCurrentness();

    const completion = this.frontier == null
      ? TemplateCompilerSiteSpendCompletion.complete(this.ledger.nextSiteEventOrdinal)
      : TemplateCompilerSiteSpendCompletion.blocked(
          this.frontier.frontierKind,
          this.ledger.nextSiteEventOrdinal,
        );
    const ledger = this.ledger.finish(completion);
    const endForestMutationRevision = this.binding.forest.mutationRevision;
    const endGlobalOperationCount = this.binding.execution.sequence.readOperations().length;
    const expectedEndForestMutationRevision = this.siteDriver?.expectedForestMutationRevision
      ?? this.startForestMutationRevision;
    const expectedEndGlobalOperationCount = this.siteDriver?.expectedGlobalOperationCount
      ?? this.startGlobalOperationCount;
    const transcript = new TemplateCompilerSiteCursorTranscript(
      siteCursorConstructionAuthority,
      this.binding,
      this.compilerReads,
      this.preWalk,
      this.events,
      ledger,
      this.frontier,
      this.startForestMutationRevision,
      endForestMutationRevision,
      this.startGlobalOperationCount,
      endGlobalOperationCount,
      expectedEndForestMutationRevision,
      expectedEndGlobalOperationCount,
      this.transcriptOrdinal,
      this.ledger.nextSiteEventOrdinal,
    );
    if (
      this.siteDriver != null
      && this.frontier?.frontierKind !== TemplateCompilerSiteCursorFrontierKind.CurrentnessLost
    ) {
      this.binding.execution.finishSiteExecutionDriver(this.siteDriver);
    }
    return transcript;
  }

  private primePreWalkRemainders(): void {
    const receipts = this.preWalk.readAll();
    const evidence: TemplateCompilerAuthoredSiteRemainderEvidence[] = [];
    let accountingConflict: TemplateCompilerNormalizedSiteBundle | null = null;
    for (const receipt of receipts) {
      const result = this.ledger.recordAuthorizedAuthoredRemainder(this.preWalk, receipt);
      if (result instanceof TemplateCompilerSiteSpendConflict) {
        accountingConflict = receipt.bundle;
        break;
      }
      evidence.push(result);
    }
    this.events.push(new TemplateCompilerSiteCursorPhaseEvent(
      siteCursorConstructionAuthority,
      this.transcriptOrdinal++,
      TemplateCompilerSiteCursorPhaseKind.PreWalkRemainders,
      receipts,
      evidence,
    ));
    if (accountingConflict != null) {
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.AccountingMismatch,
        null,
        null,
        accountingConflict,
        null,
        'Pre-walk remainder authority conflicted with the root site ledger.',
      );
    }
  }

  private walkContent(): void {
    this.phaseKind = TemplateCompilerSiteCursorPhaseKind.ContentStart;
    this.phase(TemplateCompilerSiteCursorPhaseKind.ContentStart);
    const root = this.binding.forest.compilerContent;
    const stack: TemplateCompilerSiteCursorContainerFrame[] = [{
      parent: root,
      children: root.readChildren(),
      nextOrdinal: 0,
    }];
    while (stack.length > 0 && this.frontier == null) {
      const frame = stack[stack.length - 1]!;
      if (frame.nextOrdinal >= frame.children.length) {
        stack.pop();
        continue;
      }
      const ordinal = frame.nextOrdinal++;
      const node = frame.children[ordinal]!;
      const successor = frame.children[ordinal + 1] ?? null;
      const childFrame = this.visitNode(node, frame.parent, ordinal, successor);
      if (childFrame != null) stack.push(childFrame);
    }
    if (this.frontier == null) {
      this.phaseKind = TemplateCompilerSiteCursorPhaseKind.ContentEnd;
      this.phase(TemplateCompilerSiteCursorPhaseKind.ContentEnd);
    }
  }

  private visitNode(
    node: TemplateCompilerNodeOccurrence,
    parent: TemplateCompilerParentOccurrence,
    parentOrdinal: number,
    successor: TemplateCompilerNodeOccurrence | null,
  ): TemplateCompilerSiteCursorContainerFrame | null {
    if (node instanceof TemplateCompilerElementOccurrence) {
      return this.visitElement(node, parent, parentOrdinal, successor);
    }
    if (node instanceof TemplateCompilerTextOccurrence) {
      this.visitText(node, parent, parentOrdinal, successor);
      return null;
    }
    if (node instanceof TemplateCompilerCommentOccurrence || node instanceof TemplateCompilerDoctypeOccurrence) {
      this.visitIgnored(node, parent, parentOrdinal, successor);
      return null;
    }
    if (node instanceof TemplateCompilerFragmentOccurrence) {
      return { parent: node, children: node.readChildren(), nextOrdinal: 0 };
    }
    return null;
  }

  private visitElement(
    element: TemplateCompilerElementOccurrence,
    parent: TemplateCompilerParentOccurrence,
    parentOrdinal: number,
    successor: TemplateCompilerNodeOccurrence | null,
  ): TemplateCompilerSiteCursorContainerFrame | null {
    const origin = this.semantics.originRoute(element);
    const originState = this.semantics.originState(element);
    const authoredElement = origin?.routeKind === TemplateCompilerBrowserOriginRouteKind.Singular
      ? this.binding.index.elementForProduct(origin.exactOrigin!.authored.productHandle)
      : null;
    let elementOccurrenceRow: TemplateCompilerOccurrenceOnlyRow | null = null;

    if (element.generation != null) {
      const row = this.recordOccurrenceOnly(
        element,
        TemplateCompilerOccurrenceOnlyDisposition.GeneratedSiteNeedsLowering,
      );
      this.events.push(new TemplateCompilerSiteCursorElementEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        element,
        parent,
        parentOrdinal,
        successor,
        authoredElement,
        originState,
        row,
        runtimeElementResourceName(element.tagName, element.namespace),
        null,
        null,
        null,
      ));
      this.stop(
        row == null
          ? TemplateCompilerSiteCursorFrontierKind.AccountingMismatch
          : TemplateCompilerSiteCursorFrontierKind.GeneratedSiteNeedsLowering,
        element,
        null,
        null,
        successor,
        row == null
          ? 'Generated element accounting conflicted with the site ledger.'
          : 'Compiler-generated element requires live semantic lowering.',
      );
      return null;
    }
    if (originState === TemplateCompilerPreWalkBrowserOriginState.NonSingular) {
      elementOccurrenceRow = this.recordOccurrenceOnly(
        element,
        TemplateCompilerOccurrenceOnlyDisposition.NonSingularBrowserOrigin,
      );
      this.events.push(new TemplateCompilerSiteCursorElementEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        element,
        parent,
        parentOrdinal,
        successor,
        authoredElement,
        originState,
        elementOccurrenceRow,
        runtimeElementResourceName(element.tagName, element.namespace),
        null,
        null,
        null,
      ));
      this.stop(
        elementOccurrenceRow == null
          ? TemplateCompilerSiteCursorFrontierKind.AccountingMismatch
          : TemplateCompilerSiteCursorFrontierKind.NonSingularBrowserOrigin,
        element,
        null,
        null,
        successor,
        'Element has no singular closed authored/browser origin.',
      );
      return null;
    }
    if (
      originState === TemplateCompilerPreWalkBrowserOriginState.CorrespondenceOpen
      || originState === TemplateCompilerPreWalkBrowserOriginState.Unknown
    ) {
      this.events.push(new TemplateCompilerSiteCursorElementEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        element,
        parent,
        parentOrdinal,
        successor,
        authoredElement,
        originState,
        null,
        runtimeElementResourceName(element.tagName, element.namespace),
        null,
        null,
        null,
      ));
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.AuthoredPrecedentMismatch,
        element,
        null,
        null,
        successor,
        'Element authored/browser correspondence remains open or unavailable.',
      );
      return null;
    }
    if (
      originState === TemplateCompilerPreWalkBrowserOriginState.Absent
    ) {
      elementOccurrenceRow = this.recordOccurrenceOnly(
        element,
        TemplateCompilerOccurrenceOnlyDisposition.BrowserImpliedElementPassThrough,
      );
      if (elementOccurrenceRow == null) {
        this.events.push(new TemplateCompilerSiteCursorElementEvent(
          siteCursorConstructionAuthority,
          this.transcriptOrdinal++,
          element,
          parent,
          parentOrdinal,
          successor,
          authoredElement,
          originState,
          null,
          runtimeElementResourceName(element.tagName, element.namespace),
          null,
          null,
          null,
        ));
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.AccountingMismatch,
          element,
          null,
          null,
          successor,
          'Implied-element accounting conflicted with the site ledger.',
        );
        return null;
      }
    } else if (authoredElement == null) {
      this.events.push(new TemplateCompilerSiteCursorElementEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        element,
        parent,
        parentOrdinal,
        successor,
        null,
        originState,
        elementOccurrenceRow,
        runtimeElementResourceName(element.tagName, element.namespace),
        null,
        null,
        null,
      ));
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.AuthoredPrecedentMismatch,
        element,
        null,
        null,
        successor,
        'Singular element origin is absent from the GraphExact authored element index.',
      );
      return null;
    }

    if (runtimeElementResourceName(element.tagName, element.namespace) === 'let') {
      this.events.push(new TemplateCompilerSiteCursorElementEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        element,
        parent,
        parentOrdinal,
        successor,
        authoredElement,
        originState,
        elementOccurrenceRow,
        'let',
        null,
        null,
        null,
      ));
      if (element.readChildren().length > 0) {
        this.excludeSubtree(
          element,
          element,
          TemplateCompilerSiteSpendDisposition.LetContentSuppressed,
          element.readChildren(),
        );
      }
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.LetElementLoweringRequired,
        element,
        null,
        null,
        successor,
        '<let> uses a dedicated attribute grammar and lowering lane.',
      );
      return null;
    }

    const asElement = this.semantics.readAsElementScalar(element);
    if (asElement?.scalar != null && !asElement.scalar.isExact()) {
      this.events.push(new TemplateCompilerSiteCursorElementEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        element,
        parent,
        parentOrdinal,
        successor,
        authoredElement,
        originState,
        elementOccurrenceRow,
        '',
        asElement.scalar,
        null,
        null,
      ));
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.AsElementScalarOpen,
        element,
        asElement.attribute,
        null,
        successor,
        'Live as-element scalar is not fully explained by committed compiler writes.',
      );
      return null;
    }
    const lookupName = runtimeElementLookupName(
      element.tagName,
      element.namespace,
      asElement?.scalar.currentValue ?? null,
    );
    const elementRead = this.semantics.readElement(lookupName);
    const elementDefinition = this.semantics.closedElementDefinition(elementRead);
    this.events.push(new TemplateCompilerSiteCursorElementEvent(
      siteCursorConstructionAuthority,
      this.transcriptOrdinal++,
      element,
      parent,
      parentOrdinal,
      successor,
      authoredElement,
      originState,
      elementOccurrenceRow,
      lookupName,
      asElement?.scalar ?? null,
      elementRead,
      elementDefinition,
    ));
    if (!this.semantics.elementReadIsClosed(elementRead)) {
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.ElementResolutionOpen,
        element,
        asElement?.attribute ?? null,
        null,
        successor,
        `Element resource lookup '${lookupName}' is not one closed absence or full definition.`,
      );
      return null;
    }
    let processContent: TemplateCompilerProcessContentResult | null = null;
    if (elementDefinition?.processContent != null) {
      const plan = planTemplateCompilerProcessContent({
        execution: this.binding.execution,
        siteAuthority: this.siteDriver ?? this.binding.bootstrapClosure,
        compilerReads: this.compilerReads,
        elementRead,
        host: element,
      });
      if (plan.state !== TemplateCompilerProcessContentPlanState.Exact) {
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.BeforeProcessContent,
          element,
          null,
          null,
          successor,
          plan.openReason?.summary
            ?? `Custom element '${elementDefinition.name}' has an open processContent effect.`,
        );
        return null;
      }
      if (this.siteDriver == null) {
        this.siteDriver = this.binding.execution.beginSiteExecutionDriver(plan.frontier);
        this.semantics.useSiteDriver(this.siteDriver);
      }
      processContent = executeTemplateCompilerProcessContent({ plan, driver: this.siteDriver });
      const removedSpends: TemplateCompilerSiteSpend[] = [];
      this.events.push(new TemplateCompilerSiteCursorProcessContentEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        element,
        plan,
        processContent,
        removedSpends,
      ));
      this.accountProcessContentRemovals(processContent, removedSpends);
      if (this.frontier != null) return null;
    }

    return this.visitElementAttributesAndChildren(
      element,
      authoredElement,
      elementDefinition,
      successor,
    );
  }

  private visitElementAttributesAndChildren(
    element: TemplateCompilerElementOccurrence,
    authoredElement: HtmlElement | null,
    elementDefinition: CustomElementDefinition | null,
    successor: TemplateCompilerNodeOccurrence | null,
  ): TemplateCompilerSiteCursorContainerFrame | null {
    const relation = this.semantics.elementOwnerRelation(element, authoredElement);
    const progression = new TemplateCompilerLiveAttributeOwnerProgression(
      this.binding.forest,
      element,
      this.siteDriver?.expectedForestMutationRevision ?? this.startForestMutationRevision,
    );
    let hasTemplateController = false;
    let hasUsageContainerless = false;

    for (const attribute of element.readAttributes()) {
      if (this.frontier != null) break;
      const liveSite = progression.begin(attribute);
      const scalar = relation.receipts.get(attribute) ?? this.semantics.captureReachedAttributeScalar(
        element,
        attribute,
        liveSite.originalForestOrdinal,
      );
      const originState = this.semantics.originState(attribute);
      const route = this.semantics.originRoute(attribute);
      const bundle = route?.routeKind === TemplateCompilerBrowserOriginRouteKind.Singular
        ? this.binding.index.siteForAttribute(route.exactOrigin!.authored.productHandle)
        : null;

      if (attribute.generation != null || originState === TemplateCompilerPreWalkBrowserOriginState.Absent) {
        const row = this.recordOccurrenceOnly(
          attribute,
          TemplateCompilerOccurrenceOnlyDisposition.GeneratedSiteNeedsLowering,
        );
        progression.complete(liveSite, TemplateCompilerLiveAttributeDisposition.Open);
        this.events.push(new TemplateCompilerSiteCursorAttributeEvent(
          siteCursorConstructionAuthority,
          this.transcriptOrdinal++,
          element,
          attribute,
          liveSite.originalForestOrdinal,
          liveSite.simulatedLiveOrdinal,
          scalar,
          originState,
          null,
          null,
          row,
          TemplateCompilerSiteCursorNormalizedOutcome.ReloweringRequired,
          null,
          liveSite,
        ));
        this.stop(
          row == null
            ? TemplateCompilerSiteCursorFrontierKind.AccountingMismatch
            : TemplateCompilerSiteCursorFrontierKind.GeneratedSiteNeedsLowering,
          element,
          attribute,
          null,
          successor,
          'Generated or browser-implied attribute requires live syntax and lowering.',
        );
        break;
      }
      if (originState === TemplateCompilerPreWalkBrowserOriginState.NonSingular) {
        const row = this.recordOccurrenceOnly(
          attribute,
          TemplateCompilerOccurrenceOnlyDisposition.NonSingularBrowserOrigin,
        );
        progression.complete(liveSite, TemplateCompilerLiveAttributeDisposition.Open);
        this.events.push(new TemplateCompilerSiteCursorAttributeEvent(
          siteCursorConstructionAuthority,
          this.transcriptOrdinal++,
          element,
          attribute,
          liveSite.originalForestOrdinal,
          liveSite.simulatedLiveOrdinal,
          scalar,
          originState,
          null,
          null,
          row,
          TemplateCompilerSiteCursorNormalizedOutcome.ReloweringRequired,
          null,
          liveSite,
        ));
        this.stop(
          row == null
            ? TemplateCompilerSiteCursorFrontierKind.AccountingMismatch
            : TemplateCompilerSiteCursorFrontierKind.NonSingularBrowserOrigin,
          element,
          attribute,
          null,
          successor,
          'Attribute has no singular GraphExact authored/browser origin.',
        );
        break;
      }
      if (originState !== TemplateCompilerPreWalkBrowserOriginState.Singular || bundle == null) {
        progression.complete(liveSite, TemplateCompilerLiveAttributeDisposition.Open);
        this.events.push(new TemplateCompilerSiteCursorAttributeEvent(
          siteCursorConstructionAuthority,
          this.transcriptOrdinal++,
          element,
          attribute,
          liveSite.originalForestOrdinal,
          liveSite.simulatedLiveOrdinal,
          scalar,
          originState,
          null,
          null,
          null,
          TemplateCompilerSiteCursorNormalizedOutcome.ReloweringRequired,
          null,
          liveSite,
        ));
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.AuthoredPrecedentMismatch,
          element,
          attribute,
          null,
          successor,
          'Attribute authored/browser correspondence or GraphExact bundle ownership remains open.',
        );
        break;
      }

      const compatible = this.semantics.attributeIsCompatible(
        element,
        authoredElement,
        bundle,
        attribute,
        scalar,
        liveSite,
        relation,
      );
      const disposition = compatible
        ? TemplateCompilerSiteSpendDisposition.BrowserCompatible
        : TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired;
      const spend = this.bindSpend(bundle, attribute, disposition);
      if (spend == null) {
        progression.complete(liveSite, TemplateCompilerLiveAttributeDisposition.Open);
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.AccountingMismatch,
          element,
          attribute,
          bundle,
          successor,
          'Attribute bundle conflicted with the site ledger.',
        );
        break;
      }
      if (!compatible) {
        progression.complete(liveSite, TemplateCompilerLiveAttributeDisposition.Open);
        this.events.push(new TemplateCompilerSiteCursorAttributeEvent(
          siteCursorConstructionAuthority,
          this.transcriptOrdinal++,
          element,
          attribute,
          liveSite.originalForestOrdinal,
          liveSite.simulatedLiveOrdinal,
          scalar,
          originState,
          bundle,
          spend,
          null,
          TemplateCompilerSiteCursorNormalizedOutcome.ReloweringRequired,
          bundle.ownerProgressionSite,
          liveSite,
        ));
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.AtLiveAttributeRelowering,
          element,
          attribute,
          bundle,
          successor,
          'Live attribute scalar, owner, name, namespace, order, or progression diverges from authored precedent.',
        );
        break;
      }

      const normalizedOutcome = this.semantics.normalizedAttributeOutcome(bundle);
      const liveDisposition = liveDispositionFor(bundle.ownerProgressionSite.disposition);
      progression.complete(liveSite, liveDisposition);
      this.events.push(new TemplateCompilerSiteCursorAttributeEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        element,
        attribute,
        liveSite.originalForestOrdinal,
        liveSite.simulatedLiveOrdinal,
        scalar,
        originState,
        bundle,
        spend,
        null,
        normalizedOutcome,
        bundle.ownerProgressionSite,
        liveSite,
      ));
      if (normalizedOutcome !== TemplateCompilerSiteCursorNormalizedOutcome.Complete) {
        this.stop(
          normalizedOutcome === TemplateCompilerSiteCursorNormalizedOutcome.Invalid
            ? TemplateCompilerSiteCursorFrontierKind.ReachedNormalizedInvalid
            : TemplateCompilerSiteCursorFrontierKind.ReachedNormalizedOpen,
          element,
          attribute,
          bundle,
          successor,
          normalizedOutcome === TemplateCompilerSiteCursorNormalizedOutcome.Invalid
            ? 'Reached normalized attribute semantics retain an exact invalid outcome.'
            : 'Reached normalized attribute semantics remain open.',
        );
        break;
      }
      hasTemplateController ||= bundle.classification.classificationKind
        === AttributeClassificationKind.TemplateController;
      hasUsageContainerless ||= bundle.syntax.runtimeRawName === 'containerless';
    }
    progression.finish();
    if (this.frontier != null) return null;

    if (hasTemplateController) {
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeTemplateController,
        element,
        null,
        null,
        successor,
        'Template-controller wrapping changes the following structural context and target order.',
      );
      return null;
    }
    if (this.semantics.hasProjectionEffect(element, elementDefinition)) {
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection,
        element,
        null,
        null,
        successor,
        'Projection extraction changes child ownership before ordinary traversal.',
      );
      return null;
    }
    if (elementDefinition != null && (elementDefinition.containerless === true || hasUsageContainerless)) {
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeContainerless,
        element,
        null,
        null,
        successor,
        'Containerless replacement changes child reachability and following target structure.',
      );
      return null;
    }
    if (element.templateContent != null) {
      this.excludeSubtree(
        element,
        element.templateContent,
        TemplateCompilerSiteSpendDisposition.InertTemplateContent,
        [element.templateContent],
      );
      return null;
    }
    return element.readChildren().length === 0
      ? null
      : { parent: element, children: element.readChildren(), nextOrdinal: 0 };
  }

  private visitText(
    text: TemplateCompilerTextOccurrence,
    parent: TemplateCompilerParentOccurrence,
    parentOrdinal: number,
    successor: TemplateCompilerNodeOccurrence | null,
  ): void {
    const originState = this.semantics.originState(text);
    const route = this.semantics.originRoute(text);
    const bundle = route?.routeKind === TemplateCompilerBrowserOriginRouteKind.Singular
      ? this.binding.index.siteForText(route.exactOrigin!.authored.productHandle)
      : null;
    if (text.generation != null || originState === TemplateCompilerPreWalkBrowserOriginState.Absent) {
      const row = this.recordOccurrenceOnly(text, TemplateCompilerOccurrenceOnlyDisposition.GeneratedSiteNeedsLowering);
      this.events.push(new TemplateCompilerSiteCursorTextEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        text,
        parent,
        parentOrdinal,
        successor,
        originState,
        null,
        null,
        row,
        TemplateCompilerSiteCursorNormalizedOutcome.ReloweringRequired,
      ));
      this.stop(
        row == null
          ? TemplateCompilerSiteCursorFrontierKind.AccountingMismatch
          : TemplateCompilerSiteCursorFrontierKind.GeneratedSiteNeedsLowering,
        text,
        null,
        null,
        successor,
        'Generated text requires live interpolation selection and lowering.',
      );
      return;
    }
    if (originState === TemplateCompilerPreWalkBrowserOriginState.NonSingular) {
      const row = this.recordOccurrenceOnly(text, TemplateCompilerOccurrenceOnlyDisposition.NonSingularBrowserOrigin);
      this.events.push(new TemplateCompilerSiteCursorTextEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        text,
        parent,
        parentOrdinal,
        successor,
        originState,
        null,
        null,
        row,
        TemplateCompilerSiteCursorNormalizedOutcome.ReloweringRequired,
      ));
      this.stop(
        row == null
          ? TemplateCompilerSiteCursorFrontierKind.AccountingMismatch
          : TemplateCompilerSiteCursorFrontierKind.NonSingularBrowserOrigin,
        text,
        null,
        null,
        successor,
        'Text has no singular closed authored/browser origin.',
      );
      return;
    }
    if (originState !== TemplateCompilerPreWalkBrowserOriginState.Singular) {
      this.events.push(new TemplateCompilerSiteCursorTextEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        text,
        parent,
        parentOrdinal,
        successor,
        originState,
        null,
        null,
        null,
        TemplateCompilerSiteCursorNormalizedOutcome.ReloweringRequired,
      ));
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.AuthoredPrecedentMismatch,
        text,
        null,
        null,
        successor,
        'Text authored/browser correspondence remains open or unavailable.',
      );
      return;
    }
    if (bundle == null) {
      const authoredText = route?.exactOrigin == null
        ? null
        : this.binding.index.textForProduct(route.exactOrigin.authored.productHandle);
      if (authoredText == null || authoredText.text !== text.text) {
        this.events.push(new TemplateCompilerSiteCursorTextEvent(
          siteCursorConstructionAuthority,
          this.transcriptOrdinal++,
          text,
          parent,
          parentOrdinal,
          successor,
          originState,
          null,
          null,
          null,
          TemplateCompilerSiteCursorNormalizedOutcome.ReloweringRequired,
        ));
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.TextReloweringRequired,
          text,
          null,
          null,
          successor,
          'Static browser text does not match one exact authored text product.',
        );
        return;
      }
      const row = this.recordOccurrenceOnly(text, TemplateCompilerOccurrenceOnlyDisposition.StaticTextPassThrough);
      if (row == null) {
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.AccountingMismatch,
          text,
          null,
          null,
          successor,
          'Static-text accounting conflicted with the site ledger.',
        );
        return;
      }
      this.events.push(new TemplateCompilerSiteCursorTextEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        text,
        parent,
        parentOrdinal,
        successor,
        originState,
        null,
        null,
        row,
        TemplateCompilerSiteCursorNormalizedOutcome.NotApplicable,
      ));
      return;
    }
    const compatible = text.text === bundle.text.text
      && bundle.valueSite.rawValue === bundle.text.text
      && bundle.valueSite.siteKind === TemplateValueSiteKind.TextInterpolation
      && bundle.valueSite.entryFamily === 'Interpolation'
      && bundle.valueSite.syntax == null
      && bundle.valueSite.classification == null
      && bundle.valueSite.attribute == null
      && bundle.expressionParse.site.productHandle === bundle.valueSite.productHandle;
    const spend = this.bindSpend(
      bundle,
      text,
      compatible
        ? TemplateCompilerSiteSpendDisposition.BrowserCompatible
        : TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired,
    );
    const normalizedOutcome = !compatible
      ? TemplateCompilerSiteCursorNormalizedOutcome.ReloweringRequired
      : bundle.expressionParse.state === TemplateExpressionParseState.Error
        ? TemplateCompilerSiteCursorNormalizedOutcome.Invalid
        : bundle.expressionParse.state === TemplateExpressionParseState.Complete
          ? TemplateCompilerSiteCursorNormalizedOutcome.Complete
          : TemplateCompilerSiteCursorNormalizedOutcome.Open;
    this.events.push(new TemplateCompilerSiteCursorTextEvent(
      siteCursorConstructionAuthority,
      this.transcriptOrdinal++,
      text,
      parent,
      parentOrdinal,
      successor,
      originState,
      bundle,
      spend,
      null,
      normalizedOutcome,
    ));
    if (spend == null) {
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.AccountingMismatch,
        text,
        null,
        bundle,
        successor,
        'Text bundle conflicted with the site ledger.',
      );
    } else if (!compatible) {
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.TextReloweringRequired,
        text,
        null,
        bundle,
        successor,
        'Browser-effective text scalar differs from authored interpolation precedent.',
      );
    } else if (normalizedOutcome !== TemplateCompilerSiteCursorNormalizedOutcome.Complete) {
      this.stop(
        normalizedOutcome === TemplateCompilerSiteCursorNormalizedOutcome.Invalid
          ? TemplateCompilerSiteCursorFrontierKind.ReachedNormalizedInvalid
          : TemplateCompilerSiteCursorFrontierKind.ReachedNormalizedOpen,
        text,
        null,
        bundle,
        successor,
        'Reached text interpolation parse is not Complete.',
      );
    }
  }

  private visitIgnored(
    node: TemplateCompilerCommentOccurrence | TemplateCompilerDoctypeOccurrence,
    parent: TemplateCompilerParentOccurrence,
    parentOrdinal: number,
    successor: TemplateCompilerNodeOccurrence | null,
  ): void {
    if (node.generation != null) {
      const row = this.recordOccurrenceOnly(node, TemplateCompilerOccurrenceOnlyDisposition.GeneratedSiteNeedsLowering);
      if (row != null) {
        this.events.push(new TemplateCompilerSiteCursorIgnoredNodeEvent(
          siteCursorConstructionAuthority,
          this.transcriptOrdinal++,
          node,
          parent,
          parentOrdinal,
          successor,
          row,
        ));
      }
      this.stop(
        row == null
          ? TemplateCompilerSiteCursorFrontierKind.AccountingMismatch
          : TemplateCompilerSiteCursorFrontierKind.GeneratedSiteNeedsLowering,
        node,
        null,
        null,
        successor,
        'Compiler-generated comment or doctype requires generated-site accounting.',
      );
      return;
    }
    const row = this.recordOccurrenceOnly(
      node,
      node instanceof TemplateCompilerCommentOccurrence
        ? TemplateCompilerOccurrenceOnlyDisposition.IgnoredComment
        : TemplateCompilerOccurrenceOnlyDisposition.IgnoredDoctype,
    );
    if (row == null) {
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.AccountingMismatch,
        node,
        null,
        null,
        successor,
        'Ignored-node accounting conflicted with the site ledger.',
      );
      return;
    }
    this.events.push(new TemplateCompilerSiteCursorIgnoredNodeEvent(
      siteCursorConstructionAuthority,
      this.transcriptOrdinal++,
      node,
      parent,
      parentOrdinal,
      successor,
      row,
    ));
    if (node instanceof TemplateCompilerCommentOccurrence && node.text === 'au') {
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.AuthoredCompilerMarkerReserved,
        node,
        null,
        null,
        successor,
        'Authored <!--au--> collides with the compiler-reserved hydration marker spelling.',
      );
    }
  }

  private excludeSubtree(
    owner: TemplateCompilerElementOccurrence,
    root: TemplateCompilerFragmentOccurrence | TemplateCompilerNodeOccurrence,
    disposition:
      | TemplateCompilerSiteSpendDisposition.InertTemplateContent
      | TemplateCompilerSiteSpendDisposition.LetContentSuppressed,
    roots: readonly TemplateCompilerNodeOccurrence[],
  ): void {
    const spends: TemplateCompilerSiteSpend[] = [];
    this.events.push(new TemplateCompilerSiteCursorSubtreeExclusionEvent(
      siteCursorConstructionAuthority,
      this.transcriptOrdinal++,
      owner,
      root,
      disposition,
      spends,
    ));
    const pending = [...roots].reverse();
    while (pending.length > 0) {
      const node = pending.pop()!;
      if (node.generation != null) {
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.GeneratedSiteNeedsLowering,
          node,
          null,
          null,
          null,
          'Excluded subtree contains a generated occurrence without authored bundle authority.',
        );
        break;
      }
      if (node instanceof TemplateCompilerTextOccurrence) {
        const originState = this.semantics.originState(node);
        if (
          originState === TemplateCompilerPreWalkBrowserOriginState.NonSingular
          || originState === TemplateCompilerPreWalkBrowserOriginState.CorrespondenceOpen
          || originState === TemplateCompilerPreWalkBrowserOriginState.Unknown
        ) {
          this.stop(
            originState === TemplateCompilerPreWalkBrowserOriginState.NonSingular
              ? TemplateCompilerSiteCursorFrontierKind.NonSingularBrowserOrigin
              : TemplateCompilerSiteCursorFrontierKind.AuthoredPrecedentMismatch,
            node,
            null,
            null,
            null,
            'Excluded text has no singular closed authored/browser bundle authority.',
          );
          break;
        }
        const bundle = this.semantics.singularTextBundle(node);
        if (bundle != null && this.preWalk.receiptFor(bundle) == null) {
          const spend = this.excludeSpend(bundle, node, disposition);
          if (spend == null) {
            this.stop(
              TemplateCompilerSiteCursorFrontierKind.AccountingMismatch,
              node,
              null,
              bundle,
              null,
              'Excluded text bundle conflicted with the site ledger.',
            );
            break;
          }
          spends.push(spend);
        }
      }
      if (node instanceof TemplateCompilerElementOccurrence) {
        for (const attribute of node.readAttributes()) {
          const originState = this.semantics.originState(attribute);
          if (
            attribute.generation != null
            || originState === TemplateCompilerPreWalkBrowserOriginState.NonSingular
            || originState === TemplateCompilerPreWalkBrowserOriginState.CorrespondenceOpen
            || originState === TemplateCompilerPreWalkBrowserOriginState.Unknown
          ) {
            this.stop(
              attribute.generation != null
                ? TemplateCompilerSiteCursorFrontierKind.GeneratedSiteNeedsLowering
                : originState === TemplateCompilerPreWalkBrowserOriginState.NonSingular
                  ? TemplateCompilerSiteCursorFrontierKind.NonSingularBrowserOrigin
                  : TemplateCompilerSiteCursorFrontierKind.AuthoredPrecedentMismatch,
              node,
              attribute,
              null,
              null,
              'Excluded attribute has no singular closed authored/browser bundle authority.',
            );
            break;
          }
          const bundle = this.semantics.singularAttributeBundle(attribute);
          if (bundle != null && this.preWalk.receiptFor(bundle) == null) {
            const spend = this.excludeSpend(bundle, attribute, disposition);
            if (spend == null) {
              this.stop(
                TemplateCompilerSiteCursorFrontierKind.AccountingMismatch,
                node,
                attribute,
                bundle,
                null,
                'Excluded attribute bundle conflicted with the site ledger.',
              );
              break;
            }
            spends.push(spend);
          }
        }
        if (this.frontier != null) break;
        if (node.templateContent != null) pending.push(node.templateContent);
      }
      for (let index = node.readChildren().length - 1; index >= 0; index--) {
        pending.push(node.readChildren()[index]!);
      }
    }
  }

  private accountProcessContentRemovals(
    result: TemplateCompilerProcessContentResult,
    spends: TemplateCompilerSiteSpend[],
  ): void {
    for (const occurrence of result.removedSiteOccurrences) {
      const originState = this.semantics.originState(occurrence);
      const node = occurrence instanceof TemplateCompilerAttributeOccurrence
        ? occurrence.owner
        : occurrence;
      if (
        occurrence.generation != null
        || originState === TemplateCompilerPreWalkBrowserOriginState.NonSingular
        || originState === TemplateCompilerPreWalkBrowserOriginState.CorrespondenceOpen
        || originState === TemplateCompilerPreWalkBrowserOriginState.Unknown
      ) {
        this.stop(
          occurrence.generation != null
            ? TemplateCompilerSiteCursorFrontierKind.GeneratedSiteNeedsLowering
            : originState === TemplateCompilerPreWalkBrowserOriginState.NonSingular
              ? TemplateCompilerSiteCursorFrontierKind.NonSingularBrowserOrigin
              : TemplateCompilerSiteCursorFrontierKind.AuthoredPrecedentMismatch,
          node,
          occurrence instanceof TemplateCompilerAttributeOccurrence ? occurrence : null,
          null,
          null,
          'processContent removed a site without singular closed authored/browser bundle authority.',
        );
        break;
      }
      const bundle = occurrence instanceof TemplateCompilerAttributeOccurrence
        ? this.semantics.singularAttributeBundle(occurrence)
        : this.semantics.singularTextBundle(occurrence);
      if (bundle == null || this.preWalk.receiptFor(bundle) != null) continue;
      const attempt = this.ledger.excludeProcessContentRemoved(bundle, occurrence, result);
      if (attempt instanceof TemplateCompilerSiteSpendConflict) {
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.AccountingMismatch,
          node,
          occurrence instanceof TemplateCompilerAttributeOccurrence ? occurrence : null,
          bundle,
          null,
          'processContent removal bundle conflicted with the site ledger.',
        );
        break;
      }
      spends.push(attempt);
    }
  }

  private validateSurrogate(): void {
    const carrier = this.binding.forest.compilerCarrier;
    const attributes = carrier.readAttributes();
    this.phaseKind = TemplateCompilerSiteCursorPhaseKind.SurrogateValidationStart;
    this.phase(TemplateCompilerSiteCursorPhaseKind.SurrogateValidationStart);
    for (const [ordinal, attribute] of attributes.entries()) {
      const scalar = this.semantics.captureReachedAttributeScalar(
        carrier,
        attribute,
        ordinal,
      );
      const parsed = this.compilerReads.readParsedAttribute(scalar.qualifiedName, scalar.currentValue);
      const current = scalar.isExact()
        && parsed.observation.validate().isCurrent
        && parsed.observation.closure.state === TemplateCompilerScopeClosureState.Closed;
      const invalid = current && invalidSurrogateTarget(parsed.value.execution.target);
      const outcome = !current || parsed.value.execution.syntaxKind === AttributeSyntaxKind.Open
        ? TemplateCompilerSiteCursorSurrogateValidationOutcome.Open
        : invalid
          ? TemplateCompilerSiteCursorSurrogateValidationOutcome.Refused
          : TemplateCompilerSiteCursorSurrogateValidationOutcome.Valid;
      this.events.push(new TemplateCompilerSiteCursorSurrogateValidationEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        carrier,
        attribute,
        ordinal,
        scalar,
        parsed,
        outcome,
      ));
      if (outcome === TemplateCompilerSiteCursorSurrogateValidationOutcome.Open) {
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.SurrogateValidationOpen,
          carrier,
          attribute,
          this.semantics.singularAttributeBundle(attribute),
          null,
          'Surrogate validation parser or scalar authority remains open.',
        );
        return;
      }
      if (outcome === TemplateCompilerSiteCursorSurrogateValidationOutcome.Refused) {
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.InvalidSurrogateAttribute,
          carrier,
          attribute,
          this.semantics.singularAttributeBundle(attribute),
          null,
          `Surrogate attribute '${scalar.qualifiedName}' targets invalid '${parsed.value.execution.target}'.`,
        );
        return;
      }
    }
    this.phaseKind = TemplateCompilerSiteCursorPhaseKind.SurrogateValidationEnd;
    this.phase(TemplateCompilerSiteCursorPhaseKind.SurrogateValidationEnd);
    if (attributes.length > 0) {
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.SurrogateClassificationRequired,
        carrier,
        null,
        null,
        null,
        'Non-empty surrogate requires its dedicated progressive classification and output grouping lane.',
      );
      return;
    }
    this.phaseKind = TemplateCompilerSiteCursorPhaseKind.SurrogateEnd;
    this.phase(TemplateCompilerSiteCursorPhaseKind.SurrogateEnd);
  }

  private bindSpend(
    bundle: TemplateCompilerNormalizedSiteBundle,
    occurrence: TemplateCompilerAttributeOccurrence | TemplateCompilerTextOccurrence,
    disposition:
      | TemplateCompilerSiteSpendDisposition.BrowserCompatible
      | TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired,
  ): TemplateCompilerSiteSpend | null {
    const result = this.ledger.bind(bundle, occurrence, disposition, this.ledger.nextSiteEventOrdinal);
    return result instanceof TemplateCompilerSiteSpendConflict ? null : result;
  }

  private excludeSpend(
    bundle: TemplateCompilerNormalizedSiteBundle,
    occurrence: TemplateCompilerAttributeOccurrence | TemplateCompilerTextOccurrence,
    disposition:
      | TemplateCompilerSiteSpendDisposition.InertTemplateContent
      | TemplateCompilerSiteSpendDisposition.LetContentSuppressed,
  ): TemplateCompilerSiteSpend | null {
    const result = this.ledger.exclude(bundle, occurrence, disposition);
    return result instanceof TemplateCompilerSiteSpendConflict ? null : result;
  }

  private recordOccurrenceOnly(
    occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
    disposition: TemplateCompilerOccurrenceOnlyDisposition,
  ): TemplateCompilerOccurrenceOnlyRow | null {
    const result = this.ledger.recordOccurrenceOnly(
      occurrence,
      disposition,
      this.ledger.nextSiteEventOrdinal,
    );
    return result instanceof TemplateCompilerSiteSpendConflict ? null : result;
  }

  private phase(phaseKind: TemplateCompilerSiteCursorPhaseKind): void {
    this.events.push(new TemplateCompilerSiteCursorPhaseEvent(
      siteCursorConstructionAuthority,
      this.transcriptOrdinal++,
      phaseKind,
    ));
  }

  private stop(
    frontierKind: TemplateCompilerSiteCursorFrontierKind,
    node: TemplateCompilerNodeOccurrence | null,
    attribute: TemplateCompilerAttributeOccurrence | null,
    bundle: TemplateCompilerNormalizedSiteBundle | null,
    capturedSuccessor: TemplateCompilerNodeOccurrence | null,
    summary: string,
  ): void {
    if (this.frontier != null) return;
    const frontier = new TemplateCompilerSiteCursorFrontier(
      siteCursorConstructionAuthority,
      this.transcriptOrdinal++,
      this.phaseKind,
      frontierKind,
      node,
      attribute,
      bundle,
      capturedSuccessor,
      this.ledger.nextSiteEventOrdinal,
      this.binding.forest.mutationRevision,
      this.binding.execution.sequence.readOperations().length,
      summary,
    );
    this.frontier = frontier;
    this.events.push(frontier);
  }

  private ensureCurrentness(): void {
    const expectedForestMutationRevision = this.siteDriver?.expectedForestMutationRevision
      ?? this.startForestMutationRevision;
    const expectedGlobalOperationCount = this.siteDriver?.expectedGlobalOperationCount
      ?? this.startGlobalOperationCount;
    if (
      this.binding.forest.mutationRevision !== expectedForestMutationRevision
      || this.binding.execution.sequence.readOperations().length !== expectedGlobalOperationCount
    ) {
      if (this.frontier != null) {
        if (this.events[this.events.length - 1] !== this.frontier) {
          throw new Error('Compiler cursor currentness cannot replace a nonterminal frontier event.');
        }
        this.events.pop();
        this.transcriptOrdinal--;
      }
      const frontier = new TemplateCompilerSiteCursorFrontier(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        this.phaseKind,
        TemplateCompilerSiteCursorFrontierKind.CurrentnessLost,
        null,
        null,
        null,
        null,
        this.ledger.nextSiteEventOrdinal,
        this.binding.forest.mutationRevision,
        this.binding.execution.sequence.readOperations().length,
        'Compiler forest or operation frontier diverged from cursor-owned execution currentness.',
      );
      this.frontier = frontier;
      this.events.push(frontier);
    }
  }
}

function liveDispositionFor(
  disposition: TemplateCompilerAttributeOwnerProgressionDisposition | null,
): TemplateCompilerLiveAttributeDisposition {
  switch (disposition) {
    case TemplateCompilerAttributeOwnerProgressionDisposition.Retained:
      return TemplateCompilerLiveAttributeDisposition.Retained;
    case TemplateCompilerAttributeOwnerProgressionDisposition.Removed:
      return TemplateCompilerLiveAttributeDisposition.Removed;
    case TemplateCompilerAttributeOwnerProgressionDisposition.Open:
    case null:
      return TemplateCompilerLiveAttributeDisposition.Open;
  }
}

function invalidSurrogateTarget(target: string): boolean {
  return target === 'id'
    || target === 'name'
    || target === 'au-slot'
    || target === 'as-element';
}
