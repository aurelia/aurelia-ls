import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { AppState } from '../state/app-state';
import { FieldShell } from './field-shell';
import template from './state-backed-form.html';

@customElement({
  name: 'state-backed-form',
  template,
  dependencies: [FieldShell],
})
export class StateBackedForm {
  readonly state = resolve(AppState);

  @bindable requestId = '';

  submit(): void {
    this.state.submitRequest(this.requestId);
  }
}
