export class Product {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly price: number,
    readonly inStock: boolean,
  ) {}

  get priceLabel(): string {
    return '$' + this.price.toFixed(2);
  }

  get stockLabel(): string {
    return this.inStock ? 'Ready to ship' : 'Back soon';
  }
}
