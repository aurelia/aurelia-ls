import { customElement } from "@aurelia/runtime-html";
import template from "./data-grid.html";

/**
 * Pattern: Decorator with full config object
 * - name: element name
 * - aliases: alternative tag names
 * - bindables: inline bindable definitions with modes
 * - containerless: no wrapper element
 */
@customElement({
  name: "data-grid",
  template,
  aliases: ["grid", "table-view"],
  bindables: [
    "items",
    { name: "columns", mode: 2 /* toView */ },
    { name: "pageSize", attribute: "page-size" },
  ],
  containerless: true,
})
export class DataGrid {
  items: unknown[] = [];
  columns: string[] = [];
  pageSize: number = 10;
}
