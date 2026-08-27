import type { CustomElementDefinition } from '../resources/custom-element-definition.js';

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
