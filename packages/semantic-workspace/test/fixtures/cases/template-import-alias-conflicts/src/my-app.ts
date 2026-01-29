import { customElement } from "@aurelia/runtime-html";
import template from "./my-app.html";
import { Badge } from "./attributes/badge";
import { Tooltip } from "./attributes/tooltip";

@customElement({ name: "my-app", template })
export class MyApp {
  static dependencies = [Badge, Tooltip];
}
