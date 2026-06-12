import { route } from '@aurelia/router';
import { TargetRoute } from './routes/target-route';

@route({
  title: 'Router Static Redirect Target Pressure',
  routes: [
    {
      path: 'legacy',
      redirectTo: 'target',
    },
    {
      id: 'target',
      path: 'target',
      component: TargetRoute,
      title: 'Target',
    },
  ],
})
export class RouterStaticRedirectTargetApp {}
