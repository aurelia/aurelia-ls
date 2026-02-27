import { bindingBehavior, type IBinding } from "@aurelia/runtime-html";

@bindingBehavior("debounce")
export class DebounceBindingBehavior {
  bind(_binding: IBinding, _delay?: number): void {}
  unbind(_binding: IBinding): void {}
}
