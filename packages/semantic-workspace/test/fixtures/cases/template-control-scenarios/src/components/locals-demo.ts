import { customElement } from "@aurelia/runtime-html";
import template from "./locals-demo.html";

interface LocalItem {
  name: string;
  count: number;
}

@customElement({ name: "locals-demo", template })
export class LocalsDemo {
  summary = "Total";
  items: LocalItem[] = [
    { name: "Alpha", count: 1 },
    { name: "Beta", count: 2 },
  ];
}
