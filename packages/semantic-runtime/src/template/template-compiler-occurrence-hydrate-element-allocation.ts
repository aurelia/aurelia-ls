import type { IdentityHandle } from '../kernel/handles.js';
import { TemplateCompilerTargetRowPlacementKind } from './compiler-target-plan.js';
import {
  TemplateCompilerHydrateElementProcessContentState,
  TemplateCompilerHydrateElementProjectionState,
} from './template-compiler-hydrate-element-staging.js';
import type { HydrateElementInstruction } from './instruction-ir.js';
import {
  fundTemplateCompilerHydrateElements,
  TemplateCompilerEmptyHydrateElementProjectionFundingPlan,
  TemplateCompilerHydrateElementFundingDraft,
  type TemplateCompilerFundedHydrateElementHead,
  type TemplateCompilerHydrateElementFundingRow,
} from './template-compiler-hydrate-element-funding.js';
export { TemplateCompilerAllocatedCaptureSyntaxReference } from './template-compiler-hydrate-element-funding.js';
import type { TemplateCompilerAllocatedCaptureSyntaxReference } from './template-compiler-hydrate-element-funding.js';
import {
  TemplateCompilerLiveAllocationSnapshotState,
  type TemplateCompilerLiveAllocationInventory,
  type TemplateCompilerLivePreparedAllocationSnapshot,
  type TemplateCompilerLiveAllocationSnapshot,
  type TemplateCompilerLiveInstructionAllocation,
} from './template-compiler-live-allocation.js';
import {
  TemplateCompilerCaptureSyntaxDecisionKind,
  TemplateCompilerOccurrencePrePlanEffectState,
  type TemplateCompilerOccurrenceHydrateElementRowDraft,
  type TemplateCompilerOccurrenceRowAssembly,
  type TemplateCompilerOccurrenceTargetRowDraft,
} from './template-compiler-occurrence-row-assembly.js';
import { TemplateCompilerPreparedInstructionFundingAuthority } from './template-compiler-prepared-instruction-funding.js';

const hydrateElementAllocationAuthority = {};
const hydrateElementAllocationPreparationAuthority = {};
const exactAllocationsByRows = new WeakMap<
  TemplateCompilerOccurrenceRowAssembly,
  TemplateCompilerOccurrenceHydrateElementAllocationResult
>();

