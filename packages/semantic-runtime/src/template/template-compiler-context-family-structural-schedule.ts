import {
  TemplateCompilerProjectionContextStructuralAuthority,
  TemplateCompilerRootContextStructuralAuthority,
  TemplateCompilerTargetContextRole,
  TemplateCompilerTemplateControllerContextStructuralAuthority,
} from './compiler-target-plan.js';
import { TemplateCompilerCompletedTemplateControllerLeafRehoming } from './template-compiler-context-family-completion.js';
import {
  TemplateCompilerFamilyElementLoweringSite,
  type TemplateCompilerFamilyReachDisposition,
  type TemplateCompilerFamilyRootMembershipDraft,
} from './template-compiler-context-family-row-assembly.js';
import {
  TemplateCompilerContextFamilyOrdinaryTargetRowMapping,
  type TemplateCompilerContextFamilyTargetContextMapping,
  type TemplateCompilerContextFamilyTargetPlanPreparation,
  type TemplateCompilerContextFamilyTargetRowMapping,
  TemplateCompilerContextFamilyTemplateControllerTargetRowMapping,
} from './template-compiler-context-family-target-plan.js';
import { TemplateCompilerFundedContextDefinitionOwnerKind } from './template-compiler-context-family-allocation.js';
import type { TemplateCompilerFundedHydrateElementHead } from './template-compiler-hydrate-element-funding.js';
import { TemplateCompilerLiveAttributeDisposition } from './template-compiler-live-attribute-owner.js';
import type {
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
} from './template-compiler-occurrence.js';
import { TemplateCompilerOccurrenceMembershipArrivalPosture } from './template-compiler-occurrence-membership.js';
import type {
  TemplateCompilerOccurrenceAttributeDispositionDraft,
  TemplateCompilerTextExpansionDraft,
} from './template-compiler-occurrence-row-assembly.js';
import {
  TemplateCompilerOccurrenceTargetRowDraft,
  TemplateCompilerTextExpansionOutputKind,
} from './template-compiler-occurrence-row-assembly.js';
import type {
  TemplateCompilerProjectionContributorReceipt,
  TemplateCompilerProjectionRealizedEntrantBand,
} from './template-compiler-projection-logical-extraction.js';
import type {
  TemplateCompilerProcessContentRemoval,
  TemplateCompilerProcessContentResult,
} from './template-compiler-process-content.js';
import type {
  TemplateCompilerSiteCursorProjectionExtractionEvent,
  TemplateCompilerSiteCursorTemplateControllerTransitionEvent,
} from './template-compiler-site-cursor.js';

const familyStructuralScheduleAuthority = {};

export const enum TemplateCompilerFamilyContextInitializationKind {
  RootBound = 'root-bound',
  Generated = 'generated',
  AdoptedInput = 'adopted-input',
}

/** Exact bind/create/adopt mode for one target context before its scheduled work begins. */
export class TemplateCompilerFamilyContextInitialization {
  readonly initializationKind: TemplateCompilerFamilyContextInitializationKind;
  readonly inputCarrier: TemplateCompilerElementOccurrence | null;
  readonly inputContent: TemplateCompilerFragmentOccurrence | null;
  readonly adoptionOwner: TemplateCompilerCompletedTemplateControllerLeafRehoming | null;

  constructor(
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    rootMembership: TemplateCompilerFamilyRootMembershipDraft | null,
  ) {
    const context = contextMapping.contextAssembly;
    this.initializationKind = contextMapping.targetContext.role === TemplateCompilerTargetContextRole.Root
      ? TemplateCompilerFamilyContextInitializationKind.RootBound
      : context.sourceAvailability.sourceArrivalPosture
          === TemplateCompilerOccurrenceMembershipArrivalPosture.AdoptedInput
        ? TemplateCompilerFamilyContextInitializationKind.AdoptedInput
        : TemplateCompilerFamilyContextInitializationKind.Generated;
    const adoptedCarrier = this.initializationKind === TemplateCompilerFamilyContextInitializationKind.AdoptedInput
      ? context.traversal.templateControllerOwner?.edge.preparation.host ?? null
      : null;
    this.adoptionOwner = this.initializationKind === TemplateCompilerFamilyContextInitializationKind.AdoptedInput
      ? context.loweredDispositions.find((disposition) =>
          disposition.semanticOwner instanceof TemplateCompilerCompletedTemplateControllerLeafRehoming
        )?.semanticOwner as TemplateCompilerCompletedTemplateControllerLeafRehoming | null ?? null
      : null;
    this.inputCarrier = this.initializationKind === TemplateCompilerFamilyContextInitializationKind.RootBound
      ? rootMembership?.compilerCarrier ?? null
      : adoptedCarrier;
    this.inputContent = this.initializationKind === TemplateCompilerFamilyContextInitializationKind.RootBound
      ? rootMembership?.compilerContent ?? null
      : adoptedCarrier?.templateContent ?? null;
    const structuralAuthority = contextMapping.targetContext.structuralAuthority;
    const definitionOwnerKind = contextMapping.definition.ownerKind;
    if (
      (this.initializationKind === TemplateCompilerFamilyContextInitializationKind.RootBound)
        !== (context.parent == null)
      || (this.initializationKind === TemplateCompilerFamilyContextInitializationKind.AdoptedInput
        && contextMapping.targetContext.role !== TemplateCompilerTargetContextRole.TemplateController)
      || (this.initializationKind === TemplateCompilerFamilyContextInitializationKind.Generated)
        !== (this.inputCarrier == null && this.inputContent == null)
      || (this.initializationKind !== TemplateCompilerFamilyContextInitializationKind.Generated)
        !== (this.inputCarrier != null && this.inputContent != null)
      || (this.initializationKind === TemplateCompilerFamilyContextInitializationKind.RootBound
        && (
          rootMembership == null
          || contextMapping.definition.owner !== rootMembership
          || definitionOwnerKind !== TemplateCompilerFundedContextDefinitionOwnerKind.Root
          || !(structuralAuthority instanceof TemplateCompilerRootContextStructuralAuthority)
        ))
      || (this.initializationKind === TemplateCompilerFamilyContextInitializationKind.AdoptedInput
        && (
          this.adoptionOwner == null
          || this.adoptionOwner.receipt.host !== this.inputCarrier
          || this.adoptionOwner.receipt.terminalLeaf !== contextMapping.cursorContext
          || definitionOwnerKind !== TemplateCompilerFundedContextDefinitionOwnerKind.TemplateController
          || !(structuralAuthority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority)
        ))
      || (this.initializationKind === TemplateCompilerFamilyContextInitializationKind.Generated
        && (
          this.adoptionOwner != null
          || (definitionOwnerKind === TemplateCompilerFundedContextDefinitionOwnerKind.TemplateController
            && !(structuralAuthority instanceof TemplateCompilerTemplateControllerContextStructuralAuthority))
          || (definitionOwnerKind === TemplateCompilerFundedContextDefinitionOwnerKind.Projection
            && !(structuralAuthority instanceof TemplateCompilerProjectionContextStructuralAuthority))
        ))
    ) {
      throw new Error(`Family context '${context.context.localKey}' lost structural initialization authority.`);
    }
  }
}

