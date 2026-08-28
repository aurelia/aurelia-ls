import type { IdentityHandle } from '../kernel/handles.js';
import type { CompiledTemplateReference } from './compiled-template.js';
import type { TemplateVisibleResourceReference } from './compiler-world-reference.js';
import type { HtmlAttributeReference, HtmlNodeReference } from './html-ir.js';
import type { HydrateTemplateControllerInstruction, TemplateInstruction } from './instruction-ir.js';
import {
  stageTemplateCompilerHydrateTemplateControllerInstruction,
  TemplateCompilerHydrateTemplateControllerDraft,
} from './template-compiler-instruction-staging.js';
import {
  TemplateCompilerLiveProductReservationRole,
  type TemplateCompilerLiveAllocationLedger,
  type TemplateCompilerLiveInstructionAllocation,
  type TemplateCompilerLiveProductReservation,
} from './template-compiler-live-allocation.js';
import type { TemplateCompilerPreparedInstructionFundingAuthority } from './template-compiler-prepared-instruction-funding.js';

/** Minimal family TC row identity required by neutral funding. */
export interface TemplateCompilerHydrateTemplateControllerFundingRow {
  readonly stableSlotKey: string;
  readonly edge: object;
  readonly rowContext: object;
  readonly childContext: object;
}

const childFundingAuthority = {};

/** Nominal child definition funded by the semantic owner inside the HTC instruction-local callback. */
export class TemplateCompilerHydrateTemplateControllerChildFunding {
  static create(
    instructionLocal: string,
    context: object,
    reservation: TemplateCompilerLiveProductReservation,
    compiledTemplate: CompiledTemplateReference,
  ): TemplateCompilerHydrateTemplateControllerChildFunding {
    return new TemplateCompilerHydrateTemplateControllerChildFunding(
      childFundingAuthority,
      instructionLocal,
      context,
      reservation,
      compiledTemplate,
    );
  }

  readonly #authority: object;

