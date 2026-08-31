import Aurelia, { Registration } from 'aurelia';
import { tasksSettled } from '@aurelia/runtime';
import { RouterConfiguration } from '@aurelia/router';

import { App } from '../../../semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/app.js';
import { ItemCatalogService } from '../../../semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront/src/services/item-catalog-service.js';
import { StorefrontBenchmarkCatalogService } from './benchmark-catalog.js';

export { tasksSettled };

/**
 * Construct the scaled runtime workload without starting it.
 *
 * Dataset allocation, DI registration, host selection, and router configuration remain outside the activation-render
 * interval. The external benchmark page owns `start`, settlement, assertions, measurement publication, and teardown.
 */
export function createStorefrontBenchmarkApplication(host: HTMLElement): Aurelia {
  const aurelia = new Aurelia();
  aurelia.register(
    RouterConfiguration.customize({
      useHref: false,
      useUrlFragmentHash: true,
      activeClass: 'active-route',
    }),
    Registration.instance(ItemCatalogService, new StorefrontBenchmarkCatalogService()),
  );
  aurelia.app({
    component: App,
    host,
  });
  return aurelia;
}