export class TemplateCompilerFamilyAttributeScheduleEntry {
  constructor(
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly mapping: TemplateCompilerContextFamilyTargetPlanPreparation['attributeDispositionMappings'][number],
  ) {
    if (
      !(mapping.draft.site instanceof TemplateCompilerFamilyElementLoweringSite)
      || mapping.draft.site.reachedContext !== contextMapping.cursorContext
    ) {
      throw new Error(`Family attribute '${mapping.draft.stableSlotKey}' lost reached-context ownership.`);
    }
  }

  get draft(): TemplateCompilerOccurrenceAttributeDispositionDraft {
    return this.mapping.draft;
  }

  get requiresConsumption(): boolean {
    return this.draft.disposition === TemplateCompilerLiveAttributeDisposition.Removed;
  }
}

/** Root-surrogate attribute disposition retained outside every content-context entry band. */
export class TemplateCompilerFamilySurrogateAttributeScheduleEntry {
  constructor(
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly mapping: TemplateCompilerContextFamilyTargetPlanPreparation[
      'surrogateAttributeDispositionMappings'
    ][number],
  ) {
    if (
      contextMapping.targetContext.role !== TemplateCompilerTargetContextRole.Root
    ) {
      throw new Error(`Family surrogate attribute '${mapping.draft.stableSlotKey}' lost root-carrier ownership.`);
    }
  }

  get draft() {
    return this.mapping.draft;
  }

  get requiresConsumption(): boolean {
    return this.draft.disposition === TemplateCompilerLiveAttributeDisposition.Removed;
  }
}

export class TemplateCompilerFamilyProcessContentAdoptionEntry {
  constructor(
    readonly disposition: TemplateCompilerFamilyReachDisposition,
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly hydrateElement: TemplateCompilerFundedHydrateElementHead<
      object,
      { readonly stableSlotKey: string; readonly site: object }
    >,
    readonly result: TemplateCompilerProcessContentResult,
    readonly removal: TemplateCompilerProcessContentRemoval,
    readonly removalOrdinal: number,
  ) {
    const reference = hydrateElement.instruction.auSlotProcessContentRemovedChildNodes[removalOrdinal] ?? null;
    const exactOrigin = result.plan.execution.forest.exactAuthoredNodeOrigin(removal.occurrence)?.authored ?? null;
    if (
      disposition.loweringContext !== contextMapping.cursorContext
      || hydrateElement.draft.site !== disposition.site
      || hydrateElement.draft.auSlotProcessContent == null
      || hydrateElement.draft.auSlotProcessContent.name !== result.metadata.name
      || result.removals[removalOrdinal] !== removal
      || reference == null
      || reference?.productHandle !== exactOrigin?.productHandle
      || reference.identityHandle !== exactOrigin?.identityHandle
      || reference.addressHandle !== exactOrigin?.addressHandle
    ) {
      throw new Error(`Family processContent removal '${removal.occurrence.occurrenceKey}' lost funded HE order.`);
    }
  }
}

export class TemplateCompilerFamilyTemplateControllerScheduleEntry {
  constructor(
    readonly event: TemplateCompilerSiteCursorTemplateControllerTransitionEvent,
    readonly sourceContext: TemplateCompilerContextFamilyTargetContextMapping,
    readonly contextChain: readonly TemplateCompilerContextFamilyTargetContextMapping[],
    readonly rowMappings: readonly TemplateCompilerContextFamilyTemplateControllerTargetRowMapping[],
    readonly destinationMembership: TemplateCompilerContextFamilyTargetPlanPreparation['membershipMappings'][number],
  ) {
    if (
      event.preparation.sourceContext !== sourceContext.cursorContext
      || contextChain.length !== event.realization.contexts.length
      || contextChain.some((mapping, ordinal) => mapping.cursorContext !== event.realization.contexts[ordinal])
      || rowMappings.length !== event.realization.edges.length
      || rowMappings.some((mapping, ordinal) => mapping.draft.edge !== event.realization.edges[ordinal])
      || destinationMembership.draft.occurrence !== event.host
      || destinationMembership.contextMapping.cursorContext !== event.realization.terminalLeaf
    ) {
      throw new Error(`Family TC transition '${event.host.occurrenceKey}' lost chain or destination ownership.`);
    }
  }

