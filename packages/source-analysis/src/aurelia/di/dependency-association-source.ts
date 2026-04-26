import { auLink } from '../au-link.js';

export const DEPENDENCY_ASSOCIATION_SOURCE_KINDS = [
  'static-inject',
  'design-paramtypes',
  'annotation-paramtypes',
  // Resource/support-bundle child-world contribution, not ordinary constructor
  // DI. It stays in the shared vocabulary so later resource-side work can land
  // without inventing a second source-kind family.
  'definition-dependencies',
  'resolve-call',
] as const;

export type DependencyAssociationSourceKind =
  typeof DEPENDENCY_ASSOCIATION_SOURCE_KINDS[number];

export class StaticInjectDependencyAssociationSource {
  readonly kind = 'static-inject' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}

export class DesignParamtypesDependencyAssociationSource {
  readonly kind = 'design-paramtypes' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}

@auLink('kernel:inject')
export class InjectAnnotationDependencyAssociationSource {
  readonly kind = 'annotation-paramtypes' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}

export class DefinitionDependenciesDependencyAssociationSource {
  readonly kind = 'definition-dependencies' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}

@auLink('kernel:resolve')
export class ResolveCallDependencyAssociationSource {
  readonly kind = 'resolve-call' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}

export type DependencyAssociationSource =
  | StaticInjectDependencyAssociationSource
  | DesignParamtypesDependencyAssociationSource
  | InjectAnnotationDependencyAssociationSource
  | DefinitionDependenciesDependencyAssociationSource
  | ResolveCallDependencyAssociationSource;
