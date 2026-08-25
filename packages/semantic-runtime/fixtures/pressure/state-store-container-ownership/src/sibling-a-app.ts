import { customElement } from '@aurelia/runtime-html';
import { SharedStateView } from './shared-state-view';
import template from './sibling-a-app.html';

@customElement({
  name: 'sibling-a-app',
  template,
  dependencies: [SharedStateView],
})
export class SiblingAApp {}
