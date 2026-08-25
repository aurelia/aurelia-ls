import { customElement } from '@aurelia/runtime-html';
import { route } from '@aurelia/router';
import { AccountRoute } from './routes/account-route';
import { ProjectRoute } from './routes/project-route';
import { SoloRoute } from './routes/solo-route';

@customElement({
  name: 'router-route-context-inherited-ownership-app',
  template: '<template><au-viewport></au-viewport></template>',
})
@route({
  routes: [
    {
      id: 'account',
      path: 'accounts/:accountId',
      component: AccountRoute,
    },
    {
      id: 'project',
      path: 'projects/:projectId',
      component: ProjectRoute,
    },
    {
      id: 'solo',
      path: 'solo/:soloId',
      component: SoloRoute,
    },
  ],
})
export class RouterRouteContextInheritedOwnershipApp {}
