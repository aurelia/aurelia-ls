import type ts from 'typescript';
import {
  EvaluationUndefined,
  type EvaluationValue,
} from './values.js';
import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from './seams.js';
import { EvaluationValueEvidence } from './value-pressure.js';
import type { StaticEvaluationValueGraph } from './evaluation-graph.js';

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
  /** Synthetic CommonJS carrier (`exports` or `module`) materialized from authored CommonJS-shaped source. */
  CommonJs = 'commonjs',
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
  public openSeams: readonly EvaluationOpenSeam[];

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
    public state: EvaluationBindingState,
    /** Current evaluator-local value. */
    public value: EvaluationValue,
    /** Exact pressure that qualifies the retained value in this lexical slot. */
    openSeams: readonly EvaluationOpenSeam[],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

/** ECMAScript-like environment record for one module or evaluator-local function call. */
export class ModuleEnvironmentRecord {
  private readonly bindings = new Map<string, EvaluationBinding>();
  private graphOwner: StaticEvaluationValueGraph | null = null;

  constructor(
    /** Module or call-frame key that owns this environment. */
    readonly moduleKey: string,
    /** Lexical environment consulted after this frame's own binding cells. */
    readonly outer: ModuleEnvironmentRecord | null,
  ) {}

  /** Declare or replace a binding cell. */
  declareBinding(
    name: string,
    bindingKind: EvaluationBindingKind,
    mutable: boolean,
    declaration: ts.Node | null,
  ): EvaluationBinding {
    const binding = new EvaluationBinding(
      name,
      bindingKind,
      mutable,
      declaration,
      EvaluationBindingState.Uninitialized,
      EvaluationUndefined,
      [],
    );
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
    openSeams: readonly EvaluationOpenSeam[],
  ): EvaluationBinding {
    const binding = this.bindings.get(name)
      ?? this.declareBinding(name, bindingKind, mutable, declaration);
    binding.value = value;
    binding.openSeams = compactEvaluationOpenSeams(openSeams);
    binding.state = value.kind === 'unknown' || binding.openSeams.length > 0
      ? EvaluationBindingState.Open
      : EvaluationBindingState.Initialized;
    return binding;
  }

  /** Assign a value to an existing mutable binding. */
  setBinding(
    name: string,
    value: EvaluationValue,
    openSeams: readonly EvaluationOpenSeam[],
  ): boolean {
    const binding = this.bindings.get(name);
    if (binding == null) {
      return this.outer?.setBinding(name, value, openSeams) ?? false;
    }
    if (!binding.mutable) {
      return false;
    }
    binding.value = value;
    binding.openSeams = compactEvaluationOpenSeams(openSeams);
    binding.state = value.kind === 'unknown' || binding.openSeams.length > 0
      ? EvaluationBindingState.Open
      : EvaluationBindingState.Initialized;
    return true;
  }

  /** Remove a binding cell introduced by a temporary lexical frame. */
  deleteBinding(name: string): boolean {
    return this.bindings.delete(name);
  }

  /** Read a binding cell by lexical name. */
  readBinding(name: string): EvaluationBinding | null {
    return this.bindings.get(name) ?? this.outer?.readBinding(name) ?? null;
  }

  /** Read a binding value by lexical name. */
  readValue(name: string): EvaluationValue | null {
    return this.readBinding(name)?.value ?? null;
  }

  /** Read a binding value together with the pressure retained by its lexical edge. */
  readEvidence(name: string): EvaluationValueEvidence | null {
    const binding = this.readBinding(name);
    return binding == null
      ? null
      : new EvaluationValueEvidence(binding.value, binding.openSeams);
  }

  /** Snapshot all binding cells in insertion order. */
  readBindings(): readonly EvaluationBinding[] {
    return [...this.bindings.values()];
  }

  /** Install an exact binding snapshot while a separate evaluation session reconstructs an aliased value graph. */
  installBinding(binding: EvaluationBinding): void {
    this.bindings.set(binding.name, binding);
  }

  /** Mark this environment as part of one mutable evaluation graph. */
  adoptGraphOwner(owner: StaticEvaluationValueGraph): void {
    if (this.graphOwner != null && this.graphOwner !== owner) {
      throw new Error(`Evaluation environment ${this.moduleKey} already belongs to another graph owner.`);
    }
    this.graphOwner = owner;
  }

  belongsToGraph(owner: StaticEvaluationValueGraph): boolean {
    return this.graphOwner === owner;
  }

  /** Read graph ownership without exposing a writable carrier to evaluator consumers. */
  readGraphOwner(): StaticEvaluationValueGraph | null {
    return this.graphOwner;
  }

  /** Create a lexical call/constructor frame whose writes reach captured outer binding cells. */
  createChild(moduleKey: string): ModuleEnvironmentRecord {
    const child = new ModuleEnvironmentRecord(moduleKey, this);
    child.graphOwner = this.graphOwner;
    return child;
  }

  /** Snapshot this lexical environment chain while sharing evaluator-local value graphs. */
  clone(moduleKey: string = this.moduleKey): ModuleEnvironmentRecord {
    const clone = new ModuleEnvironmentRecord(
      moduleKey,
      this.outer?.clone(this.outer.moduleKey) ?? null,
    );
    clone.graphOwner = this.graphOwner;
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
          binding.openSeams,
        ),
      );
    }
    return clone;
  }
}
