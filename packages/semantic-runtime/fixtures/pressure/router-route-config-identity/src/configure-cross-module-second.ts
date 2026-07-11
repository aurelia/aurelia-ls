import { Route } from '@aurelia/router';
import { CrossModuleRoute } from './cross-module-route';

Route.configure({
  id: 'cross-module-second',
  path: 'cross-module-second',
}, CrossModuleRoute);
