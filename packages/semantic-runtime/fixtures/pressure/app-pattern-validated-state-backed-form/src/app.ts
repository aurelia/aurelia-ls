import { customElement, resolve } from 'aurelia';
import { StateBackedForm } from './components/state-backed-form';
import { AppState } from './state/app-state';
import template from './app.html';
import './app.css';

@customElement({
  name: 'app-root',
  template,
  dependencies: [StateBackedForm],
})
export class App {
  readonly state = resolve(AppState);
}
