import type { TemplateCompilerReadObservation } from './compiler-read-view.js';
import {
  auditTemplateCompilerTraversalCompletion,
  type TemplateCompilerTraversalCompletionAudit,
  type TemplateCompilerTraversalCompletionAuditReasonKind,
} from './template-compiler-completion-audit.js';
import type { TemplateCompilerSiteExecutionEndpointReceipt } from './template-compiler-execution.js';
import {
  TemplateCompilerHydrateElementBlockerKind,
  TemplateCompilerHydrateElementBlockerScope,
  TemplateCompilerHydrateElementProcessContentState,
  TemplateCompilerHydrateElementProjectionState,
  TemplateCompilerHydrateElementStagingState,
  type TemplateCompilerHydrateElementBlocker,
  type TemplateCompilerHydrateElementStagingResult,
} from './template-compiler-hydrate-element-staging.js';
import {
  TemplateCompilerSiteCursorContainerlessPlacementEvent,
  TemplateCompilerSiteCursorElementEvent,
  type TemplateCompilerSiteCursorEvent,
  TemplateCompilerSiteCursorIgnoredNodeEvent,
  TemplateCompilerSiteCursorProcessContentEvent,
  type TemplateCompilerSiteCursorProjectionEntrantBandStaging,
  TemplateCompilerSiteCursorProjectionExtractionEvent,
  TemplateCompilerSiteCursorSubtreeExclusionEvent,
  TemplateCompilerSiteCursorTextEvent,
} from './template-compiler-site-cursor-event.js';
import {
  TemplateCompilerSiteCursorTraversalMode,
  type TemplateCompilerSiteCursorTranscript,
} from './template-compiler-site-cursor.js';
import {
  TemplateCompilerSiteCursorContextKind,
  TemplateCompilerSiteCursorContextTaskState,
  type TemplateCompilerSiteCursorContextTaskSnapshot,
  TemplateCompilerSiteCursorLogicalEntrantWork,
  type TemplateCompilerSiteCursorContextReference,
} from './template-compiler-site-cursor-task.js';
import {
  TemplateCompilerOccurrenceOnlyDisposition,
  type TemplateCompilerOccurrenceOnlyRow,
  TemplateCompilerSiteSpendDisposition,
  type TemplateCompilerSiteSpend,
} from './template-compiler-site-spend-ledger.js';

const contextFamilyTraversalAuthority = {};
const contextFamilyCompletionAuthority = {};

