import { bindable, customElement } from '@aurelia/runtime-html';
import template from './observation-binding-lifecycle-app.html';

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
})
export class ObservationBindingLifecycleApp {
  message = 'Lifecycle';
  eventName = 'blur';
  reachedChildValue = 'Reached';
  blockedChildValue = 'Blocked';
}
