
export const LOOKUP_MODIFIER_KINDS = [
  'all',
  'lazy',
  'optional',
  'factory',
  'own',
  'from-hydration-context',
  'new-instance-of',
  'new-instance-for-scope',
] as const;

export type LookupModifierKind =
  typeof LOOKUP_MODIFIER_KINDS[number];
export class AllLookupModifier {
  readonly kind = 'all' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}
export class LazyLookupModifier {
  readonly kind = 'lazy' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}
export class OptionalLookupModifier {
  readonly kind = 'optional' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}
export class FactoryLookupModifier {
  readonly kind = 'factory' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}
export class OwnLookupModifier {
  readonly kind = 'own' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}
export class FromHydrationContextLookupModifier {
  readonly kind = 'from-hydration-context' as const;

  constructor(
    readonly note: string | null = 'Dependency lookup is routed through the nearest hydration-context controller container and then resolved with own(key) semantics.',
  ) {}
}
export class NewInstanceOfLookupModifier {
  readonly kind = 'new-instance-of' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}
export class NewInstanceForScopeLookupModifier {
  readonly kind = 'new-instance-for-scope' as const;

  constructor(
    readonly note: string | null = null,
  ) {}
}

export type LookupModifier =
  | AllLookupModifier
  | LazyLookupModifier
  | OptionalLookupModifier
  | FactoryLookupModifier
  | OwnLookupModifier
  | FromHydrationContextLookupModifier
  | NewInstanceOfLookupModifier
  | NewInstanceForScopeLookupModifier;
