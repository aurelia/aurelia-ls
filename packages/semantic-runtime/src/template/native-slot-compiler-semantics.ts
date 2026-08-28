import type { AddressHandle } from '../kernel/handles.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { CompiledNativeSlotNameKind } from './compiled-template.js';

export const enum TemplateCompilerNativeSlotDecisionKind {
  NotApplicable = 'not-applicable',
  Exact = 'exact',
  Invalid = 'invalid',
  Open = 'open',
}

/** Representation-neutral result of the JIT's root-global native `<slot>` check. */
export class TemplateCompilerNativeSlotDecision {
  constructor(
    readonly decisionKind: TemplateCompilerNativeSlotDecisionKind,
    readonly lookupName: string,
    readonly rootDefinition: CustomElementDefinition | null,
  ) {}
}

/** Normalized reached name input shared by authored-product and live compiler native-slot projection. */
export class TemplateCompilerNativeSlotNameInput {
  constructor(
    readonly retainedLiteralPresent: boolean,
    readonly retainedLiteralValue: string | null,
    /** True only when a reached compiler instruction is proved to write the runtime slot name. */
    readonly runtimeControlled: boolean,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {
    if (
      retainedLiteralPresent !== (retainedLiteralValue != null)
      || (runtimeControlled && retainedLiteralPresent)
    ) {
      throw new Error('Native-slot name input lost attribute presence or current scalar value.');
    }
  }
}

export class TemplateCompilerNativeSlotNameDecision {
  constructor(
    readonly nameKind: CompiledNativeSlotNameKind,
    readonly name: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {
    if (
      (nameKind === CompiledNativeSlotNameKind.Dynamic) !== (name == null)
      || (nameKind === CompiledNativeSlotNameKind.Default && name !== '')
      || (nameKind === CompiledNativeSlotNameKind.Default && sourceAddressHandle != null)
    ) {
      throw new Error('Native-slot name decision lost default, static, or dynamic value semantics.');
    }
  }
}

/**
 * Decide the root-global native-slot effect from the effective compiler lookup name.
 *
 * JIT performs this after element lookup and before processContent or attribute classification. A valid reach sets the
 * root compilation's `hasSlots`; an invalid reach throws before the element's attributes or children are compiled.
 */
export function decideTemplateCompilerNativeSlot(
  lookupName: string,
  rootDefinition: CustomElementDefinition | null,
): TemplateCompilerNativeSlotDecision {
  if (lookupName !== 'slot') {
    return new TemplateCompilerNativeSlotDecision(
      TemplateCompilerNativeSlotDecisionKind.NotApplicable,
      lookupName,
      rootDefinition,
    );
  }
  return new TemplateCompilerNativeSlotDecision(
    rootDefinition == null
      ? TemplateCompilerNativeSlotDecisionKind.Open
      : rootDefinition.shadowOptions == null
        ? TemplateCompilerNativeSlotDecisionKind.Invalid
        : TemplateCompilerNativeSlotDecisionKind.Exact,
    lookupName,
    rootDefinition,
  );
}

export function decideTemplateCompilerNativeSlotName(
  input: TemplateCompilerNativeSlotNameInput,
): TemplateCompilerNativeSlotNameDecision {
  return new TemplateCompilerNativeSlotNameDecision(
    input.runtimeControlled
      ? CompiledNativeSlotNameKind.Dynamic
      : input.retainedLiteralPresent
        ? CompiledNativeSlotNameKind.Static
        : CompiledNativeSlotNameKind.Default,
    input.runtimeControlled ? null : input.retainedLiteralValue ?? '',
    input.sourceAddressHandle,
  );
}
