import { SemanticClaim, claimsForProduct, nullableClaim } from '../kernel/claim.js';
import type { Container } from '../di/container.js';
import {
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
  ContainerContextResolverSlotRequest,
  type ContainerChildMaterializationEmission,
} from '../di/container-materializer.js';
import type {
  ContainerResolverSlot,
  ContainerSelfResolverSlot,
} from '../di/container-slot.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import {
  OpenSeam,
} from '../kernel/open-seam.js';
import type {
  AddressHandle,
  ClaimHandle,
  EvidenceHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  BindingIdentity,
  ConfigurationIdentity,
  CompilerIdentity,
  AureliaResourceIdentity,
  AureliaResourceIdentityKind,
} from '../kernel/identity.js';
import {
  ConfigurationProductDetails,
} from '../configuration/product-details.js';
import {
  ViewFactory,
  type ViewFactoryField,
} from '../configuration/controller.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type BindingKindKey,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import type { CompiledTemplateEmission } from './compiled-template-materializer.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import {
  type RuntimeBinding,
  type RuntimeBindingScopeEffect,
  RuntimeTargetOperation,
} from './runtime-binding.js';
import {
  RuntimeRendererAllocation,
  RuntimeRendererSpreadCompileResult,
  type RuntimeRenderer,
  type RuntimeRendererSpreadCompileRequest,
} from './runtime-renderer.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import {
  TemplateCompilerSpreadCompileRequest,
  TemplateCompilerSpreadCompileState,
  TemplateRenderingRunResult,
  type TemplateRenderingRunRequest,
  type TemplateRenderingTargetPlan,
  type TemplateRenderedInstruction,
} from './compiler-world.js';
import { TemplateProductDetails } from './product-details.js';
import {
  RuntimeControllerCreationRequest,
  RuntimeControllerCreationKind,
  RuntimeControllerFrame,
  type RuntimeControllerInstruction,
  RuntimeControllerLifecycleStage,
  RuntimeControllerLifecycleStepKind,
} from './runtime-controller.js';
import {
  CustomElementDefinition,
  CustomElementCaptureDefinition,
  CustomElementCaptureKind,
  CustomElementTemplateDefinition,
  CustomElementTemplateKind,
  type CustomElementDefinitionField,
} from '../resources/custom-element-definition.js';
import {
  CustomAttributeDefinition,
} from '../resources/custom-attribute-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  runtimeResourceKeyForKind,
  ResourceDefinitionKind,
} from '../resources/resource-kind.js';
import {
  InstructionReference,
  ResourceTargetReference,
} from '../resources/resource-reference.js';
import {
  HydrateElementInstruction,
  HydrateTemplateControllerInstruction,
  AttributeBindingInstruction,
  PropertyBindingInstruction,
  TemplateBindingMode,
  type TemplateInstruction,
  type TemplateInstructionSequence,
} from './instruction-ir.js';
import {
  TemplateExpressionParse,
  TemplateValueSite,
} from './value-site.js';
import {
  RuntimeRenderingSourceSet,
  RuntimeTemplateCompilerSpreadCompileHost,
} from './runtime-spread-compile-host.js';
import type { TemplateRuntimeAnalysisProjectContext } from './template-runtime-analysis-context.js';
import {
  syntheticViewTargetInputs,
} from './runtime-synthetic-view-targets.js';

export interface RuntimeRenderingMaterializationRequest {
  /** Store-local key shared with the template compilation pass. */
  readonly localKey: string;
  /** Custom element definition whose template is being rendered. */
  readonly definition: CustomElementDefinition;
  /** Compiled-template rows that renderer emulation spends into runtime binding models. */
  readonly compiledTemplate: CompiledTemplateEmission;
  /** Runtime AttrSyntax products needed by dynamic spread compilation. */
  readonly attributeSyntax: AttributeSyntaxParseEmission;
  /** Compiler world whose Rendering service selects runtime renderers. */
  readonly compilerWorld: TemplateCompilerWorldEmission;
  /** Project-level compiled-template index available for controller hydration facts. */
  readonly projectContext: TemplateRuntimeAnalysisProjectContext;
}

export class RuntimeRenderingEmission {
  private readonly bindingsByInstruction = new Map<ProductHandle, RuntimeBinding>();
  private readonly effectsByOwner = new Map<ProductHandle, RuntimeBindingScopeEffect[]>();
  private readonly renderContextsByBinding = new Map<ProductHandle, RuntimeBindingRenderContext>();
  private readonly controllersByInstruction = new Map<ProductHandle, RuntimeControllerFrame>();
  private readonly syntheticControllersByTemplateControllerInstruction = new Map<ProductHandle, RuntimeControllerFrame>();

  constructor(
    /** Root custom-element controller that invoked the render pass. */
    readonly rootController: RuntimeControllerFrame,
    /** Runtime controllers created or reached during renderer emulation. */
    readonly controllers: readonly RuntimeControllerFrame[],
    /** Runtime binding instances materialized from lowered instruction products. */
    readonly bindings: readonly RuntimeBinding[],
    /** Immediate renderer-owned target mutations materialized during runtime Rendering. */
    readonly targetOperations: readonly RuntimeTargetOperation[],
    /** Binding effects that can create or mutate runtime template scope. */
    readonly scopeEffects: readonly RuntimeBindingScopeEffect[],
    /** Runtime IViewFactory values created for template-controller embedded views. */
    readonly viewFactories: readonly ViewFactory[],
    /** Generated embedded custom-element definitions carried by runtime IViewFactory values. */
    readonly embeddedDefinitions: readonly CustomElementDefinition[],
    /** Binding render contexts needed by later binding.bind materialization. */
    readonly bindingRenderContexts: readonly RuntimeBindingRenderContext[],
    /** Runtime child containers materialized while renderers created child controllers. */
    readonly childContainers: readonly Container[],
    /** Built-in IContainer self resolver rows installed on runtime child containers. */
    readonly childSelfResolverSlots: readonly ContainerSelfResolverSlot[],
    /** Hydration-context resolver slots installed on runtime child containers. */
    readonly childContextResolverSlots: readonly ContainerResolverSlot[],
    /** Instructions allocated during runtime TemplateCompiler.compileSpread emulation. */
    readonly dynamicInstructions: readonly TemplateInstruction[],
    /** Value sites allocated during runtime TemplateCompiler.compileSpread emulation. */
    readonly dynamicValueSites: readonly TemplateValueSite[],
    /** Expression parses allocated during runtime TemplateCompiler.compileSpread emulation. */
    readonly dynamicExpressionParses: readonly TemplateExpressionParse[],
    /** Open renderer-loop pressures that should remain visible to inquiry. */
    readonly openSeams: readonly OpenSeam[],
    /** Kernel records emitted for binding products, effect products, provenance, and claims. */
    readonly records: readonly KernelStoreRecord[],
  ) {
    for (const binding of bindings) {
      this.bindingsByInstruction.set(binding.instructionProductHandle, binding);
    }
    for (const effect of scopeEffects) {
      let effects = this.effectsByOwner.get(effect.ownerInstructionProductHandle);
      if (effects === undefined) {
        effects = [];
        this.effectsByOwner.set(effect.ownerInstructionProductHandle, effects);
      }
      effects.push(effect);
    }
    for (const context of bindingRenderContexts) {
      this.renderContextsByBinding.set(context.binding.productHandle, context);
    }
    for (const controller of controllers) {
      if (controller.instructionProductHandle != null) {
        this.controllersByInstruction.set(controller.instructionProductHandle, controller);
      }
      if (controller.creationKind === RuntimeControllerCreationKind.SyntheticView
        && controller.syntheticOwnerInstructionProductHandle != null) {
        this.syntheticControllersByTemplateControllerInstruction.set(
          controller.syntheticOwnerInstructionProductHandle,
          controller,
        );
      }
    }
  }

  readBindingForInstruction(productHandle: ProductHandle): RuntimeBinding | null {
    return this.bindingsByInstruction.get(productHandle) ?? null;
  }

  readScopeEffectsForOwner(productHandle: ProductHandle): readonly RuntimeBindingScopeEffect[] {
    return this.effectsByOwner.get(productHandle) ?? [];
  }

  readRenderContextForBinding(productHandle: ProductHandle): RuntimeBindingRenderContext | null {
    return this.renderContextsByBinding.get(productHandle) ?? null;
  }

  readControllerForInstruction(productHandle: ProductHandle): RuntimeControllerFrame | null {
    return this.controllersByInstruction.get(productHandle) ?? null;
  }

  readSyntheticControllerForTemplateControllerInstruction(productHandle: ProductHandle): RuntimeControllerFrame | null {
    return this.syntheticControllersByTemplateControllerInstruction.get(productHandle) ?? null;
  }
}

