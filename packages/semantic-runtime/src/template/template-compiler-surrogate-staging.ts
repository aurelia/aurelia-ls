import type { TemplateInstruction } from './instruction-ir.js';
import {
  TemplateCompilerElementInstructionStagingState,
} from './template-compiler-instruction-staging.js';
import {
  TemplateCompilerLiveAttributeCompletion,
  type TemplateCompilerLiveAttributeOwnerResult,
} from './template-compiler-live-attribute-assembly.js';
import { TemplateCompilerAttributeDispositionDraft } from './template-compiler-attribute-disposition.js';

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
export class TemplateCompilerSurrogateAttributeDispositionDraft
  extends TemplateCompilerAttributeDispositionDraft {
  constructor(
    owner: TemplateCompilerLiveAttributeOwnerResult,
    contribution: TemplateCompilerLiveAttributeOwnerResult['contributions'][number],
  ) {
    super(
      `surrogate:attribute:${contribution.frame.attribute.occurrenceKey}:disposition`,
      owner,
      contribution,
    );
  }
}

export class TemplateCompilerSurrogateStaging {
  readonly #authority: object;
  readonly instructions: readonly TemplateInstruction[];

  constructor(
    authority: object,
    readonly owner: TemplateCompilerLiveAttributeOwnerResult,
    readonly attributeDispositions: readonly TemplateCompilerSurrogateAttributeDispositionDraft[],
  ) {
    this.instructions = owner.instructionStaging.directRowTail;
    if (
      authority !== surrogateStagingAuthority
      || owner.completion !== TemplateCompilerLiveAttributeCompletion.Complete
      || owner.instructionStaging.state !== TemplateCompilerElementInstructionStagingState.Complete
      || owner.templateControllers.length > 0
      || attributeDispositions.length !== owner.contributions.length
      || attributeDispositions.some((disposition, ordinal) =>
        disposition.owner !== owner
        || disposition.contribution !== owner.contributions[ordinal]
      )
      || this.attributeDispositions.some((disposition) =>
        disposition.instructionCauseHandles.length === 0
      )
    ) {
      throw new Error('Surrogate staging lost exact owner, instruction, or disposition authority.');
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

/** Classify the complete live root owner and retain its later terminal structural dispositions. */
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
  const dispositions = owner.contributions.map((contribution) =>
    new TemplateCompilerSurrogateAttributeDispositionDraft(owner, contribution)
  );
  if (dispositions.some((disposition) =>
    disposition.instructionCauseHandles.length === 0
  )) {
    return unavailable(
      owner,
      TemplateCompilerSurrogateStagingState.Pending,
      TemplateCompilerSurrogateStagingReasonKind.StructuralMutationPending,
      'A surrogate attribute has no instruction-owned compiler outcome.',
    );
  }
  return new TemplateCompilerSurrogateStagingResult(
    owner,
    TemplateCompilerSurrogateStagingState.Exact,
    new TemplateCompilerSurrogateStaging(surrogateStagingAuthority, owner, dispositions),
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
