import { bindable, customAttribute, templateController } from "@aurelia/runtime-html";

@templateController
@customAttribute({ name: "if-not", aliases: ["unless"], noMultiBindings: true })
export class IfNot {
  @bindable({ primary: true }) value = false;
}
