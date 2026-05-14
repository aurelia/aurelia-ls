import { customElement } from '@aurelia/runtime-html';
import { route } from '@aurelia/router';
import { FormRoute } from './routes/form-route';
import template from './app.html';
import './app.css';

@route({
  title: 'generated-routed-state-backed-form',
  routes: [
    {
      id: 'form',
      path: ['', 'form'],
      component: FormRoute,
      title: 'Service Request',
    },
  ],
})
@customElement({
  name: 'app-root',
  template,
  dependencies: [FormRoute],
})
export class App {}
