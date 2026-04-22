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

// Resource-semantic lookup is modeled separately via ResourceLookupRegime in
// the registrations layer. Keeping those out of this vocabulary prevents
// generic helper modifiers from silently doubling as resource-world regimes.
export class LookupModifier {
  constructor(
    readonly kind: LookupModifierKind,
    readonly note: string | null = null,
  ) {}
}
