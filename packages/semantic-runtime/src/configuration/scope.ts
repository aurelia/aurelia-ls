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
  RepeatedItem = 'repeated-item',
  StateBinding = 'state-binding',
}

export const enum BindingScopeCreatorKind {
  RuntimeBindingScopeEffect = 'runtime-binding-scope-effect',
  RuntimeAssignment = 'runtime-assignment',
  ListenerEvent = 'listener-event',
  StateBinding = 'state-binding',
  TemplateControllerCondition = 'template-controller-condition',
  TemplateControllerBranch = 'template-controller-branch',
  TemplateControllerValueScope = 'template-controller-value-scope',
}

export const enum BindingScopeConditionPolarity {
  Truthy = 'truthy',
  Falsy = 'falsy',
}

/** Runtime product that created or meaningfully transformed a modeled Scope. */
export class BindingScopeCreator {
  constructor(
    /** Framework-semantic reason the scope exists. */
    readonly creatorKind: BindingScopeCreatorKind,
    /** Product that owns the creator fact, usually an instruction or runtime scope-effect product. */
    readonly productHandle: ProductHandle,
    /** Source address for the creator product. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Conditional branch polarity when the creator replays a template-controller condition. */
    readonly conditionPolarity: BindingScopeConditionPolarity | null = null,
    /** Names introduced into the runtime Scope by this creator. */
    readonly introducedSlotNames: readonly string[] = [],
    /** Names written by a runtime assignment, including updates to existing slots. */
    readonly assignedSlotNames: readonly string[] = [],
    /** Runtime context lane that received the assigned names. */
    readonly assignedContextKind: BindingContextKind | null = null,
  ) {}
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
  | 'runtimeParent'
  | 'predecessor'
  | 'bindingContext'
  | 'overrideContext'
  | 'isBoundary'
  | 'source';

export type BindingContextSlotField =
  | 'name'
  | 'target'
  | 'targetType'
  | 'targetTypeSource'
  | 'assignmentAccess'
  | 'source';

/** Template-author assignment authority for a modeled runtime scope slot. */
export const enum BindingContextSlotAssignmentAccessKind {
  Writable = 'writable',
  FrameworkManagedReadOnly = 'framework-managed-read-only',
}

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
    /** Assignment authority when framework construction, rather than TypeScript, owns the slot. */
    readonly assignmentAccessKind: BindingContextSlotAssignmentAccessKind | null = null,
    /** Member product that supplied the current target type when it differs from the declaration reached by this name. */
    readonly targetTypeSourceProductHandle: ProductHandle | null = null,
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
    /** Assignment authority when framework construction, rather than TypeScript, owns the slot. */
    readonly assignmentAccessKind: BindingContextSlotAssignmentAccessKind | null = null,
    /** Member product that supplied the current target type when it differs from the declaration reached by this name. */
    readonly targetTypeSourceProductHandle: ProductHandle | null = null,
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
      slot.assignmentAccessKind,
      slot.targetTypeSourceProductHandle,
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
      this.assignmentAccessKind,
      this.targetTypeSourceProductHandle,
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
    /** Parent Scope traversed by Aurelia `$parent` and ordinary fallback lookup. */
    readonly runtimeParent: BindingScope | null,
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
    /** Runtime products and framework semantics that directly caused this Scope to be created. */
    readonly scopeCreators: readonly BindingScopeCreator[] = [],
    /** Prior immutable product state for the same runtime Scope, when this is a same-level derivation. */
    readonly predecessor: BindingScope | null = null,
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
    /** Parent Scope traversed by Aurelia `$parent` and ordinary fallback lookup. */
    readonly runtimeParent: BindingScope | null,
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
    /** Runtime products and framework semantics that directly caused this Scope to be created. */
    readonly scopeCreators: readonly BindingScopeCreator[] = [],
    /** Prior immutable product state for this same runtime Scope. Never used for `$parent` lookup. */
    readonly predecessor: BindingScope | null = null,
  ) {
    if (overrideContext.ownerProductHandle !== productHandle) {
      throw new Error(`Binding scope '${productHandle}' must own override context '${overrideContext.productHandle}'.`);
    }
    if (predecessor == null) {
      return;
    }
    const sameRuntimeParentIdentity = runtimeParent?.identityHandle === predecessor.runtimeParent?.identityHandle;
    if (
      identityHandle !== predecessor.identityHandle
      || bindingContext.identityHandle !== predecessor.bindingContext.identityHandle
      || bindingContext.contextKind !== predecessor.bindingContext.contextKind
      || bindingContext.ownerProductHandle !== predecessor.bindingContext.ownerProductHandle
      || overrideContext.identityHandle !== predecessor.overrideContext.identityHandle
      || !sameRuntimeParentIdentity
      || isBoundary !== predecessor.isBoundary
      || ownerKind !== predecessor.ownerKind
    ) {
      throw new Error(`Binding scope '${productHandle}' is not a valid derived state of '${predecessor.productHandle}'.`);
    }
  }

  /** Runtime `Scope.fromParent` shape for repeat-item contexts. */
  static fromRepeatedItem(input: {
    readonly localKey: string;
    readonly ownerProductHandle: ProductHandle | null;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly parent: BindingScope;
    readonly localSlots: readonly BindingContextSlotDraft[];
    readonly overrideSlots: readonly BindingContextSlotDraft[];
    readonly sourceAddressHandle: AddressHandle | null;
    readonly scopeCreators?: readonly BindingScopeCreator[];
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
      input.scopeCreators ?? [],
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
    readonly scopeCreators?: readonly BindingScopeCreator[];
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
      input.scopeCreators ?? [],
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
    readonly scopeCreators?: readonly BindingScopeCreator[];
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
      input.scopeCreators ?? [],
    );
  }

  /** Speculative same-level scope overlay for branch-local type narrowing such as `if.bind`. */
  static fromNarrowedBindingScope(input: {
    readonly localKey: string;
    readonly ownerProductHandle: ProductHandle | null;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly base: BindingScope;
    /** New state of the same runtime parent identity, when an ancestor write advanced that parent. */
    readonly runtimeParent?: BindingScope | null;
    readonly bindingContextSlots?: readonly BindingContextSlotDraft[];
    readonly overrideContextSlots?: readonly BindingContextSlotDraft[];
    readonly sourceAddressHandle: AddressHandle | null;
    readonly scopeCreators?: readonly BindingScopeCreator[];
  }): BindingScopeConstructionRequest {
    return new BindingScopeConstructionRequest(
      input.localKey,
      input.base.ownerKind,
      input.ownerProductHandle,
      input.ownerIdentityHandle,
      input.runtimeParent === undefined ? input.base.runtimeParent : input.runtimeParent,
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
      input.scopeCreators ?? [],
      input.base,
    );
  }

  /** Same-runtime-Scope state after a `let` binding updates one of its context objects. */
  static fromLetBindings(input: {
    readonly localKey: string;
    readonly ownerProductHandle: ProductHandle | null;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly base: BindingScope;
    readonly bindingContextSlots: readonly BindingContextSlotDraft[];
    readonly overrideContextSlots: readonly BindingContextSlotDraft[];
    readonly sourceAddressHandle: AddressHandle | null;
    readonly scopeCreators?: readonly BindingScopeCreator[];
  }): BindingScopeConstructionRequest {
    return new BindingScopeConstructionRequest(
      input.localKey,
      input.base.ownerKind,
      input.ownerProductHandle,
      input.ownerIdentityHandle,
      input.base.runtimeParent,
      input.base.bindingContext.contextKind,
      input.base.bindingContext.contextType,
      mergeBindingContextSlotDrafts(
        input.base.bindingContext.slots.map((slot) => BindingContextSlotDraft.fromSlot(slot)),
        input.bindingContextSlots,
      ),
      input.base.overrideContext.contextType,
      mergeBindingContextSlotDrafts(
        input.base.overrideContext.slots.map((slot) => BindingContextSlotDraft.fromSlot(slot)),
        input.overrideContextSlots,
      ),
      input.base.isBoundary,
      input.sourceAddressHandle,
      input.scopeCreators ?? [],
      input.base,
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
        current = current.runtimeParent;
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
      current = current.runtimeParent;
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
      current = current.runtimeParent;
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

  /** Locate the nearest boundary Scope visible from this Scope, matching Aurelia boundary `this` lookup. */
  locateBoundary(): BindingScope | null {
    let current: BindingScope | null = this;
    while (current != null && !current.isBoundary) {
      current = current.runtimeParent;
    }
    return current;
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

/** Stable equality key for framework/runtime facts that directly created or transformed a modeled Scope. */
export function bindingScopeCreatorKey(creator: BindingScopeCreator): string {
  return [
    creator.creatorKind,
    creator.productHandle,
    creator.conditionPolarity ?? '',
    creator.introducedSlotNames.join(','),
    creator.assignedSlotNames.join(','),
    creator.assignedContextKind ?? '',
  ].join('|');
}
