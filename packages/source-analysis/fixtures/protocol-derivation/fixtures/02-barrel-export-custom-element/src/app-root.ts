import { customElement } from '@aurelia/runtime-html';
import { InfoBox } from './index';
import template from './app-root.html';

@customElement({ name: 'app-root', template, dependencies: [InfoBox] })
export class AppRoot {
  public heading = 'Barrel Export';
}