export const enum TemplateCompilerContextFamilyCompletionState {
  Complete = 'complete',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerContextFamilyCompletionReasonKind {
  TraversalModeMismatch = 'traversal-mode-mismatch',
  ContextFamilyMissing = 'context-family-missing',
  ContextTaskIncomplete = 'context-task-incomplete',
  ReachedSiteCoverageMismatch = 'reached-site-coverage-mismatch',
  HydrateElementIncomplete = 'hydrate-element-incomplete',
  ProjectionEvidenceMismatch = 'projection-evidence-mismatch',
  ProjectionEntrantStagingMismatch = 'projection-entrant-staging-mismatch',
  ProjectionContextOrderMismatch = 'projection-context-order-mismatch',
  ProjectionAccountingMismatch = 'projection-accounting-mismatch',
  EffectAccountingMismatch = 'effect-accounting-mismatch',
  ExplicitShadowUnsupported = 'explicit-shadow-unsupported',
  ContainerlessPlacementMismatch = 'containerless-placement-mismatch',
  TemplateControllerTransitionMissing = 'template-controller-transition-missing',
}

export class TemplateCompilerContextFamilyCompletionReason {
  constructor(
    readonly reasonKind:
      | TemplateCompilerTraversalCompletionAuditReasonKind
      | TemplateCompilerContextFamilyCompletionReasonKind,
    readonly summary: string,
  ) {}
}

/** Exact projection extraction edge that owns one generated projection traversal context. */
export class TemplateCompilerCompletedProjectionContext {
  constructor(
    readonly event: TemplateCompilerSiteCursorProjectionExtractionEvent,
    readonly staging: TemplateCompilerSiteCursorProjectionEntrantBandStaging,
  ) {
    if (
      !event.isCoherent()
      || staging.band.context.contextKind !== TemplateCompilerSiteCursorContextKind.Projection
      || !event.entrantBandStagings.includes(staging)
      || !staging.isCoherent()
    ) {
      throw new Error('Completed projection context lost extraction-event or entrant-staging authority.');
    }
  }

  get context(): TemplateCompilerSiteCursorContextReference {
    return this.staging.band.context;
  }
}

/** HE staging after cursor-owned family effects discharge only their exact envelope blockers. */
export class TemplateCompilerCompletedFamilyHydrateElement {
  constructor(
    readonly staging: TemplateCompilerHydrateElementStagingResult,
    readonly projectionExtraction: TemplateCompilerSiteCursorProjectionExtractionEvent | null,
    readonly containerlessPlacement: TemplateCompilerSiteCursorContainerlessPlacementEvent | null,
    readonly dischargedBlockers: readonly TemplateCompilerHydrateElementBlocker[],
    readonly forwardedBlockers: readonly TemplateCompilerHydrateElementBlocker[],
  ) {}
}

/** Reached element evidence only; final row slot, placement ownership, and membership remain deliberately absent. */
export class TemplateCompilerCompletedFamilyElementReach {
  readonly reachKind = 'element' as const;

  constructor(
    readonly event: TemplateCompilerSiteCursorElementEvent,
    readonly owner: TemplateCompilerSiteCursorTranscript['attributeOwners'][number],
    readonly hydrateElement: TemplateCompilerCompletedFamilyHydrateElement,
  ) {
    if (
      owner.element !== event.element
      || hydrateElement.staging.element !== event.element
      || hydrateElement.staging.owner !== owner
    ) {
      throw new Error('Completed family element reach lost event, owner, or HE evidence.');
    }
  }
}

/** Reached text evidence only; interpolation row ownership remains a later context-lowering decision. */
export class TemplateCompilerCompletedFamilyTextReach {
  readonly reachKind = 'text' as const;

  constructor(readonly event: TemplateCompilerSiteCursorTextEvent) {}
}

export type TemplateCompilerCompletedFamilyReach =
  | TemplateCompilerCompletedFamilyElementReach
  | TemplateCompilerCompletedFamilyTextReach;

/** Context-local reached-site summary. It deliberately does not claim final target-row or membership ownership. */
export class TemplateCompilerCompletedContextTraversal {
  readonly context: TemplateCompilerSiteCursorContextReference;

  constructor(
    readonly task: TemplateCompilerSiteCursorContextTaskSnapshot,
    readonly reachedSites: readonly TemplateCompilerCompletedFamilyReach[],
    readonly elementSites: readonly TemplateCompilerCompletedFamilyElementReach[],
    readonly textSites: readonly TemplateCompilerCompletedFamilyTextReach[],
    readonly ignoredNodes: readonly TemplateCompilerSiteCursorIgnoredNodeEvent[],
    readonly exclusions: readonly TemplateCompilerSiteCursorSubtreeExclusionEvent[],
    readonly processContentEffects: readonly TemplateCompilerSiteCursorProcessContentEvent[],
    readonly projectionExtractions: readonly TemplateCompilerSiteCursorProjectionExtractionEvent[],
    readonly containerlessPlacements: readonly TemplateCompilerSiteCursorContainerlessPlacementEvent[],
    readonly projectionOwner: TemplateCompilerCompletedProjectionContext | null,
  ) {
    this.context = task.context;
    if (
      task.state !== TemplateCompilerSiteCursorContextTaskState.Drained
      || task.remainingWork.length !== 0
      || task.frontier != null
      || reachedSites.length !== elementSites.length + textSites.length
      || reachedSites.some((site, ordinal) =>
        ordinal > 0 && reachedSites[ordinal - 1]!.event.ordinal >= site.event.ordinal
      )
      || (task.context.contextKind === TemplateCompilerSiteCursorContextKind.Projection) !== (projectionOwner != null)
      || (projectionOwner != null && projectionOwner.context !== task.context)
    ) {
      throw new Error('Completed compiler context traversal lost task, site order, or projection ownership.');
    }
  }
}

/** Otherwise exact drained family traversal, retained even when TC lowering ownership remains Pending. */
export class TemplateCompilerContextFamilyTraversal {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly audit: TemplateCompilerTraversalCompletionAudit,
    readonly contexts: readonly TemplateCompilerCompletedContextTraversal[],
    readonly hydrateElements: readonly TemplateCompilerCompletedFamilyHydrateElement[],
    readonly projectionExtractions: readonly TemplateCompilerSiteCursorProjectionExtractionEvent[],
    readonly hasTemplateControllerContexts: boolean,
  ) {
    if (
      authority !== contextFamilyTraversalAuthority
      || !audit.isModuleConstructed()
      || !audit.isGloballyExact
      || contexts.length !== audit.transcript.taskSnapshot.contexts.length
      || contexts.some((context, ordinal) => context.task !== audit.transcript.taskSnapshot.contexts[ordinal])
      || hydrateElements.length !== audit.transcript.hydrateElementEnvelopes.length
      || hasTemplateControllerContexts !== contexts.some((context) =>
        context.context.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController
      )
    ) {
      throw new Error('Compiler context-family traversal lost common audit, context, or HE coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === contextFamilyTraversalAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed() && this.audit.isCurrent();
  }
}

/** Nominal successful traversal closure; target lowering and structural execution remain later owners. */
export class TemplateCompilerContextFamilyCompletionReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly traversal: TemplateCompilerContextFamilyTraversal,
    readonly endpoint: TemplateCompilerSiteExecutionEndpointReceipt,
    readonly compilerReads: readonly TemplateCompilerReadObservation[],
  ) {
    if (
      authority !== contextFamilyCompletionAuthority
      || !traversal.isModuleConstructed()
      || traversal.hasTemplateControllerContexts
      || traversal.audit.endpoint !== endpoint
      || traversal.audit.compilerReads !== compilerReads
    ) {
      throw new Error('Compiler context-family completion lost traversal, endpoint, or closed-read authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === contextFamilyCompletionAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed() && this.traversal.isCurrent();
  }
}

export class TemplateCompilerContextFamilyCompletionResult {
  constructor(
    readonly state: TemplateCompilerContextFamilyCompletionState,
    readonly audit: TemplateCompilerTraversalCompletionAudit,
    readonly traversal: TemplateCompilerContextFamilyTraversal | null,
    readonly receipt: TemplateCompilerContextFamilyCompletionReceipt | null,
    readonly reasons: readonly TemplateCompilerContextFamilyCompletionReason[],
  ) {
    if (
      (state === TemplateCompilerContextFamilyCompletionState.Complete)
        !== (receipt != null && traversal != null && reasons.length === 0)
      || (state === TemplateCompilerContextFamilyCompletionState.Pending)
        !== (receipt == null && traversal != null && reasons.length > 0)
      || (state === TemplateCompilerContextFamilyCompletionState.Ineligible)
        !== (receipt == null && traversal == null && reasons.length > 0)
      || (receipt != null && receipt.traversal !== traversal)
    ) {
      throw new Error('Compiler context-family completion result lost complete/pending/ineligible ownership.');
    }
  }
}

/** Close one fully drained generated-context traversal without lowering target rows or mutating structure. */
export function completeTemplateCompilerContextFamily(
  transcript: TemplateCompilerSiteCursorTranscript,
  endpoint: TemplateCompilerSiteExecutionEndpointReceipt | null,
): TemplateCompilerContextFamilyCompletionResult {
  const audit = auditTemplateCompilerTraversalCompletion(transcript, endpoint);
  const projectionEvents = transcript.events.filter(
    (event): event is TemplateCompilerSiteCursorProjectionExtractionEvent =>
      event instanceof TemplateCompilerSiteCursorProjectionExtractionEvent,
  );
  const reasons = audit.reasons.map((reason) => new TemplateCompilerContextFamilyCompletionReason(
    reason.reasonKind,
    reason.summary,
  ));
  const refuse = (reasonKind: TemplateCompilerContextFamilyCompletionReasonKind, summary: string): void => {
    if (!reasons.some((reason) => reason.reasonKind === reasonKind)) {
      reasons.push(new TemplateCompilerContextFamilyCompletionReason(reasonKind, summary));
    }
  };

  if (transcript.traversalMode !== TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily) {
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.TraversalModeMismatch,
      'Context-family completion requires the opt-in closed-context-family cursor mode.',
    );
  }
  if (
    (transcript.taskSnapshot.contexts.length <= 1 && projectionEvents.length === 0)
    || transcript.taskSnapshot.contexts[0]?.context !== transcript.taskSnapshot.rootContext
  ) {
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.ContextFamilyMissing,
      'Context-family completion requires at least one generated traversal context.',
    );
  }
  if (
    transcript.taskSnapshot.taskStack.length !== 0
    || transcript.taskSnapshot.contexts.some((task) =>
      task.state !== TemplateCompilerSiteCursorContextTaskState.Drained
      || task.remainingWork.length !== 0
      || task.frontier != null
    )
  ) {
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.ContextTaskIncomplete,
      'Context-family completion requires a fully drained task tree and empty scheduler stack.',
    );
  }
  if (reasons.length > 0) return ineligible(audit, reasons);

  const projectionOwners = validateProjectionContexts(transcript, projectionEvents, refuse);
  validateProjectionAccounting(transcript, projectionEvents, refuse);
  validateEffectAndExclusionAccounting(transcript, refuse);
  const hydrateElements = validateHydrateElements(audit, projectionEvents, refuse);
  const hydrateElementByElement = new Map(hydrateElements.map((entry) => [entry.staging.element, entry]));
  validateContainerlessPlacements(audit, projectionEvents, refuse);
  const templateControllerContextCount = transcript.taskSnapshot.contexts.filter((task) =>
    task.context.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController
  ).length;
  const templateControllerDraftCount = transcript.attributeOwners.reduce(
    (count, owner) => count + owner.instructionStaging.templateControllers.length,
    0,
  );
  if (templateControllerContextCount !== templateControllerDraftCount) {
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.ContextTaskIncomplete,
      'Template-controller draft and generated task-context cardinality diverged.',
    );
  }
  if (reasons.length > 0) return ineligible(audit, reasons);

  const hasTemplateControllerContexts = templateControllerContextCount > 0;
  const contexts = transcript.taskSnapshot.contexts.map((task) => completedContext(
    audit,
    task,
    projectionOwners.get(task.context) ?? null,
    hydrateElementByElement,
  ));
  const traversal = new TemplateCompilerContextFamilyTraversal(
    contextFamilyTraversalAuthority,
    audit,
    contexts,
    hydrateElements,
    projectionEvents,
    hasTemplateControllerContexts,
  );
  if (hasTemplateControllerContexts) {
    return new TemplateCompilerContextFamilyCompletionResult(
      TemplateCompilerContextFamilyCompletionState.Pending,
      audit,
      traversal,
      null,
      [new TemplateCompilerContextFamilyCompletionReason(
        TemplateCompilerContextFamilyCompletionReasonKind.TemplateControllerTransitionMissing,
        'Template-controller traversal is closed, but final source membership and row ownership need a nominal TC transition product.',
      )],
    );
  }
  const exactEndpoint = audit.endpoint;
  if (exactEndpoint == null) throw new Error('Exact context-family audit lost its endpoint.');
  const receipt = new TemplateCompilerContextFamilyCompletionReceipt(
    contextFamilyCompletionAuthority,
    traversal,
    exactEndpoint,
    audit.compilerReads,
  );
  return new TemplateCompilerContextFamilyCompletionResult(
    TemplateCompilerContextFamilyCompletionState.Complete,
    audit,
    traversal,
    receipt,
    [],
  );
}

