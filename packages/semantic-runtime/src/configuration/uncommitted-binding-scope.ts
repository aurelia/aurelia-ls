import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStoreReadView } from '../kernel/store.js';
import {
  BindingContext,
  BindingContextKind,
  type BindingContextSlot,
  BindingScope,
  BindingScopeOwnerKind,
  OverrideContext,
  type BindingScopeCreator,
} from './scope.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';

export interface UncommittedScopeCreateRequest {
  readonly localKey: string;
  readonly bindingContextType: CheckerTypeReference | null;
  readonly bindingContextSlots?: readonly BindingContextSlot[];
  readonly sourceAddressHandle?: AddressHandle | null;
}

export interface UncommittedScopeFromParentRequest {
  readonly localKey: string;
  readonly parent: BindingScope;
  readonly bindingContextSlots: readonly BindingContextSlot[];
  readonly bindingContextType?: CheckerTypeReference | null;
  readonly sourceAddressHandle?: AddressHandle | null;
  readonly ownerKind?: BindingScopeOwnerKind;
  readonly isBoundary?: boolean;
  readonly scopeCreators?: readonly BindingScopeCreator[];
}

/** Models framework `Scope.create(context)` when a speculative consumer needs root-object lookup semantics only. */
export function uncommittedScopeCreate(
  store: KernelStoreReadView,
  request: UncommittedScopeCreateRequest,
): BindingScope {
  return uncommittedBindingScope(store, {
    localKey: `uncommitted-scope-create:${request.localKey}`,
    parent: null,
    bindingContextSlots: request.bindingContextSlots ?? [],
    bindingContextType: request.bindingContextType,
    bindingContextKind: BindingContextKind.Object,
    sourceAddressHandle: request.sourceAddressHandle ?? null,
    ownerKind: BindingScopeOwnerKind.SyntheticView,
    isBoundary: false,
    scopeCreators: [],
  });
}

/** Models framework `Scope.fromParent(parent, context)` when a speculative consumer needs lookup semantics only. */
export function uncommittedScopeFromParent(
  store: KernelStoreReadView,
  request: UncommittedScopeFromParentRequest,
): BindingScope {
  return uncommittedBindingScope(store, {
    localKey: `uncommitted-scope-from-parent:${request.localKey}`,
    parent: request.parent,
    bindingContextSlots: request.bindingContextSlots,
    bindingContextType: request.bindingContextType ?? null,
    bindingContextKind: BindingContextKind.Synthetic,
    sourceAddressHandle: request.sourceAddressHandle ?? null,
    ownerKind: request.ownerKind ?? BindingScopeOwnerKind.SyntheticView,
    isBoundary: request.isBoundary ?? false,
    scopeCreators: request.scopeCreators ?? [],
  });
}

function uncommittedBindingScope(
  store: KernelStoreReadView,
  request: {
    readonly localKey: string;
    readonly parent: BindingScope | null;
    readonly bindingContextSlots: readonly BindingContextSlot[];
    readonly bindingContextType: CheckerTypeReference | null;
    readonly bindingContextKind: BindingContextKind.Object | BindingContextKind.Synthetic;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly ownerKind: BindingScopeOwnerKind;
    readonly isBoundary: boolean;
    readonly scopeCreators: readonly BindingScopeCreator[];
  },
): BindingScope {
  const localKey = request.localKey;
  const scopeProductHandle = store.handles.product(`${localKey}:scope`);
  const bindingContext = new BindingContext(
    store.handles.product(`${localKey}:binding-context`),
    store.handles.identity(`${localKey}:binding-context`),
    request.bindingContextKind,
    null,
    request.bindingContextType,
    request.bindingContextSlots,
    request.sourceAddressHandle,
  );
  const overrideContext = new OverrideContext(
    store.handles.product(`${localKey}:override-context`),
    store.handles.identity(`${localKey}:override-context`),
    scopeProductHandle,
    null,
    [],
    request.sourceAddressHandle,
  );
  return new BindingScope(
    scopeProductHandle,
    store.handles.identity(`${localKey}:scope`),
    request.parent,
    bindingContext,
    overrideContext,
    request.isBoundary,
    request.ownerKind,
    request.sourceAddressHandle,
    [],
    request.scopeCreators,
  );
}
