/**
 * Configuration using function-local spread pattern.
 *
 * This is the key pattern that WP 3.2 enables:
 * The `components` array is defined INSIDE the factory function,
 * not at module level. This requires collecting block bindings
 * from the function body to resolve the spread.
 */
import type { IRegistry, IContainer } from 'aurelia';
import { CardCustomElement } from './card.js';
import { BadgeCustomElement } from './badge.js';
import { IconCustomAttribute } from './icon.js';

interface PluginOptions {
  includeIcons?: boolean;
}

function createPluginConfiguration(_options: PluginOptions): IRegistry {
  // This array is function-local, not module-level!
  // WP 3.2 enhancement enables resolving this spread.
  const components = [
    CardCustomElement,
    BadgeCustomElement,
    IconCustomAttribute,
  ];

  return {
    register(container: IContainer): IContainer {
      return container.register(...components);
    }
  };
}

export const PluginConfiguration = createPluginConfiguration({});
