import { customElement } from 'aurelia';
import template from './open-computed-app.html';
import { FunctionComputedObserverTarget } from './observer-targets';

@customElement({
  name: 'open-computed-app',
  template,
  dependencies: [FunctionComputedObserverTarget],
})
export class OpenComputedApp {
  message = 'open';
}
