// CA: decorator-object form with multi-binding enabled.
// Exercises: multi-binding hover per property, multi-binding completions,
// multi-binding diagnostics (unknown property in multi-binding).
import { customAttribute, bindable } from "@aurelia/runtime-html";

@customAttribute({ name: "matrix-tooltip" })
export class MatrixTooltip {
  @bindable text = "";
  @bindable position: "top" | "bottom" | "left" | "right" = "top";
  @bindable delay = 300;
}
