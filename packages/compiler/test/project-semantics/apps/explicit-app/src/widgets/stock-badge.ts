import { customElement, bindable } from "@aurelia/runtime-html";

/**
 * Pattern: Local-only element with kebab-case attribute mapping
 *
 * This component uses bindables with attribute names that differ
 * from the property names (in-stock -> inStock).
 */
@customElement({
  name: "stock-badge",
  template: `<template>
    <span class="badge \${statusClass}">
      \${inStock ? 'In Stock (' + count + ')' : 'Out of Stock'}
    </span>
  </template>`,
  bindables: [
    { name: "inStock", attribute: "in-stock" },
    { name: "count" },
  ],
})
export class StockBadge {
  inStock: boolean = true;
  count: number = 0;

  get statusClass(): string {
    if (!this.inStock) return "out-of-stock";
    if (this.count < 5) return "low-stock";
    return "in-stock";
  }
}
