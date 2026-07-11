import { customElement } from 'aurelia';
import { GlobalHelper } from './global-resources';
import template from './local-templates-app.html';
import { SecondaryHost } from './secondary-host';

@customElement({
  name: 'local-templates-app',
  template,
  dependencies: [GlobalHelper, SecondaryHost],
})
export class LocalTemplatesApp {
  message = 'root';
}
