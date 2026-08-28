import type { TemplateInstruction } from './instruction-ir.js';
import { AttributeClassificationKind } from './attribute-syntax.js';
import {
  TemplateCompilerElementInstructionStagingState,
} from './template-compiler-instruction-staging.js';
import {
  TemplateCompilerLiveAttributeCompletion,
  type TemplateCompilerLiveAttributeOwnerResult,
} from './template-compiler-live-attribute-assembly.js';
import { TemplateCompilerLiveAttributeDisposition } from './template-compiler-live-attribute-owner.js';

const surrogateStagingAuthority = {};

export const enum TemplateCompilerSurrogateStagingState {
  Exact = 'exact',
  Pending = 'pending',
  Invalid = 'invalid',
  Open = 'open',
}

export const enum TemplateCompilerSurrogateStagingReasonKind {
  LiveOwnerOpen = 'live-owner-open',
  LiveOwnerInvalid = 'live-owner-invalid',
  TemplateControllerInvalid = 'template-controller-invalid',
  StructuralMutationPending = 'structural-mutation-pending',
}

export class TemplateCompilerSurrogateStagingReason {
  constructor(
    readonly reasonKind: TemplateCompilerSurrogateStagingReasonKind,
    readonly summary: string,
  ) {}
}

/** Exact root-host instruction sequence after the dedicated validation and live classification passes. */
export class TemplateCompilerSurrogateStaging {
  readonly #authority: object;
  readonly instructions: readonly TemplateInstruction[];

  constructor(
    authority: object,
    readonly owner: TemplateCompilerLiveAttributeOwnerResult,
  ) {
    this.instructions = owner.instructionStaging.directRowTail;
    if (
      authority !== surrogateStagingAuthority
      || owner.completion !== TemplateCompilerLiveAttributeCompletion.Complete
      || owner.instructionStaging.state !== TemplateCompilerElementInstructionStagingState.Complete
      || owner.templateControllers.length > 0
      || owner.captures.length > 0
      || owner.contributions.some((contribution) =>
        contribution.classification.classificationKind !== AttributeClassificationKind.Plain
        || contribution.valueSelection != null
        || contribution.command != null
        || contribution.multiBinding != null
      )
      || (!owner.debugRead.value && owner.contributions.some((contribution) =>
        contribution.disposition === TemplateCompilerLiveAttributeDisposition.Removed
      ))
    ) {
      throw new Error('Surrogate staging lost exact owner, instruction, or retained-attribute authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === surrogateStagingAuthority;
  }
}

export class TemplateCompilerSurrogateStagingResult {
  constructor(
    readonly owner: TemplateCompilerLiveAttributeOwnerResult,
    readonly state: TemplateCompilerSurrogateStagingState,
    readonly staging: TemplateCompilerSurrogateStaging | null,
    readonly reasons: readonly TemplateCompilerSurrogateStagingReason[],
  ) {
    const exact = state === TemplateCompilerSurrogateStagingState.Exact;
    const unavailable = !exact;
    if (
      exact !== (staging != null && staging.owner === owner && reasons.length === 0)
      || unavailable !== (staging == null && reasons.length > 0)
    ) {
      throw new Error('Surrogate staging result lost exact or unavailable ownership.');
    }
  }
}

/** Classify the complete live root owner without pretending compiler-time attribute mutations have executed. */
export function stageTemplateCompilerSurrogate(
  owner: TemplateCompilerLiveAttributeOwnerResult,
): TemplateCompilerSurrogateStagingResult {
  if (owner.completion === TemplateCompilerLiveAttributeCompletion.Invalid) {
    return unavailable(
      owner,
      TemplateCompilerSurrogateStagingState.Invalid,
      TemplateCompilerSurrogateStagingReasonKind.LiveOwnerInvalid,
      owner.reason?.summary ?? 'Surrogate live classification is invalid.',
    );
  }
  if (owner.completion === TemplateCompilerLiveAttributeCompletion.Open) {
    return unavailable(
      owner,
      TemplateCompilerSurrogateStagingState.Open,
      TemplateCompilerSurrogateStagingReasonKind.LiveOwnerOpen,
      owner.reason?.summary ?? 'Surrogate live classification remains Open.',
    );
  }
  if (owner.templateControllers.length > 0) {
    return unavailable(
      owner,
      TemplateCompilerSurrogateStagingState.Invalid,
      TemplateCompilerSurrogateStagingReasonKind.TemplateControllerInvalid,
      'Template controllers are invalid on a root surrogate.',
    );
  }
  if (owner.contributions.some((contribution) =>
    contribution.classification.classificationKind !== AttributeClassificationKind.Plain
    || contribution.valueSelection != null
    || contribution.command != null
    || contribution.multiBinding != null
  )) {
    return unavailable(
      owner,
      TemplateCompilerSurrogateStagingState.Pending,
      TemplateCompilerSurrogateStagingReasonKind.StructuralMutationPending,
      'Only retained static surrogate attributes are closed; dynamic/control attributes need structural execution.',
    );
  }
  if (!owner.debugRead.value && owner.contributions.some((contribution) =>
    contribution.disposition === TemplateCompilerLiveAttributeDisposition.Removed
  )) {
    return unavailable(
      owner,
      TemplateCompilerSurrogateStagingState.Pending,
      TemplateCompilerSurrogateStagingReasonKind.StructuralMutationPending,
      'Surrogate instructions are exact, but compiler-consumed root attributes still need structural execution.',
    );
  }
  return new TemplateCompilerSurrogateStagingResult(
    owner,
    TemplateCompilerSurrogateStagingState.Exact,
    new TemplateCompilerSurrogateStaging(surrogateStagingAuthority, owner),
    [],
  );
}

function unavailable(
  owner: TemplateCompilerLiveAttributeOwnerResult,
  state: Exclude<TemplateCompilerSurrogateStagingState, TemplateCompilerSurrogateStagingState.Exact>,
  reasonKind: TemplateCompilerSurrogateStagingReasonKind,
  summary: string,
): TemplateCompilerSurrogateStagingResult {
  return new TemplateCompilerSurrogateStagingResult(
    owner,
    state,
    null,
    [new TemplateCompilerSurrogateStagingReason(reasonKind, summary)],
  );
}
