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

export class DependencyAssociationSource {
  constructor(
    readonly kind: DependencyAssociationSourceKind,
    readonly note: string | null = null,
  ) {}
}
