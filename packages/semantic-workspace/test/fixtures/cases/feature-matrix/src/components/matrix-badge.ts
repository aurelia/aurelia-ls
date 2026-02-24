// CE: convention form (paired .ts/.html), containerless.
// Exercises: convention discovery provenance, containerless hover display,
// definition navigation for convention resources.
import { containerless, bindable } from "@aurelia/runtime-html";

@containerless
export class MatrixBadge {
  @bindable value = "";
}
