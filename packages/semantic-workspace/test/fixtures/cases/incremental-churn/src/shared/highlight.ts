import { bindable, customAttribute } from "@aurelia/runtime-html";

@customAttribute("highlight")
export class Highlight {
  @bindable value = "";
}
