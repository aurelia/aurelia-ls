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

export class PhysicalBuiltInProduct extends BuiltInProduct {
  constructor(
    id: string,
    label: string,
    readonly shippingWeight: number,
  ) {
    super(id, label);
  }
}

export class DigitalBuiltInProduct extends BuiltInProduct {
  constructor(
    id: string,
    label: string,
    readonly downloadUrl: string,
  ) {
    super(id, label);
  }
}

export interface BookCatalogItem {
  readonly kind: 'book';
  readonly title: string;
  readonly pages: number;
}

export interface ServiceCatalogItem {
  readonly kind: 'service';
  readonly title: string;
  readonly hourlyRate: number;
}

export interface ArchivedCatalogItem {
  readonly kind: 'archived';
  readonly title: string;
  readonly archivedAt: string;
}

export type CatalogItem = BookCatalogItem | ServiceCatalogItem | ArchivedCatalogItem;

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
  readonly currentItem: CatalogItem = {
    kind: 'book',
    title: 'Typed branch',
    pages: 184,
  };
  readonly probedItem: CatalogItem = {
    kind: 'service',
    title: 'Property probe',
    hourlyRate: 120,
  };
  readonly physicalProductType = PhysicalBuiltInProduct;
  readonly mixedProduct: PhysicalBuiltInProduct | DigitalBuiltInProduct =
    new PhysicalBuiltInProduct('boxed', 'Boxed product', 2.4);
  readonly currentPrimitive: string | number = 'typed guard';
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

  bookOnly(item: BookCatalogItem): string {
    return item.title;
  }

  notBookOnly(item: ServiceCatalogItem | ArchivedCatalogItem): string {
    return item.title;
  }

  stringOnly(value: string): string {
    return value.toUpperCase();
  }

  numberOnly(value: number): string {
    return value.toFixed();
  }

  physicalOnly(product: PhysicalBuiltInProduct): string {
    return product.shippingWeight.toFixed();
  }

  digitalOnly(product: DigitalBuiltInProduct): string {
    return product.downloadUrl;
  }

  formatReason(reason: unknown): string {
    return String(reason);
  }
}
