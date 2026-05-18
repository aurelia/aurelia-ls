import type { Product, ProductBadge } from '../models/product';

export class ProductCatalogService {
  async loadFeaturedProducts(): Promise<readonly Product[]> {
    return [
      createProduct('lamp-1', 'Task lamp', 'A focused desk lamp with a warm dimming range.', 48, true, 'new'),
      createProduct('chair-1', 'Reading chair', 'Compact lounge seating for smaller rooms.', 240, true, 'sale'),
      createProduct('shelf-1', 'Wall shelf', 'A shallow shelf for everyday display objects.', 64, false, 'standard'),
    ];
  }
}

function createProduct(
  id: string,
  name: string,
  summary: string,
  price: number,
  inStock: boolean,
  badge: ProductBadge,
): Product {
  return { id, name, summary, price, inStock, badge };
}
