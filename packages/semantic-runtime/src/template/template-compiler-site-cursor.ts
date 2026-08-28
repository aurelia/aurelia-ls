import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import { ExpressionParseResultKind, type ExpressionParseResult } from '../expression/parse-result-algebra.js';
import type { SourceSpan } from '../expression/source-span.js';
import {
  AttributeSyntaxKind,
} from './attribute-syntax.js';
import {
  TemplateCompilerScopeClosureState,
} from './compiler-read-view.js';
import type {
  TemplateCompilerObservedValue,
  TemplateCompilerReadObservation,
  TemplateCompilerReadView,
} from './compiler-read-view.js';
import type { TemplateResolvedResource } from './compiler-world.js';
import {
  assembleTemplateCompilerLiveAttributeOwner,
  TemplateCompilerLiveAttributeCompletion,
  TemplateCompilerLiveAttributeOpenReasonKind,
  TemplateCompilerLiveAttributeSourceKind,
  type TemplateCompilerLiveAttributeContribution,
  type TemplateCompilerLiveAttributeOwnerResult,
} from './template-compiler-live-attribute-assembly.js';
import { TemplateCompilerElementInstructionStagingState } from './template-compiler-instruction-staging.js';
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
import {
  TemplateInstructionKind,
  type TemplateInstruction,
  type TextBindingInstruction,
} from './instruction-ir.js';
import type {
  TemplateCompilerSiteExecutionDriverReference,
  TemplateCompilerSiteExecutionEndpointReceipt,
} from './template-compiler-execution.js';
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
import { TemplateCompilerNativeSlotDecisionKind } from './native-slot-compiler-semantics.js';
import {
  TemplateCompilerBrowserOriginRouteKind,
} from './template-compiler-authored-origin-index.js';
import type { TemplateCompilerNormalizedTextSite } from './template-compiler-normalized-site-index.js';
import { TemplateExpressionParseState, TemplateValueSiteKind } from './value-site.js';
import {
  TemplateCompilerSiteCursorAttributeEvent,
  TemplateCompilerSiteCursorContainerlessPlacementEvent,
  TemplateCompilerSiteCursorElementEvent,
  type TemplateCompilerSiteCursorEvent,
  TemplateCompilerSiteCursorFrontier,
  TemplateCompilerSiteCursorFrontierKind,
  TemplateCompilerSiteCursorIgnoredNodeEvent,
  TemplateCompilerSiteCursorSiteOutcome,
  TemplateCompilerSiteCursorPhaseEvent,
  TemplateCompilerSiteCursorPhaseKind,
  TemplateCompilerSiteCursorProcessContentEvent,
  TemplateCompilerSiteCursorSubtreeExclusionEvent,
  TemplateCompilerSiteCursorSurrogateValidationEvent,
  TemplateCompilerSiteCursorSurrogateValidationOutcome,
  TemplateCompilerSiteCursorTextEvent,
} from './template-compiler-site-cursor-event.js';

export * from './template-compiler-site-cursor-event.js';
export * from './template-compiler-site-cursor-task.js';
import {
  TemplateCompilerSiteCursorSemanticResolver,
} from './template-compiler-site-cursor-semantics.js';
import {
  TemplateCompilerTextHoleSourceRange,
  TemplateCompilerTextInstructionAllocation,
  type TemplateCompilerTextInstructionAllocationRequest,
  type TemplateCompilerTextInstructionStaging,
  type TemplateCompilerTextInstructionStagingAuthority,
  TemplateCompilerTextInstructionStagingRequest,
  stageTemplateCompilerTextInstructions,
} from './template-compiler-text-instruction-staging.js';
import {
  TemplateCompilerHydrateElementProcessContentState,
  TemplateCompilerHydrateElementProjectionState,
  TemplateCompilerHydrateElementStagingState,
  type TemplateCompilerHydrateElementStagingResult,
  stageTemplateCompilerHydrateElementEnvelope,
} from './template-compiler-hydrate-element-staging.js';
import {
  TemplateCompilerLiveAllocationNamespace,
  TemplateCompilerLiveSourceAllocationRole,
  type TemplateCompilerLiveAllocationLedger,
  type TemplateCompilerLiveAllocationSnapshot,
} from './template-compiler-live-allocation.js';
import {
  TemplateCompilerRootCompilationAccumulator,
  type TemplateCompilerRootCompilationState,
} from './template-compiler-root-state.js';
import {
  completeTemplateCompilerOrdinaryRoot,
  type TemplateCompilerOrdinaryRootCompletionResult,
} from './template-compiler-root-completion.js';
import {
  TemplateCompilerSiteCursorTaskSession,
  type TemplateCompilerSiteCursorTaskSessionSnapshot,
} from './template-compiler-site-cursor-task.js';

const siteCursorConstructionAuthority = {};

