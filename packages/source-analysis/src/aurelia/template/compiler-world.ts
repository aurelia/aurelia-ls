import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { AppRootReference } from '../configuration/app-root.js';
import type { ContainerReference } from '../di/container.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';

export const enum TemplateCompilerWorldKind {
  /** Compiler world for an app root or app-level container. */
  AppRoot = 'app-root',
  /** Compiler world for one component template. */
  Component = 'component',
  /** Compiler world for a synthetic view or template-controller child template. */
  SyntheticView = 'synthetic-view',
  /** Compiler world exists but its owner is still open. */
  Unknown = 'unknown',
}

export const enum TemplateCompilerServiceKind {
  /** Runtime TemplateCompiler service. */
  TemplateCompiler = 'template-compiler',
  /** Runtime IResourceResolver bridge for custom element/custom attribute lookup and bindable maps. */
  ResourceResolver = 'resource-resolver',
  /** Runtime IAttributeParser bridge for raw attribute syntax classification. */
  AttributeParser = 'attribute-parser',
  /** Runtime IBindingCommandResolver bridge for binding command lookup. */
  BindingCommandResolver = 'binding-command-resolver',
  /** Expression parser used by binding commands and renderers. */
  ExpressionParser = 'expression-parser',
  /** Attribute mapper used by binding commands and plain-attribute lowering. */
  AttributeMapper = 'attribute-mapper',
}

export const enum TemplateResourceVisibilityKind {
  /** Resource is visible through the current container. */
  Local = 'local',
  /** Resource is visible through an ancestor/root container. */
  Inherited = 'inherited',
  /** Resource is visible because compiler configuration injected it directly. */
  Configured = 'configured',
  /** Visibility is known to be requested but the container path is open. */
  Open = 'open',
}

export type TemplateCompilerWorldField =
  | 'worldKind'
  | 'appRoot'
  | 'container'
  | 'services'
  | 'resourceScope'
  | 'source';

export type TemplateResourceScopeField =
  | 'container'
  | 'resources'
  | 'syntaxResources'
  | 'source';

export type TemplateCompilerServiceField =
  | 'serviceKind'
  | 'container'
  | 'source';

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

/** Resource and syntax-resource scope visible to a template compiler world. */
export class TemplateResourceScope {
  constructor(
    /** Product handle for the materialized-product envelope that represents this scope. */
    readonly productHandle: ProductHandle,
    /** Identity for this modeled resource scope. */
    readonly identityHandle: IdentityHandle,
    /** Container whose resource/factory/resolver state produced the scope. */
    readonly container: ContainerReference,
    /** Custom elements, custom attributes, template controllers, value converters, binding behaviors, and commands. */
    readonly resources: readonly TemplateVisibleResource[],
    /** Attribute patterns and other parser syntax resources available to the compiler. */
    readonly syntaxResources: readonly TemplateVisibleResource[],
    /** Source address for the scope owner. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateResourceScopeField>[] = [],
  ) {}
}

/** Runtime IResourceResolver bridge as a product model. */
@auLink('template-compiler:IResourceResolver')
export class TemplateResourceResolverService {
  constructor(
    /** Product handle for the materialized-product envelope that represents this service. */
    readonly productHandle: ProductHandle,
    /** Identity for this service model. */
    readonly identityHandle: IdentityHandle,
    /** Container used by resolver lookups. */
    readonly container: ContainerReference,
    /** Source address for the resolver registration or lookup. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateCompilerServiceField>[] = [],
  ) {}

  toReference(): TemplateCompilerServiceReference {
    return new TemplateCompilerServiceReference(
      TemplateCompilerServiceKind.ResourceResolver,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Runtime ExpressionParser service model used through the compiler-world parser contract. */
@auLink('expression-parser:ExpressionParser')
export class TemplateExpressionParserService {
  constructor(
    /** Product handle for the materialized-product envelope that represents this service. */
    readonly productHandle: ProductHandle,
    /** Identity for this service model. */
    readonly identityHandle: IdentityHandle,
    /** Container used to resolve the parser service. */
    readonly container: ContainerReference,
    /** Source address for the service registration or lookup. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateCompilerServiceField>[] = [],
  ) {}

  toReference(): TemplateCompilerServiceReference {
    return new TemplateCompilerServiceReference(
      TemplateCompilerServiceKind.ExpressionParser,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Runtime AttrMapper service model used through the compiler-world mapper contract. */
@auLink('runtime-html:AttrMapper')
export class TemplateAttributeMapperService {
  constructor(
    /** Product handle for the materialized-product envelope that represents this service. */
    readonly productHandle: ProductHandle,
    /** Identity for this service model. */
    readonly identityHandle: IdentityHandle,
    /** Container used to resolve the mapper service. */
    readonly container: ContainerReference,
    /** Source address for the service registration or lookup. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateCompilerServiceField>[] = [],
  ) {}

  toReference(): TemplateCompilerServiceReference {
    return new TemplateCompilerServiceReference(
      TemplateCompilerServiceKind.AttributeMapper,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Runtime TemplateCompiler service as a product model. */
@auLink('template-compiler:TemplateCompiler')
export class TemplateCompilerService {
  constructor(
    /** Product handle for the materialized-product envelope that represents this service. */
    readonly productHandle: ProductHandle,
    /** Identity for this service model. */
    readonly identityHandle: IdentityHandle,
    /** Container used to resolve compiler collaborators. */
    readonly container: ContainerReference,
    /** Source address for the service registration or lookup. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateCompilerServiceField>[] = [],
  ) {}

  toReference(): TemplateCompilerServiceReference {
    return new TemplateCompilerServiceReference(
      TemplateCompilerServiceKind.TemplateCompiler,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Compiler-facing world used by HTML parsing, attribute classification, and lowering. */
export class TemplateCompilerWorld {
  constructor(
    /** Product handle for the materialized-product envelope that represents this compiler world. */
    readonly productHandle: ProductHandle,
    /** Identity for this compiler world. */
    readonly identityHandle: IdentityHandle,
    /** Compiler world owner lane. */
    readonly worldKind: TemplateCompilerWorldKind,
    /** AppRoot boundary that owns this world, if known. */
    readonly appRoot: AppRootReference | null,
    /** Container whose DI/resource state feeds compilation. */
    readonly container: ContainerReference,
    /** Resource/syntax scope visible to this compiler world. */
    readonly resourceScopeProductHandle: ProductHandle | null,
    /** Compiler services visible to this compiler world. */
    readonly services: readonly TemplateCompilerServiceReference[],
    /** Source address for the world owner. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateCompilerWorldField>[] = [],
  ) {}
}
