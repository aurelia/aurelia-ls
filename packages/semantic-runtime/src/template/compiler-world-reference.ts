import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type {
  BindableDefinition,
  BindableDefinitionReference,
} from '../resources/bindable-definition.js';
import type { ResourceDefinitionKind } from '../resources/resource-kind.js';

export const enum TemplateCompilerServiceKind {
  /** Runtime TemplateCompiler service. */
  TemplateCompiler = 'template-compiler',
  /** Component-local `ICssClassMapping` shared by built-in hooks and runtime class consumers. */
  CssClassMapping = 'css-class-mapping',
  /** Ordered `ITemplateCompilerHooks` membership and callable closure for one compiler invocation world. */
  CompilerHooks = 'compiler-hooks',
  /** Runtime IResourceResolver service for custom element/custom attribute lookup and bindable maps. */
  ResourceResolver = 'resource-resolver',
  /** Runtime IAttributeParser service for raw attribute syntax classification. */
  AttributeParser = 'attribute-parser',
  /** Runtime IBindingCommandResolver service for binding command lookup. */
  BindingCommandResolver = 'binding-command-resolver',
  /** Expression parser used by binding commands and renderers. */
  ExpressionParser = 'expression-parser',
  /** Attribute mapper used by binding commands and plain-attribute lowering. */
  AttributeMapper = 'attribute-mapper',
  /** Runtime Rendering service that dispatches lowered instructions to IRenderer products. */
  Rendering = 'rendering',
}

export const enum TemplateResourceVisibilityKind {
  /** Resource is visible through the current container. */
  Local = 'local',
  /** Resource is visible through an ancestor/root container. */
  Inherited = 'inherited',
  /** Resource is visible because compiler configuration injected it directly. */
  Configured = 'configured',
  /** Resource is the root component supplied to Aurelia.app(...). */
  AppRoot = 'app-root',
  /** Resource is reached through a router RouteableComponent/RouteConfig handoff. */
  Routeable = 'routeable',
  /** Visibility is known to be requested but the container path is open. */
  Open = 'open',
}

/** Runtime-shaped bindable lookup entry owned by a resource definition. */
export class TemplateBindableReference {
  constructor(
    /** Runtime bindable definition metadata. */
    readonly definition: BindableDefinition,
    /** Durable reference for the nested bindable. */
    readonly reference: BindableDefinitionReference,
  ) {}
}

/** Resource selected from a compiler world without retaining its full definition or visibility catalog entry. */
export class TemplateVisibleResourceReference {
  constructor(
    /** Author-facing resource taxonomy of the selected resource. */
    readonly resourceKind: ResourceDefinitionKind,
    /** Canonical runtime lookup name; the authored occurrence may have used an alias. */
    readonly name: string,
    /** Product handle for the visible resource model, when materialized. */
    readonly resourceProductHandle: ProductHandle | null,
    /** Identity handle for the visible resource model, when materialized. */
    readonly resourceIdentityHandle: IdentityHandle | null,
    /** Product handle for the full resource definition, when convergence has produced one. */
    readonly definitionProductHandle: ProductHandle | null,
    /** How the selected resource became visible to this compiler world. */
    readonly visibilityKind: TemplateResourceVisibilityKind,
    /** Source address for the registration, definition, import, or convention that made it visible. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Resource member retained by a compiler context; exact DI/container availability belongs to scope lookup rows. */
export class TemplateVisibleResource {
  constructor(
    /** Resource kind visible to the compiler. */
    readonly resourceKind: ResourceDefinitionKind,
    /** Canonical resource name; it is lookup-active only when a TemplateResourceScopeLookup names this member. */
    readonly name: string,
    /** Declared aliases; exact active alias ownership remains a TemplateResourceScopeLookup fact. */
    readonly aliases: readonly string[],
    /** Product handle for the visible resource model, which may be a header, full definition, or syntax executable. */
    readonly resourceProductHandle: ProductHandle | null,
    /** Identity handle for the visible resource model, when materialized. */
    readonly resourceIdentityHandle: IdentityHandle | null,
    /** Product handle for the full resource definition, when convergence has produced one. */
    readonly definitionProductHandle: ProductHandle | null,
    /** How this resource became visible to the compiler world. */
    readonly visibilityKind: TemplateResourceVisibilityKind,
    /** Source address for the registration, definition, import, or convention that made it visible. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}

  toReference(): TemplateVisibleResourceReference {
    return new TemplateVisibleResourceReference(
      this.resourceKind,
      this.name,
      this.resourceProductHandle,
      this.resourceIdentityHandle,
      this.definitionProductHandle,
      this.visibilityKind,
      this.sourceAddressHandle,
    );
  }
}

/** Exact semantic-and-witness equality for an ordered compiler-visible resource scope. */
export function sameTemplateVisibleResourceSet(
  left: readonly TemplateVisibleResource[],
  right: readonly TemplateVisibleResource[],
): boolean {
  return left.length === right.length
    && left.every((resource, index) => sameTemplateVisibleResource(resource, right[index] ?? null));
}

/** Exact semantic-and-witness equality for one compiler-visible catalog row. */
export function sameTemplateVisibleResource(
  left: TemplateVisibleResource,
  right: TemplateVisibleResource | null,
): boolean {
  return right != null
    && left.resourceKind === right.resourceKind
    && left.name === right.name
    && left.aliases.length === right.aliases.length
    && left.aliases.every((alias, index) => alias === right.aliases[index])
    && left.resourceProductHandle === right.resourceProductHandle
    && left.resourceIdentityHandle === right.resourceIdentityHandle
    && left.definitionProductHandle === right.definitionProductHandle
    && left.visibilityKind === right.visibilityKind
    && left.sourceAddressHandle === right.sourceAddressHandle;
}

/** Reference to a compiler service without retaining a runtime singleton instance. */
export class TemplateCompilerServiceReference {
  constructor(
    /** Service lane represented by this reference. */
    readonly serviceKind: TemplateCompilerServiceKind,
    /** Product handle for the service model, when materialized. */
    readonly productHandle: ProductHandle | null,
    /** Identity handle for the service model, when materialized. */
    readonly identityHandle: IdentityHandle | null,
    /** Source address for the lookup or registration that produced this service. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}
