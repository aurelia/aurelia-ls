/**
 * Fixture: Interpolation bindings in various contexts
 *
 * Tests: Text interpolation, attribute interpolation, class/style interpolation
 */

import { customElement } from "aurelia";

@customElement({
  name: "styled-card",
  template: `
    <div
      class="card \${isActive ? 'active' : ''} \${size}-size"
      style="background-color: \${bgColor}; opacity: \${opacity}"
      title="Card: \${title} (\${status})"
      data-id="\${id}">
      <h2>\${title}</h2>
      <p>\${description}</p>
      <span class="badge">\${count} / \${total}</span>
      <a href="/items/\${id}">View Details</a>
    </div>
  `,
})
export class StyledCard {
  id = 42;
  title = "Sample Card";
  description = "A card with various interpolations";
  isActive = true;
  size = "medium";
  bgColor = "#f0f0f0";
  opacity = 0.9;
  status = "published";
  count = 5;
  total = 10;
}
