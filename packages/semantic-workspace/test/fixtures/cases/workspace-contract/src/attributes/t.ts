import { bindable, customAttribute } from "@aurelia/runtime-html";

@customAttribute({ name: "t", noMultiBindings: true })
export class TAttribute {
  @bindable({ primary: true }) key = "";
  @bindable params?: Record<string, unknown>;
}
