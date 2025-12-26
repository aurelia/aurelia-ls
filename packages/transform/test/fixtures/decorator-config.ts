/**
 * Fixture: Decorator with full config object
 *
 * Tests: @customElement({ name, template, dependencies })
 */

import { customElement, bindable } from "aurelia";

@customElement({
  name: "user-card",
  template: `
    <div class="card">
      <h2>\${name}</h2>
      <p>\${email}</p>
      <slot></slot>
    </div>
  `,
  dependencies: [],
})
export class UserCard {
  @bindable name = "";
  @bindable email = "";
}
