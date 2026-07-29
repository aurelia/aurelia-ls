import type {
  AddressHandle,
  HotDetailHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  CheckerExpressionAccessTarget as RuntimeExpressionAccessTargetLink,
  CheckerExpressionAccessTargetResolutionKind as RuntimeExpressionAccessTargetResolution,
} from '../type-system/expression-access-target.js';
import type {
  RuntimeOperationRealization,
  RuntimeOperationReachability,
} from './runtime-operation.js';

export {
  CheckerExpressionAccessTarget as RuntimeExpressionAccessTargetLink,
  CheckerExpressionAccessTargetResolutionKind as RuntimeExpressionAccessTargetResolution,
} from '../type-system/expression-access-target.js';

/** Runtime owner whose expression operation contains an access use. */
export const enum RuntimeExpressionAccessOwnerKind {
  /** One rendered runtime binding. */
  Binding = 'binding',
  /** One controller-owned `@watch` watcher. */
  RuntimeWatcher = 'runtime-watcher',
  /** One source-level `Observation.watch` or `Observation.run` construction plan. */
  SourceEffectPlan = 'source-effect-plan',
  /** One source-backed computed observer definition. */
  ComputedObserver = 'computed-observer',
}

/** Whether the access has an authored source occurrence or was introduced by a closed framework transformation. */
export const enum RuntimeExpressionAccessOrigin {
  /** The access corresponds to a token or expression written by the application author. */
  Authored = 'authored',
  /** The access is introduced by a closed Aurelia lowering or runtime operation. */
  Generated = 'generated',
}

/** Syntax form that performs the access. */
export const enum RuntimeExpressionAccessForm {
  /** Scope lookup such as `item`. */
  Scope = 'scope',
  /** Named member lookup such as `item.name`. */
  Member = 'member',
  /** Computed key lookup such as `items[index]`. */
  Keyed = 'keyed',
  /** Scope-owned call such as `select(item)`. */
  ScopeCall = 'scope-call',
  /** Named member call such as `items.map(...)`. */
  MemberCall = 'member-call',
  /** Call through an already-evaluated function value. */
  FunctionCall = 'function-call',
  /** Framework/global lookup rather than a binding-scope lookup. */
  Global = 'global',
  /** Explicit current or ancestor context access. */
  This = 'this',
  /** Dependency declared as metadata rather than ordinary executable syntax. */
  Declarative = 'declarative',
}

/** Semantic role of one access within its exact runtime operation. */
export const enum RuntimeExpressionAccessRole {
  /** The operation reads the reached value. */
  Read = 'read',
  /** The operation invokes the reached callable value. */
  Call = 'call',
  /** The operation writes without first reading the target value. */
  WriteTarget = 'write-target',
  /** The operation reads and may subsequently write the same target. */
  ReadWriteTarget = 'read-write-target',
  /** Metadata declares the target as an observation dependency. */
  DeclarativeDependency = 'declarative-dependency',
}

/** Runtime phase in which Aurelia spends the access. */
export const enum RuntimeExpressionAccessPhase {
  /** Binding-resource arguments evaluated during `astBind(...)`. */
  Bind = 'bind',
  /** Source value evaluation during normal binding refresh. */
  SourceEvaluation = 'source-evaluation',
  /** Assignment back into a binding source. */
  SourceAssignment = 'source-assignment',
  /** Repeat key/contextual evaluation while reconciling collection views. */
  CollectionReconciliation = 'collection-reconciliation',
  /** Controller watcher getter/expression evaluation. */
  WatcherEvaluation = 'watcher-evaluation',
  /** Direct source-effect getter or callback evaluation. */
  EffectEvaluation = 'effect-evaluation',
  /** Computed observer getter or declared-dependency evaluation. */
  ComputedEvaluation = 'computed-evaluation',
}

/** Whether the operation records observation dependencies while spending this access. */
export const enum RuntimeExpressionAccessTracking {
  /** Aurelia evaluates the operation with an active connectable. */
  Connectable = 'connectable',
  /** Aurelia evaluates the operation without collecting dependencies. */
  Untracked = 'untracked',
  /** Observation does not apply to this operation kind. */
  NotApplicable = 'not-applicable',
  /** Available semantics cannot close whether tracking occurs. */
  Open = 'open',
}