function validateProjectionContexts(
  transcript: TemplateCompilerSiteCursorTranscript,
  events: readonly TemplateCompilerSiteCursorProjectionExtractionEvent[],
  refuse: (reasonKind: TemplateCompilerContextFamilyCompletionReasonKind, summary: string) => void,
): ReadonlyMap<TemplateCompilerSiteCursorContextReference, TemplateCompilerCompletedProjectionContext> {
  const tasks = transcript.taskSnapshot;
  const owners = new Map<TemplateCompilerSiteCursorContextReference, TemplateCompilerCompletedProjectionContext>();
  for (const event of events) {
    let previousNonEmptyContextEventEnd = -1;
    if (
      !event.isCoherent()
      || event.preparation.residuals.length > 0
      || tasks.contextForEvent(event) !== tasks.contextForEvent(event.preparation.elementEvent)
    ) {
      refuse(
        event.preparation.residuals.length > 0
          ? TemplateCompilerContextFamilyCompletionReasonKind.ExplicitShadowUnsupported
          : TemplateCompilerContextFamilyCompletionReasonKind.ProjectionEvidenceMismatch,
        'Projection extraction lost same-context host ownership or retained explicit-shadow residuals.',
      );
      continue;
    }
    const expectedParent = event.realization.request.continuation.context;
    for (const staging of event.entrantBandStagings) {
      const context = staging.band.context;
      const task = tasks.taskForContext(context);
      if (
        owners.has(context)
        || task == null
        || context.contextKind !== TemplateCompilerSiteCursorContextKind.Projection
        || context.parent !== expectedParent
        || !task.logicalEntrantBandStaged
        || !staging.isCoherent()
      ) {
        refuse(
          TemplateCompilerContextFamilyCompletionReasonKind.ProjectionEvidenceMismatch,
          `Projection context '${context.localKey}' lost its unique extraction owner or staged-band authority.`,
        );
        continue;
      }
      const primaryWorkByEvent = task.eventBindings.flatMap((binding) => {
        if (!(binding.work instanceof TemplateCompilerSiteCursorLogicalEntrantWork)) return [];
        return cursorEventNode(binding.event) === binding.work.node ? [binding.work] : [];
      });
      if (
        !sameObjects(primaryWorkByEvent, staging.works)
        || (staging.works.length === 0 && task.events.length !== 0)
      ) {
        refuse(
          TemplateCompilerContextFamilyCompletionReasonKind.ProjectionEntrantStagingMismatch,
          `Projection context '${context.localKey}' did not drain exactly its realized entrant work.`,
        );
      }
      const eventOrdinals = contextSubtreeEvents(tasks, context).map((candidate) => candidate.ordinal);
      if (eventOrdinals.length > 0) {
        const first = Math.min(...eventOrdinals);
        const last = Math.max(...eventOrdinals);
        if (first <= event.ordinal || first <= previousNonEmptyContextEventEnd) {
          refuse(
            TemplateCompilerContextFamilyCompletionReasonKind.ProjectionContextOrderMismatch,
            'Projection contexts did not execute in exact group-major order after their extraction event.',
          );
        }
        previousNonEmptyContextEventEnd = last;
      }
      owners.set(context, new TemplateCompilerCompletedProjectionContext(event, staging));
    }
  }
  const projectionTasks = tasks.contexts.filter((task) =>
    task.context.contextKind === TemplateCompilerSiteCursorContextKind.Projection
  );
  if (
    owners.size !== projectionTasks.length
    || projectionTasks.some((task) => !owners.has(task.context))
  ) {
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.ProjectionEvidenceMismatch,
      'Every generated projection context requires exactly one extraction-event entrant-band owner.',
    );
  }
  return owners;
}

