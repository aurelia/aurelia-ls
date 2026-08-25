import { customElement } from '@aurelia/runtime-html';
import type { IRouteViewModel } from '@aurelia/router';
import template from './declared-route-like.html';

abstract class DeclaredRouteViewModelBase implements IRouteViewModel {
  public loading(): void {}

  public loaded(): void {}
}

@customElement({
  name: 'declared-route-like',
  template,
})
export class DeclaredRouteLike extends DeclaredRouteViewModelBase {}
