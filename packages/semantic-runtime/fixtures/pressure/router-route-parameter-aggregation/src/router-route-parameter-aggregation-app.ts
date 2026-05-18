import { customElement } from '@aurelia/runtime-html';
import { route } from '@aurelia/router';
import { AccountRoute } from './routes/account-route';
import template from './router-route-parameter-aggregation-app.html';

@customElement({
  name: 'router-route-parameter-aggregation-app',
  template,
})
@route({
  title: 'Router Route Parameter Aggregation Pressure',
  routes: [
    {
      id: 'account',
      path: 'accounts/:id',
      component: AccountRoute,
    },
  ],
})
export class RouterRouteParameterAggregationApp {}