export class RuntimeBindingRenderContext {
  constructor(
    /** Store-local renderer invocation key that created the binding. */
    readonly local: string,
    /** Runtime binding created by the renderer. */
    readonly binding: RuntimeBinding,
    /** Controller whose Rendering.render loop owns the binding. */
    readonly renderingController: RuntimeControllerFrame,
    /** Runtime target controller selected by renderer dispatch. */
    readonly targetController: RuntimeControllerFrame,
  ) {}
}

class RuntimeCapturedAttributeUsageContext {
  constructor(
    readonly contextInstruction: HydrateElementInstruction,
    readonly requestorDefinitionProductHandle: ProductHandle | null,
    readonly captureSyntaxProductHandles: readonly ProductHandle[],
  ) {}
}

class RuntimeViewFactoryMaterialization {
  constructor(
    readonly templateController: RuntimeControllerFrame,
    readonly viewFactory: ViewFactory,
    readonly definition: CustomElementDefinition,
    readonly instructionSequenceProductHandle: ProductHandle,
    readonly claims: readonly SemanticClaim[],
  ) {}
}

class RuntimeEmbeddedViewDefinitionPublication {
  constructor(
    readonly allocation: RuntimeRendererAllocation,
    readonly definition: CustomElementDefinition,
  ) {}
}

class RuntimeEmbeddedViewDefinitionShape {
  constructor(
    readonly target: ResourceTargetReference,
    readonly key: string,
    readonly capture: CustomElementCaptureDefinition,
    readonly template: CustomElementTemplateDefinition,
    readonly instructions: readonly InstructionReference[],
    readonly fieldProvenance: readonly FieldProvenance<CustomElementDefinitionField>[],
  ) {}
}

class RuntimeControllerPublication {
  constructor(
    readonly claims: readonly SemanticClaim[],
    readonly materializationClaimHandles: readonly ClaimHandle[],
  ) {}
}

class RuntimeBindingPublication {
  constructor(
    readonly local: string,
    readonly instructionClaim: SemanticClaim,
    readonly rendererClaim: SemanticClaim,
    readonly materializationClaimHandles: readonly ClaimHandle[],
  ) {}

  get ownedClaims(): readonly SemanticClaim[] {
    return [this.instructionClaim, this.rendererClaim];
  }
}

class RuntimeTargetOperationPublication {
  constructor(
    readonly local: string,
    readonly claims: readonly SemanticClaim[],
  ) {}
}

class RuntimeScopeEffectPublication {
  constructor(
    readonly local: string,
    readonly claim: SemanticClaim,
  ) {}

  get claimHandles(): readonly ClaimHandle[] {
    return [this.claim.handle];
  }
}

type ClosedRuntimeControllerCreationRequest =
  RuntimeControllerCreationRequest
  & {
    readonly instruction: RuntimeControllerInstruction;
    readonly parent: RuntimeControllerFrame;
  };

/** Materializes renderer-owned controller, binding, scope-effect, provenance, and claim products after Rendering dispatch. */
export class RuntimeRenderingMaterializer {
  private readonly childContainerMaterializer: ContainerChildMaterializer;

  constructor(
    /** Hot analysis store that receives runtime binding products. */
    readonly store: KernelStore,
  ) {
    this.childContainerMaterializer = new ContainerChildMaterializer(store);
  }

