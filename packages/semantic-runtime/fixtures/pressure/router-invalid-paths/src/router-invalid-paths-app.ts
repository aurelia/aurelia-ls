import { route } from '@aurelia/router';
import { customElement } from '@aurelia/runtime-html';
import { InvalidRouteTarget } from './routes/invalid-route-target';
import template from './router-invalid-paths-app.html';

@route({
  title: 'Router Invalid Paths Pressure',
  routes: [
    {
      id: 'reserved-dynamic',
      path: 'orders/:$$residue',
      component: InvalidRouteTarget,
      title: 'Reserved Dynamic',
    },
    {
      id: 'reserved-star',
      path: 'files/*$$residue',
      component: InvalidRouteTarget,
      title: 'Reserved Star',
    },
    {
      id: 'invalid-constraint',
      path: 'reports/:kind{{[}}',
      component: InvalidRouteTarget,
      title: 'Invalid Constraint',
    },
  ],
})
@customElement({ name: 'router-invalid-paths-app', template })
export class RouterInvalidPathsApp {}
