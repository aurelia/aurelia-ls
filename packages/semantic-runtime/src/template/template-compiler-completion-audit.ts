import { TemplateCompilerScopeClosureState } from './compiler-read-view.js';
import type { TemplateCompilerReadObservation } from './compiler-read-view.js';
import type { TemplateCompilerSiteExecutionEndpointReceipt } from './template-compiler-execution.js';
import { TemplateCompilerElementInstructionStagingState } from './template-compiler-instruction-staging.js';
import { TemplateCompilerLiveAttributeCompletion } from './template-compiler-live-attribute-assembly.js';
import { TemplateCompilerLiveAllocationSnapshotState } from './template-compiler-live-allocation.js';
import { TemplateCompilerRootCompilationStateKind } from './template-compiler-root-state.js';
import {
  TemplateCompilerSiteCursorAttributeEvent,
  TemplateCompilerSiteCursorContainerlessPlacementEvent,
  TemplateCompilerSiteCursorElementEvent,
  TemplateCompilerSiteCursorLetElementEvent,
  TemplateCompilerSiteCursorPhaseEvent,
  TemplateCompilerSiteCursorPhaseKind,
  TemplateCompilerSiteCursorProcessContentEvent,
  TemplateCompilerSiteCursorSiteOutcome,
  TemplateCompilerSiteCursorTextEvent,
} from './template-compiler-site-cursor-event.js';
import type { TemplateCompilerSiteCursorTranscript } from './template-compiler-site-cursor.js';
import { TemplateCompilerSiteSpendCompletionKind } from './template-compiler-site-spend-ledger.js';

const traversalCompletionAuditAuthority = {};

/** Global refusal shared by ordinary-root and generated-context-family completion. */
export const enum TemplateCompilerTraversalCompletionAuditReasonKind {
  ForeignTranscript = 'foreign-transcript',
  CursorFrontier = 'cursor-frontier',
  RootStateInvalid = 'root-state-invalid',
  RootStateOpen = 'root-state-open',
  RootPhaseIncomplete = 'root-phase-incomplete',
  EndpointMissing = 'endpoint-missing',
  EndpointMismatch = 'endpoint-mismatch',
  SiteOperationMismatch = 'site-operation-mismatch',
  CompilerReadOpen = 'compiler-read-open',
  AccountingMismatch = 'accounting-mismatch',
  UnexplainedAuthoredRemainder = 'unexplained-authored-remainder',
  LiveSiteIncomplete = 'live-site-incomplete',
  AllocationOpen = 'allocation-open',
}

export class TemplateCompilerTraversalCompletionAuditReason {
  constructor(
    readonly reasonKind: TemplateCompilerTraversalCompletionAuditReasonKind,
    readonly summary: string,
  ) {}
}

/**
 * Common immutable completion basis. It audits only facts whose meaning is identical for ordinary and family walks.
 * HydrateElement continuation, context ownership, and containerless policy remain consumer-specific.
 */
export class TemplateCompilerTraversalCompletionAudit {
  readonly #authority: object;
  readonly ownersByElement: ReadonlyMap<
    TemplateCompilerSiteCursorElementEvent['element'],
    TemplateCompilerSiteCursorTranscript['attributeOwners'][number]
  >;
  readonly envelopesByElement: ReadonlyMap<
    TemplateCompilerSiteCursorElementEvent['element'],
    TemplateCompilerSiteCursorTranscript['hydrateElementEnvelopes'][number]
  >;
  readonly placementsByElement: ReadonlyMap<
    TemplateCompilerSiteCursorElementEvent['element'],
    TemplateCompilerSiteCursorContainerlessPlacementEvent
  >;

