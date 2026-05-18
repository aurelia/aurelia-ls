import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { AppState } from '../state/app-state';
import template from './summary-route.html';

@customElement({
  name: 'summary-route',
  template,
})
export class SummaryRoute {
  readonly state = resolve(AppState);
}
