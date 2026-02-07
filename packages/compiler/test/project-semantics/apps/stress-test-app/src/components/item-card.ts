import { customElement, bindable } from "@aurelia/runtime-html";
import template from "./item-card.html";
import { StatusBadge } from "./status-badge.js";

/**
 * Level 3 component: Individual item with conditional status.
 * Contains:
 * - if/else branches
 * - Child custom element (status-badge) in both branches
 * - Text interpolation
 */
@customElement({
  name: "item-card",
  template,
  dependencies: [StatusBadge],
})
export class ItemCard {
  @bindable item: { label: string; active: boolean } = { label: "", active: false };
}
