
export const RESOURCE_LOOKUP_REGIME_KINDS = [
  'resource',
  'optional-resource',
  'all-resources',
] as const;

export type ResourceLookupRegimeKind =
  typeof RESOURCE_LOOKUP_REGIME_KINDS[number];
export class ResourceResolverLookupRegime {
  readonly kind = 'resource' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}
export class OptionalResourceLookupRegime {
  readonly kind = 'optional-resource' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}
export class AllResourcesLookupRegime {
  readonly kind = 'all-resources' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}

export type ResourceLookupRegime =
  | ResourceResolverLookupRegime
  | OptionalResourceLookupRegime
  | AllResourcesLookupRegime;
