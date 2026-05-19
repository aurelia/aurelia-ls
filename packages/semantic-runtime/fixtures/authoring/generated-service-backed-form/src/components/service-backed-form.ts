import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
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

  submit(): void {
    void this.state.submitRequest(this.requestId);
  }
}
