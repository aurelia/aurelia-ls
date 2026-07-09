import { customElement } from '@aurelia/runtime-html';
import { route } from '@aurelia/router';
import template from './router-routecontext-topology-app.html';

@customElement({
  name: 'main-route',
  template: '<template>Main route</template>',
})
export class MainRoute {}

@customElement({
  name: 'open-route',
  template: '<template>Open route</template>',
})
export class OpenRoute {}

@customElement({
  name: 'filtered-route',
  template: '<template>Filtered route</template>',
})
export class FilteredRoute {}

@customElement({
  name: 'report-detail-route',
  template: '<template>Report detail</template>',
})
export class ReportDetailRoute {}

@customElement({
  name: 'reports-route',
  template: '<template><au-viewport name="report-detail" used-by="report-detail-route"></au-viewport></template>',
})
@route({
  routes: [
    {
      id: 'report-detail',
      path: 'detail/:reportId',
      component: ReportDetailRoute,
      viewport: 'report-detail',
    },
  ],
})
export class ReportsRoute {}

@customElement({
  name: 'router-routecontext-topology-app',
  template,
})
@route({
  title: 'Router RouteContext Topology Pressure',
  routes: [
    {
      id: 'main',
      path: 'main',
      component: MainRoute,
      viewport: 'main',
    },
    {
      id: 'open',
      path: 'open',
      component: OpenRoute,
    },
    {
      id: 'filtered',
      path: 'filtered',
      component: FilteredRoute,
      viewport: 'filtered',
    },
    {
      id: 'reports',
      path: 'reports',
      component: ReportsRoute,
    },
  ],
})
export class RouterRoutecontextTopologyApp {}
