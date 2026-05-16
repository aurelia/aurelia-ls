import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';

export const enum ResourceDependencyReferenceKind {
  /** Dependency entry that can make another Aurelia resource visible to the template compiler. */
  Resource = 'resource',
  /** Dependency entry that registers framework/runtime services in the component child container. */
  Registry = 'registry',
}

export const enum ResourceRegistryDependencyKind {
  CssModules = 'css-modules',
  ShadowCss = 'shadow-css',
  ChildrenLifecycleHooks = 'children-lifecycle-hooks',
  SlottedLifecycleHooks = 'slotted-lifecycle-hooks',
}

/**
 * Resource-layer reference to a TypeScript value, declaration, or callable without retaining AST state.
 */
export class ResourceTargetReference {
  constructor(
    readonly identityHandle: IdentityHandle | null,
    readonly addressHandle: AddressHandle | null,
    readonly localName: string | null,
    readonly targetType: CheckerTypeReference | null = null,
  ) {}
}

export class ResourceAliasDefinition {
  constructor(
    readonly name: string,
    readonly addressHandle: AddressHandle | null = null,
    readonly provenanceHandle: ProvenanceHandle | null = null,
  ) {}
}

export class ResourceDependencyReference {
  constructor(
    readonly identityHandle: IdentityHandle | null,
    readonly keyName: string | null = null,
    readonly moduleKey: string | null = null,
    readonly localName: string | null = null,
    readonly dependencyKind: ResourceDependencyReferenceKind = ResourceDependencyReferenceKind.Resource,
    readonly registryKind: ResourceRegistryDependencyKind | null = null,
  ) {}
}

export class InstructionReference {
  constructor(
    readonly productHandle: ProductHandle,
  ) {}
}