  constructor(
    authority: object,
    readonly transcript: TemplateCompilerSiteCursorTranscript,
    readonly endpoint: TemplateCompilerSiteExecutionEndpointReceipt | null,
    readonly compilerReads: readonly TemplateCompilerReadObservation[],
    readonly elementEvents: readonly TemplateCompilerSiteCursorElementEvent[],
    readonly attributeEvents: readonly TemplateCompilerSiteCursorAttributeEvent[],
    readonly textEvents: readonly TemplateCompilerSiteCursorTextEvent[],
    readonly letEvents: readonly TemplateCompilerSiteCursorLetElementEvent[],
    readonly processContentEvents: readonly TemplateCompilerSiteCursorProcessContentEvent[],
    readonly containerlessPlacements: readonly TemplateCompilerSiteCursorContainerlessPlacementEvent[],
    readonly reasons: readonly TemplateCompilerTraversalCompletionAuditReason[],
  ) {
    this.ownersByElement = new Map(transcript.attributeOwners.map((owner) => [owner.element, owner]));
    this.envelopesByElement = new Map(
      transcript.hydrateElementEnvelopes.map((envelope) => [envelope.element, envelope]),
    );
    this.placementsByElement = new Map(containerlessPlacements.map((event) => [event.element, event]));
    if (
      authority !== traversalCompletionAuditAuthority
      || this.ownersByElement.size !== transcript.attributeOwners.length
      || this.envelopesByElement.size !== transcript.hydrateElementEnvelopes.length
      || this.placementsByElement.size !== containerlessPlacements.length
    ) {
      throw new Error('Compiler traversal completion audit lost unique owner, envelope, or placement authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === traversalCompletionAuditAuthority;
  }

  get isGloballyExact(): boolean {
    return this.reasons.length === 0 && this.endpoint != null;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed()
      && this.isGloballyExact
      && this.endpoint != null
      && this.transcript.binding.execution.siteExecutionEndpointIsCurrent(this.endpoint)
      && this.transcript.allocationSnapshot.isCurrent()
      && this.compilerReads.every((read) =>
        read.closure.state === TemplateCompilerScopeClosureState.Closed
        && read.validate().isCurrent
      );
  }

  reasonFor(
    reasonKind: TemplateCompilerTraversalCompletionAuditReasonKind,
  ): TemplateCompilerTraversalCompletionAuditReason | null {
    return this.reasons.find((reason) => reason.reasonKind === reasonKind) ?? null;
  }
}

/** Audit the shared global terminal contract without claiming ordinary or family context ownership. */
export function auditTemplateCompilerTraversalCompletion(
  transcript: TemplateCompilerSiteCursorTranscript,
  endpoint: TemplateCompilerSiteExecutionEndpointReceipt | null,
): TemplateCompilerTraversalCompletionAudit {
  const reasons: TemplateCompilerTraversalCompletionAuditReason[] = [];
  const refuse = (
    reasonKind: TemplateCompilerTraversalCompletionAuditReasonKind,
    summary: string,
  ): void => {
    if (!reasons.some((reason) => reason.reasonKind === reasonKind)) {
      reasons.push(new TemplateCompilerTraversalCompletionAuditReason(reasonKind, summary));
    }
  };

  if (!transcript.isModuleConstructed()) {
    refuse(
      TemplateCompilerTraversalCompletionAuditReasonKind.ForeignTranscript,
      'Compiler traversal completion requires one module-constructed cursor transcript.',
    );
  }
  if (transcript.frontier != null) {
    refuse(
      TemplateCompilerTraversalCompletionAuditReasonKind.CursorFrontier,
      `Cursor stopped at '${transcript.frontier.frontierKind}'.`,
    );
  }
  switch (transcript.rootState.stateKind) {
    case TemplateCompilerRootCompilationStateKind.Invalid:
      refuse(
        TemplateCompilerTraversalCompletionAuditReasonKind.RootStateInvalid,
        'Reached root-global compiler output is invalid.',
      );
      break;
    case TemplateCompilerRootCompilationStateKind.Open:
      refuse(
        TemplateCompilerTraversalCompletionAuditReasonKind.RootStateOpen,
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
      TemplateCompilerTraversalCompletionAuditReasonKind.RootPhaseIncomplete,
      'Cursor did not complete the root surrogate-end phase.',
    );
  }

  if (endpoint == null) {
    refuse(
      TemplateCompilerTraversalCompletionAuditReasonKind.EndpointMissing,
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
      TemplateCompilerTraversalCompletionAuditReasonKind.EndpointMismatch,
      'Session-owned site endpoint does not match the transcript and current pre-plan execution frontier.',
    );
  }

  const processContentEvents = transcript.events.filter(
    (event): event is TemplateCompilerSiteCursorProcessContentEvent =>
      event instanceof TemplateCompilerSiteCursorProcessContentEvent,
  );
  if (
    endpoint != null
    && !sameObjects(endpoint.siteOperations, processContentEvents.map((event) => event.result.operation))
  ) {
    refuse(
      TemplateCompilerTraversalCompletionAuditReasonKind.SiteOperationMismatch,
      'Released site-operation suffix is not represented exactly by cursor effect events.',
    );
  }

  const compilerReads = [...transcript.compilerReads.readAll()];
  if (compilerReads.some((read) =>
    read.closure.state !== TemplateCompilerScopeClosureState.Closed
    || !read.validate().isCurrent
  )) {
    refuse(
      TemplateCompilerTraversalCompletionAuditReasonKind.CompilerReadOpen,
      'One or more compiler reads are open or no longer current at traversal completion.',
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
      TemplateCompilerTraversalCompletionAuditReasonKind.AccountingMismatch,
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
      TemplateCompilerTraversalCompletionAuditReasonKind.UnexplainedAuthoredRemainder,
      'Every raw-unspent authored bundle must have exactly its cursor-owned pre-walk remainder receipt.',
    );
  }

  const letEvents = transcript.events.filter((event): event is TemplateCompilerSiteCursorLetElementEvent =>
    event instanceof TemplateCompilerSiteCursorLetElementEvent
  );
  const letElementEvents = new Set(letEvents.map((event) => event.elementEvent));
  const attributeEvents = transcript.events.filter((event): event is TemplateCompilerSiteCursorAttributeEvent =>
    event instanceof TemplateCompilerSiteCursorAttributeEvent
  );
  const elementEvents = transcript.events.filter((event): event is TemplateCompilerSiteCursorElementEvent =>
    event instanceof TemplateCompilerSiteCursorElementEvent && !letElementEvents.has(event)
  );
  const textEvents = transcript.events.filter((event): event is TemplateCompilerSiteCursorTextEvent =>
    event instanceof TemplateCompilerSiteCursorTextEvent
  );
  if (
    transcript.attributeOwners.some((owner) =>
      owner.completion !== TemplateCompilerLiveAttributeCompletion.Complete
      || owner.instructionStaging.state !== TemplateCompilerElementInstructionStagingState.Complete
    )
    || attributeEvents.some((event) => event.siteOutcome !== TemplateCompilerSiteCursorSiteOutcome.Complete)
    || textEvents.some((event) =>
      event.siteOutcome !== TemplateCompilerSiteCursorSiteOutcome.Complete
      && event.siteOutcome !== TemplateCompilerSiteCursorSiteOutcome.NotApplicable
    )
  ) {
    refuse(
      TemplateCompilerTraversalCompletionAuditReasonKind.LiveSiteIncomplete,
      'One or more reached attribute/text sites lack complete live semantic staging.',
    );
  }
  if (
    transcript.allocationSnapshot.state !== TemplateCompilerLiveAllocationSnapshotState.Complete
    || !transcript.allocationSnapshot.isCurrent()
  ) {
    refuse(
      TemplateCompilerTraversalCompletionAuditReasonKind.AllocationOpen,
      'Reached live allocation inventory contains an unbound instruction or expression slot.',
    );
  }

  const containerlessPlacements = transcript.events.filter(
    (event): event is TemplateCompilerSiteCursorContainerlessPlacementEvent =>
      event instanceof TemplateCompilerSiteCursorContainerlessPlacementEvent,
  );
  return new TemplateCompilerTraversalCompletionAudit(
    traversalCompletionAuditAuthority,
    transcript,
    endpoint,
    compilerReads,
    elementEvents,
    attributeEvents,
    textEvents,
    letEvents,
    processContentEvents,
    containerlessPlacements,
    reasons,
  );
}

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
