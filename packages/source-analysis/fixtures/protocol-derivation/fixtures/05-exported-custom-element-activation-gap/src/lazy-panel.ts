import { DI } from '@aurelia/kernel';
import { bindable, customElement } from '@aurelia/runtime-html';
import template from './lazy-panel.html';

export interface LoadState {
  ready: boolean;
}

export const ILoadState = DI.createInterface<LoadState>('ILoadState');

@customElement({ name: 'lazy-panel', template })
export class LazyPanel {
  @bindable public content: string = '';

  public constructor(@ILoadState private readonly loadState: LoadState) {}

  public get status(): string {
    return this.loadState.ready ? 'ready' : 'pending';
  }
}
