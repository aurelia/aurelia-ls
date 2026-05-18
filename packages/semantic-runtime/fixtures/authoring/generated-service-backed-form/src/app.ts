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
  readonly state = resolve(AppState);

  binding(): void {
    void this.state.loadRequests();
  }
}
