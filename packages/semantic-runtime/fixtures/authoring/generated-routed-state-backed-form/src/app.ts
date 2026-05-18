import { customElement } from '@aurelia/runtime-html';
import { route } from '@aurelia/router';
import { FormRoute } from './routes/form-route';
import { SummaryRoute } from './routes/summary-route';
import template from './app.html';
import './app.css';

@route({
  title: 'generated-routed-state-backed-form',
  routes: [
    {
      path: '',
      redirectTo: 'form/request-1',
    },
    {
      id: 'form',
      path: 'form/:requestId',
      component: FormRoute,
      title: 'Service Request',
      viewport: 'main',
    },
    {
      id: 'summary',
      path: 'summary',
      component: SummaryRoute,
      title: 'Activity',
      viewport: 'sidebar',
    },
  ],
})
@customElement({
  name: 'app-root',
  template,
  dependencies: [FormRoute, SummaryRoute],
})
export class App {}
