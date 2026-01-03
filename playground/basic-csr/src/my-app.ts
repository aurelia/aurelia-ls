/**
 * Minimal component for CSR testing.
 * Has static content, interpolation, and a click handler.
 */
export class MyAppCustomElement {
  public title = "Hello from Aurelia";
  public clickCount = 0;

  public increment(): void {
    this.clickCount++;
  }
}
