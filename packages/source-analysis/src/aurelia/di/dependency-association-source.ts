export const DEPENDENCY_ASSOCIATION_SOURCE_KINDS = [
  'static-inject',
  'design-paramtypes',
  'annotation-paramtypes',
  'definition-dependencies',
  'field-resolve',
] as const;

export type DependencyAssociationSourceKind =
  typeof DEPENDENCY_ASSOCIATION_SOURCE_KINDS[number];

export class DependencyAssociationSource {
  constructor(
    readonly kind: DependencyAssociationSourceKind,
    readonly note: string | null = null,
  ) {}
}
