import type { BindingScope } from '../configuration/scope.js';
import type { HydrateTemplateControllerInstruction } from './instruction-ir.js';

export interface TemplateControllerPromiseState {
  readonly instruction: HydrateTemplateControllerInstruction;
  readonly valueScope: BindingScope;
}

export const enum TemplateControllerPromiseResultKind {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

export class TemplateControllerFlowState {
  private readonly previousIfByParentScope = new Map<string, HydrateTemplateControllerInstruction>();
  private readonly promiseByChildScope = new Map<string, TemplateControllerPromiseState>();
  private readonly switchByChildScope = new Map<string, HydrateTemplateControllerInstruction>();

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
    this.promiseByChildScope.set(childScope.productHandle, { instruction, valueScope });
  }

  readPromise(childScope: BindingScope): TemplateControllerPromiseState | null {
    return this.promiseByChildScope.get(childScope.productHandle) ?? null;
  }

  forgetPromise(childScope: BindingScope): void {
    this.promiseByChildScope.delete(childScope.productHandle);
  }

  rememberSwitch(childScope: BindingScope, instruction: HydrateTemplateControllerInstruction): void {
    this.switchByChildScope.set(childScope.productHandle, instruction);
  }

  readSwitch(childScope: BindingScope): HydrateTemplateControllerInstruction | null {
    return this.switchByChildScope.get(childScope.productHandle) ?? null;
  }

  forgetSwitch(childScope: BindingScope): void {
    this.switchByChildScope.delete(childScope.productHandle);
  }
}
