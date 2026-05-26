import { customElement, resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { CatalogState } from '../state/catalog-state';
import template from './item-detail-route.html';

@customElement({
  name: 'item-detail-route',
  template,
})
export class ItemDetailRoute {
  readonly state = resolve(CatalogState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    itemId: string;
    ref?: string;
  }, 'child-first'>({ includeQueryParams: true, mergeStrategy: 'child-first' });
}
