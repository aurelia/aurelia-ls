import type { ClaimEndpointHandle } from '../kernel/claim.js';
import {
  TemplateCompilerContainerlessReplacementPlacement,
  TemplateCompilerMarkerTargetPlacement,
  TemplateCompilerTargetContextRole,
  type TemplateCompilerTargetContextPlan,
  TemplateCompilerProjectionContextStructuralAuthority,
  type TemplateCompilerTargetOccurrenceMembership,
  type TemplateCompilerTargetOccurrenceMembershipArrivalAuthority,
  TemplateCompilerTargetPlan,
  TemplateCompilerTargetRowPlacementKind,
  type TemplateCompilerTargetRowPlan,
  TemplateCompilerTargetRowSourceKind,
  type TemplateCompilerTemplateControllerTransitionSourceRowAuthority,
} from './compiler-target-plan.js';
import {
  type TemplateCompilerContextFamilyAllocationPreparation,
  TemplateCompilerFundedContextDefinitionOwnerKind,
} from './template-compiler-context-family-allocation.js';
import {
  TemplateCompilerFamilyElementLoweringSite,
  type TemplateCompilerFamilyContextRowAssembly,
  type TemplateCompilerFamilyContextSourceAvailability,
  type TemplateCompilerFamilyOccurrenceMembershipDraft,
  type TemplateCompilerFamilyRootMembershipDraft,
  TemplateCompilerFamilyTemplateControllerRowSourceKind,
  TemplateCompilerFamilyTemplateControllerTransitionRowDraft,
} from './template-compiler-context-family-row-assembly.js';
import type { TemplateCompilerFundedContextDefinition } from './template-compiler-context-family-allocation.js';
import type { TemplateCompilerFundedHydrateElementHead } from './template-compiler-hydrate-element-funding.js';
import type { TemplateCompilerFundedHydrateTemplateControllerEdge } from './template-compiler-hydrate-template-controller-funding.js';
import type { TemplateInstruction } from './instruction-ir.js';
import { TemplateCompilerLiveAttributeTargetLane } from './template-compiler-live-attribute-assembly.js';
import { TemplateCompilerLiveAllocationLedgerState } from './template-compiler-live-allocation.js';
import type { TemplateCompilerLiveProductReservation } from './template-compiler-live-allocation.js';
import { TemplateCompilerOccurrenceMembershipArrivalPosture } from './template-compiler-occurrence-membership.js';
import {
  TemplateCompilerOccurrenceTargetRowDraft,
  type TemplateCompilerOccurrenceAttributeDispositionDraft,
} from './template-compiler-occurrence-row-assembly.js';
import {
  indexTemplateCompilerBindableInstructionsByDisposition,
  templateCompilerTargetAttributeDispositionCauses,
  TemplateCompilerTargetAttributeDispositionMapping,
  type TemplateCompilerTargetHydrateElementDispositionFunding,
} from './template-compiler-target-attribute-disposition.js';
import {
  type TemplateCompilerTargetHydrateElementRowFunding,
  validateTemplateCompilerOccurrenceTargetRowMapping,
} from './template-compiler-target-row-mapping.js';
import type { TemplateCompilerProjectionRealizedEntrantBand } from './template-compiler-projection-logical-extraction.js';
import type { TemplateCompilerSiteCursorContextReference } from './template-compiler-site-cursor-task.js';
import { TemplateCompilerTemplateControllerTransitionEdgeReceipt } from './template-compiler-template-controller-transition.js';
import type { TemplateCompilerSurrogateAttributeDispositionDraft } from './template-compiler-surrogate-staging.js';

const contextFamilyTargetPlanAuthority = {};

