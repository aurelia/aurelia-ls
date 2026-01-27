import type { IContainer, IRegistry } from 'aurelia';

/**
 * This configuration uses dynamic registration that cannot be
 * statically analyzed. The resources are determined at runtime.
 *
 * This pattern should result in a gap with 'manual' confidence
 * and an actionable suggestion to declare resources explicitly.
 */

// Resources come from a function call - cannot trace statically
function getResources() {
  // In real code, this might read from config, environment, etc.
  return [];
}

export const DynamicConfiguration: IRegistry = {
  register(container: IContainer): IContainer {
    // Dynamic: resources determined at runtime
    const resources = getResources();
    resources.forEach(r => container.register(r));

    // Conditional: depends on runtime value
    if (process.env.ENABLE_EXTRAS) {
      // Would register extra resources here
    }

    return container;
  }
};
