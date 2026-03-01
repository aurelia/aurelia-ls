import { bindable, customAttribute, templateController } from "@aurelia/runtime-html";

@templateController
@customAttribute({ name: "if-not", aliases: ["unless"], noMultiBindings: true, defaultProperty: "value" })
export class IfNot {
  @bindable value = false;
}
