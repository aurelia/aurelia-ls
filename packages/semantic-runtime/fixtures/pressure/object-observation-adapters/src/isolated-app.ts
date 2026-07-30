import { customElement } from 'aurelia';
import template from './isolated-app.html';
import { IsolatedObserverTarget } from './isolated-observer-target';

@customElement({
  name: 'isolated-app',
  template,
  dependencies: [IsolatedObserverTarget],
})
export class IsolatedApp {
  message = 'isolated';
}
