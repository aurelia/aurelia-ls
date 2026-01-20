import { customElement } from "@aurelia/runtime-html";
import template from "./my-app.html";
import { Tooltip } from "./attributes/tooltip";

@customElement({ name: "my-app", template })
export class MyApp {
  static dependencies = [Tooltip];
}
