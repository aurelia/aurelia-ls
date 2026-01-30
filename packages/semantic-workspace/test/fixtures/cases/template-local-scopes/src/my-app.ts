import { customElement } from "@aurelia/runtime-html";
import template from "./my-app.html";

type Detail = {
  info: string;
  score: number;
};

type Item = {
  name: string;
  active: boolean;
  details: Detail;
};

@customElement({ name: "template-local-scopes", template })
export class TemplateLocalScopes {
  items: Item[] = [
    { name: "Alpha", active: true, details: { info: "A", score: 1 } },
    { name: "Beta", active: false, details: { info: "B", score: 2 } },
  ];
  header = "Summary";
}
