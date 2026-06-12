export type Category = 'core' | 'featured' | 'seasonal';
export type ItemBadge = Category | 'standard';
export type ItemAvailability = 'in-stock' | 'limited' | 'backorder';

export class Item {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly description: string,
    readonly category: Category,
    readonly monthlyPrice: number,
    readonly available: boolean,
  ) {}

  get titleLabel(): string {
    return this.title;
  }

  get descriptionLabel(): string {
    return this.description;
  }

  get categoryLabel(): string {
    return labelCategory(this.category);
  }

  get monthlyPriceLabel(): string {
    return this.monthlyPrice.toLocaleString();
  }

  get availableLabel(): string {
    return this.available ? 'Yes' : 'No';
  }

  get name(): string {
    return this.titleLabel;
  }

  get summary(): string {
    return this.descriptionLabel;
  }

  get price(): number {
    return this.monthlyPrice;
  }

  get priceLabel(): string {
    return '$' + this.price.toFixed(2);
  }

  get inStock(): boolean {
    return this.available;
  }

  get badge(): ItemBadge {
    return this.category;
  }

  get isHighlighted(): boolean {
    return this.badge !== 'standard';
  }

  get cardPadding(): string {
    return this.isHighlighted ? '1.25rem' : '1rem';
  }

  get cardAccentColor(): string {
    return this.isHighlighted ? '#0f766e' : '#d0d7de';
  }

  get stockLabel(): string {
    return this.inStock ? 'In stock' : 'Back soon';
  }

  get availability(): ItemAvailability {
    if (this.inStock) {
      return this.isHighlighted ? 'limited' : 'in-stock';
    }
    return 'backorder';
  }
}


function labelCategory(value: Category): string {
  switch (value) {
    case 'core':
      return 'Core';
    case 'featured':
      return 'Featured';
    case 'seasonal':
      return 'Seasonal';
  }
}
