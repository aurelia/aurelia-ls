import { customElement } from "@aurelia/runtime-html";
import template from "./my-app.html";

type LoadResult = {
  show: boolean;
  items: { label: string }[];
};

@customElement({ name: "portal-deep-nesting", template })
export class PortalDeepNesting {
  target = "#portal-root";
  loadTask: Promise<LoadResult> = Promise.resolve({
    show: true,
    items: [{ label: "One" }, { label: "Two" }],
  });
}
