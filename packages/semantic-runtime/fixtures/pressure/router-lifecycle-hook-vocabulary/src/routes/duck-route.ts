import { customElement } from '@aurelia/runtime-html';
import type { IRouteConfig } from '@aurelia/router';
import template from './duck-route.html';

@customElement({
  name: 'duck-route',
  template,
})
export class DuckRoute {
  public readonly canUnload = true;

  public getRouteConfig(): IRouteConfig {
    return { routes: [] };
  }

  public loading(): void {}

  public loaded(): void {}
}
