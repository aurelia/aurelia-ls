import { Product } from '../models/product';

export class ProductState {
  readonly products: readonly Product[] = [
    new Product('lamp-1', 'Task lamp', 48, true),
    new Product('chair-1', 'Reading chair', 240, true),
  ];

  get featuredProduct(): Product {
    return this.products[0];
  }
}
