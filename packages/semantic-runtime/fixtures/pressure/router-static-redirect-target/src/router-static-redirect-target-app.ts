import { route } from '@aurelia/router';
import { customElement } from '@aurelia/runtime-html';
import { TargetRoute } from './routes/target-route';
import template from './router-static-redirect-target-app.html';

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
@customElement({ name: 'router-static-redirect-target-app', template })
export class RouterStaticRedirectTargetApp {}
