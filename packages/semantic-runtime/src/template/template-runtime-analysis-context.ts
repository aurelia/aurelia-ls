import type { ProductHandle } from '../kernel/handles.js';
import type { CompiledTemplateEmission } from './compiled-template-materializer.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { TemplateInstruction } from './instruction-ir.js';

/** Project-level compiled-template index visible while runtime/checker analysis runs. */
export class TemplateRuntimeAnalysisProjectContext {
  private readonly resourcesByDefinition = new Map<ProductHandle, TemplateRuntimeAnalysisResource>();

  constructor(
    /** Compiled-template entries admitted before runtime analysis begins. */
    readonly resources: readonly TemplateRuntimeAnalysisResource[],
  ) {
    for (const resource of resources) {
      if (this.resourcesByDefinition.has(resource.definitionProductHandle)) {
        throw new Error(
          `Template runtime-analysis context '${resource.analysisContextProductHandle}' contains more than one compilation for definition '${resource.definitionProductHandle}'.`,
        );
      }
      this.resourcesByDefinition.set(resource.definitionProductHandle, resource);
    }
  }

  readResourceForDefinition(
    /** Custom element definition product handle. */
    definitionProductHandle: ProductHandle | null,
  ): TemplateRuntimeAnalysisResource | null {
    return definitionProductHandle == null
      ? null
      : this.resourcesByDefinition.get(definitionProductHandle) ?? null;
  }

  readCompiledTemplateEmissions(): readonly CompiledTemplateEmission[] {
    return this.resources.flatMap((resource) =>
      resource.compiledTemplateEmission == null ? [] : [resource.compiledTemplateEmission]
    );
  }

  readCompiledTemplateInstructions(): readonly TemplateInstruction[] {
    return this.readCompiledTemplateEmissions().flatMap((emission) => emission.instructions);
  }

}

/** One project-level link from a custom-element definition to its compiled template product. */
export class TemplateRuntimeAnalysisResource {
  constructor(
    /** Root compiler-world product that owns this runtime-analysis cohort. */
    readonly analysisContextProductHandle: ProductHandle,
    /** Custom element definition product handle. */
    readonly definitionProductHandle: ProductHandle,
    /** Compiled template product handle for that definition. */
    readonly compiledTemplateProductHandle: ProductHandle,
    /** Compiler-front-door emission available for recursive runtime Rendering emulation. */
    readonly compiledTemplateEmission: CompiledTemplateEmission,
    /** Exact compiler world that parsed, classified, and lowered the compiled template. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
  ) {}
}
