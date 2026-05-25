import { customElement } from '@aurelia/runtime-html';
import template from './arrow-callback-source-value-app.html';

export interface ArrowCallbackProduct {
  id: string;
  label: string;
  featured: boolean;
}

class ArrowCallbackProductState {
  readonly products: readonly ArrowCallbackProduct[] = [
    { id: 'featured', label: 'Featured', featured: true },
    { id: 'archived', label: 'Archived', featured: false },
  ];

  get featuredProducts(): readonly ArrowCallbackProduct[] {
    return this.products.filter((product) => product.featured);
  }

  get joinedProductIds(): string {
    return this.products.map((product) => product.id).join('|');
  }
}

@customElement({
  name: 'arrow-callback-source-value-app',
  template,
})
export class ArrowCallbackSourceValueApp {
  readonly state = new ArrowCallbackProductState();

  get products(): readonly ArrowCallbackProduct[] {
    return this.state.products;
  }

  productsFromThis(): readonly ArrowCallbackProduct[] {
    return this.state.products;
  }
}
