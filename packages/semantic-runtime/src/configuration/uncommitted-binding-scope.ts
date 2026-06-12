import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  BindingContext,
  BindingContextKind,
  BindingContextSlot,
  BindingScope,
  BindingScopeOwnerKind,
  OverrideContext,
  type BindingScopeCreator,
} from './scope.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';

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

/** Models framework `Scope.fromParent(parent, context)` when a speculative consumer needs lookup semantics only. */
export function uncommittedScopeFromParent(
  store: KernelStore,
  request: UncommittedScopeFromParentRequest,
): BindingScope {
  const localKey = `uncommitted-scope-from-parent:${request.localKey}`;
  const sourceAddressHandle = request.sourceAddressHandle ?? null;
  const scopeProductHandle = store.handles.product(`${localKey}:scope`);
  const bindingContext = new BindingContext(
    store.handles.product(`${localKey}:binding-context`),
    store.handles.identity(`${localKey}:binding-context`),
    BindingContextKind.Object,
    null,
    request.bindingContextType ?? null,
    request.bindingContextSlots,
    sourceAddressHandle,
  );
  const overrideContext = new OverrideContext(
    store.handles.product(`${localKey}:override-context`),
    store.handles.identity(`${localKey}:override-context`),
    scopeProductHandle,
    null,
    [],
    sourceAddressHandle,
  );
  return new BindingScope(
    scopeProductHandle,
    store.handles.identity(`${localKey}:scope`),
    request.parent,
    bindingContext,
    overrideContext,
    request.isBoundary ?? false,
    request.ownerKind ?? BindingScopeOwnerKind.SyntheticView,
    sourceAddressHandle,
    [],
    request.scopeCreators ?? [],
  );
}