function validateProjectionAccounting(
  transcript: TemplateCompilerSiteCursorTranscript,
  events: readonly TemplateCompilerSiteCursorProjectionExtractionEvent[],
  refuse: (reasonKind: TemplateCompilerContextFamilyCompletionReasonKind, summary: string) => void,
): void {
  const eventSpends = events.flatMap((event) => event.authoredSlotSpends);
  const eventRows = events.flatMap((event) => event.occurrenceOnlySlotRows);
  const ledgerSpends = transcript.ledger.spends.filter((spend) =>
    spend.disposition === TemplateCompilerSiteSpendDisposition.ProjectionSlotAttributeConsumed
  );
  const ledgerRows = transcript.ledger.occurrenceOnlyRows.filter((row) =>
    row.disposition === TemplateCompilerOccurrenceOnlyDisposition.ProjectionSlotAttributeConsumed
  );
  if (
    !sameObjects(eventSpends, ledgerSpends)
    || !sameObjects(eventRows, ledgerRows)
    || new Set<TemplateCompilerSiteSpend>(eventSpends).size !== eventSpends.length
    || new Set<TemplateCompilerOccurrenceOnlyRow>(eventRows).size !== eventRows.length
  ) {
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.ProjectionAccountingMismatch,
      'Projection extraction events do not own a bijection over null-ordinal slot accounting rows.',
    );
  }
}

