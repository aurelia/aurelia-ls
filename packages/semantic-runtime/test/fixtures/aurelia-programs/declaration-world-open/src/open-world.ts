import { customElement } from "./aurelia.js";

function readOpenName() {
  return `${Math.random()}-panel`;
}

@customElement({ name: readOpenName() })
export class OpenWorld {}
