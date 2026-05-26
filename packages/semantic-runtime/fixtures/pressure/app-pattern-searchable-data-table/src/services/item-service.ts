import { Item, type Category, type Status } from '../models/item';

interface ItemRecord {
  readonly id: number;
  readonly name: string;
  readonly category: Category;
  readonly status: Status;
  readonly updatedDate: string;
  readonly count: number;
  readonly flagged: boolean;
}

const ITEMS: readonly ItemRecord[] = [
  { id: 1, name: 'Item 1', category: 'category-one', status: 'active', updatedDate: '2026-05-10', count: 34, flagged: true },
  { id: 2, name: 'Item 2', category: 'category-two', status: 'inactive', updatedDate: '2026-05-11', count: 51, flagged: false },
  { id: 3, name: 'Item 3', category: 'category-three', status: 'pending', updatedDate: '2026-05-12', count: 68, flagged: true },
  { id: 4, name: 'Item 4', category: 'category-one', status: 'active', updatedDate: '2026-05-13', count: 85, flagged: false },
  { id: 5, name: 'Item 5', category: 'category-two', status: 'inactive', updatedDate: '2026-05-14', count: 102, flagged: true },
  { id: 6, name: 'Item 6', category: 'category-three', status: 'pending', updatedDate: '2026-05-15', count: 119, flagged: false },
  { id: 7, name: 'Item 7', category: 'category-one', status: 'active', updatedDate: '2026-05-16', count: 136, flagged: true },
  { id: 8, name: 'Item 8', category: 'category-two', status: 'inactive', updatedDate: '2026-05-17', count: 153, flagged: false },
];

export class ItemService {
  async listItems(): Promise<readonly Item[]> {
    return ITEMS.map((item) => new Item(
      item.id,
      item.name,
      item.category,
      item.status,
      item.updatedDate,
      item.count,
      item.flagged,
    ));
  }
}
