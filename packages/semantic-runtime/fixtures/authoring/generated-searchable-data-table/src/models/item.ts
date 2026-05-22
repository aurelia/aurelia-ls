export type Category = 'category-one' | 'category-two' | 'category-three';
export type Status = 'active' | 'inactive' | 'pending';


export class Item {
  constructor(
    readonly id: number,
    readonly name: string,
    readonly category: Category,
    readonly status: Status,
    readonly updatedDate: string,
    readonly count: number,
    readonly flagged: boolean,
  ) {}

  get nameLabel(): string {
    return this.name;
  }

  get categoryLabel(): string {
    return labelCategory(this.category);
  }

  get categoryClass(): string {
    return 'category-' + this.category;
  }

  get statusLabel(): string {
    return labelStatus(this.status);
  }

  get statusClass(): string {
    return 'status-' + this.status;
  }

  get updatedDateLabel(): string {
    return this.updatedDate;
  }

  get countLabel(): string {
    return this.count.toLocaleString();
  }

  get flaggedLabel(): string {
    return this.flagged ? 'Yes' : 'No';
  }
}

function labelCategory(value: Category): string {
  switch (value) {
    case 'category-one':
      return 'Category One';
    case 'category-two':
      return 'Category Two';
    case 'category-three':
      return 'Category Three';
  }
}

function labelStatus(value: Status): string {
  switch (value) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'pending':
      return 'Pending';
  }
}
