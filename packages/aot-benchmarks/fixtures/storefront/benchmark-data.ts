export type StorefrontBenchmarkCategory = 'core' | 'featured' | 'seasonal';

export interface StorefrontBenchmarkRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: StorefrontBenchmarkCategory;
  readonly monthlyPrice: number;
  readonly available: boolean;
}

export const STOREFRONT_BENCHMARK_ITEM_COUNT = 500;
export const STOREFRONT_BENCHMARK_SEASONAL_COUNT = 125;
export const STOREFRONT_BENCHMARK_IN_STOCK_COUNT = 400;
export const STOREFRONT_BENCHMARK_DETAIL_ITEM_ID = 'item-251';

const categoriesByOrdinalRemainder: readonly StorefrontBenchmarkCategory[] = [
  'seasonal',
  'core',
  'featured',
  'core',
];

export function createStorefrontBenchmarkRecords(): readonly StorefrontBenchmarkRecord[] {
  const records: StorefrontBenchmarkRecord[] = [];
  for (let ordinal = 1; ordinal <= STOREFRONT_BENCHMARK_ITEM_COUNT; ordinal++) {
    records.push({
      id: `item-${ordinal}`,
      title: `Title ${ordinal}`,
      description: `Description ${ordinal}`,
      category: categoryForOrdinal(ordinal),
      monthlyPrice: 40 + (ordinal % 12) * 8,
      available: ordinal % 5 !== 0,
    });
  }
  return records;
}

function categoryForOrdinal(ordinal: number): StorefrontBenchmarkCategory {
  return categoriesByOrdinalRemainder[ordinal % categoriesByOrdinalRemainder.length]!;
}