  private constructor(
    authority: object,
    readonly instructionLocal: string,
    readonly context: object,
    readonly reservation: TemplateCompilerLiveProductReservation,
    readonly compiledTemplate: CompiledTemplateReference,
  ) {
    if (
      authority !== childFundingAuthority
      || instructionLocal.length === 0
      || reservation.role !== TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate
      || compiledTemplate.productHandle !== reservation.productHandle
      || compiledTemplate.identityHandle !== reservation.identityHandle
    ) {
      throw new Error('HTC child funding lost context, generated reservation, or compiled-template reference.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === childFundingAuthority;
  }
}

/** Owner-supplied TC child policy; the shared core never decides which generated context the HTC owns. */
export interface TemplateCompilerHydrateTemplateControllerChildFundingPlan {
  fund(
    instructionLocal: string,
    ledger: TemplateCompilerLiveAllocationLedger,
  ): TemplateCompilerHydrateTemplateControllerChildFunding;
}

/** Fully explicit HTC wire plus exact family row/edge/context identities. */
export class TemplateCompilerHydrateTemplateControllerFundingDraft {
  constructor(
    readonly row: TemplateCompilerHydrateTemplateControllerFundingRow,
    readonly edge: object,
    readonly rowContext: object,
    readonly childContext: object,
    readonly siteKey: string,
    readonly localKey: string,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly controllerName: string,
    readonly resource: TemplateVisibleResourceReference | null,
    readonly props: readonly TemplateInstruction[],
    readonly sourceAddressHandle: TemplateInstruction['sourceAddressHandle'],
    readonly childFundingPlan: TemplateCompilerHydrateTemplateControllerChildFundingPlan,
  ) {
    if (
      row.edge !== edge
      || row.rowContext !== rowContext
      || row.childContext !== childContext
      || row.stableSlotKey.length === 0
      || siteKey.length === 0
      || localKey.length === 0
      || controllerName.length === 0
      || new Set(props.map((instruction) => instruction.productHandle)).size !== props.length
    ) {
      throw new Error(`HTC funding draft '${siteKey}' lost row, edge, context, or explicit wire authority.`);
    }
  }
}

/** One funded HTC edge; target-plan placement and structural execution remain downstream. */
export class TemplateCompilerFundedHydrateTemplateControllerEdge {
  readonly instructionOwnerIdentityHandle: IdentityHandle;

  constructor(
    readonly draft: TemplateCompilerHydrateTemplateControllerFundingDraft,
    readonly instructionAllocation: TemplateCompilerLiveInstructionAllocation,
    readonly instruction: HydrateTemplateControllerInstruction,
    readonly childFunding: TemplateCompilerHydrateTemplateControllerChildFunding,
  ) {
    this.instructionOwnerIdentityHandle = instruction.identityHandle;
    if (
      !childFunding.isModuleConstructed()
      || childFunding.context !== draft.childContext
      || instructionAllocation.instruction !== instruction
      || instruction.productHandle !== instructionAllocation.productHandle
      || instruction.identityHandle !== instructionAllocation.identityHandle
      || this.instructionOwnerIdentityHandle !== instructionAllocation.identityHandle
      || instruction.node !== draft.node
      || instruction.attribute !== draft.attribute
      || instruction.controllerName !== draft.controllerName
      || instruction.resource !== draft.resource
      || instruction.childCompiledTemplate !== childFunding.compiledTemplate
      || !sameObjects(
        instruction.bindingInstructionProductHandles,
        draft.props.map((candidate) => candidate.productHandle),
      )
      || instruction.sourceAddressHandle !== draft.sourceAddressHandle
    ) {
      throw new Error(`Funded HTC '${draft.siteKey}' diverged from its explicit row, child, or wire draft.`);
    }
  }
}

/** Complete local HTC result left in the shared caller-owned prepared phase. */
export class TemplateCompilerHydrateTemplateControllerFundingResult {
  readonly instructionAllocations: readonly TemplateCompilerLiveInstructionAllocation[];
  readonly childReservations: readonly TemplateCompilerLiveProductReservation[];

  constructor(readonly edges: readonly TemplateCompilerFundedHydrateTemplateControllerEdge[]) {
    this.instructionAllocations = edges.map((edge) => edge.instructionAllocation);
    this.childReservations = edges.map((edge) => edge.childFunding.reservation);
    if (
      new Set(edges.map((edge) => edge.draft.row)).size !== edges.length
      || new Set(edges.map((edge) => edge.draft.edge)).size !== edges.length
      || new Set(edges.map((edge) => edge.draft.childContext)).size !== edges.length
      || new Set(this.instructionAllocations).size !== this.instructionAllocations.length
      || new Set(this.childReservations).size !== this.childReservations.length
    ) {
      throw new Error('HTC funding result lost unique row, edge, context, instruction, or child coverage.');
    }
  }
}

/** Allocate/bind HTC drafts in caller order without preparing, committing, or minting child semantics. */
export function fundTemplateCompilerHydrateTemplateControllers(
  authority: TemplateCompilerPreparedInstructionFundingAuthority,
  drafts: readonly TemplateCompilerHydrateTemplateControllerFundingDraft[],
): TemplateCompilerHydrateTemplateControllerFundingResult {
  if (
    !authority.isModuleConstructed()
    || !authority.isCurrent()
    || new Set(drafts.map((draft) => draft.row)).size !== drafts.length
    || new Set(drafts.map((draft) => draft.edge)).size !== drafts.length
  ) {
    throw new Error('HTC funding requires one current prepared instruction authority and unique drafts.');
  }
  const edges = drafts.map((draft) => {
    let childFunding: TemplateCompilerHydrateTemplateControllerChildFunding | null = null;
    const instruction = stageTemplateCompilerHydrateTemplateControllerInstruction(
      new TemplateCompilerHydrateTemplateControllerDraft(
        draft.siteKey,
        draft.localKey,
        draft.node,
        draft.attribute,
        draft.controllerName,
        draft.resource,
        draft.props,
        draft.sourceAddressHandle,
      ),
      authority,
      (instructionLocal) => {
        if (childFunding != null) throw new Error(`HTC child plan '${draft.siteKey}' funded more than once.`);
        childFunding = draft.childFundingPlan.fund(instructionLocal, authority.ledger);
        if (
          !childFunding.isModuleConstructed()
          || childFunding.instructionLocal !== instructionLocal
          || childFunding.context !== draft.childContext
        ) {
          throw new Error(`HTC child plan '${draft.siteKey}' returned foreign context funding.`);
        }
        return childFunding.compiledTemplate;
      },
    );
    if (childFunding == null) throw new Error(`HTC child plan '${draft.siteKey}' was not invoked.`);
    return new TemplateCompilerFundedHydrateTemplateControllerEdge(
      draft,
      authority.allocationFor(instruction),
      instruction,
      childFunding,
    );
  });
  return new TemplateCompilerHydrateTemplateControllerFundingResult(edges);
}

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, ordinal) => right[ordinal] === value);
}
