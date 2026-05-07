import type { ProductHandle } from '../kernel/handles.js';

/** Project-level compiled-template index visible while runtime/checker analysis runs. */
export class TemplateRuntimeAnalysisProjectContext {
  private readonly compiledTemplatesByDefinition = new Map<ProductHandle, ProductHandle>();

  constructor(
    /** Compiled-template entries admitted before runtime analysis begins. */
    readonly resources: readonly TemplateRuntimeAnalysisResource[],
  ) {
    for (const resource of resources) {
      this.compiledTemplatesByDefinition.set(
        resource.definitionProductHandle,
        resource.compiledTemplateProductHandle,
      );
    }
  }

  readCompiledTemplateForDefinition(
    /** Custom element definition product handle. */
    definitionProductHandle: ProductHandle | null,
  ): ProductHandle | null {
    return definitionProductHandle == null
      ? null
      : this.compiledTemplatesByDefinition.get(definitionProductHandle) ?? null;
  }
}

/** One project-level link from a custom-element definition to its compiled template product. */
export class TemplateRuntimeAnalysisResource {
  constructor(
    /** Custom element definition product handle. */
    readonly definitionProductHandle: ProductHandle,
    /** Compiled template product handle for that definition. */
    readonly compiledTemplateProductHandle: ProductHandle,
  ) {}
}
