import { customElement } from '@aurelia/runtime-html';
import { route } from '@aurelia/router';
import { DetailRoute } from './detail-route';
import template from './account-route.html';

@customElement({
  name: 'account-route',
  template,
})
@route({
  routes: [
    {
      id: 'detail',
      path: 'details/:id',
      component: DetailRoute,
    },
  ],
})
export class AccountRoute {}
