import { customElement } from "@aurelia/runtime-html";
import template from "./deep-nesting.html";

interface Item {
  label: string;
}

@customElement({ name: "deep-nesting", template })
export class DeepNesting {
  fetchItems: Promise<Item[]> = Promise.resolve([
    { label: "One" },
    { label: "Two" },
  ]);

  outer = "a";
  inner = "x";
  x = "X";
  y = "Y";
}
