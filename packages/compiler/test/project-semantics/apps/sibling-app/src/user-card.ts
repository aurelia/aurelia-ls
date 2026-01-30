import { bindable } from "@aurelia/runtime-html";

/**
 * User card component with bindables.
 *
 * Uses sibling-file convention: user-card.ts + user-card.html.
 * Also has @bindable members which should be detected.
 */
export class UserCard {
  @bindable name: string = "";
  @bindable age: number = 0;
  @bindable({ mode: "twoWay" }) selected: boolean = false;

  get displayName(): string {
    return this.name || "Anonymous";
  }
}
