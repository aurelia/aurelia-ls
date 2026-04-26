import { auLink } from '../au-link.js';

export const RESOURCE_LOOKUP_REGIME_KINDS = [
  'resource',
  'optional-resource',
  'all-resources',
] as const;

export type ResourceLookupRegimeKind =
  typeof RESOURCE_LOOKUP_REGIME_KINDS[number];

@auLink('kernel:resource')
export class ResourceResolverLookupRegime {
  readonly kind = 'resource' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}

@auLink('kernel:optionalResource')
export class OptionalResourceLookupRegime {
  readonly kind = 'optional-resource' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}

@auLink('kernel:allResources')
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