/** Runtime expression operation slot owned by a binding, watcher, source effect, or computed observer. */
export const enum RuntimeExpressionOperationKind {
  /** Ordinary rendered binding source operation. */
  BindingSource = 'binding-source',
  /** One independently bound hole of an interpolation. */
  InterpolationPart = 'interpolation-part',
  /** Source-member read performed by a runtime-generated inner binding for `...$bindables`. */
  SpreadMemberSource = 'spread-member-source',
  /** One bind-time binding-behavior argument. */
  BindingBehaviorArgument = 'binding-behavior-argument',
  /** One source-evaluation value-converter argument. */
  ValueConverterArgument = 'value-converter-argument',
  /** Repeat key expression evaluated for each repeated item. */
  RepeatKey = 'repeat-key',
  /** Repeat contextual expression such as a contextual property projection. */
  RepeatContextual = 'repeat-contextual',
  /** Parsed controller watcher expression. */
  WatcherExpression = 'watcher-expression',
  /** Controller watcher TypeScript getter body. */
  WatcherGetter = 'watcher-getter',
  /** Parsed direct `Observation.watch` expression. */
  EffectExpression = 'effect-expression',
  /** Direct source-effect TypeScript getter body. */
  EffectGetter = 'effect-getter',
  /** Synchronous `Observation.run` callback body. */
  EffectRunCallback = 'effect-run-callback',
  /** Source-backed computed getter body. */
  ComputedGetter = 'computed-getter',
  /** Authored declarative computed dependency path. */
  ComputedDependencyKey = 'computed-dependency-key',
  /** Authored computed dependency function body. */
  ComputedDependencyFunction = 'computed-dependency-function',
}

/** One bounded control or invocation condition on an access use. */
export const enum RuntimeExpressionExecutionQualifierKind {
  /** Access occurs only in the truthy arm of a condition. */
  ConditionalTrueArm = 'conditional-true-arm',
  /** Access occurs only in the falsy arm of a condition. */
  ConditionalFalseArm = 'conditional-false-arm',
  /** Statement reached only when a preceding branch, loop, switch, or try path continues. */
  ConditionalContinuation = 'conditional-continuation',
  /** One selected case/default arm of a switch statement. */
  SwitchClause = 'switch-clause',
  /** Catch body reached only through an exception path. */
  ExceptionPath = 'exception-path',
  /** Access occurs only when a logical operator evaluates its right-hand side. */
  ShortCircuitRightHandSide = 'short-circuit-right-hand-side',
  /** Access occurs only when optional access/call continues past a nullish guard. */
  OptionalContinuation = 'optional-continuation',
  /** Access occurs inside a framework-proven synchronous callback invocation. */
  SynchronousCallback = 'synchronous-callback',
  /** Loop condition evaluated at least once when its containing loop statement is reached. */
  LoopCondition = 'loop-condition',
  /** `for` incrementor evaluated after each completed body iteration. */
  LoopIncrement = 'loop-increment',
  /** Loop body whose zero-or-one lower bound depends on the concrete loop form. */
  LoopBody = 'loop-body',
  /** Runtime object/member guard that admits a generated read only when the source property exists. */
  RuntimeObjectMemberGuard = 'runtime-object-member-guard',
  /** TypeScript method-body access admitted by an owning template call operation. */
  MethodBodyHandoff = 'method-body-handoff',
  /** Callback or call boundary whose invocation count cannot be closed. */
  OpenInvocation = 'open-invocation',
  /** Control-flow construct whose execution bounds are not closed by the structured collector. */
  OpenControlFlow = 'open-control-flow',
}

/** Minimum executions of one access per reached owner-operation evaluation. */
export const enum RuntimeExpressionExecutionMinimum {
  /** Control flow permits the access to execute no times. */
  Zero = 'zero',
  /** The access executes at least once whenever the owner operation is reached. */
  One = 'one',
}

