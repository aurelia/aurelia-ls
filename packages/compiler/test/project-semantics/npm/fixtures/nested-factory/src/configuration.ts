/**
 * Nested Factory Pattern
 *
 * This pattern has a factory that calls another factory internally.
 * This creates a deep call chain that is difficult to analyze statically.
 *
 * Expected behavior: We can still extract resources if the inner factory
 * is resolvable, but complex nesting may produce gaps.
 */
import type { IRegistry, IContainer } from 'aurelia';
import { MyWidget } from './widget.js';

// Inner factory - creates base configuration
function createBaseConfig(): IRegistry {
  return {
    register(container: IContainer): IContainer {
      return container.register(MyWidget);
    }
  };
}

// Outer factory - wraps inner factory (nested call)
function createPluginConfig(): IRegistry {
  // This calls another factory - nested factory pattern
  const base = createBaseConfig();

  return {
    register(container: IContainer): IContainer {
      // Registers the base config and potentially more
      return container.register(base);
    }
  };
}

export const PluginConfiguration = createPluginConfig();
