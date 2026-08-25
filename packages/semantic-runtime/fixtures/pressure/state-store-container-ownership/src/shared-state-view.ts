import { customElement } from '@aurelia/runtime-html';
import { fromState } from '@aurelia/state';
import template from './shared-state-view.html';

@customElement({
  name: 'shared-state-view',
  template,
})
export class SharedStateView {
  @fromState<{ sharedValue: unknown }, unknown>((state) => state.sharedValue)
  sharedFromStore: unknown = undefined;
}
