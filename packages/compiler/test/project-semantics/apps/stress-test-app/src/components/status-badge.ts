import { customElement, bindable } from "@aurelia/runtime-html";
import template from "./status-badge.html";

/**
 * Level 4 component: Leaf status display.
 * Contains:
 * - Dynamic class binding
 * - Computed property (getter)
 * - Text interpolation
 */
@customElement({
  name: "status-badge",
  template,
})
export class StatusBadge {
  @bindable active = false;

  get statusText(): string {
    return this.active ? "Active" : "Inactive";
  }

  get statusClass(): string {
    return this.active ? "status-active" : "status-inactive";
  }
}
