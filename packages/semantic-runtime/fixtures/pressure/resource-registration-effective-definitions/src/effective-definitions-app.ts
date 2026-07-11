import { customElement } from 'aurelia';
import template from './effective-definitions-app.html';

@customElement({
  name: 'effective-definitions-app',
  template,
})
export class EffectiveDefinitionsApp {
  message = 'hello';
  enabled = true;
}
