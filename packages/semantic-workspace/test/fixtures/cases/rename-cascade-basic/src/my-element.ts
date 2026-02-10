import { bindable, customElement } from "@aurelia/runtime-html";
import template from "./my-element.html";

@customElement({
  name: "my-element",
  template,
})
export class MyElement {
  @bindable({ attribute: "first-name" }) firstName = "";
  @bindable lastName = "";
  @bindable({ attribute: "heading" }) title = "";
}
