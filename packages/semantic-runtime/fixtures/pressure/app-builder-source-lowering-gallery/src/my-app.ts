export type MyAppPriority = 'low' | 'normal' | 'urgent';

export type MyAppLabel = 'frontend' | 'backend' | 'docs';

interface GalleryItem {
  readonly title: string;
  readonly description: string;
  readonly quantity: number;
  readonly dueDate: Date | null;
  readonly enabled: boolean;
  readonly priority: MyAppPriority;
  readonly labels: readonly MyAppLabel[];
}

export class MyApp {
  readonly priorityOptions: readonly { readonly value: MyAppPriority; readonly title: string }[] = [
    { value: 'low', title: 'Low' },
    { value: 'normal', title: 'Normal' },
    { value: 'urgent', title: 'Urgent' },
  ];

  readonly labelOptions: readonly { readonly value: MyAppLabel; readonly title: string }[] = [
    { value: 'frontend', title: 'Frontend' },
    { value: 'backend', title: 'Backend' },
    { value: 'docs', title: 'Docs' },
  ];

  title: string = '';
  description: string = '';
  quantity: number = 0;
  dueDate: Date | null = null;
  enabled: boolean = false;
  priority: MyAppPriority = 'low';
  labels: MyAppLabel[] = [];
  saveStatusMessage: string = '';

  readonly items: GalleryItem[] = [
    {
      title: 'Alpha',
      description: 'First gallery item',
      quantity: 2,
      dueDate: new Date('2026-06-01T00:00:00.000Z'),
      enabled: true,
      priority: 'normal',
      labels: ['frontend'],
    },
    {
      title: 'Beta',
      description: 'Second gallery item',
      quantity: 5,
      dueDate: null,
      enabled: false,
      priority: 'urgent',
      labels: ['backend', 'docs'],
    },
  ];

  draftItem: GalleryItem = {
    title: 'Draft',
    description: 'Editable gallery item',
    quantity: 1,
    dueDate: null,
    enabled: true,
    priority: 'normal',
    labels: ['frontend'],
  };

  sortBy(fieldName: keyof GalleryItem): void {
    this.title = `Sorted by ${fieldName}`;
  }

  matchOption(left: unknown, right: unknown): boolean {
    return left === right;
  }

  save() {
    this.enabled = true;
  }

  selectItem(item: GalleryItem) {
    this.title = item.title;
  }

  readonly itemsPromise: Promise<GalleryItem[]> = Promise.resolve(this.items);
}