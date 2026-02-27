import { customElement, bindable } from "@aurelia/runtime-html";
import template from "./info-tag.html";

/**
 * Containerless component: Renders without wrapper element.
 * Tests containerless custom element handling.
 */
@customElement({
  name: "info-tag",
  template,
  containerless: true,
})
export class InfoTag {
  @bindable count = 0;
}
