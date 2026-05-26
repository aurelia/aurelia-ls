import { customElement, resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { CatalogState } from '../state/catalog-state';
import template from './service-plan-detail-route.html';

@customElement({
  name: 'service-plan-detail-route',
  template,
})
export class ServicePlanDetailRoute {
  readonly state = resolve(CatalogState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    planId: string;
    ref?: string;
  }, 'child-first'>({ includeQueryParams: true, mergeStrategy: 'child-first' });
}