export const enum TemplateCompilerSiteCursorAdmissionReasonKind {
  ForeignBinding = 'foreign-binding',
  ForeignPreWalkAuthority = 'foreign-pre-walk-authority',
  CompilerReadWorldMismatch = 'compiler-read-world-mismatch',
  BrowserPublicationUnavailable = 'browser-publication-unavailable',
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
    readonly taskSnapshot: TemplateCompilerSiteCursorTaskSessionSnapshot,
    readonly attributeOwners: readonly TemplateCompilerLiveAttributeOwnerResult[],
    readonly hydrateElementEnvelopes: readonly TemplateCompilerHydrateElementStagingResult[],
    readonly rootState: TemplateCompilerRootCompilationState,
    readonly allocationSnapshot: TemplateCompilerLiveAllocationSnapshot,
    readonly ledger: TemplateCompilerSiteSpendLedgerResult,
    readonly frontier: TemplateCompilerSiteCursorFrontier | null,
    readonly startForestMutationRevision: number,
    readonly endForestMutationRevision: number,
    readonly startGlobalOperationCount: number,
    readonly endGlobalOperationCount: number,
    readonly startLaneOperationCount: number,
    readonly endLaneOperationCount: number,
    readonly expectedEndForestMutationRevision: number,
    readonly expectedEndGlobalOperationCount: number,
    readonly expectedEndLaneOperationCount: number,
    readonly nextTranscriptOrdinal: number,
    readonly nextSiteEventOrdinal: number,
  ) {
    const expectedFrontierKind = frontier?.frontierKind ?? null;
    const frontierIsCurrentnessLoss = frontier?.frontierKind
      === TemplateCompilerSiteCursorFrontierKind.CurrentnessLost;
    const currentnessActuallyChanged = expectedEndForestMutationRevision !== endForestMutationRevision
      || expectedEndGlobalOperationCount !== endGlobalOperationCount
      || expectedEndLaneOperationCount !== endLaneOperationCount;
    if (
      authority !== siteCursorConstructionAuthority
      || !binding.isModuleConstructed()
      || preWalkAuthority.binding !== binding
      || preWalkAuthority.index !== binding.index
      || compilerReads.world !== binding.compilerWorld
      || !taskSnapshot.isModuleConstructed()
      || taskSnapshot.rootContext.localKey !== `${binding.lane.localKey}:cursor-context:root`
      || taskSnapshot.frontier !== frontier
      || !sameObjects(taskSnapshot.events, events)
      || events.some((event) => taskSnapshot.contextForEvent(event) !== taskSnapshot.rootContext)
      || events.some((event, ordinal) =>
        !event.isOwnedBy(siteCursorConstructionAuthority)
        || event.ordinal !== ordinal
        || (event instanceof TemplateCompilerSiteCursorProcessContentEvent && !event.isCoherent())
        || (event instanceof TemplateCompilerSiteCursorAttributeEvent && !event.isCoherent())
        || (event instanceof TemplateCompilerSiteCursorTextEvent && !event.isCoherent())
      )
      || !liveAttributeOwnersAreCoherent(binding, events, attributeOwners)
      || !hydrateElementEnvelopesAreCoherent(
        binding,
        compilerReads,
        events,
        attributeOwners,
        hydrateElementEnvelopes,
      )
      || !rootStateIsCoherent(binding, events, rootState)
      || !allocationSnapshot.isModuleConstructed()
      || allocationSnapshot.ledger.rootSiteKey !== binding.lane.localKey
      || allocationSnapshot.ledger.namespace.authority !== binding.browserEmission.publication
      || !liveAllocationSnapshotIsCoherent(events, attributeOwners, allocationSnapshot)
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
    readonly siteEndpoint: TemplateCompilerSiteExecutionEndpointReceipt | null,
    readonly completion: TemplateCompilerOrdinaryRootCompletionResult | null,
  ) {
    this.state = transcript == null
      ? TemplateCompilerSiteCursorResultState.Mismatch
      : TemplateCompilerSiteCursorResultState.Transcript;
    if ((transcript == null) !== (completion == null) || (transcript == null && siteEndpoint != null)) {
      throw new Error('Template compiler cursor result lost transcript, endpoint, or completion ownership.');
    }
  }
}

export interface TemplateCompilerRootSiteCursorRequest {
  readonly binding: TemplateCompilerSiteInvocationBinding;
  readonly compilerReads: TemplateCompilerReadView;
  readonly preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority;
}

interface TemplateCompilerSiteCursorChildFrame {
  readonly parent: TemplateCompilerParentOccurrence;
  readonly children: readonly TemplateCompilerNodeOccurrence[];
}

/**
 * Execute one product-free no-local root prefix without admitting a target plan.
 * Forest mutation is admitted only through exact cursor-owned built-in site operations.
 */
