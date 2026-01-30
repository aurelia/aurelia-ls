import { customElement } from "@aurelia/runtime-html";
import template from "./my-app.html";

type Entry = {
  total: number;
  name: string;
};

@customElement({ name: "let-edge-cases", template })
export class LetEdgeCases {
  baseTotal = 5;
  entries: Entry[] = [
    { total: 1, name: "One" },
    { total: 2, name: "Two" },
  ];
}
