import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { StateBackedForm } from '../components/state-backed-form';
import { AppState } from '../state/app-state';
import template from './form-route.html';

@customElement({
  name: 'form-route',
  template,
  dependencies: [StateBackedForm],
})
export class FormRoute {
  private readonly state = resolve(AppState);

  get selectedRequestId(): string {
    return this.state.selectedRequestId;
  }

  set selectedRequestId(value: string) {
    this.state.selectedRequestId = value;
  }

  get requestIds(): readonly string[] {
    return this.state.requestIds;
  }

  get submittedCount(): number {
    return this.state.submittedCount;
  }
}
