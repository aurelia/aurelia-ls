import { customElement } from "@aurelia/runtime-html";
import template from "./projection-demo.html";
import { MyCard } from "./my-card.js";

interface CardItem {
  label: string;
}

@customElement({ name: "projection-demo", template })
export class ProjectionDemo {
  static dependencies = [MyCard];

  title = "Projection";
  query = "";
  items: CardItem[] = [
    { label: "Alpha" },
    { label: "Beta" },
  ];
}
