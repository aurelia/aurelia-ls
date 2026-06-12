import { SemanticClaim } from '../kernel/claim.js';
import type { Container } from '../di/container.js';
import {
  ContainerContextResolverRecordPolicy,
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
  OpenSeamReasonKind,
} from '../kernel/open-seam.js';
import type {
  AddressHandle,
  EvidenceHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  ConfigurationProductDetails,
} from '../configuration/product-details.js';
import {
  ViewFactory,
} from '../configuration/controller.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import type { CompiledTemplateEmission } from './compiled-template-materializer.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import {
  type RuntimeBinding,
  type RuntimeBindingScopeEffect,
  RuntimeTargetOperation,
} from './runtime-binding.js';
import type { RuntimeWatcher } from './runtime-watcher.js';
import {
  RuntimeRendererAllocation,
} from './runtime-renderer.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import {
  type TemplateRenderingRunHost,
  TemplateRenderingRunResult,
  type TemplateRenderingRunRequest,
  type TemplateRenderingTargetPlan,
} from './compiler-world.js';
import { TemplateProductDetails } from './product-details.js';
import { ObservationProductDetails } from '../observation/product-details.js';
import {
  RuntimeControllerCreationKind,
  RuntimeControllerFrame,
  RuntimeControllerLifecycleStage,
  RuntimeControllerLifecycleStepKind,
} from './runtime-controller.js';
import {
  CustomElementDefinition,
} from '../resources/custom-element-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
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
import { RuntimeRenderingSourceSet } from './runtime-rendering-source.js';
import {
  RuntimeBindingRenderContext,
  RuntimeRenderedInstructionRecorder,
} from './runtime-rendered-instruction-recorder.js';
import type { TemplateRuntimeAnalysisProjectContext } from './template-runtime-analysis-context.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  syntheticViewTargetInputs,
} from './runtime-synthetic-view-targets.js';
import {
  RuntimeViewFactoryMaterialization,
  RuntimeViewFactoryMaterializer,
} from './runtime-view-factory-materializer.js';
import { RuntimeControllerPublicationMaterializer } from './runtime-controller-publication.js';
import { RuntimeControllerCreationMaterializer } from './runtime-controller-creation-materializer.js';
import { RuntimeSpreadBindingCreator } from './runtime-spread-binding-creator.js';
import type { RuntimeControllerIssue } from './runtime-controller-issue.js';
import type { RuntimeBindingIssue } from './runtime-binding-issue.js';
import {
  RuntimeRendererIssuePublisher,
  type RuntimeRendererIssue,
} from './runtime-renderer-issue.js';
import {
  measureSemanticRuntimePhase,
  type SemanticRuntimePhaseSink,
} from '../telemetry/phase.js';

type RuntimeRenderingFinePhaseName =
  | 'source-records'
  | 'root-controller'
  | 'controller-observer-setup'
  | 'render-root-template'
  | 'root-render-target-inputs'
  | 'root-render-dispatch'
  | 'render-recursive-views'
  | 'custom-element-target-inputs'
  | 'custom-element-render-dispatch'
  | 'synthetic-view-target-inputs'
  | 'synthetic-view-render-dispatch'
  | 'spend-render-results'
  | 'record-open-instructions'
  | 'record-rendered-instructions'
  | 'record-rendered-controllers'
  | 'claim-finalization'
  | 'emission'
  | 'commit-records'
  | 'product-details'
  | `render-dispatch:${string}`
  | `controller-creation:${string}`;

export interface RuntimeRenderingMaterializationRequest {
  /** Store-local key shared with the template compilation pass. */
  readonly localKey: string;
  /** Project key that owns this render analysis, when known. */
  readonly projectKey: string | null;
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
  /** Project resource index used to spend controller-local dependency registrations. */
  readonly resourceDefinitions: ResourceDefinitionIndex | null;
  /** Current TypeChecker epoch available to controller hydration observer setup, when available. */
  readonly typeSystem: TypeSystemProject | null;
  /** Whether framework contextual resolver slots should be published as kernel records during rendering. */
  readonly contextResolverRecordPolicy: ContainerContextResolverRecordPolicy;
  /** Optional fine-grained telemetry sink owned by the surrounding inquiry profile. */
  readonly profiling?: SemanticRuntimePhaseSink | null;
}

