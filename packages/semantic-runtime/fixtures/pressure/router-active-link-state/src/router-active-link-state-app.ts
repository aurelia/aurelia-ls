import { route } from '@aurelia/router';
import { customElement } from '@aurelia/runtime-html';
import { HomeRoute } from './routes/home-route';
import { SettingsRoute } from './routes/settings-route';
import template from './router-active-link-state-app.html';

@route({
  title: 'Router Active Link State',
  routes: [
    {
      id: 'home',
      path: 'home',
      component: HomeRoute,
      title: 'Home',
    },
    {
      id: 'settings',
      path: 'settings',
      component: SettingsRoute,
      title: 'Settings',
    },
  ],
})
@customElement({ name: 'router-active-link-state-app', template })
export class RouterActiveLinkStateApp {
  homeActive = false;
  settingsActive = false;
}
