import type { ComputationRun } from '../kernel/computation-lifecycle.js';
import type { ProductHandle } from '../kernel/handles.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import type { ProductDetailSlot } from '../kernel/product-details.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { TemplateResourceCompilationEmission } from './template-compilation-project-pass.js';
import { TemplateProductDetails } from './product-details.js';
import type {
  TemplateInstruction,
  TemplateInstructionSequence,
} from './instruction-ir.js';

/** Project-level compiled-template index visible while runtime/checker analysis runs. */
export class TemplateRuntimeAnalysisProjectContext {
  private readonly resourcesByDefinition = new Map<ProductHandle, TemplateRuntimeAnalysisResource>();
  private readonly resourcesBySequence = new Map<ProductHandle, TemplateRuntimeAnalysisResource>();
  private readonly resourcesByInstruction = new Map<ProductHandle, TemplateRuntimeAnalysisResource>();
  private readonly requiredResourcesByLocalKey = new Map<string, TemplateRuntimeAnalysisResource>();

  constructor(
    private readonly publication: ComputationRun,
    /** Compiled-template entries admitted before runtime analysis begins. */
    readonly resources: readonly TemplateRuntimeAnalysisResource[],
  ) {
    for (const resource of resources) {
      const definitionProductHandle = resource.definitionProductHandle;
      if (definitionProductHandle != null) {
        if (this.resourcesByDefinition.has(definitionProductHandle)) {
          throw new Error(
            `Template runtime-analysis context '${resource.analysisContextProductHandle}' contains more than one compilation for definition '${definitionProductHandle}'.`,
          );
        }
        this.resourcesByDefinition.set(definitionProductHandle, resource);
      }
      for (const sequence of resource.compilation.compiledTemplate.instructionSequences) {
        this.resourcesBySequence.set(sequence.productHandle, resource);
      }
      for (const instruction of resource.compilation.compiledTemplate.instructions) {
        this.resourcesByInstruction.set(instruction.productHandle, resource);
      }
    }
  }

  /** Spend every exact compiler product required before analyzing one resource. */
  requireCompilation(
    compilation: TemplateResourceCompilationEmission,
  ): TemplateResourceCompilationEmission {
    const resource = compilation.definition.productHandle == null
      ? new TemplateRuntimeAnalysisResource(compilation)
      : this.resourcesByDefinition.get(compilation.definition.productHandle) ?? null;
    if (resource == null) {
      throw new Error(`Template runtime-analysis context has no resource for '${compilation.localKey}'.`);
    }
    return this.requireResource(resource).compilation;
  }

  readResourceForDefinition(
    /** Custom element definition product handle. */
    definitionProductHandle: ProductHandle | null,
  ): TemplateRuntimeAnalysisResource | null {
    const resource = definitionProductHandle == null
      ? null
      : this.resourcesByDefinition.get(definitionProductHandle) ?? null;
    return resource == null ? null : this.requireResource(resource);
  }

  readInstructionSequence(productHandle: ProductHandle | null): TemplateInstructionSequence | null {
    const resource = productHandle == null ? null : this.resourcesBySequence.get(productHandle) ?? null;
    return resource == null
      ? null
      : this.requireResource(resource).compilation.compiledTemplate.instructionSequences
        .find((sequence) => sequence.productHandle === productHandle) ?? null;
  }

  readResourceForInstructionSequence(
    /** Instruction-sequence product whose owning compiler world is required. */
    productHandle: ProductHandle | null,
  ): TemplateRuntimeAnalysisResource | null {
    const resource = productHandle == null ? null : this.resourcesBySequence.get(productHandle) ?? null;
    return resource == null ? null : this.requireResource(resource);
  }

  readInstruction(productHandle: ProductHandle | null): TemplateInstruction | null {
    const resource = productHandle == null ? null : this.resourcesByInstruction.get(productHandle) ?? null;
    return resource == null
      ? null
      : this.requireResource(resource).compilation.compiledTemplate.instructions
        .find((instruction) => instruction.productHandle === productHandle) ?? null;
  }

  readResourceForInstruction(
    /** Instruction product whose owning compiler world is required. */
    productHandle: ProductHandle | null,
  ): TemplateRuntimeAnalysisResource | null {
    const resource = productHandle == null ? null : this.resourcesByInstruction.get(productHandle) ?? null;
    return resource == null ? null : this.requireResource(resource);
  }

