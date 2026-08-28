import { TemplateCompilerTargetRowPlacementKind } from './compiler-target-plan.js';
import {
  TemplateCompilerHydrateElementProjectionState,
  type TemplateCompilerHydrateElementStagingResult,
} from './template-compiler-hydrate-element-staging.js';
import type { TemplateCompilerHydrateTemplateControllerDraft } from './template-compiler-instruction-staging.js';
import type {
  TemplateCompilerLiveAttributeContribution,
  TemplateCompilerLiveAttributeOwnerResult,
} from './template-compiler-live-attribute-assembly.js';
import type { TemplateCompilerElementOccurrence } from './template-compiler-occurrence.js';
import type { TemplateCompilerProjectionLogicalExtractionRealization } from './template-compiler-projection-logical-extraction.js';
import type { TemplateCompilerSiteCursorReachedElement } from './template-compiler-site-cursor.js';
import {
  TemplateCompilerSiteCursorContextKind,
  type TemplateCompilerSiteCursorContextReference,
  type TemplateCompilerSiteCursorStagedElementContinuationWork,
  type TemplateCompilerSiteCursorTaskSelection,
  type TemplateCompilerSiteCursorTaskSession,
} from './template-compiler-site-cursor-task.js';

const templateControllerTransitionAuthority = {};

export interface TemplateCompilerTemplateControllerTransitionPreparationRequest {
  readonly reachedElement: TemplateCompilerSiteCursorReachedElement;
  readonly owner: TemplateCompilerLiveAttributeOwnerResult;
  readonly hydrateElement: TemplateCompilerHydrateElementStagingResult;
}

/** Pure reached-host TC decision captured before task contexts or target products exist. */
export class TemplateCompilerTemplateControllerTransitionPreparation {
  readonly #authority: object;
  readonly taskSession: TemplateCompilerSiteCursorTaskSession;
  readonly sourceSelection: TemplateCompilerSiteCursorTaskSelection;
  readonly sourceContext: TemplateCompilerSiteCursorContextReference;
  readonly host: TemplateCompilerElementOccurrence;
  readonly drafts: readonly TemplateCompilerHydrateTemplateControllerDraft[];
  readonly contributions: readonly TemplateCompilerLiveAttributeContribution[];
  readonly directRowTail: TemplateCompilerLiveAttributeOwnerResult['instructionStaging']['directRowTail'];

