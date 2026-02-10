import { customElement, bindable } from "@aurelia/runtime-html";

/**
 * Pattern: Local-only element (not globally registered)
 *
 * This component is ONLY available in ProductCard's template
 * because it's declared in ProductCard's static dependencies.
 * It is never passed to Aurelia.register().
 */
@customElement({
  name: "price-tag",
  template: `<template><span class="price">\${formatted}</span></template>`,
})
export class PriceTag {
  @bindable amount: number = 0;
  @bindable currency: string = "USD";

  get formatted(): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: this.currency,
    }).format(this.amount);
  }
}