export function executeTemplateCompilerRootSiteCursor(
  request: TemplateCompilerRootSiteCursorRequest,
): TemplateCompilerSiteCursorResult {
  const reasons = cursorAdmissionReasons(request);
  if (reasons.length > 0) return new TemplateCompilerSiteCursorResult(null, reasons, null, null);
  const transcript = new TemplateCompilerRootSiteCursor(request).execute();
  const siteEndpoint = transcript.frontier?.frontierKind === TemplateCompilerSiteCursorFrontierKind.CurrentnessLost
    ? null
    : request.binding.execution.captureSiteExecutionEndpoint(request.binding.bootstrapClosure);
  return new TemplateCompilerSiteCursorResult(
    transcript,
    [],
    siteEndpoint,
    completeTemplateCompilerOrdinaryRoot(transcript, siteEndpoint),
  );
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
  if (!binding.browserEmission.publication.isCurrent()) {
    reasons.push(new TemplateCompilerSiteCursorAdmissionReason(
      TemplateCompilerSiteCursorAdmissionReasonKind.BrowserPublicationUnavailable,
      'Root cursor browser-effective publication authority is no longer current.',
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
  private readonly taskSession: TemplateCompilerSiteCursorTaskSession;
  private readonly attributeOwners: TemplateCompilerLiveAttributeOwnerResult[] = [];
  private readonly hydrateElementEnvelopes: TemplateCompilerHydrateElementStagingResult[] = [];
  private readonly rootState: TemplateCompilerRootCompilationAccumulator;
  private readonly allocations: TemplateCompilerLiveAllocationLedger;
  private readonly allocationNamespace: TemplateCompilerLiveAllocationNamespace;
  private readonly startForestMutationRevision: number;
  private readonly startGlobalOperationCount: number;
  private readonly startLaneOperationCount: number;
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
    this.startLaneOperationCount = this.binding.execution.sequence.readLaneOperations(this.binding.lane).length;
    this.rootState = new TemplateCompilerRootCompilationAccumulator(this.binding.definition);
    this.allocationNamespace = new TemplateCompilerLiveAllocationNamespace(this.binding.browserEmission.publication);
    this.allocations = this.allocationNamespace.beginPhase(this.binding.lane.localKey);
    this.taskSession = TemplateCompilerSiteCursorTaskSession.createRoot(this.binding.lane.localKey);
    this.semantics = new TemplateCompilerSiteCursorSemanticResolver(
      this.binding,
      this.compilerReads,
      this.preWalk,
    );
  }

  execute(): TemplateCompilerSiteCursorTranscript {
    const root = this.binding.forest.compilerContent;
    this.taskSession.startRoot(root, root.readChildren());
    this.primePreWalkRemainders();
    if (this.frontier == null) this.walkContent();
    if (this.frontier == null) this.validateSurrogate();
    this.ensureCurrentness();
    const taskSnapshot = this.taskSession.finish(this.frontier);
    const events = taskSnapshot.events;

    const completion = this.frontier == null
      ? TemplateCompilerSiteSpendCompletion.complete(this.ledger.nextSiteEventOrdinal)
      : TemplateCompilerSiteSpendCompletion.blocked(
          this.frontier.frontierKind,
          this.ledger.nextSiteEventOrdinal,
        );
    const ledger = this.ledger.finish(completion);
    const endForestMutationRevision = this.binding.forest.mutationRevision;
    const endGlobalOperationCount = this.binding.execution.sequence.readOperations().length;
    const endLaneOperationCount = this.binding.execution.sequence.readLaneOperations(this.binding.lane).length;
    const expectedEndForestMutationRevision = this.siteDriver?.expectedForestMutationRevision
      ?? this.startForestMutationRevision;
    const expectedEndGlobalOperationCount = this.siteDriver?.expectedGlobalOperationCount
      ?? this.startGlobalOperationCount;
    const expectedEndLaneOperationCount = this.siteDriver?.expectedLaneOperationCount
      ?? this.startLaneOperationCount;
    const transcript = new TemplateCompilerSiteCursorTranscript(
      siteCursorConstructionAuthority,
      this.binding,
      this.compilerReads,
      this.preWalk,
      events,
      taskSnapshot,
      this.attributeOwners,
      this.hydrateElementEnvelopes,
      this.rootState.finish(),
      this.allocations.finish(),
      ledger,
      this.frontier,
      this.startForestMutationRevision,
      endForestMutationRevision,
      this.startGlobalOperationCount,
      endGlobalOperationCount,
      this.startLaneOperationCount,
      endLaneOperationCount,
      expectedEndForestMutationRevision,
      expectedEndGlobalOperationCount,
      expectedEndLaneOperationCount,
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
    this.appendEvent(new TemplateCompilerSiteCursorPhaseEvent(
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
    while (this.frontier == null) {
      const visit = this.taskSession.nextRootVisit();
      if (visit == null) break;
      const childFrame = this.visitNode(
        visit.node,
        visit.parent,
        visit.parentOrdinal,
        visit.capturedSuccessor,
      );
      if (childFrame != null) this.taskSession.pushRootFrame(childFrame.parent, childFrame.children);
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
  ): TemplateCompilerSiteCursorChildFrame | null {
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
      return { parent: node, children: node.readChildren() };
    }
    return null;
  }

  private visitElement(
    element: TemplateCompilerElementOccurrence,
    parent: TemplateCompilerParentOccurrence,
    parentOrdinal: number,
    successor: TemplateCompilerNodeOccurrence | null,
  ): TemplateCompilerSiteCursorChildFrame | null {
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
      this.appendEvent(new TemplateCompilerSiteCursorElementEvent(
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
      if (elementOccurrenceRow == null) {
        this.appendEvent(new TemplateCompilerSiteCursorElementEvent(
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
          'Non-singular element accounting conflicted with the site ledger.',
        );
        return null;
      }
    }
    if (originState === TemplateCompilerPreWalkBrowserOriginState.CorrespondenceOpen) {
      elementOccurrenceRow = this.recordOccurrenceOnly(
        element,
        TemplateCompilerOccurrenceOnlyDisposition.LiveElementAssembled,
      );
      if (elementOccurrenceRow == null) {
        this.appendEvent(new TemplateCompilerSiteCursorElementEvent(
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
          'Correspondence-open element accounting conflicted with the site ledger.',
        );
        return null;
      }
    }
    if (originState === TemplateCompilerPreWalkBrowserOriginState.Unknown) {
      this.appendEvent(new TemplateCompilerSiteCursorElementEvent(
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
        'Element authored/browser correspondence is unavailable.',
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
        this.appendEvent(new TemplateCompilerSiteCursorElementEvent(
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
    } else if (
      originState === TemplateCompilerPreWalkBrowserOriginState.Singular
      && authoredElement == null
    ) {
      this.appendEvent(new TemplateCompilerSiteCursorElementEvent(
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
      this.appendEvent(new TemplateCompilerSiteCursorElementEvent(
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
      this.appendEvent(new TemplateCompilerSiteCursorElementEvent(
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
    this.appendEvent(new TemplateCompilerSiteCursorElementEvent(
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
    const nativeSlot = this.rootState.reachElement(element, lookupName);
    if (nativeSlot.decisionKind !== TemplateCompilerNativeSlotDecisionKind.NotApplicable) {
      if (nativeSlot.decisionKind === TemplateCompilerNativeSlotDecisionKind.Open) {
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.NativeSlotRootOpen,
          element,
          asElement?.attribute ?? null,
          null,
          successor,
          'Reached native slot has no exact root custom-element definition.',
        );
        return null;
      }
      if (nativeSlot.decisionKind === TemplateCompilerNativeSlotDecisionKind.Invalid) {
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.NativeSlotWithoutShadowDomInvalid,
          element,
          asElement?.attribute ?? null,
          null,
          successor,
          `Native <slot> requires Shadow DOM on root custom element '${this.binding.definition.name}'.`,
        );
        return null;
      }
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
      this.appendEvent(new TemplateCompilerSiteCursorProcessContentEvent(
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
      elementRead,
      lookupName,
      parent,
      parentOrdinal,
      successor,
      processContent,
    );
  }

  private visitElementAttributesAndChildren(
    element: TemplateCompilerElementOccurrence,
    authoredElement: HtmlElement | null,
    elementDefinition: CustomElementDefinition | null,
    elementRead: TemplateCompilerObservedValue<TemplateResolvedResource | null>,
    lookupName: string,
    parent: TemplateCompilerParentOccurrence,
    parentOrdinal: number,
    successor: TemplateCompilerNodeOccurrence | null,
    processContent: TemplateCompilerProcessContentResult | null,
  ): TemplateCompilerSiteCursorChildFrame | null {
    const assembly = assembleTemplateCompilerLiveAttributeOwner({
      localKey: `${this.binding.lane.localKey}:live-attributes:${element.occurrenceKey}`,
      execution: this.binding.execution,
      bootstrapClosure: this.binding.bootstrapClosure,
      siteDriver: this.siteDriver,
      compilerReads: this.compilerReads,
      preWalk: this.preWalk,
      element,
      lookupName,
      allocations: this.allocations,
    });
    this.attributeOwners.push(assembly);
    const receipts = new Map(assembly.contributions.map((contribution) => [
      contribution.frame.attribute,
      contribution.frame.scalar,
    ]));
    const relation = this.semantics.elementOwnerRelation(element, authoredElement, receipts);

    for (const contribution of assembly.contributions) {
      const frame = contribution.frame;
      const attribute = frame.attribute;
      const bundle = this.semantics.singularAttributeBundle(attribute);
      let spend: TemplateCompilerSiteSpend | null = null;
      let row: TemplateCompilerOccurrenceOnlyRow | null = null;
      if (bundle != null) {
        const compatible = this.semantics.attributeIsCompatible(
          element,
          authoredElement,
          bundle,
          attribute,
          frame.scalar,
          frame.liveSite,
          relation,
        );
        spend = this.bindSpend(
          bundle,
          attribute,
          compatible
            ? TemplateCompilerSiteSpendDisposition.BrowserCompatible
            : TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired,
        );
      } else {
        row = this.recordOccurrenceOnly(
          attribute,
          contribution.frame.source.sourceKind === TemplateCompilerLiveAttributeSourceKind.AuthoredNonSingular
            ? TemplateCompilerOccurrenceOnlyDisposition.NonSingularBrowserOrigin
            : TemplateCompilerOccurrenceOnlyDisposition.LiveAttributeAssembled,
        );
      }
      if ((bundle != null && spend == null) || (bundle == null && row == null)) {
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.AccountingMismatch,
          element,
          attribute,
          bundle,
          successor,
          'Live attribute contribution conflicted with the site ledger.',
        );
        break;
      }

      const outcome = liveAttributeOutcome(contribution);
      this.appendEvent(new TemplateCompilerSiteCursorAttributeEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        element,
        attribute,
        frame.liveSite.originalForestOrdinal,
        frame.liveSite.simulatedLiveOrdinal,
        frame.scalar,
        frame.source.originState,
        bundle,
        spend,
        row,
        outcome,
        bundle?.ownerProgressionSite ?? null,
        frame.liveSite,
        contribution,
      ));
      if (contribution.completion !== TemplateCompilerLiveAttributeCompletion.Complete) {
        this.stop(
          liveAttributeFrontier(contribution),
          element,
          attribute,
          bundle,
          successor,
          contribution.reason?.summary ?? 'Reached live attribute semantics did not complete.',
        );
        break;
      }
    }
    if (this.frontier != null) return null;
    if (assembly.completion !== TemplateCompilerLiveAttributeCompletion.Complete) {
      this.stop(
        TemplateCompilerSiteCursorFrontierKind.ReachedLiveAttributeOpen,
        element,
        null,
        null,
        successor,
        assembly.reason?.summary ?? 'Live attribute owner assembly remained open.',
      );
      return null;
    }

    const resolveResourcesRead = elementDefinition == null
      ? null
      : this.compilerReads.readResolveResources();
    const globalOperationCount = this.binding.execution.sequence.readOperations().length;
    const laneOperationCount = this.binding.execution.sequence.readLaneOperations(this.binding.lane).length;
    const hydrateElementEnvelope = stageTemplateCompilerHydrateElementEnvelope({
      familyOwnerKey: String(this.binding.currentFamily.ownerHandle),
      compilerReads: this.compilerReads,
      element,
      lookupName,
      elementRead,
      resolveResourcesRead,
      owner: assembly,
      processContent,
      postProcessChildren: [...element.readChildren()],
      forestMutationRevision: this.binding.forest.mutationRevision,
      expectedForestMutationRevision: this.siteDriver?.expectedForestMutationRevision
        ?? this.startForestMutationRevision,
      globalOperationCount,
      expectedGlobalOperationCount: this.siteDriver?.expectedGlobalOperationCount
        ?? this.startGlobalOperationCount,
      laneOperationCount,
      expectedLaneOperationCount: this.siteDriver?.expectedLaneOperationCount
        ?? this.binding.bootstrapClosure.laneOperationCount,
    });
    this.hydrateElementEnvelopes.push(hydrateElementEnvelope);
    if (
      hydrateElementEnvelope.state === TemplateCompilerHydrateElementStagingState.Open
      || hydrateElementEnvelope.state === TemplateCompilerHydrateElementStagingState.Invalid
    ) {
      this.stop(
        hydrateElementEnvelope.state === TemplateCompilerHydrateElementStagingState.Invalid
          ? TemplateCompilerSiteCursorFrontierKind.HydrateElementEnvelopeInvalid
          : TemplateCompilerSiteCursorFrontierKind.HydrateElementEnvelopeOpen,
        element,
        null,
        null,
        successor,
        hydrateElementEnvelope.blockers.map((blocker) => blocker.summary).join(' ')
          || 'HydrateElement envelope staging did not close.',
      );
      return null;
    }

    const hydrateElementDraft = hydrateElementEnvelope.draft;
    const hasTemplateController = assembly.instructionStaging.templateControllers.length > 0;

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
    if (
      hydrateElementDraft?.projection.state === TemplateCompilerHydrateElementProjectionState.PendingExtraction
      || (elementDefinition == null && this.semantics.hasProjectionOnNativeElement(element))
    ) {
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
    if (hydrateElementDraft?.containerless.effective === true) {
      if (
        hydrateElementDraft.processContent.state !== TemplateCompilerHydrateElementProcessContentState.Absent
        || element.readChildren().length > 0
      ) {
        this.stop(
          TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeContainerless,
          element,
          null,
          null,
          successor,
          'Containerless replacement still has processContent or child-ownership continuation.',
        );
        return null;
      }
      this.appendEvent(new TemplateCompilerSiteCursorContainerlessPlacementEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        element,
        parent,
        parentOrdinal,
        successor,
        hydrateElementDraft,
      ));
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
      : { parent: element, children: element.readChildren() };
  }

  private visitText(
    text: TemplateCompilerTextOccurrence,
    parent: TemplateCompilerParentOccurrence,
    parentOrdinal: number,
    successor: TemplateCompilerNodeOccurrence | null,
  ): void {
    const originState = this.semantics.originState(text);
    const route = this.semantics.originRoute(text);
    const authoredText = route?.exactOrigin == null
      ? null
      : this.binding.index.textForProduct(route.exactOrigin.authored.productHandle);
    const bundle = route?.routeKind === TemplateCompilerBrowserOriginRouteKind.Singular
      ? this.binding.index.siteForText(route.exactOrigin!.authored.productHandle)
      : null;
    if (text.generation != null || originState === TemplateCompilerPreWalkBrowserOriginState.Absent) {
      const row = this.recordOccurrenceOnly(text, TemplateCompilerOccurrenceOnlyDisposition.GeneratedSiteNeedsLowering);
      this.appendEvent(new TemplateCompilerSiteCursorTextEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        text,
        parent,
        parentOrdinal,
        successor,
        originState,
        authoredText,
        null,
        null,
        row,
        TemplateCompilerSiteCursorSiteOutcome.ReloweringRequired,
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
      this.appendEvent(new TemplateCompilerSiteCursorTextEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        text,
        parent,
        parentOrdinal,
        successor,
        originState,
        authoredText,
        null,
        null,
        row,
        TemplateCompilerSiteCursorSiteOutcome.ReloweringRequired,
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
      this.appendEvent(new TemplateCompilerSiteCursorTextEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        text,
        parent,
        parentOrdinal,
        successor,
        originState,
        authoredText,
        null,
        null,
        null,
        TemplateCompilerSiteCursorSiteOutcome.ReloweringRequired,
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
      if (authoredText == null || authoredText.text !== text.text) {
        this.appendEvent(new TemplateCompilerSiteCursorTextEvent(
          siteCursorConstructionAuthority,
          this.transcriptOrdinal++,
          text,
          parent,
          parentOrdinal,
          successor,
          originState,
          authoredText,
          null,
          null,
          null,
          TemplateCompilerSiteCursorSiteOutcome.ReloweringRequired,
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
      this.appendEvent(new TemplateCompilerSiteCursorTextEvent(
        siteCursorConstructionAuthority,
        this.transcriptOrdinal++,
        text,
        parent,
        parentOrdinal,
        successor,
        originState,
        authoredText,
        null,
        null,
        row,
        TemplateCompilerSiteCursorSiteOutcome.NotApplicable,
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
    const siteOutcome = !compatible
      ? TemplateCompilerSiteCursorSiteOutcome.ReloweringRequired
      : bundle.expressionParse.state === TemplateExpressionParseState.Error
        ? TemplateCompilerSiteCursorSiteOutcome.Invalid
        : bundle.expressionParse.state === TemplateExpressionParseState.Complete
          ? TemplateCompilerSiteCursorSiteOutcome.Complete
          : TemplateCompilerSiteCursorSiteOutcome.Open;
    const instructionStaging = compatible
      && spend != null
      && siteOutcome === TemplateCompilerSiteCursorSiteOutcome.Complete
      ? this.stageTextInstructions(text, bundle)
      : null;
    this.appendEvent(new TemplateCompilerSiteCursorTextEvent(
      siteCursorConstructionAuthority,
      this.transcriptOrdinal++,
      text,
      parent,
      parentOrdinal,
      successor,
      originState,
      authoredText,
      bundle,
      spend,
      null,
      siteOutcome,
      instructionStaging,
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
    } else if (siteOutcome !== TemplateCompilerSiteCursorSiteOutcome.Complete) {
      this.stop(
        siteOutcome === TemplateCompilerSiteCursorSiteOutcome.Invalid
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

  private stageTextInstructions(
    text: TemplateCompilerTextOccurrence,
    bundle: TemplateCompilerNormalizedTextSite,
  ): TemplateCompilerTextInstructionStaging | null {
    const parseResult = bundle.expressionParse.result;
    if (parseResult.kind !== ExpressionParseResultKind.InterpolationSuccess) return null;
    const siteKey = `${this.binding.lane.localKey}:live-text:${text.occurrenceKey}`;
    const sources = parseResult.ast.expressions.map((expression, expressionChainIndex) => {
      const sourceAllocation = this.allocations.allocateSource(
        siteKey,
        `${siteKey}:hole:${expressionChainIndex}:source:${expression.span.start}:${expression.span.end}`,
        TemplateCompilerLiveSourceAllocationRole.TextInterpolationHole,
        expressionChainIndex,
        expression.span,
        bundle.expressionParse.sourceAddressHandle,
      );
      const source = new TemplateCompilerTextHoleSourceRange(
        expressionChainIndex,
        expression.span,
        bundle.expressionParse.sourceAddressHandle,
        sourceAllocation.addressHandle,
      );
      this.allocations.bindSource(source);
      return source;
    });
    return stageTemplateCompilerTextInstructions(new TemplateCompilerTextInstructionStagingRequest(
      new CursorTextInstructionStagingAuthority(this.allocations),
      siteKey,
      text.occurrenceKey,
      bundle.text.toReference(),
      bundle.expressionParse.productHandle,
      parseResult,
      sources,
    ));
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
        this.appendEvent(new TemplateCompilerSiteCursorIgnoredNodeEvent(
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
    this.appendEvent(new TemplateCompilerSiteCursorIgnoredNodeEvent(
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
    this.appendEvent(new TemplateCompilerSiteCursorSubtreeExclusionEvent(
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
      this.appendEvent(new TemplateCompilerSiteCursorSurrogateValidationEvent(
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
    this.appendEvent(new TemplateCompilerSiteCursorPhaseEvent(
      siteCursorConstructionAuthority,
      this.transcriptOrdinal++,
      phaseKind,
    ));
  }

  private appendEvent(event: TemplateCompilerSiteCursorEvent): void {
    this.taskSession.appendRootEvent(event);
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
    this.appendEvent(frontier);
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
      const replaced = this.frontier;
      const frontier = new TemplateCompilerSiteCursorFrontier(
        siteCursorConstructionAuthority,
        replaced?.ordinal ?? this.transcriptOrdinal++,
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
      if (replaced == null) this.appendEvent(frontier);
      else this.taskSession.replaceTerminalRootEvent(replaced, frontier);
    }
  }
}

function liveAttributeOwnersAreCoherent(
  binding: TemplateCompilerSiteInvocationBinding,
  events: readonly TemplateCompilerSiteCursorEvent[],
  owners: readonly TemplateCompilerLiveAttributeOwnerResult[],
): boolean {
  const eventsByContribution = new Map<
    TemplateCompilerLiveAttributeContribution,
    TemplateCompilerSiteCursorAttributeEvent[]
  >();
  for (const event of events) {
    if (!(event instanceof TemplateCompilerSiteCursorAttributeEvent) || event.liveContribution == null) continue;
    const bucket = eventsByContribution.get(event.liveContribution);
    if (bucket == null) eventsByContribution.set(event.liveContribution, [event]);
    else bucket.push(event);
  }
  const seenElements = new Set<TemplateCompilerElementOccurrence>();
  const seenContributions = new Set<TemplateCompilerLiveAttributeContribution>();
  for (const owner of owners) {
    if (
      seenElements.has(owner.element)
      || binding.forest.nodeForOccurrenceKey(owner.element.occurrenceKey) !== owner.element
      || owner.progression.element !== owner.element
      || owner.instructionStaging.finalOwnerView !== owner.finalOwnerView
      || owner.instructionStaging.state !== instructionStagingStateFor(owner.completion)
      || owner.progression.readSites().length !== owner.contributions.length
    ) return false;
    seenElements.add(owner.element);
    for (const [ordinal, contribution] of owner.contributions.entries()) {
      if (
        seenContributions.has(contribution)
        || contribution.frame.attribute.owner !== owner.element
        || contribution.frame.liveSite !== owner.progression.readSites()[ordinal]
        || eventsByContribution.get(contribution)?.length !== 1
      ) return false;
      seenContributions.add(contribution);
    }
  }
  return seenContributions.size === eventsByContribution.size;
}

function hydrateElementEnvelopesAreCoherent(
  binding: TemplateCompilerSiteInvocationBinding,
  compilerReads: TemplateCompilerReadView,
  events: readonly TemplateCompilerSiteCursorEvent[],
  owners: readonly TemplateCompilerLiveAttributeOwnerResult[],
  envelopes: readonly TemplateCompilerHydrateElementStagingResult[],
): boolean {
  const expectedOwners = owners.filter((owner) =>
    owner.completion === TemplateCompilerLiveAttributeCompletion.Complete
  );
  if (envelopes.length !== expectedOwners.length) return false;
  const elementEvents = events.filter((event): event is TemplateCompilerSiteCursorElementEvent =>
    event instanceof TemplateCompilerSiteCursorElementEvent
  );
  const processEvents = events.filter((event): event is TemplateCompilerSiteCursorProcessContentEvent =>
    event instanceof TemplateCompilerSiteCursorProcessContentEvent
  );
  const seen = new Set<TemplateCompilerElementOccurrence>();
  return envelopes.every((envelope, index) => {
    const owner = expectedOwners[index];
    const elementEvent = elementEvents.find((event) => event.element === envelope.element) ?? null;
    const processEvent = processEvents.find((event) => event.host === envelope.element) ?? null;
    const draft = envelope.draft;
    if (
      owner == null
      || seen.has(envelope.element)
      || !envelope.isModuleConstructed()
      || envelope.owner !== owner
      || owner.element !== envelope.element
      || owner.lookupName !== elementEvent?.lookupName
      || owner.authoredElement !== elementEvent?.authoredElement
      || binding.forest.nodeForOccurrenceKey(envelope.element.occurrenceKey) !== envelope.element
      || elementEvent?.elementRead == null
      || envelope.compilerReads.some((read) => !compilerReads.readAll().includes(read))
      || ((
        envelope.state === TemplateCompilerHydrateElementStagingState.Exact
        || envelope.state === TemplateCompilerHydrateElementStagingState.Pending
      ) && draft == null)
      || ((
        envelope.state === TemplateCompilerHydrateElementStagingState.NotApplicable
        || envelope.state === TemplateCompilerHydrateElementStagingState.Open
      ) && draft != null)
      || (draft != null && (
        !draft.isModuleConstructed()
        || draft.owner !== owner
        || draft.elementRead !== elementEvent.elementRead
        || draft.definition !== elementEvent.elementDefinition
        || draft.resourceLookupName !== elementEvent.lookupName
        || draft.source.authoredElement !== elementEvent.authoredElement
        || owner.compilerReads().some((read) => !envelope.compilerReads.includes(read))
        || draft.processContent.result !== (processEvent?.result ?? null)
      ))
    ) return false;
    seen.add(envelope.element);
    return true;
  });
}

function rootStateIsCoherent(
  binding: TemplateCompilerSiteInvocationBinding,
  events: readonly TemplateCompilerSiteCursorEvent[],
  rootState: TemplateCompilerRootCompilationState,
): boolean {
  if (!rootState.isModuleConstructed() || rootState.rootDefinition !== binding.definition) return false;
  const elementEvents = events.filter((event): event is TemplateCompilerSiteCursorElementEvent =>
    event instanceof TemplateCompilerSiteCursorElementEvent
  );
  const nativeSlotEvents = elementEvents.filter((event) => event.lookupName === 'slot');
  return nativeSlotEvents.length === rootState.nativeSlots.length
    && rootState.nativeSlots.every((slot, index) => {
      const event = nativeSlotEvents[index];
      return event?.element === slot.element
        && event.lookupName === slot.decision.lookupName
        && slot.decision.rootDefinition === binding.definition;
    });
}

function liveAllocationSnapshotIsCoherent(
  events: readonly TemplateCompilerSiteCursorEvent[],
  owners: readonly TemplateCompilerLiveAttributeOwnerResult[],
  snapshot: TemplateCompilerLiveAllocationSnapshot,
): boolean {
  const expectedInstructions = new Map<ProductHandle, TemplateInstruction>();
  const expectedExpressions = new Map<ProductHandle, {
    readonly read: TemplateCompilerReadObservation;
    readonly result: ExpressionParseResult;
    readonly sourceSpan: SourceSpan | null;
  }>();
  const expectedSources = new Map<AddressHandle, TemplateCompilerTextHoleSourceRange>();
  const retainExpression = (
    productHandle: ProductHandle,
    read: TemplateCompilerReadObservation,
    result: ExpressionParseResult,
    sourceSpan: SourceSpan | null,
  ): void => {
    expectedExpressions.set(productHandle, { read, result, sourceSpan });
  };
  const retainCommand = (command: TemplateCompilerLiveAttributeContribution['command']): void => {
    for (const parse of command?.expressionParses ?? []) {
      retainExpression(
        parse.expressionProductHandle,
        parse.compilerRead,
        parse.result,
        parse.sourceSpan,
      );
    }
  };

  for (const owner of owners) {
    for (const instruction of owner.instructionStaging.instructions) {
      expectedInstructions.set(instruction.productHandle, instruction);
    }
    for (const contribution of owner.contributions) {
      for (const instruction of contribution.instructions) {
        expectedInstructions.set(instruction.productHandle, instruction);
      }
      for (const instruction of contribution.command?.instructions ?? []) {
        expectedInstructions.set(instruction.productHandle, instruction);
      }
      for (const instruction of contribution.multiBinding?.stagedInstructions ?? []) {
        expectedInstructions.set(instruction.productHandle, instruction);
      }
      const valueParse = contribution.valueParse;
      if (valueParse != null) {
        retainExpression(
          valueParse.expressionProductHandle,
          valueParse.read.observation,
          valueParse.read.value,
          null,
        );
      }
      retainCommand(contribution.command);
      for (const segment of contribution.multiBinding?.segments ?? []) {
        const segmentParse = segment.valueParse;
        if (segmentParse != null) {
          retainExpression(
            segmentParse.expressionProductHandle,
            segmentParse.read.observation,
            segmentParse.read.value,
            segmentParse.sourceSpan,
          );
        }
        retainCommand(segment.command);
      }
    }
  }
  for (const event of events) {
    if (!(event instanceof TemplateCompilerSiteCursorTextEvent)) continue;
    for (const hole of event.instructionStaging?.holes ?? []) {
      expectedInstructions.set(hole.instruction.productHandle, hole.instruction);
      const sourceAddressHandle = hole.source.sourceAddressHandle;
      if (sourceAddressHandle != null) expectedSources.set(sourceAddressHandle, hole.source);
    }
  }

  const boundInstructions = snapshot.instructionAllocations.filter((allocation) => allocation.instruction != null);
  const boundExpressions = snapshot.expressionAllocations.filter((allocation) =>
    allocation.compilerRead != null && allocation.result != null
  );
  const boundSources = snapshot.sourceAllocations.filter((allocation) => allocation.source != null);
  return boundInstructions.length === expectedInstructions.size
    && boundExpressions.length === expectedExpressions.size
    && boundSources.length === expectedSources.size
    && snapshot.productReservations.length === 0
    && snapshot.instructionAllocations.every((allocation) =>
      allocation.instruction == null
        || allocation.instruction === expectedInstructions.get(allocation.productHandle)
    )
    && snapshot.expressionAllocations.every((allocation) => {
      if (allocation.compilerRead == null || allocation.result == null) return true;
      const expected = expectedExpressions.get(allocation.productHandle) ?? null;
      return expected != null
        && allocation.compilerRead === expected.read
        && allocation.result === expected.result
        && sameSourceSpan(allocation.sourceSpan, expected.sourceSpan);
    })
    && snapshot.sourceAllocations.every((allocation) =>
      allocation.source == null
        || allocation.source === expectedSources.get(allocation.addressHandle)
    );
}

function sameSourceSpan(left: SourceSpan | null, right: SourceSpan | null): boolean {
  return left === right || (
    left != null
    && right != null
    && left.start === right.start
    && left.end === right.end
    && left.file?.id === right.file?.id
  );
}

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function instructionStagingStateFor(
  completion: TemplateCompilerLiveAttributeCompletion,
): TemplateCompilerElementInstructionStagingState {
  switch (completion) {
    case TemplateCompilerLiveAttributeCompletion.Complete:
      return TemplateCompilerElementInstructionStagingState.Complete;
    case TemplateCompilerLiveAttributeCompletion.Invalid:
      return TemplateCompilerElementInstructionStagingState.Invalid;
    case TemplateCompilerLiveAttributeCompletion.Open:
      return TemplateCompilerElementInstructionStagingState.Open;
  }
}

function liveAttributeOutcome(
  contribution: TemplateCompilerLiveAttributeContribution,
): TemplateCompilerSiteCursorSiteOutcome {
  switch (contribution.completion) {
    case TemplateCompilerLiveAttributeCompletion.Complete:
      return TemplateCompilerSiteCursorSiteOutcome.Complete;
    case TemplateCompilerLiveAttributeCompletion.Invalid:
      return TemplateCompilerSiteCursorSiteOutcome.Invalid;
    case TemplateCompilerLiveAttributeCompletion.Open:
      return contribution.reason?.reasonKind === TemplateCompilerLiveAttributeOpenReasonKind.SourceAuthorityOpen
        ? TemplateCompilerSiteCursorSiteOutcome.ReloweringRequired
        : TemplateCompilerSiteCursorSiteOutcome.Open;
  }
}

function liveAttributeFrontier(
  contribution: TemplateCompilerLiveAttributeContribution,
): TemplateCompilerSiteCursorFrontierKind {
  if (contribution.reason?.reasonKind === TemplateCompilerLiveAttributeOpenReasonKind.SourceAuthorityOpen) {
    return TemplateCompilerSiteCursorFrontierKind.AtLiveAttributeRelowering;
  }
  switch (contribution.completion) {
    case TemplateCompilerLiveAttributeCompletion.Complete:
      throw new Error('Complete live attribute contribution has no terminal frontier.');
    case TemplateCompilerLiveAttributeCompletion.Invalid:
      return TemplateCompilerSiteCursorFrontierKind.ReachedLiveAttributeInvalid;
    case TemplateCompilerLiveAttributeCompletion.Open:
      return TemplateCompilerSiteCursorFrontierKind.ReachedLiveAttributeOpen;
  }
}

function invalidSurrogateTarget(target: string): boolean {
  return target === 'id'
    || target === 'name'
    || target === 'au-slot'
    || target === 'as-element';
}

class CursorTextInstructionStagingAuthority implements TemplateCompilerTextInstructionStagingAuthority {
  constructor(private readonly allocations: TemplateCompilerLiveAllocationLedger) {}

  create(
    request: TemplateCompilerTextInstructionAllocationRequest,
    factory: (allocation: TemplateCompilerTextInstructionAllocation) => TextBindingInstruction,
  ): TextBindingInstruction {
    const local = `${request.siteKey}:hole:${request.expressionChainIndex}:text-binding`;
    const retained = this.allocations.allocateInstruction(
      request.siteKey,
      `text-hole:${request.expressionChainIndex}`,
      TemplateInstructionKind.TextBinding,
      request.source.sourceAddressHandle,
      local,
    );
    const instruction = factory(new TemplateCompilerTextInstructionAllocation(
      retained.productHandle,
      retained.identityHandle,
      retained.instructionLocal,
    ));
    this.allocations.bindInstruction(instruction);
    return instruction;
  }
}
