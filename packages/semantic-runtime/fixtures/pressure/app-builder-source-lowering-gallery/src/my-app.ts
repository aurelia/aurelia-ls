export type MyAppPriority = 'low' | 'normal' | 'urgent';

export type MyAppLabel = 'frontend' | 'backend' | 'docs';

interface GalleryItem {
  readonly title: string;
  readonly description: string;
  readonly contactEmail: string;
  readonly websiteUrl: string;
  readonly supportPhone: string;
  readonly accessCode: string;
  readonly filterText: string;
  readonly quantity: number;
  readonly dueDate: string;
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
  contactEmail: string = '';
  websiteUrl: string = '';
  supportPhone: string = '';
  accessCode: string = '';
  filterText: string = '';
  appointmentTime: string = '';
  scheduledAtLocal: string = '';
  billingMonth: string = '';
  reviewWeek: string = '';
  quantity: number = 0;
  dueDate: string = '';
  enabled: boolean = false;
  priority: MyAppPriority = 'low';
  labels: MyAppLabel[] = [];
  saveStatusMessage: string = '';

  readonly items: GalleryItem[] = [
    {
      title: 'Alpha',
      description: 'First gallery item',
      contactEmail: 'alpha@example.com',
      websiteUrl: 'https://example.com/alpha',
      supportPhone: '+31 20 000 0001',
      accessCode: 'alpha-secret',
      filterText: 'alpha',
      quantity: 2,
      dueDate: '2026-06-01',
      enabled: true,
      priority: 'normal',
      labels: ['frontend'],
    },
    {
      title: 'Beta',
      description: 'Second gallery item',
      contactEmail: 'beta@example.com',
      websiteUrl: 'https://example.com/beta',
      supportPhone: '+31 20 000 0002',
      accessCode: 'beta-secret',
      filterText: 'beta',
      quantity: 5,
      dueDate: '',
      enabled: false,
      priority: 'urgent',
      labels: ['backend', 'docs'],
    },
  ];

  draftItem: GalleryItem = {
    title: 'Draft',
    description: 'Editable gallery item',
    contactEmail: 'draft@example.com',
    websiteUrl: 'https://example.com/draft',
    supportPhone: '+31 20 000 0003',
    accessCode: 'draft-secret',
    filterText: 'draft',
    quantity: 1,
    dueDate: '',
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

  adjustStock(item: GalleryItem, delta: number) {
    this.quantity = item.quantity + delta;
  }

  readonly itemsPromise: Promise<GalleryItem[]> = Promise.resolve(this.items);
}