  get terminalLeaf(): TemplateCompilerContextFamilyTargetContextMapping {
    return this.contextChain.at(-1)!;
  }
}

export class TemplateCompilerFamilyProjectionContributorScheduleEntry {
  constructor(
    readonly receipt: TemplateCompilerProjectionContributorReceipt,
    readonly contributor: TemplateCompilerProjectionContextStructuralAuthority['projection']['contributors'][number],
  ) {
    if (
      contributor.slotName !== receipt.contributor.slotName
      || contributor.disposition !== receipt.contributor.disposition
      || contributor.node.productHandle !== receipt.source.origin.exactAuthoredOrigin?.authored.productHandle
    ) {
      throw new Error(`Projection contributor '${receipt.source.node.occurrenceKey}' lost wire/receipt ownership.`);
    }
  }
}

export class TemplateCompilerFamilyProjectionGroupSchedule {
  readonly contributors: readonly TemplateCompilerFamilyProjectionContributorScheduleEntry[];

  constructor(
    readonly band: TemplateCompilerProjectionRealizedEntrantBand,
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly projection: TemplateCompilerProjectionContextStructuralAuthority['projection'],
  ) {
    this.contributors = band.planned.contributors.map((receipt, ordinal) =>
      new TemplateCompilerFamilyProjectionContributorScheduleEntry(
        receipt,
        projection.contributors[ordinal]!,
      )
    );
    const authority = contextMapping.targetContext.structuralAuthority;
    if (
      band.context !== contextMapping.cursorContext
      || !(authority instanceof TemplateCompilerProjectionContextStructuralAuthority)
      || authority.projection !== projection
      || projection.slotName !== band.planned.group.slotName
      || this.contributors.length !== projection.contributors.length
    ) {
      throw new Error(`Projection group '${band.planned.group.slotName}' lost context or contributor coverage.`);
    }
  }
}

export class TemplateCompilerFamilyProjectionScheduleEntry {
  readonly groups: readonly TemplateCompilerFamilyProjectionGroupSchedule[];
  readonly discardedContributors: readonly TemplateCompilerFamilyProjectionContributorScheduleEntry[];
  readonly physicalContributors: readonly TemplateCompilerFamilyProjectionContributorScheduleEntry[];

  constructor(
    readonly event: TemplateCompilerSiteCursorProjectionExtractionEvent,
    readonly ownerContext: TemplateCompilerContextFamilyTargetContextMapping,
    readonly hydrateElement: TemplateCompilerFundedHydrateElementHead<
      object,
      { readonly stableSlotKey: string; readonly site: object }
    >,
    contextByCursor: ReadonlyMap<
      TemplateCompilerProjectionRealizedEntrantBand['context'],
      TemplateCompilerContextFamilyTargetContextMapping
    >,
  ) {
    this.groups = event.realization.entrantBands.map((band, ordinal) => {
      const contextMapping = contextByCursor.get(band.context) ?? null;
      const projection = hydrateElement.instruction.projections[ordinal] ?? null;
      if (contextMapping == null || projection == null) {
        throw new Error(`Projection group '${band.planned.group.slotName}' lost funded context definition.`);
      }
      return new TemplateCompilerFamilyProjectionGroupSchedule(band, contextMapping, projection);
    });
    this.discardedContributors = event.preparation.discardedWhitespace.map((discarded, ordinal) => {
      const receipt = event.preparation.contributorReceiptFor(discarded.contributor);
      const contributor = hydrateElement.instruction.discardedProjectionContributors[ordinal];
      if (receipt == null || contributor == null) {
        throw new Error('Discarded projection input lost funded contributor order.');
      }
      return new TemplateCompilerFamilyProjectionContributorScheduleEntry(receipt, contributor);
    });
    const scheduledContributors = [
      ...this.groups.flatMap((group) => group.contributors),
      ...this.discardedContributors,
    ];
    const scheduledByReceipt = new Map(scheduledContributors.map((contributor) =>
      [contributor.receipt, contributor] as const
    ));
    this.physicalContributors = event.preparation.contributorReceipts.flatMap((receipt) => {
      const contributor = scheduledByReceipt.get(receipt);
      return contributor == null ? [] : [contributor];
    });
    const row = hydrateElement.draft.row;
    const site = hydrateElement.draft.site;
    if (
      !(row instanceof TemplateCompilerOccurrenceTargetRowDraft)
      || row.hydrateElement?.envelope !== event.preparation.request.envelope
      || !(site instanceof TemplateCompilerFamilyElementLoweringSite)
      || site.reach.hydrateElement.projectionExtraction !== event
      || this.groups.length !== hydrateElement.instruction.projections.length
      || this.discardedContributors.length
        !== hydrateElement.instruction.discardedProjectionContributors.length
      || this.physicalContributors.length !== event.preparation.contributorReceipts.length
      || this.physicalContributors.some((contributor, ordinal) =>
        contributor.receipt !== event.preparation.contributorReceipts[ordinal]
      )
      || event.realization.request.contexts.some((input) => input.context.parent !== ownerContext.cursorContext)
    ) {
      throw new Error(`Family projection '${event.host.occurrenceKey}' lost HE owner or group coverage.`);
    }
  }
}

