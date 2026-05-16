import { resolve } from '@aurelia/kernel';
import { customElement } from '@aurelia/runtime-html';
import {
  IValidationController,
  IValidationRules,
} from '@aurelia/validation-html';
import template from './dynamic-keyed-validation-app.html';

type PersonField = 'name' | 'email';
type AddressField = 'address';
type AddressLineField = 'line1' | 'line2';

interface Person {
  name: string;
  email: string;
  address: Record<AddressLineField, string>;
}

@customElement({
  name: 'dynamic-keyed-validation-app',
  template,
})
export class DynamicKeyedValidationApp {
  private readonly validationRules = resolve(IValidationRules);
  private readonly validationController = resolve(IValidationController);

  readonly fields: readonly PersonField[] = ['name', 'email'];
  readonly labels: Record<PersonField, string> = {
    name: 'Name',
    email: 'Email',
  };
  readonly addressLabels: Record<AddressLineField, string> = {
    line1: 'Line 1',
    line2: 'Line 2',
  };
  readonly addressField: AddressField = 'address';
  readonly line1Field: AddressLineField = 'line1';
  readonly lineFields: readonly AddressLineField[] = ['line1', 'line2'];

  readonly person: Person = {
    name: '',
    email: '',
    address: {
      line1: '',
      line2: '',
    },
  };

  constructor() {
    this.validationRules
      .on(this.person)
      .ensure('name')
      .required()
      .ensure('email')
      .required()
      .email()
      .ensure((person) => person.address.line1)
      .required();
  }

  async submit(): Promise<void> {
    await this.validationController.validate();
  }
}