export const enum TemplateCompilerOccurrenceHydrateElementAllocationState {
  Exact = 'exact',
  NotApplicable = 'not-applicable',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerOccurrenceHydrateElementAllocationReasonKind {
  ForeignRowAssembly = 'foreign-row-assembly',
  StaleReceipt = 'stale-receipt',
  ParentAllocationOpen = 'parent-allocation-open',
  PrePlanEffectAdoptionRequired = 'pre-plan-effect-adoption-required',
  EnvelopeMismatch = 'envelope-mismatch',
  InstructionOwnerIdentityMissing = 'instruction-owner-identity-missing',
  InstructionAllocationMismatch = 'instruction-allocation-mismatch',
  CaptureDecisionMismatch = 'capture-decision-mismatch',
  AllocationCollision = 'allocation-collision',
}

export class TemplateCompilerOccurrenceHydrateElementAllocationReason {
  constructor(
    readonly reasonKind: TemplateCompilerOccurrenceHydrateElementAllocationReasonKind,
    readonly summary: string,
    readonly stableRowSlotKeys: readonly string[] = [],
  ) {}
}

/** One funded HE row head; the instruction is real while effective capture products remain future reservations. */
export class TemplateCompilerAllocatedHydrateElementHead {
  readonly instructionOwnerIdentityHandle: IdentityHandle;
  readonly instructionAllocation: TemplateCompilerLiveInstructionAllocation;
  readonly instruction: HydrateElementInstruction;
  readonly captures: readonly TemplateCompilerAllocatedCaptureSyntaxReference[];

  constructor(
    readonly row: TemplateCompilerOccurrenceTargetRowDraft,
    readonly head: TemplateCompilerOccurrenceHydrateElementRowDraft,
    funded: TemplateCompilerFundedHydrateElementHead<
      object,
      TemplateCompilerHydrateElementFundingRow<object>
    >,
  ) {
    const envelope = head.envelope;
    const instructionOwnerIdentityHandle = envelope.definition.identityHandle ?? head.instructionNode.identityHandle;
    const draft = funded.draft;
    this.instructionAllocation = funded.instructionAllocation;
    this.instruction = funded.instruction;
    this.captures = funded.captures;
    if (
      row.hydrateElement !== head
      || head.site !== row.site
      || draft.row !== row
      || draft.site !== row.site
      || draft.instructionSlotKey !== head.instructionSlotKey
      || draft.occurrenceKey !== row.occurrence.occurrenceKey
      || draft.instructionNode !== head.instructionNode
      || draft.instructionOwnerIdentityHandle !== instructionOwnerIdentityHandle
      || funded.instructionOwnerIdentityHandle !== instructionOwnerIdentityHandle
      || draft.elementName !== envelope.elementName
      || draft.resourceLookupName !== envelope.resourceLookupName
      || draft.resource !== envelope.resource
      || !(draft.projectionFundingPlan instanceof TemplateCompilerEmptyHydrateElementProjectionFundingPlan)
      || draft.discardedProjectionContributors.length !== 0
      || draft.auSlotProcessContent !== null
      || draft.auSlotProcessContentRemovedChildNodes.length !== 0
      || !sameObjects(draft.bindableInstructions, envelope.bindableInstructions)
      || !sameObjects(draft.captures, head.captures)
      || draft.usageContainerless !== envelope.containerless.fromUsage
      || draft.sourceAddressHandle !== envelope.source.sourceAddressHandle
      || instructionOwnerIdentityHandle == null
    ) {
      throw new Error(`HydrateElement head '${head.instructionSlotKey}' lost envelope or allocation authority.`);
    }
    this.instructionOwnerIdentityHandle = instructionOwnerIdentityHandle;
  }
}

/** Fully validated HE/capture assembly whose allocation inventory is still namespace-invisible. */
export class TemplateCompilerOccurrenceHydrateElementAllocationPreparation {
  readonly #authority: object;
  readonly headsByRow: ReadonlyMap<
    TemplateCompilerOccurrenceTargetRowDraft,
    TemplateCompilerAllocatedHydrateElementHead
  >;
  readonly headsBySite: ReadonlyMap<
    TemplateCompilerOccurrenceTargetRowDraft['site'],
    TemplateCompilerAllocatedHydrateElementHead
  >;

  constructor(
    authority: object,
    readonly rows: TemplateCompilerOccurrenceRowAssembly,
    readonly allocation: TemplateCompilerLivePreparedAllocationSnapshot,
    readonly heads: readonly TemplateCompilerAllocatedHydrateElementHead[],
  ) {
    this.headsByRow = new Map(heads.map((head) => [head.row, head] as const));
    this.headsBySite = new Map(heads.map((head) => [head.row.site, head] as const));
    if (
      authority !== hydrateElementAllocationPreparationAuthority
      || !hydrateElementAllocationCoverageIsExact(
        rows,
        allocation,
        heads,
        this.headsByRow,
        this.headsBySite,
      )
    ) {
      throw new Error('Prepared HydrateElement allocation lost row, instruction, or capture coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === hydrateElementAllocationPreparationAuthority;
  }
}

/** Candidate-local HE/capture funding that does not publish compiler products or target rows. */
export class TemplateCompilerOccurrenceHydrateElementAllocationAssembly {
  readonly #authority: object;
  readonly rows: TemplateCompilerOccurrenceRowAssembly;
  readonly heads: readonly TemplateCompilerAllocatedHydrateElementHead[];
  private readonly headsByRow: ReadonlyMap<
    TemplateCompilerOccurrenceTargetRowDraft,
    TemplateCompilerAllocatedHydrateElementHead
  >;
  private readonly headsBySite: ReadonlyMap<
    TemplateCompilerOccurrenceTargetRowDraft['site'],
    TemplateCompilerAllocatedHydrateElementHead
  >;

  private constructor(
    authority: object,
    preparation: TemplateCompilerOccurrenceHydrateElementAllocationPreparation,
    readonly allocation: TemplateCompilerLiveAllocationSnapshot,
  ) {
    this.#authority = authority;
    this.rows = preparation.rows;
    this.heads = preparation.heads;
    this.headsByRow = preparation.headsByRow;
    this.headsBySite = preparation.headsBySite;
  }

  static fromCommittedPreparation(
    authority: object,
    preparation: TemplateCompilerOccurrenceHydrateElementAllocationPreparation,
    allocation: TemplateCompilerLiveAllocationSnapshot,
  ): TemplateCompilerOccurrenceHydrateElementAllocationAssembly {
    if (
      authority !== hydrateElementAllocationAuthority
      || !preparation.isModuleConstructed()
      || allocation.prepared !== preparation.allocation
    ) {
      throw new Error('Committed HydrateElement allocation lost its exact prepared inventory.');
    }
    return new TemplateCompilerOccurrenceHydrateElementAllocationAssembly(authority, preparation, allocation);
  }

  isModuleConstructed(): boolean {
    return this.#authority === hydrateElementAllocationAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed() && this.rows.receipt.isCurrent() && this.allocation.isCurrent();
  }

  headForRow(row: TemplateCompilerOccurrenceTargetRowDraft): TemplateCompilerAllocatedHydrateElementHead | null {
    return this.headsByRow.get(row) ?? null;
  }

  headForSite(
    site: TemplateCompilerOccurrenceTargetRowDraft['site'],
  ): TemplateCompilerAllocatedHydrateElementHead | null {
    return this.headsBySite.get(site) ?? null;
  }
}

export class TemplateCompilerOccurrenceHydrateElementAllocationResult {
  constructor(
    readonly state: TemplateCompilerOccurrenceHydrateElementAllocationState,
    readonly assembly: TemplateCompilerOccurrenceHydrateElementAllocationAssembly | null,
    readonly reasons: readonly TemplateCompilerOccurrenceHydrateElementAllocationReason[],
  ) {
    if (
      (state === TemplateCompilerOccurrenceHydrateElementAllocationState.Exact)
        !== (assembly != null && reasons.length === 0)
      || (state === TemplateCompilerOccurrenceHydrateElementAllocationState.NotApplicable)
        !== (assembly == null && reasons.length === 0)
      || (state === TemplateCompilerOccurrenceHydrateElementAllocationState.Pending
        || state === TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible)
        !== (assembly == null && reasons.length > 0)
    ) {
      throw new Error('HydrateElement allocation result lost state/assembly/reason ownership.');
    }
  }
}

/** Fund all ordinary-root HE heads after complete side-effect-free preflight. */
export function allocateTemplateCompilerOccurrenceHydrateElements(
  rows: TemplateCompilerOccurrenceRowAssembly,
): TemplateCompilerOccurrenceHydrateElementAllocationResult {
  if (!rows.isModuleConstructed()) {
    return refused(
      TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible,
      TemplateCompilerOccurrenceHydrateElementAllocationReasonKind.ForeignRowAssembly,
      'HydrateElement allocation requires one module-constructed row assembly.',
    );
  }
  const existing = exactAllocationsByRows.get(rows) ?? null;
  if (existing?.assembly?.isCurrent() === true) return existing;
  if (!rows.receipt.isCurrent()) {
    return refused(
      TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible,
      TemplateCompilerOccurrenceHydrateElementAllocationReasonKind.StaleReceipt,
      'HydrateElement allocation requires the current ordinary-root receipt.',
    );
  }
  const hydrateRows = rows.rows.filter((row) => row.hydrateElement != null);
  if (hydrateRows.length === 0) {
    return new TemplateCompilerOccurrenceHydrateElementAllocationResult(
      TemplateCompilerOccurrenceHydrateElementAllocationState.NotApplicable,
      null,
      [],
    );
  }
  const parentAllocation = rows.receipt.transcript.allocationSnapshot;
  if (
    parentAllocation.state !== TemplateCompilerLiveAllocationSnapshotState.Complete
    || !parentAllocation.isCurrent()
  ) {
    return refused(
      TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible,
      TemplateCompilerOccurrenceHydrateElementAllocationReasonKind.ParentAllocationOpen,
      'HydrateElement allocation requires the exact complete live-site allocation namespace.',
    );
  }
  if (rows.prePlanEffectState !== TemplateCompilerOccurrencePrePlanEffectState.None) {
    return refused(
      TemplateCompilerOccurrenceHydrateElementAllocationState.Pending,
      TemplateCompilerOccurrenceHydrateElementAllocationReasonKind.PrePlanEffectAdoptionRequired,
      'Committed pre-plan effects require structural adoption before HydrateElement funding.',
      hydrateRows.map((row) => row.stableSlotKey),
    );
  }

  const allocatedInstructions = new Map(parentAllocation.instructionAllocations.flatMap((allocation) =>
    allocation.instruction == null ? [] : [[allocation.productHandle, allocation.instruction] as const]
  ));
  const envelopeMismatch = hydrateRows.filter((row) => {
    const head = row.hydrateElement!;
    return !head.envelope.isModuleConstructed()
      || head.site !== row.site
      || head.envelope.element !== row.occurrence
      || head.envelope.processContent.state !== TemplateCompilerHydrateElementProcessContentState.Absent
      || head.envelope.projection.state !== TemplateCompilerHydrateElementProjectionState.None
      || head.envelope.containerless.effective !== (head.site.containerlessPlacement != null)
      || (head.site.containerlessPlacement != null && (
        head.site.containerlessPlacement.envelope !== head.envelope
        || row.placementKind !== TemplateCompilerTargetRowPlacementKind.ContainerlessReplacement
      ))
      || (head.site.containerlessPlacement == null
        && row.placementKind !== TemplateCompilerTargetRowPlacementKind.Marker)
      || head.site.owner.instructionStaging.templateControllers.length > 0;
  });
  if (envelopeMismatch.length > 0) {
    return refused(
      TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible,
      TemplateCompilerOccurrenceHydrateElementAllocationReasonKind.EnvelopeMismatch,
      'One or more HydrateElement heads require structural continuation or lost envelope authority.',
      envelopeMismatch.map((row) => row.stableSlotKey),
    );
  }
  const missingInstructionOwners = hydrateRows.filter((row) =>
    (row.hydrateElement!.envelope.definition.identityHandle
      ?? row.hydrateElement!.instructionNode.identityHandle) == null
  );
  if (missingInstructionOwners.length > 0) {
    return refused(
      TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible,
      TemplateCompilerOccurrenceHydrateElementAllocationReasonKind.InstructionOwnerIdentityMissing,
      'One or more HydrateElement heads have no definition or source-node instruction owner identity.',
      missingInstructionOwners.map((row) => row.stableSlotKey),
    );
  }
  const allocationMismatch = hydrateRows.filter((row) => [
    ...row.hydrateElement!.envelope.bindableInstructions,
    ...row.instructions,
  ].some((instruction) => allocatedInstructions.get(instruction.productHandle) !== instruction));
  if (allocationMismatch.length > 0) {
    return refused(
      TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible,
      TemplateCompilerOccurrenceHydrateElementAllocationReasonKind.InstructionAllocationMismatch,
      'HydrateElement bindable/tail instructions do not belong to the parent allocation inventory.',
      allocationMismatch.map((row) => row.stableSlotKey),
    );
  }
  const captureMismatch = hydrateRows.filter((row) => row.hydrateElement!.captures.some((capture) =>
    (capture.decisionKind === TemplateCompilerCaptureSyntaxDecisionKind.ReuseAuthored)
      !== (capture.authoredSyntax != null)
  ));
  if (
    captureMismatch.length > 0
    || new Set(hydrateRows.flatMap((row) => row.hydrateElement!.captures.map((capture) => capture.stableSlotKey))).size
      !== hydrateRows.reduce((count, row) => count + row.hydrateElement!.captures.length, 0)
  ) {
    return refused(
      TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible,
      TemplateCompilerOccurrenceHydrateElementAllocationReasonKind.CaptureDecisionMismatch,
      'HydrateElement captures lost exact reuse/effective decisions or stable slot identity.',
      captureMismatch.map((row) => row.stableSlotKey),
    );
  }

  const lane = rows.receipt.endpoint.lane;
  const phaseKey = `${lane.localKey}:occurrence-hydrate-elements`;
  const ledger = parentAllocation.ledger.namespace.preparePhase(phaseKey);
  const instructionAuthority = TemplateCompilerPreparedInstructionFundingAuthority.create(ledger, phaseKey);
  const fundingDrafts = hydrateRows.map((row) => {
    const head = row.hydrateElement!;
    return new TemplateCompilerHydrateElementFundingDraft(
      row,
      row.site,
      head.instructionSlotKey,
      row.occurrence.occurrenceKey,
      head.instructionNode,
      head.envelope.definition.identityHandle ?? head.instructionNode.identityHandle!,
      head.envelope.elementName,
      head.envelope.resourceLookupName,
      head.envelope.resource,
      new TemplateCompilerEmptyHydrateElementProjectionFundingPlan(),
      [],
      null,
      [],
      head.envelope.bindableInstructions,
      head.captures,
      head.envelope.containerless.fromUsage,
      head.envelope.source.sourceAddressHandle,
    );
  });
  const funding = fundTemplateCompilerHydrateElements(instructionAuthority, fundingDrafts);
  const heads = funding.heads.map((funded, ordinal) => new TemplateCompilerAllocatedHydrateElementHead(
    hydrateRows[ordinal]!,
    hydrateRows[ordinal]!.hydrateElement!,
    funded,
  ));
  let preparedAllocation: TemplateCompilerLivePreparedAllocationSnapshot;
  try {
    preparedAllocation = ledger.prepareSnapshot();
  } catch {
    return refused(
      TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible,
      TemplateCompilerOccurrenceHydrateElementAllocationReasonKind.InstructionAllocationMismatch,
      'HydrateElement prospective allocation inventory is incomplete or incoherent.',
      hydrateRows.map((row) => row.stableSlotKey),
    );
  }
  const preparation = new TemplateCompilerOccurrenceHydrateElementAllocationPreparation(
    hydrateElementAllocationPreparationAuthority,
    rows,
    preparedAllocation,
    heads,
  );
  let allocation: TemplateCompilerLiveAllocationSnapshot;
  try {
    allocation = ledger.commitPrepared(preparedAllocation);
  } catch {
    return refused(
      TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible,
      TemplateCompilerOccurrenceHydrateElementAllocationReasonKind.AllocationCollision,
      'HydrateElement prepared allocations collide with the current candidate namespace.',
      hydrateRows.map((row) => row.stableSlotKey),
    );
  }
  const assembly = TemplateCompilerOccurrenceHydrateElementAllocationAssembly.fromCommittedPreparation(
    hydrateElementAllocationAuthority,
    preparation,
    allocation,
  );
  const result = new TemplateCompilerOccurrenceHydrateElementAllocationResult(
    TemplateCompilerOccurrenceHydrateElementAllocationState.Exact,
    assembly,
    [],
  );
  exactAllocationsByRows.set(rows, result);
  return result;
}

function refused(
  state: TemplateCompilerOccurrenceHydrateElementAllocationState.Pending
    | TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible,
  reasonKind: TemplateCompilerOccurrenceHydrateElementAllocationReasonKind,
  summary: string,
  stableRowSlotKeys: readonly string[] = [],
): TemplateCompilerOccurrenceHydrateElementAllocationResult {
  return new TemplateCompilerOccurrenceHydrateElementAllocationResult(
    state,
    null,
    [new TemplateCompilerOccurrenceHydrateElementAllocationReason(reasonKind, summary, stableRowSlotKeys)],
  );
}

function hydrateElementAllocationCoverageIsExact(
  rows: TemplateCompilerOccurrenceRowAssembly,
  allocation: TemplateCompilerLiveAllocationInventory,
  heads: readonly TemplateCompilerAllocatedHydrateElementHead[],
  headsByRow: ReadonlyMap<TemplateCompilerOccurrenceTargetRowDraft, TemplateCompilerAllocatedHydrateElementHead>,
  headsBySite: ReadonlyMap<
    TemplateCompilerOccurrenceTargetRowDraft['site'],
    TemplateCompilerAllocatedHydrateElementHead
  >,
): boolean {
  const expectedRows = rows.rows.filter((row) => row.hydrateElement != null);
  const effectiveCaptures = heads.flatMap((head) => head.captures).filter((capture) =>
    capture.effectiveReservation != null
  );
  return allocation.state === TemplateCompilerLiveAllocationSnapshotState.Complete
    && allocation.instructionAllocations.length === heads.length
    && allocation.expressionAllocations.length === 0
    && allocation.sourceAllocations.length === 0
    && allocation.productReservations.length === effectiveCaptures.length
    && headsByRow.size === heads.length
    && headsBySite.size === heads.length
    && sameObjects(heads.map((head) => head.row), expectedRows)
    && sameObjects(
      heads.map((head) => head.instructionAllocation),
      allocation.instructionAllocations,
    )
    && sameObjects(
      effectiveCaptures.map((capture) => capture.effectiveReservation!),
      allocation.productReservations,
    );
}

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
