import { type SemanticClaim } from '../kernel/claim.js';
import type { Container } from '../di/container.js';
import {
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
  type ContainerChildMaterializationEmission,
  ContainerContextResolverSlotRequest,
} from '../di/container-materializer.js';
import type {
  ContainerResolverSlot,
  ContainerSelfResolverSlot,
} from '../di/container-slot.js';
import { FrameworkIntrinsicDiKey } from '../di/framework-intrinsic-di-key.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import {
  OpenSeam,
  type OpenSeamReasonKind,
} from '../kernel/open-seam.js';
import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  MaterializationRecord,
  type MaterializationOwnerHandle,
} from '../kernel/materialization.js';
import {
  ConfigurationProductDetails,
} from '../configuration/product-details.js';
import {
  type AuSlotsInfo,
  type RuntimeHydrationContext,
  type ViewFactory,
} from '../configuration/controller.js';
import {
  RegistrationValueKind,
  RegistrationValueReference,
} from '../registration/registration-reference.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelDetailAdmission,
  type KernelPublicationContext,
  KernelPublicationPlan,
  KernelStoreBatch,
  publishProductDetail,
  publishProductDetails,
} from '../kernel/publication.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import type { CompiledTemplateEmission } from './compiled-template-materializer.js';
import type { AttributeSyntaxParseEmission } from './attribute-syntax-materializer.js';
import {
  type RuntimeBinding,
  type RuntimeBindingScopeEffect,
  type RuntimeTargetOperation,
} from './runtime-binding.js';
import type { RuntimeWatcher } from './runtime-watcher.js';
import {
  RuntimeRendererAllocation,
} from './runtime-renderer.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import {
  type TemplateRenderingRunHost,
  type TemplateRenderingRunResult,
  type TemplateRenderingRunRequest,
  type TemplateRenderingTargetPlan,
} from './compiler-world.js';
import { TemplateProductDetails } from './product-details.js';
import { ObservationProductDetails } from '../observation/product-details.js';
import {
  RuntimeControllerCreationKind,
  type RuntimeControllerFrame,
  RuntimeControllerAssemblyStage,
  RuntimeControllerAssemblyStepKind,
} from './runtime-controller.js';
import {
  type CustomElementDefinition,
} from '../resources/custom-element-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  HydrateElementInstruction,
  type HydrateElementProjectionInstructionSequence,
  HydrateTemplateControllerInstruction,
  type TemplateInstruction,
  type TemplateInstructionSequence,
} from './instruction-ir.js';
import {
  type TemplateExpressionParse,
  type TemplateValueSite,
} from './value-site.js';
import { RuntimeRenderingSourceSet } from './runtime-rendering-source.js';
import {
  RuntimeBindingInstructionEnvironment,
  type RuntimeBindingRenderContext,
  RuntimeRenderedInstructionRecorder,
} from './runtime-rendered-instruction-recorder.js';
import type {
  TemplateRuntimeAnalysisProjectContext,
} from './template-runtime-analysis-context.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import { ObserverLocator } from '../observation/observer-locator.js';
import {
  syntheticViewTargetInputs,
} from './runtime-synthetic-view-targets.js';
import { expressionProductHandlesForRuntimeBinding } from './runtime-binding-expression-products.js';
import {
  type RuntimeViewFactoryMaterialization,
  RuntimeViewFactoryMaterializer,
} from './runtime-view-factory-materializer.js';
import {
  RuntimeContentProjectionClosureKind,
  RuntimeContentProjectionSelectionKind,
  RuntimeContentProjectionView,
} from './runtime-content-projection.js';
import { RuntimeControllerPublicationMaterializer } from './runtime-controller-publication.js';
import { RuntimeControllerCreationMaterializer } from './runtime-controller-creation-materializer.js';
import {
  type RuntimeDynamicInstructionContext,
  RuntimeSpreadBindingCreator,
} from './runtime-spread-binding-creator.js';
import type { RuntimeControllerIssue } from './runtime-controller-issue.js';
import type { RuntimeBindingIssue } from './runtime-binding-issue.js';
import type { TemplateCompilerIssue } from './compiler-issue.js';
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
  /** Shared checker projection/cache world for this complete app-analysis generation. */
  readonly expressionWorld: CheckerExpressionTypeWorld;
  /** Optional fine-grained telemetry sink owned by the surrounding inquiry profile. */
  readonly profiling?: SemanticRuntimePhaseSink | null;
}

