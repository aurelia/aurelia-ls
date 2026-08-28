import type {
  TemplateCompilerBrowserOriginRoute,
  TemplateCompilerExactAuthoredOrigin,
} from './template-compiler-authored-origin-index.js';
import {
  TemplateCompilerHydrateElementProjectionState,
  type TemplateCompilerHydrateElementEnvelopeDraft,
} from './template-compiler-hydrate-element-staging.js';
import { HydrateElementProjectionContributorDisposition } from './instruction-ir.js';
import type { TemplateCompilerLiveAttributeSuppressionAuthority } from './template-compiler-live-attribute-owner.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
  type TemplateCompilerFragmentOccurrence,
  type TemplateCompilerNodeOccurrence,
  type TemplateCompilerOccurrenceForest,
  type TemplateCompilerParentOccurrence,
} from './template-compiler-occurrence.js';
import {
  TemplateCompilerPreWalkBrowserOriginState,
  type TemplateCompilerPreWalkRemainderAuthority,
} from './template-compiler-prewalk-remainder.js';
import type {
  TemplateCompilerProjectionChildSnapshot,
  TemplateCompilerProjectionContributorPlan,
  TemplateCompilerProjectionGroupPlan,
  TemplateCompilerProjectionGroupingPlan,
} from './template-compiler-projection-grouping.js';
import type { TemplateCompilerSiteCursorReachedElement } from './template-compiler-site-cursor.js';
import type { TemplateCompilerSiteCursorElementEvent } from './template-compiler-site-cursor-event.js';
import type {
  TemplateCompilerSiteCursorContextKind,
  TemplateCompilerSiteCursorContextReference,
  TemplateCompilerSiteCursorLogicalEntrantInput,
  TemplateCompilerSiteCursorPhysicalChildSequence,
  TemplateCompilerSiteCursorReachedSelectionEventAttestation,
  TemplateCompilerSiteCursorStagedElementContinuationWork,
  TemplateCompilerSiteCursorTaskSelection,
  TemplateCompilerSiteCursorTaskSession,
} from './template-compiler-site-cursor-task.js';

type ProjectionGrouping = TemplateCompilerProjectionGroupingPlan<
  TemplateCompilerNodeOccurrence,
  TemplateCompilerAttributeOccurrence
>;
type ProjectionGroup = TemplateCompilerProjectionGroupPlan<
  TemplateCompilerNodeOccurrence,
  TemplateCompilerAttributeOccurrence
>;
type ProjectionContributor = TemplateCompilerProjectionContributorPlan<
  TemplateCompilerNodeOccurrence,
  TemplateCompilerAttributeOccurrence
>;
type ProjectionChild = TemplateCompilerProjectionChildSnapshot<
  TemplateCompilerNodeOccurrence,
  TemplateCompilerAttributeOccurrence
>;

const projectionLogicalExtractionAuthority = {};
const projectionContextKind = 'projection' as TemplateCompilerSiteCursorContextKind.Projection;

/** Current event-time authorities required to prepare projection redistribution without enacting it. */
export interface TemplateCompilerProjectionLogicalExtractionPreparationRequest {
  readonly forest: TemplateCompilerOccurrenceForest;
  readonly preWalk: TemplateCompilerPreWalkRemainderAuthority;
  readonly envelope: TemplateCompilerHydrateElementEnvelopeDraft;
}

