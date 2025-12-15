/**
 * Fixture: Default export
 *
 * Tests: export default class
 */

import { customElement } from "aurelia";

@customElement({
  name: "default-component",
  template: `<div>\${message}</div>`,
})
export default class DefaultComponent {
  message = "I am the default export";
}
