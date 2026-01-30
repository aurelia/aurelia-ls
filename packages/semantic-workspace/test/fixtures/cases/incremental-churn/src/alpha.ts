import { customElement } from "@aurelia/runtime-html";
import template from "./alpha.html";

@customElement({
  name: "alpha-panel",
  template,\n  bindables: { level: {} },
})
export class AlphaPanel {
  message = "alpha";
}