function validateEffectAndExclusionAccounting(
  transcript: TemplateCompilerSiteCursorTranscript,
  refuse: (reasonKind: TemplateCompilerContextFamilyCompletionReasonKind, summary: string) => void,
): void {
  const processEvents = transcript.events.filter(
    (event): event is TemplateCompilerSiteCursorProcessContentEvent =>
      event instanceof TemplateCompilerSiteCursorProcessContentEvent,
  );
  const exclusionEvents = transcript.events.filter(
    (event): event is TemplateCompilerSiteCursorSubtreeExclusionEvent =>
      event instanceof TemplateCompilerSiteCursorSubtreeExclusionEvent,
  );
  const eventProcessSpends = processEvents.flatMap((event) => event.removedSpends);
  const ledgerProcessSpends = transcript.ledger.spends.filter((spend) =>
    spend.disposition === TemplateCompilerSiteSpendDisposition.ProcessContentRemoved
  );
  const eventExclusionSpends = exclusionEvents.flatMap((event) => event.spends);
  const ledgerExclusionSpends = transcript.ledger.spends.filter((spend) =>
    spend.disposition === TemplateCompilerSiteSpendDisposition.InertTemplateContent
    || spend.disposition === TemplateCompilerSiteSpendDisposition.LetContentSuppressed
  );
  if (
    !sameObjects(eventProcessSpends, ledgerProcessSpends)
    || !sameObjects(eventExclusionSpends, ledgerExclusionSpends)
    || new Set(eventProcessSpends).size !== eventProcessSpends.length
    || new Set(eventExclusionSpends).size !== eventExclusionSpends.length
    || processEvents.some((event) =>
      !event.isCoherent()
      || event.removedSpends.some((spend) => spend.siteEventOrdinal != null)
    )
    || exclusionEvents.some((event) => event.spends.some((spend) =>
      spend.siteEventOrdinal != null
      || spend.disposition !== event.disposition
    ))
  ) {
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.EffectAccountingMismatch,
      'Process and subtree-exclusion events do not own a bijection over their null-ordinal ledger spends.',
    );
  }
}

