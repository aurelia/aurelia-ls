import type ts from "typescript";

import {
  EvaluationUndefined,
  EvaluationValueKind,
  type EvaluationValue,
} from "./value.js";

/** Binding source category inside an evaluator environment. */
export const enum EvaluationBindingKind {
  /** Binding introduced by `var`. */
  Var = "var",
  /** Binding introduced by `let`. */
  Let = "let",
  /** Binding introduced by `const`. */
  Const = "const",
  /** Binding introduced by a function declaration. */
  Function = "function",
  /** Binding introduced by a class declaration. */
  Class = "class",
  /** Binding introduced by an import declaration. */
  Import = "import",
  /** Binding introduced for a supported function call parameter. */
  Parameter = "parameter",
}

/** Current lifecycle state of one evaluator binding. */
export const enum EvaluationBindingState {
  /** Binding exists but has not received a value yet. */
  Uninitialized = "uninitialized",
  /** Binding has a concrete evaluator-local value. */
  Initialized = "initialized",
  /** Binding exists but evaluation could not close its value. */
  Open = "open",
}

/** One lexical binding cell inside an evaluator environment. */
export class EvaluationBinding {
  constructor(
    /** Name used for lexical lookup. */
    readonly name: string,
    /** Source category that introduced this binding. */
    readonly bindingKind: EvaluationBindingKind,
    /** Whether assignment may update this binding. */
    readonly mutable: boolean,
    /** Source node that declared this binding, when known. */
    readonly declaration: ts.Node | null,
    /** Current binding state. */
    public state: EvaluationBindingState = EvaluationBindingState.Uninitialized,
    /** Current evaluator-local value. */
    public value: EvaluationValue = EvaluationUndefined,
  ) {}
}

/** ECMAScript-like environment record for one module or evaluator-local call frame. */
export class EvaluationEnvironment {
  readonly #bindings = new Map<string, EvaluationBinding>();

  constructor(
    /** Module or call-frame key that owns this environment. */
    readonly moduleKey: string,
  ) {}

  /** Declare or replace a binding cell. */
  declareBinding(
    /** Name used for lexical lookup. */
    name: string,
    /** Source category that introduced this binding. */
    bindingKind: EvaluationBindingKind,
    /** Whether assignment may update this binding. */
    mutable: boolean,
    /** Source node that declared this binding, when known. */
    declaration: ts.Node | null,
  ): EvaluationBinding {
    const binding = new EvaluationBinding(name, bindingKind, mutable, declaration);
    this.#bindings.set(name, binding);
    return binding;
  }

  /** Initialize a binding, declaring it first if tolerant evaluation needs to. */
  initializeBinding(
    /** Name used for lexical lookup. */
    name: string,
    /** Value to store. */
    value: EvaluationValue,
    /** Source category that introduced this binding. */
    bindingKind: EvaluationBindingKind,
    /** Whether assignment may update this binding. */
    mutable: boolean,
    /** Source node that declared this binding, when known. */
    declaration: ts.Node | null,
  ): EvaluationBinding {
    const binding = this.#bindings.get(name) ?? this.declareBinding(name, bindingKind, mutable, declaration);
    binding.value = value;
    binding.state = value.kind === EvaluationValueKind.Unknown
      ? EvaluationBindingState.Open
      : EvaluationBindingState.Initialized;
    return binding;
  }

  /** Assign an existing mutable binding. */
  setBinding(
    /** Name used for lexical lookup. */
    name: string,
    /** Value to store. */
    value: EvaluationValue,
  ): boolean {
    const binding = this.#bindings.get(name);
    if (binding === undefined || !binding.mutable) {
      return false;
    }
    binding.value = value;
    binding.state = value.kind === EvaluationValueKind.Unknown
      ? EvaluationBindingState.Open
      : EvaluationBindingState.Initialized;
    return true;
  }

  /** Read a binding cell by lexical name. */
  readBinding(
    /** Name used for lexical lookup. */
    name: string,
  ): EvaluationBinding | null {
    return this.#bindings.get(name) ?? null;
  }

  /** Read a binding value by lexical name. */
  readValue(
    /** Name used for lexical lookup. */
    name: string,
  ): EvaluationValue | null {
    return this.#bindings.get(name)?.value ?? null;
  }

  /** Read all binding cells in insertion order. */
  readBindings(): readonly EvaluationBinding[] {
    return [...this.#bindings.values()];
  }

  /** Clone this environment for branch or function-call interpretation. */
  clone(
    /** Module or call-frame key for the cloned environment. */
    moduleKey: string = this.moduleKey,
  ): EvaluationEnvironment {
    const clone = new EvaluationEnvironment(moduleKey);
    for (const binding of this.#bindings.values()) {
      clone.#bindings.set(
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
