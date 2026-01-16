import { bindable, customAttribute } from "@aurelia/runtime-html";

@customAttribute("tooltip")
export class Tooltip {
  @bindable({ primary: true }) text = "";
  @bindable placement: "top" | "bottom" | "left" | "right" = "top";
}