export class RuntimeRenderingEmission {
  private readonly bindingsByInstruction = new Map<ProductHandle, RuntimeBinding[]>();
  private readonly bindingsByProduct = new Map<ProductHandle, RuntimeBinding>();
  private readonly effectsByOwner = new Map<ProductHandle, RuntimeBindingScopeEffect[]>();
  private readonly renderContextsByBinding = new Map<ProductHandle, RuntimeBindingRenderContext>();
  private readonly controllersByInstruction = new Map<ProductHandle, RuntimeControllerFrame[]>();
  private readonly syntheticControllersByTemplateControllerInstruction = new Map<ProductHandle, RuntimeControllerFrame[]>();

  constructor(
    /** Root custom-element controller that invoked the render pass. */
    readonly rootController: RuntimeControllerFrame,
    /** Runtime controllers created or reached during renderer emulation. */
    readonly controllers: readonly RuntimeControllerFrame[],
    /** Runtime binding instances materialized from lowered instruction products. */
    readonly bindings: readonly RuntimeBinding[],
    /** Runtime watcher bindings materialized from resource watch metadata during controller hydration. */
    readonly watchers: readonly RuntimeWatcher[],
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
    /** Framework-runtime issues discovered while constructing or hydrating controllers. */
    readonly controllerIssues: readonly RuntimeControllerIssue[],
    /** Framework-runtime issues discovered while runtime renderers spend lowered instructions. */
    readonly rendererIssues: readonly RuntimeRendererIssue[],
    /** Framework-runtime issues discovered while modeled runtime bindings execute their own lifecycle. */
    readonly bindingIssues: readonly RuntimeBindingIssue[],
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
      const instructionBindings = this.bindingsByInstruction.get(binding.instructionProductHandle) ?? [];
      instructionBindings.push(binding);
      this.bindingsByInstruction.set(binding.instructionProductHandle, instructionBindings);
      this.bindingsByProduct.set(binding.productHandle, binding);
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
        const controllersForInstruction = this.controllersByInstruction.get(controller.instructionProductHandle) ?? [];
        controllersForInstruction.push(controller);
        this.controllersByInstruction.set(controller.instructionProductHandle, controllersForInstruction);
      }
      if (controller.creationKind === RuntimeControllerCreationKind.SyntheticView
        && controller.syntheticOwnerInstructionProductHandle != null) {
        const controllers = this.syntheticControllersByTemplateControllerInstruction.get(
          controller.syntheticOwnerInstructionProductHandle,
        ) ?? [];
        controllers.push(controller);
        this.syntheticControllersByTemplateControllerInstruction.set(controller.syntheticOwnerInstructionProductHandle, controllers);
      }
    }
  }

  /** Returns the materialized runtime bindings for a lowered instruction across all recursive render contexts. */
  readBindingsForInstruction(productHandle: ProductHandle): readonly RuntimeBinding[] {
    return this.bindingsByInstruction.get(productHandle) ?? [];
  }

  readBindingForInstruction(productHandle: ProductHandle): RuntimeBinding | null {
    const bindings = this.readBindingsForInstruction(productHandle);
    return bindings.length === 1 ? bindings[0]! : null;
  }

  /** Returns the materialized runtime binding for a binding product handle. */
  readBinding(productHandle: ProductHandle): RuntimeBinding | null {
    return this.bindingsByProduct.get(productHandle) ?? null;
  }

  readScopeEffectsForOwner(productHandle: ProductHandle): readonly RuntimeBindingScopeEffect[] {
    return this.effectsByOwner.get(productHandle) ?? [];
  }

  readRenderContextForBinding(productHandle: ProductHandle): RuntimeBindingRenderContext | null {
    return this.renderContextsByBinding.get(productHandle) ?? null;
  }

  readControllerForInstruction(productHandle: ProductHandle): RuntimeControllerFrame | null {
    return this.readControllersForInstruction(productHandle)[0] ?? null;
  }

  readControllerForInstructionUnderParent(
    productHandle: ProductHandle,
    parent: RuntimeControllerFrame | null,
  ): RuntimeControllerFrame | null {
    if (parent == null) {
      return this.readControllerForInstruction(productHandle);
    }
    return this.readControllersForInstruction(productHandle).find((controller) =>
      controller.parent?.productHandle === parent.productHandle
    ) ?? null;
  }

  readControllersForInstruction(productHandle: ProductHandle): readonly RuntimeControllerFrame[] {
    return this.controllersByInstruction.get(productHandle) ?? [];
  }

  readSyntheticControllerForTemplateControllerInstruction(productHandle: ProductHandle): RuntimeControllerFrame | null {
    return this.readSyntheticControllersForTemplateControllerInstruction(productHandle)[0] ?? null;
  }

  readSyntheticControllerForTemplateControllerUnderOwner(
    productHandle: ProductHandle,
    owner: RuntimeControllerFrame | null,
  ): RuntimeControllerFrame | null {
    if (owner == null) {
      return this.readSyntheticControllerForTemplateControllerInstruction(productHandle);
    }
    return this.readSyntheticControllersForTemplateControllerInstruction(productHandle).find((controller) =>
      controller.parent?.productHandle === owner.productHandle
    ) ?? null;
  }

  readSyntheticControllersForTemplateControllerInstruction(productHandle: ProductHandle): readonly RuntimeControllerFrame[] {
    return this.syntheticControllersByTemplateControllerInstruction.get(productHandle) ?? [];
  }
}

