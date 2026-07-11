import { customElement } from '@aurelia/runtime-html';
import { route } from '@aurelia/router';
import { SharedRoute as FirstSharedRoute } from './routes/first/shared-route';
import { SharedRoute as SecondSharedRoute } from './routes/second/shared-route';

@customElement({
  name: 'router-route-context-parameter-identity-app',
  template: '<template><au-viewport></au-viewport></template>',
})
@route({
  routes: [
    {
      id: 'first-shared',
      path: 'first/:firstId',
      component: FirstSharedRoute,
    },
    {
      id: 'second-shared',
      path: 'second/:secondId',
      component: SecondSharedRoute,
    },
  ],
})
export class RouterRouteContextParameterIdentityApp {}
