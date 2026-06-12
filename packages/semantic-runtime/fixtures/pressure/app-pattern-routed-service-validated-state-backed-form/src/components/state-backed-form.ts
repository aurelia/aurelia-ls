import { bindable, customElement, resolve } from 'aurelia';
import { IValidationRules } from '@aurelia/validation';
import { IValidationController, type ValidationResultTarget } from '@aurelia/validation-html';
import { AppState, ServiceRequest } from '../state/app-state';
import { FieldShell } from './field-shell';
import template from './state-backed-form.html';

@customElement({
  name: 'state-backed-form',
  template,
  dependencies: [FieldShell],
})
export class StateBackedForm {
  readonly state = resolve(AppState);
  private readonly validationRules = resolve(IValidationRules);
  private readonly validationController = resolve(IValidationController);

  customerNameErrors: ValidationResultTarget[] = [];
  emailErrors: ValidationResultTarget[] = [];

  @bindable requestId = '';

  constructor() {
    this.validationRules
      .on(ServiceRequest)
      .ensure((request) => request.customerName)
      .required()
      .ensure((request) => request.email)
      .required()
      .email();
  }

  async submit(): Promise<void> {
    const result = await this.validationController.validate();
    if (result.valid) {
      this.state.submitRequest(this.requestId);
    }
  }
}
