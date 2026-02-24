// CA: CustomAttribute.define() form — programmatic declaration.
// Exercises: define-static provenance, CA hover with primary bindable,
// CA completions at attribute position, CA definition navigation.
import { CustomAttribute, bindable } from "@aurelia/runtime-html";

export class MatrixHighlightCA {
  @bindable value = "";
  @bindable tone = "default";
}

CustomAttribute.define({ name: "matrix-highlight" }, MatrixHighlightCA);
