import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { EvaluationValue } from '../evaluation/values.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';

export const enum BindingContextKind {
  ViewModel = 'view-model',
  Synthetic = 'synthetic',
  Override = 'override',
  Object = 'object',
}

export const enum BindingScopeOwnerKind {
  CustomElementController = 'custom-element-controller',
  CustomAttributeController = 'custom-attribute-controller',
  SyntheticView = 'synthetic-view',
  LetElement = 'let-element',
  RepeatedItem = 'repeated-item',
  StateBinding = 'state-binding',
}

export const enum BindingScopeLookupKind {
  BindingContext = 'binding-context',
  OverrideContext = 'override-context',
  FallbackBindingContext = 'fallback-binding-context',
  MissingAncestor = 'missing-ancestor',
}

export type BindingContextField =
  | 'contextKind'
  | 'owner'
  | 'contextType'
  | 'slots'
  | 'source';

export type BindingScopeField =
  | 'parent'
  | 'bindingContext'
  | 'overrideContext'
  | 'isBoundary'
  | 'source';

export type BindingContextSlotField =
  | 'name'
  | 'target'
  | 'targetType'
  | 'source';

/** Type refinement for a member of a runtime-created scope slot. */
export class BindingContextSlotMemberType {
  constructor(
    /** Member name reached from the slot value. */
    readonly name: string,
    /** Static type that framework/template semantics project for this member. */
    readonly targetType: CheckerTypeReference,
    /** Source address for the binding site that introduced the refinement. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Reference to a runtime binding context or override context without expanding all known names. */
export class BindingContextReference {
  constructor(
    /** Product handle for the context product, when materialized. */
    readonly productHandle: ProductHandle | null,
    /** Identity for the context, when identity has closed. */
    readonly identityHandle: IdentityHandle | null,
    /** Context lane used by lookup explanation. */
    readonly contextKind: BindingContextKind,
    /** Static type of the context object itself, if known through the TypeChecker substrate. */
    readonly contextType: CheckerTypeReference | null,
    /** Source address for the context owner, binding declaration, or source object. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Trace label while the context is still open. */
    readonly localName: string | null,
  ) {}
}

/** Reference to a runtime Scope product without recursively expanding parent and context chains. */
export class BindingScopeReference {
  constructor(
    /** Product handle for the materialized Scope product, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Identity for the modeled Scope. */
    readonly identityHandle: IdentityHandle | null,
    /** Runtime owner lane that created or adopted this Scope. */
    readonly ownerKind: BindingScopeOwnerKind,
    /** Source address for the scope owner, activation, or template boundary. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Trace label while the scope is still open. */
    readonly localName: string | null,
  ) {}
}

/** One known name in a binding or override context. */
export class BindingContextSlot {
  readonly kind = 'binding-context-slot' as const;

  constructor(
    /** Runtime property key as authored or inferred. */
    readonly name: string,
    /** Identity reached by this name, if known. */
    readonly targetIdentityHandle: IdentityHandle | null,
    /** Product reached by this name, if known. */
    readonly targetProductHandle: ProductHandle | null,
    /** Static type reached by this name, if known through the TypeChecker substrate. */
    readonly targetType: CheckerTypeReference | null,
    /** Source address for the property, bindable, let declaration, repeat local, or inferred slot. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for mixed-source scope entries. */
    readonly fieldProvenance: readonly FieldProvenance<BindingContextSlotField>[] = [],
    /** Evaluator-local value carried by runtime-created slots such as repeat locals, when statically knowable. */
    readonly staticValue: EvaluationValue | null = null,
    /** Member-level type refinements supplied by framework/template semantics. */
    readonly memberTypes: readonly BindingContextSlotMemberType[] = [],
  ) {}
}

export type RuntimeBindingContextKind =
  | BindingContextKind.ViewModel
  | BindingContextKind.Synthetic
  | BindingContextKind.Object;

/** Draft for one slot in a runtime BindingContext or IOverrideContext model. */
export class BindingContextSlotDraft {
  constructor(
    /** Runtime property key as authored or inferred. */
    readonly name: string,
    /** Identity reached by this name, if known. */
    readonly targetIdentityHandle: IdentityHandle | null = null,
    /** Product reached by this name, if known. */
    readonly targetProductHandle: ProductHandle | null = null,
    /** Static type reached by this name, if known through the TypeChecker substrate. */
    readonly targetType: CheckerTypeReference | null = null,
    /** Source address for the property, bindable, let declaration, repeat local, or inferred slot. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Field-level provenance for mixed-source scope entries. */
    readonly fieldProvenance: readonly FieldProvenance<BindingContextSlotField>[] = [],
    /** Evaluator-local value carried by runtime-created slots such as repeat locals, when statically knowable. */
    readonly staticValue: EvaluationValue | null = null,
    /** Member-level type refinements supplied by framework/template semantics. */
    readonly memberTypes: readonly BindingContextSlotMemberType[] = [],
  ) {}

  static fromSlot(slot: BindingContextSlot): BindingContextSlotDraft {
    return new BindingContextSlotDraft(
      slot.name,
      slot.targetIdentityHandle,
      slot.targetProductHandle,
      slot.targetType,
      slot.sourceAddressHandle,
      slot.fieldProvenance,
      slot.staticValue,
      slot.memberTypes,
    );
  }

  toSlot(): BindingContextSlot {
    return new BindingContextSlot(
      this.name,
      this.targetIdentityHandle,
      this.targetProductHandle,
      this.targetType,
      this.sourceAddressHandle,
      this.fieldProvenance,
      this.staticValue,
      this.memberTypes,
    );
  }
}

/** Runtime Scope construction request before kernel handles for the Scope/context trio are minted. */
export class BindingScopeConstructionRequest {
  constructor(
    /** Store-local key for the binding scope being materialized. */
    readonly localKey: string,
    /** Runtime owner lane that created or adopted this Scope. */
    readonly ownerKind: BindingScopeOwnerKind,
    /** Product that owns the scope, usually a controller or synthetic view, when already materialized. */
    readonly ownerProductHandle: ProductHandle | null,
    /** Identity that owns the scope, when already materialized. */
    readonly ownerIdentityHandle: IdentityHandle | null,
    /** Parent scope used by runtime Scope lookup. */
    readonly parent: BindingScope | null,
    /** Binding-context lane for normal name lookup. */
    readonly bindingContextKind: RuntimeBindingContextKind,
    /** Static type of the binding context object itself, if known through the TypeChecker substrate. */
    readonly bindingContextType: CheckerTypeReference | null = null,
    /** Names visible through the binding context. */
    readonly bindingContextSlots: readonly BindingContextSlotDraft[] = [],
    /** Static type of the override context object itself, if known through the TypeChecker substrate. */
    readonly overrideContextType: CheckerTypeReference | null = null,
    /** Names visible through the override context. */
    readonly overrideContextSlots: readonly BindingContextSlotDraft[] = [],
    /** Boundary flag that stops ordinary upward Scope lookup. */
    readonly isBoundary: boolean = false,
    /** Source address for the scope owner, activation, or template boundary. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Runtime binding scope effects that directly caused this Scope to be created. */
    readonly scopeEffectOwnerProductHandles: readonly ProductHandle[] = [],
  ) {}
}

/** Runtime BindingContext model for synthetic contexts and view-model binding contexts. */
@auLink('runtime:BindingContext')
export class BindingContext {
  constructor(
    /** Product handle for the binding context product. */
    readonly productHandle: ProductHandle,
    /** Identity for this modeled binding context. */
    readonly identityHandle: IdentityHandle,
    /** Runtime binding-context lane. */
    readonly contextKind: BindingContextKind.ViewModel
      | BindingContextKind.Synthetic
      | BindingContextKind.Object,
    /** Product that owns the context, usually a controller, resource, or generated template context. */
    readonly ownerProductHandle: ProductHandle | null,
    /** Static type of the context object itself, if known through the TypeChecker substrate. */
    readonly contextType: CheckerTypeReference | null,
    /** Names visible on this binding context. */
    readonly slots: readonly BindingContextSlot[],
    /** Source address for the owning view-model, synthetic context, or object literal. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for context construction. */
    readonly fieldProvenance: readonly FieldProvenance<BindingContextField>[] = [],
  ) {}

  lookup(name: string): BindingContextSlot | null {
    return this.slots.find((slot) => slot.name === name) ?? null;
  }

  toReference(): BindingContextReference {
    return new BindingContextReference(
      this.productHandle,
      this.identityHandle,
      this.contextKind,
      this.contextType,
      this.sourceAddressHandle,
      null,
    );
  }
}

/** Runtime IOverrideContext model for template locals, repeat metadata, and other override names. */
@auLink('runtime:IOverrideContext')
export class OverrideContext {
  readonly contextKind = BindingContextKind.Override;

  constructor(
    /** Product handle for the override context product. */
    readonly productHandle: ProductHandle,
    /** Identity for this modeled override context. */
    readonly identityHandle: IdentityHandle,
    /** Product that owns the context, usually a Scope or synthetic view. */
    readonly ownerProductHandle: ProductHandle | null,
    /** Static type of the override context object itself, if known through the TypeChecker substrate. */
    readonly contextType: CheckerTypeReference | null,
    /** Names visible on this override context. */
    readonly slots: readonly BindingContextSlot[],
    /** Source address for the local declaration, repeat boundary, or synthetic context. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for context construction. */
    readonly fieldProvenance: readonly FieldProvenance<BindingContextField>[] = [],
  ) {}

  lookup(name: string): BindingContextSlot | null {
    return this.slots.find((slot) => slot.name === name) ?? null;
  }

  toReference(): BindingContextReference {
    return new BindingContextReference(
      this.productHandle,
      this.identityHandle,
      this.contextKind,
      this.contextType,
      this.sourceAddressHandle,
      null,
    );
  }
}

export type BindingScopeContext =
  | BindingContext
  | OverrideContext;

/** Result of applying the runtime Scope.getContext lookup rule to modeled scope contexts. */
export class BindingScopeLookup {
  constructor(
    /** Lookup lane selected by the runtime Scope rule. */
    readonly lookupKind: BindingScopeLookupKind,
    /** Scope where lookup stopped, if one was reachable. */
    readonly scope: BindingScopeReference | null,
    /** Context selected by lookup, if known. */
    readonly context: BindingContextReference | null,
    /** Slot that matched the requested name. Null means fallback context or missing ancestor. */
    readonly slot: BindingContextSlot | null,
  ) {}
}

/** Concrete runtime Scope lookup result for materializers that need the resolved modeled context, not only references. */
export class BindingScopeLocatedLookup {
  constructor(
    /** Lookup lane selected by the runtime Scope rule. */
    readonly lookupKind: BindingScopeLookupKind,
    /** Scope where lookup stopped, if one was reachable. */
    readonly scope: BindingScope | null,
    /** Context selected by lookup, if known. */
    readonly context: BindingScopeContext | null,
    /** Slot that matched the requested name. Null means fallback context, `$this`, or missing ancestor. */
    readonly slot: BindingContextSlot | null,
  ) {}

  toLookup(): BindingScopeLookup {
    return new BindingScopeLookup(
      this.lookupKind,
      this.scope?.toReference() ?? null,
      this.context?.toReference() ?? null,
      this.slot,
    );
  }
}

/** Runtime Scope model used by controllers and binding expression resolution. */
@auLink('runtime:Scope')
export class BindingScope {
  constructor(
    /** Product handle for the materialized Scope product. */
    readonly productHandle: ProductHandle,
    /** Identity for this modeled Scope. */
    readonly identityHandle: IdentityHandle,
    /** Parent scope used by `$parent` and ordinary lexical fallback. */
    readonly parent: BindingScope | null,
    /** Binding context used for normal view-model/property lookup. */
    readonly bindingContext: BindingContext,
    /** Override context used for template locals and contextual names. */
    readonly overrideContext: OverrideContext,
    /** Runtime boundary flag that stops ordinary upward lookup. */
    readonly isBoundary: boolean,
    /** Runtime owner lane that created or adopted this Scope. */
    readonly ownerKind: BindingScopeOwnerKind,
    /** Source address for the scope owner, activation, or template boundary. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for scope construction. */
    readonly fieldProvenance: readonly FieldProvenance<BindingScopeField>[] = [],
  ) {}

  /** Runtime `Scope.fromParent` shape for repeat-item contexts. */
  static fromRepeatedItem(input: {
    readonly localKey: string;
    readonly ownerProductHandle: ProductHandle | null;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly parent: BindingScope;
    readonly localSlots: readonly BindingContextSlotDraft[];
    readonly overrideSlots: readonly BindingContextSlotDraft[];
    readonly sourceAddressHandle: AddressHandle | null;
    readonly scopeEffectOwnerProductHandles?: readonly ProductHandle[];
  }): BindingScopeConstructionRequest {
    return new BindingScopeConstructionRequest(
      input.localKey,
      BindingScopeOwnerKind.RepeatedItem,
      input.ownerProductHandle,
      input.ownerIdentityHandle,
      input.parent,
      BindingContextKind.Object,
      null,
      input.localSlots,
      null,
      input.overrideSlots,
      false,
      input.sourceAddressHandle,
      input.scopeEffectOwnerProductHandles ?? [],
    );
  }

  /** Runtime `Scope.fromParent(parentScope, value)` shape for object-backed synthetic views such as `with.bind`. */
  static fromParentObject(input: {
    readonly localKey: string;
    readonly ownerProductHandle: ProductHandle | null;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly parent: BindingScope;
    readonly contextType: CheckerTypeReference | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly scopeEffectOwnerProductHandles?: readonly ProductHandle[];
  }): BindingScopeConstructionRequest {
    return new BindingScopeConstructionRequest(
      input.localKey,
      BindingScopeOwnerKind.SyntheticView,
      input.ownerProductHandle,
      input.ownerIdentityHandle,
      input.parent,
      BindingContextKind.Object,
      input.contextType,
      [],
      null,
      [],
      false,
      input.sourceAddressHandle,
      input.scopeEffectOwnerProductHandles ?? [],
    );
  }

  /** Runtime `createStateBindingScope(state, scope)` shape used by @aurelia/state binding behavior. */
  static fromStateBindingScope(input: {
    readonly localKey: string;
    readonly ownerProductHandle: ProductHandle | null;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly parent: BindingScope;
    readonly stateType: CheckerTypeReference | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly scopeEffectOwnerProductHandles?: readonly ProductHandle[];
  }): BindingScopeConstructionRequest {
    return new BindingScopeConstructionRequest(
      input.localKey,
      BindingScopeOwnerKind.StateBinding,
      input.ownerProductHandle,
      input.ownerIdentityHandle,
      input.parent,
      BindingContextKind.Object,
      input.stateType,
      [],
      null,
      [],
      true,
      input.sourceAddressHandle,
      input.scopeEffectOwnerProductHandles ?? [],
    );
  }

  /** Speculative same-level scope overlay for branch-local type narrowing such as `if.bind`. */
  static fromNarrowedBindingScope(input: {
    readonly localKey: string;
    readonly ownerProductHandle: ProductHandle | null;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly base: BindingScope;
    readonly bindingContextSlots?: readonly BindingContextSlotDraft[];
    readonly overrideContextSlots?: readonly BindingContextSlotDraft[];
    readonly sourceAddressHandle: AddressHandle | null;
    readonly scopeEffectOwnerProductHandles?: readonly ProductHandle[];
  }): BindingScopeConstructionRequest {
    return new BindingScopeConstructionRequest(
      input.localKey,
      BindingScopeOwnerKind.SyntheticView,
      input.ownerProductHandle,
      input.ownerIdentityHandle,
      input.base.parent,
      input.base.bindingContext.contextKind,
      input.base.bindingContext.contextType,
      mergeBindingContextSlotDrafts(
        input.base.bindingContext.slots.map((slot) => BindingContextSlotDraft.fromSlot(slot)),
        input.bindingContextSlots ?? [],
      ),
      input.base.overrideContext.contextType,
      mergeBindingContextSlotDrafts(
        input.base.overrideContext.slots.map((slot) => BindingContextSlotDraft.fromSlot(slot)),
        input.overrideContextSlots ?? [],
      ),
      input.base.isBoundary,
      input.sourceAddressHandle,
      input.scopeEffectOwnerProductHandles ?? [],
    );
  }

  /** Runtime `Scope.fromParent` shape for `let`-introduced context and override-context slots. */
  static fromLetBindings(input: {
    readonly localKey: string;
    readonly ownerProductHandle: ProductHandle | null;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly parent: BindingScope;
    readonly bindingContextSlots: readonly BindingContextSlotDraft[];
    readonly overrideContextSlots: readonly BindingContextSlotDraft[];
    readonly sourceAddressHandle: AddressHandle | null;
    readonly scopeEffectOwnerProductHandles?: readonly ProductHandle[];
  }): BindingScopeConstructionRequest {
    return new BindingScopeConstructionRequest(
      input.localKey,
      BindingScopeOwnerKind.LetElement,
      input.ownerProductHandle,
      input.ownerIdentityHandle,
      input.parent,
      input.parent.bindingContext.contextKind,
      input.parent.bindingContext.contextType,
      [
        ...input.parent.bindingContext.slots.map((slot) => BindingContextSlotDraft.fromSlot(slot)),
        ...input.bindingContextSlots,
      ],
      input.parent.overrideContext.contextType,
      [
        ...input.parent.overrideContext.slots.map((slot) => BindingContextSlotDraft.fromSlot(slot)),
        ...input.overrideContextSlots,
      ],
      input.parent.isBoundary,
      input.sourceAddressHandle,
      input.scopeEffectOwnerProductHandles ?? [],
    );
  }

  lookup(name: string, ancestor: number = 0): BindingScopeLookup {
    return this.locate(name, ancestor).toLookup();
  }

  locate(name: string, ancestor: number = 0): BindingScopeLocatedLookup {
    let current: BindingScope | null = this;

    if (ancestor > 0) {
      while (ancestor > 0 && current != null) {
        ancestor--;
        current = current.parent;
      }

      if (current == null) {
        return new BindingScopeLocatedLookup(BindingScopeLookupKind.MissingAncestor, null, null, null);
      }

      const overrideSlot = current.overrideContext.lookup(name);
      if (overrideSlot != null) {
        return new BindingScopeLocatedLookup(
          BindingScopeLookupKind.OverrideContext,
          current,
          current.overrideContext,
          overrideSlot,
        );
      }

      return new BindingScopeLocatedLookup(
        BindingScopeLookupKind.BindingContext,
        current,
        current.bindingContext,
        current.bindingContext.lookup(name),
      );
    }

    while (
      current != null
      && !current.isBoundary
      && current.overrideContext.lookup(name) == null
      && current.bindingContext.lookup(name) == null
    ) {
      current = current.parent;
    }

    if (current == null) {
      return new BindingScopeLocatedLookup(
        BindingScopeLookupKind.FallbackBindingContext,
        this,
        this.bindingContext,
        null,
      );
    }

    const overrideSlot = current.overrideContext.lookup(name);
    if (overrideSlot != null) {
      return new BindingScopeLocatedLookup(
        BindingScopeLookupKind.OverrideContext,
        current,
        current.overrideContext,
        overrideSlot,
      );
    }

    return new BindingScopeLocatedLookup(
      BindingScopeLookupKind.BindingContext,
      current,
      current.bindingContext,
      current.bindingContext.lookup(name),
    );
  }

  lookupThis(ancestor: number = 0): BindingScopeLookup {
    return this.locateThis(ancestor).toLookup();
  }

  locateThis(ancestor: number = 0): BindingScopeLocatedLookup {
    let current: BindingScope | null = this;

    while (ancestor > 0 && current != null) {
      ancestor--;
      current = current.parent;
    }

    if (current == null) {
      return new BindingScopeLocatedLookup(BindingScopeLookupKind.MissingAncestor, null, null, null);
    }

    return new BindingScopeLocatedLookup(
      BindingScopeLookupKind.BindingContext,
      current,
      current.bindingContext,
      null,
    );
  }

  toReference(): BindingScopeReference {
    return new BindingScopeReference(
      this.productHandle,
      this.identityHandle,
      this.ownerKind,
      this.sourceAddressHandle,
      null,
    );
  }
}

export function mergeBindingContextSlotDrafts(
  base: readonly BindingContextSlotDraft[],
  overrides: readonly BindingContextSlotDraft[],
): readonly BindingContextSlotDraft[] {
  if (overrides.length === 0) {
    return base;
  }
  const byName = new Map<string, BindingContextSlotDraft>();
  for (const slot of base) {
    byName.set(slot.name, slot);
  }
  for (const slot of overrides) {
    byName.set(slot.name, slot);
  }
  return [...byName.values()];
}