  private requireResource(resource: TemplateRuntimeAnalysisResource): TemplateRuntimeAnalysisResource {
    const compilation = resource.compilation;
    const cached = this.requiredResourcesByLocalKey.get(compilation.localKey) ?? null;
    if (cached != null) {
      return cached;
    }
    for (const read of compilation.registeredReads) {
      this.publication.observe(read);
    }
    const currentDefinition = compilation.definition.productHandle == null
      ? compilation.definition
      : this.requireInput(ResourceProductDetails.Definition, compilation.definition.productHandle);
    if (!(currentDefinition instanceof CustomElementDefinition)) {
      throw new Error(
        `Runtime analysis input ${compilation.definition.productHandle} is not a custom-element definition.`,
      );
    }
    this.requireInput(
      TemplateProductDetails.CompiledTemplate,
      compilation.compiledTemplate.compiledTemplate.productHandle,
    );
    for (const target of compilation.compiledTemplate.renderTargets) {
      this.requireInput(TemplateProductDetails.RenderTarget, target.productHandle);
    }
    for (const sequence of compilation.compiledTemplate.instructionSequences) {
      this.requireInput(TemplateProductDetails.InstructionSequence, sequence.productHandle);
    }
    for (const instruction of compilation.compiledTemplate.instructions) {
      this.requireInput(TemplateProductDetails.Instruction, instruction.productHandle);
    }
    this.requireInput(TemplateProductDetails.World, compilation.compilerWorld.world.productHandle);
    this.requireInput(TemplateProductDetails.ResourceScope, compilation.compilerWorld.resourceScope.productHandle);
    this.requireInput(TemplateProductDetails.RenderingService, compilation.compilerWorld.rendering.productHandle);
    this.requireInput(
      TemplateProductDetails.TemplateCompilerService,
      compilation.compilerWorld.templateCompiler.productHandle,
    );
    this.requireInput(
      TemplateProductDetails.ResourceResolverService,
      compilation.compilerWorld.resourceResolver.productHandle,
    );
    this.requireInput(
      TemplateProductDetails.ExpressionParserService,
      compilation.compilerWorld.expressionParser.productHandle,
    );
    this.requireInput(
      TemplateProductDetails.AttributeMapperService,
      compilation.compilerWorld.attributeMapper.productHandle,
    );
    this.requireInput(
      TemplateProductDetails.BindingCommandResolver,
      compilation.compilerWorld.bindingCommandResolver.productHandle,
    );
    for (const syntax of compilation.authoredAttributeSyntaxes) {
      this.requireInput(TemplateProductDetails.AttributeSyntax, syntax.productHandle);
    }
    const currentCompilation = currentDefinition === compilation.definition
      ? compilation
      : compilation.forGeneration(
          compilation.parentCompilerWorld,
          compilation.compilerWorld,
          currentDefinition,
          compilation.registeredReads,
        );
    const required = currentCompilation === compilation
      ? resource
      : new TemplateRuntimeAnalysisResource(currentCompilation);
    this.requiredResourcesByLocalKey.set(compilation.localKey, required);
    return required;
  }

  private requireInput<TDetail>(
    slot: ProductDetailSlot<TDetail>,
    productHandle: ProductHandle,
  ): TDetail {
    const product = this.publication.read(productHandle);
    if (!(product instanceof MaterializedProduct)) {
      throw new Error(`Runtime analysis input ${slot.detailKind} has no materialized product ${productHandle}.`);
    }
    const detail = this.publication.readProductDetail(slot, productHandle);
    if (detail == null) {
      throw new Error(`Runtime analysis input ${slot.detailKind} has no typed detail for ${productHandle}.`);
    }
    return detail;
  }
}

/** One project-level link from a custom-element definition to its compiled template products. */
export class TemplateRuntimeAnalysisResource {
  constructor(readonly compilation: TemplateResourceCompilationEmission) {}

  /** Root compiler-world product that owns this runtime-analysis cohort. */
  get analysisContextProductHandle(): ProductHandle {
    return this.compilation.analysisContextProductHandle;
  }

  /** Custom element definition product handle, when the resource has been materialized. */
  get definitionProductHandle(): ProductHandle | null {
    return this.compilation.definition.productHandle;
  }

  /** Compiled template product handle for that definition. */
  get compiledTemplateProductHandle(): ProductHandle {
    return this.compilation.compiledTemplate.compiledTemplate.productHandle;
  }

  /** Compiler-front-door emission available for recursive runtime Rendering emulation. */
  get compiledTemplateEmission() {
    return this.compilation.compiledTemplate;
  }

  /** Exact compiler world that parsed, classified, and lowered the compiled template. */
  get compilerWorld() {
    return this.compilation.compilerWorld;
  }
}
