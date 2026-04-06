import { customElement } from "./aurelia.js";

function buildInlineTemplate() {
  return `${Math.random() > 0.5 ? "<maybe-inline>" : "<other-inline>"}${value}</maybe-inline>`;
}

@customElement({
  name: "maybe-inline",
  template: buildInlineTemplate()
})
export class MaybeInline {}
