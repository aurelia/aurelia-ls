import type { ResourceReferenceRef } from './refs.js';
import { Container } from './container.js';
import type { Resolver } from './resolver.js';

// This mirrors the runtime resource resolver boundary: template-side work asks
// for resource meaning through one component instead of reaching into container
// state directly.
export class ResourceResolver {
  resolve(
    reference: ResourceReferenceRef,
    container: Container,
  ): Resolver | null {
    if (reference.key == null) {
      return null;
    }

    return container.findResource(reference.key);
  }
}