  materialize(input: RuntimeRenderingMaterializationRequest): RuntimeRenderingEmission {
    const emission = this.recordsForRendering(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `runtime-rendering:${input.localKey}`));
    }
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: RuntimeRenderingEmission): void {
    for (const binding of emission.bindings) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBinding, binding.productHandle, binding);
    }
    for (const operation of emission.targetOperations) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBindingTargetOperation, operation.productHandle, operation);
    }
    for (const effect of emission.scopeEffects) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBindingScopeEffect, effect.productHandle, effect);
    }
    for (const viewFactory of emission.viewFactories) {
      this.store.productDetails.add(ConfigurationProductDetails.ViewFactory, viewFactory.productHandle, viewFactory);
    }
    for (const definition of emission.embeddedDefinitions) {
      if (definition.productHandle != null) {
        this.store.productDetails.add(ResourceProductDetails.Definition, definition.productHandle, definition);
      }
    }
    for (const instruction of emission.dynamicInstructions) {
      this.store.productDetails.addIfAbsent(TemplateProductDetails.Instruction, instruction.productHandle, instruction);
    }
    for (const site of emission.dynamicValueSites) {
      this.store.productDetails.add(TemplateProductDetails.ValueSite, site.productHandle, site);
    }
    for (const parse of emission.dynamicExpressionParses) {
      this.store.productDetails.add(TemplateProductDetails.ExpressionParse, parse.productHandle, parse);
    }
  }

  private recordsForRendering(input: RuntimeRenderingMaterializationRequest): RuntimeRenderingEmission {
    const records: KernelStoreRecord[] = [];
    const bindings: RuntimeBinding[] = [];
    const targetOperations: RuntimeTargetOperation[] = [];
    const scopeEffects: RuntimeBindingScopeEffect[] = [];
    const viewFactories: ViewFactory[] = [];
    const embeddedDefinitions: CustomElementDefinition[] = [];
    const bindingRenderContexts: RuntimeBindingRenderContext[] = [];
    const childContainerEmissions: ContainerChildMaterializationEmission[] = [];
    const dynamicInstructions: TemplateInstruction[] = [];
    const dynamicValueSites: TemplateValueSite[] = [];
    const dynamicExpressionParses: TemplateExpressionParse[] = [];
    const openSeams: OpenSeam[] = [];
    const claims: SemanticClaim[] = [];
    const source = this.recordsForSource(input.localKey);
    records.push(...source.records);
    const rootController = this.createRootController(input, source);
    const renderTargets = this.renderTargetInputs(input, source, records, openSeams);

    rootController.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Rendering,
      RuntimeControllerLifecycleStepKind.RenderInstructions,
      input.compiledTemplate.compiledTemplate.productHandle,
      input.compiledTemplate.compiledTemplate.sourceAddressHandle,
      'Rendering.render dispatched the root compiled-template instruction rows.',
    );
    const initialRenderResult = input.compilerWorld.rendering.render({
      localKey: input.localKey,
      compiledTemplate: input.compiledTemplate.compiledTemplate,
      targets: renderTargets,
      instructions: input.compiledTemplate.instructions,
      rootController,
      provenanceHandle: source.provenanceHandle,
      host: {
        allocate: (allocationLocal) => this.allocate(allocationLocal),
        createChildController: (creation) => this.createChildController(creation, source, records, childContainerEmissions, openSeams),
        compileSpread: (spread) => this.compileSpread(
          spread,
          input,
          source,
          records,
          dynamicInstructions,
          dynamicValueSites,
          dynamicExpressionParses,
        ),
      },
      renderSurrogate: true,
    } satisfies TemplateRenderingRunRequest);
    const viewFactoryByController = new Map<ProductHandle, RuntimeViewFactoryMaterialization>();
    const renderResults = [
      initialRenderResult,
      ...this.renderSyntheticViewResults(
        input,
        initialRenderResult,
        source,
        records,
        claims,
        viewFactories,
        embeddedDefinitions,
        childContainerEmissions,
        dynamicInstructions,
        dynamicValueSites,
        dynamicExpressionParses,
        openSeams,
        viewFactoryByController,
      ),
    ];
    const renderedInstructions = renderResults.flatMap((result) => result.renderedInstructions);
    const openInstructions = renderResults.flatMap((result) => result.openInstructions);
    const controllers = uniqueRuntimeControllers(renderResults.flatMap((result) => result.controllers));
    const controllerBindingClaimHandles = this.controllerBindingClaimHandles(input.localKey, controllers);

    for (const open of openInstructions) {
      this.recordOpenSeam(
        open.local,
        open.summary,
        open.addressHandle,
        source,
        records,
        openSeams,
      );
    }

    this.recordRenderedInstructions(
      renderedInstructions,
      source,
      records,
      claims,
      targetOperations,
      scopeEffects,
      bindingRenderContexts,
      bindings,
      openSeams,
      controllerBindingClaimHandles,
    );

    for (const controller of controllers) {
      this.recordController(
        `${input.localKey}:controller:${controller.productHandle}`,
        controller,
        input.projectContext,
        source,
        records,
        claims,
        viewFactoryByController,
      );
    }
    records.push(...claims);
    return new RuntimeRenderingEmission(
      rootController,
      controllers,
      bindings,
      targetOperations,
      scopeEffects,
      viewFactories,
      embeddedDefinitions,
      bindingRenderContexts,
      childContainerEmissions.map((emission) => emission.container),
      childContainerEmissions.map((emission) => emission.selfResolverSlot),
      childContainerEmissions.flatMap((emission) => emission.contextResolverSlots),
      dynamicInstructions,
      dynamicValueSites,
      dynamicExpressionParses,
      openSeams,
      records,
    );
  }

  private recordRenderedInstructions(
    renderedInstructions: readonly TemplateRenderedInstruction[],
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    targetOperations: RuntimeTargetOperation[],
    scopeEffects: RuntimeBindingScopeEffect[],
    bindingRenderContexts: RuntimeBindingRenderContext[],
    bindings: RuntimeBinding[],
    openSeams: OpenSeam[],
    controllerBindingClaimHandles: ReadonlyMap<ProductHandle, readonly ClaimHandle[]>,
  ): void {
    for (const rendered of renderedInstructions) {
      if (rendered.renderer.productHandle == null) {
        continue;
      }
      const instructionUsesRendererClaim = this.instructionUsesRendererClaim(
        rendered.local,
        rendered.instruction.productHandle,
        rendered.renderer.productHandle,
        source,
      );
      claims.push(instructionUsesRendererClaim);

      for (const operation of rendered.targetOperations) {
        this.recordTargetOperation(rendered.local, operation, rendered.renderer, source, records, claims, targetOperations, openSeams);
      }

      for (const binding of rendered.bindings) {
        const bindingScopeEffects = rendered.scopeEffects.filter((effect) =>
          effect.binding.productHandle === binding.productHandle
        );
        const scopeEffectClaims = bindingScopeEffects.map((effect) =>
          this.recordScopeEffect(rendered.local, binding, effect, source, records, claims, scopeEffects)
        );
        const targetControllerClaim = rendered.targetController.productHandle === rendered.renderingController.productHandle
          ? null
          : this.runtimeBindingTargetsControllerClaim(
            rendered.local,
            binding.productHandle,
            rendered.targetController.productHandle,
            source,
          );
        const ownerBindingClaim = rendered.bindingOwner == null
          ? null
          : this.runtimeBindingOwnsRuntimeBindingClaim(
            rendered.local,
            rendered.bindingOwner.productHandle,
            binding.productHandle,
            source,
          );
        if (targetControllerClaim != null) {
          claims.push(targetControllerClaim);
        }
        if (ownerBindingClaim != null) {
          claims.push(ownerBindingClaim);
        }
        bindingRenderContexts.push(new RuntimeBindingRenderContext(
          rendered.local,
          binding,
          rendered.renderingController,
          rendered.targetController,
        ));
        this.recordBinding(
          rendered.local,
          binding,
          rendered.renderer,
          source,
          records,
          bindings,
          scopeEffectClaims,
          [
            ...(targetControllerClaim == null ? [] : [targetControllerClaim]),
            ...(ownerBindingClaim == null ? [] : [ownerBindingClaim]),
          ],
          controllerBindingClaimHandles.get(binding.productHandle) ?? [],
        );
      }
    }
  }

  private renderTargetInputs(
    input: RuntimeRenderingMaterializationRequest,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
  ): readonly TemplateRenderingTargetPlan[] {
    const sequencesByProduct = new Map(input.compiledTemplate.instructionSequences.map((sequence) => [sequence.productHandle, sequence]));
    const instructionsByProduct = new Map(input.compiledTemplate.instructions.map((instruction) => [instruction.productHandle, instruction]));
    const targets: TemplateRenderingTargetPlan[] = [];
    input.compiledTemplate.renderTargets.forEach((target, index) => {
      const sequence = sequencesByProduct.get(target.instructionSequenceProductHandle) ?? null;
      if (sequence == null) {
        this.recordOpenSeam(
          `${input.localKey}:target:${index}:missing-instruction-sequence`,
          `Compiled render target '${target.productHandle}' points at an instruction sequence that is not available to runtime Rendering.`,
          target.sourceAddressHandle,
          source,
          records,
          openSeams,
        );
        return;
      }
      const instructions = sequence.instructions
        .map((reference) => reference.productHandle == null
          ? null
          : instructionsByProduct.get(reference.productHandle) ?? null
        )
        .filter((instruction): instruction is NonNullable<typeof instruction> => instruction != null);
      if (instructions.length !== sequence.instructions.length) {
        this.recordOpenSeam(
          `${input.localKey}:target:${index}:missing-instructions`,
          `Compiled instruction sequence '${sequence.productHandle}' contains instruction references that could not be hydrated for runtime Rendering.`,
          sequence.sourceAddressHandle,
          source,
          records,
          openSeams,
        );
      }
      targets.push({ target, sequence, instructions });
    });
    return targets;
  }

  private renderSyntheticViewResults(
    input: RuntimeRenderingMaterializationRequest,
    initialRenderResult: TemplateRenderingRunResult,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    viewFactories: ViewFactory[],
    embeddedDefinitions: CustomElementDefinition[],
    childContainerEmissions: ContainerChildMaterializationEmission[],
    dynamicInstructions: TemplateInstruction[],
    dynamicValueSites: TemplateValueSite[],
    dynamicExpressionParses: TemplateExpressionParse[],
    openSeams: OpenSeam[],
    viewFactoryByController: Map<ProductHandle, RuntimeViewFactoryMaterialization>,
  ): readonly TemplateRenderingRunResult[] {
    const results: TemplateRenderingRunResult[] = [];
    const queue = [...initialRenderResult.controllers];
    const expandedTemplateControllers = new Set<ProductHandle>();

    while (queue.length > 0) {
      const controller = queue.shift()!;
      if (controller.creationKind !== RuntimeControllerCreationKind.TemplateController
        || controller.instructionProductHandle == null
        || expandedTemplateControllers.has(controller.productHandle)) {
        continue;
      }
      expandedTemplateControllers.add(controller.productHandle);

      const result = this.renderSyntheticViewForTemplateController(
        `${input.localKey}:controller:${controller.productHandle}:synthetic-view`,
        input,
        controller,
        source,
        records,
        viewFactories,
        embeddedDefinitions,
        childContainerEmissions,
        dynamicInstructions,
        dynamicValueSites,
        dynamicExpressionParses,
        openSeams,
        viewFactoryByController,
      );
      if (result == null) {
        continue;
      }
      results.push(result);
      queue.push(...result.controllers);
    }

    return results;
  }

  private renderSyntheticViewForTemplateController(
    local: string,
    input: RuntimeRenderingMaterializationRequest,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    viewFactories: ViewFactory[],
    embeddedDefinitions: CustomElementDefinition[],
    childContainerEmissions: ContainerChildMaterializationEmission[],
    dynamicInstructions: TemplateInstruction[],
    dynamicValueSites: TemplateValueSite[],
    dynamicExpressionParses: TemplateExpressionParse[],
    openSeams: OpenSeam[],
    viewFactoryByController: Map<ProductHandle, RuntimeViewFactoryMaterialization>,
  ): TemplateRenderingRunResult | null {
    const instructionProductHandle = controller.instructionProductHandle;
    if (instructionProductHandle == null) {
      return null;
    }
    const instruction = this.store.productDetails.read(TemplateProductDetails.Instruction, instructionProductHandle);
    if (!(instruction instanceof HydrateTemplateControllerInstruction)
      || instruction.childInstructionSequenceProductHandle == null) {
      return null;
    }

    const sequence = this.store.productDetails.read(
      TemplateProductDetails.InstructionSequence,
      instruction.childInstructionSequenceProductHandle,
    );
    if (sequence == null) {
      this.recordOpenSeam(
        `${local}:missing-child-sequence`,
        `Template-controller '${controller.name ?? '(anonymous)'} has a child-view instruction sequence handle, but the sequence detail is not available for synthetic Rendering.render emulation.`,
        controller.sourceAddressHandle,
        source,
        records,
        openSeams,
      );
      return null;
    }

    const viewFactory = this.ensureViewFactoryForTemplateController(
      `${local}:view-factory`,
      controller,
      sequence.productHandle,
      source,
      records,
      viewFactories,
      embeddedDefinitions,
      viewFactoryByController,
    );
    const syntheticController = this.createSyntheticViewController(local, viewFactory, source);
    controller.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Hydration,
      RuntimeControllerLifecycleStepKind.CreateSyntheticView,
      syntheticController.productHandle,
      syntheticController.sourceAddressHandle,
      'IViewFactory.create produced an aggregate synthetic-view controller for nested instruction analysis.',
    );
    const allInstructions = [
      ...input.compiledTemplate.instructions,
      ...dynamicInstructions,
    ];
    const targetInputs = this.syntheticViewRenderingTargetInputs(
      local,
      sequence,
      allInstructions,
      source,
      records,
      openSeams,
    );
    if (targetInputs.length === 0 && sequence.instructions.length > 0) {
      return null;
    }

    syntheticController.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Rendering,
      RuntimeControllerLifecycleStepKind.RenderInstructions,
      sequence.productHandle,
      sequence.sourceAddressHandle,
      'Rendering.render dispatched synthetic-view child instruction rows.',
    );
    return input.compilerWorld.rendering.render({
      localKey: `${input.localKey}:synthetic-view:${syntheticController.productHandle}`,
      compiledTemplate: input.compiledTemplate.compiledTemplate,
      targets: targetInputs,
      instructions: allInstructions,
      rootController: syntheticController,
      provenanceHandle: source.provenanceHandle,
      host: {
        allocate: (allocationLocal) => this.allocate(allocationLocal),
        createChildController: (creation) => this.createChildController(creation, source, records, childContainerEmissions, openSeams),
        compileSpread: (spread) => this.compileSpread(
          spread,
          input,
          source,
          records,
          dynamicInstructions,
          dynamicValueSites,
          dynamicExpressionParses,
        ),
      },
      renderSurrogate: false,
    } satisfies TemplateRenderingRunRequest);
  }

  private ensureViewFactoryForTemplateController(
    local: string,
    controller: RuntimeControllerFrame,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    viewFactories: ViewFactory[],
    embeddedDefinitions: CustomElementDefinition[],
    viewFactoryByController: Map<ProductHandle, RuntimeViewFactoryMaterialization>,
  ): RuntimeViewFactoryMaterialization {
    const existing = viewFactoryByController.get(controller.productHandle) ?? null;
    if (existing != null) {
      return existing;
    }
    const viewFactory = this.recordViewFactory(
      local,
      controller,
      instructionSequenceProductHandle,
      source,
      records,
      viewFactories,
      embeddedDefinitions,
    );
    viewFactoryByController.set(controller.productHandle, viewFactory);
    return viewFactory;
  }

  private createSyntheticViewController(
    local: string,
    viewFactory: RuntimeViewFactoryMaterialization,
    source: RuntimeRenderingSourceSet,
  ): RuntimeControllerFrame {
    const allocation = this.allocate(`${local}:controller`);
    const controller = viewFactory.templateController;
    return new RuntimeControllerFrame(
      RuntimeControllerCreationKind.SyntheticView,
      allocation.productHandle,
      allocation.identityHandle,
      viewFactory.viewFactory.name == null ? 'synthetic-view' : `${viewFactory.viewFactory.name}:synthetic`,
      viewFactory.viewFactory.container,
      controller.containerFrame,
      null,
      null,
      null,
      controller,
      null,
      null,
      null,
      viewFactory.viewFactory.sourceAddressHandle,
      source.provenanceHandle,
      viewFactory.viewFactory.productHandle,
      viewFactory.instructionSequenceProductHandle,
      viewFactory.viewFactory.instructionProductHandle,
    );
  }

  private syntheticViewRenderingTargetInputs(
    local: string,
    sequence: TemplateInstructionSequence,
    instructions: readonly TemplateInstruction[],
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
  ): readonly TemplateRenderingTargetPlan[] {
    const instructionsByProduct = new Map(instructions.map((instruction) => [instruction.productHandle, instruction]));
    const sequenceInstructions = this.instructionsForSequence(
      sequence,
      instructionsByProduct,
      `${local}:target`,
      source,
      records,
      openSeams,
    );
    if (sequenceInstructions.length === 0 && sequence.instructions.length > 0) {
      return [];
    }
    return syntheticViewTargetInputs({
      local,
      sequence,
      instructions: sequenceInstructions,
      allocate: (allocationLocal) => this.allocate(allocationLocal),
    });
  }

  private instructionsForSequence(
    sequence: TemplateInstructionSequence,
    instructionsByProduct: ReadonlyMap<ProductHandle, TemplateInstruction>,
    local: string,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
  ): readonly TemplateInstruction[] {
    const instructions = sequence.instructions
      .map((reference) => reference.productHandle == null
        ? null
        : instructionsByProduct.get(reference.productHandle) ?? null
      )
      .filter((instruction): instruction is TemplateInstruction => instruction != null);
    if (instructions.length !== sequence.instructions.length) {
      this.recordOpenSeam(
        `${local}:missing-instructions`,
        `Compiled instruction sequence '${sequence.productHandle}' contains instruction references that could not be hydrated for runtime Rendering.`,
        sequence.sourceAddressHandle,
        source,
        records,
        openSeams,
      );
    }
    return instructions;
  }

  private compileSpread(
    spread: RuntimeRendererSpreadCompileRequest,
    input: RuntimeRenderingMaterializationRequest,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    dynamicInstructions: TemplateInstruction[],
    dynamicValueSites: TemplateValueSite[],
    dynamicExpressionParses: TemplateExpressionParse[],
  ): RuntimeRendererSpreadCompileResult {
    const contextInstruction = spread.targetController.instructionProductHandle == null
      ? null
      : input.compiledTemplate.instructions.find((instruction) =>
        instruction.productHandle === spread.targetController.instructionProductHandle
      ) ?? null;
    const usageContexts = contextInstruction instanceof HydrateElementInstruction
      ? [new RuntimeCapturedAttributeUsageContext(
        contextInstruction,
        contextInstruction.definitionProductHandle,
        contextInstruction.captureSyntaxProductHandles,
      )]
      : this.captureSyntaxUsageContextsForDefinition(input.definition.productHandle);
    if (usageContexts.length === 0) {
      return RuntimeRendererSpreadCompileResult.noCapturedAttributes(spread.instruction.sourceAddressHandle);
    }
    const syntaxesByProduct = new Map([
      ...this.store.productDetails.readBySlot(TemplateProductDetails.AttributeSyntax).map((entry) =>
        [entry.productHandle, entry.detail] as const
      ),
      ...input.attributeSyntax.syntaxes.map((syntax) => [syntax.productHandle, syntax] as const),
    ]);
    const instructions: TemplateInstruction[] = [];
    const createdInstructions: TemplateInstruction[] = [];
    let compiledAny = false;

    for (const [index, usage] of usageContexts.entries()) {
      const capturedSyntaxes = usage.captureSyntaxProductHandles
        .map((productHandle) => syntaxesByProduct.get(productHandle) ?? null)
        .filter((syntax): syntax is NonNullable<typeof syntax> => syntax != null);
      if (capturedSyntaxes.length !== usage.captureSyntaxProductHandles.length) {
        return RuntimeRendererSpreadCompileResult.open(
          'TemplateCompiler.compileSpread found captured attribute handles, but not every handle resolved to an AttrSyntax product.',
          spread.instruction.sourceAddressHandle,
        );
      }

      const request = new TemplateCompilerSpreadCompileRequest(
        `${spread.local}:capture-usage:${index}`,
        usage.requestorDefinitionProductHandle,
        capturedSyntaxes,
        spread.instruction,
        spread.target,
        null,
      );
      const spreadCompileHost = new RuntimeTemplateCompilerSpreadCompileHost(
        this.store,
        input.compilerWorld,
        source,
        records,
        dynamicInstructions,
        dynamicValueSites,
        dynamicExpressionParses,
      );
      const result = input.compilerWorld.templateCompiler.compileSpread(request, spreadCompileHost);

      switch (result.state) {
        case TemplateCompilerSpreadCompileState.NoCapturedAttributes:
          break;
        case TemplateCompilerSpreadCompileState.Compiled:
          compiledAny = true;
          instructions.push(...result.instructions);
          createdInstructions.push(...result.createdInstructions);
          break;
        case TemplateCompilerSpreadCompileState.Open:
          return RuntimeRendererSpreadCompileResult.open(
            result.summary ?? 'TemplateCompiler.compileSpread remained open.',
            spread.instruction.sourceAddressHandle,
          );
      }
    }
    return compiledAny
      ? RuntimeRendererSpreadCompileResult.compiled(
        instructions,
        createdInstructions,
        spread.instruction.sourceAddressHandle,
      )
      : RuntimeRendererSpreadCompileResult.noCapturedAttributes(spread.instruction.sourceAddressHandle);
  }

  private captureSyntaxUsageContextsForDefinition(
    definitionProductHandle: ProductHandle | null,
  ): readonly RuntimeCapturedAttributeUsageContext[] {
    if (definitionProductHandle == null) {
      return [];
    }
    const result: RuntimeCapturedAttributeUsageContext[] = [];
    for (const entry of this.store.productDetails.readBySlot(TemplateProductDetails.Instruction)) {
      const instruction = entry.detail;
      if (!(instruction instanceof HydrateElementInstruction)
        || instruction.definitionProductHandle !== definitionProductHandle) {
        continue;
      }
      if (instruction.captureSyntaxProductHandles.length === 0) {
        continue;
      }
      result.push(new RuntimeCapturedAttributeUsageContext(
        instruction,
        instruction.definitionProductHandle,
        instruction.captureSyntaxProductHandles,
      ));
    }
    return result;
  }

  private recordBinding(
    local: string,
    binding: RuntimeBinding,
    renderer: RuntimeRenderer,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    bindings: RuntimeBinding[],
    scopeEffectClaims: readonly SemanticClaim[],
    targetControllerClaims: readonly SemanticClaim[],
    controllerBindingClaimHandles: readonly ClaimHandle[],
  ): void {
    const semanticBindingKindKey = renderer.semanticBindingKindKey;
    if (semanticBindingKindKey == null || renderer.productHandle == null) {
      return;
    }
    const bindingLocal = `${local}:binding:${binding.productHandle}`;
    const publication = this.publishRuntimeBinding(
      bindingLocal,
      binding,
      renderer.productHandle,
      source,
      scopeEffectClaims,
      targetControllerClaims,
      controllerBindingClaimHandles,
    );
    bindings.push(binding);
    records.push(...this.recordsForRuntimeBinding(binding, semanticBindingKindKey, publication, source));
  }

  private publishRuntimeBinding(
    bindingLocal: string,
    binding: RuntimeBinding,
    rendererProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
    scopeEffectClaims: readonly SemanticClaim[],
    targetControllerClaims: readonly SemanticClaim[],
    controllerBindingClaimHandles: readonly ClaimHandle[],
  ): RuntimeBindingPublication {
    const instructionClaim = this.instructionCreatesBindingClaim(bindingLocal, binding.instructionProductHandle, binding.productHandle, source);
    const rendererClaim = this.rendererCreatesBindingClaim(bindingLocal, rendererProductHandle, binding.productHandle, source);
    return new RuntimeBindingPublication(
      bindingLocal,
      instructionClaim,
      rendererClaim,
      runtimeBindingMaterializationClaimHandles(
        [instructionClaim, rendererClaim, ...scopeEffectClaims, ...targetControllerClaims],
        controllerBindingClaimHandles,
      ),
    );
  }

  private recordsForRuntimeBinding(
    binding: RuntimeBinding,
    semanticBindingKindKey: BindingKindKey,
    publication: RuntimeBindingPublication,
    source: RuntimeRenderingSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new BindingIdentity(
        binding.identityHandle,
        binding.instructionIdentityHandle,
        semanticBindingKindKey,
      ),
      new MaterializedProduct(
        binding.productHandle,
        KernelVocabulary.Binding.RuntimeBinding.key,
        binding.identityHandle,
        binding.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${publication.local}:runtime-binding`),
        binding.identityHandle,
        [binding.productHandle],
        publication.materializationClaimHandles,
      ),
      ...publication.ownedClaims,
    ];
  }

  private recordTargetOperation(
    local: string,
    operation: RuntimeTargetOperation,
    renderer: RuntimeRenderer,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    targetOperations: RuntimeTargetOperation[],
    openSeams: OpenSeam[],
  ): void {
    if (renderer.productHandle == null) {
      return;
    }
    const operationLocal = `${local}:target-operation:${operation.productHandle}`;
    const publication = this.publishTargetOperation(operationLocal, operation, renderer.productHandle, source);
    this.recordOpenTargetOperationSeam(operationLocal, operation, source, records, openSeams);
    claims.push(...publication.claims);
    targetOperations.push(operation);
    records.push(...this.recordsForTargetOperation(operation, renderer, publication, source));
  }

  private publishTargetOperation(
    operationLocal: string,
    operation: RuntimeTargetOperation,
    rendererProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): RuntimeTargetOperationPublication {
    const claims = [
      this.rendererUsesTargetOperationClaim(operationLocal, rendererProductHandle, operation.productHandle, source),
      ...nullableClaim(operation.instructionProductHandle == null
        ? null
        : this.instructionCreatesTargetOperationClaim(
          operationLocal,
          operation.instructionProductHandle,
          operation.productHandle,
          source,
        )),
    ];
    return new RuntimeTargetOperationPublication(operationLocal, claims);
  }

  private recordOpenTargetOperationSeam(
    operationLocal: string,
    operation: RuntimeTargetOperation,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
  ): void {
    if (operation.openReason == null) {
      return;
    }
    this.recordOpenSeam(
      `${operationLocal}:open`,
      operation.openReason,
      operation.sourceAddressHandle,
      source,
      records,
      openSeams,
      KernelVocabulary.Binding.OpenTargetOperation.key,
    );
  }

  private recordsForTargetOperation(
    operation: RuntimeTargetOperation,
    renderer: RuntimeRenderer,
    publication: RuntimeTargetOperationPublication,
    source: RuntimeRenderingSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        operation.identityHandle,
        KernelVocabulary.Binding.TargetOperation.key,
        renderer.identityHandle,
        operation.sourceAddressHandle,
        `${operation.operationKind}:${operation.targetKind}:${operation.targetAttribute}:${operation.targetProperty}`,
      ),
      new MaterializedProduct(
        operation.productHandle,
        KernelVocabulary.Binding.TargetOperation.key,
        operation.identityHandle,
        operation.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${publication.local}:target-operation`),
        operation.identityHandle,
        [operation.productHandle],
        publication.claims.map((claim) => claim.handle),
      ),
    ];
  }

  private recordScopeEffect(
    local: string,
    binding: RuntimeBinding,
    effect: RuntimeBindingScopeEffect,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    scopeEffects: RuntimeBindingScopeEffect[],
  ): SemanticClaim {
    const publication = this.publishScopeEffect(local, binding, effect, source);
    claims.push(publication.claim);
    scopeEffects.push(effect);
    records.push(...this.recordsForScopeEffect(effect, binding, publication, source));
    return publication.claim;
  }

  private publishScopeEffect(
    local: string,
    binding: RuntimeBinding,
    effect: RuntimeBindingScopeEffect,
    source: RuntimeRenderingSourceSet,
  ): RuntimeScopeEffectPublication {
    return new RuntimeScopeEffectPublication(
      local,
      new SemanticClaim(
        this.store.handles.claim(`${local}:binding-creates-scope-effect:${effect.productHandle}`),
        binding.productHandle,
        KernelVocabulary.Binding.RuntimeBindingCreatesScopeEffect.key,
        effect.productHandle,
        source.provenanceHandle,
      ),
    );
  }

  private recordsForScopeEffect(
    effect: RuntimeBindingScopeEffect,
    binding: RuntimeBinding,
    publication: RuntimeScopeEffectPublication,
    source: RuntimeRenderingSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        effect.identityHandle,
        KernelVocabulary.Binding.ScopeEffect.key,
        binding.identityHandle,
        effect.sourceAddressHandle,
        `${effect.effectKind}:${publication.local}`,
      ),
      new MaterializedProduct(
        effect.productHandle,
        KernelVocabulary.Binding.ScopeEffect.key,
        effect.identityHandle,
        effect.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${publication.local}:scope-effect:${effect.productHandle}`),
        effect.identityHandle,
        [effect.productHandle],
        publication.claimHandles,
      ),
    ];
  }

  private instructionCreatesBindingClaim(
    local: string,
    instructionProductHandle: ProductHandle,
    bindingProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:instruction-creates-runtime-binding`),
      instructionProductHandle,
      KernelVocabulary.Binding.InstructionCreatesRuntimeBinding.key,
      bindingProductHandle,
      source.provenanceHandle,
    );
  }

  private instructionUsesRendererClaim(
    local: string,
    instructionProductHandle: ProductHandle,
    rendererProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:instruction-uses-runtime-renderer`),
      instructionProductHandle,
      KernelVocabulary.Binding.InstructionUsesRuntimeRenderer.key,
      rendererProductHandle,
      source.provenanceHandle,
    );
  }

  private rendererCreatesBindingClaim(
    local: string,
    rendererProductHandle: ProductHandle,
    bindingProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:runtime-renderer-creates-runtime-binding`),
      rendererProductHandle,
      KernelVocabulary.Binding.RuntimeRendererCreatesRuntimeBinding.key,
      bindingProductHandle,
      source.provenanceHandle,
    );
  }

  private instructionCreatesTargetOperationClaim(
    local: string,
    instructionProductHandle: ProductHandle,
    targetOperationProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:instruction-creates-target-operation`),
      instructionProductHandle,
      KernelVocabulary.Binding.InstructionCreatesTargetOperation.key,
      targetOperationProductHandle,
      source.provenanceHandle,
    );
  }

  private rendererUsesTargetOperationClaim(
    local: string,
    rendererProductHandle: ProductHandle,
    targetOperationProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:runtime-renderer-uses-target-operation`),
      rendererProductHandle,
      KernelVocabulary.Binding.RuntimeRendererUsesTargetOperation.key,
      targetOperationProductHandle,
      source.provenanceHandle,
    );
  }

  private runtimeBindingTargetsControllerClaim(
    local: string,
    bindingProductHandle: ProductHandle,
    controllerProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:runtime-binding-targets-controller`),
      bindingProductHandle,
      KernelVocabulary.Binding.RuntimeBindingTargetsController.key,
      controllerProductHandle,
      source.provenanceHandle,
    );
  }

  private runtimeBindingOwnsRuntimeBindingClaim(
    local: string,
    ownerBindingProductHandle: ProductHandle,
    bindingProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:runtime-binding-owns-runtime-binding`),
      ownerBindingProductHandle,
      KernelVocabulary.Binding.RuntimeBindingOwnsRuntimeBinding.key,
      bindingProductHandle,
      source.provenanceHandle,
    );
  }

  private recordController(
    local: string,
    controller: RuntimeControllerFrame,
    projectContext: TemplateRuntimeAnalysisProjectContext,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    externalClaims: readonly SemanticClaim[],
    viewFactoryByController: ReadonlyMap<ProductHandle, RuntimeViewFactoryMaterialization>,
  ): void {
    const publication = this.publishController(
      local,
      controller,
      projectContext,
      source,
      externalClaims,
      viewFactoryByController,
    );
    records.push(
      ...this.recordsForControllerProduct(local, controller, source, publication),
    );
  }

  private publishController(
    local: string,
    controller: RuntimeControllerFrame,
    projectContext: TemplateRuntimeAnalysisProjectContext,
    source: RuntimeRenderingSourceSet,
    externalClaims: readonly SemanticClaim[],
    viewFactoryByController: ReadonlyMap<ProductHandle, RuntimeViewFactoryMaterialization>,
  ): RuntimeControllerPublication {
    const claims = this.claimsForController(
      local,
      controller,
      projectContext,
      source,
      viewFactoryByController,
    );
    return new RuntimeControllerPublication(
      claims,
      this.materializationClaimHandlesForController(controller, claims, externalClaims),
    );
  }

  private claimsForController(
    local: string,
    controller: RuntimeControllerFrame,
    projectContext: TemplateRuntimeAnalysisProjectContext,
    source: RuntimeRenderingSourceSet,
    viewFactoryByController: ReadonlyMap<ProductHandle, RuntimeViewFactoryMaterialization>,
  ): readonly SemanticClaim[] {
    const viewFactory = viewFactoryByController.get(controller.productHandle) ?? null;
    return [
      ...this.childClaimsForController(local, controller, source),
      ...this.bindingClaimsForController(local, controller, source),
      ...nullableClaim(this.instructionCreatesControllerClaim(local, controller, source)),
      ...nullableClaim(this.controllerUsesCompiledTemplateClaim(local, controller, projectContext, source)),
      ...nullableClaim(this.controllerUsesInstructionSequenceClaim(local, controller, source)),
      ...(viewFactory == null ? [] : viewFactory.claims),
      ...nullableClaim(this.viewFactoryCreatesSyntheticViewClaim(local, controller, source)),
    ];
  }

  private childClaimsForController(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
  ): readonly SemanticClaim[] {
    return controller.readChildren().map((child) => new SemanticClaim(
      this.store.handles.claim(`${local}:has-child:${child.productHandle}`),
      controller.productHandle,
      KernelVocabulary.Configuration.ControllerHasChild.key,
      child.productHandle,
      source.provenanceHandle,
    ));
  }

  private bindingClaimsForController(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
  ): readonly SemanticClaim[] {
    return controller.readBindings().map((binding) => new SemanticClaim(
      this.store.handles.claim(`${local}:owns-binding:${binding.productHandle}`),
      controller.productHandle,
      KernelVocabulary.Configuration.ControllerOwnsRuntimeBinding.key,
      binding.productHandle,
      source.provenanceHandle,
    ));
  }

  private instructionCreatesControllerClaim(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim | null {
    return controller.instructionProductHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:instruction-creates-controller`),
        controller.instructionProductHandle,
        KernelVocabulary.Configuration.InstructionCreatesController.key,
        controller.productHandle,
        source.provenanceHandle,
      );
  }

  private controllerUsesCompiledTemplateClaim(
    local: string,
    controller: RuntimeControllerFrame,
    projectContext: TemplateRuntimeAnalysisProjectContext,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim | null {
    const compiledTemplateProductHandle = projectContext.readCompiledTemplateForDefinition(controller.definitionProductHandle);
    return compiledTemplateProductHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:uses-compiled-template`),
        controller.productHandle,
        KernelVocabulary.Configuration.ControllerUsesCompiledTemplate.key,
        compiledTemplateProductHandle,
        source.provenanceHandle,
      );
  }

  private controllerUsesInstructionSequenceClaim(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim | null {
    const instructionSequenceProductHandle = instructionSequenceProductHandleForController(this.store, controller);
    return instructionSequenceProductHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:uses-instruction-sequence`),
        controller.productHandle,
        KernelVocabulary.Configuration.ControllerUsesInstructionSequence.key,
        instructionSequenceProductHandle,
        source.provenanceHandle,
      );
  }

  private viewFactoryCreatesSyntheticViewClaim(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim | null {
    return controller.creationKind !== RuntimeControllerCreationKind.SyntheticView
      || controller.viewFactoryProductHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:view-factory-creates-synthetic-view`),
        controller.viewFactoryProductHandle,
        KernelVocabulary.Configuration.ViewFactoryCreatesSyntheticView.key,
        controller.productHandle,
        source.provenanceHandle,
      );
  }

  private materializationClaimHandlesForController(
    controller: RuntimeControllerFrame,
    claims: readonly SemanticClaim[],
    externalClaims: readonly SemanticClaim[],
  ): readonly ClaimHandle[] {
    return uniqueClaimHandles([
      ...claims.map((claim) => claim.handle),
      ...claimsForProduct(externalClaims, controller.productHandle).map((claim) => claim.handle),
    ]);
  }

  private recordsForControllerProduct(
    local: string,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
    publication: RuntimeControllerPublication,
  ): readonly KernelStoreRecord[] {
    return [
      new ConfigurationIdentity(
        controller.identityHandle,
        KernelVocabulary.Configuration.Controller.key,
        controller.parent?.identityHandle ?? null,
        controller.sourceAddressHandle,
        controller.name,
      ),
      new MaterializedProduct(
        controller.productHandle,
        KernelVocabulary.Configuration.Controller.key,
        controller.identityHandle,
        controller.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:runtime-controller`),
        controller.identityHandle,
        [controller.productHandle],
        publication.materializationClaimHandles,
      ),
      ...publication.claims,
    ];
  }

  private recordViewFactory(
    local: string,
    controller: RuntimeControllerFrame,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    viewFactories: ViewFactory[],
    embeddedDefinitions: CustomElementDefinition[],
  ): RuntimeViewFactoryMaterialization {
    const definition = this.recordEmbeddedViewDefinition(
      `${local}:definition`,
      controller,
      instructionSequenceProductHandle,
      source,
      records,
      embeddedDefinitions,
    );
    const viewFactory = this.createViewFactory(local, controller, definition, instructionSequenceProductHandle, source);
    this.recordViewFactoryLifecycle(controller, viewFactory);
    const claims = this.claimsForViewFactory(local, controller, viewFactory, definition, instructionSequenceProductHandle, source);
    viewFactories.push(viewFactory);
    records.push(
      ...this.recordsForViewFactoryProduct(local, controller, viewFactory, source, claims),
    );
    return new RuntimeViewFactoryMaterialization(
      controller,
      viewFactory,
      definition,
      instructionSequenceProductHandle,
      claims,
    );
  }

  private createViewFactory(
    local: string,
    controller: RuntimeControllerFrame,
    definition: CustomElementDefinition,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): ViewFactory {
    const allocation = this.allocate(local);
    return new ViewFactory(
      allocation.productHandle,
      allocation.identityHandle,
      definition.name,
      controller.container,
      definition.productHandle,
      controller.instructionProductHandle,
      instructionSequenceProductHandle,
      controller.toReference(),
      controller.sourceAddressHandle,
      viewFactoryFieldProvenance([
        'container',
        'definition',
        controller.instructionProductHandle == null ? null : 'instruction',
        'instructionSequence',
        'parent',
        'source',
      ], source.provenanceHandle),
    );
  }

  private recordViewFactoryLifecycle(
    controller: RuntimeControllerFrame,
    viewFactory: ViewFactory,
  ): void {
    controller.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Hydration,
      RuntimeControllerLifecycleStepKind.CreateViewFactory,
      viewFactory.productHandle,
      viewFactory.sourceAddressHandle,
      'Rendering.getViewFactory materialized the template-controller view factory.',
    );
  }

  private claimsForViewFactory(
    local: string,
    controller: RuntimeControllerFrame,
    viewFactory: ViewFactory,
    definition: CustomElementDefinition,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): readonly SemanticClaim[] {
    return [
      this.controllerUsesViewFactoryClaim(local, controller, viewFactory, source),
      this.viewFactoryUsesDefinitionClaim(local, viewFactory, definition, source),
      this.viewFactoryUsesInstructionSequenceClaim(local, viewFactory, instructionSequenceProductHandle, source),
      ...nullableClaim(this.instructionCreatesViewFactoryClaim(local, controller, viewFactory, source)),
    ];
  }

  private controllerUsesViewFactoryClaim(
    local: string,
    controller: RuntimeControllerFrame,
    viewFactory: ViewFactory,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:controller-uses-view-factory`),
      controller.productHandle,
      KernelVocabulary.Configuration.ControllerUsesViewFactory.key,
      viewFactory.productHandle,
      source.provenanceHandle,
    );
  }

  private viewFactoryUsesDefinitionClaim(
    local: string,
    viewFactory: ViewFactory,
    definition: CustomElementDefinition,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:uses-definition`),
      viewFactory.productHandle,
      KernelVocabulary.Configuration.ViewFactoryUsesDefinition.key,
      definition.productHandle!,
      source.provenanceHandle,
    );
  }

  private viewFactoryUsesInstructionSequenceClaim(
    local: string,
    viewFactory: ViewFactory,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:uses-instruction-sequence`),
      viewFactory.productHandle,
      KernelVocabulary.Configuration.ViewFactoryUsesInstructionSequence.key,
      instructionSequenceProductHandle,
      source.provenanceHandle,
    );
  }

  private instructionCreatesViewFactoryClaim(
    local: string,
    controller: RuntimeControllerFrame,
    viewFactory: ViewFactory,
    source: RuntimeRenderingSourceSet,
  ): SemanticClaim | null {
    return controller.instructionProductHandle == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`${local}:instruction-creates-view-factory`),
        controller.instructionProductHandle,
        KernelVocabulary.Configuration.InstructionCreatesViewFactory.key,
        viewFactory.productHandle,
        source.provenanceHandle,
      );
  }

  private recordsForViewFactoryProduct(
    local: string,
    controller: RuntimeControllerFrame,
    viewFactory: ViewFactory,
    source: RuntimeRenderingSourceSet,
    claims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    return [
      new ConfigurationIdentity(
        viewFactory.identityHandle,
        KernelVocabulary.Configuration.ViewFactory.key,
        controller.identityHandle,
        viewFactory.sourceAddressHandle,
        viewFactory.name,
      ),
      new MaterializedProduct(
        viewFactory.productHandle,
        KernelVocabulary.Configuration.ViewFactory.key,
        viewFactory.identityHandle,
        viewFactory.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:view-factory`),
        viewFactory.identityHandle,
        [viewFactory.productHandle],
        claims.map((claim) => claim.handle),
      ),
    ];
  }

  private recordEmbeddedViewDefinition(
    local: string,
    controller: RuntimeControllerFrame,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    embeddedDefinitions: CustomElementDefinition[],
  ): CustomElementDefinition {
    const publication = this.publishEmbeddedViewDefinition(local, controller, instructionSequenceProductHandle, source);
    embeddedDefinitions.push(publication.definition);
    records.push(
      ...this.recordsForEmbeddedViewDefinitionProduct(local, publication, controller, source),
    );
    return publication.definition;
  }

  private publishEmbeddedViewDefinition(
    local: string,
    controller: RuntimeControllerFrame,
    instructionSequenceProductHandle: ProductHandle,
    source: RuntimeRenderingSourceSet,
  ): RuntimeEmbeddedViewDefinitionPublication {
    const allocation = this.allocate(local);
    const name = generatedEmbeddedViewName(controller);
    const sequence = this.store.productDetails.read(
      TemplateProductDetails.InstructionSequence,
      instructionSequenceProductHandle,
    );
    return new RuntimeEmbeddedViewDefinitionPublication(
      allocation,
      this.createEmbeddedViewDefinition(allocation, name, controller, sequence, source),
    );
  }

  private createEmbeddedViewDefinition(
    allocation: RuntimeRendererAllocation,
    name: string,
    controller: RuntimeControllerFrame,
    sequence: TemplateInstructionSequence | null,
    source: RuntimeRenderingSourceSet,
  ): CustomElementDefinition {
    const shape = this.embeddedViewDefinitionShape(name, controller, sequence, source);
    return new CustomElementDefinition(
      allocation.productHandle,
      allocation.identityHandle,
      controller.sourceAddressHandle,
      shape.target,
      name,
      [],
      shape.key,
      shape.capture,
      shape.template,
      shape.instructions,
      [],
      null,
      false,
      [],
      [],
      false,
      null,
      false,
      false,
      [],
      null,
      null,
      [],
      shape.fieldProvenance,
    );
  }

  private embeddedViewDefinitionShape(
    name: string,
    controller: RuntimeControllerFrame,
    sequence: TemplateInstructionSequence | null,
    source: RuntimeRenderingSourceSet,
  ): RuntimeEmbeddedViewDefinitionShape {
    return new RuntimeEmbeddedViewDefinitionShape(
      new ResourceTargetReference(null, controller.sourceAddressHandle, name, null),
      runtimeResourceKeyForKind(ResourceDefinitionKind.CustomElement, name)!,
      new CustomElementCaptureDefinition(CustomElementCaptureKind.None),
      new CustomElementTemplateDefinition(
        CustomElementTemplateKind.DomNode,
        null,
        sequence?.sourceAddressHandle ?? controller.sourceAddressHandle,
        null,
      ),
      instructionReferencesForEmbeddedView(sequence),
      embeddedViewDefinitionFieldProvenance(sequence, source.provenanceHandle),
    );
  }

  private recordsForEmbeddedViewDefinitionProduct(
    local: string,
    publication: RuntimeEmbeddedViewDefinitionPublication,
    controller: RuntimeControllerFrame,
    source: RuntimeRenderingSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new AureliaResourceIdentity(
        publication.allocation.identityHandle,
        AureliaResourceIdentityKind.CustomElement,
        publication.definition.name,
        null,
      ),
      new MaterializedProduct(
        publication.allocation.productHandle,
        KernelVocabulary.Resource.Definition.key,
        publication.allocation.identityHandle,
        controller.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:embedded-view-definition`),
        publication.allocation.identityHandle,
        [publication.allocation.productHandle],
      ),
    ];
  }

  private controllerBindingClaimHandles(
    localKey: string,
    controllers: readonly RuntimeControllerFrame[],
  ): ReadonlyMap<ProductHandle, readonly ClaimHandle[]> {
    const result = new Map<ProductHandle, ClaimHandle[]>();
    for (const controller of controllers) {
      const local = `${localKey}:controller:${controller.productHandle}`;
      for (const binding of controller.readBindings()) {
        let handles = result.get(binding.productHandle);
        if (handles === undefined) {
          handles = [];
          result.set(binding.productHandle, handles);
        }
        handles.push(this.store.handles.claim(`${local}:owns-binding:${binding.productHandle}`));
      }
    }
    return result;
  }

  private createRootController(
    input: RuntimeRenderingMaterializationRequest,
    source: RuntimeRenderingSourceSet,
  ): RuntimeControllerFrame {
    const allocation = this.allocate(`${input.localKey}:controller:root`);
    return new RuntimeControllerFrame(
      RuntimeControllerCreationKind.RootCustomElement,
      allocation.productHandle,
      allocation.identityHandle,
      input.definition.name,
      input.compilerWorld.container.toReference(),
      input.compilerWorld.container,
      input.definition.productHandle,
      input.definition.target,
      input.definition.sourceAddressHandle,
      null,
      null,
      null,
      input.definition.strict,
      input.definition.sourceAddressHandle,
      source.provenanceHandle,
    );
  }

  private createChildController(
    creation: RuntimeControllerCreationRequest,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    childContainerEmissions: ContainerChildMaterializationEmission[],
    openSeams: OpenSeam[],
  ): RuntimeControllerFrame | null {
    if (!isClosedControllerCreationRequest(creation)) {
      return null;
    }
    const parentContainer = this.parentContainerForChildController(creation, source, records, openSeams);
    if (parentContainer == null) {
      return null;
    }
    const allocation = this.allocate(`${creation.local}:controller`);
    const definition = this.definitionForController(creation);
    const childContainer = this.materializeChildControllerContainer(creation, parentContainer);
    records.push(...childContainer.records);
    childContainerEmissions.push(childContainer);
    const frame = this.childControllerFrame(creation, allocation, definition, childContainer, source);
    this.recordChildControllerHydration(frame, childContainer);
    creation.parent.addChild(frame);
    return frame;
  }

  private parentContainerForChildController(
    creation: ClosedRuntimeControllerCreationRequest,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
  ): Container | null {
    const parentContainer = creation.parent.containerFrame;
    if (parentContainer != null) {
      return parentContainer;
    }
    this.recordOpenSeam(
      `${creation.local}:open-controller-container`,
      `Renderer-created controller '${creation.creationKind}' needs runtime child-container materialization, but its parent controller did not carry a modeled container frame.`,
      creation.instruction.sourceAddressHandle,
      source,
      records,
      openSeams,
      KernelVocabulary.Di.OpenChildContainer.key,
    );
    return null;
  }

  private materializeChildControllerContainer(
    creation: ClosedRuntimeControllerCreationRequest,
    parentContainer: Container,
  ): ContainerChildMaterializationEmission {
    return this.childContainerMaterializer.materializeChild(new ContainerChildMaterializationRequest(
      `${creation.local}:container`,
      parentContainer,
      creation.instruction.sourceAddressHandle,
      `${creation.creationKind}:container`,
      contextResolverSlotsForController(creation),
    ));
  }

  private childControllerFrame(
    creation: ClosedRuntimeControllerCreationRequest,
    allocation: RuntimeRendererAllocation,
    definition: CustomElementDefinition | CustomAttributeDefinition | null,
    childContainer: ContainerChildMaterializationEmission,
    source: RuntimeRenderingSourceSet,
  ): RuntimeControllerFrame {
    return new RuntimeControllerFrame(
      creation.creationKind,
      allocation.productHandle,
      allocation.identityHandle,
      controllerName(creation, definition),
      childContainer.container.toReference(),
      childContainer.container,
      definition?.productHandle ?? null,
      definition instanceof CustomElementDefinition || definition instanceof CustomAttributeDefinition
        ? definition.target
        : null,
      creation.instruction.sourceAddressHandle,
      creation.parent,
      creation.instruction.productHandle,
      creation.instruction.identityHandle,
      definition instanceof CustomElementDefinition ? definition.strict : null,
      creation.instruction.sourceAddressHandle,
      source.provenanceHandle,
    );
  }

  private recordChildControllerHydration(
    frame: RuntimeControllerFrame,
    childContainer: ContainerChildMaterializationEmission,
  ): void {
    frame.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Hydration,
      RuntimeControllerLifecycleStepKind.CreateChildContainer,
      childContainer.container.productHandle,
      childContainer.container.sourceAddressHandle,
      'Renderer-created controller received a runtime child container and hydration context providers.',
    );
  }

  private definitionForController(
    creation: RuntimeControllerCreationRequest,
  ): CustomElementDefinition | CustomAttributeDefinition | null {
    const productHandle = creation.instruction?.definitionProductHandle ?? null;
    if (productHandle == null) {
      return null;
    }
    const definition = this.store.productDetails.read(ResourceProductDetails.Definition, productHandle);
    if (definition instanceof CustomElementDefinition || definition instanceof CustomAttributeDefinition) {
      return definition;
    }
    return null;
  }

  private allocate(local: string): RuntimeRendererAllocation {
    return new RuntimeRendererAllocation(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private recordOpenSeam(
    local: string,
    summary: string,
    addressHandle: AddressHandle | null,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Instruction.OpenInstruction.key,
  ): void {
    const seam = new OpenSeam(
      this.store.handles.openSeam(local),
      seamKindKey,
      summary,
      addressHandle,
      source.evidenceHandle,
    );
    openSeams.push(seam);
    records.push(seam);
  }

  private recordsForSource(local: string): RuntimeRenderingSourceSet {
    const evidenceHandle = this.store.handles.evidence(`runtime-rendering:${local}`);
    const provenanceHandle = this.store.handles.provenance(`runtime-rendering:${local}`);
    return new RuntimeRenderingSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Runtime binding emulation from lowered instruction products and renderer semantics.',
          null,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
      ],
      evidenceHandle,
      provenanceHandle,
    );
  }
}