export class RuntimeRenderingEmission {
  private readonly bindingsByInstruction = new Map<ProductHandle, RuntimeBinding[]>();
  private readonly bindingsByExpressionProduct = new Map<ProductHandle, RuntimeBinding[]>();
  private readonly bindingsByProduct = new Map<ProductHandle, RuntimeBinding>();
  private readonly effectsByOwner = new Map<ProductHandle, RuntimeBindingScopeEffect[]>();
  private readonly renderContextsByBinding = new Map<ProductHandle, RuntimeBindingRenderContext>();
  private readonly controllersByInstruction = new Map<ProductHandle, RuntimeControllerFrame[]>();
  private readonly syntheticControllersByOwnerInstruction = new Map<ProductHandle, RuntimeControllerFrame[]>();
  private readonly contentProjectionViewsByOutletController = new Map<ProductHandle, RuntimeContentProjectionView[]>();
  private readonly dynamicInstructionContextsByProduct = new Map<ProductHandle, RuntimeDynamicInstructionContext>();
  private readonly controllersByProduct = new Map<ProductHandle, RuntimeControllerFrame>();

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
    /** Runtime IAuSlotsInfo values installed for custom-element instructions with provider content. */
    readonly auSlotsInfos: readonly AuSlotsInfo[],
    /** Runtime IHydrationContext values installed by custom-element controllers. */
    readonly hydrationContexts: readonly RuntimeHydrationContext[],
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
    /** Template-compiler issues discovered while dynamic captured attributes are compiled. */
    readonly compilerIssues: readonly TemplateCompilerIssue[],
    /** Built-in IContainer self resolver rows installed on runtime child containers. */
    readonly childSelfResolverSlots: readonly ContainerSelfResolverSlot[],
    /** Hydration-context resolver slots installed on runtime child containers. */
    readonly childContextResolverSlots: readonly ContainerResolverSlot[],
    /** Instructions allocated during runtime TemplateCompiler.compileSpread emulation. */
    readonly dynamicInstructions: readonly TemplateInstruction[],
    /** Exact hydration contexts used to compile each runtime-created instruction. */
    readonly dynamicInstructionContexts: readonly RuntimeDynamicInstructionContext[],
    /** Value sites allocated during runtime TemplateCompiler.compileSpread emulation. */
    readonly dynamicValueSites: readonly TemplateValueSite[],
    /** Expression parses allocated during runtime TemplateCompiler.compileSpread emulation. */
    readonly dynamicExpressionParses: readonly TemplateExpressionParse[],
    /** Open renderer-loop pressures that should remain visible to inquiry. */
    readonly openSeams: readonly OpenSeam[],
    /** Statically reachable AuSlot projection/fallback/empty view relations. */
    readonly contentProjectionViews: readonly RuntimeContentProjectionView[],
    /** Kernel records emitted for binding products, effect products, provenance, and claims. */
    readonly records: readonly KernelStoreRecord[],
  ) {
    for (const binding of bindings) {
      const instructionBindings = this.bindingsByInstruction.get(binding.instructionProductHandle) ?? [];
      instructionBindings.push(binding);
      this.bindingsByInstruction.set(binding.instructionProductHandle, instructionBindings);
      for (const expressionProductHandle of expressionProductHandlesForRuntimeBinding(binding)) {
        const expressionBindings = this.bindingsByExpressionProduct.get(expressionProductHandle) ?? [];
        expressionBindings.push(binding);
        this.bindingsByExpressionProduct.set(expressionProductHandle, expressionBindings);
      }
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
      this.controllersByProduct.set(controller.productHandle, controller);
      if (controller.instructionProductHandle != null) {
        const controllersForInstruction = this.controllersByInstruction.get(controller.instructionProductHandle) ?? [];
        controllersForInstruction.push(controller);
        this.controllersByInstruction.set(controller.instructionProductHandle, controllersForInstruction);
      }
      if (controller.creationKind === RuntimeControllerCreationKind.SyntheticView
        && controller.syntheticOwnerInstructionProductHandle != null) {
        const controllers = this.syntheticControllersByOwnerInstruction.get(
          controller.syntheticOwnerInstructionProductHandle,
        ) ?? [];
        controllers.push(controller);
        this.syntheticControllersByOwnerInstruction.set(controller.syntheticOwnerInstructionProductHandle, controllers);
      }
    }
    for (const view of contentProjectionViews) {
      const views = this.contentProjectionViewsByOutletController.get(view.outletController.productHandle) ?? [];
      views.push(view);
      this.contentProjectionViewsByOutletController.set(view.outletController.productHandle, views);
    }
    for (const context of dynamicInstructionContexts) {
      this.dynamicInstructionContextsByProduct.set(context.instructionProductHandle, context);
    }
  }

  /** Returns the materialized runtime bindings for a lowered instruction across all recursive render contexts. */
  readBindingsForInstruction(productHandle: ProductHandle): readonly RuntimeBinding[] {
    return this.bindingsByInstruction.get(productHandle) ?? [];
  }

  /** Returns runtime bindings that consume one exact expression product across recursive render contexts. */
  readBindingsForExpressionProduct(productHandle: ProductHandle): readonly RuntimeBinding[] {
    return this.bindingsByExpressionProduct.get(productHandle) ?? [];
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

  requireRenderContextForBinding(productHandle: ProductHandle): RuntimeBindingRenderContext {
    const context = this.readRenderContextForBinding(productHandle);
    if (context == null) {
      throw new Error(`Runtime binding '${productHandle}' has no owning render context.`);
    }
    return context;
  }

  readController(productHandle: ProductHandle): RuntimeControllerFrame | null {
    return this.controllersByProduct.get(productHandle) ?? null;
  }

  readControllerForInstructionUnderParent(
    productHandle: ProductHandle,
    parent: RuntimeControllerFrame | null,
  ): RuntimeControllerFrame | null {
    if (parent == null) {
      const controllers = this.readControllersForInstruction(productHandle);
      return controllers.length === 1 ? controllers[0]! : null;
    }
    return this.readControllersForInstruction(productHandle).find((controller) =>
      controller.parent?.productHandle === parent.productHandle
    ) ?? null;
  }

  readControllersForInstruction(productHandle: ProductHandle): readonly RuntimeControllerFrame[] {
    return this.controllersByInstruction.get(productHandle) ?? [];
  }

  readSyntheticControllerForOwnerInstruction(productHandle: ProductHandle): RuntimeControllerFrame | null {
    return this.readSyntheticControllersForOwnerInstruction(productHandle)[0] ?? null;
  }

  readSyntheticControllerForOwnerInstructionUnderController(
    productHandle: ProductHandle,
    owner: RuntimeControllerFrame | null,
  ): RuntimeControllerFrame | null {
    if (owner == null) {
      return this.readSyntheticControllerForOwnerInstruction(productHandle);
    }
    return this.readSyntheticControllersForOwnerInstruction(productHandle).find((controller) =>
      controller.parent?.productHandle === owner.productHandle
    ) ?? null;
  }

  readSyntheticControllersForOwnerInstruction(productHandle: ProductHandle): readonly RuntimeControllerFrame[] {
    return this.syntheticControllersByOwnerInstruction.get(productHandle) ?? [];
  }

  readContentProjectionViewsForOutletController(
    productHandle: ProductHandle,
  ): readonly RuntimeContentProjectionView[] {
    return this.contentProjectionViewsByOutletController.get(productHandle) ?? [];
  }

  readDynamicInstructionContext(productHandle: ProductHandle): RuntimeDynamicInstructionContext | null {
    return this.dynamicInstructionContextsByProduct.get(productHandle) ?? null;
  }
}

