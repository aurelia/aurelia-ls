export interface CatalogItem {
  readonly sku: string;
  readonly name: string;
  readonly description: string;
  readonly quantity: number;
  readonly tone: 'fresh' | 'warning' | 'empty';
  readonly tags: readonly string[];
}