function controllerName(
  creation: RuntimeControllerCreationRequest,
  definition: CustomElementDefinition | CustomAttributeDefinition | null,
): string | null {
  if (creation.creationKind === RuntimeControllerCreationKind.TemplateController
    && creation.instruction != null
    && 'controllerName' in creation.instruction) {
    return creation.instruction.controllerName;
  }
  return definition?.name ?? null;
}

function isClosedControllerCreationRequest(
  creation: RuntimeControllerCreationRequest,
): creation is ClosedRuntimeControllerCreationRequest {
  return creation.parent != null && creation.instruction != null;
}

function contextResolverSlotsForController(
  creation: RuntimeControllerCreationRequest,
): readonly ContainerContextResolverSlotRequest[] {
  const common = [
    'INode',
    'IController',
    'Instruction',
    'IRenderLocation',
    'IViewFactory',
    'IAuSlotsInfo',
  ];
  const names = creation.creationKind === RuntimeControllerCreationKind.CustomElement
    ? [...common, 'IHydrationContext']
    : common;
  return names.map((name) => new ContainerContextResolverSlotRequest(
    name,
    creation.instruction?.sourceAddressHandle ?? null,
  ));
}

function childInstructionSequenceProductHandleForInstruction(
  store: KernelStore,
  instructionProductHandle: ProductHandle,
): ProductHandle | null {
  const instruction = store.productDetails.read(TemplateProductDetails.Instruction, instructionProductHandle);
  if (instruction == null || !('childInstructionSequenceProductHandle' in instruction)) {
    return null;
  }
  const productHandle = instruction.childInstructionSequenceProductHandle;
  return typeof productHandle === 'string' ? productHandle as ProductHandle : null;
}

