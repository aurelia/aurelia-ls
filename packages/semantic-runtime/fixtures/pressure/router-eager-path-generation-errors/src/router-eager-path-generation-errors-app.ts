import { route } from '@aurelia/router';
import { customElement } from '@aurelia/runtime-html';
import { DetailRoute } from './routes/detail-route';
import template from './router-eager-path-generation-errors-app.html';

@route({
  title: 'Router Eager Path Generation Errors Pressure',
  routes: [
    {
      id: 'detail',
      path: 'detail/:id',
      component: DetailRoute,
      title: 'Detail',
    },
  ],
})
@customElement({ name: 'router-eager-path-generation-errors-app', template })
export class RouterEagerPathGenerationErrorsApp {
  readonly detailRoute = DetailRoute;
}
