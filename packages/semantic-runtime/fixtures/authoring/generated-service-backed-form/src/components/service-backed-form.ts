import { bindable, customElement, resolve } from 'aurelia';
import { AppState } from '../state/app-state';
import { FieldShell } from './field-shell';
import template from './service-backed-form.html';

@customElement({
  name: 'service-backed-form',
  template,
  dependencies: [FieldShell],
})
export class ServiceBackedForm {
  readonly state = resolve(AppState);

  @bindable requestId = '';
}
