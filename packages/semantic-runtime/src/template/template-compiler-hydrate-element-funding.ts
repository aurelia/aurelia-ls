import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type { TemplateVisibleResourceReference } from './compiler-world-reference.js';
import type { HtmlNodeReference } from './html-ir.js';
import {
  type AuSlotProcessContentInstructionData,
  type HydrateElementInstruction,
  type HydrateElementProjectionContributor,
  HydrateElementProjectionContributorDisposition,
  type HydrateElementProjectionDefinition,
  type TemplateInstruction,
} from './instruction-ir.js';
import {
  stageTemplateCompilerHydrateElementInstruction,
  TemplateCompilerHydrateElementInstructionStagingRequest,
} from './template-compiler-instruction-staging.js';
import {
  TemplateCompilerLiveProductReservationRole,
  type TemplateCompilerLiveAllocationLedger,
  type TemplateCompilerLiveInstructionAllocation,
  type TemplateCompilerLiveProductReservation,
} from './template-compiler-live-allocation.js';
import {
  TemplateCompilerCaptureSyntaxDecisionKind,
  type TemplateCompilerCapturedSyntaxRowDraft,
} from './template-compiler-occurrence-row-assembly.js';
import type { TemplateCompilerPreparedInstructionFundingAuthority } from './template-compiler-prepared-instruction-funding.js';

/** Minimal row identity required by neutral HE funding. */
export interface TemplateCompilerHydrateElementFundingRow<TSite extends object> {
  readonly stableSlotKey: string;
  readonly site: TSite;
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

const projectionFundingAuthority = {};

/** Nominal projection-definition funding created inside the HE instruction-local allocation seam. */
export class TemplateCompilerHydrateElementProjectionFunding {
  static create(
    definitions: readonly HydrateElementProjectionDefinition[],
    reservations: readonly TemplateCompilerLiveProductReservation[],
  ): TemplateCompilerHydrateElementProjectionFunding {
    return new TemplateCompilerHydrateElementProjectionFunding(
      projectionFundingAuthority,
      definitions,
      reservations,
    );
  }

  readonly #authority: object;

