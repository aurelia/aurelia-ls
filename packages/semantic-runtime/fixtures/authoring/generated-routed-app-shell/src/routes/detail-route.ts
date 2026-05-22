import { customElement, resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import template from './detail-route.html';

@customElement({
  name: 'detail-route',
  template,
})
export class DetailRoute {
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    itemId: string;
    ref?: string;
  }, 'child-first'>({ includeQueryParams: true, mergeStrategy: 'child-first' });
}
