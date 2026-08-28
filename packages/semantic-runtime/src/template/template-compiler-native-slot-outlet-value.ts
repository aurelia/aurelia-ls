import {
  CompiledNativeSlotOutlet,
} from './compiled-template.js';
import {
  AttributeBindingInstruction,
  HydrateAttributeInstruction,
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  ListenerBindingInstruction,
  PropertyBindingInstruction,
  RefBindingInstruction,
  SetAttributeInstruction,
  SetClassAttributeInstruction,
  SetPropertyInstruction,
  SetStyleAttributeInstruction,
  SpreadElementPropBindingInstruction,
  SpreadTransferedBindingInstruction,
  SpreadValueBindingInstruction,
  StylePropertyBindingInstruction,
} from './instruction-ir.js';
import {
  decideTemplateCompilerNativeSlotName,
  TemplateCompilerNativeSlotDecisionKind,
  TemplateCompilerNativeSlotNameInput,
} from './native-slot-compiler-semantics.js';
import {
  TemplateCompilerLiveAttributeCompletion,
  TemplateCompilerLiveAttributeSourceKind,
  TemplateCompilerLiveAttributeTargetLane,
  type TemplateCompilerLiveAttributeContribution,
  type TemplateCompilerLiveAttributeOwnerResult,
} from './template-compiler-live-attribute-assembly.js';
import { TemplateCompilerLiveAttributeDisposition } from './template-compiler-live-attribute-owner.js';
import { TemplateCompilerRootCompilationStateKind } from './template-compiler-root-state.js';
import type { TemplateCompilerSiteCursorTranscript } from './template-compiler-site-cursor.js';

const nativeSlotOutletValueAuthority = {};

