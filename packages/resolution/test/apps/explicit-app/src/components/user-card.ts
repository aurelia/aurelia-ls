import { customElement, bindable, containerless } from "@aurelia/runtime-html";
import template from "./user-card.html";

/**
 * Pattern: Separate decorators for element config
 * - @customElement for element name
 * - @containerless for containerless rendering
 * - @bindable for individual properties with modes
 */
@customElement({
  name: "user-card",
  template,
})
@containerless
export class UserCard {
  /** Simple bindable - default one-way mode */
  @bindable name: string = "";

  /** Bindable with explicit mode */
  @bindable avatar: string = "";

  /** Two-way bindable */
  @bindable({ mode: 6 /* twoWay */ }) selected: boolean = false;
}