function instructionSequenceProductHandleForController(
  store: KernelStore,
  controller: RuntimeControllerFrame,
): ProductHandle | null {
  if (controller.instructionProductHandle == null) {
    return controller.instructionSequenceProductHandle;
  }
  return childInstructionSequenceProductHandleForInstruction(store, controller.instructionProductHandle);
}

function uniqueRuntimeControllers(
  controllers: readonly RuntimeControllerFrame[],
): readonly RuntimeControllerFrame[] {
  const seen = new Set<ProductHandle>();
  const result: RuntimeControllerFrame[] = [];
  for (const controller of controllers) {
    if (seen.has(controller.productHandle)) {
      continue;
    }
    seen.add(controller.productHandle);
    result.push(controller);
  }
  return result;
}

function viewFactoryFieldProvenance(
  fields: readonly (ViewFactoryField | null)[],
  provenanceHandle: ProvenanceHandle,
): readonly FieldProvenance<ViewFactoryField>[] {
  return compactFieldProvenance(fields.map((field) =>
    field == null ? null : new FieldProvenance(field, provenanceHandle)
  ));
}

function customElementDefinitionFieldProvenance(
  fields: readonly (CustomElementDefinitionField | null)[],
  provenanceHandle: ProvenanceHandle,
): readonly FieldProvenance<CustomElementDefinitionField>[] {
  return compactFieldProvenance(fields.map((field) =>
    field == null ? null : new FieldProvenance(field, provenanceHandle)
  ));
}

