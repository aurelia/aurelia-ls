import { customElement, resolve } from 'aurelia';
import { route } from '@aurelia/router';
import { ServicePlanDetailRoute } from './routes/service-plan-detail-route';
import { ServicePlanListRoute } from './routes/service-plan-list-route';
import { CatalogState } from './state/catalog-state';
import template from './app.html';

@route({
  title: 'Generated Compact Routed Catalog Storefront',
  routes: [
    {
      path: '',
      redirectTo: 'plans',
    },
    {
      id: 'plans',
      path: 'plans',
      component: ServicePlanListRoute,
      title: 'Plans',
      viewport: 'main',
    },
    {
      id: 'service-plan-detail',
      path: 'plans/:planId',
      component: ServicePlanDetailRoute,
      title: 'Service Plan detail',
      viewport: 'main',
    },
  ],
})
@customElement({
  name: 'app-root',
  template,
  dependencies: [ServicePlanListRoute, ServicePlanDetailRoute],
})
export class App {
  readonly state = resolve(CatalogState);

  binding(): void {
    void this.state.loadFeaturedServicePlans();
  }
}
