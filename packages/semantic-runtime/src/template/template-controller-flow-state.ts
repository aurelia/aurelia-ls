import type { BindingScope } from '../configuration/scope.js';
import type { HydrateTemplateControllerInstruction } from './instruction-ir.js';

export interface TemplateControllerPromiseState {
  readonly instruction: HydrateTemplateControllerInstruction;
  readonly valueScope: BindingScope;
}

export const enum TemplateControllerPromiseSettlementKind {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

export class TemplateControllerFlowState {
  private readonly previousIfByParentScope = new Map<string, HydrateTemplateControllerInstruction>();
  private readonly promiseByChildScopeState = new Map<string, TemplateControllerPromiseState>();
  private readonly switchByChildScopeState = new Map<string, HydrateTemplateControllerInstruction>();

  rememberIf(parent: BindingScope, instruction: HydrateTemplateControllerInstruction): void {
    this.previousIfByParentScope.set(parent.productHandle, instruction);
  }

  consumeIf(parent: BindingScope): HydrateTemplateControllerInstruction | null {
    const instruction = this.previousIfByParentScope.get(parent.productHandle) ?? null;
    this.previousIfByParentScope.delete(parent.productHandle);
    return instruction;
  }

  clearBranch(parent: BindingScope): void {
    this.previousIfByParentScope.delete(parent.productHandle);
  }

  rememberPromise(childScope: BindingScope, instruction: HydrateTemplateControllerInstruction, valueScope: BindingScope): void {
    this.promiseByChildScopeState.set(childScope.productHandle, { instruction, valueScope });
  }

  readPromise(childScope: BindingScope): TemplateControllerPromiseState | null {
    return readFlowStateThroughPredecessors(this.promiseByChildScopeState, childScope);
  }

  forgetPromise(childScope: BindingScope): void {
    this.promiseByChildScopeState.delete(childScope.productHandle);
  }

  rememberSwitch(childScope: BindingScope, instruction: HydrateTemplateControllerInstruction): void {
    this.switchByChildScopeState.set(childScope.productHandle, instruction);
  }

  readSwitch(childScope: BindingScope): HydrateTemplateControllerInstruction | null {
    return readFlowStateThroughPredecessors(this.switchByChildScopeState, childScope);
  }

  forgetSwitch(childScope: BindingScope): void {
    this.switchByChildScopeState.delete(childScope.productHandle);
  }
}

function readFlowStateThroughPredecessors<T>(
  states: ReadonlyMap<string, T>,
  scope: BindingScope,
): T | null {
  let current: BindingScope | null = scope;
  while (current != null) {
    const state = states.get(current.productHandle);
    if (state != null) {
      return state;
    }
    current = current.predecessor;
  }
  return null;
}
