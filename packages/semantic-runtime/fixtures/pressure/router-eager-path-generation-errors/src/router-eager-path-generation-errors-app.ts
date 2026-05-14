import { route } from '@aurelia/router';
import { DetailRoute } from './routes/detail-route';

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
export class RouterEagerPathGenerationErrorsApp {
  readonly detailRoute = DetailRoute;
}
