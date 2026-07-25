import { customElement } from '@aurelia/runtime-html';
import { SharedStateView } from './shared-state-view';
import template from './sibling-b-app.html';

@customElement({
  name: 'sibling-b-app',
  template,
  dependencies: [SharedStateView],
})
export class SiblingBApp {}
