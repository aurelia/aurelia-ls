import { bindable, customElement } from 'aurelia';
import template from './field-shell.html';

@customElement({
  name: 'field-shell',
  template,
  capture: true,
})
export class FieldShell {
  @bindable inputId = '';
  @bindable label = '';
}
