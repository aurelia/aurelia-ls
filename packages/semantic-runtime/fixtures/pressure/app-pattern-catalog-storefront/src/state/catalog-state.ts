import { resolve } from 'aurelia';
import type { Item, ItemBadge } from '../models/item';
import { ItemCatalogService } from '../services/item-catalog-service';

export class ItemCollectionState {
  private readonly itemsById = new Map<string, Item>();

  searchText = '';
  onlyInStock = false;
  readonly badgeFilters: readonly (ItemBadge | 'all')[] = ["all", "core", "featured", "seasonal", "standard"];

  badgeFilter: ItemBadge | 'all' = 'all';
  isLoading = false;

  get visibleItems(): readonly Item[] {
    const query = this.searchText.trim().toLowerCase();
    return [...this.itemsById.values()].filter((item) =>
      (query.length === 0 || item.name.toLowerCase().includes(query) || item.summary.toLowerCase().includes(query))
      && (!this.onlyInStock || item.inStock)
      && (this.badgeFilter === 'all' || item.badge === this.badgeFilter)
    );
  }

  get hasItems(): boolean {
    return this.itemsById.size > 0;
  }

  get hasVisibleItems(): boolean {
    return this.visibleItems.length > 0;
  }

  readItem(entityId: string): Item | null {
    return this.itemsById.get(entityId) ?? null;
  }

  replace(collection: readonly Item[]): void {
    this.itemsById.clear();
    for (const item of collection) {
      this.itemsById.set(item.id, item);
    }
  }
}

export class SelectionState {
  readonly selectedItemIds: string[] = [];

  get itemCount(): number {
    return this.selectedItemIds.length;
  }

  selectItem(entityId: string): void {
    if (!this.selectedItemIds.includes(entityId)) {
      this.selectedItemIds.push(entityId);
    }
  }
}

export class CatalogState {
  private readonly catalogService = resolve(ItemCatalogService);

  readonly items = new ItemCollectionState();
  readonly selection = new SelectionState();

  get selectionProgressPercent(): number {
    return Math.min(100, Math.round((this.selection.itemCount / 3) * 100));
  }

  get selectedItemNames(): readonly string[] {
    return this.selection.selectedItemIds.map((entityId) =>
      this.items.readItem(entityId)?.name ?? entityId
    );
  }

  async loadFeaturedItems(): Promise<void> {
    if (this.items.hasItems || this.items.isLoading) {
      return;
    }

    this.items.isLoading = true;
    try {
      this.items.replace(await this.catalogService.loadFeaturedItems());
    } finally {
      this.items.isLoading = false;
    }
  }

  selectItem(entityId: string): void {
    const item = this.items.readItem(entityId);
    if (item?.inStock === true) {
      this.selection.selectItem(entityId);
    }
  }
}