/** Maximum executions of one access per reached owner-operation evaluation. */
export const enum RuntimeExpressionExecutionMaximum {
  /** The access executes at most once per owner-operation evaluation. */
  One = 'one',
  /** A loop or callback operation may execute the access repeatedly. */
  Many = 'many',
}

/** Semantic completeness of the access-use projection, independent from query paging. */
export const enum RuntimeExpressionAccessCoverage {
  /** All accesses for the modeled operation are represented. */
  Complete = 'complete',
  /** Runtime-dependent behavior leaves the access set unclosed. */
  Open = 'open',
  /** A deliberate bounded expansion omitted additional candidate accesses. */
  Truncated = 'truncated',
}

/** One operation-local condition carried by an access use. */
export class RuntimeExpressionExecutionQualifier {
  constructor(
    readonly kind: RuntimeExpressionExecutionQualifierKind,
    /** Exact authored guard, optional segment, callback, loop, or call site when available. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Framework/ECMAScript operation name that closes or opens the boundary, when applicable. */
    readonly operationName: string | null = null,
  ) {}
}

/**
 * One source-backed access after syntax is paired with the exact Aurelia runtime operation that spends it.
 *
 * This is a static semantic operation use, not a live property subscription or the authority for every authored token.
 * Observation, diagnostics, and future AOT execution analysis project from this fact. IDE authoring features project
 * template targets from `RuntimeBindingExpressionAccessResolution`, including resolutions with no runtime use.
 */
export class RuntimeExpressionAccessUse {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly ownerKind: RuntimeExpressionAccessOwnerKind,
    readonly ownerProductHandle: ProductHandle,
    /** Existing product that owns the operation slot, or null when owner + kind + index are the exact identity. */
    readonly operationProductHandle: ProductHandle | null,
    readonly operationKind: RuntimeExpressionOperationKind,
    /** Zero-based interpolation or argument index when the operation has ordered siblings. */
    readonly operationIndex: number | null,
    /** Template expression parse whose AST supplied this access; null for TypeScript source operations. */
    readonly expressionProductHandle: ProductHandle | null,
    /** Runtime Scope product used for this access, when the operation is template-owned. */
    readonly scopeProductHandle: ProductHandle | null,
    /** Parse-owned authored occurrence spent by this use; null for generated and TypeScript-only operations. */
    readonly occurrenceHandle: HotDetailHandle | null,
    /** Binding-context resolution spent by this use; null for generated and non-template operations. */
    readonly resolutionHandle: HotDetailHandle | null,
    readonly origin: RuntimeExpressionAccessOrigin,
    readonly accessForm: RuntimeExpressionAccessForm,
    readonly role: RuntimeExpressionAccessRole,
    readonly phase: RuntimeExpressionAccessPhase,
    readonly tracking: RuntimeExpressionAccessTracking,
    readonly realization: RuntimeOperationRealization,
    readonly reachability: RuntimeOperationReachability,
    /**
     * Explicit ancestor argument used by Aurelia Scope lookup after parser lowering.
     * Unqualified names remain zero inside callbacks because lookup falls through by name.
     */
    readonly scopeLookupAncestor: number | null,
    /** Authored `$parent` count, with zero for an explicit `$this`; null when no qualifier was authored. */
    readonly authoredScopeAncestor: number | null,
    /** Lexical arrow-callback nesting at this occurrence, independent from lookup and authored qualification. */
    readonly callbackScopeDepth: number | null,
    /** Whether the access is rooted in an arrow-callback parameter rather than the runtime template Scope. */
    readonly lexicalLocal: boolean,
    readonly targetResolution: RuntimeExpressionAccessTargetResolution,
    /** Exact or governing targets; empty for missing/open resolution. */
    readonly targetLinks: readonly RuntimeExpressionAccessTargetLink[],
    readonly executionQualifiers: readonly RuntimeExpressionExecutionQualifier[],
    readonly minimumExecutions: RuntimeExpressionExecutionMinimum,
    readonly maximumExecutions: RuntimeExpressionExecutionMaximum,
    readonly coverage: RuntimeExpressionAccessCoverage,
    readonly coverageReason: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly nameSourceAddressHandle: AddressHandle | null,
  ) {}
}
