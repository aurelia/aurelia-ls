import { customElement, resolve } from 'aurelia';
import { AppState } from '../state/app-state';
import template from './summary-route.html';

@customElement({
  name: 'summary-route',
  template,
})
export class SummaryRoute {
  readonly state = resolve(AppState);
}
