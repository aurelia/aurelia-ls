import { customElement, bindable } from "@aurelia/runtime-html";
import template from "./footer-widget.html";

/**
 * Sibling component at root level.
 * Simple component with bindable.
 */
@customElement({
  name: "footer-widget",
  template,
})
export class FooterWidget {
  @bindable text = "";
}