/** Existing origin resolution captured for one occurrence at the extraction frontier. */
export class TemplateCompilerProjectionLogicalOriginReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
    readonly browserOriginState: TemplateCompilerPreWalkBrowserOriginState,
    readonly browserOriginRoute: TemplateCompilerBrowserOriginRoute | null,
    readonly exactAuthoredOrigin: TemplateCompilerExactAuthoredOrigin | null,
  ) {
    if (authority !== projectionLogicalExtractionAuthority) {
      throw new Error('Projection logical origin receipts are module-constructed capabilities.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }
}

/** Immutable physical child spine captured without asking the task scheduler to mint work authority. */
export class TemplateCompilerProjectionPhysicalChildSnapshot {
  readonly #authority: object;
  readonly children: readonly TemplateCompilerNodeOccurrence[];

  constructor(
    authority: object,
    readonly grouping: ProjectionGrouping,
    readonly forest: TemplateCompilerOccurrenceForest,
    readonly forestMutationRevision: number,
    readonly parent: TemplateCompilerParentOccurrence,
    children: readonly TemplateCompilerNodeOccurrence[],
  ) {
    this.children = [...children];
    if (
      authority !== projectionLogicalExtractionAuthority
      || forest.mutationRevision !== forestMutationRevision
      || !sameObjects(parent.readChildren(), this.children)
      || this.children.some((child) =>
        forest.nodeForOccurrenceKey(child.occurrenceKey) !== child
        || child.parent !== parent
        || child.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
      )
    ) {
      throw new Error('Projection physical child snapshot lost its forest, parent, order, or revision authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed()
      && this.forest.mutationRevision === this.forestMutationRevision
      && sameObjects(this.parent.readChildren(), this.children);
  }
}

/** One exact physical source placement retained independently from its eventual destination context. */
export class TemplateCompilerProjectionPhysicalSourceReceipt {
  readonly #authority: object;
  readonly node: TemplateCompilerNodeOccurrence;
  readonly parent: TemplateCompilerParentOccurrence;
  readonly capturedSuccessor: TemplateCompilerNodeOccurrence | null;

  constructor(
    authority: object,
    readonly grouping: ProjectionGrouping,
    readonly group: ProjectionGroup | null,
    readonly contributor: ProjectionContributor | null,
    readonly residual: ProjectionChild | null,
    readonly source: TemplateCompilerProjectionPhysicalChildSnapshot,
    readonly sourceOrdinal: number,
    readonly origin: TemplateCompilerProjectionLogicalOriginReceipt,
  ) {
    this.node = source.children[sourceOrdinal]!;
    this.parent = source.parent;
    this.capturedSuccessor = source.children[sourceOrdinal + 1] ?? null;
    const contributorOwned = contributor != null
      && group != null
      && residual == null;
    const residualOwned = residual != null
      && group == null
      && contributor == null
      && residual.node === this.node;
    if (
      authority !== projectionLogicalExtractionAuthority
      || !source.isModuleConstructed()
      || source.grouping !== grouping
      || !origin.isModuleConstructed()
      || origin.occurrence !== this.node
      || !Number.isSafeInteger(sourceOrdinal)
      || sourceOrdinal < 0
      || sourceOrdinal >= source.children.length
      || Number(contributorOwned) + Number(residualOwned) !== 1
    ) {
      throw new Error('Projection physical source receipt lost grouping ownership, placement, or origin authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }
}

/** Durable extraction-time proof that one explicit `[au-slot]` occurrence is compiler-consumed. */
export class TemplateCompilerProjectionSlotConsumptionReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly grouping: ProjectionGrouping,
    readonly group: ProjectionGroup,
    readonly contributor: ProjectionContributor,
    readonly forest: TemplateCompilerOccurrenceForest,
    readonly extractionForestMutationRevision: number,
    readonly element: TemplateCompilerElementOccurrence,
    readonly attribute: TemplateCompilerAttributeOccurrence,
    readonly physicalOrdinal: number,
    readonly capturedSuccessor: TemplateCompilerAttributeOccurrence | null,
    readonly origin: TemplateCompilerProjectionLogicalOriginReceipt,
  ) {
    const attributes = element.readAttributes();
    if (
      authority !== projectionLogicalExtractionAuthority
      || forest.mutationRevision !== extractionForestMutationRevision
      || !grouping.groups.includes(group)
      || !group.members.includes(contributor)
      || contributor.slotAttribute !== attribute
      || contributor.node !== element
      || forest.nodeForOccurrenceKey(element.occurrenceKey) !== element
      || forest.attributeForOccurrenceKey(attribute.occurrenceKey) !== attribute
      || attribute.owner !== element
      || attributes[physicalOrdinal] !== attribute
      || (attributes[physicalOrdinal + 1] ?? null) !== capturedSuccessor
      || qualifiedAttributeName(attribute) !== 'au-slot'
      || !origin.isModuleConstructed()
      || origin.occurrence !== attribute
    ) {
      throw new Error('Projection slot consumption lost grouping, owner, placement, or origin authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }
}

/** Short-lived logical NamedNodeMap authority rebased when the exact projected contributor is reached. */
export class TemplateCompilerProjectionLiveSlotSuppressionAuthority
  implements TemplateCompilerLiveAttributeSuppressionAuthority {
  readonly #authority: object;
  readonly suppressedAttributes: readonly TemplateCompilerAttributeOccurrence[];

  constructor(
    authority: object,
    readonly consumption: TemplateCompilerProjectionSlotConsumptionReceipt,
    readonly reachedElement: TemplateCompilerSiteCursorReachedElement,
    readonly forest: TemplateCompilerOccurrenceForest,
    readonly element: TemplateCompilerElementOccurrence,
    readonly forestMutationRevision: number,
    readonly attribute: TemplateCompilerAttributeOccurrence,
    readonly physicalOrdinal: number,
    readonly capturedSuccessor: TemplateCompilerAttributeOccurrence | null,
  ) {
    this.suppressedAttributes = [attribute];
    const attributes = element.readAttributes();
    const reachedSelectionEvent = reachedElement.reachedSelectionEvent;
    if (
      authority !== projectionLogicalExtractionAuthority
      || !consumption.isModuleConstructed()
      || !reachedElement.isModuleConstructed()
      || !reachedElement.isCurrent()
      || forest !== consumption.forest
      || forest.mutationRevision !== forestMutationRevision
      || element !== consumption.element
      || attribute !== consumption.attribute
      || reachedElement.elementEvent.element !== element
      || reachedSelectionEvent.selection.visit.node !== element
      || attributes[physicalOrdinal] !== attribute
      || (attributes[physicalOrdinal + 1] ?? null) !== capturedSuccessor
    ) {
      throw new Error('Projection live slot suppression lost its consumption, visit, or current attribute authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed()
      && this.forest.mutationRevision === this.forestMutationRevision
      && this.forest.nodeForOccurrenceKey(this.element.occurrenceKey) === this.element
      && this.forest.attributeForOccurrenceKey(this.attribute.occurrenceKey) === this.attribute
      && this.attribute.owner === this.element
      && this.element.readAttributes()[this.physicalOrdinal] === this.attribute
      && (this.element.readAttributes()[this.physicalOrdinal + 1] ?? null) === this.capturedSuccessor;
  }
}

/** Exact discarded whitespace member retained even though it creates no context entrant. */
export class TemplateCompilerProjectionDiscardedWhitespaceReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly grouping: ProjectionGrouping,
    readonly group: ProjectionGroup,
    readonly contributor: ProjectionContributor,
    readonly source: TemplateCompilerProjectionPhysicalSourceReceipt,
  ) {
    if (
      authority !== projectionLogicalExtractionAuthority
      || source.grouping !== grouping
      || source.group !== group
      || source.contributor !== contributor
      || source.node !== contributor.node
      || contributor.disposition !== HydrateElementProjectionContributorDisposition.DiscardedWhitespace
    ) {
      throw new Error('Projection discarded-whitespace receipt lost its contributor or physical source authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }
}

/** Exact wrapper/content relation retained for a projected bare `<template>` that will be unwrapped later. */
export class TemplateCompilerProjectionUnwrappedWrapperReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly grouping: ProjectionGrouping,
    readonly group: ProjectionGroup,
    readonly contributor: ProjectionContributor,
    readonly wrapper: TemplateCompilerElementOccurrence,
    readonly wrapperSource: TemplateCompilerProjectionPhysicalSourceReceipt,
    readonly content: TemplateCompilerFragmentOccurrence,
    readonly contentSource: TemplateCompilerProjectionPhysicalChildSnapshot,
    readonly slotConsumption: TemplateCompilerProjectionSlotConsumptionReceipt | null,
  ) {
    if (
      authority !== projectionLogicalExtractionAuthority
      || contributor.disposition !== HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent
      || contributor.node !== wrapper
      || wrapperSource.grouping !== grouping
      || wrapperSource.group !== group
      || wrapperSource.contributor !== contributor
      || wrapperSource.node !== wrapper
      || wrapper.templateContent !== content
      || content.parent !== wrapper
      || content.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.TemplateContent
      || contentSource.parent !== content
      || contentSource.grouping !== grouping
      || (slotConsumption != null && (
        slotConsumption.grouping !== grouping
        || slotConsumption.group !== group
        || slotConsumption.contributor !== contributor
      ))
    ) {
      throw new Error('Projection unwrapped-wrapper receipt lost wrapper, content, or consumption authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }
}

/** One explicit-shadow child left physically and logically under its current host. */
export class TemplateCompilerProjectionResidualReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly grouping: ProjectionGrouping,
    readonly residual: ProjectionChild,
    readonly source: TemplateCompilerProjectionPhysicalSourceReceipt,
  ) {
    if (
      authority !== projectionLogicalExtractionAuthority
      || source.grouping !== grouping
      || source.residual !== residual
      || source.node !== residual.node
    ) {
      throw new Error('Projection residual receipt lost grouping or physical source authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }
}

/** One direct projection contributor with its complete extraction-time dispositions. */
export class TemplateCompilerProjectionContributorReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly grouping: ProjectionGrouping,
    readonly group: ProjectionGroup,
    readonly contributor: ProjectionContributor,
    readonly source: TemplateCompilerProjectionPhysicalSourceReceipt,
    readonly slotConsumption: TemplateCompilerProjectionSlotConsumptionReceipt | null,
    readonly discardedWhitespace: TemplateCompilerProjectionDiscardedWhitespaceReceipt | null,
    readonly unwrappedWrapper: TemplateCompilerProjectionUnwrappedWrapperReceipt | null,
  ) {
    const disposition = contributor.disposition;
    if (
      authority !== projectionLogicalExtractionAuthority
      || source.grouping !== grouping
      || source.group !== group
      || source.contributor !== contributor
      || source.node !== contributor.node
      || (slotConsumption != null) !== (contributor.slotAttribute != null)
      || (slotConsumption != null && (
        slotConsumption.grouping !== grouping
        || slotConsumption.group !== group
        || slotConsumption.contributor !== contributor
      ))
      || (discardedWhitespace != null) !== (
        disposition === HydrateElementProjectionContributorDisposition.DiscardedWhitespace
      )
      || (unwrappedWrapper != null) !== (
        disposition === HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent
      )
    ) {
      throw new Error('Projection contributor receipt lost grouping, source, or exact dispositions.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }
}

/** One context-independent entrant retaining physical placement and future logical order. */
export class TemplateCompilerProjectionPlannedEntrantReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly grouping: ProjectionGrouping,
    readonly group: ProjectionGroup,
    readonly contributor: TemplateCompilerProjectionContributorReceipt,
    readonly source: TemplateCompilerProjectionPhysicalSourceReceipt,
    readonly logicalOrdinal: number,
    readonly logicalSuccessor: TemplateCompilerNodeOccurrence | null,
  ) {
    if (
      authority !== projectionLogicalExtractionAuthority
      || contributor.grouping !== grouping
      || contributor.group !== group
      || source.grouping !== grouping
      || source.group !== group
      || source.contributor !== contributor.contributor
      || !Number.isSafeInteger(logicalOrdinal)
      || logicalOrdinal < 0
    ) {
      throw new Error('Projection planned entrant lost grouping, contributor, or order authority.');
    }
    this.#authority = authority;
  }

  get node(): TemplateCompilerNodeOccurrence {
    return this.source.node;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }
}

/** One complete, possibly empty, context-independent logical root band for a definition group. */
export class TemplateCompilerProjectionPlannedEntrantBand {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly grouping: ProjectionGrouping,
    readonly group: ProjectionGroup,
    readonly contributors: readonly TemplateCompilerProjectionContributorReceipt[],
    readonly entrants: readonly TemplateCompilerProjectionPlannedEntrantReceipt[],
  ) {
    if (
      authority !== projectionLogicalExtractionAuthority
      || !group.createsDefinition
      || contributors.length !== group.contributors.length
      || contributors.some((receipt, ordinal) =>
        receipt.grouping !== grouping
        || receipt.group !== group
        || receipt.contributor !== group.contributors[ordinal]
      )
      || entrants.some((entrant, ordinal) =>
        !entrant.isModuleConstructed()
        || entrant.grouping !== grouping
        || entrant.group !== group
        || entrant.logicalOrdinal !== ordinal
        || entrant.logicalSuccessor !== (entrants[ordinal + 1]?.node ?? null)
      )
    ) {
      throw new Error('Projection planned entrant band lost definition-group coverage or logical order.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }
}

/** Complete pure projection extraction plan tied to one reached HydrateElement event. */
export class TemplateCompilerProjectionLogicalExtractionPreparation {
  readonly #authority: object;
  readonly reachedSelectionEvent: TemplateCompilerSiteCursorReachedSelectionEventAttestation;
  readonly taskSession: TemplateCompilerSiteCursorTaskSession;
  readonly sourceSelection: TemplateCompilerSiteCursorTaskSelection;
  readonly elementEvent: TemplateCompilerSiteCursorElementEvent;
  readonly grouping: ProjectionGrouping;
  readonly #contributorsByPlan: ReadonlyMap<ProjectionContributor, TemplateCompilerProjectionContributorReceipt>;
  readonly #bandsByGroup: ReadonlyMap<ProjectionGroup, TemplateCompilerProjectionPlannedEntrantBand>;
  readonly #consumptionsByElement: ReadonlyMap<
    TemplateCompilerElementOccurrence,
    TemplateCompilerProjectionSlotConsumptionReceipt
  >;

  constructor(
    authority: object,
    readonly request: TemplateCompilerProjectionLogicalExtractionPreparationRequest,
    readonly reachedElement: TemplateCompilerSiteCursorReachedElement,
    readonly physicalSources: readonly TemplateCompilerProjectionPhysicalChildSnapshot[],
    readonly contributorReceipts: readonly TemplateCompilerProjectionContributorReceipt[],
    readonly slotConsumptions: readonly TemplateCompilerProjectionSlotConsumptionReceipt[],
    readonly discardedWhitespace: readonly TemplateCompilerProjectionDiscardedWhitespaceReceipt[],
    readonly unwrappedWrappers: readonly TemplateCompilerProjectionUnwrappedWrapperReceipt[],
    readonly residuals: readonly TemplateCompilerProjectionResidualReceipt[],
    readonly plannedEntrantBands: readonly TemplateCompilerProjectionPlannedEntrantBand[],
  ) {
    const reachedSelectionEvent = reachedElement.reachedSelectionEvent;
    this.reachedSelectionEvent = reachedSelectionEvent;
    this.taskSession = reachedSelectionEvent.session;
    this.sourceSelection = reachedSelectionEvent.selection;
    this.elementEvent = reachedElement.elementEvent;
    this.grouping = request.envelope.projection.grouping;
    this.#contributorsByPlan = new Map(contributorReceipts.map((receipt) => [receipt.contributor, receipt]));
    this.#bandsByGroup = new Map(plannedEntrantBands.map((band) => [band.group, band]));
    this.#consumptionsByElement = new Map(slotConsumptions.map((receipt) => [receipt.element, receipt]));
    const groupByContributor = new Map<ProjectionContributor, ProjectionGroup>();
    for (const group of this.grouping.groups) {
      for (const contributor of group.members) groupByContributor.set(contributor, group);
    }
    const expectedSlotContributors = this.grouping.extractedContributors.filter((contributor) =>
      contributor.slotAttribute != null
    );
    const expectedUnwrappedContributors = this.grouping.extractedContributors.filter((contributor) =>
      contributor.disposition === HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent
    );
    if (
      authority !== projectionLogicalExtractionAuthority
      || !reachedElement.isModuleConstructed()
      || !reachedSelectionEvent.isModuleConstructed()
      || reachedElement !== request.envelope.reachedElement
      || reachedSelectionEvent.event !== reachedElement.elementEvent
      || this.#contributorsByPlan.size !== contributorReceipts.length
      || contributorReceipts.length !== this.grouping.extractedContributors.length
      || this.grouping.extractedContributors.some((contributor) => !this.#contributorsByPlan.has(contributor))
      || contributorReceipts.some((receipt) =>
        receipt.grouping !== this.grouping
        || groupByContributor.get(receipt.contributor) !== receipt.group
      )
      || slotConsumptions.length !== expectedSlotContributors.length
      || this.#consumptionsByElement.size !== slotConsumptions.length
      || slotConsumptions.some((receipt, ordinal) =>
        !receipt.isModuleConstructed()
        || receipt.grouping !== this.grouping
        || receipt.contributor !== expectedSlotContributors[ordinal]
        || groupByContributor.get(receipt.contributor) !== receipt.group
      )
      || discardedWhitespace.length !== this.grouping.discardedContributors.length
      || discardedWhitespace.some((receipt, ordinal) =>
        receipt.contributor !== this.grouping.discardedContributors[ordinal]
        || groupByContributor.get(receipt.contributor) !== receipt.group
      )
      || unwrappedWrappers.length !== expectedUnwrappedContributors.length
      || unwrappedWrappers.some((receipt, ordinal) =>
        receipt.contributor !== expectedUnwrappedContributors[ordinal]
        || groupByContributor.get(receipt.contributor) !== receipt.group
      )
      || residuals.length !== this.grouping.residualChildren.length
      || residuals.some((receipt, ordinal) => receipt.residual !== this.grouping.residualChildren[ordinal])
      || new Set(physicalSources.map((source) => source.parent)).size !== physicalSources.length
      || physicalSources.some((source) => source.grouping !== this.grouping)
      || this.#bandsByGroup.size !== plannedEntrantBands.length
      || plannedEntrantBands.length !== this.grouping.definitionGroups.length
      || this.grouping.definitionGroups.some((group, ordinal) => plannedEntrantBands[ordinal]?.group !== group)
    ) {
      throw new Error('Projection extraction preparation lost attestation, grouping, or disposition coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed()
      && this.request.forest.mutationRevision === this.request.envelope.endpoint.forestMutationRevision
      && this.request.preWalk.binding.browserEmission.publication.isCurrent()
      && this.physicalSources.every((source) => source.isCurrent());
  }

  contributorReceiptFor(contributor: ProjectionContributor): TemplateCompilerProjectionContributorReceipt | null {
    return this.#contributorsByPlan.get(contributor) ?? null;
  }

  plannedEntrantBandFor(group: ProjectionGroup): TemplateCompilerProjectionPlannedEntrantBand | null {
    return this.#bandsByGroup.get(group) ?? null;
  }

  slotConsumptionFor(
    element: TemplateCompilerElementOccurrence,
  ): TemplateCompilerProjectionSlotConsumptionReceipt | null {
    return this.#consumptionsByElement.get(element) ?? null;
  }
}

/** Exact projection context allocated by the caller for one definition-producing group. */
export interface TemplateCompilerProjectionLogicalContextInput {
  readonly group: ProjectionGroup;
  /**
   * Logical/output owner. RC2 flattens this private compiler-context edge to the pre-TC source context, but historical
   * compiler provenance names the terminal TC context as the technical parent and the owning HE publishes the result.
   */
  readonly context: TemplateCompilerSiteCursorContextReference;
}

/** Authorities required to turn one pure extraction plan into scheduler-native entrant inputs. */
export interface TemplateCompilerProjectionLogicalExtractionRealizationRequest {
  readonly preparation: TemplateCompilerProjectionLogicalExtractionPreparation;
  /** Must be minted by the attested session/source selection and carry `preparation` as its opaque payload. */
  readonly continuation: TemplateCompilerSiteCursorStagedElementContinuationWork;
  readonly contexts: readonly TemplateCompilerProjectionLogicalContextInput[];
}

/** One destination-context entrant retaining its pure plan and scheduler-native source sequence. */
export class TemplateCompilerProjectionRealizedEntrantReceipt {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly planned: TemplateCompilerProjectionPlannedEntrantReceipt,
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly source: TemplateCompilerSiteCursorPhysicalChildSequence,
  ) {
    if (
      authority !== projectionLogicalExtractionAuthority
      || !planned.isModuleConstructed()
      || !context.isModuleConstructed()
      || !source.isModuleConstructed()
      || source.parent !== planned.source.parent
      || source.children[planned.source.sourceOrdinal] !== planned.node
      || (source.children[planned.source.sourceOrdinal + 1] ?? null) !== planned.source.capturedSuccessor
    ) {
      throw new Error('Projection realized entrant lost planned placement, context, or scheduler sequence authority.');
    }
    this.#authority = authority;
  }

  get node(): TemplateCompilerNodeOccurrence {
    return this.planned.node;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }
}

/** One complete context-bound entrant band ready for `stageContextLogicalEntrantBand`. */
export class TemplateCompilerProjectionRealizedEntrantBand {
  readonly #authority: object;
  readonly entrantInputs: readonly TemplateCompilerSiteCursorLogicalEntrantInput[];

  constructor(
    authority: object,
    readonly planned: TemplateCompilerProjectionPlannedEntrantBand,
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly entrants: readonly TemplateCompilerProjectionRealizedEntrantReceipt[],
  ) {
    this.entrantInputs = entrants.map((entrant) => ({
      source: entrant.source,
      sourceOrdinal: entrant.planned.source.sourceOrdinal,
      authority: entrant,
    }));
    if (
      authority !== projectionLogicalExtractionAuthority
      || !planned.isModuleConstructed()
      || context.contextKind !== projectionContextKind
      || entrants.length !== planned.entrants.length
      || entrants.some((entrant, ordinal) =>
        !entrant.isModuleConstructed()
        || entrant.context !== context
        || entrant.planned !== planned.entrants[ordinal]
      )
    ) {
      throw new Error('Projection realized entrant band lost plan, destination context, or complete coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }
}

/** Scheduler-bound projection family produced without staging, scheduling, or allocating anything. */
export class TemplateCompilerProjectionLogicalExtractionRealization {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly request: TemplateCompilerProjectionLogicalExtractionRealizationRequest,
    readonly entrantBands: readonly TemplateCompilerProjectionRealizedEntrantBand[],
  ) {
    if (
      authority !== projectionLogicalExtractionAuthority
      || !request.preparation.isModuleConstructed()
      || entrantBands.length !== request.preparation.plannedEntrantBands.length
      || entrantBands.some((band, ordinal) =>
        !band.isModuleConstructed()
        || band.planned !== request.preparation.plannedEntrantBands[ordinal]
        || band.context !== request.contexts[ordinal]?.context
      )
    ) {
      throw new Error('Projection extraction realization lost preparation or context-bound band coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionLogicalExtractionAuthority;
  }
}

/** Prepare a complete projection redistribution plan without mutating forest, scheduler, ledger, or namespace. */
export function prepareTemplateCompilerProjectionLogicalExtraction(
  request: TemplateCompilerProjectionLogicalExtractionPreparationRequest,
): TemplateCompilerProjectionLogicalExtractionPreparation {
  validatePreparationRequest(request);
  const grouping = request.envelope.projection.grouping;
  const sourceByParent = new Map<TemplateCompilerParentOccurrence, IndexedPhysicalSource>();
  const receiptsByContributor = new Map<ProjectionContributor, TemplateCompilerProjectionContributorReceipt>();
  const entrantSourcesByContributor = new Map<
    ProjectionContributor,
    TemplateCompilerProjectionPhysicalSourceReceipt[]
  >();
  const contributorReceipts: TemplateCompilerProjectionContributorReceipt[] = [];
  const slotConsumptions: TemplateCompilerProjectionSlotConsumptionReceipt[] = [];
  const discardedWhitespace: TemplateCompilerProjectionDiscardedWhitespaceReceipt[] = [];
  const unwrappedWrappers: TemplateCompilerProjectionUnwrappedWrapperReceipt[] = [];
  const residuals: TemplateCompilerProjectionResidualReceipt[] = [];
  const hostSource = indexPhysicalSource(request, request.envelope.element, sourceByParent);

  for (const group of grouping.groups) {
    for (const contributor of group.members) {
      const source = physicalContributorSource(request, group, contributor, hostSource, contributor.node);
      const slotConsumption = contributor.slotAttribute == null
        ? null
        : createSlotConsumption(request, group, contributor);
      if (slotConsumption != null) slotConsumptions.push(slotConsumption);
      let discarded: TemplateCompilerProjectionDiscardedWhitespaceReceipt | null = null;
      let unwrapped: TemplateCompilerProjectionUnwrappedWrapperReceipt | null = null;
      let entrantSources: TemplateCompilerProjectionPhysicalSourceReceipt[];
      switch (contributor.disposition) {
        case HydrateElementProjectionContributorDisposition.RetainedNode:
          entrantSources = [source];
          break;
        case HydrateElementProjectionContributorDisposition.DiscardedWhitespace:
          entrantSources = [];
          discarded = new TemplateCompilerProjectionDiscardedWhitespaceReceipt(
            projectionLogicalExtractionAuthority,
            grouping,
            group,
            contributor,
            source,
          );
          discardedWhitespace.push(discarded);
          break;
        case HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent: {
          const wrapper = contributor.node;
          if (!(wrapper instanceof TemplateCompilerElementOccurrence) || wrapper.templateContent == null) {
            throw new Error('Unwrapped projection contributor has no exact template-content occurrence.');
          }
          const content = wrapper.templateContent;
          const contentSource = indexPhysicalSource(request, content, sourceByParent);
          entrantSources = contentSource.snapshot.children.map((node) => physicalContributorSource(
            request,
            group,
            contributor,
            contentSource,
            node,
          ));
          unwrapped = new TemplateCompilerProjectionUnwrappedWrapperReceipt(
            projectionLogicalExtractionAuthority,
            grouping,
            group,
            contributor,
            wrapper,
            source,
            content,
            contentSource.snapshot,
            slotConsumption,
          );
          unwrappedWrappers.push(unwrapped);
          break;
        }
      }
      const receipt = new TemplateCompilerProjectionContributorReceipt(
        projectionLogicalExtractionAuthority,
        grouping,
        group,
        contributor,
        source,
        slotConsumption,
        discarded,
        unwrapped,
      );
      contributorReceipts.push(receipt);
      receiptsByContributor.set(contributor, receipt);
      entrantSourcesByContributor.set(contributor, entrantSources);
    }
  }

  for (const residual of grouping.residualChildren) {
    const ordinal = hostSource.ordinalByNode.get(residual.node) ?? null;
    if (ordinal == null) throw new Error('Projection residual lost its host-child placement.');
    const source = new TemplateCompilerProjectionPhysicalSourceReceipt(
      projectionLogicalExtractionAuthority,
      grouping,
      null,
      null,
      residual,
      hostSource.snapshot,
      ordinal,
      resolveOrigin(request, residual.node),
    );
    residuals.push(new TemplateCompilerProjectionResidualReceipt(
      projectionLogicalExtractionAuthority,
      grouping,
      residual,
      source,
    ));
  }

  const plannedEntrantBands = grouping.definitionGroups.map((group) => {
    const groupReceipts = group.contributors.map((contributor) => receiptsByContributor.get(contributor)!);
    const ordered = group.contributors.flatMap((contributor) => entrantSourcesByContributor.get(contributor)!);
    const entrants = ordered.map((source, logicalOrdinal) => new TemplateCompilerProjectionPlannedEntrantReceipt(
      projectionLogicalExtractionAuthority,
      grouping,
      group,
      receiptsByContributor.get(source.contributor!)!,
      source,
      logicalOrdinal,
      ordered[logicalOrdinal + 1]?.node ?? null,
    ));
    return new TemplateCompilerProjectionPlannedEntrantBand(
      projectionLogicalExtractionAuthority,
      grouping,
      group,
      groupReceipts,
      entrants,
    );
  });

  return new TemplateCompilerProjectionLogicalExtractionPreparation(
    projectionLogicalExtractionAuthority,
    request,
    request.envelope.reachedElement,
    [...sourceByParent.values()].map((source) => source.snapshot),
    contributorReceipts,
    slotConsumptions,
    discardedWhitespace,
    unwrappedWrappers,
    residuals,
    plannedEntrantBands,
  );
}

/** Bind a pure extraction plan to the original scheduler family without staging its bands. */
export function realizeTemplateCompilerProjectionLogicalExtraction(
  request: TemplateCompilerProjectionLogicalExtractionRealizationRequest,
): TemplateCompilerProjectionLogicalExtractionRealization {
  validateRealizationRequest(request);
  const { preparation } = request;
  const session = preparation.taskSession;
  const contextByGroup = new Map(request.contexts.map((input) => [input.group, input.context]));
  const sequences = new Map<
    TemplateCompilerProjectionPhysicalChildSnapshot,
    TemplateCompilerSiteCursorPhysicalChildSequence
  >();
  const sequenceFor = (
    source: TemplateCompilerProjectionPhysicalChildSnapshot,
  ): TemplateCompilerSiteCursorPhysicalChildSequence => {
    const existing = sequences.get(source);
    if (existing != null) return existing;
    const sequence = session.capturePhysicalChildren(source.parent, source.children);
    sequences.set(source, sequence);
    return sequence;
  };
  const entrantBands = preparation.plannedEntrantBands.map((planned) => {
    const context = contextByGroup.get(planned.group)!;
    const entrants = planned.entrants.map((entrant) => new TemplateCompilerProjectionRealizedEntrantReceipt(
      projectionLogicalExtractionAuthority,
      entrant,
      context,
      sequenceFor(entrant.source.source),
    ));
    return new TemplateCompilerProjectionRealizedEntrantBand(
      projectionLogicalExtractionAuthority,
      planned,
      context,
      entrants,
    );
  });
  return new TemplateCompilerProjectionLogicalExtractionRealization(
    projectionLogicalExtractionAuthority,
    request,
    entrantBands,
  );
}

/** Rebase a durable slot-consumption fact into one immediate live-owner suppression capability. */
export function rebaseTemplateCompilerProjectionLiveSlotSuppression(
  preparation: TemplateCompilerProjectionLogicalExtractionPreparation,
  consumption: TemplateCompilerProjectionSlotConsumptionReceipt,
  reachedElement: TemplateCompilerSiteCursorReachedElement,
): TemplateCompilerProjectionLiveSlotSuppressionAuthority {
  const forest = preparation.request.forest;
  const reachedSelectionEvent = reachedElement.reachedSelectionEvent;
  const event = reachedElement.elementEvent;
  const selection = reachedSelectionEvent.selection;
  const element = consumption.element;
  const contributorReceipt = preparation.contributorReceiptFor(consumption.contributor);
  if (
    !preparation.isModuleConstructed()
    || preparation.slotConsumptionFor(element) !== consumption
    || contributorReceipt == null
    || !consumption.isModuleConstructed()
    || !reachedElement.isModuleConstructed()
    || !reachedElement.isCurrent()
    || reachedSelectionEvent.session !== preparation.taskSession
    || event.element !== element
    || selection.visit.node !== element
    || event.parent !== selection.visit.parent
    || event.parentOrdinal !== selection.visit.parentOrdinal
    || event.capturedSuccessor !== selection.visit.capturedSuccessor
    || selection.visit.parent !== contributorReceipt.source.parent
    || selection.visit.parentOrdinal !== contributorReceipt.source.sourceOrdinal
    || selection.visit.capturedSuccessor !== contributorReceipt.source.capturedSuccessor
  ) {
    throw new Error('Projection live slot suppression requires the exact planned contributor reached by its session.');
  }
  const attributes = element.readAttributes();
  let physicalOrdinal = -1;
  for (let ordinal = 0; ordinal < attributes.length; ordinal++) {
    if (attributes[ordinal] === consumption.attribute) {
      physicalOrdinal = ordinal;
      break;
    }
  }
  if (physicalOrdinal < 0) {
    throw new Error('Projection live slot suppression attribute is absent at its reached owner visit.');
  }
  return new TemplateCompilerProjectionLiveSlotSuppressionAuthority(
    projectionLogicalExtractionAuthority,
    consumption,
    reachedElement,
    forest,
    element,
    forest.mutationRevision,
    consumption.attribute,
    physicalOrdinal,
    attributes[physicalOrdinal + 1] ?? null,
  );
}

interface IndexedPhysicalSource {
  readonly snapshot: TemplateCompilerProjectionPhysicalChildSnapshot;
  readonly ordinalByNode: ReadonlyMap<TemplateCompilerNodeOccurrence, number>;
}

function indexPhysicalSource(
  request: TemplateCompilerProjectionLogicalExtractionPreparationRequest,
  parent: TemplateCompilerParentOccurrence,
  index: Map<TemplateCompilerParentOccurrence, IndexedPhysicalSource>,
): IndexedPhysicalSource {
  const existing = index.get(parent);
  if (existing != null) return existing;
  const children = parent.readChildren();
  const ordinalByNode = new Map<TemplateCompilerNodeOccurrence, number>();
  children.forEach((node, ordinal) => ordinalByNode.set(node, ordinal));
  if (ordinalByNode.size !== children.length) throw new Error('Projection physical source repeats one child occurrence.');
  const captured = {
    snapshot: new TemplateCompilerProjectionPhysicalChildSnapshot(
      projectionLogicalExtractionAuthority,
      request.envelope.projection.grouping,
      request.forest,
      request.forest.mutationRevision,
      parent,
      children,
    ),
    ordinalByNode,
  };
  index.set(parent, captured);
  return captured;
}

function physicalContributorSource(
  request: TemplateCompilerProjectionLogicalExtractionPreparationRequest,
  group: ProjectionGroup,
  contributor: ProjectionContributor,
  source: IndexedPhysicalSource,
  node: TemplateCompilerNodeOccurrence,
): TemplateCompilerProjectionPhysicalSourceReceipt {
  const ordinal = source.ordinalByNode.get(node) ?? null;
  if (ordinal == null || node.parent !== source.snapshot.parent) {
    throw new Error(`Projection occurrence '${node.occurrenceKey}' lost its exact physical source placement.`);
  }
  return new TemplateCompilerProjectionPhysicalSourceReceipt(
    projectionLogicalExtractionAuthority,
    request.envelope.projection.grouping,
    group,
    contributor,
    null,
    source.snapshot,
    ordinal,
    resolveOrigin(request, node),
  );
}

function createSlotConsumption(
  request: TemplateCompilerProjectionLogicalExtractionPreparationRequest,
  group: ProjectionGroup,
  contributor: ProjectionContributor,
): TemplateCompilerProjectionSlotConsumptionReceipt {
  const attribute = contributor.slotAttribute!;
  const element = contributor.node;
  if (!(element instanceof TemplateCompilerElementOccurrence) || attribute.owner !== element) {
    throw new Error('Projection slot consumption requires one exact element-owned attribute occurrence.');
  }
  const attributes = element.readAttributes();
  let physicalOrdinal = -1;
  for (let ordinal = 0; ordinal < attributes.length; ordinal++) {
    if (attributes[ordinal] === attribute) {
      physicalOrdinal = ordinal;
      break;
    }
  }
  if (physicalOrdinal < 0) throw new Error('Projection slot attribute is absent from its extraction-time owner.');
  return new TemplateCompilerProjectionSlotConsumptionReceipt(
    projectionLogicalExtractionAuthority,
    request.envelope.projection.grouping,
    group,
    contributor,
    request.forest,
    request.forest.mutationRevision,
    element,
    attribute,
    physicalOrdinal,
    attributes[physicalOrdinal + 1] ?? null,
    resolveOrigin(request, attribute),
  );
}

function resolveOrigin(
  request: TemplateCompilerProjectionLogicalExtractionPreparationRequest,
  occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
): TemplateCompilerProjectionLogicalOriginReceipt {
  const reference = occurrence.inputReference;
  const route = reference == null
    ? null
    : request.preWalk.originRouteForBrowserProduct(reference.productHandle);
  const state = reference == null
    ? TemplateCompilerPreWalkBrowserOriginState.Absent
    : request.preWalk.originStateForBrowserProduct(reference.productHandle);
  const exact = occurrence instanceof TemplateCompilerAttributeOccurrence
    ? request.forest.exactAuthoredAttributeOrigin(occurrence)
    : request.forest.exactAuthoredNodeOrigin(occurrence);
  if (
    (route != null && reference != null && (
      route.browser.productHandle !== reference.productHandle
      || route.browser.identityHandle !== reference.identityHandle
      || route.browser.addressHandle !== reference.addressHandle
    ))
    || !sameExactOrigin(route?.exactOrigin ?? null, exact)
  ) {
    throw new Error(`Projection occurrence '${occurrence.occurrenceKey}' has incoherent forest/pre-walk origin authority.`);
  }
  return new TemplateCompilerProjectionLogicalOriginReceipt(
    projectionLogicalExtractionAuthority,
    occurrence,
    state,
    route,
    exact,
  );
}

function validatePreparationRequest(
  request: TemplateCompilerProjectionLogicalExtractionPreparationRequest,
): TemplateCompilerSiteCursorElementEvent {
  const { forest, preWalk, envelope } = request;
  const grouping = envelope.projection.grouping;
  const reachedElement = envelope.reachedElement;
  const attestation = reachedElement.reachedSelectionEvent;
  const visit = attestation.selection.visit;
  const event = reachedElement.elementEvent;
  const host = envelope.element;
  const hostChildren = host.readChildren();
  const groupedMembers = grouping.groups.flatMap((group) => group.members);
  const extractedNodes = new Set(grouping.extractedContributors.map((contributor) => contributor.node));
  const residualNodes = new Set(grouping.residualChildren.map((child) => child.node));
  const hostOriginState = host.inputReference == null
    ? TemplateCompilerPreWalkBrowserOriginState.Absent
    : preWalk.originStateForBrowserProduct(host.inputReference.productHandle);
  if (
    !envelope.isModuleConstructed()
    || !reachedElement.isModuleConstructed()
    || !attestation.isModuleConstructed()
    || attestation.event !== event
    || attestation.binding.event !== event
    || attestation.binding.visit !== visit
    || event.element !== host
    || visit.node !== host
    || event.parent !== visit.parent
    || event.parentOrdinal !== visit.parentOrdinal
    || event.capturedSuccessor !== visit.capturedSuccessor
    || event.parent.readChildren()[event.parentOrdinal] !== host
    || (event.parent.readChildren()[event.parentOrdinal + 1] ?? null) !== event.capturedSuccessor
    || event.elementDefinition !== envelope.definition
    || event.elementRead !== envelope.elementRead
    || event.browserOriginState !== hostOriginState
    || event.lookupName !== envelope.resourceLookupName
    || event.authoredElement !== envelope.source.authoredElement
    || envelope.projection.state !== TemplateCompilerHydrateElementProjectionState.PendingExtraction
    || grouping.extractedContributors.length === 0
    || forest.nodeForOccurrenceKey(host.occurrenceKey) !== host
    || forest.mutationRevision !== envelope.endpoint.forestMutationRevision
    || preWalk.binding.forest !== forest
    || preWalk.index !== preWalk.binding.index
    || !preWalk.binding.browserEmission.publication.isCurrent()
    || attestation.session.rootContext.localKey !== `${preWalk.binding.lane.localKey}:cursor-context:root`
    || hostChildren.length !== envelope.projection.postProcessChildren.length
    || !sameObjects(hostChildren, envelope.projection.postProcessChildren)
    || groupedMembers.length !== grouping.extractedContributors.length
    || !sameObjects(groupedMembers, grouping.extractedContributors)
    || new Set(groupedMembers).size !== groupedMembers.length
    || extractedNodes.size !== grouping.extractedContributors.length
    || residualNodes.size !== grouping.residualChildren.length
    || extractedNodes.size + residualNodes.size !== hostChildren.length
    || hostChildren.some((child) => !extractedNodes.has(child) && !residualNodes.has(child))
    || (grouping.residualChildren.length > 0 && envelope.definition.shadowOptions == null)
  ) {
    throw new Error('Projection preparation requires one exact reached HE event, grouping, origin basis, and forest.');
  }
  return event;
}

function validateRealizationRequest(
  request: TemplateCompilerProjectionLogicalExtractionRealizationRequest,
): void {
  const { preparation, continuation } = request;
  const session = preparation.taskSession;
  const contextSet = new Set(request.contexts.map((input) => input.context));
  const firstContextOrdinal = request.contexts[0]?.context.ordinal ?? -1;
  const contextsAreExact = request.contexts.every((input, ordinal) =>
    input.group === preparation.plannedEntrantBands[ordinal]?.group
    && input.context.contextKind === projectionContextKind
    && input.context.parent === continuation.context
    && input.context.ordinal === firstContextOrdinal + ordinal
  );
  if (
    !preparation.isModuleConstructed()
    || !preparation.isCurrent()
    || !preparation.reachedElement.isCurrent()
    || !continuation.isModuleConstructed()
    || continuation.continuation !== preparation
    || continuation.sourceSelection !== preparation.sourceSelection
    || continuation.sourceContext !== preparation.sourceSelection.context
    || !session.reachedSelectionEventIsCurrent(preparation.reachedSelectionEvent)
    || request.contexts.length !== preparation.plannedEntrantBands.length
    || contextSet.size !== request.contexts.length
    || !contextsAreExact
  ) {
    throw new Error('Projection realization requires the attested continuation and exact descendant context order.');
  }
}

function sameExactOrigin(
  left: TemplateCompilerExactAuthoredOrigin | null,
  right: TemplateCompilerExactAuthoredOrigin | null,
): boolean {
  return left == null || right == null
    ? left === right
    : left.derivationProductHandle === right.derivationProductHandle
      && left.authored.productHandle === right.authored.productHandle
      && left.authored.identityHandle === right.authored.identityHandle
      && left.authored.addressHandle === right.authored.addressHandle
      && left.browserOutput.productHandle === right.browserOutput.productHandle
      && left.browserOutput.identityHandle === right.browserOutput.identityHandle
      && left.browserOutput.addressHandle === right.browserOutput.addressHandle;
}

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, ordinal) => right[ordinal] === value);
}

function qualifiedAttributeName(attribute: TemplateCompilerAttributeOccurrence): string {
  return attribute.prefix == null ? attribute.name : `${attribute.prefix}:${attribute.name}`;
}