  private constructor(
    authority: object,
    readonly definitions: readonly HydrateElementProjectionDefinition[],
    readonly reservations: readonly TemplateCompilerLiveProductReservation[],
  ) {
    if (
      authority !== projectionFundingAuthority
      || definitions.length !== reservations.length
      || new Set(definitions.map((definition) => definition.slotName)).size !== definitions.length
      || definitions.some((definition, ordinal) => {
        const reservation = reservations[ordinal];
        return definition.slotName.length === 0
          || definition.contributors.length === 0
          || definition.contributors.some((contributor) =>
            contributor.slotName !== definition.slotName
            || contributor.disposition === HydrateElementProjectionContributorDisposition.DiscardedWhitespace
          )
          || reservation?.role !== TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate
          || definition.compiledTemplate.productHandle !== reservation.productHandle
          || definition.compiledTemplate.identityHandle !== reservation.identityHandle;
      })
      || new Set(reservations.map((reservation) => reservation.productHandle)).size !== reservations.length
    ) {
      throw new Error('HydrateElement projection funding lost definition/reservation ownership or order.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === projectionFundingAuthority;
  }
}

/** Caller-owned projection policy; the core supplies the exact HE instruction local and prepared ledger. */
export interface TemplateCompilerHydrateElementProjectionFundingPlan {
  fund(
    instructionLocal: string,
    ledger: TemplateCompilerLiveAllocationLedger,
  ): TemplateCompilerHydrateElementProjectionFunding;
}

/** Exact ordinary/no-projection plan that preserves the callback without allocating a child definition. */
export class TemplateCompilerEmptyHydrateElementProjectionFundingPlan
  implements TemplateCompilerHydrateElementProjectionFundingPlan {
  fund(
    instructionLocal: string,
    ledger: TemplateCompilerLiveAllocationLedger,
  ): TemplateCompilerHydrateElementProjectionFunding {
    if (instructionLocal.length === 0 || !ledger.isPreparedPhase) {
      throw new Error('Empty HE projection funding requires one prepared instruction-local allocation seam.');
    }
    return TemplateCompilerHydrateElementProjectionFunding.create([], []);
  }
}

/** Fully explicit expected HE wire shape; ordinary and family lowering are only adapters over this draft. */
export class TemplateCompilerHydrateElementFundingDraft<
  TSite extends object,
  TRow extends TemplateCompilerHydrateElementFundingRow<TSite>,
> {
  constructor(
    readonly row: TRow,
    readonly site: TSite,
    readonly instructionSlotKey: string,
    readonly occurrenceKey: string,
    readonly instructionNode: HtmlNodeReference,
    readonly instructionOwnerIdentityHandle: IdentityHandle,
    readonly elementName: string,
    readonly resourceLookupName: string,
    readonly resource: TemplateVisibleResourceReference | null,
    readonly projectionFundingPlan: TemplateCompilerHydrateElementProjectionFundingPlan,
    readonly discardedProjectionContributors: readonly HydrateElementProjectionContributor[],
    readonly auSlotProcessContent: AuSlotProcessContentInstructionData | null,
    readonly auSlotProcessContentRemovedChildNodes: readonly HtmlNodeReference[],
    readonly bindableInstructions: readonly TemplateInstruction[],
    readonly captures: readonly TemplateCompilerCapturedSyntaxRowDraft[],
    readonly usageContainerless: boolean,
    readonly sourceAddressHandle: TemplateInstruction['sourceAddressHandle'],
  ) {
    if (
      row.site !== site
      || row.stableSlotKey.length === 0
      || instructionSlotKey.length === 0
      || occurrenceKey.length === 0
      || elementName.length === 0
      || resourceLookupName.length === 0
      || new Set(captures.map((capture) => capture.stableSlotKey)).size !== captures.length
      || discardedProjectionContributors.some((contributor) =>
        contributor.disposition !== HydrateElementProjectionContributorDisposition.DiscardedWhitespace
      )
      || (auSlotProcessContent == null && auSlotProcessContentRemovedChildNodes.length > 0)
    ) {
      throw new Error(`HydrateElement funding draft '${instructionSlotKey}' lost row, wire, or reservation authority.`);
    }
  }
}

/** One neutral funded HE head; no target plan, namespace commit, or publication is implied. */
export class TemplateCompilerFundedHydrateElementHead<
  TSite extends object,
  TRow extends TemplateCompilerHydrateElementFundingRow<TSite>,
> {
  readonly instructionOwnerIdentityHandle: IdentityHandle;
  readonly productReservations: readonly TemplateCompilerLiveProductReservation[];

  constructor(
    readonly draft: TemplateCompilerHydrateElementFundingDraft<TSite, TRow>,
    readonly instructionAllocation: TemplateCompilerLiveInstructionAllocation,
    readonly instruction: HydrateElementInstruction,
    readonly captures: readonly TemplateCompilerAllocatedCaptureSyntaxReference[],
    readonly projectionFunding: TemplateCompilerHydrateElementProjectionFunding,
  ) {
    const effectiveReservations = captures.flatMap((capture) =>
      capture.effectiveReservation == null ? [] : [capture.effectiveReservation]
    );
    this.instructionOwnerIdentityHandle = draft.instructionOwnerIdentityHandle;
    this.productReservations = [...effectiveReservations, ...projectionFunding.reservations];
    if (
      !projectionFunding.isModuleConstructed()
      || instructionAllocation.instruction !== instruction
      || this.instructionOwnerIdentityHandle == null
      || instruction.productHandle !== instructionAllocation.productHandle
      || instruction.identityHandle !== instructionAllocation.identityHandle
      || instruction.node !== draft.instructionNode
      || instruction.elementName !== draft.elementName
      || instruction.resourceLookupName !== draft.resourceLookupName
      || instruction.resource !== draft.resource
      || !sameObjects(instruction.projections, projectionFunding.definitions)
      || !sameObjects(instruction.discardedProjectionContributors, draft.discardedProjectionContributors)
      || instruction.auSlotProcessContent !== draft.auSlotProcessContent
      || !sameObjects(
        instruction.auSlotProcessContentRemovedChildNodes,
        draft.auSlotProcessContentRemovedChildNodes,
      )
      || !sameObjects(
        instruction.bindableInstructionProductHandles,
        draft.bindableInstructions.map((candidate) => candidate.productHandle),
      )
      || !sameObjects(
        instruction.captureSyntaxProductHandles,
        captures.map((capture) => capture.productHandle),
      )
      || instruction.containerless !== draft.usageContainerless
      || instruction.sourceAddressHandle !== draft.sourceAddressHandle
      || !sameObjects(captures.map((capture) => capture.draft), draft.captures)
      || new Set(this.productReservations).size !== this.productReservations.length
    ) {
      throw new Error(`Funded HydrateElement '${draft.instructionSlotKey}' diverged from its explicit wire draft.`);
    }
  }
}

/** Complete local result left in the caller-owned mutable prepared ledger. */
export class TemplateCompilerHydrateElementFundingResult {
  readonly instructionAllocations: readonly TemplateCompilerLiveInstructionAllocation[];
  readonly productReservations: readonly TemplateCompilerLiveProductReservation[];

  constructor(
    readonly heads: readonly TemplateCompilerFundedHydrateElementHead<object, TemplateCompilerHydrateElementFundingRow<object>>[],
  ) {
    this.instructionAllocations = heads.map((head) => head.instructionAllocation);
    this.productReservations = heads.flatMap((head) => head.productReservations);
    if (
      new Set(heads.map((head) => head.draft.row)).size !== heads.length
      || new Set(heads.map((head) => head.draft.site)).size !== heads.length
      || new Set(this.instructionAllocations).size !== this.instructionAllocations.length
      || new Set(this.productReservations).size !== this.productReservations.length
    ) {
      throw new Error('HydrateElement funding result lost unique row, site, instruction, or reservation coverage.');
    }
  }
}

/** Allocate/bind explicit HE drafts into one mutable namespace-invisible phase without preparing or committing it. */
export function fundTemplateCompilerHydrateElements(
  authority: TemplateCompilerPreparedInstructionFundingAuthority,
  drafts: readonly TemplateCompilerHydrateElementFundingDraft<object, TemplateCompilerHydrateElementFundingRow<object>>[],
): TemplateCompilerHydrateElementFundingResult {
  const { ledger, phaseKey } = authority;
  if (
    !authority.isModuleConstructed()
    || !authority.isCurrent()
    || new Set(drafts.map((draft) => draft.instructionSlotKey)).size !== drafts.length
  ) {
    throw new Error('HydrateElement funding requires one mutable prepared phase and unique explicit drafts.');
  }
  const heads = drafts.map((draft) => {
    const captures = draft.captures.map((capture) => {
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
    let projectionFunding: TemplateCompilerHydrateElementProjectionFunding | null = null;
    const instruction = stageTemplateCompilerHydrateElementInstruction(
      new TemplateCompilerHydrateElementInstructionStagingRequest(
        authority,
        draft.instructionSlotKey,
        draft.occurrenceKey,
        draft.instructionNode,
        draft.elementName,
        draft.resourceLookupName,
        draft.resource,
        (instructionLocal) => {
          if (projectionFunding != null) {
            throw new Error(`HydrateElement projection plan '${draft.instructionSlotKey}' funded more than once.`);
          }
          projectionFunding = draft.projectionFundingPlan.fund(instructionLocal, ledger);
          if (!projectionFunding.isModuleConstructed()) {
            throw new Error(`HydrateElement projection plan '${draft.instructionSlotKey}' returned foreign funding.`);
          }
          return projectionFunding.definitions;
        },
        draft.discardedProjectionContributors,
        draft.auSlotProcessContent,
        draft.auSlotProcessContentRemovedChildNodes,
        draft.bindableInstructions,
        captures.map((capture) => capture.productHandle),
        draft.usageContainerless,
        draft.sourceAddressHandle,
      ),
    );
    if (projectionFunding == null) {
      throw new Error(`HydrateElement projection plan '${draft.instructionSlotKey}' was not invoked.`);
    }
    return new TemplateCompilerFundedHydrateElementHead(
      draft,
      authority.allocationFor(instruction),
      instruction,
      captures,
      projectionFunding,
    );
  });
  return new TemplateCompilerHydrateElementFundingResult(heads);
}

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, ordinal) => right[ordinal] === value);
}
