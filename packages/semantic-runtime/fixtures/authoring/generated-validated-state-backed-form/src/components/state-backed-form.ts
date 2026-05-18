import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { IValidationController, IValidationRules, type ValidationResultTarget } from '@aurelia/validation-html';
import { AppState, type ContactPreference, type RequestTopic } from '../state/app-state';
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
      .on(this)
      .ensure('customerName')
      .required()
      .ensure('email')
      .required()
      .email();
  }


  get customerName(): string {
    return this.request?.customerName ?? '';
  }

  set customerName(value: string) {
    const request = this.request;
    if (request != null) {
      request.customerName = value;
    }
  }

  get email(): string {
    return this.request?.email ?? '';
  }

  set email(value: string) {
    const request = this.request;
    if (request != null) {
      request.email = value;
    }
  }

  get urgent(): boolean {
    return this.request?.urgent ?? false;
  }

  set urgent(value: boolean) {
    const request = this.request;
    if (request != null) {
      request.urgent = value;
    }
  }

  get contactPreference(): ContactPreference {
    return this.request?.contactPreference ?? this.state.emailPreference;
  }

  set contactPreference(value: ContactPreference) {
    const request = this.request;
    if (request != null) {
      request.contactPreference = value;
    }
  }

  get primaryTopic(): RequestTopic | null {
    return this.request?.primaryTopic ?? null;
  }

  set primaryTopic(value: RequestTopic | null) {
    const request = this.request;
    if (request != null) {
      request.primaryTopic = value;
    }
  }

  get topics(): RequestTopic[] {
    return this.request?.topics ?? [];
  }

  get notes(): string {
    return this.request?.notes ?? '';
  }

  set notes(value: string) {
    const request = this.request;
    if (request != null) {
      request.notes = value;
    }
  }

  get canSubmit(): boolean {
    return this.customerName !== '' && this.email !== '';
  }

  async submit(): Promise<void> {
    const result = await this.validationController.validate();
    if (result.valid) {
      this.state.submitRequest(this.requestId);
    }
  }

  private get request() {
    return this.state.readRequest(this.requestId);
  }
}