export const enum TemplateCompilerFamilyStructuralEntryKind {
  ReachedElement = 'reached-element',
  LoweredElement = 'lowered-element',
  Text = 'text',
  Let = 'let',
}

export class TemplateCompilerFamilyReachedElementScheduleEntry {
  readonly entryKind = TemplateCompilerFamilyStructuralEntryKind.ReachedElement;

  constructor(
    readonly disposition: TemplateCompilerFamilyReachDisposition,
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly attributes: readonly TemplateCompilerFamilyAttributeScheduleEntry[],
    readonly templateController: TemplateCompilerFamilyTemplateControllerScheduleEntry | null,
  ) {
    if (
      disposition.site.siteKind !== 'element'
      || disposition.reachedContext !== contextMapping.cursorContext
      || attributes.some((entry) => entry.mapping.draft.site !== disposition.site)
      || (templateController != null
        && templateController.event.preparation.host !== disposition.site.event.element)
    ) {
      throw new Error('Reached family element schedule lost attribute or TC ownership.');
    }
  }
}

export class TemplateCompilerFamilyLoweredElementScheduleEntry {
  readonly entryKind = TemplateCompilerFamilyStructuralEntryKind.LoweredElement;

  constructor(
    readonly disposition: TemplateCompilerFamilyReachDisposition,
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly processContent: readonly TemplateCompilerFamilyProcessContentAdoptionEntry[],
    readonly projection: TemplateCompilerFamilyProjectionScheduleEntry | null,
    readonly targetRow: TemplateCompilerContextFamilyOrdinaryTargetRowMapping | null,
  ) {
    if (
      disposition.site.siteKind !== 'element'
      || disposition.loweringContext !== contextMapping.cursorContext
      || processContent.some((entry) => entry.hydrateElement.draft.site !== disposition.site)
      || (projection != null && projection.event.host !== disposition.site.event.element)
      || (targetRow != null && targetRow.draft.site !== disposition.site)
    ) {
      throw new Error('Lowered family element schedule lost process, projection, or target-row ownership.');
    }
  }
}

export class TemplateCompilerFamilyTextScheduleEntry {
  readonly entryKind = TemplateCompilerFamilyStructuralEntryKind.Text;

  constructor(
    readonly disposition: TemplateCompilerFamilyReachDisposition,
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly expansion: TemplateCompilerTextExpansionDraft | null,
    readonly rows: readonly TemplateCompilerContextFamilyOrdinaryTargetRowMapping[],
  ) {
    if (
      disposition.site.siteKind !== 'text'
      || disposition.loweringContext !== contextMapping.cursorContext
      || (expansion == null) !== (rows.length === 0)
      || (expansion != null && (
        expansion.site !== disposition.site
        || rows.length !== expansion.outputs.filter((output) =>
          output.outputKind === TemplateCompilerTextExpansionOutputKind.Hole
        ).length
        || rows.some((mapping, ordinal) => mapping.draft.textOutput?.holeIndex !== ordinal)
      ))
    ) {
      throw new Error('Family text schedule lost expansion or hole-row ownership.');
    }
  }
}

/** One reached `<let>` lowered to its dedicated marker row in the final owning context. */
export class TemplateCompilerFamilyLetScheduleEntry {
  readonly entryKind = TemplateCompilerFamilyStructuralEntryKind.Let;

  constructor(
    readonly disposition: TemplateCompilerFamilyReachDisposition,
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly targetRow: TemplateCompilerContextFamilyOrdinaryTargetRowMapping,
  ) {
    if (
      disposition.site.siteKind !== 'let'
      || disposition.reach.reachKind !== 'let'
      || disposition.reachedContext !== contextMapping.cursorContext
      || disposition.loweringContext !== contextMapping.cursorContext
      || targetRow.draft.site !== disposition.site
      || targetRow.contextMapping !== contextMapping
    ) {
      throw new Error('Family let schedule lost reached site, final context, or target-row ownership.');
    }
  }
}

export type TemplateCompilerFamilyStructuralScheduleEntry =
  | TemplateCompilerFamilyReachedElementScheduleEntry
  | TemplateCompilerFamilyLoweredElementScheduleEntry
  | TemplateCompilerFamilyTextScheduleEntry
  | TemplateCompilerFamilyLetScheduleEntry;

export class TemplateCompilerFamilyContextStructuralSchedule {
  constructor(
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly initialization: TemplateCompilerFamilyContextInitialization,
    readonly entries: readonly TemplateCompilerFamilyStructuralScheduleEntry[],
  ) {
    if (
      initialization.contextMapping !== contextMapping
      || entries.some((entry) => entry.contextMapping !== contextMapping)
    ) {
      throw new Error(`Family context '${contextMapping.cursorContext.localKey}' lost scheduled entry ownership.`);
    }
  }
}

export type TemplateCompilerFamilyIncomingScheduleOwner =
  | TemplateCompilerFamilyTemplateControllerScheduleEntry
  | TemplateCompilerFamilyProjectionGroupSchedule;

export class TemplateCompilerFamilyTemplateControllerExecutionBand {
  constructor(
    readonly schedule: TemplateCompilerFamilyTemplateControllerScheduleEntry,
    readonly contextChain: readonly TemplateCompilerFamilyContextExecutionBand[],
  ) {
    if (
      contextChain.length !== schedule.contextChain.length
      || contextChain.some((context, ordinal) => context.schedule.contextMapping !== schedule.contextChain[ordinal])
      || contextChain.slice(0, -1).some((context) => context.schedule.entries.length > 0)
      || contextChain.at(-1)?.schedule.contextMapping !== schedule.terminalLeaf
    ) {
      throw new Error(`Family TC execution '${schedule.event.host.occurrenceKey}' lost child/return hierarchy.`);
    }
  }

