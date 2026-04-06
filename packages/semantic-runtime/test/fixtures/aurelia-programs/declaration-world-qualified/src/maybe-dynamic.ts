import { customElement } from "./aurelia.js";

function buildDynamicName() {
  return `maybe-${Date.now()}`;
}

@customElement({ name: buildDynamicName() })
export class MaybeDynamic {}
