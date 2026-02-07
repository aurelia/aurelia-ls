import { customElement } from "@aurelia/runtime-html";
import template from "./beta.html";

@customElement({
  name: "beta-panel",
  template,
})
export class BetaPanel {
  message = "beta";
}