class RuntimeEmbeddedViewRendering {
  constructor(
    readonly viewFactory: RuntimeViewFactoryMaterialization,
    readonly syntheticController: RuntimeControllerFrame,
    readonly recursiveResult: TemplateRenderingRunResult | null,
  ) {}
}

class RuntimeRenderingMaterializationState {
  readonly records: KernelStoreRecord[] = [];
  readonly bindings: RuntimeBinding[] = [];
  readonly targetOperations: RuntimeTargetOperation[] = [];
  readonly scopeEffects: RuntimeBindingScopeEffect[] = [];
  readonly viewFactories: ViewFactory[] = [];
  readonly auSlotsInfos: AuSlotsInfo[] = [];
  readonly embeddedDefinitions: CustomElementDefinition[] = [];
  readonly bindingRenderContexts: RuntimeBindingRenderContext[] = [];
  readonly childContainerEmissions: ContainerChildMaterializationEmission[] = [];
  readonly controllerIssues: RuntimeControllerIssue[] = [];
  readonly rendererIssues: RuntimeRendererIssue[] = [];
  readonly bindingIssues: RuntimeBindingIssue[] = [];
  readonly compilerIssues: TemplateCompilerIssue[] = [];
  readonly dynamicInstructions: TemplateInstruction[] = [];
  readonly dynamicInstructionContexts: RuntimeDynamicInstructionContext[] = [];
  readonly dynamicValueSites: TemplateValueSite[] = [];
  readonly dynamicExpressionParses: TemplateExpressionParse[] = [];
  readonly openSeams: OpenSeam[] = [];
  readonly contentProjectionViews: RuntimeContentProjectionView[] = [];
  readonly claims: SemanticClaim[] = [];
  readonly viewFactoryByController = new Map<ProductHandle, RuntimeViewFactoryMaterialization>();
  readonly embeddedDefinitionByInstructionSequence = new Map<ProductHandle, CustomElementDefinition>();
  private readonly controllersByProduct = new Map<ProductHandle, RuntimeControllerFrame>();

  constructor(
    readonly input: RuntimeRenderingMaterializationRequest,
    readonly source: RuntimeRenderingSourceSet,
    readonly rootController: RuntimeControllerFrame,
    readonly observerLocator: ObserverLocator,
    readonly intrinsicEmptyAuSlotsInfo: AuSlotsInfo,
  ) {
    this.records.push(...source.records);
    this.auSlotsInfos.push(intrinsicEmptyAuSlotsInfo);
    this.registerController(rootController);
  }

  registerController(controller: RuntimeControllerFrame): RuntimeControllerFrame {
    const existing = this.controllersByProduct.get(controller.productHandle);
    if (existing != null && existing !== controller) {
      throw new Error(`Runtime controller '${controller.productHandle}' was allocated more than once.`);
    }
    this.controllersByProduct.set(controller.productHandle, controller);
    return controller;
  }

