/**
 * Fixture: Parent with child custom elements
 *
 * Tests: hydrateElement instructions, prop passing
 */

import { customElement } from "aurelia";

@customElement({
  name: "parent-component",
  template: `
    <div class="parent">
      <h1>Parent: \${title}</h1>
      <child-card
        name.bind="user.name"
        age.bind="user.age"
        active.bind="isActive">
      </child-card>
      <child-card
        name="Static Name"
        age="99"
        active.bind="false">
      </child-card>
    </div>
  `,
})
export class ParentComponent {
  title = "User Profile";
  user = { name: "Alice", age: 30 };
  isActive = true;
}
