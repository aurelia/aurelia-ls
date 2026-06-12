import { route } from '@aurelia/router';
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
export class RouterRouteableAliasApp {}
