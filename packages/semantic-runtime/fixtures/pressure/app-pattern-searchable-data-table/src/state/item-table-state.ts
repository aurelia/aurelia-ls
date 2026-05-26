import { resolve } from 'aurelia';
import type { Item, Category, Status } from '../models/item';
import { ItemService } from '../services/item-service';

export type CategoryFilter = Category | 'all';
export type StatusFilter = Status | 'all';
export type SortColumn = 'name' | 'category' | 'status' | 'updatedDate' | 'count' | 'flagged';
export type SortDirection = 'asc' | 'desc';

export interface TableColumn {
  readonly key: SortColumn;
  readonly label: string;
  readonly numeric?: boolean;
}

export class TableFilterState {
  searchQuery = '';
  selectedCategory: CategoryFilter = 'all';

  readonly categoryOptions: readonly { readonly value: CategoryFilter; readonly label: string }[] = [
    { value: 'all', label: 'Any Category' },
    { value: 'category-one', label: 'Category One' },
    { value: 'category-two', label: 'Category Two' },
    { value: 'category-three', label: 'Category Three' },
  ];
  selectedStatus: StatusFilter = 'all';

  readonly statusOptions: readonly { readonly value: StatusFilter; readonly label: string }[] = [
    { value: 'all', label: 'Any Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ];
  onlyFlagged = false;

  get hasActiveFilters(): boolean {
    return this.searchQuery.trim().length > 0
      || this.selectedCategory !== 'all'
      || this.selectedStatus !== 'all'
      || this.onlyFlagged;
  }

  matches(item: Item): boolean {
    const query = this.searchQuery.trim().toLowerCase();
    const matchesSearch = query.length === 0
      || String(item.name).toLowerCase().includes(query)
      || String(item.category).toLowerCase().includes(query)
      || String(item.status).toLowerCase().includes(query)
      || String(item.updatedDate).toLowerCase().includes(query)
      || String(item.count).toLowerCase().includes(query);
    const matchesCategory = this.selectedCategory === 'all' || item.category === this.selectedCategory;
    const matchesStatus = this.selectedStatus === 'all' || item.status === this.selectedStatus;
    const matchesFlagged = !this.onlyFlagged || item.flagged;
    return matchesSearch && matchesCategory && matchesStatus && matchesFlagged;
  }

  reset(): void {
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.selectedStatus = 'all';
    this.onlyFlagged = false;
  }
}

export class TableSortState {
  column: SortColumn = 'name';
  direction: SortDirection = 'asc';

  sortBy(column: SortColumn): void {
    if (this.column === column) {
      this.direction = this.direction === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.column = column;
    this.direction = 'asc';
  }
}

export class TablePaginationState {
  page = 1;
  pageSize = 5;
  readonly pageSizes = [5, 10, 25] as const;

  get startIndex(): number {
    return (this.page - 1) * this.pageSize;
  }

  setPage(page: number, totalPages: number): void {
    this.page = Math.min(Math.max(page, 1), totalPages);
  }

  reset(): void {
    this.page = 1;
  }
}

export class TableSelectionState {
  selectedItemIds = new Set<number>();

  get count(): number {
    return this.selectedItemIds.size;
  }

  get hasSelection(): boolean {
    return this.selectedItemIds.size > 0;
  }

  clear(): void {
    this.selectedItemIds.clear();
  }
}

export class ItemTableState {
  private readonly itemService = resolve(ItemService);

  readonly filters = new TableFilterState();

  readonly sort = new TableSortState();

  readonly pagination = new TablePaginationState();

  readonly selection = new TableSelectionState();

  readonly columns: readonly TableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'updatedDate', label: 'Updated Date' },
    { key: 'count', label: 'Count', numeric: true },
    { key: 'flagged', label: 'Flagged' },
  ];

  items: Item[] = [];
  isLoading = false;

  get filteredItems(): readonly Item[] {
    return this.items.filter((item) => this.filters.matches(item));
  }

  get sortedItems(): readonly Item[] {
    const sorted = [...this.filteredItems];
    sorted.sort((left, right) => this.compareItems(left, right));
    return sorted;
  }

  get pageItems(): readonly Item[] {
    return this.sortedItems.slice(
      this.pagination.startIndex,
      this.pagination.startIndex + this.pagination.pageSize,
    );
  }

  get totalResults(): number {
    return this.filteredItems.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalResults / this.pagination.pageSize));
  }

  get pages(): readonly number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get startResult(): number {
    return this.totalResults === 0 ? 0 : this.pagination.startIndex + 1;
  }

  get endResult(): number {
    return Math.min(this.pagination.startIndex + this.pageItems.length, this.totalResults);
  }

  get allPageSelected(): boolean {
    return this.pageItems.length > 0 && this.pageItems.every((item) =>
      this.selection.selectedItemIds.has(item.id)
    );
  }

  get somePageSelected(): boolean {
    return this.pageItems.some((item) => this.selection.selectedItemIds.has(item.id))
      && !this.allPageSelected;
  }

  get selectionPercent(): number {
    return this.totalResults === 0
      ? 0
      : Math.round((this.selection.count / this.totalResults) * 100);
  }

  async loadItems(): Promise<void> {
    if (this.items.length > 0 || this.isLoading) {
      return;
    }

    this.isLoading = true;
    try {
      this.items = [...await this.itemService.listItems()];
    } finally {
      this.isLoading = false;
    }
  }

  readItem(id: string | number): Item | null {
    const normalizedId = typeof id === 'number' ? id : Number(id);
    if (!Number.isFinite(normalizedId)) {
      return null;
    }
    return this.items.find((candidate) => candidate.id === normalizedId) ?? null;
  }

  sortBy(column: SortColumn): void {
    this.sort.sortBy(column);
    this.pagination.reset();
  }

  resetFilters(): void {
    this.filters.reset();
    this.pagination.reset();
  }

  goToPage(page: number): void {
    this.pagination.setPage(page, this.totalPages);
  }

  previousPage(): void {
    this.goToPage(this.pagination.page - 1);
  }

  nextPage(): void {
    this.goToPage(this.pagination.page + 1);
  }

  togglePageSelection(): void {
    if (this.allPageSelected) {
      for (const item of this.pageItems) {
        this.selection.selectedItemIds.delete(item.id);
      }
      return;
    }

    for (const item of this.pageItems) {
      this.selection.selectedItemIds.add(item.id);
    }
  }

  clearSelection(): void {
    this.selection.clear();
  }

  private compareItems(left: Item, right: Item): number {
    const leftValue = this.sortValue(left);
    const rightValue = this.sortValue(right);
    const direction = this.sort.direction === 'asc' ? 1 : -1;
    if (leftValue < rightValue) {
      return -direction;
    }
    if (leftValue > rightValue) {
      return direction;
    }
    return 0;
  }

  private sortValue(item: Item): string | number {
    switch (this.sort.column) {
      case 'name':
        return item.name.toLowerCase();
      case 'category':
        return item.category;
      case 'status':
        return item.status;
      case 'updatedDate':
        return item.updatedDate;
      case 'count':
        return item.count;
      case 'flagged':
        return item.flagged ? 1 : 0;
    }
  }
}