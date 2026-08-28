import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import { TemplateRenderTargetKind } from './compiled-template.js';
import {
  TemplateCompilerHydrateElementProcessContentState,
  TemplateCompilerHydrateElementProjectionState,
} from './template-compiler-hydrate-element-staging.js';
import {
  stageTemplateCompilerHydrateElementInstruction,
  TemplateCompilerHydrateElementInstructionStagingRequest,
  TemplateCompilerInstructionStagingAllocation,
  type TemplateCompilerInstructionStagingAllocationRequest,
  type TemplateCompilerInstructionStagingAuthority,
} from './template-compiler-instruction-staging.js';
import type { HydrateElementInstruction, TemplateInstruction } from './instruction-ir.js';
import {
  TemplateCompilerLiveAllocationSnapshotState,
  TemplateCompilerLiveProductReservationRole,
  type TemplateCompilerLiveAllocationLedger,
  type TemplateCompilerLiveAllocationSnapshot,
  type TemplateCompilerLiveInstructionAllocation,
  type TemplateCompilerLiveProductReservation,
} from './template-compiler-live-allocation.js';
import {
  TemplateCompilerCaptureSyntaxDecisionKind,
  TemplateCompilerOccurrencePrePlanEffectState,
  type TemplateCompilerCapturedSyntaxRowDraft,
  type TemplateCompilerOccurrenceHydrateElementRowDraft,
  type TemplateCompilerOccurrenceRowAssembly,
  type TemplateCompilerOccurrenceTargetRowDraft,
} from './template-compiler-occurrence-row-assembly.js';

const hydrateElementAllocationAuthority = {};
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

/** Exact authored reuse or future effective-syntax reservation selected for one captured attribute. */
export class TemplateCompilerAllocatedCaptureSyntaxReference {
  readonly productHandle: ProductHandle;

  constructor(
    readonly draft: TemplateCompilerCapturedSyntaxRowDraft,
    readonly effectiveReservation: TemplateCompilerLiveProductReservation | null,
  ) {
    const reused = draft.authoredSyntax;
    const productHandle = reused?.productHandle ?? effectiveReservation?.productHandle ?? null;
    if (
      (draft.decisionKind === TemplateCompilerCaptureSyntaxDecisionKind.ReuseAuthored)
        !== (reused != null && effectiveReservation == null)
      || (draft.decisionKind === TemplateCompilerCaptureSyntaxDecisionKind.EffectiveSyntaxRequired)
        !== (reused == null
          && effectiveReservation?.role === TemplateCompilerLiveProductReservationRole.EffectiveAttributeSyntax)
      || productHandle == null
    ) {
      throw new Error(`Captured syntax '${draft.stableSlotKey}' lost reuse/reservation authority.`);
    }
    this.productHandle = productHandle;
  }
}

/** One funded HE row head; the instruction is real while effective capture products remain future reservations. */
export class TemplateCompilerAllocatedHydrateElementHead {
  readonly instructionOwnerIdentityHandle: IdentityHandle;

  constructor(
    readonly row: TemplateCompilerOccurrenceTargetRowDraft,
    readonly head: TemplateCompilerOccurrenceHydrateElementRowDraft,
    readonly instructionAllocation: TemplateCompilerLiveInstructionAllocation,
    readonly instruction: HydrateElementInstruction,
    readonly captures: readonly TemplateCompilerAllocatedCaptureSyntaxReference[],
  ) {
    const envelope = head.envelope;
    const instructionOwnerIdentityHandle = envelope.definition.identityHandle ?? head.instructionNode.identityHandle;
    if (
      row.hydrateElement !== head
      || head.site !== row.site
      || instructionAllocation.instruction !== instruction
      || instruction.productHandle !== instructionAllocation.productHandle
      || instruction.identityHandle !== instructionAllocation.identityHandle
      || instruction.node !== head.instructionNode
      || instruction.elementName !== envelope.elementName
      || instruction.resourceLookupName !== envelope.resourceLookupName
      || instruction.resource !== envelope.resource
      || instruction.projections.length !== 0
      || instruction.discardedProjectionContributors.length !== 0
      || instruction.auSlotProcessContent !== null
      || instruction.auSlotProcessContentRemovedChildNodes.length !== 0
      || !sameObjects(
        instruction.bindableInstructionProductHandles,
        envelope.bindableInstructions.map((candidate) => candidate.productHandle),
      )
      || !sameObjects(
        instruction.captureSyntaxProductHandles,
        captures.map((capture) => capture.productHandle),
      )
      || instruction.containerless !== envelope.containerless.fromUsage
      || instruction.sourceAddressHandle !== envelope.source.sourceAddressHandle
      || !sameObjects(captures.map((capture) => capture.draft), head.captures)
      || instructionOwnerIdentityHandle == null
    ) {
      throw new Error(`HydrateElement head '${head.instructionSlotKey}' lost envelope or allocation authority.`);
    }
    this.instructionOwnerIdentityHandle = instructionOwnerIdentityHandle;
  }
}

/** Candidate-local HE/capture funding that does not publish compiler products or target rows. */
export class TemplateCompilerOccurrenceHydrateElementAllocationAssembly {
  readonly #authority: object;
  private readonly headsByRow: ReadonlyMap<
    TemplateCompilerOccurrenceTargetRowDraft,
    TemplateCompilerAllocatedHydrateElementHead
  >;
  private readonly headsBySite: ReadonlyMap<
    TemplateCompilerOccurrenceTargetRowDraft['site'],
    TemplateCompilerAllocatedHydrateElementHead
  >;

