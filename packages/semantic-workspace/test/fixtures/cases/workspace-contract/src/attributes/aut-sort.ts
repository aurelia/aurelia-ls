import { bindable, customAttribute } from "@aurelia/runtime-html";

@customAttribute("aut-sort")
export class AutSort {
  @bindable({ primary: true }) key = "";
  @bindable({ attribute: "default" }) defaultDirection: "asc" | "desc" = "asc";
  @bindable direction?: "asc" | "desc";
}
