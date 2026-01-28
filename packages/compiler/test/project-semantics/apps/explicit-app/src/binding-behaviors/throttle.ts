import { bindingBehavior } from "@aurelia/runtime-html";
import type { IBinding, Scope } from "@aurelia/runtime-html";

/**
 * Pattern: Binding behavior with decorator
 * Usage: value.bind="prop & throttle:100"
 */
@bindingBehavior("throttle")
export class ThrottleBindingBehavior {
  bind(_scope: Scope, binding: IBinding, delay: number = 100): void {
    // Simplified implementation for testing
    console.log(`Throttle binding with delay: ${delay}ms`, binding);
  }

  unbind(_scope: Scope, _binding: IBinding): void {
    // Cleanup
  }
}
