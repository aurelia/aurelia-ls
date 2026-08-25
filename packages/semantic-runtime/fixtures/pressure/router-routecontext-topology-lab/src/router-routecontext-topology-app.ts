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
  name: 'bound-route',
  template: '<template>Bound route</template>',
})
export class BoundRoute {}

@customElement({
  name: 'dynamic-route',
  template: '<template>Dynamic route</template>',
})
export class DynamicRoute {}

@customElement({
  name: 'dynamic-used-by-route',
  template: '<template>Dynamic used-by route</template>',
})
export class DynamicUsedByRoute {}

@customElement({
  name: 'conditional-route',
  template: '<template>Conditional route</template>',
})
export class ConditionalRoute {}

@customElement({
  name: 'shared-route',
  template: '<template>Shared route</template>',
})
export class SharedRoute {}

@customElement({
  name: 'missing-route',
  template: '<template>Missing route</template>',
})
export class MissingRoute {}

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
      id: 'bound',
      path: 'bound',
      component: BoundRoute,
      viewport: 'bound',
    },
    {
      id: 'dynamic',
      path: 'dynamic',
      component: DynamicRoute,
      viewport: 'dynamic',
    },
    {
      id: 'dynamic-used-by',
      path: 'dynamic-used-by',
      component: DynamicUsedByRoute,
      viewport: 'dynamic-used-by',
    },
    {
      id: 'conditional',
      path: 'conditional',
      component: ConditionalRoute,
      viewport: 'conditional',
    },
    {
      id: 'shared',
      path: 'shared',
      component: SharedRoute,
      viewport: 'shared',
    },
    {
      id: 'missing',
      path: 'missing',
      component: MissingRoute,
      viewport: 'missing',
    },
    {
      id: 'unresolved',
      path: 'unresolved',
      component: 'unregistered-routeable',
      viewport: 'main',
    },
    {
      id: 'reports',
      path: 'reports',
      component: ReportsRoute,
      viewport: 'side',
    },
  ],
})
export class RouterRoutecontextTopologyApp {
  readonly boundViewportName = 'bound';
  readonly boundUsedBy = 'bound-route';
  readonly boundDefault = 'main-route';
  readonly boundFallback = 'open-route';
  readonly dynamicViewportName = window.location.hash.slice(1);
  readonly dynamicUsedBy = window.location.pathname;
  readonly showConditionalViewport = window.matchMedia('(min-width: 60rem)').matches;
}
