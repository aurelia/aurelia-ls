/**
 * Factory Configuration Using Runtime Arguments
 *
 * This pattern uses factory arguments to conditionally register resources.
 * Since the argument value is only known at runtime, static analysis
 * cannot determine which resources will be registered.
 *
 * Expected behavior: Gap reported for conditional/dynamic registration
 */
import type { IRegistry, IContainer } from 'aurelia';
import { BasicElement } from './basic.js';
import { AdvancedElement } from './advanced.js';

interface PluginOptions {
  useAdvanced?: boolean;
}

function createPluginConfiguration(options: PluginOptions): IRegistry {
  // This uses a runtime argument - cannot be statically analyzed!
  const components = options.useAdvanced
    ? [AdvancedElement]
    : [BasicElement];

  return {
    register(container: IContainer): IContainer {
      return container.register(...components);
    }
  };
}

// The actual options are runtime values
export const PluginConfiguration = createPluginConfiguration({ useAdvanced: true });
