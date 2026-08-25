import { route } from '@aurelia/router';
import { customElement } from '@aurelia/runtime-html';
import { SideOnlyRoute } from './routes/side-only-route';
import template from './router-viewport-resolution-errors-app.html';

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
@customElement({ name: 'router-viewport-resolution-errors-app', template })
export class RouterViewportResolutionErrorsApp {}
