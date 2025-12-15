/**
 * Fixture: Custom attribute with decorator
 *
 * Tests: @customAttribute("highlight")
 */

import { customAttribute, bindable } from "aurelia";

@customAttribute("highlight")
export class Highlight {
  @bindable color = "yellow";

  constructor(private element: HTMLElement) {}

  bound() {
    this.element.style.backgroundColor = this.color;
  }

  colorChanged(newValue: string) {
    this.element.style.backgroundColor = newValue;
  }
}
