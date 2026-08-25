import type { AureliaPatternExample } from '../pattern-contract.js';

export const formServerValidationErrorsPattern: AureliaPatternExample = {
  patternId: 'form.server-validation-errors',
  title: 'Server validation error merge',
  guidance: {
    summary: 'Map API field validation failures into the scoped validation controller so server errors render beside the same validated controls.',
    whenToUse: [
      'Client-side validation passes but the server can still reject individual fields.',
      'The API returns property-level errors that should appear beside existing validation messages.',
      'You need one error presentation path for client and server validation failures.'
    ],
    whenNotToUse: [
      'The response is a general operational failure rather than field validation.',
      'The form does not use @aurelia/validation-html for client-side validation.',
      'Server errors need a workflow-level recovery screen instead of inline messages.'
    ]
  },
  source: {
    files: [
      {
        path: 'main.ts',
        language: 'ts',
        contents: `import Aurelia from 'aurelia';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
import { ProfileForm } from './profile-form';

void Aurelia
  .register(ValidationHtmlConfiguration)
  .app(ProfileForm)
  .start();
`
      },
      {
        path: 'profile-save-service.ts',
        language: 'ts',
        contents: `import { DI, resolve } from 'aurelia';
import { IHttpClient } from '@aurelia/fetch-client';

export interface ProfileDraft {
  name: string;
  email: string;
}

export interface ServerValidationError {
  property: keyof ProfileDraft;
  message: string;
}

export class ServerValidationFailure extends Error {
  constructor(readonly errors: readonly ServerValidationError[]) {
    super('The profile did not pass server validation.');
  }
}

export class ProfileSaveService {
  private readonly http = resolve(IHttpClient);

  async save(draft: ProfileDraft): Promise<void> {
    const response = await this.http.fetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(draft),
      headers: { 'content-type': 'application/json' }
    });

    if (response.status === 422) {
      const payload = await response.json() as { errors: ServerValidationError[] };
      throw new ServerValidationFailure(payload.errors);
    }

    if (!response.ok) {
      throw new Error('Could not save profile.');
    }
  }
}

export interface IProfileSaveService extends ProfileSaveService {}

export const IProfileSaveService = DI.createInterface<IProfileSaveService>(
  'IProfileSaveService',
  (x) => x.singleton(ProfileSaveService)
);
`
      },
      {
        path: 'profile-form.ts',
        language: 'ts',
        contents: `import { newInstanceForScope, resolve } from '@aurelia/kernel';
import { IValidationRules, type ValidationResult } from '@aurelia/validation';
import { IValidationController } from '@aurelia/validation-html';
import {
  IProfileSaveService,
  ServerValidationFailure,
  type ProfileDraft
} from './profile-save-service';

export class ProfileForm {
  readonly controller = resolve(newInstanceForScope(IValidationController));
  private readonly rules = resolve(IValidationRules);
  private readonly profiles = resolve(IProfileSaveService);

  draft: ProfileDraft = {
    name: '',
    email: ''
  };

  isSaving = false;
  errorMessage = '';
  private serverErrors: ValidationResult[] = [];

  constructor() {
    this.rules
      .on(this.draft)
      .ensure('name')
        .required()
      .ensure('email')
        .required();
  }

  async save(): Promise<void> {
    this.clearServerErrors();
    this.errorMessage = '';

    const result = await this.controller.validate();
    if (!result.valid) {
      return;
    }

    this.isSaving = true;
    try {
      await this.profiles.save(this.draft);
    } catch (error) {
      if (error instanceof ServerValidationFailure) {
        this.applyServerErrors(error);
      } else {
        this.errorMessage = 'The profile could not be saved.';
      }
    } finally {
      this.isSaving = false;
    }
  }

  private applyServerErrors(error: ServerValidationFailure): void {
    for (const item of error.errors) {
      this.serverErrors = [
        ...this.serverErrors,
        this.controller.addError(item.message, this.draft, item.property)
      ];
    }
  }

  clearServerError(property: keyof ProfileDraft): void {
    const remaining: ValidationResult[] = [];
    for (const result of this.serverErrors) {
      if (result.propertyName === property) {
        this.controller.removeError(result);
      } else {
        remaining.push(result);
      }
    }
    this.serverErrors = remaining;
  }

  private clearServerErrors(): void {
    for (const result of this.serverErrors) {
      this.controller.removeError(result);
    }
    this.serverErrors = [];
  }
}
`
      },
      {
        path: 'profile-form.html',
        language: 'html',
        contents: `<form submit.trigger="save()" novalidate>
  <div validation-errors.from-view="nameErrors">
    <label for="profile-name">Name</label>
    <input id="profile-name" value.bind="draft.name & validate:changeOrBlur" input.trigger="clearServerError('name')">
    <p repeat.for="error of nameErrors" role="alert">\${error.result.message}</p>
  </div>

  <div validation-errors.from-view="emailErrors">
    <label for="profile-email">Email</label>
    <input id="profile-email" type="email" value.bind="draft.email & validate:changeOrBlur" input.trigger="clearServerError('email')">
    <p repeat.for="error of emailErrors" role="alert">\${error.result.message}</p>
  </div>

  <p if.bind="errorMessage" role="alert">\${errorMessage}</p>

  <button type="submit" disabled.bind="isSaving">
    \${isSaving ? 'Saving...' : 'Save profile'}
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
        summary: 'Server errors include property names that match the validated form draft.'
      },
      {
        summary: 'Manual server errors should be cleared after edit or before the next submit.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Normalize the API error shape at the service boundary.',
        action: 'Throw one typed server-validation error from the save service so the form component only handles validation semantics.'
      },
      {
        summary: 'Keep server errors in the validation controller.',
        action: 'Use `controller.addError` and `removeError` so field messages render through the same `validation-errors` views.'
      },
      {
        summary: 'Use a general message for non-field failures.',
        action: 'Do not attach network, permission, or unknown failures to a field unless the API says the field is invalid.'
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
        title: 'Fetch Client Forms',
        url: 'https://docs.aurelia.io/aurelia-packages/fetch-client/forms'
      }
    ]
  }
};
