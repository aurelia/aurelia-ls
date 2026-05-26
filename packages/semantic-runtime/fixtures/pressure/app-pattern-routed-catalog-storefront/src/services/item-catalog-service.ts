import { Item, type Category } from '../models/item';

interface ItemRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: Category;
  readonly monthlyPrice: number;
  readonly available: boolean;
}

const featuredRecords: readonly ItemRecord[] = [
  { id: 'item-1', title: 'Title 1', description: 'Description 1', category: 'core', monthlyPrice: 48, available: true },
  { id: 'item-2', title: 'Title 2', description: 'Description 2', category: 'featured', monthlyPrice: 72, available: true },
  { id: 'item-3', title: 'Title 3', description: 'Description 3', category: 'seasonal', monthlyPrice: 96, available: false },
];

export class ItemCatalogService {
  async loadFeaturedItems(): Promise<readonly Item[]> {
    return featuredRecords.map(createItem);
  }
}

function createItem(record: ItemRecord): Item {
  return new Item(
    record.id,
    record.title,
    record.description,
    record.category,
    record.monthlyPrice,
    record.available,
  );
}