  readController(productHandle: ProductHandle): RuntimeControllerFrame | null {
    return this.controllersByProduct.get(productHandle) ?? null;
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
  private readonly childContainerMaterializer: ContainerChildMaterializer;
  private readonly controllerPublication: RuntimeControllerPublicationMaterializer;
  private readonly spreadBindingCreator: RuntimeSpreadBindingCreator;
  private readonly rendererIssuePublisher: RuntimeRendererIssuePublisher;

  constructor(
    /** Hot analysis store that receives runtime binding products. */
    readonly store: KernelStore,
    /** Immediate or staged publication shared by the complete app-analysis generation. */
    readonly publication: KernelPublicationContext,
  ) {
    this.controllerCreation = new RuntimeControllerCreationMaterializer(store, publication);
    this.renderedInstructionRecorder = new RuntimeRenderedInstructionRecorder(store);
    this.viewFactoryMaterializer = new RuntimeViewFactoryMaterializer(store, publication);
    this.childContainerMaterializer = new ContainerChildMaterializer(store, publication);
    this.controllerPublication = new RuntimeControllerPublicationMaterializer(store, publication);
    this.spreadBindingCreator = new RuntimeSpreadBindingCreator(store, publication);
    this.rendererIssuePublisher = new RuntimeRendererIssuePublisher(store);
  }

  materialize(input: RuntimeRenderingMaterializationRequest): RuntimeRenderingEmission {
    const emission = this.recordsForRendering(input);
    this.measure(input, 'commit-records', () => this.publishEmission(input, emission));
    return emission;
  }

  private publishEmission(
    input: RuntimeRenderingMaterializationRequest,
    emission: RuntimeRenderingEmission,
  ): void {
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `runtime-rendering:${input.localKey}`),
      [
        ...publishProductDetails(TemplateProductDetails.RuntimeBinding, emission.bindings),
        ...publishProductDetails(TemplateProductDetails.RuntimeWatcher, emission.watchers),
        ...publishProductDetails(
          ObservationProductDetails.RuntimeWatcherObservedDependency,
          emission.watchers.flatMap((watcher) => watcher.observedDependencies),
        ),
        ...publishProductDetails(TemplateProductDetails.RuntimeBindingTargetOperation, emission.targetOperations),
        ...publishProductDetails(TemplateProductDetails.RuntimeBindingScopeEffect, emission.scopeEffects),
        ...publishProductDetails(TemplateProductDetails.RuntimeControllerIssue, emission.controllerIssues),
        ...publishProductDetails(TemplateProductDetails.RuntimeRendererIssue, emission.rendererIssues),
        ...publishProductDetails(TemplateProductDetails.RuntimeBindingIssue, emission.bindingIssues),
        ...publishProductDetails(TemplateProductDetails.CompilerIssue, emission.compilerIssues),
        ...publishProductDetails(ConfigurationProductDetails.ViewFactory, emission.viewFactories),
        ...publishProductDetails(ConfigurationProductDetails.AuSlotsInfo, emission.auSlotsInfos),
        ...publishProductDetails(ConfigurationProductDetails.HydrationContext, emission.hydrationContexts),
        ...emission.embeddedDefinitions.flatMap((definition) => definition.productHandle == null
          ? []
          : [publishProductDetail(ResourceProductDetails.Definition, definition.productHandle, definition)]
        ),
        ...publishProductDetails(
          TemplateProductDetails.Instruction,
          emission.dynamicInstructions,
          KernelDetailAdmission.IfAbsent,
        ),
        ...publishProductDetails(TemplateProductDetails.ValueSite, emission.dynamicValueSites),
        ...publishProductDetails(TemplateProductDetails.ExpressionParse, emission.dynamicExpressionParses),
      ],
    ));
  }

  private recordsForRendering(input: RuntimeRenderingMaterializationRequest): RuntimeRenderingEmission {
    const source = this.measure(input, 'source-records', () => this.recordsForSource(input.localKey));
    const observerLocator = new ObserverLocator(
      this.store,
      input.expressionWorld.projector,
      input.compilerWorld.world.nodeObserverLocatorConfiguration ?? undefined,
    );
    const rootDependencyRecords: KernelStoreRecord[] = [];
    const rootChildContainers: ContainerChildMaterializationEmission[] = [];
    const intrinsicEmptyAuSlotsInfo = this.controllerCreation.createIntrinsicEmptyAuSlotsInfo(
      input.localKey,
      source,
      rootDependencyRecords,
    );
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
    const state = new RuntimeRenderingMaterializationState(
      input,
      source,
      rootController,
      observerLocator,
      intrinsicEmptyAuSlotsInfo,
    );
    state.records.push(...rootDependencyRecords);
    state.childContainerEmissions.push(...rootChildContainers);
    this.measure(input, 'controller-observer-setup', () =>
      this.controllerCreation.recordControllerObserverSetupIssues(
        rootController,
        input.definition,
        input.typeSystem,
        state.observerLocator,
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

    state.rootController.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Rendering,
      RuntimeControllerAssemblyStepKind.RenderInstructions,
      state.input.compiledTemplate.compiledTemplate.productHandle,
      state.input.compiledTemplate.compiledTemplate.sourceAddressHandle,
      'Rendering.render dispatched the root compiled-template instruction rows.',
    );
    return this.measure(state.input, 'root-render-dispatch', () =>
      state.input.compilerWorld.rendering.render({
        localKey: state.input.localKey,
        compiledTemplate: state.input.compiledTemplate.compiledTemplate,
        resourceScope: state.input.compilerWorld.resourceScope,
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
      const openInstructions = renderResults.flatMap((result) => result.openInstructions);
      const controllers = uniqueRuntimeControllers(renderResults.flatMap((result) => result.controllers));
      const controllerBindingClaimHandles = this.controllerPublication.controllerBindingClaimHandles(state.input.localKey, controllers);
      const instructionEnvironments = this.bindingInstructionEnvironments(state);

      this.measure(state.input, 'record-open-instructions', () =>
        this.recordOpenInstructions(state, openInstructions)
      );

      this.measure(state.input, 'record-rendered-instructions', () => {
        for (const result of renderResults) {
          this.renderedInstructionRecorder.recordRenderedInstructions(
            result.renderedInstructions,
            state.source,
            state.records,
            state.claims,
            state.targetOperations,
            state.scopeEffects,
            state.bindingRenderContexts,
            state.bindings,
            state.openSeams,
            controllerBindingClaimHandles,
            result.resourceScope,
            instructionEnvironments,
          );
        }
      });

      this.measure(state.input, 'record-rendered-controllers', () =>
        this.recordRenderedControllers(state, controllers)
      );
      return controllers;
    });
  }

  private bindingInstructionEnvironments(
    state: RuntimeRenderingMaterializationState,
  ): ReadonlyMap<ProductHandle, RuntimeBindingInstructionEnvironment> {
    const environments = new Map<ProductHandle, RuntimeBindingInstructionEnvironment>();
    for (const context of state.dynamicInstructionContexts) {
      const sourceControllerProductHandle = context.hydrationContext.controller.productHandle;
      const sourceController = sourceControllerProductHandle == null
        ? null
        : state.readController(sourceControllerProductHandle);
      const resource = state.input.projectContext.readResourceForDefinition(
        context.requestorDefinitionProductHandle,
      );
      if (sourceController == null || resource == null) {
        throw new Error(
          `Runtime-created instruction '${context.instructionProductHandle}' lost its compiler or hydration context.`,
        );
      }
      environments.set(
        context.instructionProductHandle,
        new RuntimeBindingInstructionEnvironment(
          sourceController,
          resource.compilerWorld.resourceScope,
        ),
      );
    }
    return environments;
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
      profiling.kernel,
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
        open.ownerHandle,
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
      state.auSlotsInfos,
      uniqueRuntimeHydrationContexts([
        state.rootController,
        ...controllers,
      ].flatMap((controller) => {
        const context = controller.readHydrationContext();
        return context == null ? [] : [context];
      })),
      state.embeddedDefinitions,
      state.bindingRenderContexts,
      state.childContainers(),
      state.controllerIssues,
      state.rendererIssues,
      state.bindingIssues,
      state.compilerIssues,
      state.childSelfResolverSlots(),
      state.childContextResolverSlots(),
      state.dynamicInstructions,
      state.dynamicInstructionContexts,
      state.dynamicValueSites,
      state.dynamicExpressionParses,
      state.openSeams,
      state.contentProjectionViews,
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
          target.identityHandle,
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
          sequence.identityHandle,
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
    const expandedContentProjectionControllers = new Set<ProductHandle>();

    while (queue.length > 0) {
      const controller = queue.shift()!;
      const recursiveResults: TemplateRenderingRunResult[] = [];
      if (controller.creationKind === RuntimeControllerCreationKind.TemplateController
        && controller.instructionProductHandle != null
        && !expandedTemplateControllers.has(controller.productHandle)) {
        expandedTemplateControllers.add(controller.productHandle);
        const result = this.renderSyntheticViewForTemplateController(
          `${state.input.localKey}:controller:${controller.productHandle}:synthetic-view`,
          state,
          controller,
        );
        if (result != null) {
          recursiveResults.push(result);
        }
      }
      if (isRecursiveRenderableCustomElementController(controller)
        && !expandedCustomElementControllers.has(controller.productHandle)) {
        expandedCustomElementControllers.add(controller.productHandle);
        const result = this.renderCustomElementViewForController(
          `${state.input.localKey}:controller:${controller.productHandle}:custom-element-view`,
          state,
          controller,
        );
        if (result != null) {
          recursiveResults.push(result);
        }
      }
      if (this.auSlotInstructionForController(state, controller) != null
        && !expandedContentProjectionControllers.has(controller.productHandle)) {
        expandedContentProjectionControllers.add(controller.productHandle);
        const result = this.renderContentProjectionForAuSlot(
          `${state.input.localKey}:controller:${controller.productHandle}:content-projection`,
          state,
          controller,
        );
        if (result != null) {
          recursiveResults.push(result);
        }
      }
      for (const recursiveResult of recursiveResults) {
        results.push(recursiveResult);
        queue.push(...recursiveResult.controllers.filter((candidate) =>
          candidate.productHandle !== recursiveResult.rootController.productHandle
        ));
      }
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

    const resource = state.input.projectContext.readResourceForDefinition(
      controller.definitionProductHandle,
    );
    if (resource == null) {
      return null;
    }
    const compiledTemplate = resource.compiledTemplateEmission;

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

    controller.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Rendering,
      RuntimeControllerAssemblyStepKind.RenderInstructions,
      compiledTemplate.compiledTemplate.productHandle,
      compiledTemplate.compiledTemplate.sourceAddressHandle,
      'Rendering.render dispatched the child custom-element compiled-template instruction rows.',
    );
    const result = this.measure(state.input, 'custom-element-render-dispatch', () =>
      resource.compilerWorld.rendering.render({
        localKey: `${state.input.localKey}:custom-element-view:${controller.productHandle}`,
        compiledTemplate: compiledTemplate.compiledTemplate,
        resourceScope: resource.compilerWorld.resourceScope,
        targets: targetInputs,
        instructions: this.instructionsForControllerView(state, compiledTemplate),
        rootController: controller,
        provenanceHandle: state.source.provenanceHandle,
        host: this.renderHostForState(state),
        renderSurrogate: true,
      } satisfies TemplateRenderingRunRequest)
    );
    return result;
  }

  private renderContentProjectionForAuSlot(
    local: string,
    state: RuntimeRenderingMaterializationState,
    outletController: RuntimeControllerFrame,
  ): TemplateRenderingRunResult | null {
    const outletInstruction = this.auSlotInstructionForController(state, outletController);
    if (outletInstruction == null) {
      return null;
    }
    const constructionHydrationContext = outletController.readConstructionHydrationContext();
    const providerInstruction = this.instructionForHydrationContext(state, constructionHydrationContext);
    const slotName = outletInstruction.auSlotProcessContent!.name;
    const selected = providerInstruction?.projectionInstructionSequences.find((projection) =>
      projection.slotName === slotName
    ) ?? null;
    const fallback = selected == null
      ? outletInstruction.projectionInstructionSequences.find((projection) =>
          projection.slotName === 'default'
        ) ?? null
      : null;
    const projection = selected ?? fallback;
    const selectionKind = selected != null
      ? RuntimeContentProjectionSelectionKind.Projected
      : fallback != null
        ? RuntimeContentProjectionSelectionKind.Fallback
        : RuntimeContentProjectionSelectionKind.Empty;
    const receivingController = this.controllerForHydrationContext(
      state,
      constructionHydrationContext,
    );
    const factoryHydrationContext = selected == null
      ? constructionHydrationContext
      : constructionHydrationContext?.parent ?? null;
    const declaringController = selected != null
      ? this.controllerForHydrationContext(state, factoryHydrationContext)
      : receivingController;
    const slotsInfo = receivingController?.readAuSlotsInfo() ?? null;
    if (projection == null) {
      state.contentProjectionViews.push(new RuntimeContentProjectionView(
        selectionKind,
        RuntimeContentProjectionClosureKind.Complete,
        slotName,
        outletInstruction,
        outletController,
        providerInstruction,
        null,
        null,
        declaringController,
        receivingController,
        null,
        null,
        null,
        factoryHydrationContext,
        slotsInfo,
        outletInstruction.sourceAddressHandle,
      ));
      return null;
    }

    const sequence = state.input.projectContext.readInstructionSequence(
      projection.instructionSequenceProductHandle,
    );
    if (sequence == null) {
      this.recordOpenSeam(
        `${local}:missing-projection-sequence`,
        outletController.identityHandle,
        `AuSlot '${slotName}' selected instruction sequence '${projection.instructionSequenceProductHandle}', but its compiler product is unavailable to recursive Rendering.render emulation.`,
        projection.sourceAddressHandle,
        state.source,
        state.records,
        state.openSeams,
      );
      state.contentProjectionViews.push(new RuntimeContentProjectionView(
        selectionKind,
        RuntimeContentProjectionClosureKind.Open,
        slotName,
        outletInstruction,
        outletController,
        providerInstruction,
        projection,
        null,
        declaringController,
        receivingController,
        null,
        null,
        null,
        factoryHydrationContext,
        slotsInfo,
        projection.sourceAddressHandle,
      ));
      return null;
    }

    const factoryContainer = this.materializeContentProjectionContainer(
      local,
      state,
      selectionKind,
      receivingController,
      declaringController,
      factoryHydrationContext,
      projection.sourceAddressHandle,
    );
    if (factoryContainer == null) {
      state.contentProjectionViews.push(new RuntimeContentProjectionView(
        selectionKind,
        RuntimeContentProjectionClosureKind.Open,
        slotName,
        outletInstruction,
        outletController,
        providerInstruction,
        projection,
        sequence,
        declaringController,
        receivingController,
        null,
        null,
        null,
        factoryHydrationContext,
        slotsInfo,
        projection.sourceAddressHandle,
      ));
      return null;
    }
    const embedded = this.renderEmbeddedView(
      local,
      state,
      outletController,
      factoryContainer,
      sequence,
      factoryHydrationContext,
    );
    state.contentProjectionViews.push(new RuntimeContentProjectionView(
      selectionKind,
      embedded.recursiveResult == null
        ? RuntimeContentProjectionClosureKind.Open
        : RuntimeContentProjectionClosureKind.Complete,
      slotName,
      outletInstruction,
      outletController,
      providerInstruction,
      projection,
      sequence,
      declaringController,
      receivingController,
      embedded.viewFactory.viewFactory,
      embedded.syntheticController,
      factoryContainer,
      factoryHydrationContext,
      slotsInfo,
      projection.sourceAddressHandle,
    ));
    return embedded.recursiveResult;
  }

  private materializeContentProjectionContainer(
    local: string,
    state: RuntimeRenderingMaterializationState,
    selectionKind: RuntimeContentProjectionSelectionKind,
    receivingController: RuntimeControllerFrame | null,
    declaringController: RuntimeControllerFrame | null,
    factoryHydrationContext: RuntimeHydrationContext | null,
    sourceAddressHandle: AddressHandle | null,
  ): Container | null {
    const receivingContainer = receivingController?.containerFrame ?? null;
    if (receivingContainer == null) {
      this.recordOpenSeam(
        `${local}:missing-receiving-container`,
        receivingController?.identityHandle ?? state.rootController.identityHandle,
        'AuSlot view-factory construction needs the receiving controller container, but no runtime container frame was modeled.',
        sourceAddressHandle,
        state.source,
        state.records,
        state.openSeams,
        KernelVocabulary.Di.OpenChildContainer.key,
      );
      return null;
    }

    const projected = selectionKind === RuntimeContentProjectionSelectionKind.Projected;
    const declaringContainer = projected
      ? declaringController?.containerFrame ?? null
      : null;
    if (projected && declaringContainer == null) {
      this.recordOpenSeam(
        `${local}:missing-declaring-container`,
        declaringController?.identityHandle ?? state.rootController.identityHandle,
        'Projected AuSlot content needs the declaring controller resource container, but no runtime container frame was modeled.',
        sourceAddressHandle,
        state.source,
        state.records,
        state.openSeams,
        KernelVocabulary.Di.OpenChildContainer.key,
      );
      return null;
    }
    if (projected && factoryHydrationContext == null) {
      this.recordOpenSeam(
        `${local}:missing-declaring-hydration-context`,
        declaringController?.identityHandle ?? state.rootController.identityHandle,
        'Projected AuSlot content needs the declaring controller hydration context, but no runtime context value was modeled.',
        sourceAddressHandle,
        state.source,
        state.records,
        state.openSeams,
      );
      return null;
    }

    const child = this.childContainerMaterializer.materializeChild(
      new ContainerChildMaterializationRequest({
        localKey: `${local}:factory-container`,
        parent: receivingContainer,
        sourceAddressHandle,
        localName: `${selectionKind}:au-slot-view-factory-container`,
        contextResolvers: projected
          ? [new ContainerContextResolverSlotRequest({
              interfaceName: FrameworkIntrinsicDiKey.IHydrationContext,
              sourceAddressHandle,
              ownerIdentityHandle: factoryHydrationContext!.identityHandle,
              instance: new RegistrationValueReference(
                RegistrationValueKind.Instance,
                factoryHydrationContext!.identityHandle,
                factoryHydrationContext!.productHandle,
                factoryHydrationContext!.sourceAddressHandle,
                FrameworkIntrinsicDiKey.IHydrationContext,
              ),
            })]
          : [],
        configuration: projected
          ? null
          : {
              inheritParentResources: true,
              sourceAddressHandle,
            },
        resourceImportSource: declaringContainer,
      }),
    );
    state.records.push(...child.records);
    state.childContainerEmissions.push(child);
    return child.container;
  }

  private instructionForHydrationContext(
    state: RuntimeRenderingMaterializationState,
    context: RuntimeHydrationContext | null,
  ): HydrateElementInstruction | null {
    const productHandle = context?.instructionProductHandle ?? null;
    if (productHandle == null) {
      return null;
    }
    const instruction = state.input.projectContext.readInstruction(productHandle)
      ?? this.publication.readProductDetail(TemplateProductDetails.Instruction, productHandle);
    return instruction instanceof HydrateElementInstruction ? instruction : null;
  }

  private controllerForHydrationContext(
    state: RuntimeRenderingMaterializationState,
    context: RuntimeHydrationContext | null,
  ): RuntimeControllerFrame | null {
    const productHandle = context?.controller.productHandle ?? null;
    return productHandle == null ? null : state.readController(productHandle);
  }

  private auSlotInstructionForController(
    state: RuntimeRenderingMaterializationState,
    controller: RuntimeControllerFrame,
  ): HydrateElementInstruction | null {
    const instruction = state.input.projectContext.readInstruction(controller.instructionProductHandle)
      ?? (controller.instructionProductHandle == null
        ? null
        : this.publication.readProductDetail(
            TemplateProductDetails.Instruction,
            controller.instructionProductHandle,
          ));
    return instruction instanceof HydrateElementInstruction
      && instruction.auSlotProcessContent != null
      ? instruction
      : null;
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
    const factoryContainer = controller.containerFrame;
    if (factoryContainer == null) {
      this.recordOpenSeam(
        `${local}:missing-view-factory-container`,
        controller.identityHandle,
        `Template-controller '${controller.name ?? '(anonymous)'}' has no modeled container for IViewFactory construction.`,
        controller.sourceAddressHandle,
        state.source,
        state.records,
        state.openSeams,
        KernelVocabulary.Di.OpenChildContainer.key,
      );
      return null;
    }
    return this.renderEmbeddedView(
      local,
      state,
      controller,
      factoryContainer,
      sequence,
      controller.readHydrationContext(),
    ).recursiveResult;
  }

  private renderEmbeddedView(
    local: string,
    state: RuntimeRenderingMaterializationState,
    ownerController: RuntimeControllerFrame,
    factoryContainer: Container,
    sequence: TemplateInstructionSequence,
    hydrationContext: RuntimeHydrationContext | null,
  ): RuntimeEmbeddedViewRendering {
    const viewFactory = this.viewFactoryMaterializer.ensureForController(
      `${local}:view-factory`,
      `${state.input.localKey}:embedded-view-definition:${sequence.productHandle}`,
      ownerController,
      factoryContainer,
      sequence.productHandle,
      state.source,
      state.records,
      state.viewFactories,
      state.embeddedDefinitions,
      state.viewFactoryByController,
      state.embeddedDefinitionByInstructionSequence,
    );
    const syntheticController = this.controllerCreation.createSyntheticViewController(
      local,
      viewFactory,
      hydrationContext,
      state.source,
    );
    state.registerController(syntheticController);
    ownerController.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Hydration,
      RuntimeControllerAssemblyStepKind.CreateSyntheticView,
      syntheticController.productHandle,
      syntheticController.sourceAddressHandle,
      'IViewFactory.create produced an aggregate synthetic-view controller for nested instruction analysis.',
    );
    const resource = state.input.projectContext.readResourceForInstructionSequence(sequence.productHandle);
    if (resource == null) {
      this.recordOpenSeam(
        `${local}:missing-sequence-resource`,
        ownerController.identityHandle,
        `Embedded instruction sequence '${sequence.productHandle}' has no owning compiler world for recursive Rendering.render emulation.`,
        sequence.sourceAddressHandle,
        state.source,
        state.records,
        state.openSeams,
      );
      return new RuntimeEmbeddedViewRendering(viewFactory, syntheticController, null);
    }
    const compiledTemplate = resource.compiledTemplateEmission;
    const instructions = this.instructionsForControllerView(state, compiledTemplate);
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
      return new RuntimeEmbeddedViewRendering(viewFactory, syntheticController, null);
    }

    syntheticController.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Rendering,
      RuntimeControllerAssemblyStepKind.RenderInstructions,
      sequence.productHandle,
      sequence.sourceAddressHandle,
      'Rendering.render dispatched synthetic-view child instruction rows.',
    );
    const result = this.measure(state.input, 'synthetic-view-render-dispatch', () =>
      resource.compilerWorld.rendering.render({
        localKey: `${state.input.localKey}:synthetic-view:${syntheticController.productHandle}`,
        compiledTemplate: compiledTemplate.compiledTemplate,
        resourceScope: resource.compilerWorld.resourceScope,
        targets: targetInputs,
        instructions,
        rootController: syntheticController,
        provenanceHandle: state.source.provenanceHandle,
        host: this.renderHostForState(state),
        renderSurrogate: false,
      } satisfies TemplateRenderingRunRequest)
    );
    return new RuntimeEmbeddedViewRendering(
      viewFactory,
      syntheticController,
      result,
    );
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
      createChildController: (creation) => {
        const controller = this.controllerCreation.createChildController(
          creation,
          state.input.typeSystem,
          state.observerLocator,
          state.source,
          state.records,
          state.childContainerEmissions,
          state.auSlotsInfos,
          state.intrinsicEmptyAuSlotsInfo,
          state.openSeams,
          state.controllerIssues,
          (productHandle) => state.readController(productHandle),
          (name, read) => this.measure(state.input, `controller-creation:${name}`, read),
          state.input.projectKey,
          state.input.resourceDefinitions,
        );
        return controller == null ? null : state.registerController(controller);
      },
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
    const instruction = this.publication.readProductDetail(TemplateProductDetails.Instruction, instructionProductHandle);
    if (!(instruction instanceof HydrateTemplateControllerInstruction)
      || instruction.childInstructionSequenceProductHandle == null) {
      return null;
    }

    const sequence = this.publication.readProductDetail(
      TemplateProductDetails.InstructionSequence,
      instruction.childInstructionSequenceProductHandle,
    );
    if (sequence != null) {
      return sequence;
    }

    this.recordOpenSeam(
      `${local}:missing-child-sequence`,
      controller.identityHandle,
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
        sequence.identityHandle,
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
    ownerHandle: MaterializationOwnerHandle,
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
    records.push(
      seam,
      new MaterializationRecord(
        this.store.handles.materialization(local),
        ownerHandle,
        [],
        [],
        [seam.handle],
      ),
    );
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

function uniqueRuntimeHydrationContexts(
  contexts: readonly RuntimeHydrationContext[],
): readonly RuntimeHydrationContext[] {
  const seen = new Set<ProductHandle>();
  const result: RuntimeHydrationContext[] = [];
  for (const context of contexts) {
    if (seen.has(context.productHandle)) {
      continue;
    }
    seen.add(context.productHandle);
    result.push(context);
  }
  return result;
}

function isRecursiveRenderableCustomElementController(
  controller: RuntimeControllerFrame,
): boolean {
  return controller.creationKind === RuntimeControllerCreationKind.CustomElement
    || controller.creationKind === RuntimeControllerCreationKind.RoutedCustomElement;
}