  constructor(
    authority: object,
    readonly request: TemplateCompilerTemplateControllerTransitionPreparationRequest,
  ) {
    const reachedSelectionEvent = request.reachedElement.reachedSelectionEvent;
    this.taskSession = reachedSelectionEvent.session;
    this.sourceSelection = reachedSelectionEvent.selection;
    this.sourceContext = this.sourceSelection.context;
    this.host = request.reachedElement.elementEvent.element;
    this.drafts = request.owner.instructionStaging.templateControllers;
    this.contributions = request.owner.templateControllers;
    this.directRowTail = request.owner.instructionStaging.directRowTail;
    if (
      authority !== templateControllerTransitionAuthority
      || !request.reachedElement.isModuleConstructed()
      || !request.reachedElement.isCurrent()
      || !request.owner.ownerInput.isCurrent()
      || !request.hydrateElement.isModuleConstructed()
      || request.owner.element !== this.host
      || request.hydrateElement.element !== this.host
      || request.hydrateElement.owner !== request.owner
      || this.sourceSelection.visit.node !== this.host
      || reachedSelectionEvent.binding.context !== this.sourceContext
      || reachedSelectionEvent.binding.visit !== this.sourceSelection.visit
      || reachedSelectionEvent.binding.work !== this.sourceSelection.work
      || this.drafts.length === 0
      || this.contributions.length !== this.drafts.length
      || new Set(this.drafts).size !== this.drafts.length
      || new Set(this.contributions).size !== this.contributions.length
    ) {
      throw new Error('Template-controller transition preparation lost its reached host, owner, or ordered drafts.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === templateControllerTransitionAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed()
      && this.request.reachedElement.isCurrent()
      && this.request.owner.ownerInput.isCurrent()
      && this.taskSession.reachedSelectionEventIsCurrent(
        this.request.reachedElement.reachedSelectionEvent,
      );
  }
}

/** One future HTC row edge, expressed through existing target placement vocabulary without allocating the instruction. */
export class TemplateCompilerTemplateControllerTransitionEdgeReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly preparation: TemplateCompilerTemplateControllerTransitionPreparation,
    readonly ordinal: number,
    readonly draft: TemplateCompilerHydrateTemplateControllerDraft,
    readonly contribution: TemplateCompilerLiveAttributeContribution,
    readonly rowContext: TemplateCompilerSiteCursorContextReference,
    readonly childContext: TemplateCompilerSiteCursorContextReference,
    readonly placementKind:
      | TemplateCompilerTargetRowPlacementKind.TemplateControllerSourceReplacement
      | TemplateCompilerTargetRowPlacementKind.TemplateControllerGeneratedAppend,
  ) {
    const expectedRowContext = ordinal === 0
      ? preparation.sourceContext
      : childContext.parent;
    const expectedPlacement = ordinal === 0
      ? TemplateCompilerTargetRowPlacementKind.TemplateControllerSourceReplacement
      : TemplateCompilerTargetRowPlacementKind.TemplateControllerGeneratedAppend;
    if (
      authority !== templateControllerTransitionAuthority
      || !preparation.isModuleConstructed()
      || !Number.isSafeInteger(ordinal)
      || ordinal < 0
      || preparation.drafts[ordinal] !== draft
      || preparation.contributions[ordinal] !== contribution
      || !rowContext.isModuleConstructed()
      || !childContext.isModuleConstructed()
      || childContext.contextKind !== TemplateCompilerSiteCursorContextKind.TemplateController
      || childContext.parent !== rowContext
      || rowContext !== expectedRowContext
      || placementKind !== expectedPlacement
    ) {
      throw new Error('Template-controller transition edge lost draft order, context chain, or placement semantics.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === templateControllerTransitionAuthority;
  }
}

/** Durable claim that the reached host and its direct instruction tail belong only to the terminal TC leaf. */
export class TemplateCompilerTemplateControllerLeafRehomingReceipt {
  readonly #authority: object;
  readonly host: TemplateCompilerElementOccurrence;
  readonly sourceContext: TemplateCompilerSiteCursorContextReference;
  readonly owner: TemplateCompilerLiveAttributeOwnerResult;
  readonly hydrateElement: TemplateCompilerHydrateElementStagingResult;
  readonly directRowTail: TemplateCompilerLiveAttributeOwnerResult['instructionStaging']['directRowTail'];

  constructor(
    authority: object,
    readonly preparation: TemplateCompilerTemplateControllerTransitionPreparation,
    readonly terminalLeaf: TemplateCompilerSiteCursorContextReference,
    readonly projectionRealization: TemplateCompilerProjectionLogicalExtractionRealization | null,
  ) {
    this.host = preparation.host;
    this.sourceContext = preparation.sourceContext;
    this.owner = preparation.request.owner;
    this.hydrateElement = preparation.request.hydrateElement;
    this.directRowTail = preparation.directRowTail;
    if (
      authority !== templateControllerTransitionAuthority
      || !preparation.isModuleConstructed()
      || !terminalLeaf.isModuleConstructed()
      || terminalLeaf.contextKind !== TemplateCompilerSiteCursorContextKind.TemplateController
      || terminalLeaf === preparation.sourceContext
      || this.owner.element !== this.host
      || this.hydrateElement.element !== this.host
      || this.hydrateElement.owner !== this.owner
      || this.directRowTail !== this.owner.instructionStaging.directRowTail
      || (projectionRealization != null && (
        !projectionRealization.isModuleConstructed()
        || projectionRealization.request.preparation.reachedElement !== preparation.request.reachedElement
        || projectionRealization.request.contexts.some((input) => input.context.parent !== terminalLeaf)
      ))
    ) {
      throw new Error('Template-controller leaf rehoming lost host, HE tail, or terminal definition ownership.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === templateControllerTransitionAuthority;
  }
}

export interface TemplateCompilerTemplateControllerTransitionRealizationRequest {
  readonly preparation: TemplateCompilerTemplateControllerTransitionPreparation;
  readonly contexts: readonly TemplateCompilerSiteCursorContextReference[];
  readonly terminalLeafContinuation: TemplateCompilerSiteCursorStagedElementContinuationWork;
  readonly projectionRealization: TemplateCompilerProjectionLogicalExtractionRealization | null;
}

/** Complete scheduler-bound TC chain; still product-free and structurally inert. */
export class TemplateCompilerTemplateControllerTransitionRealization {
  readonly #authority: object;
  readonly contexts: readonly TemplateCompilerSiteCursorContextReference[];
  readonly edges: readonly TemplateCompilerTemplateControllerTransitionEdgeReceipt[];
  readonly terminalLeaf: TemplateCompilerSiteCursorContextReference;
  readonly leafRehoming: TemplateCompilerTemplateControllerLeafRehomingReceipt;
  readonly #edgeByDraft: ReadonlyMap<
    TemplateCompilerHydrateTemplateControllerDraft,
    TemplateCompilerTemplateControllerTransitionEdgeReceipt
  >;

  constructor(
    authority: object,
    readonly request: TemplateCompilerTemplateControllerTransitionRealizationRequest,
    contexts: readonly TemplateCompilerSiteCursorContextReference[],
    edges: readonly TemplateCompilerTemplateControllerTransitionEdgeReceipt[],
    leafRehoming: TemplateCompilerTemplateControllerLeafRehomingReceipt,
  ) {
    this.contexts = [...contexts];
    this.edges = [...edges];
    this.terminalLeaf = this.contexts.at(-1)!;
    this.leafRehoming = leafRehoming;
    this.#edgeByDraft = new Map(this.edges.map((edge) => [edge.draft, edge] as const));
    const preparation = request.preparation;
    const continuation = request.terminalLeafContinuation;
    const firstContextOrdinal = this.contexts[0]?.ordinal ?? -1;
    const projectionPending = preparation.request.hydrateElement.draft?.projection.state
      === TemplateCompilerHydrateElementProjectionState.PendingExtraction;
    if (
      authority !== templateControllerTransitionAuthority
      || !preparation.isModuleConstructed()
      || !preparation.isCurrent()
      || this.contexts.length !== preparation.drafts.length
      || this.contexts.length === 0
      || this.contexts.some((context, ordinal) =>
        !context.isModuleConstructed()
        || context.contextKind !== TemplateCompilerSiteCursorContextKind.TemplateController
        || context.ordinal !== firstContextOrdinal + ordinal
        || context.parent !== (ordinal === 0 ? preparation.sourceContext : this.contexts[ordinal - 1])
      )
      || this.edges.length !== this.contexts.length
      || this.edges.some((edge, ordinal) =>
        !edge.isModuleConstructed()
        || edge.preparation !== preparation
        || edge.ordinal !== ordinal
        || edge.draft !== preparation.drafts[ordinal]
        || edge.contribution !== preparation.contributions[ordinal]
        || edge.rowContext !== (ordinal === 0 ? preparation.sourceContext : this.contexts[ordinal - 1])
        || edge.childContext !== this.contexts[ordinal]
      )
      || this.#edgeByDraft.size !== preparation.drafts.length
      || !continuation.isModuleConstructed()
      || continuation.context !== this.terminalLeaf
      || continuation.sourceSelection !== preparation.sourceSelection
      || continuation.sourceContext !== preparation.sourceContext
      || leafRehoming.preparation !== preparation
      || leafRehoming.terminalLeaf !== this.terminalLeaf
      || leafRehoming.projectionRealization !== request.projectionRealization
      || projectionPending !== (request.projectionRealization != null)
      || (request.projectionRealization != null && (
        request.projectionRealization.request.continuation !== continuation
        || request.projectionRealization.request.preparation.reachedElement
          !== preparation.request.reachedElement
        || request.projectionRealization.request.contexts.some((input) =>
          input.context.parent !== this.terminalLeaf
        )
      ))
    ) {
      throw new Error('Template-controller transition realization lost its chain, continuation, or leaf ownership.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === templateControllerTransitionAuthority;
  }

  edgeForDraft(
    draft: TemplateCompilerHydrateTemplateControllerDraft,
  ): TemplateCompilerTemplateControllerTransitionEdgeReceipt | null {
    return this.#edgeByDraft.get(draft) ?? null;
  }
}

export function prepareTemplateCompilerTemplateControllerTransition(
  request: TemplateCompilerTemplateControllerTransitionPreparationRequest,
): TemplateCompilerTemplateControllerTransitionPreparation {
  return new TemplateCompilerTemplateControllerTransitionPreparation(
    templateControllerTransitionAuthority,
    request,
  );
}

export function realizeTemplateCompilerTemplateControllerTransition(
  request: TemplateCompilerTemplateControllerTransitionRealizationRequest,
): TemplateCompilerTemplateControllerTransitionRealization {
  const { preparation, contexts } = request;
  const edges = contexts.map((context, ordinal) => new TemplateCompilerTemplateControllerTransitionEdgeReceipt(
    templateControllerTransitionAuthority,
    preparation,
    ordinal,
    preparation.drafts[ordinal]!,
    preparation.contributions[ordinal]!,
    ordinal === 0 ? preparation.sourceContext : contexts[ordinal - 1]!,
    context,
    ordinal === 0
      ? TemplateCompilerTargetRowPlacementKind.TemplateControllerSourceReplacement
      : TemplateCompilerTargetRowPlacementKind.TemplateControllerGeneratedAppend,
  ));
  const terminalLeaf = contexts.at(-1);
  if (terminalLeaf == null) {
    throw new Error('Template-controller transition realization requires one generated context.');
  }
  const leafRehoming = new TemplateCompilerTemplateControllerLeafRehomingReceipt(
    templateControllerTransitionAuthority,
    preparation,
    terminalLeaf,
    request.projectionRealization,
  );
  return new TemplateCompilerTemplateControllerTransitionRealization(
    templateControllerTransitionAuthority,
    request,
    contexts,
    edges,
    leafRehoming,
  );
}
