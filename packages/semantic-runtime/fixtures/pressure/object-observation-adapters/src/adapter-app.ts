import { customElement } from 'aurelia';
import template from './adapter-app.html';
import { AdapterObserverTarget } from './adapter-observer-target';

@customElement({
  name: 'adapter-app',
  template,
  dependencies: [AdapterObserverTarget],
})
export class AdapterApp {
  message = 'adapter';
}
