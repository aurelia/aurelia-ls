import { ProductTier } from '../models/product-tier';

interface ProductTierRecord {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
}

const featuredRecords: readonly ProductTierRecord[] = [
  { id: 'product-tier-1', name: 'Name 1', summary: 'Summary 1' },
  { id: 'product-tier-2', name: 'Name 2', summary: 'Summary 2' },
  { id: 'product-tier-3', name: 'Name 3', summary: 'Summary 3' },
];

export class ProductTierCatalogService {
  async loadFeaturedProductTiers(): Promise<readonly ProductTier[]> {
    return featuredRecords.map(createProductTier);
  }
}

function createProductTier(record: ProductTierRecord): ProductTier {
  return new ProductTier(
    record.id,
    record.name,
    record.summary,
  );
}