function validateHydrateElements(
  audit: TemplateCompilerTraversalCompletionAudit,
  projectionEvents: readonly TemplateCompilerSiteCursorProjectionExtractionEvent[],
  refuse: (reasonKind: TemplateCompilerContextFamilyCompletionReasonKind, summary: string) => void,
): readonly TemplateCompilerCompletedFamilyHydrateElement[] {
  const eventByDraft = new Map(projectionEvents.map((event) => [event.preparation.request.envelope, event]));
  if (eventByDraft.size !== projectionEvents.length) {
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.ProjectionEvidenceMismatch,
      'More than one projection extraction event claims the same HE envelope.',
    );
  }
  const completed = audit.transcript.hydrateElementEnvelopes.map((staging) => {
    const draft = staging.draft;
    const event = draft == null ? null : eventByDraft.get(draft) ?? null;
    const envelopeBlockers = staging.blockers.filter((blocker) =>
      blocker.scope === TemplateCompilerHydrateElementBlockerScope.Envelope
    );
    const projectionIsDischarged = staging.state === TemplateCompilerHydrateElementStagingState.Pending
      && draft?.projection.state === TemplateCompilerHydrateElementProjectionState.PendingExtraction
      && envelopeBlockers.length === 1
      && envelopeBlockers[0]?.blockerKind === TemplateCompilerHydrateElementBlockerKind.ProjectionExtractionPending
      && event?.preparation.request.envelope === draft
      && event.realization.request.preparation === event.preparation;
    const semanticallyClosed = staging.state === TemplateCompilerHydrateElementStagingState.NotApplicable
      || staging.state === TemplateCompilerHydrateElementStagingState.Exact
      || projectionIsDischarged;
    if (!semanticallyClosed || (event != null) !== projectionIsDischarged) {
      refuse(
        TemplateCompilerContextFamilyCompletionReasonKind.HydrateElementIncomplete,
        `HydrateElement '${staging.element.occurrenceKey}' retains an undisclosed envelope blocker or foreign projection event.`,
      );
    }
    const placement = audit.placementsByElement.get(staging.element) ?? null;
    const dischargedBlockers = staging.blockers.filter((blocker) =>
      (blocker.blockerKind === TemplateCompilerHydrateElementBlockerKind.ProjectionExtractionPending
        && projectionIsDischarged)
      || (blocker.blockerKind === TemplateCompilerHydrateElementBlockerKind.ContainerlessPlacementPending
        && placement != null)
    );
    const forwardedBlockers = staging.blockers.filter((blocker) =>
      blocker.scope === TemplateCompilerHydrateElementBlockerScope.Downstream
      && !dischargedBlockers.includes(blocker)
    );
    return new TemplateCompilerCompletedFamilyHydrateElement(
      staging,
      event,
      placement,
      dischargedBlockers,
      forwardedBlockers,
    );
  });
  if (eventByDraft.size !== projectionEvents.length || projectionEvents.some((event) =>
    !completed.some((entry) => entry.projectionExtraction === event)
  )) {
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.ProjectionEvidenceMismatch,
      'Projection extraction events are not a bijection over projection-pending HE envelopes.',
    );
  }
  return completed;
}