  get terminalLeaf(): TemplateCompilerFamilyContextExecutionBand {
    return this.contextChain.at(-1)!;
  }
}

export class TemplateCompilerFamilyProjectionGroupExecutionBand {
  constructor(
    readonly schedule: TemplateCompilerFamilyProjectionGroupSchedule,
    readonly context: TemplateCompilerFamilyContextExecutionBand,
  ) {
    if (context.schedule.contextMapping !== schedule.contextMapping) {
      throw new Error(`Projection group '${schedule.projection.slotName}' lost child/return hierarchy.`);
    }
  }
}

export class TemplateCompilerFamilyReachedElementExecutionBand {
  constructor(
    readonly schedule: TemplateCompilerFamilyReachedElementScheduleEntry,
    readonly templateController: TemplateCompilerFamilyTemplateControllerExecutionBand | null,
  ) {
    if ((schedule.templateController == null) !== (templateController == null)) {
      throw new Error('Reached family element lost optional TC execution hierarchy.');
    }
    if (templateController != null && templateController.schedule !== schedule.templateController) {
      throw new Error('Reached family element retained a foreign TC execution hierarchy.');
    }
  }
}

export class TemplateCompilerFamilyLoweredElementExecutionBand {
  constructor(
    readonly schedule: TemplateCompilerFamilyLoweredElementScheduleEntry,
    readonly projectionGroups: readonly TemplateCompilerFamilyProjectionGroupExecutionBand[],
  ) {
    if (
      projectionGroups.length !== (schedule.projection?.groups.length ?? 0)
      || projectionGroups.some((group, ordinal) => group.schedule !== schedule.projection?.groups[ordinal])
    ) {
      throw new Error('Lowered family element lost projection group/return hierarchy.');
    }
  }
}

export type TemplateCompilerFamilyExecutionEntry =
  | TemplateCompilerFamilyReachedElementExecutionBand
  | TemplateCompilerFamilyLoweredElementExecutionBand
  | TemplateCompilerFamilyTextScheduleEntry
  | TemplateCompilerFamilyLetScheduleEntry;

/** Recursive execution band; returning from one child resumes the next entry in this array. */
export class TemplateCompilerFamilyContextExecutionBand {
  constructor(
    readonly schedule: TemplateCompilerFamilyContextStructuralSchedule,
    readonly entries: readonly TemplateCompilerFamilyExecutionEntry[],
  ) {
    if (
      entries.length !== schedule.entries.length
      || entries.some((entry, ordinal) => {
        const scheduled = schedule.entries[ordinal];
        return entry instanceof TemplateCompilerFamilyReachedElementExecutionBand
          ? entry.schedule !== scheduled
          : entry instanceof TemplateCompilerFamilyLoweredElementExecutionBand
            ? entry.schedule !== scheduled
            : entry !== scheduled;
      })
    ) {
      throw new Error(`Family context '${schedule.contextMapping.cursorContext.localKey}' lost execution order.`);
    }
  }
}

export class TemplateCompilerContextFamilyStructuralSchedulePreparation {
  readonly #authority: object;
  readonly contextByCursor: ReadonlyMap<
    TemplateCompilerSiteCursorProjectionExtractionEvent['realization']['entrantBands'][number]['context'],
    TemplateCompilerFamilyContextStructuralSchedule
  >;
  /** Exact child-before-return order for adopting already-committed processContent removals. */
  readonly processContentExecutionOrder: readonly TemplateCompilerFamilyProcessContentAdoptionEntry[];
  /** Root attribute outcomes execute only after the complete recursive content band returns. */
  readonly surrogateAttributes: readonly TemplateCompilerFamilySurrogateAttributeScheduleEntry[];

