import { resolve } from '@aurelia/kernel';
import { customElement } from '@aurelia/runtime-html';
import { IRouteContext } from '@aurelia/router';
import template from './detail-route.html';

@customElement({
  name: 'detail-route',
  template,
})
export class DetailRoute {
  private readonly routeParams = resolve(IRouteContext).getRouteParameters<{ id: string }>();

  get activeId(): string {
    return this.routeParams.id;
  }
}