class RuntimeRenderingMaterializationState {
  readonly records: KernelStoreRecord[] = [];
  readonly bindings: RuntimeBinding[] = [];
  readonly targetOperations: RuntimeTargetOperation[] = [];
  readonly scopeEffects: RuntimeBindingScopeEffect[] = [];
  readonly viewFactories: ViewFactory[] = [];
  readonly embeddedDefinitions: CustomElementDefinition[] = [];
  readonly bindingRenderContexts: RuntimeBindingRenderContext[] = [];
  readonly childContainerEmissions: ContainerChildMaterializationEmission[] = [];
  readonly controllerIssues: RuntimeControllerIssue[] = [];
  readonly rendererIssues: RuntimeRendererIssue[] = [];
  readonly bindingIssues: RuntimeBindingIssue[] = [];
  readonly dynamicInstructions: TemplateInstruction[] = [];
  readonly dynamicValueSites: TemplateValueSite[] = [];
  readonly dynamicExpressionParses: TemplateExpressionParse[] = [];
  readonly openSeams: OpenSeam[] = [];
  readonly claims: SemanticClaim[] = [];
  readonly viewFactoryByController = new Map<ProductHandle, RuntimeViewFactoryMaterialization>();

  constructor(
    readonly input: RuntimeRenderingMaterializationRequest,
    readonly source: RuntimeRenderingSourceSet,
    readonly rootController: RuntimeControllerFrame,
  ) {
    this.records.push(...source.records);
  }

  childContainers(): readonly Container[] {
    return this.childContainerEmissions.map((emission) => emission.container);
  }

  childSelfResolverSlots(): readonly ContainerSelfResolverSlot[] {
    return this.childContainerEmissions.map((emission) => emission.selfResolverSlot);
  }

  childContextResolverSlots(): readonly ContainerResolverSlot[] {
    return this.childContainerEmissions.flatMap((emission) => emission.contextResolverSlots);
  }
}

/** Materializes renderer-owned controller, binding, scope-effect, provenance, and claim products after Rendering dispatch. */
export class RuntimeRenderingMaterializer {
  private readonly controllerCreation: RuntimeControllerCreationMaterializer;
  private readonly renderedInstructionRecorder: RuntimeRenderedInstructionRecorder;
  private readonly viewFactoryMaterializer: RuntimeViewFactoryMaterializer;
  private readonly controllerPublication: RuntimeControllerPublicationMaterializer;
  private readonly spreadBindingCreator: RuntimeSpreadBindingCreator;
  private readonly rendererIssuePublisher: RuntimeRendererIssuePublisher;

