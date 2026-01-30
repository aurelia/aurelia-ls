import { bindable, customElement } from "@aurelia/runtime-html";
import template from "./my-card.html";

@customElement({ name: "my-card", template })
export class MyCard {
  @bindable title = "";
}
