export type ProductAvailability = 'in-stock' | 'limited' | 'backorder';

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly price: string;
  readonly availability: ProductAvailability;
}
