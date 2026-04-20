export const RESOURCE_LOOKUP_REGIME_KINDS = [
  'resource',
  'optional-resource',
  'all-resources',
] as const;

export type ResourceLookupRegimeKind =
  typeof RESOURCE_LOOKUP_REGIME_KINDS[number];

export class ResourceLookupRegime {
  constructor(
    readonly kind: ResourceLookupRegimeKind,
    readonly note: string | null = null,
  ) {}
}
