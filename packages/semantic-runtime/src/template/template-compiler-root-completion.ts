import { TemplateCompilerScopeClosureState } from './compiler-read-view.js';
import type { TemplateCompilerReadObservation } from './compiler-read-view.js';
import type { TemplateCompilerSiteExecutionEndpointReceipt } from './template-compiler-execution.js';
import {
  auditTemplateCompilerTraversalCompletion,
  TemplateCompilerTraversalCompletionAuditReasonKind,
} from './template-compiler-completion-audit.js';
import {
  TemplateCompilerHydrateElementProcessContentState,
  TemplateCompilerHydrateElementProjectionState,
  TemplateCompilerHydrateElementStagingState,
} from './template-compiler-hydrate-element-staging.js';
import {
  type TemplateCompilerSiteCursorContainerlessPlacementEvent,
  TemplateCompilerSiteCursorIgnoredNodeEvent,
  TemplateCompilerSiteCursorSubtreeExclusionEvent,
  TemplateCompilerSiteCursorSurrogateValidationEvent,
  TemplateCompilerSiteCursorTextEvent,
  TemplateCompilerSiteCursorElementEvent,
} from './template-compiler-site-cursor-event.js';
import {
  type TemplateCompilerSiteCursorTranscript,
  TemplateCompilerSiteCursorTraversalMode,
} from './template-compiler-site-cursor.js';

const ordinaryRootCompletionAuthority = {};

