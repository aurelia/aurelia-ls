import { route } from '@aurelia/router';
import { SideOnlyRoute } from './routes/side-only-route';

@route({
  title: 'Router Viewport Resolution Errors Pressure',
  routes: [
    {
      id: 'side-only',
      path: 'side-only',
      viewport: 'side',
      component: SideOnlyRoute,
    },
  ],
})
export class RouterViewportResolutionErrorsApp {}
