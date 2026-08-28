import { CompiledTemplateReference } from './compiled-template.js';
import {
  TemplateCompilerContainerlessReplacementPlacement,
  TemplateCompilerMarkerTargetPlacement,
  TemplateCompilerTargetPlan,
  TemplateCompilerTargetRowPlacementKind,
  TemplateCompilerTargetRowPosture,
  type TemplateCompilerTargetRowPlan,
} from './compiler-target-plan.js';
import { TemplateCompilerLiveAllocationSnapshotState } from './template-compiler-live-allocation.js';
import {
  TemplateCompilerLiveAttributeTargetLane,
} from './template-compiler-live-attribute-assembly.js';
import {
  templateCompilerBindableInstructionsForDisposition,
  templateCompilerTargetAttributeDispositionCauses,
  TemplateCompilerTargetAttributeDispositionMapping,
  type TemplateCompilerTargetHydrateElementDispositionFunding,
} from './template-compiler-target-attribute-disposition.js';
import {
  TemplateCompilerLiveProductReservationRole,
  type TemplateCompilerLiveAllocationSnapshot,
  type TemplateCompilerLiveProductReservation,
} from './template-compiler-live-allocation.js';
import type {
  TemplateCompilerAllocatedCaptureSyntaxReference,
  TemplateCompilerAllocatedHydrateElementHead,
  TemplateCompilerOccurrenceHydrateElementAllocationAssembly,
} from './template-compiler-occurrence-hydrate-element-allocation.js';
import {
  TemplateCompilerOccurrencePrePlanEffectState,
  TemplateCompilerOccurrenceSourcePosture,
  type TemplateCompilerOccurrenceRowAssembly,
  type TemplateCompilerOccurrenceTargetRowDraft,
} from './template-compiler-occurrence-row-assembly.js';

const occurrenceTargetPlanAuthority = {};
const exactPlansByRows = new WeakMap<
  TemplateCompilerOccurrenceRowAssembly,
  TemplateCompilerOccurrenceTargetPlanResult
>();

