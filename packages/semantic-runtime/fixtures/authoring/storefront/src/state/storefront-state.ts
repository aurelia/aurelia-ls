import { resolve } from '@aurelia/kernel';
import { Product } from '../models/product';
import { ProductCatalogService } from '../services/product-catalog';

export class CatalogState {
  private items: readonly Product[] = [];
  private loadingProductIds = new Set<string>();

  isLoading = false;

  get products(): readonly Product[] {
    return this.items;
  }

  get productIds(): readonly string[] {
    return this.items.map((product) => product.id);
  }

  productById(productId: string): Product | null {
    return this.items.find((product) => product.id === productId) ?? null;
  }

  isLoadingProduct(productId: string): boolean {
    return this.loadingProductIds.has(productId);
  }

  beginLoadingProduct(productId: string): void {
    this.loadingProductIds.add(productId);
  }

  finishLoadingProduct(productId: string): void {
    this.loadingProductIds.delete(productId);
  }

  replace(products: readonly Product[]): void {
    this.items = products;
  }
}

export class CartState {
  private readonly productIds: string[] = [];

  get count(): number {
    return this.productIds.length;
  }

  add(productId: string): void {
    this.productIds.push(productId);
  }
}

export type FulfillmentMethod = 'ship' | 'pickup';
export type ContactPreference = 'email' | 'phone';
export type CheckoutAddon = 'installation' | 'support';

export class CheckoutState {
  email = '';
  fulfillmentMethod: FulfillmentMethod = 'ship';
  contactPreference: ContactPreference = 'email';
  selectedAddOns: CheckoutAddon[] = [];
  postalCode = '';
  giftWrap = false;
  instructions = '';
  submittedEmail = '';
  submitCount = 0;

  get requiresPostalCode(): boolean {
    return this.fulfillmentMethod === 'ship';
  }

  get canSubmit(): boolean {
    return this.email.includes('@') && (!this.requiresPostalCode || this.postalCode.trim().length > 0);
  }

  get statusMessage(): string {
    if (this.submitCount === 0) {
      return '';
    }
    if (!this.canSubmit) {
      return 'Enter an email and delivery details before requesting a quote.';
    }
    return `Quote request ${this.submitCount} saved for ${this.submittedEmail}.`;
  }

  submit(): void {
    this.submitCount += 1;
    if (this.canSubmit) {
      this.submittedEmail = this.email;
    }
  }
}

export class StorefrontState {
  private readonly catalogService = resolve(ProductCatalogService);

  readonly catalog = new CatalogState();
  readonly cart = new CartState();
  readonly checkout = new CheckoutState();

  get productCount(): number {
    return this.catalog.productIds.length;
  }

  async loadFeaturedProducts(): Promise<void> {
    if (this.catalog.products.length > 0 || this.catalog.isLoading) {
      return;
    }

    this.catalog.isLoading = true;
    try {
      this.catalog.replace(await this.catalogService.loadFeaturedProducts());
    } finally {
      this.catalog.isLoading = false;
    }
  }

  async ensureProduct(productId: string): Promise<void> {
    if (productId === '' || this.catalog.productById(productId) != null || this.catalog.isLoadingProduct(productId)) {
      return;
    }

    this.catalog.beginLoadingProduct(productId);
    try {
      this.catalog.replace(await this.catalogService.loadFeaturedProducts());
    } finally {
      this.catalog.finishLoadingProduct(productId);
    }
  }
}
