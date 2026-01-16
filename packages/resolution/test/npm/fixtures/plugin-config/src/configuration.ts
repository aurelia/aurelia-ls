import type { IContainer, IRegistry } from 'aurelia';
import { DataGridCustomAttribute } from './data-grid.js';
import { GridSortCustomAttribute } from './grid-sort.js';

/**
 * Default components registered by this plugin.
 */
const DefaultComponents = [
  DataGridCustomAttribute,
  GridSortCustomAttribute,
];

/**
 * Plugin configuration.
 * Register this with Aurelia.register() to use the grid components.
 *
 * @example
 * ```typescript
 * import { GridConfiguration } from 'test-plugin-config';
 * Aurelia.register(GridConfiguration);
 * ```
 */
export const GridConfiguration: IRegistry = {
  register(container: IContainer): IContainer {
    return container.register(...DefaultComponents);
  }
};
