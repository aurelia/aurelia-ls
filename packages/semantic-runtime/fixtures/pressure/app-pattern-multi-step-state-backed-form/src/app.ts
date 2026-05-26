import { customElement, resolve } from 'aurelia';
import { AppState } from './state/app-state';
import { OnboardingWizard } from './components/onboarding-wizard';
import template from './app.html';
import './app.css';

@customElement({
  name: 'app-root',
  template,
  dependencies: [OnboardingWizard],
})
export class App {
  readonly state = resolve(AppState);
}
