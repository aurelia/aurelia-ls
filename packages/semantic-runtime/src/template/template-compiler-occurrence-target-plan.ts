import { CompiledTemplateReference } from './compiled-template.js';
import {
  TemplateCompilerTargetPlan,
  TemplateCompilerTargetRowPosture,
  type TemplateCompilerTargetRowPlan,
} from './compiler-target-plan.js';
import { TemplateCompilerLiveAllocationSnapshotState } from './template-compiler-live-allocation.js';
import {
  TemplateCompilerLiveProductReservationRole,
  type TemplateCompilerLiveAllocationSnapshot,
  type TemplateCompilerLiveProductReservation,
} from './template-compiler-live-allocation.js';
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
  ) {
    if (
      row.stableSlotKey !== draft.stableSlotKey
      || row.ordinal !== draft.ordinal
      || row.projectedTargetOrdinal !== draft.projectedTargetOrdinal
      || row.projectedTargetCount !== draft.projectedTargetCount
      || row.targetKind !== draft.targetKind
      || row.sourceAddressHandle !== draft.sourceAddressHandle
      || row.occurrence !== draft.occurrence
      || row.node !== draft.authoredNode
      || row.inputNode !== draft.occurrence.inputReference
      || row.expressionChainIndex !== (draft.textOutput?.hole.expressionChainIndex ?? null)
      || row.posture !== TemplateCompilerTargetRowPosture.Complete
      || row.openSeamHandles.length !== 0
      || !sameObjects(row.instructions, draft.instructions)
    ) {
      throw new Error(`Occurrence target row '${draft.stableSlotKey}' lost draft/plan authority.`);
    }
  }
}

/** Exact native/text-only shared target plan; no structural mutation or publication has occurred. */
export class TemplateCompilerOccurrenceTargetPlanAssembly {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly rows: TemplateCompilerOccurrenceRowAssembly,
    readonly rootReservation: TemplateCompilerLiveProductReservation,
    readonly rootCompiledTemplate: CompiledTemplateReference,
    readonly targetAllocation: TemplateCompilerLiveAllocationSnapshot,
    readonly targetPlan: TemplateCompilerTargetPlan,
    readonly rowMappings: readonly TemplateCompilerOccurrenceTargetRowMapping[],
  ) {
    if (
      authority !== occurrenceTargetPlanAuthority
      || rootReservation.role !== TemplateCompilerLiveProductReservationRole.RootCompiledTemplate
      || rootCompiledTemplate.productHandle !== rootReservation.productHandle
      || rootCompiledTemplate.identityHandle !== rootReservation.identityHandle
      || targetAllocation.productReservations.length !== 1
      || targetAllocation.productReservations[0] !== rootReservation
      || targetAllocation.state !== TemplateCompilerLiveAllocationSnapshotState.Complete
      || targetPlan.localKey !== rows.receipt.endpoint.lane.localKey
      || targetPlan.root.compiledTemplate.productHandle !== rootCompiledTemplate.productHandle
      || targetPlan.root.compiledTemplate.identityHandle !== rootCompiledTemplate.identityHandle
      || !targetPlan.isSealed
      || rowMappings.length !== rows.rows.length
      || !sameObjects(rowMappings.map((mapping) => mapping.draft), rows.rows)
      || !sameObjects(rowMappings.map((mapping) => mapping.row), targetPlan.root.readRows())
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
      && this.targetAllocation.isCurrent();
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

/** Allocate and seal the shared native/text-only root plan after complete side-effect-free preflight. */
export function allocateTemplateCompilerOccurrenceTargetPlan(
  rows: TemplateCompilerOccurrenceRowAssembly,
): TemplateCompilerOccurrenceTargetPlanResult {
  if (!rows.isModuleConstructed()) {
    return ineligible(
      TemplateCompilerOccurrenceTargetPlanReasonKind.ForeignRowAssembly,
      'Occurrence target-plan allocation requires one module-constructed row assembly.',
    );
  }
  const existing = exactPlansByRows.get(rows) ?? null;
  if (existing?.assembly?.isCurrent() === true) return existing;
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
  if (hydrateRows.length > 0) {
    return pending(
      TemplateCompilerOccurrenceTargetPlanReasonKind.HydrateElementInstructionRequired,
      'HydrateElement row heads require capture/instruction allocation before a shared plan can be sealed.',
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
  for (const membership of rows.occurrenceMemberships) {
    targetPlan.root.recordCompilerReachableOccurrence(
      membership.stableSlotKey,
      membership.occurrence,
      membership.authoredNode,
    );
  }
  const rowMappings = rows.rows.map((draft) => new TemplateCompilerOccurrenceTargetRowMapping(
    draft,
    targetPlan.root.appendOccurrenceRow(
      draft.stableSlotKey,
      draft.occurrence,
      draft.authoredNode,
      draft.instructions,
      draft.targetKind,
      draft.sourceAddressHandle,
      draft.textOutput?.hole.expressionChainIndex ?? null,
    ),
  ));
  targetPlan.seal();
  const assembly = new TemplateCompilerOccurrenceTargetPlanAssembly(
    occurrenceTargetPlanAuthority,
    rows,
    rootReservation,
    rootCompiledTemplate,
    targetAllocation.finish(),
    targetPlan,
    rowMappings,
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

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
