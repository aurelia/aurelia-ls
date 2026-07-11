import { customElement } from 'aurelia';
import { invalidLocalTemplateComponents } from './invalid-components';
import template from './local-template-errors-app.html';

@customElement({
  name: 'local-template-errors-app',
  template,
  dependencies: [...invalidLocalTemplateComponents],
})
export class LocalTemplateErrorsApp {}