export const enum TemplateCompilerContextFamilyTargetPlanState {
  Exact = 'exact',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerContextFamilyTargetPlanReasonKind {
  ForeignAllocation = 'foreign-allocation',
  StaleAllocation = 'stale-allocation',
  PreparedAllocationLost = 'prepared-allocation-lost',
  SourceAvailabilityPending = 'source-availability-pending',
  FundingCoverageMismatch = 'funding-coverage-mismatch',
  AttributeCauseMismatch = 'attribute-cause-mismatch',
}

export class TemplateCompilerContextFamilyTargetPlanReason {
  constructor(
    readonly reasonKind: TemplateCompilerContextFamilyTargetPlanReasonKind,
    readonly summary: string,
    readonly stableSlotKeys: readonly string[] = [],
  ) {}
}

/** Explicit bridge from one cursor context and funded definition to its run-local target context. */
export class TemplateCompilerContextFamilyTargetContextMapping {
  constructor(
    readonly contextAssembly: TemplateCompilerFamilyContextRowAssembly,
    readonly definition: TemplateCompilerFundedContextDefinition,
    readonly targetContext: TemplateCompilerTargetContextPlan,
  ) {
    const expectedRole = definition.ownerKind === TemplateCompilerFundedContextDefinitionOwnerKind.Root
      ? TemplateCompilerTargetContextRole.Root
      : definition.ownerKind === TemplateCompilerFundedContextDefinitionOwnerKind.TemplateController
        ? TemplateCompilerTargetContextRole.TemplateController
        : TemplateCompilerTargetContextRole.Projection;
    const effectiveSource = targetContext.structuralAuthority
      instanceof TemplateCompilerProjectionContextStructuralAuthority
      ? targetContext.structuralAuthority.projection.sourceAddressHandle
        ?? targetContext.structuralAuthority.instruction.sourceAddressHandle
      : definition.reservation.sourceAddressHandle;
    if (
      definition.contextAssembly !== contextAssembly
      || targetContext.role !== expectedRole
      || targetContext.compiledTemplate !== definition.compiledTemplate
      || targetContext.sourceAddressHandle !== effectiveSource
    ) {
      throw new Error(`Family target context '${contextAssembly.context.localKey}' lost definition authority.`);
    }
  }

  get cursorContext(): TemplateCompilerSiteCursorContextReference {
    return this.contextAssembly.context;
  }
}

const membershipArrivalAuthority = {};

/** Nominal non-initial arrival authority derived from one exact family membership draft. */
export class TemplateCompilerContextFamilyMembershipArrivalAuthority
  implements TemplateCompilerTargetOccurrenceMembershipArrivalAuthority {
  readonly #authority: object;
  readonly occurrence;
  readonly arrivalPosture;

  constructor(
    authority: object,
    readonly draft: TemplateCompilerFamilyOccurrenceMembershipDraft,
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
  ) {
    this.occurrence = draft.occurrence;
    this.arrivalPosture = draft.arrivalPosture as Exclude<
      TemplateCompilerOccurrenceMembershipArrivalPosture,
      TemplateCompilerOccurrenceMembershipArrivalPosture.Initial
    >;
    if (
      authority !== membershipArrivalAuthority
      || draft.context !== contextMapping.cursorContext
      || draft.arrivalPosture === TemplateCompilerOccurrenceMembershipArrivalPosture.Initial
    ) {
      throw new Error(`Family membership '${draft.stableSlotKey}' lost non-initial arrival authority.`);
    }
    this.#authority = authority;
  }

  get context(): TemplateCompilerTargetContextPlan {
    return this.contextMapping.targetContext;
  }

  authorizesMembership(
    context: TemplateCompilerTargetContextPlan,
    occurrence: TemplateCompilerFamilyOccurrenceMembershipDraft['occurrence'],
    arrivalPosture: TemplateCompilerOccurrenceMembershipArrivalPosture,
  ): boolean {
    return this.#authority === membershipArrivalAuthority
      && context === this.context
      && occurrence === this.occurrence
      && arrivalPosture === this.arrivalPosture;
  }
}

export class TemplateCompilerContextFamilyTargetMembershipMapping {
  constructor(
    readonly draft: TemplateCompilerFamilyOccurrenceMembershipDraft,
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly membership: TemplateCompilerTargetOccurrenceMembership,
    readonly arrivalAuthority: TemplateCompilerContextFamilyMembershipArrivalAuthority | null,
  ) {
    const initial = draft.arrivalPosture === TemplateCompilerOccurrenceMembershipArrivalPosture.Initial;
    if (
      draft.context !== contextMapping.cursorContext
      || membership.occurrence !== draft.occurrence
      || membership.authoredNode !== draft.authoredNode
      || membership.arrivalPosture !== draft.arrivalPosture
      || initial !== (arrivalAuthority == null)
      || membership.arrivalAuthority !== arrivalAuthority
      || contextMapping.targetContext.occurrenceMembershipFor(draft.occurrence) !== membership
    ) {
      throw new Error(`Family target membership '${draft.stableSlotKey}' lost draft or arrival authority.`);
    }
  }
}

export class TemplateCompilerContextFamilyRootMembershipMapping {
  constructor(
    readonly draft: TemplateCompilerFamilyRootMembershipDraft,
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly membership: TemplateCompilerTargetOccurrenceMembership,
  ) {
    if (
      contextMapping.cursorContext !== draft.receipt.traversal.audit.transcript.taskSnapshot.rootContext
      || membership.occurrence !== draft.compilerCarrier
      || membership.authoredNode !== draft.authoredNode
      || membership.arrivalPosture !== TemplateCompilerOccurrenceMembershipArrivalPosture.Initial
      || membership.arrivalAuthority != null
      || contextMapping.targetContext.occurrenceMembershipFor(draft.compilerCarrier) !== membership
    ) {
      throw new Error('Family root target membership lost carrier or initial-arrival authority.');
    }
  }
}

const transitionSourceAuthority = {};

/** Source-context permission for one outer TC replacement whose host belongs finally to another context. */
export class TemplateCompilerContextFamilyTransitionSourceAuthority
  implements TemplateCompilerTemplateControllerTransitionSourceRowAuthority {
  readonly #authority: object;
  readonly occurrence;
  readonly sourceArrivalPosture;

  constructor(
    authority: object,
    readonly draft: TemplateCompilerFamilyTemplateControllerTransitionRowDraft,
    readonly sourceAvailability: TemplateCompilerFamilyContextSourceAvailability,
    readonly sourceContextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly destinationMapping: TemplateCompilerContextFamilyTargetMembershipMapping,
  ) {
    this.occurrence = draft.occurrence!;
    this.sourceArrivalPosture = sourceAvailability.sourceArrivalPosture!;
    const rehoming = destinationMapping.draft.disposition.rehoming;
    if (
      authority !== transitionSourceAuthority
      || draft.sourceKind !== TemplateCompilerFamilyTemplateControllerRowSourceKind.SourceReplacement
      || draft.edge.ordinal !== 0
      || draft.edge.preparation.sourceContext !== sourceContextMapping.cursorContext
      || draft.occurrence == null
      || draft.occurrence !== draft.edge.preparation.host
      || !sourceContextMapping.contextAssembly.reachedDispositions.some((disposition) =>
        disposition.reach.reachKind === 'element'
        && disposition.reach.event.element === draft.occurrence
      )
      || sourceAvailability.traversal !== sourceContextMapping.contextAssembly.traversal
      || !sourceAvailability.isSourceBearing
      || sourceAvailability.sourceArrivalPosture == null
      || destinationMapping.draft.occurrence !== draft.occurrence
      || destinationMapping.contextMapping === sourceContextMapping
      || rehoming == null
      || destinationMapping.draft.semanticOwner !== rehoming
      || rehoming.receipt.preparation !== draft.edge.preparation
      || !rehoming.event.realization.edges.includes(draft.edge)
      || rehoming.receipt.terminalLeaf !== destinationMapping.contextMapping.cursorContext
    ) {
      throw new Error(`Family TC source row '${draft.stableSlotKey}' lost source/destination authority.`);
    }
    this.#authority = authority;
  }

  get sourceContext(): TemplateCompilerTargetContextPlan {
    return this.sourceContextMapping.targetContext;
  }

  get destinationContext(): TemplateCompilerTargetContextPlan {
    return this.destinationMapping.contextMapping.targetContext;
  }

  get destinationMembership(): TemplateCompilerTargetOccurrenceMembership {
    return this.destinationMapping.membership;
  }

  authorizesTransitionSourceRow(
    sourceContext: TemplateCompilerTargetContextPlan,
    occurrence: TemplateCompilerFamilyTemplateControllerTransitionRowDraft['occurrence'] & object,
    sourceArrivalPosture: TemplateCompilerOccurrenceMembershipArrivalPosture,
    destinationContext: TemplateCompilerTargetContextPlan,
    destinationMembership: TemplateCompilerTargetOccurrenceMembership,
  ): boolean {
    return this.#authority === transitionSourceAuthority
      && sourceContext === this.sourceContext
      && occurrence === this.occurrence
      && sourceArrivalPosture === this.sourceArrivalPosture
      && destinationContext === this.destinationContext
      && destinationMembership === this.destinationMembership;
  }
}

export class TemplateCompilerContextFamilyOrdinaryTargetRowMapping {
  constructor(
    readonly draft: TemplateCompilerOccurrenceTargetRowDraft,
    readonly row: TemplateCompilerTargetRowPlan,
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly hydrateElement: TemplateCompilerFundedHydrateElementHead<
      object,
      { readonly stableSlotKey: string; readonly site: object }
    > | null,
  ) {
    const funding: TemplateCompilerTargetHydrateElementRowFunding | null = hydrateElement == null
      ? null
      : { row: draft, instruction: hydrateElement.instruction };
    validateTemplateCompilerOccurrenceTargetRowMapping(draft, row, funding);
    if (
      !contextMapping.contextAssembly.rows.includes(draft)
      || row.context.localKey !== contextMapping.targetContext.localKey
      || (hydrateElement != null && hydrateElement.draft.row !== draft)
    ) {
      throw new Error(`Family ordinary row '${draft.stableSlotKey}' lost funded HE ownership.`);
    }
  }
}

export class TemplateCompilerContextFamilyTemplateControllerTargetRowMapping {
  constructor(
    readonly draft: TemplateCompilerFamilyTemplateControllerTransitionRowDraft,
    readonly row: TemplateCompilerTargetRowPlan,
    readonly contextMapping: TemplateCompilerContextFamilyTargetContextMapping,
    readonly funded: TemplateCompilerFundedHydrateTemplateControllerEdge,
    readonly sourceAuthority: TemplateCompilerContextFamilyTransitionSourceAuthority | null,
  ) {
    const sourceReplacement = draft.sourceKind
      === TemplateCompilerFamilyTemplateControllerRowSourceKind.SourceReplacement;
    const expectedSourceKind = sourceReplacement
      ? TemplateCompilerTargetRowSourceKind.TemplateControllerTransitionSource
      : TemplateCompilerTargetRowSourceKind.GeneratedContextBoundary;
    if (
      funded.draft.row !== draft
      || !contextMapping.contextAssembly.rows.includes(draft)
      || row.context.localKey !== contextMapping.targetContext.localKey
      || row.stableSlotKey !== draft.stableSlotKey
      || row.ordinal !== draft.ordinal
      || row.projectedTargetOrdinal !== draft.projectedTargetOrdinal
      || row.projectedTargetCount !== draft.projectedTargetCount
      || row.targetKind !== draft.targetKind
      || row.placement.placementKind !== draft.placementKind
      || row.sourceKind !== expectedSourceKind
      || row.occurrence !== draft.occurrence
      || row.node !== draft.authoredNode
      || row.sourceAddressHandle !== draft.draft.sourceAddressHandle
      || row.instructions.length !== 1
      || row.instructions[0] !== funded.instruction
      || sourceReplacement !== (sourceAuthority != null)
      || row.transitionSourceAuthority !== sourceAuthority
    ) {
      throw new Error(`Family TC target row '${draft.stableSlotKey}' lost transition funding or placement.`);
    }
  }
}

export type TemplateCompilerContextFamilyTargetRowMapping =
  | TemplateCompilerContextFamilyOrdinaryTargetRowMapping
  | TemplateCompilerContextFamilyTemplateControllerTargetRowMapping;

/** Sealed family target plan over the still-invisible allocation preparation. */
export class TemplateCompilerContextFamilyTargetPlanPreparation {
  readonly #authority: object;
  readonly contextByCursor: ReadonlyMap<
    TemplateCompilerSiteCursorContextReference,
    TemplateCompilerContextFamilyTargetContextMapping
  >;
  readonly membershipByDraft: ReadonlyMap<
    TemplateCompilerFamilyOccurrenceMembershipDraft,
    TemplateCompilerContextFamilyTargetMembershipMapping
  >;
  readonly membershipByOccurrence: ReadonlyMap<
    TemplateCompilerFamilyOccurrenceMembershipDraft['occurrence'],
    TemplateCompilerContextFamilyTargetMembershipMapping
  >;
  readonly effectiveCaptureReservations: readonly TemplateCompilerLiveProductReservation[];
  readonly processContentHydrateElements: TemplateCompilerContextFamilyAllocationPreparation['hydrateElements'];
  readonly containerlessHydrateElements: TemplateCompilerContextFamilyAllocationPreparation['hydrateElements'];

  constructor(
    authority: object,
    readonly allocation: TemplateCompilerContextFamilyAllocationPreparation,
    readonly targetPlan: TemplateCompilerTargetPlan,
    readonly contextMappings: readonly TemplateCompilerContextFamilyTargetContextMapping[],
    readonly rootMembership: TemplateCompilerContextFamilyRootMembershipMapping,
    readonly membershipMappings: readonly TemplateCompilerContextFamilyTargetMembershipMapping[],
    readonly rowMappings: readonly TemplateCompilerContextFamilyTargetRowMapping[],
    readonly attributeDispositionMappings: readonly TemplateCompilerTargetAttributeDispositionMapping<
      TemplateCompilerOccurrenceAttributeDispositionDraft
    >[],
    readonly surrogateAttributeDispositionMappings: readonly TemplateCompilerTargetAttributeDispositionMapping<
      TemplateCompilerSurrogateAttributeDispositionDraft
    >[],
  ) {
    const contextByCursor = new Map<
      TemplateCompilerSiteCursorContextReference,
      TemplateCompilerContextFamilyTargetContextMapping
    >();
    const membershipByDraft = new Map<
      TemplateCompilerFamilyOccurrenceMembershipDraft,
      TemplateCompilerContextFamilyTargetMembershipMapping
    >();
    const membershipByOccurrence = new Map<
      TemplateCompilerFamilyOccurrenceMembershipDraft['occurrence'],
      TemplateCompilerContextFamilyTargetMembershipMapping
    >();
    for (const mapping of contextMappings) contextByCursor.set(mapping.cursorContext, mapping);
    for (const mapping of membershipMappings) {
      membershipByDraft.set(mapping.draft, mapping);
      membershipByOccurrence.set(mapping.draft.occurrence, mapping);
    }
    this.contextByCursor = contextByCursor;
    this.membershipByDraft = membershipByDraft;
    this.membershipByOccurrence = membershipByOccurrence;
    this.effectiveCaptureReservations = allocation.hydrateElements.flatMap((head) => head.captures)
      .flatMap((capture) => capture.effectiveReservation == null ? [] : [capture.effectiveReservation]);
    this.processContentHydrateElements = allocation.hydrateElements.filter((head) =>
      head.draft.auSlotProcessContent != null
    );
    this.containerlessHydrateElements = allocation.hydrateElements.filter((head) => {
      const row = head.draft.row;
      return row instanceof TemplateCompilerOccurrenceTargetRowDraft
        && row.hydrateElement?.envelope.containerless.effective === true;
    });
    const rows = allocation.rows;
    const expectedMemberships = rows.contexts.flatMap((context) => context.memberships);
    const expectedRows = rows.contexts.flatMap((context) => context.rows);
    const expectedRowContexts = rows.contexts.flatMap((context) =>
      context.rows.map(() => context)
    );
    const expectedAttributeDispositions = rows.contexts.flatMap((context) => context.attributeDispositions);
    const targetMemberships = targetPlan.readContexts().flatMap((context) => context.readOccurrenceMemberships());
    const targetRows = targetPlan.readContexts().flatMap((context) => context.readRows());
    const namespaceCounts = allocation.preparedAllocation.ledger.namespace.readReservationCounts();
    if (
      authority !== contextFamilyTargetPlanAuthority
      || !allocation.isCurrent()
      || !targetPlan.isSealed
      || !targetPlan.root.hasBoundSurrogateInstructions
      || contextMappings.length !== rows.contexts.length
      || this.contextByCursor.size !== contextMappings.length
      || !sameObjects(contextMappings.map((mapping) => mapping.contextAssembly), rows.contexts)
      || !sameObjects(contextMappings.map((mapping) => mapping.definition), allocation.contextDefinitions)
      || !sameObjects(contextMappings.map((mapping) => mapping.targetContext), targetPlan.readContexts())
      || rootMembership.draft !== rows.rootMembership
      || rootMembership.contextMapping !== contextMappings[0]
      || membershipMappings.length !== expectedMemberships.length
      || this.membershipByDraft.size !== membershipMappings.length
      || this.membershipByOccurrence.size !== membershipMappings.length
      || !sameObjects(membershipMappings.map((mapping) => mapping.draft), expectedMemberships)
      || !sameObjects(
        targetMemberships,
        [rootMembership.membership, ...membershipMappings.map((mapping) => mapping.membership)],
      )
      || rowMappings.length !== expectedRows.length
      || !sameObjects(rowMappings.map((mapping) => mapping.draft), expectedRows)
      || !sameObjects(
        rowMappings.map((mapping) => mapping.contextMapping.contextAssembly),
        expectedRowContexts,
      )
      || !sameObjects(rowMappings.map((mapping) => mapping.row), targetRows)
      || !sameObjects(targetPlan.root.readSurrogateInstructions(), rows.surrogateInstructions)
      || targetPlan.readContexts().slice(1).some((context) => context.readSurrogateInstructions().length > 0)
      || !sameObjects(
        attributeDispositionMappings.map((mapping) => mapping.draft),
        expectedAttributeDispositions,
      )
      || !sameObjects(
        surrogateAttributeDispositionMappings.map((mapping) => mapping.draft),
        rows.surrogateAttributeDispositions,
      )
      || !sameCounts(allocation.namespaceCountsBefore, namespaceCounts)
    ) {
      throw new Error('Family target-plan preparation lost context, membership, row, or invisible allocation coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === contextFamilyTargetPlanAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed() && this.allocation.isCurrent() && this.targetPlan.isSealed;
  }

  contextForCursor(
    context: TemplateCompilerSiteCursorContextReference,
  ): TemplateCompilerTargetContextPlan | null {
    return this.contextByCursor.get(context)?.targetContext ?? null;
  }
}

export class TemplateCompilerContextFamilyTargetPlanResult {
  constructor(
    readonly state: TemplateCompilerContextFamilyTargetPlanState,
    readonly preparation: TemplateCompilerContextFamilyTargetPlanPreparation | null,
    readonly reasons: readonly TemplateCompilerContextFamilyTargetPlanReason[],
  ) {
    if (
      (state === TemplateCompilerContextFamilyTargetPlanState.Exact)
        !== (preparation != null && reasons.length === 0)
      || (state === TemplateCompilerContextFamilyTargetPlanState.Pending
        || state === TemplateCompilerContextFamilyTargetPlanState.Ineligible)
        !== (preparation == null && reasons.length > 0)
    ) {
      throw new Error('Context-family target-plan result lost exact, pending, or ineligible ownership.');
    }
  }
}

interface TargetFundingIndexes {
  readonly htcByRow: ReadonlyMap<
    TemplateCompilerFamilyTemplateControllerTransitionRowDraft,
    TemplateCompilerFundedHydrateTemplateControllerEdge
  >;
  readonly htcByEdge: ReadonlyMap<
    TemplateCompilerFamilyTemplateControllerTransitionRowDraft['edge'],
    TemplateCompilerFundedHydrateTemplateControllerEdge
  >;
  readonly heByRow: ReadonlyMap<
    TemplateCompilerOccurrenceTargetRowDraft,
    TemplateCompilerFundedHydrateElementHead<object, { readonly stableSlotKey: string; readonly site: object }>
  >;
  readonly heBySite: ReadonlyMap<
    object,
    TemplateCompilerFundedHydrateElementHead<object, { readonly stableSlotKey: string; readonly site: object }>
  >;
  readonly projectionByBand: ReadonlyMap<TemplateCompilerProjectionRealizedEntrantBand, {
    readonly head: TemplateCompilerFundedHydrateElementHead<
      object,
      { readonly stableSlotKey: string; readonly site: object }
    >;
    readonly projection: TemplateCompilerFundedHydrateElementHead<
      object,
      { readonly stableSlotKey: string; readonly site: object }
    >['instruction']['projections'][number];
  }>;
  readonly htcByContribution: ReadonlyMap<object, TemplateCompilerFundedHydrateTemplateControllerEdge>;
  readonly bindableByDisposition: ReadonlyMap<
    TemplateCompilerOccurrenceAttributeDispositionDraft,
    readonly TemplateInstruction[]
  >;
}

export function prepareTemplateCompilerContextFamilyTargetPlan(
  allocation: TemplateCompilerContextFamilyAllocationPreparation,
): TemplateCompilerContextFamilyTargetPlanResult {
  const admission = targetPlanAdmission(allocation);
  if (admission != null) return admission;
  const rows = allocation.rows;
  const sourcePending = rows.contexts.flatMap((context) => context.templateControllerRows)
    .filter((row) =>
      row.sourceKind === TemplateCompilerFamilyTemplateControllerRowSourceKind.SourceReplacement
      && !rows.contextByReference.get(row.rowContext)?.sourceAvailability.isSourceBearing
    );
  if (sourcePending.length > 0) {
    return unavailable(
      TemplateCompilerContextFamilyTargetPlanState.Pending,
      TemplateCompilerContextFamilyTargetPlanReasonKind.SourceAvailabilityPending,
      'One or more TC source rows have no source-bearing context availability.',
      sourcePending.map((row) => row.stableSlotKey),
    );
  }
  const indexes = indexTargetFunding(allocation);
  if (indexes instanceof TemplateCompilerContextFamilyTargetPlanResult) return indexes;
  let attributeDispositionMappings: readonly TemplateCompilerTargetAttributeDispositionMapping<
    TemplateCompilerOccurrenceAttributeDispositionDraft
  >[];
  try {
    attributeDispositionMappings = rows.contexts.flatMap((context) =>
      context.attributeDispositions.map((draft) => attributeDispositionMapping(draft, indexes))
    );
  } catch (error) {
    if (!(error instanceof AttributeCauseError)) throw error;
    return unavailable(
      TemplateCompilerContextFamilyTargetPlanState.Ineligible,
      TemplateCompilerContextFamilyTargetPlanReasonKind.AttributeCauseMismatch,
      error.message,
      [error.stableSlotKey],
    );
  }
  const surrogateAttributeDispositionMappings = rows.surrogateAttributeDispositions.map((draft) =>
    new TemplateCompilerTargetAttributeDispositionMapping(draft, draft.causeHandles)
  );

  const targetPlan = new TemplateCompilerTargetPlan(
    rows.receipt.endpoint.lane.localKey,
    rows.receipt.traversal.audit.transcript.binding.unit.rootContext,
    allocation.rootDefinition.compiledTemplate,
  );
  const contextMappings: TemplateCompilerContextFamilyTargetContextMapping[] = [];
  const targetByCursor = new Map<TemplateCompilerSiteCursorContextReference, TemplateCompilerTargetContextPlan>();
  const rootMapping = new TemplateCompilerContextFamilyTargetContextMapping(
    rows.contexts[0]!,
    allocation.rootDefinition,
    targetPlan.root,
  );
  contextMappings.push(rootMapping);
  targetByCursor.set(rootMapping.cursorContext, rootMapping.targetContext);

  for (const definition of allocation.contextDefinitions.slice(1)) {
    const context = definition.context;
    const ownerTarget = context.parent == null ? null : targetByCursor.get(context.parent) ?? null;
    if (ownerTarget == null) throw new Error(`Generated context '${context.localKey}' lost target parent order.`);
    let targetContext: TemplateCompilerTargetContextPlan;
    if (definition.ownerKind === TemplateCompilerFundedContextDefinitionOwnerKind.TemplateController) {
      if (!(definition.owner instanceof TemplateCompilerTemplateControllerTransitionEdgeReceipt)) {
        throw new Error(`TC context '${context.localKey}' lost transition-edge ownership.`);
      }
      const funded = indexes.htcByEdge.get(definition.owner) ?? null;
      if (funded == null) throw new Error(`TC context '${context.localKey}' lost funded edge ownership.`);
      targetContext = targetPlan.createTemplateControllerContext(ownerTarget, funded.instruction);
    } else {
      const funded = indexes.projectionByBand.get(definition.owner as TemplateCompilerProjectionRealizedEntrantBand)
        ?? null;
      if (funded == null) throw new Error(`Projection context '${context.localKey}' lost funded definition ownership.`);
      targetContext = targetPlan.createProjectionContext(ownerTarget, funded.head.instruction, funded.projection);
    }
    const mapping = new TemplateCompilerContextFamilyTargetContextMapping(
      rows.contextByReference.get(context)!,
      definition,
      targetContext,
    );
    contextMappings.push(mapping);
    targetByCursor.set(context, targetContext);
  }
  const mappingByCursor = new Map(contextMappings.map((mapping) => [mapping.cursorContext, mapping] as const));

  const rootMembership = new TemplateCompilerContextFamilyRootMembershipMapping(
    rows.rootMembership,
    rootMapping,
    rootMapping.targetContext.recordCompilerReachableOccurrence(
      rows.rootMembership.stableSlotKey,
      rows.rootMembership.compilerCarrier,
      rows.rootMembership.authoredNode,
    ),
  );
  const membershipMappings: TemplateCompilerContextFamilyTargetMembershipMapping[] = [];
  const membershipByOccurrence = new Map<
    TemplateCompilerFamilyOccurrenceMembershipDraft['occurrence'],
    TemplateCompilerContextFamilyTargetMembershipMapping
  >();
  for (const context of rows.contexts) {
    const contextMapping = mappingByCursor.get(context.context)!;
    for (const draft of context.memberships) {
      const arrivalAuthority = draft.arrivalPosture === TemplateCompilerOccurrenceMembershipArrivalPosture.Initial
        ? null
        : new TemplateCompilerContextFamilyMembershipArrivalAuthority(
            membershipArrivalAuthority,
            draft,
            contextMapping,
          );
      const mapping = new TemplateCompilerContextFamilyTargetMembershipMapping(
        draft,
        contextMapping,
        contextMapping.targetContext.recordCompilerReachableOccurrence(
          draft.stableSlotKey,
          draft.occurrence,
          draft.authoredNode,
          draft.arrivalPosture,
          arrivalAuthority,
        ),
        arrivalAuthority,
      );
      membershipMappings.push(mapping);
      membershipByOccurrence.set(draft.occurrence, mapping);
    }
  }

  const rowMappings: TemplateCompilerContextFamilyTargetRowMapping[] = [];
  for (const context of rows.contexts) {
    const contextMapping = mappingByCursor.get(context.context)!;
    for (const draft of context.rows) {
      if (draft instanceof TemplateCompilerFamilyTemplateControllerTransitionRowDraft) {
        const funded = indexes.htcByRow.get(draft)!;
        if (draft.sourceKind === TemplateCompilerFamilyTemplateControllerRowSourceKind.SourceReplacement) {
          const destination = membershipByOccurrence.get(draft.occurrence!)!;
          const sourceAuthority = new TemplateCompilerContextFamilyTransitionSourceAuthority(
            transitionSourceAuthority,
            draft,
            context.sourceAvailability,
            contextMapping,
            destination,
          );
          rowMappings.push(new TemplateCompilerContextFamilyTemplateControllerTargetRowMapping(
            draft,
            contextMapping.targetContext.appendTemplateControllerTransitionSourceRow(
              draft.stableSlotKey,
              draft.occurrence!,
              draft.authoredNode,
              funded.instruction,
              destination.contextMapping.targetContext,
              destination.membership,
              sourceAuthority,
              draft.draft.sourceAddressHandle,
            ),
            contextMapping,
            funded,
            sourceAuthority,
          ));
        } else {
          rowMappings.push(new TemplateCompilerContextFamilyTemplateControllerTargetRowMapping(
            draft,
            contextMapping.targetContext.appendGeneratedContextBoundaryRow(
              draft.stableSlotKey,
              funded.instruction,
            ),
            contextMapping,
            funded,
            null,
          ));
        }
        continue;
      }
      const funded = indexes.heByRow.get(draft) ?? null;
      const instructions: TemplateInstruction[] = [
        ...(funded == null ? [] : [funded.instruction]),
        ...draft.instructions,
      ];
      const placement = draft.placementKind === TemplateCompilerTargetRowPlacementKind.ContainerlessReplacement
        ? new TemplateCompilerContainerlessReplacementPlacement(funded!.instruction)
        : new TemplateCompilerMarkerTargetPlacement();
      rowMappings.push(new TemplateCompilerContextFamilyOrdinaryTargetRowMapping(
        draft,
        contextMapping.targetContext.appendOccurrenceRow(
          draft.stableSlotKey,
          draft.occurrence,
          draft.authoredNode,
          instructions,
          draft.targetKind,
          draft.sourceAddressHandle,
          draft.textOutput?.hole.expressionChainIndex ?? null,
          placement,
        ),
        contextMapping,
        funded,
      ));
    }
  }

  targetPlan.root.bindRootSurrogateInstructions(rows.surrogateInstructions);
  targetPlan.seal();
  const preparation = new TemplateCompilerContextFamilyTargetPlanPreparation(
    contextFamilyTargetPlanAuthority,
    allocation,
    targetPlan,
    contextMappings,
    rootMembership,
    membershipMappings,
    rowMappings,
    attributeDispositionMappings,
    surrogateAttributeDispositionMappings,
  );
  if (!preparation.isCurrent()) {
    return unavailable(
      TemplateCompilerContextFamilyTargetPlanState.Ineligible,
      TemplateCompilerContextFamilyTargetPlanReasonKind.StaleAllocation,
      'Context-family allocation changed while its target plan was prepared.',
    );
  }
  return new TemplateCompilerContextFamilyTargetPlanResult(
    TemplateCompilerContextFamilyTargetPlanState.Exact,
    preparation,
    [],
  );
}

function targetPlanAdmission(
  allocation: TemplateCompilerContextFamilyAllocationPreparation,
): TemplateCompilerContextFamilyTargetPlanResult | null {
  if (!allocation.isModuleConstructed()) {
    return unavailable(
      TemplateCompilerContextFamilyTargetPlanState.Ineligible,
      TemplateCompilerContextFamilyTargetPlanReasonKind.ForeignAllocation,
      'Context-family target planning requires one module-constructed allocation preparation.',
    );
  }
  if (allocation.preparedAllocation.ledger.state !== TemplateCompilerLiveAllocationLedgerState.Prepared) {
    return unavailable(
      TemplateCompilerContextFamilyTargetPlanState.Ineligible,
      TemplateCompilerContextFamilyTargetPlanReasonKind.PreparedAllocationLost,
      'Context-family target planning requires the still-invisible prepared allocation ledger.',
    );
  }
  if (!allocation.isCurrent()) {
    return unavailable(
      TemplateCompilerContextFamilyTargetPlanState.Ineligible,
      TemplateCompilerContextFamilyTargetPlanReasonKind.StaleAllocation,
      'Context-family target planning requires one current allocation preparation.',
    );
  }
  return null;
}

function indexTargetFunding(
  allocation: TemplateCompilerContextFamilyAllocationPreparation,
): TargetFundingIndexes | TemplateCompilerContextFamilyTargetPlanResult {
  const htcByRow = new Map<
    TemplateCompilerFamilyTemplateControllerTransitionRowDraft,
    TemplateCompilerFundedHydrateTemplateControllerEdge
  >();
  const htcByEdge = new Map<
    TemplateCompilerFamilyTemplateControllerTransitionRowDraft['edge'],
    TemplateCompilerFundedHydrateTemplateControllerEdge
  >();
  const htcByContribution = new Map<object, TemplateCompilerFundedHydrateTemplateControllerEdge>();
  for (const funded of allocation.hydrateTemplateControllers) {
    const row = funded.draft.row;
    if (!(row instanceof TemplateCompilerFamilyTemplateControllerTransitionRowDraft)) {
      return fundingMismatch('One funded HTC instruction lost its family TC row.');
    }
    const contribution = row.edge.contribution;
    if (htcByRow.has(row) || htcByEdge.has(row.edge) || htcByContribution.has(contribution)) {
      return fundingMismatch(`Funded HTC row '${row.stableSlotKey}' lost unique contribution ownership.`);
    }
    htcByRow.set(row, funded);
    htcByEdge.set(row.edge, funded);
    htcByContribution.set(contribution, funded);
  }

  const heByRow = new Map<
    TemplateCompilerOccurrenceTargetRowDraft,
    TemplateCompilerFundedHydrateElementHead<object, { readonly stableSlotKey: string; readonly site: object }>
  >();
  const heBySite = new Map<
    object,
    TemplateCompilerFundedHydrateElementHead<object, { readonly stableSlotKey: string; readonly site: object }>
  >();
  const projectionByBand = new Map<TemplateCompilerProjectionRealizedEntrantBand, {
    readonly head: TemplateCompilerFundedHydrateElementHead<
      object,
      { readonly stableSlotKey: string; readonly site: object }
    >;
    readonly projection: TemplateCompilerFundedHydrateElementHead<
      object,
      { readonly stableSlotKey: string; readonly site: object }
    >['instruction']['projections'][number];
  }>();
  const dispositionsBySite = new Map<object, TemplateCompilerOccurrenceAttributeDispositionDraft[]>();
  for (const draft of allocation.rows.contexts.flatMap((context) => context.attributeDispositions)) {
    const bucket = dispositionsBySite.get(draft.site);
    if (bucket == null) dispositionsBySite.set(draft.site, [draft]);
    else bucket.push(draft);
  }
  const bindableByDisposition = new Map<
    TemplateCompilerOccurrenceAttributeDispositionDraft,
    readonly TemplateInstruction[]
  >();
  for (const head of allocation.hydrateElements) {
    const row = head.draft.row;
    if (!(row instanceof TemplateCompilerOccurrenceTargetRowDraft) || heByRow.has(row) || heBySite.has(row.site)) {
      return fundingMismatch('One funded HE instruction lost its unique family row or site.');
    }
    heByRow.set(row, head);
    heBySite.set(row.site, head);
    const indexedBindables = indexTemplateCompilerBindableInstructionsByDisposition(
      dispositionsBySite.get(row.site) ?? [],
      {
        instruction: head.instruction,
        captures: head.captures,
        bindableInstructions: head.draft.bindableInstructions,
      },
    );
    for (const [draft, instructions] of indexedBindables) bindableByDisposition.set(draft, instructions);
    const site = row.site;
    if (!(site instanceof TemplateCompilerFamilyElementLoweringSite)) continue;
    const extraction = site.reach.hydrateElement.projectionExtraction;
    if (extraction == null) continue;
    if (extraction.realization.entrantBands.length !== head.instruction.projections.length) {
      return fundingMismatch(`Funded HE row '${row.stableSlotKey}' lost projection context coverage.`);
    }
    extraction.realization.entrantBands.forEach((band, ordinal) => {
      projectionByBand.set(band, { head, projection: head.instruction.projections[ordinal]! });
    });
  }
  return {
    htcByRow,
    htcByEdge,
    heByRow,
    heBySite,
    projectionByBand,
    htcByContribution,
    bindableByDisposition,
  };
}

function attributeDispositionMapping(
  draft: TemplateCompilerOccurrenceAttributeDispositionDraft,
  indexes: TargetFundingIndexes,
): TemplateCompilerTargetAttributeDispositionMapping<TemplateCompilerOccurrenceAttributeDispositionDraft> {
  const head = indexes.heBySite.get(draft.site) ?? null;
  const hydrateElement: TemplateCompilerTargetHydrateElementDispositionFunding | null = head == null
    ? null
    : {
        instruction: head.instruction,
        captures: head.captures,
        bindableInstructions: head.draft.bindableInstructions,
      };
  const tc = draft.contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.TemplateController
    ? indexes.htcByContribution.get(draft.contribution) ?? null
    : null;
  const ownedBindableInstructions = indexes.bindableByDisposition.get(draft) ?? [];
  if (
    draft.contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.ElementBindable
    && hydrateElement != null
    && ownedBindableInstructions.length === 0
  ) {
    throw new AttributeCauseError(
      draft.stableSlotKey,
      `Family attribute disposition '${draft.stableSlotKey}' lost its bindable instruction cause.`,
    );
  }
  if (
    draft.contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.TemplateController
    && tc == null
  ) {
    throw new AttributeCauseError(
      draft.stableSlotKey,
      `Family attribute disposition '${draft.stableSlotKey}' lost its HTC instruction cause.`,
    );
  }
  const additionalCauses: ClaimEndpointHandle[] = tc == null ? [] : [tc.instruction.productHandle];
  return new TemplateCompilerTargetAttributeDispositionMapping(
    draft,
    templateCompilerTargetAttributeDispositionCauses(
      draft,
      hydrateElement,
      additionalCauses,
      ownedBindableInstructions,
    ),
  );
}

class AttributeCauseError extends Error {
  constructor(readonly stableSlotKey: string, message: string) {
    super(message);
  }
}

function fundingMismatch(summary: string): TemplateCompilerContextFamilyTargetPlanResult {
  return unavailable(
    TemplateCompilerContextFamilyTargetPlanState.Ineligible,
    TemplateCompilerContextFamilyTargetPlanReasonKind.FundingCoverageMismatch,
    summary,
  );
}

function unavailable(
  state: TemplateCompilerContextFamilyTargetPlanState.Pending
    | TemplateCompilerContextFamilyTargetPlanState.Ineligible,
  reasonKind: TemplateCompilerContextFamilyTargetPlanReasonKind,
  summary: string,
  stableSlotKeys: readonly string[] = [],
): TemplateCompilerContextFamilyTargetPlanResult {
  return new TemplateCompilerContextFamilyTargetPlanResult(
    state,
    null,
    [new TemplateCompilerContextFamilyTargetPlanReason(reasonKind, summary, stableSlotKeys)],
  );
}

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, ordinal) => right[ordinal] === value);
}

function sameCounts(
  left: { readonly semanticSlots: number; readonly productHandles: number; readonly identityHandles: number; readonly addressHandles: number },
  right: { readonly semanticSlots: number; readonly productHandles: number; readonly identityHandles: number; readonly addressHandles: number },
): boolean {
  return left.semanticSlots === right.semanticSlots
    && left.productHandles === right.productHandles
    && left.identityHandles === right.identityHandles
    && left.addressHandles === right.addressHandles;
}
