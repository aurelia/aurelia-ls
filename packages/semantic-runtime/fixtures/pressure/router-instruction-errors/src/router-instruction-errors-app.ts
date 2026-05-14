import { route } from '@aurelia/router';
import { KnownRoute } from './routes/known-route';

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
export class RouterInstructionErrorsApp {}
