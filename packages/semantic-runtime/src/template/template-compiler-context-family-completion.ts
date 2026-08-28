import type { TemplateCompilerReadObservation } from './compiler-read-view.js';
import {
  auditTemplateCompilerTraversalCompletion,
  type TemplateCompilerTraversalCompletionAudit,
  type TemplateCompilerTraversalCompletionAuditReasonKind,
} from './template-compiler-completion-audit.js';
import type { TemplateCompilerSiteExecutionEndpointReceipt } from './template-compiler-execution.js';
import { TemplateCompilerTargetRowPlacementKind } from './compiler-target-plan.js';
import {
  isTemplateCompilerProcessContentSettledForHost,
  TemplateCompilerHydrateElementBlockerKind,
  TemplateCompilerHydrateElementBlockerScope,
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
  TemplateCompilerSiteCursorLetElementEvent,
  TemplateCompilerSiteCursorProcessContentEvent,
  type TemplateCompilerSiteCursorProjectionEntrantBandStaging,
  TemplateCompilerSiteCursorProjectionExtractionEvent,
  TemplateCompilerSiteCursorSubtreeExclusionEvent,
  TemplateCompilerSiteCursorTemplateControllerTransitionEvent,
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
import type {
  TemplateCompilerTemplateControllerLeafRehomingReceipt,
  TemplateCompilerTemplateControllerTransitionEdgeReceipt,
} from './template-compiler-template-controller-transition.js';

const contextFamilyTraversalAuthority = {};
const contextFamilyCompletionAuthority = {};

export const enum TemplateCompilerContextFamilyCompletionState {
  Complete = 'complete',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerContextFamilyCompletionMode {
  GeneratedOrEffectFamily = 'generated-or-effect-family',
  RootInclusiveFamily = 'root-inclusive-family',
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
  TemplateControllerTransitionEvidenceMismatch = 'template-controller-transition-evidence-mismatch',
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

/** Exact future HTC row edge that owns one generated TC traversal context. */
export class TemplateCompilerCompletedTemplateControllerContext {
  constructor(
    readonly event: TemplateCompilerSiteCursorTemplateControllerTransitionEvent,
    readonly edge: TemplateCompilerTemplateControllerTransitionEdgeReceipt,
  ) {
    if (
      !event.isCoherent()
      || !edge.isModuleConstructed()
      || edge.preparation !== event.preparation
      || !event.realization.edges.includes(edge)
      || edge.childContext.contextKind !== TemplateCompilerSiteCursorContextKind.TemplateController
    ) {
      throw new Error('Completed template-controller context lost transition-event or edge authority.');
    }
  }

  get context(): TemplateCompilerSiteCursorContextReference {
    return this.edge.childContext;
  }
}

/** Separate lowering authority that rehomes one reached host and its direct tail to the terminal TC leaf. */
export class TemplateCompilerCompletedTemplateControllerLeafRehoming {
  constructor(
    readonly event: TemplateCompilerSiteCursorTemplateControllerTransitionEvent,
    readonly receipt: TemplateCompilerTemplateControllerLeafRehomingReceipt,
  ) {
    if (
      !event.isCoherent()
      || !receipt.isModuleConstructed()
      || receipt !== event.realization.leafRehoming
      || receipt.preparation !== event.preparation
      || receipt.terminalLeaf !== event.realization.terminalLeaf
    ) {
      throw new Error('Completed template-controller leaf rehoming lost event or terminal-leaf authority.');
    }
  }
}

/** HE staging after cursor-owned family effects discharge only their exact envelope blockers. */
export class TemplateCompilerCompletedFamilyHydrateElement {
  constructor(
    readonly staging: TemplateCompilerHydrateElementStagingResult,
    readonly projectionExtraction: TemplateCompilerSiteCursorProjectionExtractionEvent | null,
    readonly templateControllerTransition: TemplateCompilerSiteCursorTemplateControllerTransitionEvent | null,
    readonly containerlessPlacement: TemplateCompilerSiteCursorContainerlessPlacementEvent | null,
    readonly dischargedBlockers: readonly TemplateCompilerHydrateElementBlocker[],
    readonly forwardedBlockers: readonly TemplateCompilerHydrateElementBlocker[],
  ) {
    if (
      (projectionExtraction != null
        && projectionExtraction.preparation.request.envelope !== staging.draft)
      || (templateControllerTransition != null
        && templateControllerTransition.preparation.request.hydrateElement !== staging)
      || (containerlessPlacement != null && containerlessPlacement.envelope !== staging.draft)
      || dischargedBlockers.some((blocker) => forwardedBlockers.includes(blocker))
    ) {
      throw new Error('Completed family HE evidence lost projection, TC, placement, or blocker ownership.');
    }
  }
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

/** Reached let evidence with exact dedicated lowering and nested instruction staging. */
export class TemplateCompilerCompletedFamilyLetReach {
  readonly reachKind = 'let' as const;

  constructor(readonly event: TemplateCompilerSiteCursorLetElementEvent) {}
}

export type TemplateCompilerCompletedFamilyReach =
  | TemplateCompilerCompletedFamilyElementReach
  | TemplateCompilerCompletedFamilyTextReach
  | TemplateCompilerCompletedFamilyLetReach;

/** Context-local reached-site summary. It deliberately does not claim final target-row or membership ownership. */
export class TemplateCompilerCompletedContextTraversal {
  readonly context: TemplateCompilerSiteCursorContextReference;

  constructor(
    readonly task: TemplateCompilerSiteCursorContextTaskSnapshot,
    readonly reachedSites: readonly TemplateCompilerCompletedFamilyReach[],
    readonly elementSites: readonly TemplateCompilerCompletedFamilyElementReach[],
    readonly textSites: readonly TemplateCompilerCompletedFamilyTextReach[],
    readonly letSites: readonly TemplateCompilerCompletedFamilyLetReach[],
    readonly ignoredNodes: readonly TemplateCompilerSiteCursorIgnoredNodeEvent[],
    readonly exclusions: readonly TemplateCompilerSiteCursorSubtreeExclusionEvent[],
    readonly processContentEffects: readonly TemplateCompilerSiteCursorProcessContentEvent[],
    readonly projectionExtractions: readonly TemplateCompilerSiteCursorProjectionExtractionEvent[],
    readonly templateControllerTransitions: readonly TemplateCompilerSiteCursorTemplateControllerTransitionEvent[],
    readonly containerlessPlacements: readonly TemplateCompilerSiteCursorContainerlessPlacementEvent[],
    readonly projectionOwner: TemplateCompilerCompletedProjectionContext | null,
    readonly templateControllerOwner: TemplateCompilerCompletedTemplateControllerContext | null,
  ) {
    this.context = task.context;
    if (
      task.state !== TemplateCompilerSiteCursorContextTaskState.Drained
      || task.remainingWork.length !== 0
      || task.frontier != null
      || reachedSites.length !== elementSites.length + textSites.length + letSites.length
      || reachedSites.some((site, ordinal) =>
        ordinal > 0 && reachedSites[ordinal - 1]!.event.ordinal >= site.event.ordinal
      )
      || (task.context.contextKind === TemplateCompilerSiteCursorContextKind.Projection) !== (projectionOwner != null)
      || (projectionOwner != null && projectionOwner.context !== task.context)
      || (templateControllerOwner != null && (
        task.context.contextKind !== TemplateCompilerSiteCursorContextKind.TemplateController
        || templateControllerOwner.context !== task.context
      ))
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
    readonly templateControllerTransitions: readonly TemplateCompilerSiteCursorTemplateControllerTransitionEvent[],
    readonly templateControllerLeafRehomings: readonly TemplateCompilerCompletedTemplateControllerLeafRehoming[],
    readonly hasTemplateControllerContexts: boolean,
    readonly templateControllerTransitionsComplete: boolean,
  ) {
    const templateControllerContexts = contexts.filter((context) =>
      context.context.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController
    );
    const transitionEdges = templateControllerTransitions.flatMap((event) => event.realization.edges);
    if (
      authority !== contextFamilyTraversalAuthority
      || !audit.isModuleConstructed()
      || !audit.isGloballyExact
      || contexts.length !== audit.transcript.taskSnapshot.contexts.length
      || contexts.some((context, ordinal) => context.task !== audit.transcript.taskSnapshot.contexts[ordinal])
      || hydrateElements.length !== audit.transcript.hydrateElementEnvelopes.length
      || templateControllerTransitions.length !== templateControllerLeafRehomings.length
      || templateControllerLeafRehomings.some((rehoming, ordinal) =>
        rehoming.event !== templateControllerTransitions[ordinal]
      )
      || hasTemplateControllerContexts !== contexts.some((context) =>
        context.context.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController
      )
      || (templateControllerTransitionsComplete && (
        transitionEdges.length !== templateControllerContexts.length
        || templateControllerContexts.some((context, ordinal) =>
          context.templateControllerOwner?.edge !== transitionEdges[ordinal]
        )
      ))
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
      || !traversal.templateControllerTransitionsComplete
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
  mode: TemplateCompilerContextFamilyCompletionMode =
    TemplateCompilerContextFamilyCompletionMode.GeneratedOrEffectFamily,
): TemplateCompilerContextFamilyCompletionResult {
  const audit = auditTemplateCompilerTraversalCompletion(transcript, endpoint);
  const projectionEvents = transcript.events.filter(
    (event): event is TemplateCompilerSiteCursorProjectionExtractionEvent =>
      event instanceof TemplateCompilerSiteCursorProjectionExtractionEvent,
  );
  const templateControllerEvents = transcript.events.filter(
    (event): event is TemplateCompilerSiteCursorTemplateControllerTransitionEvent =>
      event instanceof TemplateCompilerSiteCursorTemplateControllerTransitionEvent,
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
  if (transcript.taskSnapshot.contexts[0]?.context !== transcript.taskSnapshot.rootContext) {
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.ContextFamilyMissing,
      'Context-family completion requires the first task to own the exact root context.',
    );
  } else if (
    mode === TemplateCompilerContextFamilyCompletionMode.GeneratedOrEffectFamily
    && transcript.taskSnapshot.contexts.length <= 1
      && projectionEvents.length === 0
      && templateControllerEvents.length === 0
      && audit.processContentEvents.length === 0
  ) {
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.ContextFamilyMissing,
      'Context-family completion requires a generated traversal context or one exact non-ordinary compiler effect.',
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
  const templateControllerValidation = validateTemplateControllerTransitions(
    transcript,
    templateControllerEvents,
    projectionEvents,
    refuse,
  );
  validateProjectionAccounting(transcript, projectionEvents, refuse);
  validateEffectAndExclusionAccounting(transcript, refuse);
  const hydrateElements = validateHydrateElements(
    audit,
    projectionEvents,
    templateControllerValidation.eventByHydrateElement,
    refuse,
  );
  const hydrateElementByElement = new Map(hydrateElements.map((entry) => [entry.staging.element, entry]));
  validateContainerlessPlacements(
    audit,
    projectionEvents,
    templateControllerValidation.eventByHydrateElement,
    refuse,
  );
  if (reasons.length > 0) return ineligible(audit, reasons);

  const hasTemplateControllerContexts = templateControllerValidation.hasTemplateControllerContexts;
  const contexts = transcript.taskSnapshot.contexts.map((task) => completedContext(
    audit,
    task,
    projectionOwners.get(task.context) ?? null,
    templateControllerValidation.ownerByContext.get(task.context) ?? null,
    hydrateElementByElement,
  ));
  const traversal = new TemplateCompilerContextFamilyTraversal(
    contextFamilyTraversalAuthority,
    audit,
    contexts,
    hydrateElements,
    projectionEvents,
    templateControllerEvents,
    templateControllerValidation.leafRehomings,
    hasTemplateControllerContexts,
    templateControllerValidation.complete,
  );
  if (!templateControllerValidation.complete) {
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

interface TemplateControllerTransitionValidation {
  readonly hasTemplateControllerContexts: boolean;
  readonly complete: boolean;
  readonly ownerByContext: ReadonlyMap<
    TemplateCompilerSiteCursorContextReference,
    TemplateCompilerCompletedTemplateControllerContext
  >;
  readonly eventByHydrateElement: ReadonlyMap<
    TemplateCompilerHydrateElementStagingResult,
    TemplateCompilerSiteCursorTemplateControllerTransitionEvent
  >;
  readonly leafRehomings: readonly TemplateCompilerCompletedTemplateControllerLeafRehoming[];
}

function validateTemplateControllerTransitions(
  transcript: TemplateCompilerSiteCursorTranscript,
  events: readonly TemplateCompilerSiteCursorTemplateControllerTransitionEvent[],
  projectionEvents: readonly TemplateCompilerSiteCursorProjectionExtractionEvent[],
  refuse: (reasonKind: TemplateCompilerContextFamilyCompletionReasonKind, summary: string) => void,
): TemplateControllerTransitionValidation {
  const tasks = transcript.taskSnapshot;
  const tcTasks = tasks.contexts.filter((task) =>
    task.context.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController
  );
  const tcOwners = transcript.attributeOwners.filter((owner) =>
    owner.instructionStaging.templateControllers.length > 0
  );
  const tcOwnerSet = new Set(tcOwners);
  const ownerByContext = new Map<
    TemplateCompilerSiteCursorContextReference,
    TemplateCompilerCompletedTemplateControllerContext
  >();
  const eventByOwner = new Map<
    TemplateCompilerSiteCursorTranscript['attributeOwners'][number],
    TemplateCompilerSiteCursorTemplateControllerTransitionEvent
  >();
  const eventByHydrateElement = new Map<
    TemplateCompilerHydrateElementStagingResult,
    TemplateCompilerSiteCursorTemplateControllerTransitionEvent
  >();
  const leafRehomings: TemplateCompilerCompletedTemplateControllerLeafRehoming[] = [];
  let evidenceMismatch = false;
  const mismatch = (summary: string): void => {
    evidenceMismatch = true;
    refuse(
      TemplateCompilerContextFamilyCompletionReasonKind.TemplateControllerTransitionEvidenceMismatch,
      summary,
    );
  };

  for (const event of events) {
    const preparation = event.preparation;
    const realization = event.realization;
    const owner = preparation.request.owner;
    const hydrateElement = preparation.request.hydrateElement;
    const reachedElement = preparation.request.reachedElement;
    const elementEvent = reachedElement.elementEvent;
    const sourceSelection = preparation.sourceSelection;
    const transitionBinding = tasks.bindingForEvent(event);
    const elementBinding = tasks.bindingForEvent(elementEvent);
    const linkedProjections = projectionEvents.filter((projection) =>
      projection.preparation.reachedElement === reachedElement
    );
    const projectionPending = hydrateElement.draft?.projection.state
      === TemplateCompilerHydrateElementProjectionState.PendingExtraction;
    const linkedProjection = linkedProjections.length === 1 ? linkedProjections[0]! : null;
    const firstContextOrdinal = realization.contexts[0]?.ordinal ?? -1;
    const edgesAreExact = realization.edges.length === preparation.drafts.length
      && realization.contexts.length === preparation.drafts.length
      && realization.edges.every((edge, ordinal) => {
        const expectedRowContext = ordinal === 0
          ? preparation.sourceContext
          : realization.contexts[ordinal - 1]!;
        const expectedChildContext = realization.contexts[ordinal];
        const expectedPlacement = ordinal === 0
          ? TemplateCompilerTargetRowPlacementKind.TemplateControllerSourceReplacement
          : TemplateCompilerTargetRowPlacementKind.TemplateControllerGeneratedAppend;
        return edge.isModuleConstructed()
          && edge.preparation === preparation
          && edge.ordinal === ordinal
          && edge.draft === preparation.drafts[ordinal]
          && edge.rowContext === expectedRowContext
          && edge.childContext === expectedChildContext
          && edge.placementKind === expectedPlacement
          && expectedChildContext?.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController
          && expectedChildContext.parent === expectedRowContext
          && expectedChildContext.ordinal === firstContextOrdinal + ordinal;
      });
    const continuation = realization.request.terminalLeafContinuation;
    const leaf = realization.leafRehoming;
    const projectionRelationIsExact = projectionPending
      ? linkedProjection != null
        && linkedProjections.length === 1
        && event.ordinal < linkedProjection.ordinal
        && realization.request.projectionRealization === linkedProjection.realization
        && linkedProjection.realization.request.preparation.reachedElement === reachedElement
        && linkedProjection.realization.request.contexts.every((input) =>
          input.context.parent === realization.terminalLeaf
        )
      : linkedProjections.length === 0 && realization.request.projectionRealization == null;
    const coherent = event.isCoherent()
      && tcOwnerSet.has(owner)
      && event.host === preparation.host
      && event.host === elementEvent.element
      && preparation.request.hydrateElement.owner === owner
      && preparation.drafts === owner.instructionStaging.templateControllers
      && preparation.sourceContext === sourceSelection.context
      && elementEvent.ordinal < event.ordinal
      && transitionBinding?.context === preparation.sourceContext
      && transitionBinding.context === sourceSelection.context
      && transitionBinding.visit === sourceSelection.visit
      && transitionBinding.work === sourceSelection.work
      && elementBinding?.context === preparation.sourceContext
      && elementBinding.visit === sourceSelection.visit
      && elementBinding.work === sourceSelection.work
      && edgesAreExact
      && realization.terminalLeaf === realization.contexts.at(-1)
      && continuation.isModuleConstructed()
      && continuation.context === realization.terminalLeaf
      && continuation.sourceSelection === sourceSelection
      && continuation.sourceContext === preparation.sourceContext
      && leaf.isModuleConstructed()
      && leaf === realization.leafRehoming
      && leaf.preparation === preparation
      && leaf.host === event.host
      && leaf.sourceContext === preparation.sourceContext
      && leaf.terminalLeaf === realization.terminalLeaf
      && leaf.owner === owner
      && leaf.hydrateElement === hydrateElement
      && leaf.directRowTail === preparation.directRowTail
      && leaf.projectionRealization === realization.request.projectionRealization
      && projectionRelationIsExact;
    if (
      !coherent
      || eventByOwner.has(owner)
      || eventByHydrateElement.has(hydrateElement)
      || realization.edges.some((edge) => ownerByContext.has(edge.childContext))
    ) {
      mismatch(`Template-controller transition for '${event.host.occurrenceKey}' lost source, chain, leaf, or projection authority.`);
      continue;
    }
    eventByOwner.set(owner, event);
    eventByHydrateElement.set(hydrateElement, event);
    for (const edge of realization.edges) {
      ownerByContext.set(
        edge.childContext,
        new TemplateCompilerCompletedTemplateControllerContext(event, edge),
      );
    }
    leafRehomings.push(new TemplateCompilerCompletedTemplateControllerLeafRehoming(event, leaf));
  }

  if (
    events.length > tcOwners.length
    || ownerByContext.size > tcTasks.length
    || events.some((event) => !transcript.events.includes(event))
  ) {
    mismatch('Template-controller transition inventory contains an extra or foreign owner/context edge.');
  }
  const missing = tcOwners.some((owner) => !eventByOwner.has(owner))
    || tcTasks.some((task) => !ownerByContext.has(task.context));
  return {
    hasTemplateControllerContexts: tcTasks.length > 0,
    complete: !evidenceMismatch && !missing,
    ownerByContext,
    eventByHydrateElement,
    leafRehomings,
  };
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
  templateControllerEventByHydrateElement: ReadonlyMap<
    TemplateCompilerHydrateElementStagingResult,
    TemplateCompilerSiteCursorTemplateControllerTransitionEvent
  >,
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
    const templateControllerEvent = templateControllerEventByHydrateElement.get(staging) ?? null;
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
      || (blocker.blockerKind === TemplateCompilerHydrateElementBlockerKind.TemplateControllerPlacementPending
        && templateControllerEvent?.preparation.request.hydrateElement === staging)
    );
    const forwardedBlockers = staging.blockers.filter((blocker) =>
      blocker.scope === TemplateCompilerHydrateElementBlockerScope.Downstream
      && !dischargedBlockers.includes(blocker)
    );
    return new TemplateCompilerCompletedFamilyHydrateElement(
      staging,
      event,
      templateControllerEvent,
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
  templateControllerEventByHydrateElement: ReadonlyMap<
    TemplateCompilerHydrateElementStagingResult,
    TemplateCompilerSiteCursorTemplateControllerTransitionEvent
  >,
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
      !isTemplateCompilerProcessContentSettledForHost(staging.element, draft.processContent)
      || (projection == null && staging.element.readChildren().length > 0)
      || (projection != null && projection.preparation.residuals.length > 0)
    ) return true;
    const ownerEvents = audit.transcript.taskSnapshot.taskForContext(
      audit.transcript.taskSnapshot.contextForEvent(placement)!,
    )?.events ?? [];
    const projectionContextEvents = projection?.entrantBandStagings.flatMap((entry) =>
      contextSubtreeEvents(audit.transcript.taskSnapshot, entry.band.context)
    ) ?? [];
    const templateController = templateControllerEventByHydrateElement.get(staging) ?? null;
    const prerequisites = [
      ...audit.attributeEvents.filter((event) => event.owner === staging.element),
      ...audit.processContentEvents.filter((event) => event.host === staging.element),
      ...(templateController == null ? [] : [templateController]),
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
  templateControllerOwner: TemplateCompilerCompletedTemplateControllerContext | null,
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
  const letEvents = task.events.filter((event): event is TemplateCompilerSiteCursorLetElementEvent =>
    event instanceof TemplateCompilerSiteCursorLetElementEvent && audit.letEvents.includes(event)
  );
  const elementSites = elementEvents.map((event) => new TemplateCompilerCompletedFamilyElementReach(
    event,
    audit.ownersByElement.get(event.element)!,
    hydrateElementByElement.get(event.element)!,
  ));
  const textSites = textEvents.map((event) => new TemplateCompilerCompletedFamilyTextReach(event));
  const letSites = letEvents.map((event) => new TemplateCompilerCompletedFamilyLetReach(event));
  const siteByEvent = new Map<TemplateCompilerSiteCursorEvent, TemplateCompilerCompletedFamilyReach>([
    ...elementSites.map((site) => [site.event, site] as const),
    ...textSites.map((site) => [site.event, site] as const),
    ...letSites.map((site) => [site.event, site] as const),
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
    letSites,
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
    task.events.filter((event): event is TemplateCompilerSiteCursorTemplateControllerTransitionEvent =>
      event instanceof TemplateCompilerSiteCursorTemplateControllerTransitionEvent
    ),
    task.events.filter((event): event is TemplateCompilerSiteCursorContainerlessPlacementEvent =>
      event instanceof TemplateCompilerSiteCursorContainerlessPlacementEvent
    ),
    projectionOwner,
    templateControllerOwner,
  );
}

function cursorEventNode(event: TemplateCompilerSiteCursorEvent): object | null {
  if (event instanceof TemplateCompilerSiteCursorElementEvent) return event.element;
  if (event instanceof TemplateCompilerSiteCursorTextEvent) return event.text;
  if (event instanceof TemplateCompilerSiteCursorLetElementEvent) return event.elementEvent.element;
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