function validateContainerlessPlacements(
  audit: TemplateCompilerTraversalCompletionAudit,
  projectionEvents: readonly TemplateCompilerSiteCursorProjectionExtractionEvent[],
  refuse: (reasonKind: TemplateCompilerContextFamilyCompletionReasonKind, summary: string) => void,
): void {
  const projectionByHost = new Map(projectionEvents.map((event) => [event.host, event]));
  if (audit.transcript.hydrateElementEnvelopes.some((staging) => {
    const draft = staging.draft;
    const placement = audit.placementsByElement.get(staging.element) ?? null;
    if (draft?.containerless.effective !== true) return placement != null;
    if (placement == null || placement.envelope !== draft) return true;
    const projection = projectionByHost.get(staging.element) ?? null;
    if (placement.projectionExtraction !== projection) return true;
    if (
      draft.processContent.state !== TemplateCompilerHydrateElementProcessContentState.Absent
      || (projection == null && staging.element.readChildren().length > 0)
      || (projection != null && projection.preparation.residuals.length > 0)
    ) return true;
    const ownerEvents = audit.transcript.taskSnapshot.taskForContext(
      audit.transcript.taskSnapshot.contextForEvent(placement)!,
    )?.events ?? [];
    const projectionContextEvents = projection?.entrantBandStagings.flatMap((entry) =>
      contextSubtreeEvents(audit.transcript.taskSnapshot, entry.band.context)
    ) ?? [];
    const prerequisites = [
      ...audit.attributeEvents.filter((event) => event.owner === staging.element),
      ...audit.processContentEvents.filter((event) => event.host === staging.element),
      ...(projection == null ? [] : [projection]),
      ...projectionContextEvents,
    ];
    const lastPrerequisite = Math.max(
      audit.elementEvents.find((event) => event.element === staging.element)?.ordinal ?? -1,
      ...prerequisites.map((event) => event.ordinal),
    );
    return placement.ordinal !== lastPrerequisite + 1
      || !ownerEvents.includes(placement);
  })) {
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.ContainerlessPlacementMismatch,
      'Effective containerless hosts require one exact post-projection placement in continuation order.',
    );
  }
}

