export type ProductBadge = 'standard' | 'new' | 'sale';

export interface Product {
  id: string;
  name: string;
  summary: string;
  price: number;
  inStock: boolean;
  badge: ProductBadge;
}
