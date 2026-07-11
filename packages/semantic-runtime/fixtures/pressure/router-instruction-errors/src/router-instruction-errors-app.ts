import { route } from '@aurelia/router';
import { customElement } from '@aurelia/runtime-html';
import { KnownRoute } from './routes/known-route';
import template from './router-instruction-errors-app.html';

@route({
  title: 'Router Instruction Errors Pressure',
  routes: [
    {
      id: 'known',
      path: 'known',
      component: KnownRoute,
      title: 'Known',
    },
    {
      path: 'old-route',
      redirectTo: 'missing-redirect-target',
    },
  ],
})
@customElement({ name: 'router-instruction-errors-app', template })
export class RouterInstructionErrorsApp {}
