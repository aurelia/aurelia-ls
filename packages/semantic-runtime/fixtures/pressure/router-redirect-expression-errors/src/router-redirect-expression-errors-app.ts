import { route } from '@aurelia/router';
import { OtherRoute } from './routes/other-route';
import { TargetRoute } from './routes/target-route';

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
export class RouterRedirectExpressionErrorsApp {}
