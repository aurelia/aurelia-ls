import { customElement, bindable } from "@aurelia/runtime-html";
import template from "./section-panel.html";
import { ItemCard } from "./item-card.js";
import { InfoTag } from "./info-tag.js";

/**
 * Level 2 component: Section containing items.
 * Contains:
 * - Nested repeat (item-card)
 * - Containerless sibling (info-tag)
 * - Text interpolation
 */
@customElement({
  name: "section-panel",
  template,
  dependencies: [ItemCard, InfoTag],
})
export class SectionPanel {
  @bindable section: { name: string; items: Array<{ label: string; active: boolean }> } = {
    name: "",
    items: [],
  };
}
