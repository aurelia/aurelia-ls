import type { BindingScope } from '../configuration/scope.js';
import type { HydrateTemplateControllerInstruction } from './instruction-ir.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';

/** One concrete template-controller application retained across sibling flow traversal. */
export class TemplateControllerFlowApplication {
  constructor(
    readonly instruction: HydrateTemplateControllerInstruction,
    readonly controller: RuntimeControllerFrame | null,
  ) {}
}

export class TemplateControllerPromiseState {
  constructor(
    readonly application: TemplateControllerFlowApplication,
    readonly valueScope: BindingScope,
  ) {}
}

export const enum TemplateControllerPromiseSettlementKind {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

export class TemplateControllerFlowState {
  private readonly previousIfByParentScope = new Map<string, TemplateControllerFlowApplication>();
  private readonly promiseByChildScopeState = new Map<string, TemplateControllerPromiseState>();
  private readonly switchByChildScopeState = new Map<string, TemplateControllerFlowApplication>();

  rememberIf(
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
  ): void {
    this.previousIfByParentScope.set(
      parent.productHandle,
      new TemplateControllerFlowApplication(instruction, controller),
    );
  }

  consumeIf(parent: BindingScope): TemplateControllerFlowApplication | null {
    const application = this.previousIfByParentScope.get(parent.productHandle) ?? null;
    this.previousIfByParentScope.delete(parent.productHandle);
    return application;
  }

  clearBranch(parent: BindingScope): void {
    this.previousIfByParentScope.delete(parent.productHandle);
  }

  rememberPromise(
    childScope: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
    valueScope: BindingScope,
  ): void {
    this.promiseByChildScopeState.set(
      childScope.productHandle,
      new TemplateControllerPromiseState(
        new TemplateControllerFlowApplication(instruction, controller),
        valueScope,
      ),
    );
  }

  readPromise(childScope: BindingScope): TemplateControllerPromiseState | null {
    return readFlowStateThroughPredecessors(this.promiseByChildScopeState, childScope);
  }

  forgetPromise(childScope: BindingScope): void {
    this.promiseByChildScopeState.delete(childScope.productHandle);
  }

  rememberSwitch(
    childScope: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    controller: RuntimeControllerFrame | null,
  ): void {
    this.switchByChildScopeState.set(
      childScope.productHandle,
      new TemplateControllerFlowApplication(instruction, controller),
    );
  }

  readSwitch(childScope: BindingScope): TemplateControllerFlowApplication | null {
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
