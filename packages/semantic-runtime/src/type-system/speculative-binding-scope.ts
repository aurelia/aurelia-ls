import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  BindingContext,
  BindingContextSlotDraft,
  BindingScope,
  BindingScopeOwnerKind,
  OverrideContext,
  mergeBindingContextSlotDrafts,
  type BindingContextSlot,
} from '../configuration/scope.js';

export interface SpeculativeBindingScopeOverlayRequest {
  readonly localKey: string;
  readonly base: BindingScope;
  readonly bindingContextSlots?: readonly BindingContextSlotDraft[];
  readonly overrideContextSlots?: readonly BindingContextSlotDraft[];
  readonly sourceAddressHandle: AddressHandle | null;
}

interface SpeculativeBindingScopeOverlayHandles {
  readonly scopeProductHandle: ProductHandle;
  readonly scopeIdentityHandle: IdentityHandle;
  readonly bindingContextProductHandle: ProductHandle;
  readonly bindingContextIdentityHandle: IdentityHandle;
  readonly overrideContextProductHandle: ProductHandle;
  readonly overrideContextIdentityHandle: IdentityHandle;
}

/**
 * Create an uncommitted same-level Scope overlay for TypeChecker speculation.
 *
 * Template-controller scope materialization publishes durable narrowed Scope products. Expression-local constructs such
 * as conditional branches and short-circuit right operands only need the lookup semantics, so they mint traceable
 * handles without committing framework products into the kernel store.
 */
export function speculativeBindingScopeOverlay(
  store: KernelStore,
  request: SpeculativeBindingScopeOverlayRequest,
): BindingScope {
  const handles = speculativeBindingScopeOverlayHandles(store, request.localKey);
  const sourceAddressHandle = request.sourceAddressHandle ?? request.base.sourceAddressHandle;
  const bindingContext = speculativeBindingContextOverlay(request, handles, sourceAddressHandle);
  const overrideContext = speculativeOverrideContextOverlay(request, handles, sourceAddressHandle);
  return new BindingScope(
    handles.scopeProductHandle,
    handles.scopeIdentityHandle,
    request.base.parent,
    bindingContext,
    overrideContext,
    request.base.isBoundary,
    BindingScopeOwnerKind.SyntheticView,
    sourceAddressHandle,
    request.base.fieldProvenance,
    request.base.scopeCreators,
  );
}

function speculativeBindingScopeOverlayHandles(
  store: KernelStore,
  localKey: string,
): SpeculativeBindingScopeOverlayHandles {
  return {
    scopeProductHandle: store.handles.product(`speculative-binding-scope:${localKey}`),
    scopeIdentityHandle: store.handles.identity(`speculative-binding-scope:${localKey}`),
    bindingContextProductHandle: store.handles.product(`speculative-binding-context:${localKey}`),
    bindingContextIdentityHandle: store.handles.identity(`speculative-binding-context:${localKey}`),
    overrideContextProductHandle: store.handles.product(`speculative-override-context:${localKey}`),
    overrideContextIdentityHandle: store.handles.identity(`speculative-override-context:${localKey}`),
  };
}

function speculativeBindingContextOverlay(
  request: SpeculativeBindingScopeOverlayRequest,
  handles: SpeculativeBindingScopeOverlayHandles,
  sourceAddressHandle: AddressHandle | null,
): BindingContext {
  return new BindingContext(
    handles.bindingContextProductHandle,
    handles.bindingContextIdentityHandle,
    request.base.bindingContext.contextKind,
    request.base.bindingContext.ownerProductHandle,
    request.base.bindingContext.contextType,
    mergedSlots(request.base.bindingContext.slots, request.bindingContextSlots),
    sourceAddressHandle,
    request.base.bindingContext.fieldProvenance,
  );
}

function speculativeOverrideContextOverlay(
  request: SpeculativeBindingScopeOverlayRequest,
  handles: SpeculativeBindingScopeOverlayHandles,
  sourceAddressHandle: AddressHandle | null,
): OverrideContext {
  return new OverrideContext(
    handles.overrideContextProductHandle,
    handles.overrideContextIdentityHandle,
    handles.scopeProductHandle,
    request.base.overrideContext.contextType,
    mergedSlots(request.base.overrideContext.slots, request.overrideContextSlots),
    sourceAddressHandle,
    request.base.overrideContext.fieldProvenance,
  );
}

function mergedSlots(
  base: readonly BindingContextSlot[],
  overrides: readonly BindingContextSlotDraft[] | undefined,
): readonly BindingContextSlot[] {
  return mergeBindingContextSlotDrafts(
    base.map((slot) => BindingContextSlotDraft.fromSlot(slot)),
    overrides ?? [],
  ).map((slot) => slot.toSlot());
}
