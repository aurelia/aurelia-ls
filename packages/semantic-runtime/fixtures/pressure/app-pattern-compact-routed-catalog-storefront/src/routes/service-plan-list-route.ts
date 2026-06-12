import { customElement, resolve } from 'aurelia';
import { CatalogState } from '../state/catalog-state';
import template from './service-plan-list-route.html';

@customElement({
  name: 'service-plan-list-route',
  template,
})
export class ServicePlanListRoute {
  readonly state = resolve(CatalogState);
}
