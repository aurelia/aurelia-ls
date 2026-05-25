import { customElement } from '@aurelia/runtime-html';
import template from './contextual-call-argument-completion-app.html';

interface CatalogProduct {
  readonly sku: string;
  readonly displayName: string;
  readonly price: number;
}

@customElement({
  name: 'contextual-call-argument-completion-app',
  template,
})
export class ContextualCallArgumentCompletionApp {
  readonly showSku = true;

  readonly products: readonly CatalogProduct[] = [
    { sku: 'sku-1', displayName: 'Desk lamp', price: 42 },
  ];

  productLabel(project: (product: CatalogProduct) => string): string {
    return this.products.map(project).join(', ');
  }

  readonly maybeProductLabel: ((project: (product: CatalogProduct) => string) => string) | null =
    this.productLabel.bind(this);

  productLabelFromOptions(options: { readonly project: (product: CatalogProduct) => string }): string {
    return this.products.map(options.project).join(', ');
  }

  productLabels(projects: readonly ((product: CatalogProduct) => string)[]): string {
    return projects.map((project) => this.products.map(project).join(', ')).join(' / ');
  }

  productLabelRest(project: (...products: CatalogProduct[]) => string): string {
    return project(...this.products);
  }

  productLabelPair(project: (primary: CatalogProduct, secondary: CatalogProduct) => string): string {
    const [primary, secondary = this.products[0]!] = this.products;
    return project(primary, secondary);
  }

  formatTagged(strings: TemplateStringsArray): number;
  formatTagged(strings: TemplateStringsArray, value: string): string;
  formatTagged(strings: TemplateStringsArray, value?: string): string | number {
    return value == null ? strings.length : `${strings[0]}${value}`;
  }
}
