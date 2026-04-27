import type ts from 'typescript';
import {
  EvaluationUndefined,
  type EvaluationValue,
} from './values.js';

export const enum EvaluationBindingKind {
  /** Binding introduced by `var`. */
  Var = 'var',
  /** Binding introduced by `let`. */
  Let = 'let',
  /** Binding introduced by `const`. */
  Const = 'const',
  /** Binding introduced by a function declaration. */
  Function = 'function',
  /** Binding introduced by a class declaration. */
  Class = 'class',
  /** Binding introduced by an import declaration. */
  Import = 'import',
  /** Binding introduced by an evaluator-supported parameter. */
  Parameter = 'parameter',
}

export const enum EvaluationBindingState {
  /** Binding exists but has not received a value yet. */
  Uninitialized = 'uninitialized',
  /** Binding has a concrete evaluator-local value. */
  Initialized = 'initialized',
  /** Binding exists but evaluation could not close its value. */
  Open = 'open',
}

/** One binding cell inside a module or function environment record. */
export class EvaluationBinding {
  constructor(
    /** Name used for lexical lookup. */
    readonly name: string,
    /** Binding source category. */
    readonly bindingKind: EvaluationBindingKind,
    /** Whether assignment may update this binding. */
    readonly mutable: boolean,
    /** Declaration node that produced the binding, when one exists. */
    readonly declaration: ts.Node | null,
    /** Current binding state. */
    public state: EvaluationBindingState = EvaluationBindingState.Uninitialized,
    /** Current evaluator-local value. */
    public value: EvaluationValue = EvaluationUndefined,
  ) {}
}

/** ECMAScript-like environment record for one module or evaluator-local function call. */
export class ModuleEnvironmentRecord {
  private readonly bindings = new Map<string, EvaluationBinding>();

  constructor(
    /** Module or call-frame key that owns this environment. */
    readonly moduleKey: string,
  ) {}

  /** Declare or replace a binding cell. */
  declareBinding(
    name: string,
    bindingKind: EvaluationBindingKind,
    mutable: boolean,
    declaration: ts.Node | null,
  ): EvaluationBinding {
    const binding = new EvaluationBinding(name, bindingKind, mutable, declaration);
    this.bindings.set(name, binding);
    return binding;
  }

  /** Initialize a declared binding, declaring it first if needed for tolerant evaluation. */
  initializeBinding(
    name: string,
    value: EvaluationValue,
    bindingKind: EvaluationBindingKind,
    mutable: boolean,
    declaration: ts.Node | null,
  ): EvaluationBinding {
    const binding = this.bindings.get(name)
      ?? this.declareBinding(name, bindingKind, mutable, declaration);
    binding.value = value;
    binding.state = value.kind === 'unknown'
      ? EvaluationBindingState.Open
      : EvaluationBindingState.Initialized;
    return binding;
  }

  /** Assign a value to an existing mutable binding. */
  setBinding(name: string, value: EvaluationValue): boolean {
    const binding = this.bindings.get(name);
    if (binding == null || !binding.mutable) {
      return false;
    }
    binding.value = value;
    binding.state = value.kind === 'unknown'
      ? EvaluationBindingState.Open
      : EvaluationBindingState.Initialized;
    return true;
  }

  /** Read a binding cell by lexical name. */
  readBinding(name: string): EvaluationBinding | null {
    return this.bindings.get(name) ?? null;
  }

  /** Read a binding value by lexical name. */
  readValue(name: string): EvaluationValue | null {
    return this.bindings.get(name)?.value ?? null;
  }

  /** Snapshot all binding cells in insertion order. */
  readBindings(): readonly EvaluationBinding[] {
    return [...this.bindings.values()];
  }

  /** Clone the environment for branch/function interpretation while sharing evaluator-local values. */
  clone(moduleKey: string = this.moduleKey): ModuleEnvironmentRecord {
    const clone = new ModuleEnvironmentRecord(moduleKey);
    for (const binding of this.bindings.values()) {
      clone.bindings.set(
        binding.name,
        new EvaluationBinding(
          binding.name,
          binding.bindingKind,
          binding.mutable,
          binding.declaration,
          binding.state,
          binding.value,
        ),
      );
    }
    return clone;
  }
}
