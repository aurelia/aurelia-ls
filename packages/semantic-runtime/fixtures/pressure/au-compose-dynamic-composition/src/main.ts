import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { StateDefaultConfiguration } from '@aurelia/state';
import {
  ComposeDashboardApp,
  StableWidgetKitValueConverter,
  dashboardStateHandler,
  initialDashboardState,
} from './compose-dashboard-app';

new Aurelia()
  .register(
    StandardConfiguration,
    StableWidgetKitValueConverter,
    StateDefaultConfiguration.init(initialDashboardState, dashboardStateHandler),
  )
  .app({
    host: document.body,
    component: ComposeDashboardApp,
  })
  .start();
