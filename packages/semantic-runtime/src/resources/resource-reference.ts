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
  /** Built-in registry that installs class mapping plus a component-local template compiler hook. */
  CssModules = 'css-modules',
  ShadowCss = 'shadow-css',
  ChildrenLifecycleHooks = 'children-lifecycle-hooks',
  SlottedLifecycleHooks = 'slotted-lifecycle-hooks',
  /** Exact `TemplateCompilerHooks.define(...)` or `@templateCompilerHooks` registry entry. */
  TemplateCompilerHook = 'template-compiler-hook',
  /** Registry identity is known, but its registration effects remain opaque. */
  OpaqueRegistry = 'opaque-registry',
}

export const enum ResourceCompilerHookEffectKind {
  None = 'none',
  CssModules = 'css-modules',
  TemplateCompilerHook = 'template-compiler-hook',
  OpenRegistry = 'open-registry',
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
    readonly moduleKey: string | null = null,
    /** Full authored declaration carrier for outline/hierarchy consumers, distinct from the exact target token. */
    readonly declarationSourceAddressHandle: AddressHandle | null = null,
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

/** Project a component dependency onto its resource-layer compiler-hook effect posture. */
export function resourceCompilerHookEffectKind(
  dependency: ResourceDependencyReference,
): ResourceCompilerHookEffectKind {
  if (dependency.dependencyKind !== ResourceDependencyReferenceKind.Registry) {
    return ResourceCompilerHookEffectKind.None;
  }
  switch (dependency.registryKind) {
    case ResourceRegistryDependencyKind.CssModules:
      return ResourceCompilerHookEffectKind.CssModules;
    case ResourceRegistryDependencyKind.TemplateCompilerHook:
      return ResourceCompilerHookEffectKind.TemplateCompilerHook;
    case ResourceRegistryDependencyKind.OpaqueRegistry:
      return ResourceCompilerHookEffectKind.OpenRegistry;
    case ResourceRegistryDependencyKind.ShadowCss:
    case ResourceRegistryDependencyKind.ChildrenLifecycleHooks:
    case ResourceRegistryDependencyKind.SlottedLifecycleHooks:
    case null:
      return ResourceCompilerHookEffectKind.None;
  }
}

export class InstructionReference {
  constructor(
    readonly productHandle: ProductHandle,
  ) {}
}
