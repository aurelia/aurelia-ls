import { bindingBehavior, type IBinding } from "@aurelia/runtime-html";

@bindingBehavior("flash")
export class FlashBindingBehavior {
  bind(_binding: IBinding): void {}
  unbind(_binding: IBinding): void {}
}
