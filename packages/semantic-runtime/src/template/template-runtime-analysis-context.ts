import type { ProductHandle } from '../kernel/handles.js';
import type { CompiledTemplateEmission } from './compiled-template-materializer.js';
import type { TemplateInstruction } from './instruction-ir.js';

/** Project-level compiled-template index visible while runtime/checker analysis runs. */
export class TemplateRuntimeAnalysisProjectContext {
  private readonly resourcesByDefinition = new Map<ProductHandle, TemplateRuntimeAnalysisResource>();

  constructor(
    /** Compiled-template entries admitted before runtime analysis begins. */
    readonly resources: readonly TemplateRuntimeAnalysisResource[],
  ) {
    for (const resource of resources) {
      this.resourcesByDefinition.set(resource.definitionProductHandle, resource);
    }
  }

  readCompiledTemplateForDefinition(
    /** Custom element definition product handle. */
    definitionProductHandle: ProductHandle | null,
  ): ProductHandle | null {
    return this.readResourceForDefinition(definitionProductHandle)?.compiledTemplateProductHandle ?? null;
  }

  readCompiledTemplateEmissionForDefinition(
    /** Custom element definition product handle. */
    definitionProductHandle: ProductHandle | null,
  ): CompiledTemplateEmission | null {
    return this.readResourceForDefinition(definitionProductHandle)?.compiledTemplateEmission ?? null;
  }

  readCompiledTemplateEmissions(): readonly CompiledTemplateEmission[] {
    return this.resources.flatMap((resource) =>
      resource.compiledTemplateEmission == null ? [] : [resource.compiledTemplateEmission]
    );
  }

  readCompiledTemplateInstructions(): readonly TemplateInstruction[] {
    return this.readCompiledTemplateEmissions().flatMap((emission) => emission.instructions);
  }

  private readResourceForDefinition(
    definitionProductHandle: ProductHandle | null,
  ): TemplateRuntimeAnalysisResource | null {
    return definitionProductHandle == null
      ? null
      : this.resourcesByDefinition.get(definitionProductHandle) ?? null;
  }
}

/** One project-level link from a custom-element definition to its compiled template product. */
export class TemplateRuntimeAnalysisResource {
  constructor(
    /** Custom element definition product handle. */
    readonly definitionProductHandle: ProductHandle,
    /** Compiled template product handle for that definition. */
    readonly compiledTemplateProductHandle: ProductHandle,
    /** Compiler-front-door emission available for recursive runtime Rendering emulation. */
    readonly compiledTemplateEmission: CompiledTemplateEmission | null = null,
  ) {}
}
