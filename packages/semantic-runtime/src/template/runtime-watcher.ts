import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { RuntimeWatcherObservedDependency } from '../observation/runtime-watcher-observation.js';
import type {
  WatchCallbackDefinition,
  WatchExpressionDefinition,
  WatchFlushMode,
} from '../resources/watch-definition.js';

export const enum RuntimeWatcherKind {
  Computed = 'computed',
  Expression = 'expression',
}

export const enum RuntimeWatcherDependencyEvaluationKind {
  ProxyObservable = 'proxy-observable',
  AstEvaluate = 'ast-evaluate',
}

export type RuntimeWatcherField =
  | 'controller'
  | 'definition'
  | 'watch'
  | 'expression'
  | 'callback'
  | 'flush'
  | 'source';

export class RuntimeWatcherReference {
  constructor(
    readonly watcherKind: RuntimeWatcherKind,
    readonly productHandle: ProductHandle | null,
    readonly identityHandle: IdentityHandle | null,
    readonly addressHandle: AddressHandle | null,
  ) {}
}

class RuntimeWatcherBase {
  constructor(
    readonly watcherKind: RuntimeWatcherKind,
    readonly dependencyEvaluationKind: RuntimeWatcherDependencyEvaluationKind,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly controllerProductHandle: ProductHandle,
    readonly controllerIdentityHandle: IdentityHandle,
    readonly definitionProductHandle: ProductHandle | null,
    readonly watchIndex: number,
    readonly expression: WatchExpressionDefinition,
    readonly callback: WatchCallbackDefinition,
    readonly flush: WatchFlushMode,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly observedDependencies: readonly RuntimeWatcherObservedDependency[] = [],
    readonly fieldProvenance: readonly FieldProvenance<RuntimeWatcherField>[] = [],
  ) {}

  toReference(): RuntimeWatcherReference {
    return new RuntimeWatcherReference(
      this.watcherKind,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

@auLink('runtime-html:ComputedWatcher')
export class ComputedWatcher extends RuntimeWatcherBase {
  constructor(
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    controllerProductHandle: ProductHandle,
    controllerIdentityHandle: IdentityHandle,
    definitionProductHandle: ProductHandle | null,
    watchIndex: number,
    expression: WatchExpressionDefinition,
    callback: WatchCallbackDefinition,
    flush: WatchFlushMode,
    sourceAddressHandle: AddressHandle | null,
    observedDependencies: readonly RuntimeWatcherObservedDependency[] = [],
    fieldProvenance: readonly FieldProvenance<RuntimeWatcherField>[] = [],
  ) {
    super(
      RuntimeWatcherKind.Computed,
      RuntimeWatcherDependencyEvaluationKind.ProxyObservable,
      productHandle,
      identityHandle,
      controllerProductHandle,
      controllerIdentityHandle,
      definitionProductHandle,
      watchIndex,
      expression,
      callback,
      flush,
      sourceAddressHandle,
      observedDependencies,
      fieldProvenance,
    );
  }
}

@auLink('runtime-html:ExpressionWatcher')
export class ExpressionWatcher extends RuntimeWatcherBase {
  constructor(
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    controllerProductHandle: ProductHandle,
    controllerIdentityHandle: IdentityHandle,
    definitionProductHandle: ProductHandle | null,
    watchIndex: number,
    expression: WatchExpressionDefinition,
    callback: WatchCallbackDefinition,
    flush: WatchFlushMode,
    sourceAddressHandle: AddressHandle | null,
    observedDependencies: readonly RuntimeWatcherObservedDependency[] = [],
    fieldProvenance: readonly FieldProvenance<RuntimeWatcherField>[] = [],
  ) {
    super(
      RuntimeWatcherKind.Expression,
      RuntimeWatcherDependencyEvaluationKind.AstEvaluate,
      productHandle,
      identityHandle,
      controllerProductHandle,
      controllerIdentityHandle,
      definitionProductHandle,
      watchIndex,
      expression,
      callback,
      flush,
      sourceAddressHandle,
      observedDependencies,
      fieldProvenance,
    );
  }
}

export type RuntimeWatcher =
  | ComputedWatcher
  | ExpressionWatcher;
