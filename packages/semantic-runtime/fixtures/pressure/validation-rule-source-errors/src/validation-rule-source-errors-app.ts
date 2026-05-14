import { resolve } from '@aurelia/kernel';
import { customElement } from '@aurelia/runtime-html';
import {
  IValidationRules,
  ModelBasedRule,
} from '@aurelia/validation';

@customElement({
  name: 'validation-rule-source-errors-app',
  template: '<template><input value.bind="name & validate"></template>',
})
export class ValidationRuleSourceErrorsApp {
  name = '';

  constructor() {
    new ValidationRuleSourceErrors().configure();
  }
}

class Person {
  name = '';
  age = 0;
}

function getDynamicKey(): string {
  return 'name';
}

class ValidationRuleSourceErrors {
  private readonly rules = resolve(IValidationRules);

  configure(): void {
    this.rules
      .on(Person)
      .ensure('name')
      .withMessage('Name is required.');

    this.rules
      .ensure((person: any) => person[getDynamicKey()])
      .required();

    this.rules
      .ensureGroup(['name', 'age'], () => ({ property: 'email' }));

    this.rules.applyModelBasedRules(Person, [
      new ModelBasedRule({
        '': { rules: [{ required: {} }] },
        name: { rules: [{ required: {}, customRule: {} }] },
      }),
    ]);
  }
}
