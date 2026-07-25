import type { BindingBehaviorExpression } from '../expression/ast.js';
import {
  BindingScope,
  BindingScopeCreator,
} from '../configuration/scope.js';
import {
  BindingScopeMaterializer,
  type BindingScopeConstructionEmission,
} from '../configuration/scope-materializer.js';
import type { AddressHandle, IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type { KernelSourceFileReadView } from '../kernel/store.js';
import type { CheckerTypeProjector } from '../type-system/checker-projector.js';
import { localKeyPart } from '../kernel/local-key.js';
import { BuiltInBindingBehaviorName } from '../resources/built-in-resources.js';
import { staticStringLiteralExpression } from '../template/expression-resource-occurrence.js';
import type { StateStoreConfiguration } from './model.js';
import type { StateStoreVisibilitySelection } from './state-store-visibility.js';
import {
  configuredStateStoreForName,
  stateStoreDisplayName,
} from './state-store-identity.js';

export const STATE_BINDING_BEHAVIOR_NAME = BuiltInBindingBehaviorName.State;

export class StateBindingScopeProjection {
  constructor(
    /** State-aware Scope to use for the inner binding expression, when it closed. */
    readonly scope: BindingScope | null,
    /** Configured state store that supplied the binding context type. */
    readonly store: StateStoreConfiguration | null,
    /** Explanation for unresolved store-name or state-type handoff. */
    readonly openReason: string | null,
    /** Prepared Scope/BindingContext/OverrideContext emission for callers that own publication. */
    readonly emission: BindingScopeConstructionEmission | null = null,
  ) {}
}

/**
 * Projects @aurelia/state `createStateBindingScope(state, scope)` into the TypeChecker-backed Scope model.
 *
 * Framework grounding: `StateBindingBehavior.bind(...)` evaluates ordinary bindings against
 * `createStateBindingScope(store.getState(), scope)`, whose new Scope is a boundary and whose parent is the original
 * template scope. The semantic runtime substitutes the configured initial-state type for `store.getState()`.
 */
export class StateBindingScopeProjector {
  private readonly scopeMaterializer: BindingScopeMaterializer;

  constructor(
    readonly kernel: KernelSourceFileReadView,
    readonly storeSelection: StateStoreVisibilitySelection,
    readonly projector: CheckerTypeProjector,
  ) {
    this.scopeMaterializer = new BindingScopeMaterializer(kernel, projector);
  }

  scopeForBindingBehavior(
    expression: BindingBehaviorExpression,
    parent: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): StateBindingScopeProjection {
    return this.scopeForStoreName(
      stateStoreNameForBindingBehavior(expression),
      parent,
      [
        localKey,
        'state-binding-scope',
        expression.span.start,
        expression.span.end,
      ].join(':'),
      sourceAddressHandle,
    );
  }

  scopeForStoreName(
    storeName: string | null | undefined,
    parent: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    ownerProductHandle: ProductHandle | null = null,
    ownerIdentityHandle: IdentityHandle | null = null,
    scopeCreators: readonly BindingScopeCreator[] = [],
  ): StateBindingScopeProjection {
    if (storeName === undefined) {
      return new StateBindingScopeProjection(
        null,
        null,
        'The state binding behavior uses a dynamic store argument; semantic-runtime cannot choose a store state type yet.',
      );
    }
    const configuredStore = configuredStateStoreForName(this.storeSelection.stores, storeName);
    if (configuredStore == null) {
      return new StateBindingScopeProjection(
        null,
        null,
        this.storeSelection.openReason
          ?? `The state binding behavior references store "${stateStoreDisplayName(storeName)}", but no configured store is visible to expression evaluation.`,
      );
    }
    if (configuredStore.initialStateType == null) {
      return new StateBindingScopeProjection(
        null,
        configuredStore,
        `Configured store "${stateStoreDisplayName(configuredStore.name)}" does not carry a projected initial-state type.`,
      );
    }
    const emission = this.scopeMaterializer.prepare(BindingScope.fromStateBindingScope({
      localKey: [
        localKey,
        localKeyPart(stateStoreDisplayName(configuredStore.name)),
      ].join(':'),
      ownerProductHandle: ownerProductHandle ?? configuredStore.productHandle,
      ownerIdentityHandle: ownerIdentityHandle ?? configuredStore.identityHandle,
      parent,
      stateType: configuredStore.initialStateType,
      sourceAddressHandle,
      scopeCreators,
    }));
    return new StateBindingScopeProjection(emission.scope, configuredStore, null, emission);
  }
}

/**
 * A missing argument means the default store. A static string argument means a named store. Any other expression is
 * intentionally left undefined because the framework evaluates that argument at bind time.
 */
function stateStoreNameForBindingBehavior(
  expression: BindingBehaviorExpression,
): string | null | undefined {
  const firstArgument = expression.args[0] ?? null;
  if (firstArgument == null) {
    return null;
  }
  return staticStringLiteralExpression(firstArgument) ?? undefined;
}