function embeddedViewDefinitionFieldProvenance(
  sequence: TemplateInstructionSequence | null,
  provenanceHandle: ProvenanceHandle,
): readonly FieldProvenance<CustomElementDefinitionField>[] {
  return customElementDefinitionFieldProvenance([
    'target',
    'name',
    'key',
    'capture',
    'template',
    sequence == null ? null : 'instructions',
    'dependencies',
    'needsCompile',
    'surrogates',
    'bindables',
    'containerless',
    'shadowOptions',
    'hasSlots',
    'enhance',
    'watches',
    'strict',
    'processContent',
  ], provenanceHandle);
}

function instructionReferencesForEmbeddedView(
  sequence: TemplateInstructionSequence | null,
): readonly InstructionReference[] {
  return sequence?.instructions.flatMap((instruction) =>
    instruction.productHandle == null ? [] : [new InstructionReference(instruction.productHandle)]
  ) ?? [];
}

function generatedEmbeddedViewName(
  controller: RuntimeControllerFrame,
): string {
  const seed = controller.instructionProductHandle ?? controller.productHandle;
  return `anonymous-${stableShortHash(seed)}`;
}

function stableShortHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function runtimeBindingMaterializationClaimHandles(
  bindingClaims: readonly SemanticClaim[],
  controllerBindingClaimHandles: readonly ClaimHandle[],
): readonly ClaimHandle[] {
  return [
    ...bindingClaims.map((claim) => claim.handle),
    ...controllerBindingClaimHandles,
  ];
}

function uniqueClaimHandles(
  handles: readonly ClaimHandle[],
): readonly ClaimHandle[] {
  return [...new Set(handles)];
}