export const enum TemplateCompilerNativeSlotOutletValueState {
  Exact = 'exact',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerNativeSlotOutletReasonKind {
  ForeignTranscript = 'foreign-transcript',
  RootStateUnavailable = 'root-state-unavailable',
  ReachedSlotOwnerUnavailable = 'reached-slot-owner-unavailable',
  AuthoredSlotNodeUnavailable = 'authored-slot-node-unavailable',
  NameContributionNonSingular = 'name-contribution-non-singular',
  NameSourceUnavailable = 'name-source-unavailable',
  NameRuntimeControlOpen = 'name-runtime-control-open',
  CurrentnessLost = 'currentness-lost',
}

export class TemplateCompilerNativeSlotOutletReason {
  constructor(
    readonly reasonKind: TemplateCompilerNativeSlotOutletReasonKind,
    readonly occurrenceKey: string | null,
    readonly summary: string,
    readonly pending: boolean,
  ) {}
}

export class TemplateCompilerNativeSlotOutletValue {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly transcript: TemplateCompilerSiteCursorTranscript,
    readonly outlets: readonly CompiledNativeSlotOutlet[],
    private readonly ownerIsCurrent: () => boolean,
  ) {
    if (
      authority !== nativeSlotOutletValueAuthority
      || outlets.length !== transcript.rootState.nativeSlots.length
    ) {
      throw new Error('Native-slot outlet value lost transcript, slot, or source-node coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === nativeSlotOutletValueAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed() && this.ownerIsCurrent();
  }
}

export class TemplateCompilerNativeSlotOutletValueResult {
  constructor(
    readonly state: TemplateCompilerNativeSlotOutletValueState,
    readonly value: TemplateCompilerNativeSlotOutletValue | null,
    readonly reasons: readonly TemplateCompilerNativeSlotOutletReason[],
  ) {
    const exact = state === TemplateCompilerNativeSlotOutletValueState.Exact;
    const unavailable = !exact;
    if (
      exact !== (value != null && value.isModuleConstructed() && reasons.length === 0)
      || unavailable !== (value == null && reasons.length > 0)
    ) {
      throw new Error('Native-slot outlet result lost exact or unavailable ownership.');
    }
  }
}

/** Project reached root-global slot effects from their completed live owners without replaying authored compilation. */
export function projectTemplateCompilerNativeSlotOutlets(
  transcript: TemplateCompilerSiteCursorTranscript,
  ownerIsCurrent: () => boolean,
): TemplateCompilerNativeSlotOutletValueResult {
  if (!transcript.isModuleConstructed()) {
    return unavailable(
      TemplateCompilerNativeSlotOutletValueState.Ineligible,
      TemplateCompilerNativeSlotOutletReasonKind.ForeignTranscript,
      null,
      'Native-slot outlet projection requires one module-constructed compiler transcript.',
    );
  }
  if (!ownerIsCurrent()) {
    return unavailable(
      TemplateCompilerNativeSlotOutletValueState.Ineligible,
      TemplateCompilerNativeSlotOutletReasonKind.CurrentnessLost,
      null,
      'Native-slot outlet projection owner is no longer current.',
    );
  }
  if (transcript.rootState.stateKind !== TemplateCompilerRootCompilationStateKind.Complete) {
    return unavailable(
      TemplateCompilerNativeSlotOutletValueState.Ineligible,
      TemplateCompilerNativeSlotOutletReasonKind.RootStateUnavailable,
      null,
      `Native-slot outlet projection requires Complete root state, received '${transcript.rootState.stateKind}'.`,
    );
  }
  const ownerByElement = new Map(transcript.attributeOwners.map((owner) => [owner.element, owner]));
  const reasons: TemplateCompilerNativeSlotOutletReason[] = [];
  const outlets = transcript.rootState.nativeSlots.flatMap((slot) => {
    if (slot.decision.decisionKind !== TemplateCompilerNativeSlotDecisionKind.Exact) {
      reasons.push(new TemplateCompilerNativeSlotOutletReason(
        TemplateCompilerNativeSlotOutletReasonKind.RootStateUnavailable,
        slot.element.occurrenceKey,
        `Reached native slot ended as '${slot.decision.decisionKind}'.`,
        false,
      ));
      return [];
    }
    const owner = ownerByElement.get(slot.element) ?? null;
    if (owner == null || owner.completion !== TemplateCompilerLiveAttributeCompletion.Complete) {
      reasons.push(new TemplateCompilerNativeSlotOutletReason(
        TemplateCompilerNativeSlotOutletReasonKind.ReachedSlotOwnerUnavailable,
        slot.element.occurrenceKey,
        'Reached native slot has no complete live attribute owner.',
        true,
      ));
      return [];
    }
    if (owner.authoredElement == null) {
      reasons.push(new TemplateCompilerNativeSlotOutletReason(
        TemplateCompilerNativeSlotOutletReasonKind.AuthoredSlotNodeUnavailable,
        slot.element.occurrenceKey,
        'Reached native slot has no singular authored node reference for the current outlet model.',
        true,
      ));
      return [];
    }
    if (owner.instructionStaging.instructions.some((instruction) =>
      instruction instanceof SpreadTransferedBindingInstruction
      || instruction instanceof SpreadElementPropBindingInstruction
      || instruction instanceof SpreadValueBindingInstruction
    )) {
      reasons.push(new TemplateCompilerNativeSlotOutletReason(
        TemplateCompilerNativeSlotOutletReasonKind.NameRuntimeControlOpen,
        slot.element.occurrenceKey,
        'Reached native slot has a spread instruction that may write the runtime name.',
        true,
      ));
      return [];
    }
    const nameContributions = owner.contributions.filter((contribution) => contribution.syntax?.target === 'name');
    if (nameContributions.length > 1) {
      reasons.push(new TemplateCompilerNativeSlotOutletReason(
        TemplateCompilerNativeSlotOutletReasonKind.NameContributionNonSingular,
        slot.element.occurrenceKey,
        'Reached native slot has more than one live name contribution.',
        true,
      ));
      return [];
    }
    const nameContribution = nameContributions[0] ?? null;
    const nameDecision = projectNameDecision(owner, nameContribution, reasons);
    if (nameDecision == null) return [];
    return [new CompiledNativeSlotOutlet(
      owner.authoredElement.toReference(),
      nameDecision.nameKind,
      nameDecision.name,
      nameDecision.sourceAddressHandle,
    )];
  });
  if (reasons.length > 0) {
    return new TemplateCompilerNativeSlotOutletValueResult(
      reasons.some((reason) => !reason.pending)
        ? TemplateCompilerNativeSlotOutletValueState.Ineligible
        : TemplateCompilerNativeSlotOutletValueState.Pending,
      null,
      reasons,
    );
  }
  if (!ownerIsCurrent()) {
    return unavailable(
      TemplateCompilerNativeSlotOutletValueState.Ineligible,
      TemplateCompilerNativeSlotOutletReasonKind.CurrentnessLost,
      null,
      'Native-slot outlet projection owner changed while outlets were being read.',
    );
  }
  return new TemplateCompilerNativeSlotOutletValueResult(
    TemplateCompilerNativeSlotOutletValueState.Exact,
    new TemplateCompilerNativeSlotOutletValue(nativeSlotOutletValueAuthority, transcript, outlets, ownerIsCurrent),
    [],
  );
}

function projectNameDecision(
  owner: TemplateCompilerLiveAttributeOwnerResult,
  contribution: TemplateCompilerLiveAttributeContribution | null,
  reasons: TemplateCompilerNativeSlotOutletReason[],
) {
  if (contribution == null) {
    return decideTemplateCompilerNativeSlotName(new TemplateCompilerNativeSlotNameInput(false, null, false, null));
  }
  const syntax = contribution.syntax;
  const source = contribution.frame.source;
  const sourceAddressHandle = source.authoredAttribute?.valueAddressHandle ?? null;
  if (syntax == null || source.sourceKind !== TemplateCompilerLiveAttributeSourceKind.AuthoredExact) {
    reasons.push(new TemplateCompilerNativeSlotOutletReason(
      TemplateCompilerNativeSlotOutletReasonKind.NameSourceUnavailable,
      owner.element.occurrenceKey,
      'Reached native slot name has no exact authored value source.',
      true,
    ));
    return null;
  }
  const instructions = instructionsForContribution(owner, contribution);
  const runtimeWriter = contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.Plain
    ? instructions.find(isKnownNameWriter) ?? null
    : null;
  const hasOnlyKnownNonNameEffects = contribution.targetLane !== TemplateCompilerLiveAttributeTargetLane.Plain
    || instructions.every(isKnownNonNameWriter);
  if (runtimeWriter != null) {
    return decideTemplateCompilerNativeSlotName(new TemplateCompilerNativeSlotNameInput(
      false,
      null,
      true,
      sourceAddressHandle,
    ));
  }
  if (
    contribution.disposition === TemplateCompilerLiveAttributeDisposition.Retained
    && syntax.runtimeRawName === 'name'
  ) {
    if (!hasOnlyKnownNonNameEffects) {
      reasons.push(new TemplateCompilerNativeSlotOutletReason(
        TemplateCompilerNativeSlotOutletReasonKind.NameRuntimeControlOpen,
        owner.element.occurrenceKey,
        `Retained native slot name syntax '${syntax.runtimeRawName}' has an unmodeled instruction effect.`,
        true,
      ));
      return null;
    }
    return decideTemplateCompilerNativeSlotName(new TemplateCompilerNativeSlotNameInput(
      true,
      contribution.frame.scalar.currentValue,
      false,
      sourceAddressHandle,
    ));
  }
  if (
    (
      contribution.disposition === TemplateCompilerLiveAttributeDisposition.Removed
      || syntax.runtimeRawName !== 'name'
    )
    && hasOnlyKnownNonNameEffects
  ) {
    return decideTemplateCompilerNativeSlotName(new TemplateCompilerNativeSlotNameInput(false, null, false, null));
  }
  if (contribution.disposition !== TemplateCompilerLiveAttributeDisposition.Removed) {
    reasons.push(new TemplateCompilerNativeSlotOutletReason(
      TemplateCompilerNativeSlotOutletReasonKind.NameRuntimeControlOpen,
      owner.element.occurrenceKey,
      `Reached native slot name disposition '${contribution.disposition}' is not final.`,
      true,
    ));
    return null;
  }
  reasons.push(new TemplateCompilerNativeSlotOutletReason(
    TemplateCompilerNativeSlotOutletReasonKind.NameRuntimeControlOpen,
    owner.element.occurrenceKey,
    `Removed native slot name syntax '${syntax.runtimeRawName}' has no modeled name writer or non-writer proof.`,
    true,
  ));
  return null;
}

function instructionsForContribution(
  owner: TemplateCompilerLiveAttributeOwnerResult,
  contribution: TemplateCompilerLiveAttributeContribution,
) {
  const authoredAttributeHandle = contribution.frame.source.authoredAttribute?.productHandle ?? null;
  const staged = authoredAttributeHandle == null
    ? []
    : owner.instructionStaging.instructions.filter((instruction) =>
        'attribute' in instruction && instruction.attribute?.productHandle === authoredAttributeHandle
      );
  return [...new Set([...contribution.instructions, ...staged])];
}

function isKnownNonNameWriter(instruction: TemplateCompilerLiveAttributeContribution['instructions'][number]): boolean {
  return instruction instanceof HydrateAttributeInstruction
    || instruction instanceof HydrateTemplateControllerInstruction
    || instruction instanceof ListenerBindingInstruction
    || instruction instanceof RefBindingInstruction
    || instruction instanceof SetClassAttributeInstruction
    || instruction instanceof SetStyleAttributeInstruction
    || instruction instanceof StylePropertyBindingInstruction;
}

function isKnownNameWriter(instruction: TemplateCompilerLiveAttributeContribution['instructions'][number]): boolean {
  return instruction instanceof PropertyBindingInstruction
    ? instruction.targetProperty === 'name'
    : instruction instanceof InterpolationInstruction
      ? instruction.target === 'name'
      : instruction instanceof AttributeBindingInstruction
        ? instruction.attr === 'name' && instruction.target === 'name'
        : instruction instanceof SetPropertyInstruction
          ? instruction.targetProperty === 'name'
          : instruction instanceof SetAttributeInstruction && instruction.targetAttribute === 'name';
}

function unavailable(
  state: Exclude<TemplateCompilerNativeSlotOutletValueState, TemplateCompilerNativeSlotOutletValueState.Exact>,
  reasonKind: TemplateCompilerNativeSlotOutletReasonKind,
  occurrenceKey: string | null,
  summary: string,
): TemplateCompilerNativeSlotOutletValueResult {
  return new TemplateCompilerNativeSlotOutletValueResult(
    state,
    null,
    [new TemplateCompilerNativeSlotOutletReason(
      reasonKind,
      occurrenceKey,
      summary,
      state === TemplateCompilerNativeSlotOutletValueState.Pending,
    )],
  );
}
