/**
 * Fixture: Event listeners and ref bindings
 *
 * Tests: click.trigger, keydown.capture, ref bindings
 */

import { customElement } from "aurelia";

@customElement({
  name: "interactive-form",
  template: `
    <form submit.trigger="handleSubmit($event)">
      <input
        ref="inputEl"
        value.two-way="inputValue"
        keydown.capture="onKeyDown($event)"
        focus.trigger="onFocus()"
        blur.trigger="onBlur()">
      <button type="submit" click.trigger="handleClick($event)">Submit</button>
      <button type="button" click.delegate="handleDelegate()">Delegate</button>
    </form>
    <p>Focused: \${isFocused}</p>
    <p>Last key: \${lastKey}</p>
  `,
})
export class InteractiveForm {
  inputEl!: HTMLInputElement;
  inputValue = "";
  isFocused = false;
  lastKey = "";

  handleSubmit(event: Event) {
    event.preventDefault();
    console.log("Submitted:", this.inputValue);
  }

  handleClick(event: MouseEvent) {
    console.log("Clicked at:", event.clientX, event.clientY);
  }

  handleDelegate() {
    console.log("Delegated click");
  }

  onKeyDown(event: KeyboardEvent) {
    this.lastKey = event.key;
  }

  onFocus() {
    this.isFocused = true;
  }

  onBlur() {
    this.isFocused = false;
  }
}