  constructor(
    authority: object,
    readonly target: TemplateCompilerContextFamilyTargetPlanPreparation,
    readonly contexts: readonly TemplateCompilerFamilyContextStructuralSchedule[],
    readonly rootExecution: TemplateCompilerFamilyContextExecutionBand,
    readonly incomingOwnerByContext: ReadonlyMap<
      TemplateCompilerContextFamilyTargetContextMapping,
      TemplateCompilerFamilyIncomingScheduleOwner
    >,
  ) {
    this.contextByCursor = new Map(contexts.map((context) => [
      context.contextMapping.cursorContext,
      context,
    ] as const));
    this.surrogateAttributes = target.surrogateAttributeDispositionMappings.map((mapping) =>
      new TemplateCompilerFamilySurrogateAttributeScheduleEntry(contexts[0]!.contextMapping, mapping)
    );
    const rows = target.allocation.rows;
    const reached = contexts.flatMap((context) => context.entries).filter(
      (entry): entry is TemplateCompilerFamilyReachedElementScheduleEntry =>
        entry instanceof TemplateCompilerFamilyReachedElementScheduleEntry,
    );
    const loweredElements = contexts.flatMap((context) => context.entries).filter(
      (entry): entry is TemplateCompilerFamilyLoweredElementScheduleEntry =>
        entry instanceof TemplateCompilerFamilyLoweredElementScheduleEntry,
    );
    const texts = contexts.flatMap((context) => context.entries).filter(
      (entry): entry is TemplateCompilerFamilyTextScheduleEntry =>
        entry instanceof TemplateCompilerFamilyTextScheduleEntry,
    );
    const lets = contexts.flatMap((context) => context.entries).filter(
      (entry): entry is TemplateCompilerFamilyLetScheduleEntry =>
        entry instanceof TemplateCompilerFamilyLetScheduleEntry,
    );
    const elementDispositions = rows.reachDispositions.filter((disposition) => disposition.site.siteKind === 'element');
    const textDispositions = rows.reachDispositions.filter((disposition) => disposition.site.siteKind === 'text');
    const letDispositions = rows.reachDispositions.filter((disposition) => disposition.site.siteKind === 'let');
    const attributeMappings = reached.flatMap((entry) => entry.attributes).map((entry) => entry.mapping);
    const tcRows = reached.flatMap((entry) => entry.templateController?.rowMappings ?? []);
    const ordinaryRows = [
      ...loweredElements.flatMap((entry) => entry.targetRow == null ? [] : [entry.targetRow]),
      ...texts.flatMap((entry) => entry.rows),
      ...lets.map((entry) => entry.targetRow),
    ];
    const scheduledRows = new Set<TemplateCompilerContextFamilyTargetRowMapping>([
      ...tcRows,
      ...ordinaryRows,
    ]);
    const executionOrder = structuralScheduleExecutionOrder(rootExecution);
    this.processContentExecutionOrder = executionOrder.processContent;
    const expectedProcessRemovals = rows.receipt.traversal.audit.processContentEvents.flatMap(
      (event) => event.result.removals,
    );
    if (
      authority !== familyStructuralScheduleAuthority
      || !target.isModuleConstructed()
      || !target.isCurrent()
      || contexts.length !== rows.contexts.length
      || this.contextByCursor.size !== contexts.length
      || !sameObjects(
        contexts.map((context) => context.contextMapping),
        target.contextMappings,
      )
      || rootExecution.schedule !== contexts[0]
      || incomingOwnerByContext.size !== contexts.length - 1
      || contexts.slice(1).some((context) => !incomingOwnerByContext.has(context.contextMapping))
      || reached.length !== elementDispositions.length
      || new Set(reached.map((entry) => entry.disposition)).size !== elementDispositions.length
      || loweredElements.length !== elementDispositions.length
      || new Set(loweredElements.map((entry) => entry.disposition)).size !== elementDispositions.length
      || texts.length !== textDispositions.length
      || new Set(texts.map((entry) => entry.disposition)).size !== textDispositions.length
      || lets.length !== letDispositions.length
      || new Set(lets.map((entry) => entry.disposition)).size !== letDispositions.length
      || !sameObjects(attributeMappings, target.attributeDispositionMappings)
      || scheduledRows.size !== target.rowMappings.length
      || target.rowMappings.some((mapping) => !scheduledRows.has(mapping))
      || !sameObjects(
        executionOrder.templateControllers.map((entry) => entry.event),
        rows.receipt.traversal.templateControllerTransitions,
      )
      || !sameObjects(
        executionOrder.projections.map((entry) => entry.event),
        rows.receipt.traversal.projectionExtractions,
      )
      || !sameObjects(this.processContentExecutionOrder.map((entry) => entry.removal), expectedProcessRemovals)
      || !sameObjects(
        this.surrogateAttributes.map((entry) => entry.mapping),
        target.surrogateAttributeDispositionMappings,
      )
      || this.surrogateAttributes.some((entry) =>
        entry.draft.owner.element !== rows.rootMembership.compilerCarrier
      )
    ) {
      throw new Error('Context-family structural schedule lost context, reach, row, or attribute coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === familyStructuralScheduleAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed() && this.target.isCurrent();
  }
}

function structuralScheduleExecutionOrder(
  root: TemplateCompilerFamilyContextExecutionBand,
): {
  readonly templateControllers: readonly TemplateCompilerFamilyTemplateControllerScheduleEntry[];
  readonly projections: readonly TemplateCompilerFamilyProjectionScheduleEntry[];
  readonly processContent: readonly TemplateCompilerFamilyProcessContentAdoptionEntry[];
} {
  const templateControllers: TemplateCompilerFamilyTemplateControllerScheduleEntry[] = [];
  const projections: TemplateCompilerFamilyProjectionScheduleEntry[] = [];
  const processContent: TemplateCompilerFamilyProcessContentAdoptionEntry[] = [];
  const visit = (context: TemplateCompilerFamilyContextExecutionBand): void => {
    for (const entry of context.entries) {
      if (entry instanceof TemplateCompilerFamilyReachedElementExecutionBand) {
        const controller = entry.templateController;
        if (controller == null) continue;
        templateControllers.push(controller.schedule);
        for (const child of controller.contextChain) visit(child);
        continue;
      }
      if (entry instanceof TemplateCompilerFamilyLoweredElementExecutionBand) {
        processContent.push(...entry.schedule.processContent);
        if (entry.schedule.projection != null) projections.push(entry.schedule.projection);
        for (const group of entry.projectionGroups) visit(group.context);
      }
    }
  };
  visit(root);
  return { templateControllers, projections, processContent };
}

/** Build the complete non-mutating family structural schedule from retained semantic ownership. */
export function prepareTemplateCompilerContextFamilyStructuralSchedule(
  target: TemplateCompilerContextFamilyTargetPlanPreparation,
): TemplateCompilerContextFamilyStructuralSchedulePreparation {
  if (!target.isModuleConstructed() || !target.isCurrent()) {
    throw new Error('Family structural scheduling requires one current module-constructed target preparation.');
  }
  const rows = target.allocation.rows;
  const attributesBySite = groupBy(
    target.attributeDispositionMappings,
    (mapping) => mapping.draft.site,
  );
  const ordinaryRowBySite = new Map(
    target.rowMappings.flatMap((mapping) =>
      mapping instanceof TemplateCompilerContextFamilyOrdinaryTargetRowMapping
        && (mapping.draft.site.siteKind === 'element' || mapping.draft.site.siteKind === 'let')
        ? [[mapping.draft.site, mapping] as const]
        : []
    ),
  );
  const ordinaryRowsByTextSite = groupBy(
    target.rowMappings.filter((mapping): mapping is TemplateCompilerContextFamilyOrdinaryTargetRowMapping =>
      mapping instanceof TemplateCompilerContextFamilyOrdinaryTargetRowMapping
      && mapping.draft.site.siteKind === 'text'
    ),
    (mapping) => mapping.draft.site,
  );
  const tcRowsByPreparation = groupBy(
    target.rowMappings.filter((mapping): mapping is TemplateCompilerContextFamilyTemplateControllerTargetRowMapping =>
      mapping instanceof TemplateCompilerContextFamilyTemplateControllerTargetRowMapping
    ),
    (mapping) => mapping.draft.edge.preparation,
  );
  const heBySite = new Map(target.allocation.hydrateElements.map((head) => [head.draft.site, head] as const));
  const textExpansionBySite = new Map(rows.contexts.flatMap((context) =>
    context.textExpansions.map((expansion) => [expansion.site, expansion] as const)
  ));

  const transitionFor = (
    disposition: TemplateCompilerFamilyReachDisposition,
  ): TemplateCompilerFamilyTemplateControllerScheduleEntry | null => {
    if (disposition.site.siteKind !== 'element') return null;
    const reach = disposition.reach;
    if (reach.reachKind !== 'element') return null;
    const event = reach.hydrateElement.templateControllerTransition;
    if (event == null) return null;
    const rowMappings = tcRowsByPreparation.get(event.preparation) ?? [];
    const contextChain = event.realization.contexts.map((context) => target.contextByCursor.get(context)!);
    const sourceContext = target.contextByCursor.get(event.preparation.sourceContext)!;
    const destinationMembership = target.membershipByOccurrence.get(event.host)!;
    return new TemplateCompilerFamilyTemplateControllerScheduleEntry(
      event,
      sourceContext,
      contextChain,
      rowMappings,
      destinationMembership,
    );
  };

  const loweredElement = (
    disposition: TemplateCompilerFamilyReachDisposition,
    contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
  ): TemplateCompilerFamilyLoweredElementScheduleEntry => {
    if (disposition.site.siteKind !== 'element') throw new Error('Expected lowered element disposition.');
    const reach = disposition.reach;
    if (reach.reachKind !== 'element') throw new Error('Expected lowered element reach.');
    const head = heBySite.get(disposition.site) ?? null;
    const result = head?.draft.auSlotProcessContent == null
      ? null
      : reach.hydrateElement.staging.draft?.processContent.result ?? null;
    const processContent = result == null || head == null
      ? []
      : result.removals.map((removal, ordinal) => new TemplateCompilerFamilyProcessContentAdoptionEntry(
          disposition,
          contextMapping,
          head,
          result,
          removal,
          ordinal,
        ));
    const projectionEvent = reach.hydrateElement.projectionExtraction;
    const projection = projectionEvent == null || head == null
      ? null
      : new TemplateCompilerFamilyProjectionScheduleEntry(
          projectionEvent,
          contextMapping,
          head,
          target.contextByCursor,
        );
    return new TemplateCompilerFamilyLoweredElementScheduleEntry(
      disposition,
      contextMapping,
      processContent,
      projection,
      ordinaryRowBySite.get(disposition.site) ?? null,
    );
  };

  const loweredLet = (
    disposition: TemplateCompilerFamilyReachDisposition,
    contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
  ): TemplateCompilerFamilyLetScheduleEntry => {
    if (disposition.site.siteKind !== 'let') throw new Error('Expected lowered let disposition.');
    const targetRow = ordinaryRowBySite.get(disposition.site) ?? null;
    if (targetRow == null) throw new Error('Reached let site has no dedicated marker target row.');
    return new TemplateCompilerFamilyLetScheduleEntry(disposition, contextMapping, targetRow);
  };

  const contexts = rows.contexts.map((context) => {
    const contextMapping = target.contextByCursor.get(context.context)!;
    const entries: TemplateCompilerFamilyStructuralScheduleEntry[] = [];
    for (const disposition of context.loweredDispositions.filter((candidate) =>
      candidate.reachedContext !== context.context
    )) {
      if (disposition.site.siteKind === 'element') {
        entries.push(loweredElement(disposition, contextMapping));
      } else if (disposition.site.siteKind === 'text') {
        entries.push(textEntry(disposition, contextMapping, textExpansionBySite, ordinaryRowsByTextSite));
      } else {
        entries.push(loweredLet(disposition, contextMapping));
      }
    }
    for (const disposition of context.reachedDispositions) {
      if (disposition.site.siteKind === 'element') {
        entries.push(new TemplateCompilerFamilyReachedElementScheduleEntry(
          disposition,
          contextMapping,
          (attributesBySite.get(disposition.site) ?? []).map((mapping) =>
            new TemplateCompilerFamilyAttributeScheduleEntry(contextMapping, mapping)
          ),
          transitionFor(disposition),
        ));
        if (disposition.loweringContext === context.context) {
          entries.push(loweredElement(disposition, contextMapping));
        }
      } else if (disposition.loweringContext === context.context) {
        if (disposition.site.siteKind === 'text') {
          entries.push(textEntry(disposition, contextMapping, textExpansionBySite, ordinaryRowsByTextSite));
        } else {
          entries.push(loweredLet(disposition, contextMapping));
        }
      }
    }
    return new TemplateCompilerFamilyContextStructuralSchedule(
      contextMapping,
      new TemplateCompilerFamilyContextInitialization(
        contextMapping,
        context.parent == null ? rows.rootMembership : null,
      ),
      entries,
    );
  });
  const hierarchy = buildExecutionHierarchy(contexts);
  return new TemplateCompilerContextFamilyStructuralSchedulePreparation(
    familyStructuralScheduleAuthority,
    target,
    contexts,
    hierarchy.root,
    hierarchy.incomingOwnerByContext,
  );
}

function buildExecutionHierarchy(
  contexts: readonly TemplateCompilerFamilyContextStructuralSchedule[],
): {
  readonly root: TemplateCompilerFamilyContextExecutionBand;
  readonly incomingOwnerByContext: ReadonlyMap<
    TemplateCompilerContextFamilyTargetContextMapping,
    TemplateCompilerFamilyIncomingScheduleOwner
  >;
} {
  const scheduleByMapping = new Map(contexts.map((context) => [context.contextMapping, context] as const));
  const cache = new Map<TemplateCompilerFamilyContextStructuralSchedule, TemplateCompilerFamilyContextExecutionBand>();
  const active = new Set<TemplateCompilerFamilyContextStructuralSchedule>();
  const incomingOwnerByContext = new Map<
    TemplateCompilerContextFamilyTargetContextMapping,
    TemplateCompilerFamilyIncomingScheduleOwner
  >();
  const claimIncoming = (
    context: TemplateCompilerContextFamilyTargetContextMapping,
    owner: TemplateCompilerFamilyIncomingScheduleOwner,
  ): TemplateCompilerFamilyContextStructuralSchedule => {
    if (incomingOwnerByContext.has(context)) {
      throw new Error(`Family context '${context.cursorContext.localKey}' has more than one schedule owner.`);
    }
    incomingOwnerByContext.set(context, owner);
    const schedule = scheduleByMapping.get(context) ?? null;
    if (schedule == null) throw new Error(`Family context '${context.cursorContext.localKey}' has no local schedule.`);
    return schedule;
  };
  const build = (schedule: TemplateCompilerFamilyContextStructuralSchedule): TemplateCompilerFamilyContextExecutionBand => {
    const existing = cache.get(schedule) ?? null;
    if (existing != null) return existing;
    if (active.has(schedule)) {
      throw new Error(`Family context '${schedule.contextMapping.cursorContext.localKey}' has cyclic schedule ownership.`);
    }
    active.add(schedule);
    const entries = schedule.entries.map((entry): TemplateCompilerFamilyExecutionEntry => {
      if (entry instanceof TemplateCompilerFamilyReachedElementScheduleEntry) {
        const tc = entry.templateController;
        const execution = tc == null
          ? null
          : new TemplateCompilerFamilyTemplateControllerExecutionBand(
              tc,
              tc.contextChain.map((context) => build(claimIncoming(context, tc))),
            );
        return new TemplateCompilerFamilyReachedElementExecutionBand(entry, execution);
      }
      if (entry instanceof TemplateCompilerFamilyLoweredElementScheduleEntry) {
        const projectionGroups = entry.projection?.groups.map((group) =>
          new TemplateCompilerFamilyProjectionGroupExecutionBand(
            group,
            build(claimIncoming(group.contextMapping, group)),
          )
        ) ?? [];
        return new TemplateCompilerFamilyLoweredElementExecutionBand(entry, projectionGroups);
      }
      return entry;
    });
    active.delete(schedule);
    const band = new TemplateCompilerFamilyContextExecutionBand(schedule, entries);
    cache.set(schedule, band);
    return band;
  };
  const rootSchedule = contexts[0] ?? null;
  if (rootSchedule == null) throw new Error('Family structural schedule has no root context.');
  const root = build(rootSchedule);
  if (cache.size !== contexts.length || incomingOwnerByContext.size !== contexts.length - 1) {
    throw new Error('Family structural schedule does not form one rooted execution hierarchy.');
  }
  return { root, incomingOwnerByContext };
}

function textEntry(
  disposition: TemplateCompilerFamilyReachDisposition,
  contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
  expansionBySite: ReadonlyMap<object, TemplateCompilerTextExpansionDraft>,
  rowsBySite: ReadonlyMap<object, readonly TemplateCompilerContextFamilyOrdinaryTargetRowMapping[]>,
): TemplateCompilerFamilyTextScheduleEntry {
  const expansion = expansionBySite.get(disposition.site) ?? null;
  return new TemplateCompilerFamilyTextScheduleEntry(
    disposition,
    contextMapping,
    expansion,
    rowsBySite.get(disposition.site) ?? [],
  );
}

function groupBy<TValue, TKey>(
  values: readonly TValue[],
  keyFor: (value: TValue) => TKey,
): ReadonlyMap<TKey, readonly TValue[]> {
  const result = new Map<TKey, TValue[]>();
  for (const value of values) {
    const key = keyFor(value);
    const bucket = result.get(key);
    if (bucket == null) result.set(key, [value]);
    else bucket.push(value);
  }
  return result;
}

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, ordinal) => right[ordinal] === value);
}
