import { TemplateCompilerScopeClosureState } from './compiler-read-view.js';
import type { TemplateCompilerReadObservation } from './compiler-read-view.js';
import type { TemplateCompilerSiteExecutionEndpointReceipt } from './template-compiler-execution.js';
import {
  TemplateCompilerHydrateElementProcessContentState,
  TemplateCompilerHydrateElementProjectionState,
  TemplateCompilerHydrateElementStagingState,
} from './template-compiler-hydrate-element-staging.js';
import { TemplateCompilerElementInstructionStagingState } from './template-compiler-instruction-staging.js';
import { TemplateCompilerLiveAttributeCompletion } from './template-compiler-live-attribute-assembly.js';
import { TemplateCompilerLiveAllocationSnapshotState } from './template-compiler-live-allocation.js';
import { TemplateCompilerRootCompilationStateKind } from './template-compiler-root-state.js';
import {
  TemplateCompilerSiteCursorAttributeEvent,
  TemplateCompilerSiteCursorContainerlessPlacementEvent,
  TemplateCompilerSiteCursorIgnoredNodeEvent,
  TemplateCompilerSiteCursorPhaseEvent,
  TemplateCompilerSiteCursorPhaseKind,
  TemplateCompilerSiteCursorProcessContentEvent,
  TemplateCompilerSiteCursorSiteOutcome,
  TemplateCompilerSiteCursorSubtreeExclusionEvent,
  TemplateCompilerSiteCursorSurrogateValidationEvent,
  TemplateCompilerSiteCursorTextEvent,
  TemplateCompilerSiteCursorElementEvent,
} from './template-compiler-site-cursor-event.js';
import type { TemplateCompilerSiteCursorTranscript } from './template-compiler-site-cursor.js';
import {
  TemplateCompilerSiteSpendCompletionKind,
} from './template-compiler-site-spend-ledger.js';

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
  const refusals: TemplateCompilerOrdinaryRootCompletionRefusal[] = [];
  const refuse = (
    refusalKind: TemplateCompilerOrdinaryRootCompletionRefusalKind,
    summary: string,
  ): void => {
    if (!refusals.some((entry) => entry.refusalKind === refusalKind)) {
      refusals.push(new TemplateCompilerOrdinaryRootCompletionRefusal(refusalKind, summary));
    }
  };

  if (!transcript.isModuleConstructed()) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.ForeignTranscript,
      'Ordinary root completion requires one module-constructed cursor transcript.',
    );
  }
  if (transcript.frontier != null) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.CursorFrontier,
      `Cursor stopped at '${transcript.frontier.frontierKind}'.`,
    );
  }
  if (
    transcript.taskSnapshot.contexts.length !== 1
    || transcript.taskSnapshot.contexts[0]?.context !== transcript.taskSnapshot.rootContext
  ) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.ContextFamilyTraversal,
      'Ordinary-root completion cannot claim a generated compiler context family.',
    );
  }
  switch (transcript.rootState.stateKind) {
    case TemplateCompilerRootCompilationStateKind.Invalid:
      refuse(
        TemplateCompilerOrdinaryRootCompletionRefusalKind.RootStateInvalid,
        'Reached root-global compiler output is invalid.',
      );
      break;
    case TemplateCompilerRootCompilationStateKind.Open:
      refuse(
        TemplateCompilerOrdinaryRootCompletionRefusalKind.RootStateOpen,
        'Reached root-global compiler output remains open.',
      );
      break;
    case TemplateCompilerRootCompilationStateKind.Complete:
      break;
  }
  const lastEvent = transcript.events.at(-1) ?? null;
  if (
    !(lastEvent instanceof TemplateCompilerSiteCursorPhaseEvent)
    || lastEvent.phaseKind !== TemplateCompilerSiteCursorPhaseKind.SurrogateEnd
  ) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.RootPhaseIncomplete,
      'Cursor did not complete the root surrogate-end phase.',
    );
  }

  if (endpoint == null) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.EndpointMissing,
      'Cursor has no released session-owned site endpoint.',
    );
  } else if (
    !endpoint.isOwnedBy(transcript.binding.execution, transcript.binding.lane)
    || !transcript.binding.execution.siteExecutionEndpointIsCurrent(endpoint)
    || endpoint.forestMutationRevision !== transcript.endForestMutationRevision
    || endpoint.globalOperationCount !== transcript.endGlobalOperationCount
    || endpoint.laneOperationCount !== transcript.endLaneOperationCount
    || endpoint.forestMutationRevision !== transcript.expectedEndForestMutationRevision
    || endpoint.globalOperationCount !== transcript.expectedEndGlobalOperationCount
    || endpoint.laneOperationCount !== transcript.expectedEndLaneOperationCount
  ) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.EndpointMismatch,
      'Session-owned site endpoint does not match the transcript and current pre-plan execution frontier.',
    );
  }
  if (endpoint != null) {
    const representedOperations = transcript.events.flatMap((event) =>
      event instanceof TemplateCompilerSiteCursorProcessContentEvent ? [event.result.operation] : []
    );
    if (!sameObjects(endpoint.siteOperations, representedOperations)) {
      refuse(
        TemplateCompilerOrdinaryRootCompletionRefusalKind.SiteOperationMismatch,
        'Released site-operation suffix is not represented exactly by cursor effect events.',
      );
    }
  }

  const compilerReads = [...transcript.compilerReads.readAll()];
  if (compilerReads.some((read) =>
    read.closure.state !== TemplateCompilerScopeClosureState.Closed
    || !read.validate().isCurrent
  )) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.CompilerReadOpen,
      'One or more compiler reads are open or no longer current at root completion.',
    );
  }

  const ledger = transcript.ledger;
  if (
    ledger.conflicts.length > 0
    || (transcript.frontier == null && (
      ledger.completion.completionKind !== TemplateCompilerSiteSpendCompletionKind.Complete
      || ledger.blockedByFrontier.length > 0
    ))
  ) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.AccountingMismatch,
      'Site accounting did not finish one conflict-free unblocked walk.',
    );
  }
  const exactRemainders = new Map(
    ledger.authoredRemainderEvidence.map((evidence) => [evidence.bundle, evidence]),
  );
  const frontierBlockedBundles = new Set(ledger.blockedByFrontier.map((blocked) => blocked.bundle));
  if (
    ledger.rawUnspent.some((bundle) => {
      const evidence = exactRemainders.get(bundle) ?? null;
      const hasExactRemainder = evidence?.preWalkReceipt != null
        && transcript.preWalkAuthority.owns(evidence.preWalkReceipt);
      return !hasExactRemainder && !frontierBlockedBundles.has(bundle);
    })
    || ledger.authoredRemainderEvidence.some((evidence) => !ledger.rawUnspent.includes(evidence.bundle))
  ) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.UnexplainedAuthoredRemainder,
      'Every raw-unspent authored bundle must have exactly its cursor-owned pre-walk remainder receipt.',
    );
  }

  const attributes = transcript.events.filter((event): event is TemplateCompilerSiteCursorAttributeEvent =>
    event instanceof TemplateCompilerSiteCursorAttributeEvent
  );
  const elementEvents = transcript.events.filter((event): event is TemplateCompilerSiteCursorElementEvent =>
    event instanceof TemplateCompilerSiteCursorElementEvent
  );
  const containerlessPlacements = transcript.events.filter(
    (event): event is TemplateCompilerSiteCursorContainerlessPlacementEvent =>
      event instanceof TemplateCompilerSiteCursorContainerlessPlacementEvent
  );
  const placementsByElement = new Map(containerlessPlacements.map((event) => [event.element, event] as const));
  const texts = transcript.events.filter((event): event is TemplateCompilerSiteCursorTextEvent =>
    event instanceof TemplateCompilerSiteCursorTextEvent
  );
  if (
    transcript.attributeOwners.some((owner) =>
      owner.completion !== TemplateCompilerLiveAttributeCompletion.Complete
      || owner.instructionStaging.state !== TemplateCompilerElementInstructionStagingState.Complete
    )
    || attributes.some((event) => event.siteOutcome !== TemplateCompilerSiteCursorSiteOutcome.Complete)
    || texts.some((event) =>
      event.siteOutcome !== TemplateCompilerSiteCursorSiteOutcome.Complete
      && event.siteOutcome !== TemplateCompilerSiteCursorSiteOutcome.NotApplicable
    )
  ) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.LiveSiteIncomplete,
      'One or more reached attribute/text sites lack complete live semantic staging.',
    );
  }
  if (transcript.hydrateElementEnvelopes.some((envelope) =>
    envelope.state !== TemplateCompilerHydrateElementStagingState.Exact
    && envelope.state !== TemplateCompilerHydrateElementStagingState.NotApplicable
  )) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.HydrateElementIncomplete,
      'One or more reached HydrateElement envelopes remain semantically incomplete.',
    );
  }
  if (
    placementsByElement.size !== containerlessPlacements.length
    || transcript.hydrateElementEnvelopes.some((envelope) => {
      const placeable = envelope.state === TemplateCompilerHydrateElementStagingState.Exact
        && envelope.draft?.containerless.effective === true
        && envelope.draft.processContent.state === TemplateCompilerHydrateElementProcessContentState.Absent
        && envelope.draft.projection.state === TemplateCompilerHydrateElementProjectionState.None
        && envelope.element.readChildren().length === 0
        && envelope.owner.instructionStaging.templateControllers.length === 0;
      return placeable !== placementsByElement.has(envelope.element);
    })
    || containerlessPlacements.some((placement) => {
      const elementEvent = elementEvents.find((event) => event.element === placement.element) ?? null;
      const lastElementEventOrdinal = Math.max(
        elementEvent?.ordinal ?? -1,
        ...attributes.filter((event) => event.owner === placement.element).map((event) => event.ordinal),
      );
      return placement.ordinal !== lastElementEventOrdinal + 1;
    })
  ) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.ContainerlessPlacementMismatch,
      'Effective containerless elements require one exact cursor placement decision.',
    );
  }
  if (
    transcript.allocationSnapshot.state !== TemplateCompilerLiveAllocationSnapshotState.Complete
    || !transcript.allocationSnapshot.isCurrent()
  ) {
    refuse(
      TemplateCompilerOrdinaryRootCompletionRefusalKind.AllocationOpen,
      'Reached live allocation inventory contains an unbound instruction or expression slot.',
    );
  }

  if (refusals.length > 0 || endpoint == null) {
    return new TemplateCompilerOrdinaryRootCompletionResult(null, refusals);
  }
  const ownersByElement = new Map(transcript.attributeOwners.map((owner) => [owner.element, owner]));
  const envelopesByElement = new Map(transcript.hydrateElementEnvelopes.map((envelope) => [envelope.element, envelope]));
  const elementSites = elementEvents.map((event) => new TemplateCompilerCompletedElementSite(
    event,
    ownersByElement.get(event.element)!,
    envelopesByElement.get(event.element)!,
    placementsByElement.get(event.element) ?? null,
  ));
  const textSites = texts.map((event) => new TemplateCompilerCompletedTextSite(event));
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
      compilerReads,
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

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
