export const REGISTRATION_STRATEGY_KINDS = [
  'instance',
  'null-provider',
  'throwing',
  'singleton',
  'transient',
  'callback',
  'alias',
  'array-aggregation',
] as const;

export type RegistrationStrategyKind =
  typeof REGISTRATION_STRATEGY_KINDS[number];

// Resolver/value-form basis is separate from transition lineage. The runtime
// compresses these together for efficiency, but the clean-room model keeps the
// base resolution strategy as its own claim home.
export class RegistrationResolverBasis {
  constructor(
    readonly strategy: RegistrationStrategyKind | null,
    readonly note: string | null = null,
  ) {}
}
