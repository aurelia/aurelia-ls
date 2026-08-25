import { customElement } from '@aurelia/runtime-html';
import template from './runtime-html-promise-errors-app.html';

@customElement({ name: 'runtime-html-promise-errors-app', template })
export class RuntimeHtmlPromiseErrorsApp {
  task = Promise.resolve('ready');
}
