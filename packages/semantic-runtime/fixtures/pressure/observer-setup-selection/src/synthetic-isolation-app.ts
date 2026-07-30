import { customElement } from 'aurelia';
import template from './synthetic-isolation-app.html';
import { FatalObserverTarget } from './observer-targets';

@customElement({
  name: 'synthetic-isolation-app',
  template,
  dependencies: [FatalObserverTarget],
})
export class SyntheticIsolationApp {
  showDetails = true;
  outerMessage = 'outer';
  innerMessage = 'inner';
  count = 1;
}