function completedContext(
  audit: TemplateCompilerTraversalCompletionAudit,
  task: TemplateCompilerSiteCursorContextTaskSnapshot,
  projectionOwner: TemplateCompilerCompletedProjectionContext | null,
  hydrateElementByElement: ReadonlyMap<
    TemplateCompilerSiteCursorElementEvent['element'],
    TemplateCompilerCompletedFamilyHydrateElement
  >,
): TemplateCompilerCompletedContextTraversal {
  const elementEvents = task.events.filter((event): event is TemplateCompilerSiteCursorElementEvent =>
    event instanceof TemplateCompilerSiteCursorElementEvent && audit.elementEvents.includes(event)
  );
  const textEvents = task.events.filter((event): event is TemplateCompilerSiteCursorTextEvent =>
    event instanceof TemplateCompilerSiteCursorTextEvent && audit.textEvents.includes(event)
  );
  const elementSites = elementEvents.map((event) => new TemplateCompilerCompletedFamilyElementReach(
    event,
    audit.ownersByElement.get(event.element)!,
    hydrateElementByElement.get(event.element)!,
  ));
  const textSites = textEvents.map((event) => new TemplateCompilerCompletedFamilyTextReach(event));
  const siteByEvent = new Map<TemplateCompilerSiteCursorEvent, TemplateCompilerCompletedFamilyReach>([
    ...elementSites.map((site) => [site.event, site] as const),
    ...textSites.map((site) => [site.event, site] as const),
  ]);
  const reachedSites = task.events.flatMap((event) => {
    const site = siteByEvent.get(event);
    return site == null ? [] : [site];
  });
  return new TemplateCompilerCompletedContextTraversal(
    task,
    reachedSites,
    elementSites,
    textSites,
    task.events.filter((event): event is TemplateCompilerSiteCursorIgnoredNodeEvent =>
      event instanceof TemplateCompilerSiteCursorIgnoredNodeEvent
    ),
    task.events.filter((event): event is TemplateCompilerSiteCursorSubtreeExclusionEvent =>
      event instanceof TemplateCompilerSiteCursorSubtreeExclusionEvent
    ),
    task.events.filter((event): event is TemplateCompilerSiteCursorProcessContentEvent =>
      event instanceof TemplateCompilerSiteCursorProcessContentEvent
    ),
    task.events.filter((event): event is TemplateCompilerSiteCursorProjectionExtractionEvent =>
      event instanceof TemplateCompilerSiteCursorProjectionExtractionEvent
    ),
    task.events.filter((event): event is TemplateCompilerSiteCursorContainerlessPlacementEvent =>
      event instanceof TemplateCompilerSiteCursorContainerlessPlacementEvent
    ),
    projectionOwner,
  );
}

function cursorEventNode(event: TemplateCompilerSiteCursorEvent): object | null {
  if (event instanceof TemplateCompilerSiteCursorElementEvent) return event.element;
  if (event instanceof TemplateCompilerSiteCursorTextEvent) return event.text;
  if (event instanceof TemplateCompilerSiteCursorIgnoredNodeEvent) return event.node;
  return null;
}

function contextSubtreeEvents(
  snapshot: TemplateCompilerSiteCursorTranscript['taskSnapshot'],
  root: TemplateCompilerSiteCursorContextReference,
): readonly TemplateCompilerSiteCursorEvent[] {
  return snapshot.contexts.flatMap((task) => {
    let context: TemplateCompilerSiteCursorContextReference | null = task.context;
    while (context != null && context !== root) context = context.parent;
    return context === root ? task.events : [];
  });
}

function ineligible(
  audit: TemplateCompilerTraversalCompletionAudit,
  reasons: readonly {
    readonly reasonKind:
      | TemplateCompilerTraversalCompletionAuditReasonKind
      | TemplateCompilerContextFamilyCompletionReasonKind;
    readonly summary: string;
  }[],
): TemplateCompilerContextFamilyCompletionResult {
  return new TemplateCompilerContextFamilyCompletionResult(
    TemplateCompilerContextFamilyCompletionState.Ineligible,
    audit,
    null,
    null,
    reasons.map((reason) => new TemplateCompilerContextFamilyCompletionReason(
      reason.reasonKind,
      reason.summary,
    )),
  );
}

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, ordinal) => right[ordinal] === value);
}
