import { customElement } from '@aurelia/runtime-html';
import { route } from '@aurelia/router';
import { ScopedDuplicateRoute } from './routes/scoped-duplicate-route';
import './routes/global-duplicate-route';

@customElement({
  name: 'router-contextual-string-routeable-app',
  template: '<au-viewport></au-viewport>',
  dependencies: [ScopedDuplicateRoute],
})
@route({
  title: 'Router Contextual String Routeable Pressure',
  routes: [
    {
      path: 'child',
      component: 'duplicate-route',
    },
  ],
})
export class RouterContextualStringRouteableApp {}
