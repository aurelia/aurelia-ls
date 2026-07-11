import { route } from '@aurelia/router';
import { customElement } from '@aurelia/runtime-html';
import './routes/aliased-route';

@route({
  title: 'Router Routeable Alias Pressure',
  routes: [
    {
      path: 'alias-route',
      component: 'routeable-alias',
    },
  ],
})
@customElement('router-routeable-alias-app')
export class RouterRouteableAliasApp {}
