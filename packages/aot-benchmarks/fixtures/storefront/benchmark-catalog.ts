import { Item } from '../../../semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/models/item.js';
import { ItemCatalogService } from '../../../semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/services/item-catalog-service.js';
import { createStorefrontBenchmarkRecords } from './benchmark-data.js';

export {
  STOREFRONT_BENCHMARK_DETAIL_ITEM_ID,
  STOREFRONT_BENCHMARK_IN_STOCK_COUNT,
  STOREFRONT_BENCHMARK_ITEM_COUNT,
  STOREFRONT_BENCHMARK_SEASONAL_COUNT,
} from './benchmark-data.js';

/**
 * Deterministic benchmark replacement for the ordinary three-record catalog service.
 *
 * One four-record period contains two core, one featured, and one seasonal item. One five-record period contains four
 * in-stock items and one backorder. Keeping those periods independent makes the category and stock distributions
 * obvious while exercising every existing Item branch without inventing a `standard` category.
 */
export class StorefrontBenchmarkCatalogService extends ItemCatalogService {
  readonly #items = createStorefrontBenchmarkItems();

  override async loadFeaturedItems(): Promise<readonly Item[]> {
    return this.#items;
  }
}

export function createStorefrontBenchmarkItems(): readonly Item[] {
  return createStorefrontBenchmarkRecords().map((record) => new Item(
    record.id,
    record.title,
    record.description,
    record.category,
    record.monthlyPrice,
    record.available,
  ));
}
