import {
  CompiledTemplateRef,
  type ContainerWorldRef,
  type TemplateRef,
} from './refs.js';
import { ResourceResolver } from './resource-resolver.js';

// This stays intentionally narrow for now. It owns template compilation shape,
// but not higher-level navigation APIs like hover or declaration lookup.
export class TemplateCompiler {
  readonly resourceResolver: ResourceResolver;

  constructor(
    private readonly world: ContainerWorldRef,
    resourceResolver: ResourceResolver,
  ) {
    this.resourceResolver = resourceResolver;
  }

  compile(
    template: TemplateRef,
  ): CompiledTemplateRef {
    return new CompiledTemplateRef(
      `compiled:${template.id}`,
      template,
      this.world,
    );
  }
}
