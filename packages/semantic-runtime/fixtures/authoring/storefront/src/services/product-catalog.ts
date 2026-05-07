import { Product } from '../models/product';

export class ProductCatalogService {
  async loadFeaturedProducts(): Promise<readonly Product[]> {
    return this.readSeedProducts();
  }

  private readSeedProducts(): readonly Product[] {
    return [
      {
        id: 'linen-apron',
        name: 'Linen Apron',
        summary: 'Washed linen with deep front pockets.',
        price: '$48',
        availability: 'in-stock',
      },
      {
        id: 'copper-kettle',
        name: 'Copper Kettle',
        summary: 'A stovetop kettle shaped for slow mornings.',
        price: '$84',
        availability: 'limited',
      },
      {
        id: 'seed-crate',
        name: 'Seed Crate',
        summary: 'Kitchen garden seeds packed by season.',
        price: '$26',
        availability: 'backorder',
      },
    ];
  }
}
