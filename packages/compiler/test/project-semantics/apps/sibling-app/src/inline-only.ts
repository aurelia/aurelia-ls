import { customElement } from "@aurelia/runtime-html";

/**
 * Component with inline template (no sibling HTML file).
 *
 * This should NOT be detected by sibling convention
 * because it has an explicit @customElement decorator.
 */
@customElement({
  name: "inline-only",
  template: "<div>Inline template</div>",
})
export class InlineOnly {
  value = "inline";
}
