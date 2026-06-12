import { IContainer, inject, resolve } from '@aurelia/kernel';
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
  private readonly erasedContainer = resolve(IContainer) as any;
  private readonly decoratorFactoryIsNotRules = inject(IValidationRules) as any;
  private readonly localRules = new ValidationRules();

  constructor() {
    const shadowedRules = resolve(IValidationRules);
    void shadowedRules;
    {
      const shadowedRules = new ValidationRules();
      shadowedRules
        .ensure('shadowed')
        .withMessage('Shadowed local lookalikes should not inherit framework root status by name.');
    }
  }

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

    this.erasedContainer
      .get(IValidationRules)
      .ensure('container-root')
      .withMessage('Container-returned validation rules stay framework-rooted when the receiver type is erased.');

    this.rules.applyModelBasedRules(Person, [
      new ModelBasedRule({
        '': { rules: [{ required: {} }] },
        name: { rules: [{ required: {}, customRule: {} }] },
      }),
    ]);

    this.localRules
      .ensure('name')
      .withMessage('Local lookalikes should not produce Aurelia validation diagnostics.');

    this.decoratorFactoryIsNotRules
      .ensure('name')
      .withMessage('The inject decorator factory is not a validation rules service root.');
  }
}

class ValidationRules {
  ensure(_name: string): PropertyRule {
    return new PropertyRule();
  }
}

class PropertyRule {
  withMessage(_message: string): this {
    return this;
  }
}
