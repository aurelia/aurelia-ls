import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { ServiceBackedForm } from './components/service-backed-form';
import { AppState } from './state/app-state';
import template from './app.html';
import './app.css';

@customElement({
  name: 'app-root',
  template,
  dependencies: [ServiceBackedForm],
})
export class App {
  private readonly state = resolve(AppState);

  get requestIds(): readonly string[] {
    return this.state.requestIds;
  }

  get selectedRequestId(): string {
    return this.state.selectedRequestId;
  }

  set selectedRequestId(value: string) {
    this.state.selectedRequestId = value;
  }

  get submittedCount(): number {
    return this.state.submittedCount;
  }
}
