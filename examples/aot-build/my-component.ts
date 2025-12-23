import { customElement } from "aurelia";
import template from "./my-component.html";

@customElement({ name: "my-component", template })
export class MyComponent {
  message = "Hello from AOT!";
  items = ["Server-side rendering", "Client hydration", "AOT compilation"];
}
