import { customElement, resolve } from 'aurelia';
import { IValidationRules } from '@aurelia/validation';
import { IValidationController, type ValidationResultTarget } from '@aurelia/validation-html';
import { AppState, OnboardingProfile } from '../state/app-state';
import template from './onboarding-wizard.html';

@customElement({
  name: 'onboarding-wizard',
  template,
})
export class OnboardingWizard {
  readonly state = resolve(AppState);
  private readonly validationRules = resolve(IValidationRules);
  private readonly validationController = resolve(IValidationController);

  nameErrors: ValidationResultTarget[] = [];
  emailErrors: ValidationResultTarget[] = [];

  constructor() {
    this.validationRules
      .on(OnboardingProfile)
      .ensure((profile) => profile.name)
      .required()
      .ensure((profile) => profile.email)
      .required()
      .email();
  }

  async next(): Promise<void> {
    const result = await this.validationController.validate();
    if (result.valid && this.state.canGoNext) {
      this.state.nextStep();
    }
  }

  async submit(): Promise<void> {
    const result = await this.validationController.validate();
    if (result.valid) {
      this.state.submit();
    }
  }
}