export const enum TemplateCompilerOrdinaryRootCompletionState {
  Complete = 'complete',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerOrdinaryRootCompletionRefusalKind {
  ForeignTranscript = 'foreign-transcript',
  CursorFrontier = 'cursor-frontier',
  RootStateInvalid = 'root-state-invalid',
  RootStateOpen = 'root-state-open',
  ContextFamilyTraversal = 'context-family-traversal',
  RootPhaseIncomplete = 'root-phase-incomplete',
  EndpointMissing = 'endpoint-missing',
  EndpointMismatch = 'endpoint-mismatch',
  SiteOperationMismatch = 'site-operation-mismatch',
  CompilerReadOpen = 'compiler-read-open',
  AccountingMismatch = 'accounting-mismatch',
  UnexplainedAuthoredRemainder = 'unexplained-authored-remainder',
  LiveSiteIncomplete = 'live-site-incomplete',
  HydrateElementIncomplete = 'hydrate-element-incomplete',
  ContainerlessPlacementMismatch = 'containerless-placement-mismatch',
  AllocationOpen = 'allocation-open',
}

export class TemplateCompilerOrdinaryRootCompletionRefusal {
  constructor(
    readonly refusalKind: TemplateCompilerOrdinaryRootCompletionRefusalKind,
    readonly summary: string,
  ) {}
}

/** Completion-owned element input for future occurrence-primary row assembly. */
export class TemplateCompilerCompletedElementSite {
  readonly siteKind = 'element' as const;
  readonly rowSlotKey: string;

  constructor(
    readonly event: TemplateCompilerSiteCursorElementEvent,
    readonly owner: TemplateCompilerSiteCursorTranscript['attributeOwners'][number],
    readonly hydrateElement: TemplateCompilerSiteCursorTranscript['hydrateElementEnvelopes'][number],
    readonly containerlessPlacement: TemplateCompilerSiteCursorContainerlessPlacementEvent | null,
  ) {
    this.rowSlotKey = `element:${event.element.occurrenceKey}:direct-row`;
    if (
      (hydrateElement.draft?.containerless.effective === true) !== (containerlessPlacement != null)
      || (containerlessPlacement != null && (
        containerlessPlacement.element !== event.element
        || containerlessPlacement.parent !== event.parent
        || containerlessPlacement.parentOrdinal !== event.parentOrdinal
        || containerlessPlacement.capturedSuccessor !== event.capturedSuccessor
        || containerlessPlacement.envelope !== hydrateElement.draft
      ))
    ) {
      throw new Error(`Completed element '${event.element.occurrenceKey}' lost containerless placement authority.`);
    }
  }

  get rowRequired(): boolean {
    return this.hydrateElement.draft != null
      || this.owner.instructionStaging.directRowTail.length > 0;
  }
}

/** Completion-owned text input with stable per-hole slots independent from traversal ordinal. */
export class TemplateCompilerCompletedTextSite {
  readonly siteKind = 'text' as const;
  readonly holeSlotKeys: readonly string[];

  constructor(readonly event: TemplateCompilerSiteCursorTextEvent) {
    this.holeSlotKeys = event.instructionStaging?.holes.map((hole) =>
      `text:${event.text.occurrenceKey}:hole:${hole.expressionChainIndex}`
    ) ?? [];
  }

  get rowRequired(): boolean {
    return this.holeSlotKeys.length > 0;
  }
}

export type TemplateCompilerCompletedOrdinarySite =
  | TemplateCompilerCompletedElementSite
  | TemplateCompilerCompletedTextSite;

/** Nominal successful end of one no-local ordinary root cursor walk. */
export class TemplateCompilerOrdinaryRootCursorCompletionReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly transcript: TemplateCompilerSiteCursorTranscript,
    readonly endpoint: TemplateCompilerSiteExecutionEndpointReceipt,
    readonly compilerReads: readonly TemplateCompilerReadObservation[],
    readonly orderedSites: readonly TemplateCompilerCompletedOrdinarySite[],
    readonly elementSites: readonly TemplateCompilerCompletedElementSite[],
    readonly textSites: readonly TemplateCompilerCompletedTextSite[],
    readonly ignoredNodes: readonly TemplateCompilerSiteCursorIgnoredNodeEvent[],
    readonly exclusions: readonly TemplateCompilerSiteCursorSubtreeExclusionEvent[],
    readonly surrogateValidations: readonly TemplateCompilerSiteCursorSurrogateValidationEvent[],
  ) {
    if (
      authority !== ordinaryRootCompletionAuthority
      || !transcript.isModuleConstructed()
      || endpoint.execution !== transcript.binding.execution
      || endpoint.lane !== transcript.binding.lane
      || endpoint.bootstrapClosure !== transcript.binding.bootstrapClosure
      || orderedSites.length !== elementSites.length + textSites.length
      || orderedSites.some((site, index) =>
        index > 0 && orderedSites[index - 1]!.event.ordinal >= site.event.ordinal
      )
      || elementSites.length !== transcript.attributeOwners.length
      || elementSites.length !== transcript.hydrateElementEnvelopes.length
    ) {
      throw new Error('Ordinary root completion lost transcript, endpoint, or completed-site authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === ordinaryRootCompletionAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed()
      && this.transcript.binding.execution.siteExecutionEndpointIsCurrent(this.endpoint)
      && this.transcript.allocationSnapshot.isCurrent()
      && this.compilerReads.every((read) =>
        read.closure.state === TemplateCompilerScopeClosureState.Closed
        && read.validate().isCurrent
      );
  }
}

export class TemplateCompilerOrdinaryRootCompletionResult {
  readonly state: TemplateCompilerOrdinaryRootCompletionState;

  constructor(
    readonly receipt: TemplateCompilerOrdinaryRootCursorCompletionReceipt | null,
    readonly refusals: readonly TemplateCompilerOrdinaryRootCompletionRefusal[],
  ) {
    this.state = receipt == null
      ? TemplateCompilerOrdinaryRootCompletionState.Ineligible
      : TemplateCompilerOrdinaryRootCompletionState.Complete;
    if ((receipt == null) !== (refusals.length > 0)) {
      throw new Error('Ordinary root completion result lost exact receipt/refusal ownership.');
    }
  }
}

export function completeTemplateCompilerOrdinaryRoot(
  transcript: TemplateCompilerSiteCursorTranscript,
  endpoint: TemplateCompilerSiteExecutionEndpointReceipt | null,
): TemplateCompilerOrdinaryRootCompletionResult {
  const audit = auditTemplateCompilerTraversalCompletion(transcript, endpoint);
  const refusals: TemplateCompilerOrdinaryRootCompletionRefusal[] = [];
  const refuse = (
    refusalKind: TemplateCompilerOrdinaryRootCompletionRefusalKind,
    summary: string,
  ): void => {
    if (!refusals.some((entry) => entry.refusalKind === refusalKind)) {
      refusals.push(new TemplateCompilerOrdinaryRootCompletionRefusal(refusalKind, summary));
    }
  };
  const appendAuditReasons = (
    kinds: readonly TemplateCompilerTraversalCompletionAuditReasonKind[],
  ): void => {
    for (const kind of kinds) {
      const reason = audit.reasonFor(kind);
      if (reason != null) refuse(ordinaryRefusalKindForAudit(kind), reason.summary);
    }
  };

  appendAuditReasons([
    TemplateCompilerTraversalCompletionAuditReasonKind.ForeignTranscript,
    TemplateCompilerTraversalCompletionAuditReasonKind.CursorFrontier,
  ]);
  const ordinaryTraversal = transcript.traversalMode === TemplateCompilerSiteCursorTraversalMode.CompatibilityStop
    && transcript.taskSnapshot.contexts.length === 1
    && transcript.taskSnapshot.contexts[0]?.context === transcript.taskSnapshot.rootContext;
  if (!ordinaryTraversal) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.ContextFamilyTraversal,
      'Ordinary-root completion requires compatibility traversal with exactly the root context.',
    );
  }
  appendAuditReasons([
    TemplateCompilerTraversalCompletionAuditReasonKind.RootStateInvalid,
    TemplateCompilerTraversalCompletionAuditReasonKind.RootStateOpen,
    TemplateCompilerTraversalCompletionAuditReasonKind.RootPhaseIncomplete,
    TemplateCompilerTraversalCompletionAuditReasonKind.EndpointMissing,
    TemplateCompilerTraversalCompletionAuditReasonKind.EndpointMismatch,
    TemplateCompilerTraversalCompletionAuditReasonKind.SiteOperationMismatch,
    TemplateCompilerTraversalCompletionAuditReasonKind.CompilerReadOpen,
    TemplateCompilerTraversalCompletionAuditReasonKind.AccountingMismatch,
    TemplateCompilerTraversalCompletionAuditReasonKind.UnexplainedAuthoredRemainder,
    TemplateCompilerTraversalCompletionAuditReasonKind.LiveSiteIncomplete,
  ]);
  if (ordinaryTraversal && transcript.hydrateElementEnvelopes.some((envelope) =>
    envelope.state !== TemplateCompilerHydrateElementStagingState.Exact
    && envelope.state !== TemplateCompilerHydrateElementStagingState.NotApplicable
  )) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.HydrateElementIncomplete,
      'One or more reached HydrateElement envelopes remain semantically incomplete.',
    );
  }
  if (ordinaryTraversal && (
    audit.placementsByElement.size !== audit.containerlessPlacements.length
    || transcript.hydrateElementEnvelopes.some((envelope) => {
      const placeable = envelope.state === TemplateCompilerHydrateElementStagingState.Exact
        && envelope.draft?.containerless.effective === true
        && envelope.draft.processContent.state === TemplateCompilerHydrateElementProcessContentState.Absent
        && envelope.draft.projection.state === TemplateCompilerHydrateElementProjectionState.None
        && envelope.element.readChildren().length === 0
        && envelope.owner.instructionStaging.templateControllers.length === 0;
      return placeable !== audit.placementsByElement.has(envelope.element);
    })
    || audit.containerlessPlacements.some((placement) => {
      const elementEvent = audit.elementEvents.find((event) => event.element === placement.element) ?? null;
      const lastElementEventOrdinal = Math.max(
        elementEvent?.ordinal ?? -1,
        ...audit.attributeEvents.filter((event) => event.owner === placement.element).map((event) => event.ordinal),
      );
      return placement.ordinal !== lastElementEventOrdinal + 1;
    })
  )) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.ContainerlessPlacementMismatch,
      'Effective containerless elements require one exact cursor placement decision.',
    );
  }
  appendAuditReasons([TemplateCompilerTraversalCompletionAuditReasonKind.AllocationOpen]);

  if (refusals.length > 0 || endpoint == null) {
    return new TemplateCompilerOrdinaryRootCompletionResult(null, refusals);
  }
  const elementSites = audit.elementEvents.map((event) => new TemplateCompilerCompletedElementSite(
    event,
    audit.ownersByElement.get(event.element)!,
    audit.envelopesByElement.get(event.element)!,
    audit.placementsByElement.get(event.element) ?? null,
  ));
  const textSites = audit.textEvents.map((event) => new TemplateCompilerCompletedTextSite(event));
  const elementsByEvent = new Map(elementSites.map((site) => [site.event, site]));
  const textsByEvent = new Map(textSites.map((site) => [site.event, site]));
  const orderedSites: TemplateCompilerCompletedOrdinarySite[] = [];
  for (const event of transcript.events) {
    if (event instanceof TemplateCompilerSiteCursorElementEvent) orderedSites.push(elementsByEvent.get(event)!);
    if (event instanceof TemplateCompilerSiteCursorTextEvent) orderedSites.push(textsByEvent.get(event)!);
  }
  return new TemplateCompilerOrdinaryRootCompletionResult(
    new TemplateCompilerOrdinaryRootCursorCompletionReceipt(
      ordinaryRootCompletionAuthority,
      transcript,
      endpoint,
      audit.compilerReads,
      orderedSites,
      elementSites,
      textSites,
      transcript.events.filter((event): event is TemplateCompilerSiteCursorIgnoredNodeEvent =>
        event instanceof TemplateCompilerSiteCursorIgnoredNodeEvent
      ),
      transcript.events.filter((event): event is TemplateCompilerSiteCursorSubtreeExclusionEvent =>
        event instanceof TemplateCompilerSiteCursorSubtreeExclusionEvent
      ),
      transcript.events.filter((event): event is TemplateCompilerSiteCursorSurrogateValidationEvent =>
        event instanceof TemplateCompilerSiteCursorSurrogateValidationEvent
      ),
    ),
    [],
  );
}

