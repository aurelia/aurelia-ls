// BB: decorator-string form.
// Exercises: BB hover, BB ampersand completions, BB definition navigation,
// BB semantic tokens.
import { bindingBehavior } from "@aurelia/runtime-html";

@bindingBehavior("rate-limit")
export class RateLimitBindingBehavior {
  bind() {}
  unbind() {}
}
