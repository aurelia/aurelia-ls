import { customElement } from 'aurelia';
import { DisplayHint } from './attributes/display-hint';
import { ProductCard } from './components/product-card';
import { StockBadge } from './components/stock-badge';
import type { CatalogItem } from './models';
import { StockLabelValueConverter } from './value-converters/stock-label';
import template from './my-app.html';

@customElement({
  name: 'my-app',
  template,
  dependencies: [
    DisplayHint,
    ProductCard,
    StockBadge,
    StockLabelValueConverter,
  ],
})
export class MyApp {
  readonly heading = 'Aurelia IDE playground';
  readonly state = {
    searchText: '',
    onlyInStock: false,
    selectedSku: 'BK-001',
  };

  readonly items: CatalogItem[] = [
    {
      sku: 'BK-001',
      name: 'Blue kettle',
      description: 'Compact kettle with a quiet boil setting.',
      quantity: 4,
      tone: 'fresh',
      tags: ['kitchen', 'featured'],
    },
    {
      sku: 'MG-204',
      name: 'Morning mug',
      description: 'Ceramic mug with a good hand feel.',
      quantity: 0,
      tone: 'empty',
      tags: ['coffee'],
    },
    {
      sku: 'TR-118',
      name: 'Travel roaster',
      description: 'Portable coffee roaster for small batches.',
      quantity: 2,
      tone: 'warning',
      tags: ['coffee', 'travel'],
    },
  ];

  get visibleItems(): CatalogItem[] {
    const searchText = this.state.searchText.trim().toLowerCase();
    return this.items.filter((item) => {
      const matchesSearch = searchText.length === 0
        || item.name.toLowerCase().includes(searchText)
        || item.tags.some((tag) => tag.includes(searchText));
      const matchesStock = !this.state.onlyInStock || item.quantity > 0;
      return matchesSearch && matchesStock;
    });
  }

  get selectedItem(): CatalogItem {
    return this.items.find((item) => item.sku === this.state.selectedSku) ?? this.items[0]!;
  }

  selectItem(item: CatalogItem): void {
    this.state.selectedSku = item.sku;
  }

  clearSearch(): void {
    this.state.searchText = '';
  }
}