  constructor(
    authority: object,
    readonly rows: TemplateCompilerOccurrenceRowAssembly,
    readonly allocation: TemplateCompilerLiveAllocationSnapshot,
    readonly heads: readonly TemplateCompilerAllocatedHydrateElementHead[],
  ) {
    const expectedRows = rows.rows.filter((row) => row.hydrateElement != null);
    const effectiveCaptures = heads.flatMap((head) => head.captures).filter((capture) =>
      capture.effectiveReservation != null
    );
    this.headsByRow = new Map(heads.map((head) => [head.row, head] as const));
    this.headsBySite = new Map(heads.map((head) => [head.row.site, head] as const));
    if (
      authority !== hydrateElementAllocationAuthority
      || allocation.state !== TemplateCompilerLiveAllocationSnapshotState.Complete
      || allocation.instructionAllocations.length !== heads.length
      || allocation.expressionAllocations.length !== 0
      || allocation.sourceAllocations.length !== 0
      || allocation.productReservations.length !== effectiveCaptures.length
      || this.headsByRow.size !== heads.length
      || this.headsBySite.size !== heads.length
      || !sameObjects(heads.map((head) => head.row), expectedRows)
      || !sameObjects(
        heads.map((head) => head.instructionAllocation),
        allocation.instructionAllocations,
      )
      || !sameObjects(
        effectiveCaptures.map((capture) => capture.effectiveReservation!),
        allocation.productReservations,
      )
    ) {
      throw new Error('HydrateElement allocation assembly lost row, instruction, or capture coverage.');
    }
    this.#authority = authority;
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
        || row.targetKind !== TemplateRenderTargetKind.RenderLocation
      ))
      || (head.site.containerlessPlacement == null && row.targetKind !== TemplateRenderTargetKind.MarkerTarget)
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
  const authority = new HydrateElementAllocationInstructionAuthority(ledger, phaseKey);
  const heads = hydrateRows.map((row) => {
    const head = row.hydrateElement!;
    const captures = head.captures.map((capture) => {
      if (capture.decisionKind === TemplateCompilerCaptureSyntaxDecisionKind.ReuseAuthored) {
        return new TemplateCompilerAllocatedCaptureSyntaxReference(capture, null);
      }
      const local = `${phaseKey}:${capture.stableSlotKey}:effective-attribute-syntax`;
      return new TemplateCompilerAllocatedCaptureSyntaxReference(
        capture,
        ledger.reserveProduct(
          `${phaseKey}:${capture.stableSlotKey}`,
          'effective-attribute-syntax',
          TemplateCompilerLiveProductReservationRole.EffectiveAttributeSyntax,
          capture.capture.syntax.sourceAddressHandle,
          local,
        ),
      );
    });
    const instruction = stageTemplateCompilerHydrateElementInstruction(
      new TemplateCompilerHydrateElementInstructionStagingRequest(
        authority,
        head.instructionSlotKey,
        row.occurrence.occurrenceKey,
        head.instructionNode,
        head.envelope.elementName,
        head.envelope.resourceLookupName,
        head.envelope.resource,
        () => [],
        [],
        null,
        [],
        head.envelope.bindableInstructions,
        captures.map((capture) => capture.productHandle),
        head.envelope.containerless.fromUsage,
        head.envelope.source.sourceAddressHandle,
      ),
    );
    return new TemplateCompilerAllocatedHydrateElementHead(
      row,
      head,
      authority.allocationFor(instruction),
      instruction,
      captures,
    );
  });
  let allocation: TemplateCompilerLiveAllocationSnapshot;
  try {
    allocation = ledger.commitPrepared();
  } catch {
    return refused(
      TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible,
      TemplateCompilerOccurrenceHydrateElementAllocationReasonKind.AllocationCollision,
      'HydrateElement prepared allocations collide with the current candidate namespace.',
      hydrateRows.map((row) => row.stableSlotKey),
    );
  }
  const assembly = new TemplateCompilerOccurrenceHydrateElementAllocationAssembly(
    hydrateElementAllocationAuthority,
    rows,
    allocation,
    heads,
  );
  const result = new TemplateCompilerOccurrenceHydrateElementAllocationResult(
    TemplateCompilerOccurrenceHydrateElementAllocationState.Exact,
    assembly,
    [],
  );
  exactAllocationsByRows.set(rows, result);
  return result;
}

class HydrateElementAllocationInstructionAuthority implements TemplateCompilerInstructionStagingAuthority {
  private readonly allocationsByInstruction = new Map<TemplateInstruction, TemplateCompilerLiveInstructionAllocation>();

  constructor(
    private readonly ledger: TemplateCompilerLiveAllocationLedger,
    private readonly phaseKey: string,
  ) {}

  create<TInstruction extends TemplateInstruction>(
    request: TemplateCompilerInstructionStagingAllocationRequest,
    factory: (allocation: TemplateCompilerInstructionStagingAllocation) => TInstruction,
  ): TInstruction {
    const siteKey = `${this.phaseKey}:${request.siteKey}`;
    const instructionLocal = `${siteKey}:instruction:${request.local}`;
    const retained = this.ledger.allocateInstruction(
      siteKey,
      request.local,
      request.kind,
      request.sourceAddressHandle,
      instructionLocal,
    );
    const instruction = factory(new TemplateCompilerInstructionStagingAllocation(
      retained.productHandle,
      retained.identityHandle,
      retained.instructionLocal,
    ));
    this.ledger.bindInstruction(instruction);
    this.allocationsByInstruction.set(instruction, retained);
    return instruction;
  }

  allocationFor(instruction: TemplateInstruction): TemplateCompilerLiveInstructionAllocation {
    const allocation = this.allocationsByInstruction.get(instruction) ?? null;
    if (allocation == null) throw new Error('HydrateElement instruction lost its downstream allocation.');
    return allocation;
  }
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

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
