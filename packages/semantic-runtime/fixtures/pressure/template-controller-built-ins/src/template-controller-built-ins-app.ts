import { customElement } from '@aurelia/runtime-html';
import template from './template-controller-built-ins-app.html';

export class BuiltInProduct {
  constructor(
    readonly id: string,
    readonly label: string,
  ) {}

  labelLength(): number {
    return this.label.length;
  }
}

@customElement({
  name: 'template-controller-built-ins-app',
  template,
})
export class TemplateControllerBuiltInsApp {
  readonly products: readonly BuiltInProduct[] = [
    new BuiltInProduct('first', 'First product'),
    new BuiltInProduct('second', 'Second product'),
  ];

  readonly productEntries = new Map<string, BuiltInProduct>([
    ['first', this.products[0]!],
    ['second', this.products[1]!],
  ]);
  readonly productSet = new Set(this.products);
  readonly repeatCount = 2;

  readonly selectedProduct: BuiltInProduct | null = this.products[0]!;
  readonly productPromise = Promise.resolve(this.products[1]!);
  readonly statusMessage = 'Loading product';
  readonly fallbackMessage = 'Nothing selected';
  readonly listTitle = 'List view';
  readonly detailTitle = 'Detail view';
  readonly portalMessage = 'Portaled content';
  mode: 'list' | 'detail' | 'other' = 'detail';
  modeGroup: 'list' | 'detail' | 'other' = 'list';
  fallMode: 'list' | 'detail' | 'other' = 'list';

  selectProduct(id: string): boolean {
    return this.products.some((product) => product.id === id);
  }

  listOnly(mode: 'list'): string {
    return mode;
  }

  detailOnly(mode: 'detail'): string {
    return mode;
  }

  listOrDetailOnly(mode: 'list' | 'detail'): string {
    return mode;
  }

  otherOnly(mode: 'other'): string {
    return mode;
  }

  formatReason(reason: unknown): string {
    return String(reason);
  }
}
