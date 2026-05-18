import { resolve } from '@aurelia/kernel';
import type { Product } from '../models/product';
import { ProductCatalogService } from '../services/product-catalog-service';

export class ProductCollectionState {
  private readonly products = new Map<string, Product>();

  isLoading = false;

  get ids(): readonly string[] {
    return [...this.products.keys()];
  }

  get hasProducts(): boolean {
    return this.products.size > 0;
  }

  readProduct(productId: string): Product | null {
    return this.products.get(productId) ?? null;
  }

  replace(products: readonly Product[]): void {
    this.products.clear();
    for (const product of products) {
      this.products.set(product.id, product);
    }
  }
}

export class CartState {
  readonly productIds: string[] = [];

  get itemCount(): number {
    return this.productIds.length;
  }

  addProduct(productId: string): void {
    if (!this.productIds.includes(productId)) {
      this.productIds.push(productId);
    }
  }
}

export class CatalogState {
  private readonly catalogService = resolve(ProductCatalogService);

  readonly products = new ProductCollectionState();
  readonly cart = new CartState();

  async loadFeaturedProducts(): Promise<void> {
    if (this.products.hasProducts || this.products.isLoading) {
      return;
    }

    this.products.isLoading = true;
    try {
      this.products.replace(await this.catalogService.loadFeaturedProducts());
    } finally {
      this.products.isLoading = false;
    }
  }

  addToCart(productId: string): void {
    const product = this.products.readProduct(productId);
    if (product?.inStock === true) {
      this.cart.addProduct(productId);
    }
  }
}