function ordinaryRefusalKindForAudit(
  reasonKind: TemplateCompilerTraversalCompletionAuditReasonKind,
): TemplateCompilerOrdinaryRootCompletionRefusalKind {
  switch (reasonKind) {
    case TemplateCompilerTraversalCompletionAuditReasonKind.ForeignTranscript:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.ForeignTranscript;
    case TemplateCompilerTraversalCompletionAuditReasonKind.CursorFrontier:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.CursorFrontier;
    case TemplateCompilerTraversalCompletionAuditReasonKind.RootStateInvalid:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.RootStateInvalid;
    case TemplateCompilerTraversalCompletionAuditReasonKind.RootStateOpen:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.RootStateOpen;
    case TemplateCompilerTraversalCompletionAuditReasonKind.RootPhaseIncomplete:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.RootPhaseIncomplete;
    case TemplateCompilerTraversalCompletionAuditReasonKind.EndpointMissing:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.EndpointMissing;
    case TemplateCompilerTraversalCompletionAuditReasonKind.EndpointMismatch:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.EndpointMismatch;
    case TemplateCompilerTraversalCompletionAuditReasonKind.SiteOperationMismatch:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.SiteOperationMismatch;
    case TemplateCompilerTraversalCompletionAuditReasonKind.CompilerReadOpen:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.CompilerReadOpen;
    case TemplateCompilerTraversalCompletionAuditReasonKind.AccountingMismatch:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.AccountingMismatch;
    case TemplateCompilerTraversalCompletionAuditReasonKind.UnexplainedAuthoredRemainder:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.UnexplainedAuthoredRemainder;
    case TemplateCompilerTraversalCompletionAuditReasonKind.LiveSiteIncomplete:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.LiveSiteIncomplete;
    case TemplateCompilerTraversalCompletionAuditReasonKind.AllocationOpen:
      return TemplateCompilerOrdinaryRootCompletionRefusalKind.AllocationOpen;
  }
}
