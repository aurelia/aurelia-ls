import { bindingBehavior } from "@aurelia/runtime-html";
import type { IBinding, Scope } from "@aurelia/runtime-html";

/**
 * Pattern: Binding behavior with decorator
 * Usage: value.bind="prop & debounce:300"
 */
@bindingBehavior("debounce")
export class DebounceBindingBehavior {
  bind(_scope: Scope, binding: IBinding, delay: number = 200): void {
    // Simplified implementation for testing
    // Real implementation wraps the binding's updateSource
    console.log(`Debounce binding with delay: ${delay}ms`, binding);
  }

  unbind(_scope: Scope, _binding: IBinding): void {
    // Cleanup
  }
}
