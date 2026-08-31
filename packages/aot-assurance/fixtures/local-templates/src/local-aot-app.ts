import { customElement } from 'aurelia';

import template from './local-aot-app.html';
import { ConventionLocalApp } from './convention-local-app';
import { OwnedDependency } from './owned-dependency';

@customElement({
  name: 'local-aot-app',
  template,
  dependencies: [OwnedDependency, ConventionLocalApp],
})
export class LocalAotApp {
  message = 'alpha';
  peer = 'peer';
  count = 2;
  showOuter = true;

  add(): void {
    this.count++;
  }

  toggleOuter(): void {
    this.showOuter = !this.showOuter;
  }
}
