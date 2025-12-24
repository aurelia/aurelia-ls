import { customElement, bindable } from "aurelia";
import template from "./greeting.html";

@customElement({ name: "greeting", template })
export class Greeting {
  @bindable name: string = "World";
}
