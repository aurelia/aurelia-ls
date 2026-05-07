import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type {
  BindableDefinition,
  BindableDefinitionReference,
} from '../resources/bindable-definition.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionKind } from '../resources/resource-kind.js';

export const enum TemplateCompilerServiceKind {
  /** Runtime TemplateCompiler service. */
  TemplateCompiler = 'template-compiler',
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

/** Resource definition visible to template compilation through DI/container lookup. */
export class TemplateVisibleResource {
  constructor(
    /** Resource kind visible to the compiler. */
    readonly resourceKind: ResourceDefinitionKind,
    /** Runtime lookup name such as element name, attribute name, converter name, or binding-command name. */
    readonly name: string,
    /** Other lookup names that resolve to the same resource product. */
    readonly aliases: readonly string[],
    /** Product handle for the visible resource model, which may be a header, full definition, or syntax executable. */
    readonly resourceProductHandle: ProductHandle | null,
    /** Identity handle for the visible resource model, when materialized. */
    readonly resourceIdentityHandle: IdentityHandle | null,
    /** Product handle for the full resource definition, when convergence has produced one. */
    readonly definitionProductHandle: ProductHandle | null,
    /** Full definition detail visible to compiler and inquiry consumers, when known. */
    readonly definition: FullResourceDefinition | null,
    /** How this resource became visible to the compiler world. */
    readonly visibilityKind: TemplateResourceVisibilityKind,
    /** Source address for the registration, definition, import, or convention that made it visible. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
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
