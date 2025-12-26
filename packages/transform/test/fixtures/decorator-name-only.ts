/**
 * Fixture: Decorator with name string only
 *
 * Tests: @customElement("counter-element") without config object
 */

import { customElement } from "aurelia";

@customElement("counter-element")
export class CounterElement {
  count = 0;

  increment() {
    this.count++;
  }
}
