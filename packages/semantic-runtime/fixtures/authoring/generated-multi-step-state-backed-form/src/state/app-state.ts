export type WizardStepId = 'profile' | 'preferences' | 'review';
export type ContactMethod = 'email' | 'phone';
export type PlanTier = 'starter' | 'team' | 'enterprise';

export class WizardStep {
  constructor(
    readonly id: WizardStepId,
    readonly title: string,
  ) {}
}

export class FeatureOption {
  constructor(
    readonly id: string,
    readonly name: string,
  ) {}
}

export class OnboardingProfile {
  name = '';
  email = '';
  acceptedTerms = false;
  contactMethod: ContactMethod = 'email';
  planTier: PlanTier | null = null;
  featureIds: string[] = ['reports'];

  get canSubmit(): boolean {
    return this.name !== '' && this.email !== '' && this.acceptedTerms && this.planTier != null;
  }

  get contactSummary(): string {
    return this.contactMethod === 'email' ? this.email : 'Phone call requested';
  }
}

export class AppState {
  readonly profile = new OnboardingProfile();
  readonly steps: readonly WizardStep[] = [
    new WizardStep('profile', 'Profile'),
    new WizardStep('preferences', 'Preferences'),
    new WizardStep('review', 'Review'),
  ];
  readonly availableFeatures: readonly FeatureOption[] = [
    new FeatureOption('reports', 'Reports'),
    new FeatureOption('alerts', 'Alerts'),
    new FeatureOption('integrations', 'Integrations'),
  ];
  readonly starterTier: PlanTier = 'starter';
  readonly teamTier: PlanTier = 'team';
  readonly enterpriseTier: PlanTier = 'enterprise';
  readonly emailContact: ContactMethod = 'email';
  readonly phoneContact: ContactMethod = 'phone';

  currentStepIndex = 0;
  completedProfileCount = 0;

  get currentStep(): WizardStep {
    return this.steps[Math.min(this.currentStepIndex, this.steps.length - 1)]!;
  }

  get progressPercent(): number {
    return ((this.currentStepIndex + 1) / this.steps.length) * 100;
  }

  get canGoBack(): boolean {
    return this.currentStepIndex > 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.steps.length - 1;
  }

  get canGoNext(): boolean {
    if (this.currentStep.id === 'profile') {
      return this.profile.name !== '' && this.profile.email !== '';
    }
    if (this.currentStep.id === 'preferences') {
      return this.profile.planTier != null && this.profile.acceptedTerms;
    }
    return this.profile.canSubmit;
  }

  isCurrentStep(step: WizardStep): boolean {
    return step.id === this.currentStep.id;
  }

  isCompletedStep(step: WizardStep): boolean {
    return this.steps.indexOf(step) < this.currentStepIndex;
  }

  nextStep(): void {
    if (!this.isLastStep) {
      this.currentStepIndex += 1;
    }
  }

  previousStep(): void {
    if (this.canGoBack) {
      this.currentStepIndex -= 1;
    }
  }

  submit(): void {
    if (this.profile.canSubmit) {
      this.completedProfileCount += 1;
    }
  }
}
