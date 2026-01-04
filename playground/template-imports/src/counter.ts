import { customElement, bindable } from "aurelia";

/**
 * A counter component that can be imported via <import from="./counter">.
 * Tests template-level import resolution.
 */
@customElement("counter")
export class CounterCustomElement {
  @bindable public label = "Count";
  public count = 0;

  public increment(): void {
    this.count++;
  }

  public decrement(): void {
    this.count--;
  }
}
