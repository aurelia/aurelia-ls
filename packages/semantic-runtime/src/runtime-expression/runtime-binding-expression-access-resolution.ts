import type {
  HotDetailHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type {
  RuntimeExpressionAccessTargetLink,
  RuntimeExpressionAccessTargetResolution,
} from './runtime-expression-access-use.js';
import type { TemplateExpressionAccessOccurrence } from './template-expression-access-occurrence.js';

/** Binding evaluation context in which an authored occurrence is interpreted. */
export const enum RuntimeBindingExpressionAccessContextKind {
  /** Binding source value, including one interpolation part. */
  SourceValue = 'source-value',
  /** Assignment back into the binding source. */
  SourceAssignment = 'source-assignment',
  /** Binding-behavior argument evaluated against the bind scope. */
  BindingBehaviorArgument = 'binding-behavior-argument',
  /** Value-converter argument evaluated against the source scope. */
  ValueConverterArgument = 'value-converter-argument',
  /** Repeat key expression evaluated while reconciling collection views. */
  RepeatKey = 'repeat-key',
  /** Repeat contextual expression evaluated while constructing child scope. */
  RepeatContextual = 'repeat-contextual',
}

/**
 * One authored occurrence interpreted against one rendered binding context.
 *
 * This is an authoring/type-resolution fact, not evidence that Aurelia executes an operation. Zero or more
 * `RuntimeExpressionAccessUse` products may spend it.
 */
export class RuntimeBindingExpressionAccessResolution {
  constructor(
    /** Store-local handle for this binding-owned hot detail. */
    readonly detailHandle: HotDetailHandle,
    /** Rendered runtime binding whose context interprets the occurrence. */
    readonly bindingProductHandle: ProductHandle,
    /** Stable identity of the rendered binding, retained because resolution/use publication precedes batch commit. */
    readonly bindingIdentityHandle: IdentityHandle,
    /** Parse-owned authored occurrence. */
    readonly occurrence: TemplateExpressionAccessOccurrence,
    /** Distinct evaluation lane; never flatten bind/source/assignment contexts. */
    readonly contextKind: RuntimeBindingExpressionAccessContextKind,
    /** Runtime Scope product used for target interpretation, when known. */
    readonly scopeProductHandle: ProductHandle | null,
    /** Parser-lowered runtime Scope ancestor depth. */
    readonly scopeLookupAncestor: number | null,
    /** Authored `$parent` depth, independently retained from parser lowering. */
    readonly authoredScopeAncestor: number | null,
    /** Arrow-callback nesting depth at this occurrence. */
    readonly callbackScopeDepth: number | null,
    /** Whether the occurrence resolves through an expression-local callback parameter. */
    readonly lexicalLocal: boolean,
    /** Closure of the checker/scope target. */
    readonly targetResolution: RuntimeExpressionAccessTargetResolution,
    /** Exact or governing target links. */
    readonly targetLinks: readonly RuntimeExpressionAccessTargetLink[],
  ) {}

  get expressionProductHandle(): ProductHandle {
    return this.occurrence.expressionProductHandle;
  }

  get sourceAddressHandle() {
    return this.occurrence.sourceAddressHandle;
  }

  get nameSourceAddressHandle() {
    return this.occurrence.nameSourceAddressHandle;
  }
}
