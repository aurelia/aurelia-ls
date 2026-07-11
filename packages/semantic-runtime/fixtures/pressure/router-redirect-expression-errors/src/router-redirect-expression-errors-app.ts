import { route } from '@aurelia/router';
import { customElement } from '@aurelia/runtime-html';
import { OtherRoute } from './routes/other-route';
import { TargetRoute } from './routes/target-route';
import template from './router-redirect-expression-errors-app.html';

@route({
  title: 'Router Redirect Expression Errors Pressure',
  routes: [
    {
      id: 'legacy',
      path: 'legacy/:itemId',
      redirectTo: 'target+other',
      title: 'Legacy Redirect',
    },
    {
      id: 'target',
      path: 'target',
      component: TargetRoute,
      title: 'Target',
    },
    {
      id: 'other',
      path: 'other',
      component: OtherRoute,
      title: 'Other',
    },
  ],
})
@customElement({ name: 'router-redirect-expression-errors-app', template })
export class RouterRedirectExpressionErrorsApp {}
