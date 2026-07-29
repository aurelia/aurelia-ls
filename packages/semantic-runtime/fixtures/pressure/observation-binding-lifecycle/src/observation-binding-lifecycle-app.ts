import { bindable, customElement, valueConverter } from '@aurelia/runtime-html';
import template from './observation-binding-lifecycle-app.html';

@valueConverter('identityValue')
export class IdentityValueValueConverter {
  toView<T>(value: T): T {
    return value;
  }
}

@customElement({
  name: 'lifecycle-value-target',
  template: '<template></template>',
})
export class LifecycleValueTarget {
  @bindable value = 0;
}

@customElement({
  name: 'observation-binding-lifecycle-app',
  template,
  dependencies: [IdentityValueValueConverter],
})
export class ObservationBindingLifecycleApp {
  message = 'Lifecycle';
  eventName = 'blur';
  rateLimitDelay = 250;
  reachedChildValue = 'Reached';
  blockedChildValue = 'Blocked';
  effectiveFromView = 'Target writes this source';
  effectiveToView = 'Source writes the target';
  blockedFromView = 'Authored to-view remains effective';
  attributeFromView = 'Attribute source retained without runtime evaluation';
  attributeTwoWay = 'Attribute initial read with observation';
  attributeInterpolationFromView = 'Interpolation initial read without observation';
  attributeInterpolationTwoWay = 'Interpolation initial read with observation';
  contentFromView = 'Content initial read without observation';
  contentTwoWay = 'Content initial read with observation';

  handleClick(_event: Event): void {}
}
