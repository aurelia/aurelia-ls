import { customElement } from "@aurelia/runtime-html";
import template from "./nav-bar.html";

/**
 * Pattern: Decorator with string name
 * @customElement('nav-bar')
 */
@customElement({
  name: "nav-bar",
  template,
})
export class NavBar {
  items = ["Home", "About", "Contact"];
}
