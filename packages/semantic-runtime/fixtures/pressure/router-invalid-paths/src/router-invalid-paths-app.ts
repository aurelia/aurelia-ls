import { route } from '@aurelia/router';
import { InvalidRouteTarget } from './routes/invalid-route-target';

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
export class RouterInvalidPathsApp {}
