import { Route } from '@aurelia/router';
import { CrossModuleRoute } from './cross-module-route';

Route.configure({
  id: 'cross-module-first',
  path: 'cross-module-first',
}, CrossModuleRoute);
