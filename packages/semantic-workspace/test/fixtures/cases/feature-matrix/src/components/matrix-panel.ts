// CE: decorator-object form, multiple bindables with typed fields.
// Exercises: hover (bindable list, types, provenance), completions (bindable
// names, literal values for enum types), definition (navigate to class),
// diagnostics (unknown bindable), semantic tokens (CE tag coloring).
import { customElement, bindable } from "@aurelia/runtime-html";
import type { Severity, MatrixItem } from "../models.js";

@customElement({
  name: "matrix-panel",
  template: `
    <div class="matrix-panel">
      <header>\${title}</header>
      <slot></slot>
    </div>
  `,
})
export class MatrixPanel {
  @bindable title = "Untitled";
  @bindable({ mode: "twoWay" }) count = 0;
  @bindable level: Severity = "info";
  @bindable items: MatrixItem[] = [];
  @bindable({ attribute: "on-refresh", callback: true }) onRefresh?: () => void;
}
