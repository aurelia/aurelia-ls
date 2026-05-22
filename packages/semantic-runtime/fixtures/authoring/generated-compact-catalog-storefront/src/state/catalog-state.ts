import { resolve } from 'aurelia';
import type { ProductTier } from '../models/product-tier';
import { ProductTierCatalogService } from '../services/product-tier-catalog-service';

export class ProductTierCollectionState {
  private readonly productTiers = new Map<string, ProductTier>();

  searchText = '';
  isLoading = false;

  get items(): readonly ProductTier[] {
    const query = this.searchText.trim().toLowerCase();
    return [...this.productTiers.values()].filter((productTier) =>
      query.length === 0 || productTier.name.toLowerCase().includes(query) || productTier.summary.toLowerCase().includes(query)
    );
  }

  get hasProductTiers(): boolean {
    return this.productTiers.size > 0;
  }

  get hasVisibleProductTiers(): boolean {
    return this.items.length > 0;
  }

  replace(collection: readonly ProductTier[]): void {
    this.productTiers.clear();
    for (const productTier of collection) {
      this.productTiers.set(productTier.id, productTier);
    }
  }
}

export class CatalogState {
  private readonly catalogService = resolve(ProductTierCatalogService);

  readonly productTiers = new ProductTierCollectionState();

  async loadFeaturedProductTiers(): Promise<void> {
    if (this.productTiers.hasProductTiers || this.productTiers.isLoading) {
      return;
    }

    this.productTiers.isLoading = true;
    try {
      this.productTiers.replace(await this.catalogService.loadFeaturedProductTiers());
    } finally {
      this.productTiers.isLoading = false;
    }
  }
}
