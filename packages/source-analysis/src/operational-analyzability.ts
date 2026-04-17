export const PRODUCT_OPERATIONAL_ANALYZABILITY_TIER_IDS = [
  'declared-explicit',
  'generated-explicit',
  'source-analyzable',
  'type-assisted',
  'candidate-only',
  'runtime-only',
] as const;

export type ProductOperationalAnalyzabilityTierId =
  typeof PRODUCT_OPERATIONAL_ANALYZABILITY_TIER_IDS[number];

export interface ProductOperationalAnalyzabilityTier {
  readonly id: ProductOperationalAnalyzabilityTierId;
  readonly rank: number;
  readonly label: string;
  readonly summary: string;
}

const PRODUCT_OPERATIONAL_ANALYZABILITY_TIERS_BY_ID:
Record<ProductOperationalAnalyzabilityTierId, ProductOperationalAnalyzabilityTier> = {
  'declared-explicit': {
    id: 'declared-explicit',
    rank: 1,
    label: 'declared-explicit',
    summary: 'Closure is driven by explicit declaration metadata or already-modeled declaration surfaces.',
  },
  'generated-explicit': {
    id: 'generated-explicit',
    rank: 2,
    label: 'generated-explicit',
    summary: 'Closure is driven by explicit generated/configured carriers already modeled by product law.',
  },
  'source-analyzable': {
    id: 'source-analyzable',
    rank: 3,
    label: 'source-analyzable',
    summary: 'Closure is recovered from materially analyzable source structure without runtime execution.',
  },
  'type-assisted': {
    id: 'type-assisted',
    rank: 4,
    label: 'type-assisted',
    summary: 'The target would otherwise close honestly, but typed evidence remains the only blocker.',
  },
  'candidate-only': {
    id: 'candidate-only',
    rank: 5,
    label: 'candidate-only',
    summary: 'A larger possible surface is known, but it is not admitted as current-world closure for this question.',
  },
  'runtime-only': {
    id: 'runtime-only',
    rank: 6,
    label: 'runtime-only',
    summary: 'Decisive meaning depends on runtime-only opacity, late binding, or materially unanalyzable body computation.',
  },
};

export const STRUCTURAL_OPERATIONAL_ANALYZABILITY_TIER_IDS = [
  'source-analyzable',
  'type-assisted',
  'runtime-only',
] as const satisfies readonly ProductOperationalAnalyzabilityTierId[];

export type StructuralOperationalAnalyzabilityTierId =
  typeof STRUCTURAL_OPERATIONAL_ANALYZABILITY_TIER_IDS[number];

export function productOperationalAnalyzabilityTierForId(
  id: ProductOperationalAnalyzabilityTierId,
): ProductOperationalAnalyzabilityTier {
  return PRODUCT_OPERATIONAL_ANALYZABILITY_TIERS_BY_ID[id];
}