export const enum TemplateCompilerOccurrenceTargetPlanState {
  Exact = 'exact',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerOccurrenceTargetPlanReasonKind {
  ForeignRowAssembly = 'foreign-row-assembly',
  StaleReceipt = 'stale-receipt',
  ParentAllocationOpen = 'parent-allocation-open',
  HydrateElementInstructionRequired = 'hydrate-element-instruction-required',
  HydrateElementAllocationMismatch = 'hydrate-element-allocation-mismatch',
  PrePlanEffectAdoptionRequired = 'pre-plan-effect-adoption-required',
  SourceAuthorityOpen = 'source-authority-open',
  RowAllocationMismatch = 'row-allocation-mismatch',
  RootReservationCollision = 'root-reservation-collision',
}

export class TemplateCompilerOccurrenceTargetPlanReason {
  constructor(
    readonly reasonKind: TemplateCompilerOccurrenceTargetPlanReasonKind,
    readonly summary: string,
    readonly stableRowSlotKeys: readonly string[] = [],
  ) {}
}

export class TemplateCompilerOccurrenceTargetRowMapping {
  constructor(
    readonly draft: TemplateCompilerOccurrenceTargetRowDraft,
    readonly row: TemplateCompilerTargetRowPlan,
    readonly hydrateElement: TemplateCompilerAllocatedHydrateElementHead | null,
  ) {
    const instructions = [
      ...(hydrateElement == null ? [] : [hydrateElement.instruction]),
      ...draft.instructions,
    ];
    const mismatches = [
      (draft.hydrateElement != null) !== (hydrateElement != null) ? 'hydrate-element-presence' : null,
      hydrateElement != null && hydrateElement.row !== draft ? 'hydrate-element-row' : null,
      row.stableSlotKey !== draft.stableSlotKey ? 'stable-slot' : null,
      row.ordinal !== draft.ordinal ? 'ordinal' : null,
      row.projectedTargetOrdinal !== draft.projectedTargetOrdinal ? 'projected-ordinal' : null,
      row.projectedTargetCount !== draft.projectedTargetCount ? 'projected-count' : null,
      row.targetKind !== draft.targetKind ? 'target-kind' : null,
      row.placement.placementKind !== draft.placementKind ? 'placement-kind' : null,
      draft.placementKind === TemplateCompilerTargetRowPlacementKind.ContainerlessReplacement
        && (!(row.placement instanceof TemplateCompilerContainerlessReplacementPlacement)
          || row.placement.instruction !== hydrateElement?.instruction)
        ? 'containerless-placement'
        : null,
      draft.placementKind === TemplateCompilerTargetRowPlacementKind.Marker
        && !(row.placement instanceof TemplateCompilerMarkerTargetPlacement)
        ? 'marker-placement'
        : null,
      row.sourceAddressHandle !== draft.sourceAddressHandle ? 'source-address' : null,
      row.occurrence !== draft.occurrence ? 'occurrence' : null,
      row.node !== draft.authoredNode ? 'authored-node' : null,
      row.inputNode !== draft.occurrence.inputReference ? 'input-node' : null,
      row.expressionChainIndex !== (draft.textOutput?.hole.expressionChainIndex ?? null)
        ? 'expression-chain-index'
        : null,
      row.posture !== TemplateCompilerTargetRowPosture.Complete ? 'posture' : null,
      row.openSeamHandles.length !== 0 ? 'open-seams' : null,
      !sameObjects(row.instructions, instructions) ? 'instructions' : null,
    ].filter((mismatch): mismatch is string => mismatch != null);
    if (mismatches.length > 0) {
      throw new Error(
        `Occurrence target row '${draft.stableSlotKey}' lost ${mismatches.join(', ')} authority.`,
      );
    }
  }
}

/** Allocation-resolved final cause band for one reached attribute disposition. */
export class TemplateCompilerOccurrenceTargetAttributeDispositionMapping
  extends TemplateCompilerTargetAttributeDispositionMapping {}

export const enum TemplateCompilerOccurrenceTargetPublicationPrerequisiteKind {
  EffectiveAttributeSyntaxMaterialization = 'effective-attribute-syntax-materialization',
  ContainerlessHostRequirement = 'containerless-host-requirement',
}

/** Funded future product that must materialize before this target family can become durable wire. */
export class TemplateCompilerOccurrenceTargetPublicationPrerequisite {
  readonly prerequisiteKind =
    TemplateCompilerOccurrenceTargetPublicationPrerequisiteKind.EffectiveAttributeSyntaxMaterialization;

  constructor(
    readonly capture: TemplateCompilerAllocatedCaptureSyntaxReference,
  ) {
    if (capture.effectiveReservation == null) {
      throw new Error(`Captured syntax '${capture.draft.stableSlotKey}' is already materialized authored syntax.`);
    }
  }
}

/** Whole-family join ensuring a locally containerless target never requires a final native host. */
export class TemplateCompilerOccurrenceContainerlessHostPrerequisite {
  readonly prerequisiteKind =
    TemplateCompilerOccurrenceTargetPublicationPrerequisiteKind.ContainerlessHostRequirement;

  constructor(readonly hydrateElement: TemplateCompilerAllocatedHydrateElementHead) {
    if (
      !hydrateElement.head.envelope.containerless.effective
      || hydrateElement.row.placementKind
        !== TemplateCompilerTargetRowPlacementKind.ContainerlessReplacement
    ) {
      throw new Error(`HydrateElement row '${hydrateElement.row.stableSlotKey}' is not effectively containerless.`);
    }
  }
}

export type TemplateCompilerOccurrencePublicationPrerequisite =
  | TemplateCompilerOccurrenceTargetPublicationPrerequisite
  | TemplateCompilerOccurrenceContainerlessHostPrerequisite;

/** Exact funded ordinary-root shared target plan; no structural mutation or publication has occurred. */
export class TemplateCompilerOccurrenceTargetPlanAssembly {
  readonly #authority: object;
  readonly publicationPrerequisites: readonly TemplateCompilerOccurrencePublicationPrerequisite[];

  constructor(
    authority: object,
    readonly rows: TemplateCompilerOccurrenceRowAssembly,
    readonly rootReservation: TemplateCompilerLiveProductReservation,
    readonly rootCompiledTemplate: CompiledTemplateReference,
    readonly targetAllocation: TemplateCompilerLiveAllocationSnapshot,
    readonly hydrateElements: TemplateCompilerOccurrenceHydrateElementAllocationAssembly | null,
    readonly targetPlan: TemplateCompilerTargetPlan,
    readonly rowMappings: readonly TemplateCompilerOccurrenceTargetRowMapping[],
    readonly attributeDispositionMappings: readonly TemplateCompilerOccurrenceTargetAttributeDispositionMapping[],
  ) {
    const effectiveSyntaxPrerequisites = hydrateElements?.heads.flatMap((head) => head.captures)
      .filter((capture) => capture.effectiveReservation != null)
      .map((capture) => new TemplateCompilerOccurrenceTargetPublicationPrerequisite(capture)) ?? [];
    const containerlessPrerequisites = hydrateElements?.heads
      .filter((head) => head.head.envelope.containerless.effective)
      .map((head) => new TemplateCompilerOccurrenceContainerlessHostPrerequisite(head)) ?? [];
    this.publicationPrerequisites = [
      ...effectiveSyntaxPrerequisites,
      ...containerlessPrerequisites,
    ];
    if (
      authority !== occurrenceTargetPlanAuthority
      || rootReservation.role !== TemplateCompilerLiveProductReservationRole.RootCompiledTemplate
      || rootCompiledTemplate.productHandle !== rootReservation.productHandle
      || rootCompiledTemplate.identityHandle !== rootReservation.identityHandle
      || targetAllocation.productReservations.length !== 1
      || targetAllocation.productReservations[0] !== rootReservation
      || targetAllocation.state !== TemplateCompilerLiveAllocationSnapshotState.Complete
      || (hydrateElements != null && (
        !hydrateElements.isModuleConstructed()
        || hydrateElements.rows !== rows
        || effectiveSyntaxPrerequisites.length !== hydrateElements.allocation.productReservations.length
      ))
      || targetPlan.localKey !== rows.receipt.endpoint.lane.localKey
      || targetPlan.root.compiledTemplate.productHandle !== rootCompiledTemplate.productHandle
      || targetPlan.root.compiledTemplate.identityHandle !== rootCompiledTemplate.identityHandle
      || !targetPlan.isSealed
      || rowMappings.length !== rows.rows.length
      || !sameObjects(
        targetPlan.root.readOccurrenceMemberships().map((membership) => membership.occurrence),
        [rows.rootMembership.compilerCarrier, ...rows.occurrenceMemberships.map((membership) => membership.occurrence)],
      )
      || !sameObjects(rowMappings.map((mapping) => mapping.draft), rows.rows)
      || !sameObjects(rowMappings.map((mapping) => mapping.row), targetPlan.root.readRows())
      || !sameObjects(
        attributeDispositionMappings.map((mapping) => mapping.draft),
        rows.attributeDispositions,
      )
    ) {
      throw new Error('Occurrence target-plan assembly lost receipt, allocation, or exact row mapping authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === occurrenceTargetPlanAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed()
      && this.rows.receipt.isCurrent()
      && this.targetAllocation.isCurrent()
      && (this.hydrateElements?.allocation.isCurrent() ?? true);
  }
}

export class TemplateCompilerOccurrenceTargetPlanResult {
  constructor(
    readonly state: TemplateCompilerOccurrenceTargetPlanState,
    readonly assembly: TemplateCompilerOccurrenceTargetPlanAssembly | null,
    readonly reasons: readonly TemplateCompilerOccurrenceTargetPlanReason[],
  ) {
    if (
      (state === TemplateCompilerOccurrenceTargetPlanState.Exact) !== (assembly != null && reasons.length === 0)
      || (state !== TemplateCompilerOccurrenceTargetPlanState.Exact) !== (assembly == null && reasons.length > 0)
    ) {
      throw new Error('Occurrence target-plan result lost exact/pending/ineligible ownership.');
    }
  }
}

/** Allocate and seal the shared funded ordinary-root plan after complete side-effect-free preflight. */
export function allocateTemplateCompilerOccurrenceTargetPlan(
  rows: TemplateCompilerOccurrenceRowAssembly,
  hydrateElements: TemplateCompilerOccurrenceHydrateElementAllocationAssembly | null = null,
): TemplateCompilerOccurrenceTargetPlanResult {
  if (!rows.isModuleConstructed()) {
    return ineligible(
      TemplateCompilerOccurrenceTargetPlanReasonKind.ForeignRowAssembly,
      'Occurrence target-plan allocation requires one module-constructed row assembly.',
    );
  }
  const existing = exactPlansByRows.get(rows) ?? null;
  if (
    existing?.assembly?.isCurrent() === true
    && existing.assembly.hydrateElements === hydrateElements
  ) return existing;
  if (!rows.receipt.isCurrent()) {
    return ineligible(
      TemplateCompilerOccurrenceTargetPlanReasonKind.StaleReceipt,
      'Occurrence row receipt is no longer current at the pre-plan endpoint.',
    );
  }
  const parentAllocation = rows.receipt.transcript.allocationSnapshot;
  if (
    parentAllocation.state !== TemplateCompilerLiveAllocationSnapshotState.Complete
    || !parentAllocation.isCurrent()
  ) {
    return ineligible(
      TemplateCompilerOccurrenceTargetPlanReasonKind.ParentAllocationOpen,
      'Occurrence target-plan allocation requires the exact complete live-site allocation namespace.',
    );
  }
  const hydrateRows = rows.rows.filter((row) => row.hydrateElement != null);
  if (hydrateRows.length > 0 && hydrateElements == null) {
    return pending(
      TemplateCompilerOccurrenceTargetPlanReasonKind.HydrateElementInstructionRequired,
      'HydrateElement row heads require capture/instruction allocation before a shared plan can be sealed.',
      hydrateRows.map((row) => row.stableSlotKey),
    );
  }
  if (
    (hydrateRows.length === 0) !== (hydrateElements == null)
    || (hydrateElements != null && (
      !hydrateElements.isModuleConstructed()
      || !hydrateElements.isCurrent()
      || hydrateElements.rows !== rows
      || hydrateElements.heads.length !== hydrateRows.length
      || hydrateRows.some((row) => hydrateElements.headForRow(row) == null)
    ))
  ) {
    return ineligible(
      TemplateCompilerOccurrenceTargetPlanReasonKind.HydrateElementAllocationMismatch,
      'Occurrence target-plan allocation received foreign, stale, or incomplete HydrateElement funding.',
      hydrateRows.map((row) => row.stableSlotKey),
    );
  }
  if (rows.prePlanEffectState !== TemplateCompilerOccurrencePrePlanEffectState.None) {
    return pending(
      TemplateCompilerOccurrenceTargetPlanReasonKind.PrePlanEffectAdoptionRequired,
      'Committed pre-plan site effects require structural adoption before target-plan allocation.',
    );
  }
  const openRows = rows.rows.filter((row) => row.sourcePosture === TemplateCompilerOccurrenceSourcePosture.Open);
  if (openRows.length > 0) {
    return pending(
      TemplateCompilerOccurrenceTargetPlanReasonKind.SourceAuthorityOpen,
      'One or more occurrence rows have no authored, browser-effective, or generated source authority.',
      openRows.map((row) => row.stableSlotKey),
    );
  }

  const allocatedInstructions = new Map(parentAllocation.instructionAllocations.flatMap((allocation) =>
    allocation.instruction == null ? [] : [[allocation.productHandle, allocation.instruction] as const]
  ));
  const mismatchedRows = rows.rows.filter((row) => row.instructions.some((instruction) =>
    allocatedInstructions.get(instruction.productHandle) !== instruction
  ));
  if (mismatchedRows.length > 0) {
    return ineligible(
      TemplateCompilerOccurrenceTargetPlanReasonKind.RowAllocationMismatch,
      'Occurrence row instructions do not belong exactly to the completed live allocation inventory.',
      mismatchedRows.map((row) => row.stableSlotKey),
    );
  }

  const receipt = rows.receipt;
  const lane = receipt.endpoint.lane;
  const phaseKey = `${lane.localKey}:occurrence-target-plan`;
  const rootAllocationLocal = `${phaseKey}:compiled-template:root`;
  const authoredRoot = receipt.transcript.binding.compilation.compiledTemplate.compiledTemplate;
  const proposedRootProduct = parentAllocation.ledger.namespace.handles.product(rootAllocationLocal);
  const proposedRootIdentity = parentAllocation.ledger.namespace.handles.identity(rootAllocationLocal);
  if (
    proposedRootProduct === authoredRoot.productHandle
    || proposedRootIdentity === authoredRoot.identityHandle
  ) {
    return ineligible(
      TemplateCompilerOccurrenceTargetPlanReasonKind.RootReservationCollision,
      'Occurrence target-plan root reservation collides with authored compiled output.',
    );
  }
  const missingBindableCauses = rows.attributeDispositions.filter((draft) => {
    if (draft.contribution.targetLane !== TemplateCompilerLiveAttributeTargetLane.ElementBindable) return false;
    const head = hydrateElements?.headForSite(draft.site) ?? null;
    return head != null && templateCompilerBindableInstructionsForDisposition(
      draft,
      occurrenceDispositionFunding(head),
    ).length === 0;
  });
  if (missingBindableCauses.length > 0) {
    return ineligible(
      TemplateCompilerOccurrenceTargetPlanReasonKind.HydrateElementAllocationMismatch,
      'Funded HydrateElement disposition lost its exact nested bindable instruction cause.',
      [...new Set(missingBindableCauses.map((draft) => draft.site.rowSlotKey))],
    );
  }
  const attributeDispositionMappings = rows.attributeDispositions.map((draft) =>
    new TemplateCompilerOccurrenceTargetAttributeDispositionMapping(
      draft,
      templateCompilerTargetAttributeDispositionCauses(
        draft,
        hydrateElements?.headForSite(draft.site) == null
          ? null
          : occurrenceDispositionFunding(hydrateElements.headForSite(draft.site)!),
      ),
    )
  );
  const targetAllocation = parentAllocation.ledger.namespace.beginPhase(phaseKey);
  const rootReservation = targetAllocation.reserveProduct(
    `${phaseKey}:root`,
    'compiled-template:root',
    TemplateCompilerLiveProductReservationRole.RootCompiledTemplate,
    receipt.transcript.binding.unit.rootContext.sourceAddressHandle,
    rootAllocationLocal,
  );
  const rootCompiledTemplate = new CompiledTemplateReference(
    rootReservation.productHandle,
    rootReservation.identityHandle,
  );
  const targetPlan = new TemplateCompilerTargetPlan(
    lane.localKey,
    receipt.transcript.binding.unit.rootContext,
    rootCompiledTemplate,
  );
  targetPlan.root.recordCompilerReachableOccurrence(
    rows.rootMembership.stableSlotKey,
    rows.rootMembership.compilerCarrier,
    rows.rootMembership.authoredNode,
  );
  for (const membership of rows.occurrenceMemberships) {
    targetPlan.root.recordCompilerReachableOccurrence(
      membership.stableSlotKey,
      membership.occurrence,
      membership.authoredNode,
    );
  }
  const rowMappings = rows.rows.map((draft) => {
    const hydrateElement = hydrateElements?.headForRow(draft) ?? null;
    const instructions = [
      ...(hydrateElement == null ? [] : [hydrateElement.instruction]),
      ...draft.instructions,
    ];
    return new TemplateCompilerOccurrenceTargetRowMapping(
      draft,
      targetPlan.root.appendOccurrenceRow(
      draft.stableSlotKey,
      draft.occurrence,
      draft.authoredNode,
      instructions,
      draft.targetKind,
      draft.sourceAddressHandle,
      draft.textOutput?.hole.expressionChainIndex ?? null,
      draft.placementKind === TemplateCompilerTargetRowPlacementKind.ContainerlessReplacement
        ? new TemplateCompilerContainerlessReplacementPlacement(hydrateElement!.instruction)
        : new TemplateCompilerMarkerTargetPlacement(),
      ),
      hydrateElement,
    );
  });
  targetPlan.seal();
  const assembly = new TemplateCompilerOccurrenceTargetPlanAssembly(
    occurrenceTargetPlanAuthority,
    rows,
    rootReservation,
    rootCompiledTemplate,
    targetAllocation.finish(),
    hydrateElements,
    targetPlan,
    rowMappings,
    attributeDispositionMappings,
  );
  const result = new TemplateCompilerOccurrenceTargetPlanResult(
    TemplateCompilerOccurrenceTargetPlanState.Exact,
    assembly,
    [],
  );
  exactPlansByRows.set(rows, result);
  return result;
}

function pending(
  reasonKind: TemplateCompilerOccurrenceTargetPlanReasonKind,
  summary: string,
  stableRowSlotKeys: readonly string[] = [],
): TemplateCompilerOccurrenceTargetPlanResult {
  return new TemplateCompilerOccurrenceTargetPlanResult(
    TemplateCompilerOccurrenceTargetPlanState.Pending,
    null,
    [new TemplateCompilerOccurrenceTargetPlanReason(reasonKind, summary, stableRowSlotKeys)],
  );
}

function ineligible(
  reasonKind: TemplateCompilerOccurrenceTargetPlanReasonKind,
  summary: string,
  stableRowSlotKeys: readonly string[] = [],
): TemplateCompilerOccurrenceTargetPlanResult {
  return new TemplateCompilerOccurrenceTargetPlanResult(
    TemplateCompilerOccurrenceTargetPlanState.Ineligible,
    null,
    [new TemplateCompilerOccurrenceTargetPlanReason(reasonKind, summary, stableRowSlotKeys)],
  );
}

function occurrenceDispositionFunding(
  head: TemplateCompilerAllocatedHydrateElementHead,
): TemplateCompilerTargetHydrateElementDispositionFunding {
  return {
    instruction: head.instruction,
    captures: head.captures,
    bindableInstructions: head.head.envelope.bindableInstructions,
  };
}

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
