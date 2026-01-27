import type { IContainer, IRegistry } from 'aurelia';
import { ModalCustomElement } from './modal.js';
import { TooltipCustomAttribute } from './tooltip.js';
import { CurrencyValueConverter } from './currency.js';

/**
 * Default components registered by this plugin.
 */
const DefaultComponents = [
  ModalCustomElement,
  TooltipCustomAttribute,
  CurrencyValueConverter,
];

/**
 * Configuration options for the modal plugin.
 */
export interface ModalConfigurationOptions {
  /** Default animation duration in ms */
  animationDuration?: number;
  /** Whether to close on backdrop click */
  closeOnBackdrop?: boolean;
}

/**
 * Create the modal configuration.
 *
 * This is the factory pattern - the configuration is created via function call
 * rather than being a direct object literal.
 *
 * @example
 * ```typescript
 * import { ModalConfiguration } from 'test-factory-config';
 * Aurelia.register(ModalConfiguration);
 * ```
 */
function createModalConfiguration(_options: ModalConfigurationOptions): IRegistry {
  return {
    register(container: IContainer): IContainer {
      return container.register(...DefaultComponents);
    }
  };
}

/**
 * Plugin configuration (pre-created with default options).
 *
 * Pattern: export const X = createX({});
 * The exported value is the result of calling a factory function.
 */
export const ModalConfiguration = createModalConfiguration({});
