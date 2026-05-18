import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import type { Product } from '../models/product';
import { CatalogState } from '../state/catalog-state';
import template from './product-card.html';

@customElement({
  name: 'product-card',
  template,
})
export class ProductCard {
  private readonly state = resolve(CatalogState);

  @bindable productId = '';

  get isLoaded(): boolean {
    return this.currentProduct != null;
  }

  get productName(): string {
    return this.currentProduct?.name ?? 'Loading product';
  }

  get productSummary(): string {
    return this.currentProduct?.summary ?? '';
  }

  get priceLabel(): string {
    const price = this.currentProduct?.price ?? 0;
    return '$' + price.toFixed(2);
  }

  get badgeClass(): string {
    return this.currentProduct?.badge ?? 'standard';
  }

  get isHighlighted(): boolean {
    const badge = this.currentProduct?.badge;
    return badge === 'new' || badge === 'sale';
  }

  get cardPadding(): string {
    return this.isHighlighted ? '1.25rem' : '1rem';
  }

  get cardAccentColor(): string {
    switch (this.currentProduct?.badge) {
      case 'new':
        return '#7c3aed';
      case 'sale':
        return '#0f766e';
      default:
        return '#d0d7de';
    }
  }

  get stockLabel(): string {
    return this.canAdd ? 'In stock' : 'Back soon';
  }

  get availability(): string {
    if (this.canAdd) {
      return this.currentProduct?.badge === 'sale' ? 'limited' : 'in-stock';
    }
    return 'backorder';
  }

  get canAdd(): boolean {
    return this.state.products.readProduct(this.productId)?.inStock === true;
  }

  addToCart(): void {
    this.state.addToCart(this.productId);
  }

  private get currentProduct(): Product | null {
    return this.state.products.readProduct(this.productId);
  }
}
