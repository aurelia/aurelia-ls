import { customElement } from 'aurelia';
import { route } from '@aurelia/router';
import { HomeRoute } from './routes/home-route';
import { DetailRoute } from './routes/detail-route';
import template from './app.html';

@route({
  title: 'generated-routed-app-shell',
  routes: [
    {
      path: '',
      redirectTo: 'home',
    },
    {
      id: 'home',
      path: 'home',
      component: HomeRoute,
      title: 'Home',
      viewport: 'main',
    },
    {
      id: 'item-detail',
      path: 'items/:itemId',
      component: DetailRoute,
      title: 'Detail',
      viewport: 'main',
    },
  ],
})
@customElement({
  name: 'app-root',
  template,
  dependencies: [HomeRoute, DetailRoute],
})
export class App {}