  constructor(
    /** Hot analysis store that receives runtime binding products. */
    readonly store: KernelStore,
  ) {
    this.controllerCreation = new RuntimeControllerCreationMaterializer(store);
    this.renderedInstructionRecorder = new RuntimeRenderedInstructionRecorder(store);
    this.viewFactoryMaterializer = new RuntimeViewFactoryMaterializer(store);
    this.controllerPublication = new RuntimeControllerPublicationMaterializer(store);
    this.spreadBindingCreator = new RuntimeSpreadBindingCreator(store);
    this.rendererIssuePublisher = new RuntimeRendererIssuePublisher(store);
  }

  materialize(input: RuntimeRenderingMaterializationRequest): RuntimeRenderingEmission {
    const emission = this.recordsForRendering(input);
    this.measure(input, 'commit-records', () => {
      if (emission.records.length > 0) {
        this.store.commit(new KernelStoreBatch(emission.records, `runtime-rendering:${input.localKey}`));
      }
    });
    this.measure(input, 'product-details', () => this.registerProductDetails(emission));
    return emission;
  }

  private registerProductDetails(emission: RuntimeRenderingEmission): void {
    this.store.productDetails.addAll(
      ConfigurationProductDetails.Controller,
      emission.controllers.map((controller) => controller.toControllerProduct()),
    );
    this.store.productDetails.addAll(TemplateProductDetails.RuntimeBinding, emission.bindings);
    this.store.productDetails.addAll(TemplateProductDetails.RuntimeWatcher, emission.watchers);
    this.store.productDetails.addAll(
      ObservationProductDetails.RuntimeWatcherObservedDependency,
      emission.watchers.flatMap((watcher) => watcher.observedDependencies),
    );
    this.store.productDetails.addAll(TemplateProductDetails.RuntimeBindingTargetOperation, emission.targetOperations);
    this.store.productDetails.addAll(TemplateProductDetails.RuntimeBindingScopeEffect, emission.scopeEffects);
    this.store.productDetails.addAll(TemplateProductDetails.RuntimeControllerIssue, emission.controllerIssues);
    this.store.productDetails.addAll(TemplateProductDetails.RuntimeRendererIssue, emission.rendererIssues);
    this.store.productDetails.addAll(TemplateProductDetails.RuntimeBindingIssue, emission.bindingIssues);
    this.store.productDetails.addAll(ConfigurationProductDetails.ViewFactory, emission.viewFactories);
    for (const definition of emission.embeddedDefinitions) {
      if (definition.productHandle != null) {
        this.store.productDetails.add(ResourceProductDetails.Definition, definition.productHandle, definition);
      }
    }
    this.store.productDetails.addAllIfAbsent(TemplateProductDetails.Instruction, emission.dynamicInstructions);
    this.store.productDetails.addAll(TemplateProductDetails.ValueSite, emission.dynamicValueSites);
    this.store.productDetails.addAll(TemplateProductDetails.ExpressionParse, emission.dynamicExpressionParses);
  }

  private recordsForRendering(input: RuntimeRenderingMaterializationRequest): RuntimeRenderingEmission {
    const source = this.measure(input, 'source-records', () => this.recordsForSource(input.localKey));
    const rootDependencyRecords: KernelStoreRecord[] = [];
    const rootChildContainers: ContainerChildMaterializationEmission[] = [];
    const rootController = this.measure(input, 'root-controller', () =>
      this.controllerCreation.createRootController(
        input.localKey,
        input.definition,
        input.compilerWorld.container,
        source,
        input.typeSystem,
        input.projectKey,
        input.resourceDefinitions,
        rootDependencyRecords,
        rootChildContainers,
      )
    );
    const state = new RuntimeRenderingMaterializationState(input, source, rootController);
    state.records.push(...rootDependencyRecords);
    state.childContainerEmissions.push(...rootChildContainers);
    this.measure(input, 'controller-observer-setup', () =>
      this.controllerCreation.recordControllerObserverSetupIssues(
        rootController,
        input.definition,
        input.typeSystem,
        source,
        state.records,
        state.controllerIssues,
      )
    );
    const renderResults = this.renderResultsForState(state);
    const controllers = this.spendRenderResults(state, renderResults);
    this.measure(input, 'claim-finalization', () => state.records.push(...state.claims));
    return this.measure(input, 'emission', () => this.emissionForState(state, controllers));
  }

