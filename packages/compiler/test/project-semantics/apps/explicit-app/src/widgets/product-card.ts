import { customElement, bindable } from "@aurelia/runtime-html";
import template from "./product-card.html";
import { PriceTag } from "./price-tag.js";
import { StockBadge } from "./stock-badge.js";

/**
 * Pattern: Component with local dependencies via static dependencies
 *
 * PriceTag and StockBadge are NOT globally registered.
 * They are only available within ProductCard's template.
 * This tests the local scope construction in resolution.
 */
@customElement({
  name: "product-card",
  template,
})
export class ProductCard {
  // Local dependencies - these are only available in THIS component's template
  static dependencies = [PriceTag, StockBadge];

  @bindable name: string = "Sample Product";
  @bindable price: number = 99.99;
  @bindable inStock: boolean = true;
  @bindable stockCount: number = 10;
}
