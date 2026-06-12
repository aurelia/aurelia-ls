import type { Scope } from '@aurelia/runtime';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import template from './target-subscriber-binding-behavior-app.html';

class StaticTargetSubscriber {
  handleChange(): void {}
}

export class FirstTargetSubscriberBindingBehavior {
  static readonly $au = {
    type: 'binding-behavior',
    name: 'firstTargetSubscriber',
  } as const;

  bind(
    _scope: Scope,
    binding: { useTargetSubscriber(subscriber: StaticTargetSubscriber): void },
  ): void {
    binding.useTargetSubscriber(new StaticTargetSubscriber());
  }
}

export class SecondTargetSubscriberBindingBehavior {
  static readonly $au = {
    type: 'binding-behavior',
    name: 'secondTargetSubscriber',
  } as const;

  bind(
    _scope: Scope,
    binding: { useTargetSubscriber(subscriber: StaticTargetSubscriber): void },
  ): void {
    binding.useTargetSubscriber(new StaticTargetSubscriber());
  }
}

@customElement({
  name: 'target-subscriber-binding-behavior-app',
  template,
})
export class TargetSubscriberBindingBehaviorApp {
  message = '';
}

new Aurelia()
  .register(
    StandardConfiguration,
    FirstTargetSubscriberBindingBehavior,
    SecondTargetSubscriberBindingBehavior,
  )
  .app({
    host: document.body,
    component: TargetSubscriberBindingBehaviorApp,
  })
  .start();