  private renderResultsForState(
    state: RuntimeRenderingMaterializationState,
  ): readonly TemplateRenderingRunResult[] {
    const initialRenderResult = this.measure(state.input, 'render-root-template', () =>
      this.renderRootTemplate(state)
    );
    return this.measure(state.input, 'render-recursive-views', () =>
      this.renderRecursiveViewResults(state, initialRenderResult)
    );
  }

  private renderRootTemplate(
    state: RuntimeRenderingMaterializationState,
  ): TemplateRenderingRunResult {
    const renderTargets = this.measure(state.input, 'root-render-target-inputs', () =>
      this.renderTargetInputs(
        state.input,
        state.source,
        state.records,
        state.openSeams,
      )
    );

    state.rootController.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Rendering,
      RuntimeControllerLifecycleStepKind.RenderInstructions,
      state.input.compiledTemplate.compiledTemplate.productHandle,
      state.input.compiledTemplate.compiledTemplate.sourceAddressHandle,
      'Rendering.render dispatched the root compiled-template instruction rows.',
    );
    return this.measure(state.input, 'root-render-dispatch', () =>
      state.input.compilerWorld.rendering.render({
        localKey: state.input.localKey,
        compiledTemplate: state.input.compiledTemplate.compiledTemplate,
        targets: renderTargets,
        instructions: state.input.compiledTemplate.instructions,
        rootController: state.rootController,
        provenanceHandle: state.source.provenanceHandle,
        host: this.renderHostForState(state),
        renderSurrogate: true,
      } satisfies TemplateRenderingRunRequest)
    );
  }

  private spendRenderResults(
    state: RuntimeRenderingMaterializationState,
    renderResults: readonly TemplateRenderingRunResult[],
  ): readonly RuntimeControllerFrame[] {
    return this.measure(state.input, 'spend-render-results', () => {
      const renderedInstructions = renderResults.flatMap((result) => result.renderedInstructions);
      const openInstructions = renderResults.flatMap((result) => result.openInstructions);
      const controllers = uniqueRuntimeControllers(renderResults.flatMap((result) => result.controllers));
      const controllerBindingClaimHandles = this.controllerPublication.controllerBindingClaimHandles(state.input.localKey, controllers);

      this.measure(state.input, 'record-open-instructions', () =>
        this.recordOpenInstructions(state, openInstructions)
      );

      this.measure(state.input, 'record-rendered-instructions', () =>
        this.renderedInstructionRecorder.recordRenderedInstructions(
          renderedInstructions,
          state.source,
          state.records,
          state.claims,
          state.targetOperations,
          state.scopeEffects,
          state.bindingRenderContexts,
          state.bindings,
          state.openSeams,
          controllerBindingClaimHandles,
        )
      );

      this.measure(state.input, 'record-rendered-controllers', () =>
        this.recordRenderedControllers(state, controllers)
      );
      return controllers;
    });
  }

  private measure<TValue>(
    input: RuntimeRenderingMaterializationRequest,
    name: RuntimeRenderingFinePhaseName,
    read: () => TValue,
  ): TValue {
    const profiling = input.profiling;
    if (profiling == null || !profiling.telemetry.captureFineGrainedPhases) {
      return read();
    }
    return measureSemanticRuntimePhase(
      profiling.phases,
      `runtime-rendering:${name}`,
      this.store,
      profiling.telemetry,
      read,
    );
  }

  private recordOpenInstructions(
    state: RuntimeRenderingMaterializationState,
    openInstructions: readonly TemplateRenderingRunResult['openInstructions'][number][],
  ): void {
    for (const open of openInstructions) {
      this.recordOpenSeam(
        open.local,
        open.summary,
        open.addressHandle,
        state.source,
        state.records,
        state.openSeams,
        KernelVocabulary.Instruction.OpenInstruction.key,
        open.reasonKinds,
      );
    }
  }

  private recordRenderedControllers(
    state: RuntimeRenderingMaterializationState,
    controllers: readonly RuntimeControllerFrame[],
  ): void {
    for (const controller of controllers) {
      this.controllerPublication.recordController(
        `${state.input.localKey}:controller:${controller.productHandle}`,
        controller,
        state.input.projectContext,
        state.source,
        state.records,
        state.claims,
        state.viewFactoryByController,
      );
    }
  }

  private emissionForState(
    state: RuntimeRenderingMaterializationState,
    controllers: readonly RuntimeControllerFrame[],
  ): RuntimeRenderingEmission {
    return new RuntimeRenderingEmission(
      state.rootController,
      controllers,
      state.bindings,
      uniqueRuntimeWatchers(controllers.flatMap((controller) => controller.readWatchers())),
      state.targetOperations,
      state.scopeEffects,
      state.viewFactories,
      state.embeddedDefinitions,
      state.bindingRenderContexts,
      state.childContainers(),
      state.controllerIssues,
      state.rendererIssues,
      state.bindingIssues,
      state.childSelfResolverSlots(),
      state.childContextResolverSlots(),
      state.dynamicInstructions,
      state.dynamicValueSites,
      state.dynamicExpressionParses,
      state.openSeams,
      state.records,
    );
  }

  private renderTargetInputs(
    input: RuntimeRenderingMaterializationRequest,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
  ): readonly TemplateRenderingTargetPlan[] {
    return this.renderTargetInputsForCompiledTemplate(
      input.localKey,
      input.compiledTemplate,
      source,
      records,
      openSeams,
    );
  }

  private renderTargetInputsForCompiledTemplate(
    localKey: string,
    compiledTemplate: CompiledTemplateEmission,
    source: RuntimeRenderingSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
  ): readonly TemplateRenderingTargetPlan[] {
    const sequencesByProduct = new Map(compiledTemplate.instructionSequences.map((sequence) => [sequence.productHandle, sequence]));
    const instructionsByProduct = new Map(compiledTemplate.instructions.map((instruction) => [instruction.productHandle, instruction]));
    const targets: TemplateRenderingTargetPlan[] = [];
    compiledTemplate.renderTargets.forEach((target, index) => {
      const sequence = sequencesByProduct.get(target.instructionSequenceProductHandle) ?? null;
      if (sequence == null) {
        this.recordOpenSeam(
          `${localKey}:target:${index}:missing-instruction-sequence`,
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
          `${localKey}:target:${index}:missing-instructions`,
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

  private renderRecursiveViewResults(
    state: RuntimeRenderingMaterializationState,
    initialRenderResult: TemplateRenderingRunResult,
  ): readonly TemplateRenderingRunResult[] {
    const results: TemplateRenderingRunResult[] = [initialRenderResult];
    const queue = [...initialRenderResult.controllers];
    const expandedTemplateControllers = new Set<ProductHandle>();
    const expandedCustomElementControllers = new Set<ProductHandle>();

    while (queue.length > 0) {
      const controller = queue.shift()!;
      let result: TemplateRenderingRunResult | null = null;
      if (controller.creationKind === RuntimeControllerCreationKind.TemplateController
        && controller.instructionProductHandle != null
        && !expandedTemplateControllers.has(controller.productHandle)) {
        expandedTemplateControllers.add(controller.productHandle);
        result = this.renderSyntheticViewForTemplateController(
          `${state.input.localKey}:controller:${controller.productHandle}:synthetic-view`,
          state,
          controller,
        );
      }
      if (result == null
        && isRecursiveRenderableCustomElementController(controller)
        && !expandedCustomElementControllers.has(controller.productHandle)) {
        expandedCustomElementControllers.add(controller.productHandle);
        result = this.renderCustomElementViewForController(
          `${state.input.localKey}:controller:${controller.productHandle}:custom-element-view`,
          state,
          controller,
        );
      }

      if (result == null) {
        continue;
      }
      results.push(result);
      queue.push(...result.controllers);
    }

    return results;
  }

  private renderCustomElementViewForController(
    local: string,
    state: RuntimeRenderingMaterializationState,
    controller: RuntimeControllerFrame,
  ): TemplateRenderingRunResult | null {
    if (this.hasRecursiveCustomElementDefinitionAncestor(controller)) {
      controller.recordRecursiveHydrationBoundary(
        `Custom element controller '${controller.name ?? '(anonymous)'}' recursively reaches the same custom-element definition through its controller ancestry; runtime-state dependent expansion is represented as a finite aggregate boundary.`,
      );
      return null;
    }

    const compiledTemplate = state.input.projectContext.readCompiledTemplateEmissionForDefinition(
      controller.definitionProductHandle,
    );
    if (compiledTemplate == null) {
      return null;
    }

    const targetInputs = this.measure(state.input, 'custom-element-target-inputs', () =>
      this.renderTargetInputsForCompiledTemplate(
        local,
        compiledTemplate,
        state.source,
        state.records,
        state.openSeams,
      )
    );
    if (targetInputs.length === 0 && compiledTemplate.compiledTemplate.targets.length > 0) {
      return null;
    }

    controller.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Rendering,
      RuntimeControllerLifecycleStepKind.RenderInstructions,
      compiledTemplate.compiledTemplate.productHandle,
      compiledTemplate.compiledTemplate.sourceAddressHandle,
      'Rendering.render dispatched the child custom-element compiled-template instruction rows.',
    );
    return this.measure(state.input, 'custom-element-render-dispatch', () =>
      state.input.compilerWorld.rendering.render({
        localKey: `${state.input.localKey}:custom-element-view:${controller.productHandle}`,
        compiledTemplate: compiledTemplate.compiledTemplate,
        targets: targetInputs,
        instructions: this.instructionsForControllerView(state, compiledTemplate),
        rootController: controller,
        provenanceHandle: state.source.provenanceHandle,
        host: this.renderHostForState(state),
        renderSurrogate: true,
      } satisfies TemplateRenderingRunRequest)
    );
  }

  private hasRecursiveCustomElementDefinitionAncestor(
    controller: RuntimeControllerFrame,
  ): boolean {
    const definitionProductHandle = controller.definitionProductHandle;
    if (definitionProductHandle == null) {
      return false;
    }
    let current = controller.parent;
    while (current != null) {
      if (current.definitionProductHandle === definitionProductHandle
        && isRecursiveRenderableCustomElementController(current)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private renderSyntheticViewForTemplateController(
    local: string,
    state: RuntimeRenderingMaterializationState,
    controller: RuntimeControllerFrame,
  ): TemplateRenderingRunResult | null {
    const sequence = this.syntheticViewInstructionSequence(local, state, controller);
    if (sequence == null) {
      return null;
    }

    const viewFactory = this.viewFactoryMaterializer.ensureForTemplateController(
      `${local}:view-factory`,
      controller,
      sequence.productHandle,
      state.source,
      state.records,
      state.viewFactories,
      state.embeddedDefinitions,
      state.viewFactoryByController,
    );
    const syntheticController = this.controllerCreation.createSyntheticViewController(local, viewFactory, state.source);
    controller.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Hydration,
      RuntimeControllerLifecycleStepKind.CreateSyntheticView,
      syntheticController.productHandle,
      syntheticController.sourceAddressHandle,
      'IViewFactory.create produced an aggregate synthetic-view controller for nested instruction analysis.',
    );
    const ownerCompiledTemplate = this.compiledTemplateForControllerView(state, controller);
    const instructions = this.instructionsForControllerView(state, ownerCompiledTemplate);
    const targetInputs = this.measure(state.input, 'synthetic-view-target-inputs', () =>
      this.syntheticViewRenderingTargetInputs(
        local,
        sequence,
        instructions,
        state.source,
        state.records,
        state.openSeams,
      )
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
    return this.measure(state.input, 'synthetic-view-render-dispatch', () =>
      state.input.compilerWorld.rendering.render({
        localKey: `${state.input.localKey}:synthetic-view:${syntheticController.productHandle}`,
        compiledTemplate: ownerCompiledTemplate.compiledTemplate,
        targets: targetInputs,
        instructions,
        rootController: syntheticController,
        provenanceHandle: state.source.provenanceHandle,
        host: this.renderHostForState(state),
        renderSurrogate: false,
      } satisfies TemplateRenderingRunRequest)
    );
  }

  private compiledTemplateForControllerView(
    state: RuntimeRenderingMaterializationState,
    controller: RuntimeControllerFrame,
  ): CompiledTemplateEmission {
    let current: RuntimeControllerFrame | null = controller;
    while (current != null) {
      const compiledTemplate = state.input.projectContext.readCompiledTemplateEmissionForDefinition(
        current.definitionProductHandle,
      );
      if (compiledTemplate != null) {
        return compiledTemplate;
      }
      current = current.parent;
    }
    return state.input.compiledTemplate;
  }

  private instructionsForControllerView(
    state: RuntimeRenderingMaterializationState,
    compiledTemplate: CompiledTemplateEmission,
  ): readonly TemplateInstruction[] {
    return [
      ...compiledTemplate.instructions,
      ...state.dynamicInstructions,
    ];
  }

  private renderHostForState(
    state: RuntimeRenderingMaterializationState,
  ): TemplateRenderingRunHost {
    return {
      allocate: (allocationLocal) => this.allocate(allocationLocal),
      createChildController: (creation) => this.controllerCreation.createChildController(
        creation,
        state.input.typeSystem,
        state.source,
        state.records,
        state.childContainerEmissions,
        state.openSeams,
        state.controllerIssues,
        (name, read) => this.measure(state.input, `controller-creation:${name}`, read),
        state.input.contextResolverRecordPolicy,
        state.input.projectKey,
        state.input.resourceDefinitions,
      ),
      compileSpread: (spread) => this.spreadBindingCreator.create(spread, state),
      measureRenderingPhase: (name, read) => this.measure(state.input, name as RuntimeRenderingFinePhaseName, read),
      recordRendererIssue: (local, renderer, instruction, phase, issueKind, message, frameworkErrorCode, sourceAddressHandle) => {
        const publication = this.rendererIssuePublisher.publish(
          local,
          renderer,
          instruction.productHandle,
          instruction.identityHandle,
          state.source.provenanceHandle,
          phase,
          issueKind,
          message,
          frameworkErrorCode,
          sourceAddressHandle,
        );
        state.records.push(...publication.records);
        state.rendererIssues.push(publication.issue);
      },
    };
  }

  private syntheticViewInstructionSequence(
    local: string,
    state: RuntimeRenderingMaterializationState,
    controller: RuntimeControllerFrame,
  ): TemplateInstructionSequence | null {
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
    if (sequence != null) {
      return sequence;
    }

    this.recordOpenSeam(
      `${local}:missing-child-sequence`,
      `Template-controller '${controller.name ?? '(anonymous)'} has a child-view instruction sequence handle, but the sequence detail is not available for synthetic Rendering.render emulation.`,
      controller.sourceAddressHandle,
      state.source,
      state.records,
      state.openSeams,
    );
    return null;
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
    reasonKinds: readonly OpenSeamReasonKind[] = [],
  ): void {
    const seam = new OpenSeam(
      this.store.handles.openSeam(local),
      seamKindKey,
      summary,
      addressHandle,
      source.evidenceHandle,
      reasonKinds,
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

function uniqueRuntimeWatchers(
  watchers: readonly RuntimeWatcher[],
): readonly RuntimeWatcher[] {
  const seen = new Set<ProductHandle>();
  const result: RuntimeWatcher[] = [];
  for (const watcher of watchers) {
    if (seen.has(watcher.productHandle)) {
      continue;
    }
    seen.add(watcher.productHandle);
    result.push(watcher);
  }
  return result;
}

function isRecursiveRenderableCustomElementController(
  controller: RuntimeControllerFrame,
): boolean {
  return controller.creationKind === RuntimeControllerCreationKind.CustomElement
    || controller.creationKind === RuntimeControllerCreationKind.RoutedCustomElement;
}
