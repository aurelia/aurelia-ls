/**
 * Fixture: Simple decorator form
 *
 * Tests: @customElement("my-element") with inline template
 */

import { customElement } from "aurelia";

@customElement({
  name: "my-element",
  template: `<div>\${message}</div>`,
})
export class MyElement {
  message = "Hello";
}
