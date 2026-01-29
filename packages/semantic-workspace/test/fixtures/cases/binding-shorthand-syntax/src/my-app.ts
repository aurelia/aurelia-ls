import { customElement } from "@aurelia/runtime-html";
import template from "./my-app.html";

@customElement({ name: "binding-shorthand-syntax", template })
export class BindingShorthandSyntax {
  message = "Hello";
  count = 0;
  isActive = false;
  state = "idle";
  inputRef?: HTMLInputElement;

  onClick(): void {}

  onKey(_event: KeyboardEvent): void {}

  onEnter(): void {}
}
