/**
 * Convention-based custom element with @bindable decorators.
 *
 * The class becomes a custom element through template-pairing,
 * but still uses @bindable to declare its bindable properties.
 */
import { bindable } from "@aurelia/runtime-html";
import template from "./user-profile.html";

export class UserProfile {
  @bindable name: string = "";
  @bindable bio: string = "";
  @bindable age: number = 0;
}
