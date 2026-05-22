import { route } from '@aurelia/router';
import { HomeRoute } from './routes/home-route';
import { SettingsRoute } from './routes/settings-route';

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
export class RouterActiveLinkStateApp {
  homeActive = false;
  settingsActive = false;
}
