import type { AureliaPatternExample } from '../pattern-contract.js';

export const formValidationSubmitPattern: AureliaPatternExample = {
  patternId: 'form.validation-submit',
  title: 'Validated form submission',
  guidance: {
    summary: 'Use @aurelia/validation-html when native constraints are not enough and the form needs reusable client-side rules before submit.',
    whenToUse: [
      'The form needs rules beyond native required, type, minlength, maxlength, or pattern constraints.',
      'Errors should appear next to controls and submit should stop when the model is invalid.',
      'The validation controller should be scoped to the form component and its children.'
    ],
    whenNotToUse: [
      'Native browser constraints are enough for the current form.',
      'Validation must be globally shared, generated from a schema, or localized with i18n.',
      'The only missing behavior is mapping server errors after a submit response.'
    ]
  },
  source: {
    files: [
      {
        path: 'main.ts',
        language: 'ts',
        contents: `import Aurelia from 'aurelia';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
import { SignupForm } from './signup-form';

void Aurelia
  .register(ValidationHtmlConfiguration)
  .app(SignupForm)
  .start();
`
      },
      {
        path: 'signup-form.ts',
        language: 'ts',
        contents: `import { newInstanceForScope, resolve } from '@aurelia/kernel';
import { IValidationRules } from '@aurelia/validation';
import { IValidationController } from '@aurelia/validation-html';

export interface SignupDraft {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export class SignupForm {
  readonly controller = resolve(newInstanceForScope(IValidationController));
  private readonly rules = resolve(IValidationRules);

  draft: SignupDraft = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  isSubmitting = false;
  successMessage = '';

  constructor() {
    this.rules
      .on(this.draft)
      .ensure('name')
        .required()
        .minLength(2)
      .ensure('email')
        .required()
      .ensure('password')
        .required()
        .minLength(8)
      .ensure('confirmPassword')
        .required()
        .satisfies((value, draft) => draft !== undefined && value === draft.password)
        .withMessage('Passwords must match.');
  }

  async submit(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    const result = await this.controller.validate();
    if (!result.valid) {
      return;
    }

    this.isSubmitting = true;
    this.successMessage = '';

    try {
      await this.createAccount(this.draft);
      this.successMessage = 'Account created.';
      this.reset();
    } finally {
      this.isSubmitting = false;
    }
  }

  reset(): void {
    this.draft.name = '';
    this.draft.email = '';
    this.draft.password = '';
    this.draft.confirmPassword = '';
    this.controller.reset();
  }

  private async createAccount(draft: SignupDraft): Promise<void> {
    await Promise.resolve(draft);
  }
}
`
      },
      {
        path: 'signup-form.html',
        language: 'html',
        contents: `<form submit.trigger="submit()" novalidate>
  <div validation-errors.from-view="nameErrors">
    <label for="signup-name">Name</label>
    <input id="signup-name" type="text" value.bind="draft.name & validate:changeOrBlur" autocomplete="name">
    <p repeat.for="error of nameErrors" role="alert">\${error.result.message}</p>
  </div>

  <div validation-errors.from-view="emailErrors">
    <label for="signup-email">Email</label>
    <input id="signup-email" type="email" value.bind="draft.email & validate:changeOrBlur" autocomplete="email">
    <p repeat.for="error of emailErrors" role="alert">\${error.result.message}</p>
  </div>

  <div validation-errors.from-view="passwordErrors">
    <label for="signup-password">Password</label>
    <input id="signup-password" type="password" value.bind="draft.password & validate:changeOrBlur" autocomplete="new-password">
    <p repeat.for="error of passwordErrors" role="alert">\${error.result.message}</p>
  </div>

  <div validation-errors.from-view="confirmErrors">
    <label for="signup-confirm">Confirm password</label>
    <input id="signup-confirm" type="password" value.bind="draft.confirmPassword & validate:changeOrBlur" autocomplete="new-password">
    <p repeat.for="error of confirmErrors" role="alert">\${error.result.message}</p>
  </div>

  <p if.bind="successMessage" role="status">\${successMessage}</p>

  <button type="submit" disabled.bind="isSubmitting">
    \${isSubmitting ? 'Creating...' : 'Create account'}
  </button>
</form>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The validation plugin is registered once during app startup.'
      },
      {
        summary: 'The validated draft object keeps its identity while rules are attached.'
      },
      {
        summary: 'Server-side validation still runs after client-side rules pass.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep rule ownership close to the form model.',
        action: 'Define rules in the form component or a nearby form service so the validated object and template stay easy to review together.'
      },
      {
        summary: 'Choose validation triggers per user experience.',
        action: 'Use `changeOrBlur` for ordinary inline feedback and `manual` when a field should wait until submit or an explicit check.'
      },
      {
        summary: 'Use a server-error pattern for API validation failures.',
        action: 'After submit, map API field errors into the same controller instead of adding a separate error rendering system.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Validation Outcome Recipes',
        url: 'https://docs.aurelia.io/aurelia-packages/validation/outcome-recipes'
      },
      {
        title: 'Validation Controller',
        url: 'https://docs.aurelia.io/aurelia-packages/validation/validation-controller'
      },
      {
        title: 'Validate Binding Behavior',
        url: 'https://docs.aurelia.io/aurelia-packages/validation/validate-binding-behavior'
      }
    ]
  }
};
