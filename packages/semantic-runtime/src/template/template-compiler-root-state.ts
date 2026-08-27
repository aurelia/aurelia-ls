import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import {
  decideTemplateCompilerNativeSlot,
  type TemplateCompilerNativeSlotDecision,
  TemplateCompilerNativeSlotDecisionKind,
} from './native-slot-compiler-semantics.js';
import type { TemplateCompilerElementOccurrence } from './template-compiler-occurrence.js';

const rootCompilationStateAuthority = {};

export const enum TemplateCompilerRootCompilationStateKind {
  Complete = 'complete',
  Invalid = 'invalid',
  Open = 'open',
}

/** One native slot reached in actual compiler order. */
export class TemplateCompilerReachedNativeSlot {
  constructor(
    readonly element: TemplateCompilerElementOccurrence,
    readonly decision: TemplateCompilerNativeSlotDecision,
  ) {}
}

/**
 * Immutable JIT root-global output accumulated by the reached compiler walk.
 *
 * Native-slot name/static/dynamic detail remains on the same element's completed live owner; the JIT root accumulator
 * itself owns only validity and `hasSlots`.
 */
export class TemplateCompilerRootCompilationState {
  readonly #authority: object;
  readonly stateKind: TemplateCompilerRootCompilationStateKind;
  readonly hasSlots: boolean;

  constructor(
    authority: object,
    readonly rootDefinition: CustomElementDefinition,
    readonly nativeSlots: readonly TemplateCompilerReachedNativeSlot[],
  ) {
    const decisions = nativeSlots.map((slot) => slot.decision.decisionKind);
    this.stateKind = decisions.includes(TemplateCompilerNativeSlotDecisionKind.Invalid)
      ? TemplateCompilerRootCompilationStateKind.Invalid
      : decisions.includes(TemplateCompilerNativeSlotDecisionKind.Open)
        ? TemplateCompilerRootCompilationStateKind.Open
        : TemplateCompilerRootCompilationStateKind.Complete;
    this.hasSlots = decisions.includes(TemplateCompilerNativeSlotDecisionKind.Exact);
    if (
      authority !== rootCompilationStateAuthority
      || nativeSlots.some((slot) =>
        slot.decision.lookupName !== 'slot'
        || slot.decision.rootDefinition !== rootDefinition
        || slot.decision.decisionKind === TemplateCompilerNativeSlotDecisionKind.NotApplicable
      )
      || new Set(nativeSlots.map((slot) => slot.element)).size !== nativeSlots.length
    ) {
      throw new Error('Template compiler root state lost native-slot reach or definition authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === rootCompilationStateAuthority;
  }
}

/** Mutable run-local owner for root-global compiler outputs shared by later child contexts. */
export class TemplateCompilerRootCompilationAccumulator {
  private readonly nativeSlots: TemplateCompilerReachedNativeSlot[] = [];
  private finished: TemplateCompilerRootCompilationState | null = null;

  constructor(readonly rootDefinition: CustomElementDefinition) {}

  reachElement(
    element: TemplateCompilerElementOccurrence,
    lookupName: string,
  ): TemplateCompilerNativeSlotDecision {
    if (this.finished != null) {
      throw new Error('Template compiler root state is already finished.');
    }
    const decision = decideTemplateCompilerNativeSlot(lookupName, this.rootDefinition);
    if (decision.decisionKind !== TemplateCompilerNativeSlotDecisionKind.NotApplicable) {
      this.nativeSlots.push(new TemplateCompilerReachedNativeSlot(element, decision));
    }
    return decision;
  }

  finish(): TemplateCompilerRootCompilationState {
    return this.finished ??= new TemplateCompilerRootCompilationState(
      rootCompilationStateAuthority,
      this.rootDefinition,
      this.nativeSlots,
    );
  }
}
