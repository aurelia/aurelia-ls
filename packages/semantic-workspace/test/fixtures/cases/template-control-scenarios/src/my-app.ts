import { customElement } from "@aurelia/runtime-html";
import template from "./my-app.html";
import { ControllersBranches } from "./components/controllers-branches.js";
import { ProjectionDemo } from "./components/projection-demo.js";
import { DeepNesting } from "./components/deep-nesting.js";
import { LocalsDemo } from "./components/locals-demo.js";

@customElement({ name: "my-app", template })
export class MyApp {
  static dependencies = [ControllersBranches, ProjectionDemo, DeepNesting, LocalsDemo];
}
