import ts from 'typescript';
import { ConfigurationProductDetails } from '../configuration/product-details.js';
import {
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
  ContainerContextResolverRecordPolicy,
  ContainerContextResolverSlotRequest,
  type ContainerChildMaterializationEmission,
} from '../di/container-materializer.js';
import { FrameworkIntrinsicDiKey } from '../di/framework-intrinsic-di-key.js';
import type { Container } from '../di/container.js';
import {
  EvaluationPromiseSettlementKind,
  EvaluationStringValue,
  EvaluationValueKind,
  closedEvaluationPromiseFulfillment,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  openSeamReasonKindsForEvaluationValue,
} from '../evaluation/boundary-open-reason.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  ConfigurationIdentity,
} from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import { builtInResourceBindableAttribute } from '../resources/built-in-resource-bindables.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  OpenSeam,
  OpenSeamReasonKind,
} from '../kernel/open-seam.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelPublicationPlan,
  KernelStoreBatch,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import {
  RuntimeBindingSourceValueEvaluator,
} from '../observation/binding-source-value-evaluator.js';
import {
  RuntimeBindingSourceValueEvaluation,
  RuntimeBindingSourceValueEvaluationClosure,
} from '../configuration/binding-source-value-evaluation.js';
import {
  projectRuntimeBindingSourceValuePressure,
} from '../observation/binding-source-value-pressure.js';
import {
  sourceValueContextForRuntimeBindingSourceExpressionProjection,
} from '../observation/binding-source-value-evaluation-context.js';
import {
  instructionScopeLookup,
} from '../observation/runtime-binding-expression.js';
import {
  RuntimeBindingExpressionScopeProjector,
} from '../observation/runtime-binding-expression-scope.js';
import {
  RuntimeBindingSourceExpressionContextProjector,
  RuntimeBindingSourceExpressionProjectionKind,
} from '../observation/runtime-binding-source-expression-context.js';
import type { RuntimeBindingDataFlowEmission } from '../observation/binding-data-flow-materializer.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  CheckerTypeShapeKind,
  classifyCheckerTypeShape,
  type CheckerTypeReference,
  type CheckerTypeShape,
} from '../type-system/type-shape.js';
import type { CheckerTypeProjector } from '../type-system/checker-projector.js';
import { CheckerAsyncTypeProjector } from '../type-system/checker-async-type-projector.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  readCheckerTypeShape,
} from '../type-system/checker-type-shape-access.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import {
  TemplateProductDetails,
} from './product-details.js';
import { bindingExpressionAstForProduct } from './expression-parse-product.js';
import {
  HydrateElementInstruction,
  SetPropertyInstruction,
} from './instruction-ir.js';
import {
  CompositionComponentResolutionKind,
  CompositionComponentCandidateCoverageKind,
  CompositionActivationModelHandoff,
  CompositionContext,
  CompositionController,
  CompositionInputConsumptionKind,
  CompositionInputValueStateKind,
  CompositionModelResolutionKind,
  CompositionRenderingContextKind,
  CompositionResolvedComponent,
} from './runtime-composition.js';
import {
  PropertyBinding,
  RuntimeBindingTargetKind,
  type RuntimeBinding,
  type RuntimeBindingTargetAccess,
} from './runtime-binding.js';
import type { RuntimeControllerBindEmission } from './runtime-controller-bind-materializer.js';
import {
  RuntimeControllerCreationKind,
  RuntimeControllerFrame,
  RuntimeControllerAssemblyStage,
  RuntimeControllerAssemblyStepKind,
} from './runtime-controller.js';
import { RuntimeControllerPublicationMaterializer } from './runtime-controller-publication.js';
import { RuntimeRenderingSourceSet } from './runtime-rendering-source.js';
import {
  activationModelHandoff,
  activationModelHandoffForType,
  type CompositionModelEvaluation,
} from './runtime-composition-activation.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';
import type { RuntimeExpressionResourcePlan } from './runtime-expression-resource-plan.js';
import type { TemplateRuntimeAnalysisProjectContext } from './template-runtime-analysis-context.js';
import type { TemplateScopeConstructionEmission } from './template-controller-scope-materializer.js';
import {
  AU_COMPOSE_RESOURCE_NAME,
  AU_COMPOSE_TARGET_NAME,
  AuComposeBindableName,
} from './au-compose-source.js';

export class RuntimeCompositionMaterializationRequest {
  constructor(
    readonly localKey: string,
    readonly runtimeRendering: RuntimeRenderingEmission,
    readonly expressionResourcePlan: RuntimeExpressionResourcePlan,
    readonly controllerBind: RuntimeControllerBindEmission,
    readonly bindingDataFlow: RuntimeBindingDataFlowEmission,
    readonly scopes: TemplateScopeConstructionEmission,
    readonly expressionWorld: CheckerExpressionTypeWorld,
    readonly projectContext: TemplateRuntimeAnalysisProjectContext,
    readonly resourceDefinitions: ResourceDefinitionIndex | null,
    readonly typeSystem: TypeSystemProject | null,
    readonly sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
  ) {}
}

function compositionConstructionContainer(
  input: RuntimeCompositionMaterializationRequest,
  controller: RuntimeControllerFrame,
): Container | null {
  const ownerProductHandle = controller.readConstructionHydrationContext()?.controller.productHandle ?? null;
  return ownerProductHandle == null
    ? null
    : input.runtimeRendering.readController(ownerProductHandle)?.containerFrame ?? null;
}

export class RuntimeCompositionEmission {
  constructor(
    readonly contexts: readonly CompositionContext[],
    readonly controllers: readonly CompositionController[],
    readonly composedControllers: readonly RuntimeControllerFrame[],
    readonly childContainers: readonly ContainerChildMaterializationEmission[],
    readonly openSeams: readonly OpenSeam[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class CompositionSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

interface AuComposeBindingSet {
  readonly template: RuntimeBinding | null;
  readonly component: RuntimeBinding | null;
  readonly model: RuntimeBinding | null;
  readonly scopeBehavior: RuntimeBinding | null;
  readonly tag: RuntimeBinding | null;
  readonly flushMode: RuntimeBinding | null;
  readonly composing: RuntimeBinding | null;
  readonly composition: RuntimeBinding | null;
}

class EvaluatedBinding implements CompositionModelEvaluation {
  constructor(
    readonly binding: RuntimeBinding | null,
    readonly evaluation: RuntimeBindingSourceValueEvaluation | null,
    readonly sourceType: CheckerTypeReference | null,
  ) {}

  get value(): EvaluationValue | null {
    return this.evaluation?.value ?? null;
  }

  get openReason(): string | null {
    return this.evaluation?.openReason ?? null;
  }

  get openReasonKinds(): readonly OpenSeamReasonKind[] {
    return this.evaluation?.openReasonKinds ?? [];
  }

  get isOpen(): boolean {
    return this.evaluation?.closure === RuntimeBindingSourceValueEvaluationClosure.Open;
  }
}

const enum RuntimeCompositionInputKind {
  /** Alternate template input consumed by AuCompose view construction. */
  Template = 'template',
  /** Component identity input that alone qualifies a concrete composed child controller. */
  Component = 'component',
  /** Activation/update model handed to the selected component. */
  Model = 'model',
  /** Scope inheritance mode used by template-only composition. */
  ScopeBehavior = 'scopeBehavior',
  /** Host element name used by non-custom-element composition. */
  Tag = 'tag',
  /** Scheduling mode used when applying a completed composition. */
  FlushMode = 'flushMode',
}

class CompositionInputPressure {
  constructor(
    readonly inputKind: RuntimeCompositionInputKind,
    readonly seam: OpenSeam,
  ) {}
}

interface StaticAuComposeInputs {
  readonly template: string | null;
  readonly component: string | null;
  readonly model: string | null;
  readonly scopeBehavior: string | null;
  readonly tag: string | null;
  readonly flushMode: string | null;
}

interface ComponentResolution {
  readonly candidates: readonly CompositionResolvedComponent[];
  readonly resolutionKind: CompositionComponentResolutionKind;
  readonly candidateCoverageKind: CompositionComponentCandidateCoverageKind;
  readonly objectViewModelActivationHandoff: CompositionActivationModelHandoff | null;
  readonly openReason: string | null;
  readonly openReasonKinds: readonly OpenSeamReasonKind[];
}

class ComponentTypeResolution {
  constructor(
    readonly candidates: readonly CompositionResolvedComponent[],
    readonly coverageKind: CompositionComponentCandidateCoverageKind,
  ) {}
}

class ComponentTypeCandidateBasis {
  constructor(
    readonly types: readonly ts.Type[],
    readonly exhaustive: boolean,
  ) {}
}

class ComposedChildControllerHandoff {
  constructor(
    readonly resolution: ComponentResolution,
    readonly controllers: readonly RuntimeControllerFrame[],
  ) {}
}

interface ComposedChildControllerMaterializationFrame {
  readonly local: string;
  readonly input: RuntimeCompositionMaterializationRequest;
  readonly hostController: RuntimeControllerFrame;
  readonly context: CompositionContext;
  readonly component: CompositionResolvedComponent;
  readonly source: CompositionSourceSet;
  readonly records: KernelStoreRecord[];
  readonly childContainers: ContainerChildMaterializationEmission[];
  readonly parentContainer: Container;
  readonly definition: CustomElementDefinition;
}

export class RuntimeCompositionMaterializer {
  private readonly childContainerMaterializer: ContainerChildMaterializer;
  private readonly controllerPublication: RuntimeControllerPublicationMaterializer;

  constructor(
    private readonly store: KernelStore,
    private readonly publication: KernelPublicationContext,
  ) {
    this.childContainerMaterializer = new ContainerChildMaterializer(store, publication);
    this.controllerPublication = new RuntimeControllerPublicationMaterializer(store, publication);
  }

  materialize(input: RuntimeCompositionMaterializationRequest): RuntimeCompositionEmission {
    const emission = this.recordsForCompositions(input);
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `runtime-composition:${input.localKey}`),
      [
        ...publishProductDetails(TemplateProductDetails.CompositionContext, emission.contexts),
        ...publishProductDetails(TemplateProductDetails.CompositionController, emission.controllers),
        ...publishProductDetails(
          ConfigurationProductDetails.Controller,
          emission.composedControllers.map((controller) => controller.toControllerProduct()),
        ),
      ],
    ));
    return emission;
  }

  private recordsForCompositions(input: RuntimeCompositionMaterializationRequest): RuntimeCompositionEmission {
    const source = this.recordsForSource(input.localKey);
    const contexts: CompositionContext[] = [];
    const controllers: CompositionController[] = [];
    const composedControllers: RuntimeControllerFrame[] = [];
    const childContainers: ContainerChildMaterializationEmission[] = [];
    const openSeams: OpenSeam[] = [];
    const records: KernelStoreRecord[] = [...source.records];
    const bindingsByProduct = new Map(input.runtimeRendering.bindings.map((binding) => [binding.productHandle, binding]));
    const scopesByInstruction = instructionScopeLookup(input.scopes.instructionScopes);
    const bindingExpressionScopes = new RuntimeBindingExpressionScopeProjector(
      this.store,
      input.expressionWorld,
      input.expressionResourcePlan,
    );
    const sourceExpressionContexts = new RuntimeBindingSourceExpressionContextProjector(
      input.runtimeRendering,
      scopesByInstruction,
      bindingExpressionScopes,
    );
    const asyncTypeProjector = new CheckerAsyncTypeProjector(
      this.store,
      input.expressionWorld.projector,
    );

    input.runtimeRendering.controllers.forEach((controller, index) => {
      if (!isAuComposeController(controller)) {
        return;
      }
      const local = `${input.localKey}:composition:${index}`;
      const bindings = auComposeBindings(input.controllerBind, controller, bindingsByProduct);
      const staticInputs = staticAuComposeInputs(this.publication, controller);
      const template = this.evaluateBinding(input, bindings.template, sourceExpressionContexts, bindingExpressionScopes);
      const component = this.evaluateBinding(input, bindings.component, sourceExpressionContexts, bindingExpressionScopes);
      const model = this.evaluateModelInput(input, bindings.model, sourceExpressionContexts, bindingExpressionScopes, staticInputs.model);
      const scopeBehavior = this.evaluateBinding(input, bindings.scopeBehavior, sourceExpressionContexts, bindingExpressionScopes);
      const tag = this.evaluateBinding(input, bindings.tag, sourceExpressionContexts, bindingExpressionScopes);
      const flushMode = this.evaluateBinding(input, bindings.flushMode, sourceExpressionContexts, bindingExpressionScopes);
      const templateInputType = awaitedCompositionInputType(
        asyncTypeProjector,
        template,
        `${local}:template-awaited-type`,
        controller.sourceAddressHandle,
      );
      const componentInputType = awaitedCompositionInputType(
        asyncTypeProjector,
        component,
        `${local}:component-awaited-type`,
        controller.sourceAddressHandle,
      );
      const evaluatedInputs = [
        [RuntimeCompositionInputKind.Template, template],
        [RuntimeCompositionInputKind.Component, component],
        [RuntimeCompositionInputKind.Model, model],
        [RuntimeCompositionInputKind.ScopeBehavior, scopeBehavior],
        [RuntimeCompositionInputKind.Tag, tag],
        [RuntimeCompositionInputKind.FlushMode, flushMode],
      ] as const;
      const componentResolution = this.resolveComponent(
        local,
        input,
        controller,
        component,
        componentInputType,
        model,
        staticInputs,
      );
      const inputPressure = this.openCompositionInputSeams(
        local,
        input.sourceValueEvaluator,
        evaluatedInputs,
        componentResolution,
        source,
        records,
      );
      const context = this.createContext(
        local,
        controller,
        bindings,
        template,
        templateInputType,
        component,
        componentInputType,
        model,
        scopeBehavior,
        tag,
        flushMode,
        staticInputs,
        source.provenanceHandle,
      );
      const controllerHandoff = this.materializeComposedChildControllers(
        local,
        input,
        controller,
        context,
        componentResolution,
        inputPressure.filter((pressure) => pressure.inputKind === RuntimeCompositionInputKind.Component),
        source,
        records,
        childContainers,
      );
      const resolutionPressure = this.openCompositionResolutionSeam(
        local,
        controllerHandoff.resolution,
        component,
        inputPressure,
        context.sourceAddressHandle,
        source,
        records,
      );
      const compositionResolution = componentResolutionWithInputPressure(
        controllerHandoff.resolution,
        inputPressure,
      );
      const composition = this.createController(local, input, controller, context, compositionResolution, model, source.provenanceHandle);
      const inputOpenSeamHandles = inputPressure.map((pressure) => pressure.seam.handle);
      const controllerOpenSeamHandles = [
        ...inputOpenSeamHandles,
        ...(resolutionPressure == null ? [] : [resolutionPressure.handle]),
      ];

      contexts.push(context);
      controllers.push(composition);
      composedControllers.push(...controllerHandoff.controllers);
      openSeams.push(
        ...inputPressure.map((pressure) => pressure.seam),
        ...(resolutionPressure == null ? [] : [resolutionPressure]),
      );
      records.push(...recordsForCompositionContext(
        local,
        context,
        controller,
        source.provenanceHandle,
        inputOpenSeamHandles,
        this.store,
      ));
      records.push(...recordsForCompositionController(
        local,
        composition,
        context,
        controller,
        source.provenanceHandle,
        controllerOpenSeamHandles,
        this.store,
      ));
    });

    return new RuntimeCompositionEmission(contexts, controllers, composedControllers, childContainers, openSeams, records);
  }

  private createContext(
    local: string,
    controller: RuntimeControllerFrame,
    bindings: AuComposeBindingSet,
    template: EvaluatedBinding,
    templateInputType: CheckerTypeReference | null,
    component: EvaluatedBinding,
    componentInputType: CheckerTypeReference | null,
    model: EvaluatedBinding,
    scopeBehavior: EvaluatedBinding,
    tag: EvaluatedBinding,
    flushMode: EvaluatedBinding,
    staticInputs: StaticAuComposeInputs,
    provenanceHandle: ProvenanceHandle,
  ): CompositionContext {
    void provenanceHandle;
    const allocation = this.allocate(`${local}:context`);
    return new CompositionContext(
      allocation.productHandle,
      allocation.identityHandle,
      controller.productHandle,
      controller.parent?.productHandle ?? null,
      controller.instructionProductHandle,
      staticInputs.template,
      staticInputs.component,
      staticInputs.model,
      inputConsumptionKind(RuntimeCompositionInputKind.Template, template, staticInputs.template),
      inputValueStateKind(template, staticInputs.template),
      inputSettlementKind(template),
      templateInputType,
      resolvedTemplateValue(template, staticInputs.template),
      inputConsumptionKind(RuntimeCompositionInputKind.Component, component, staticInputs.component),
      inputValueStateKind(component, staticInputs.component),
      inputSettlementKind(component),
      componentInputType,
      inputConsumptionKind(RuntimeCompositionInputKind.Model, model, staticInputs.model),
      inputValueStateKind(model, staticInputs.model),
      inputConsumptionKind(RuntimeCompositionInputKind.ScopeBehavior, scopeBehavior, staticInputs.scopeBehavior),
      inputValueStateKind(scopeBehavior, staticInputs.scopeBehavior),
      inputConsumptionKind(RuntimeCompositionInputKind.Tag, tag, staticInputs.tag),
      inputValueStateKind(tag, staticInputs.tag),
      inputConsumptionKind(RuntimeCompositionInputKind.FlushMode, flushMode, staticInputs.flushMode),
      inputValueStateKind(flushMode, staticInputs.flushMode),
      bindings.template?.toReference() ?? null,
      bindings.component?.toReference() ?? null,
      bindings.model?.toReference() ?? null,
      bindings.scopeBehavior?.toReference() ?? null,
      bindings.tag?.toReference() ?? null,
      bindings.flushMode?.toReference() ?? null,
      bindings.composing?.toReference() ?? null,
      bindings.composition?.toReference() ?? null,
      expressionProductHandle(bindings.template),
      expressionProductHandle(bindings.component),
      expressionProductHandle(bindings.model),
      literalStringUnionInputValue(scopeBehavior, staticInputs.scopeBehavior, ['auto', 'scoped'], 'auto'),
      literalStringUnionInputValue(flushMode, staticInputs.flushMode, ['sync', 'async'], 'sync'),
      literalStringInputValue(tag, staticInputs.tag),
      controller.sourceAddressHandle,
    );
  }

  private createController(
    local: string,
    input: RuntimeCompositionMaterializationRequest,
    hostController: RuntimeControllerFrame,
    context: CompositionContext,
    resolution: ComponentResolution,
    model: EvaluatedBinding,
    provenanceHandle: ProvenanceHandle,
  ): CompositionController {
    void provenanceHandle;
    const allocation = this.allocate(`${local}:controller`);
    return new CompositionController(
      allocation.productHandle,
      allocation.identityHandle,
      context.toReference(),
      hostController.productHandle,
      hostController.parent?.productHandle ?? null,
      compositionRenderingContextKind(input, hostController),
      resolution.resolutionKind,
      resolution.candidateCoverageKind,
      modelResolutionKind(model),
      resolution.candidates,
      resolution.objectViewModelActivationHandoff,
      resolution.openReason,
      resolution.openReasonKinds,
      context.sourceAddressHandle,
    );
  }

  private materializeComposedChildControllers(
    local: string,
    input: RuntimeCompositionMaterializationRequest,
    hostController: RuntimeControllerFrame,
    context: CompositionContext,
    resolution: ComponentResolution,
    componentPressure: readonly CompositionInputPressure[],
    source: CompositionSourceSet,
    records: KernelStoreRecord[],
    childContainers: ContainerChildMaterializationEmission[],
  ): ComposedChildControllerHandoff {
    if (resolution.resolutionKind !== CompositionComponentResolutionKind.StaticValue
      || resolution.candidates.length !== 1) {
      return new ComposedChildControllerHandoff(resolution, []);
    }
    if (componentPressure.length > 0) {
      records.push(new MaterializationRecord(
        this.store.handles.materialization(`${local}:composed-child-open`),
        context.identityHandle,
        [],
        [],
        componentPressure.map((pressure) => pressure.seam.handle),
      ));
      return new ComposedChildControllerHandoff(resolution, []);
    }

    const component = resolution.candidates[0]!;
    const controller = this.createComposedChildController(
      `${local}:composed-child:0`,
      input,
      hostController,
      context,
      component,
      source,
      records,
      childContainers,
    );
    if (controller == null) {
      return new ComposedChildControllerHandoff(
        {
          ...resolution,
          openReason: resolution.openReason
            ?? `AuCompose resolved '${component.name}', but the composed custom-element controller handoff could not be modeled.`,
          openReasonKinds: resolution.openReasonKinds,
        },
        [],
      );
    }

    return new ComposedChildControllerHandoff(
      {
        ...resolution,
        candidates: [
          componentWithComposedController(component, controller),
        ],
      },
      [controller],
    );
  }

  private createComposedChildController(
    local: string,
    input: RuntimeCompositionMaterializationRequest,
    hostController: RuntimeControllerFrame,
    context: CompositionContext,
    component: CompositionResolvedComponent,
    source: CompositionSourceSet,
    records: KernelStoreRecord[],
    childContainers: ContainerChildMaterializationEmission[],
  ): RuntimeControllerFrame | null {
    const frame = this.createComposedChildControllerFrame(
      local,
      input,
      hostController,
      context,
      component,
      source,
      records,
      childContainers,
    );
    if (frame == null) {
      return null;
    }
    return this.materializeComposedChildControllerFrame(frame);
  }

  private createComposedChildControllerFrame(
    local: string,
    input: RuntimeCompositionMaterializationRequest,
    hostController: RuntimeControllerFrame,
    context: CompositionContext,
    component: CompositionResolvedComponent,
    source: CompositionSourceSet,
    records: KernelStoreRecord[],
    childContainers: ContainerChildMaterializationEmission[],
  ): ComposedChildControllerMaterializationFrame | null {
    const parentContainer = hostController.containerFrame;
    if (parentContainer == null || input.resourceDefinitions == null) {
      return null;
    }
    const definition = input.resourceDefinitions.lookupByProduct(component.definitionProductHandle);
    if (!(definition instanceof CustomElementDefinition)) {
      return null;
    }
    return {
      local,
      input,
      hostController,
      context,
      component,
      source,
      records,
      childContainers,
      parentContainer,
      definition,
    };
  }

  private materializeComposedChildControllerFrame(
    frame: ComposedChildControllerMaterializationFrame,
  ): RuntimeControllerFrame {
    const childContainer = this.materializeComposedChildContainer(frame);
    frame.records.push(...childContainer.records);
    frame.childContainers.push(childContainer);
    const controller = this.createComposedRuntimeController(frame, childContainer);
    this.recordComposedChildControllerProducts(frame, childContainer, controller);
    return controller;
  }

  private materializeComposedChildContainer(
    frame: ComposedChildControllerMaterializationFrame,
  ): ContainerChildMaterializationEmission {
    const childContainer = this.childContainerMaterializer.materializeChild(new ContainerChildMaterializationRequest({
      localKey: `${frame.local}:container`,
      parent: frame.parentContainer,
      sourceAddressHandle: frame.context.sourceAddressHandle,
      localName: `au-compose:${frame.definition.name}:container`,
      contextResolvers: composedCustomElementContextResolverSlots(frame.context.sourceAddressHandle),
      contextResolverRecordPolicy: ContainerContextResolverRecordPolicy.ModelOnly,
    }));
    return childContainer;
  }

  private createComposedRuntimeController(
    frame: ComposedChildControllerMaterializationFrame,
    childContainer: ContainerChildMaterializationEmission,
  ): RuntimeControllerFrame {
    const allocation = this.allocate(`${frame.local}:controller`);
    return new RuntimeControllerFrame(
      RuntimeControllerCreationKind.CustomElement,
      allocation.productHandle,
      allocation.identityHandle,
      frame.definition.name,
      childContainer.container.toReference(),
      childContainer.container,
      frame.definition.productHandle,
      frame.definition.target,
      frame.context.sourceAddressHandle,
      frame.hostController,
      null,
      null,
      frame.definition.strict,
      frame.context.sourceAddressHandle ?? frame.definition.sourceAddressHandle,
      frame.source.provenanceHandle,
    );
  }

  private recordComposedChildControllerProducts(
    frame: ComposedChildControllerMaterializationFrame,
    childContainer: ContainerChildMaterializationEmission,
    controller: RuntimeControllerFrame,
  ): void {
    controller.recordAssemblyStep(
      RuntimeControllerAssemblyStage.Hydration,
      RuntimeControllerAssemblyStepKind.CreateChildContainer,
      childContainer.container.productHandle,
      childContainer.container.sourceAddressHandle,
      'AuCompose.compose created a child container for a closed custom-element composition branch.',
    );
    this.controllerPublication.recordController(
      `${frame.local}:runtime-controller`,
      controller,
      frame.input.projectContext,
      new RuntimeRenderingSourceSet([], frame.source.evidenceHandle, frame.source.provenanceHandle),
      frame.records,
      [],
      new Map(),
    );
  }

  private evaluateBinding(
    input: RuntimeCompositionMaterializationRequest,
    binding: RuntimeBinding | null,
    sourceExpressionContexts: RuntimeBindingSourceExpressionContextProjector,
    bindingExpressionScopes: RuntimeBindingExpressionScopeProjector,
  ): EvaluatedBinding {
    if (binding == null) {
      return new EvaluatedBinding(null, null, null);
    }
    if (!(binding instanceof PropertyBinding)) {
      return new EvaluatedBinding(
        binding,
        RuntimeBindingSourceValueEvaluation.open(
          'AuCompose composition input was not a PropertyBinding.',
          [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
        ),
        null,
      );
    }
    const flow = input.bindingDataFlow.readDataFlowsForBinding(binding.productHandle)[0] ?? null;
    const expression = bindingExpressionAstForProduct(this.publication, binding.expressionProductHandle);
    if (expression == null || input.sourceValueEvaluator == null) {
      return new EvaluatedBinding(
        binding,
        RuntimeBindingSourceValueEvaluation.open(
          'AuCompose binding source could not be evaluated because expression or evaluator state is unavailable.',
          [OpenSeamReasonKind.BindingSourceSlotNoStaticValue],
        ),
        flow?.sourceType ?? null,
      );
    }
    const projection = sourceExpressionContexts.projectSource({
      binding,
      expression,
      localKey: `${input.localKey}:runtime-composition:${binding.productHandle}:source-value`,
    });
    if (projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
      return new EvaluatedBinding(
        binding,
        RuntimeBindingSourceValueEvaluation.open(
          projection.openReason,
          [OpenSeamReasonKind.BindingSourceSlotNoStaticValue],
        ),
        flow?.sourceType ?? null,
      );
    }
    const evaluated = input.sourceValueEvaluator.evaluate(
      sourceValueContextForRuntimeBindingSourceExpressionProjection(projection),
    );
    return new EvaluatedBinding(
      binding,
      evaluated,
      flow?.sourceType ?? null,
    );
  }

  private evaluateModelInput(
    input: RuntimeCompositionMaterializationRequest,
    binding: RuntimeBinding | null,
    sourceExpressionContexts: RuntimeBindingSourceExpressionContextProjector,
    bindingExpressionScopes: RuntimeBindingExpressionScopeProjector,
    staticModel: string | null,
  ): EvaluatedBinding {
    if (binding != null || staticModel == null) {
      return this.evaluateBinding(input, binding, sourceExpressionContexts, bindingExpressionScopes);
    }
    return new EvaluatedBinding(
      null,
      RuntimeBindingSourceValueEvaluation.value(new EvaluationStringValue(staticModel)),
      null,
    );
  }

  private resolveComponent(
    local: string,
    input: RuntimeCompositionMaterializationRequest,
    controller: RuntimeControllerFrame,
    component: EvaluatedBinding,
    componentInputType: CheckerTypeReference | null,
    model: EvaluatedBinding,
    staticInputs: StaticAuComposeInputs,
  ): ComponentResolution {
    if (component.binding == null && staticInputs.component == null) {
      return {
        candidates: [],
        resolutionKind: CompositionComponentResolutionKind.TemplateOnly,
        candidateCoverageKind: CompositionComponentCandidateCoverageKind.NotApplicable,
        objectViewModelActivationHandoff: null,
        openReason: null,
        openReasonKinds: [],
      };
    }
    if (component.binding == null && staticInputs.component != null) {
      const staticCandidates = this.resolveStaticComponentName(input, controller, staticInputs.component, model);
      if (staticCandidates.length > 0) {
        return {
          candidates: staticCandidates,
          resolutionKind: CompositionComponentResolutionKind.StaticValue,
          candidateCoverageKind: CompositionComponentCandidateCoverageKind.NotApplicable,
          objectViewModelActivationHandoff: null,
          openReason: null,
          openReasonKinds: [],
        };
      }
      return {
        candidates: [],
        resolutionKind: CompositionComponentResolutionKind.Open,
        candidateCoverageKind: CompositionComponentCandidateCoverageKind.NotApplicable,
        objectViewModelActivationHandoff: null,
        openReason: `AuCompose component name '${staticInputs.component}' did not resolve to a visible custom-element definition.`,
        openReasonKinds: [OpenSeamReasonKind.BindingSourceResourceOpen],
      };
    }
    if (
      !component.isOpen
      && component.value?.kind === EvaluationValueKind.Promise
      && component.value.settlement.kind === EvaluationPromiseSettlementKind.Rejected
    ) {
      return {
        candidates: [],
        resolutionKind: CompositionComponentResolutionKind.Rejected,
        candidateCoverageKind: CompositionComponentCandidateCoverageKind.NotApplicable,
        objectViewModelActivationHandoff: null,
        openReason: null,
        openReasonKinds: [],
      };
    }
    const valueCandidates = component.value == null
      ? []
      : this.resolveComponentValue(input, controller, component.value, CompositionComponentResolutionKind.StaticValue, model);
    if (valueCandidates.length > 0) {
      return {
        candidates: valueCandidates,
        resolutionKind: CompositionComponentResolutionKind.StaticValue,
        candidateCoverageKind: CompositionComponentCandidateCoverageKind.NotApplicable,
        objectViewModelActivationHandoff: null,
        openReason: null,
        openReasonKinds: [],
      };
    }
    if (component.value != null && valueIsObjectViewModelComponent(component.value)) {
      return {
        candidates: [],
        resolutionKind: CompositionComponentResolutionKind.ObjectViewModel,
        candidateCoverageKind: CompositionComponentCandidateCoverageKind.NotApplicable,
        objectViewModelActivationHandoff: activationModelHandoffForType(
          input.expressionWorld.projector,
          component.sourceType,
          model,
          `${local}:object-view-model-activation`,
          component.binding?.sourceAddressHandle ?? controller.sourceAddressHandle,
          component.binding?.identityHandle ?? controller.identityHandle,
          'Resolved object view-model component type was not available for AuCompose activate(model) analysis.',
        ),
        openReason: null,
        openReasonKinds: [],
      };
    }
    const typeResolution = this.resolveComponentType(
      input,
      componentInputType,
      model,
    );
    if (typeResolution.candidates.length > 0) {
      const partial = typeResolution.coverageKind === CompositionComponentCandidateCoverageKind.Partial;
      return {
        candidates: typeResolution.candidates,
        resolutionKind: CompositionComponentResolutionKind.TypeCandidate,
        candidateCoverageKind: typeResolution.coverageKind,
        objectViewModelActivationHandoff: null,
        openReason: partial
          ? 'AuCompose retained useful TypeChecker component candidates without proving exhaustive coverage.'
          : null,
        openReasonKinds: partial ? [OpenSeamReasonKind.BindingSourceTypeOpen] : [],
      };
    }
    return {
      candidates: [],
      resolutionKind: CompositionComponentResolutionKind.Open,
      candidateCoverageKind: typeResolution.coverageKind,
      objectViewModelActivationHandoff: null,
      openReason: component.openReason
        ?? 'AuCompose component input did not resolve to a custom-element definition candidate.',
      openReasonKinds: component.openReasonKinds.length === 0
        ? [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue]
        : component.openReasonKinds,
    };
  }

  private resolveComponentValue(
    input: RuntimeCompositionMaterializationRequest,
    controller: RuntimeControllerFrame,
    value: EvaluationValue,
    resolutionKind: CompositionComponentResolutionKind,
    model: EvaluatedBinding,
  ): readonly CompositionResolvedComponent[] {
    if (input.resourceDefinitions == null) {
      return [];
    }
    if (value.kind === EvaluationValueKind.Promise) {
      const fulfillment = closedEvaluationPromiseFulfillment(value);
      return fulfillment == null
        ? []
        : this.resolveComponentValue(input, controller, fulfillment, resolutionKind, model);
    }
    if (value.kind === EvaluationValueKind.String) {
      const slot = compositionConstructionContainer(input, controller)?.find('custom-element', value.value).resourceSlot ?? null;
      const definition = input.resourceDefinitions.lookupByProduct(slot?.resourceProductHandle ?? null);
      return resolvedComponentRows(input.expressionWorld.projector, input, [definition], resolutionKind, model);
    }
    if (value.kind === EvaluationValueKind.Class || value.kind === EvaluationValueKind.Function) {
      return resolvedComponentRows(
        input.expressionWorld.projector,
        input,
        [input.resourceDefinitions.lookupValue(value)],
        resolutionKind,
        model,
      );
    }
    if (value.kind === EvaluationValueKind.Object || value.kind === EvaluationValueKind.Instance || value.kind === EvaluationValueKind.BoundaryObject) {
      return [];
    }
    return [];
  }

  private resolveStaticComponentName(
    input: RuntimeCompositionMaterializationRequest,
    controller: RuntimeControllerFrame,
    componentName: string,
    model: EvaluatedBinding,
  ): readonly CompositionResolvedComponent[] {
    if (input.resourceDefinitions == null) {
      return [];
    }
    const slot = compositionConstructionContainer(input, controller)?.find('custom-element', componentName).resourceSlot ?? null;
    const definition = input.resourceDefinitions.lookupByProduct(slot?.resourceProductHandle ?? null);
    return resolvedComponentRows(
      input.expressionWorld.projector,
      input,
      [definition],
      CompositionComponentResolutionKind.StaticValue,
      model,
    );
  }

  private resolveComponentType(
    input: RuntimeCompositionMaterializationRequest,
    componentInputType: CheckerTypeReference | null,
    model: EvaluatedBinding,
  ): ComponentTypeResolution {
    if (
      input.resourceDefinitions == null
      || input.typeSystem == null
      || componentInputType?.productHandle == null
    ) {
      return new ComponentTypeResolution([], CompositionComponentCandidateCoverageKind.Open);
    }
    const shape = readCheckerTypeShape(input.expressionWorld.projector.publication, componentInputType);
    if (shape == null) {
      return new ComponentTypeResolution([], CompositionComponentCandidateCoverageKind.Open);
    }
    const candidateBasis = componentTypeCandidateBasisForShape(shape);
    if (candidateBasis.types.length === 0) {
      return new ComponentTypeResolution([], CompositionComponentCandidateCoverageKind.Open);
    }
    let coveredTypes = 0;
    const definitions = candidateBasis.types.flatMap((type) => {
      const candidates = definitionsForType(input.resourceDefinitions!, input.typeSystem!, type);
      if (candidates.length > 0) {
        coveredTypes += 1;
      }
      return candidates;
    });
    const candidates = resolvedComponentRows(
      input.expressionWorld.projector,
      input,
      definitions,
      CompositionComponentResolutionKind.TypeCandidate,
      model,
    );
    const coverageKind = candidateBasis.exhaustive && coveredTypes === candidateBasis.types.length
      ? CompositionComponentCandidateCoverageKind.Complete
      : coveredTypes > 0
        ? CompositionComponentCandidateCoverageKind.Partial
        : CompositionComponentCandidateCoverageKind.Open;
    return new ComponentTypeResolution(candidates, coverageKind);
  }

  private openCompositionInputSeams(
    local: string,
    sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
    inputs: readonly (readonly [RuntimeCompositionInputKind, EvaluatedBinding])[],
    componentResolution: ComponentResolution,
    source: CompositionSourceSet,
    records: KernelStoreRecord[],
  ): readonly CompositionInputPressure[] {
    const result: CompositionInputPressure[] = [];
    for (const [inputKind, evaluated] of inputs) {
      const openSettlementSummary = openAwaitedSettlementSummary(inputKind, evaluated);
      if ((!evaluated.isOpen && openSettlementSummary == null) || evaluated.evaluation == null) {
        continue;
      }
      if (
        openSettlementSummary == null
        && compositionInputPressureIsSatisfied(inputKind, evaluated, componentResolution)
      ) {
        continue;
      }
      const sourceAddressHandle = evaluated.binding?.sourceAddressHandle ?? null;
      const pressure = projectRuntimeBindingSourceValuePressure(
        this.publication,
        sourceValueEvaluator,
        [evaluated.evaluation],
        sourceAddressHandle,
        `${local}:input:${inputKind}:pressure`,
      );
      const pressureSummaries = [
        pressure.summary,
        openSettlementSummary,
      ].filter((summary): summary is string => summary != null);
      const summary = pressureSummaries.length === 0
        ? `AuCompose '${inputKind}' input remained open.`
        : `AuCompose '${inputKind}' input remained open: ${[...new Set(pressureSummaries)].join(' ')}`;
      const settlementReasonKinds = openSettlementSummary == null
        ? []
        : uniqueOpenSeamReasonKinds([
            OpenSeamReasonKind.AsyncExecutionValue,
            ...openSeamReasonKindsForEvaluationValue(
              evaluated.value?.kind === EvaluationValueKind.Promise
                ? evaluated.value.settlement.evidence.value
                : null,
            ),
          ]);
      const seam = new OpenSeam(
        this.store.handles.openSeam(`${local}:input:${inputKind}:open`),
        KernelVocabulary.Template.OpenRuntimeComposition.key,
        summary,
        sourceAddressHandle,
        source.evidenceHandle,
        uniqueOpenSeamReasonKinds([
          OpenSeamReasonKind.RuntimeCompositionInputOpen,
          ...pressure.reasonKinds,
          ...settlementReasonKinds,
        ]),
        [
          {
            reasonKind: OpenSeamReasonKind.RuntimeCompositionInputOpen,
            summary,
            addressHandle: sourceAddressHandle,
            evidenceHandle: source.evidenceHandle,
          },
          ...(openSettlementSummary == null
            ? []
            : settlementReasonKinds.map((reasonKind) => ({
                reasonKind,
                summary: openSettlementSummary,
                addressHandle: sourceAddressHandle,
                evidenceHandle: source.evidenceHandle,
              }))),
          ...pressure.reasonSources,
        ],
      );
      records.push(...pressure.records, seam);
      result.push(new CompositionInputPressure(inputKind, seam));
    }
    return result;
  }

  private openCompositionResolutionSeam(
    local: string,
    resolution: ComponentResolution,
    component: EvaluatedBinding,
    inputPressure: readonly CompositionInputPressure[],
    sourceAddressHandle: AddressHandle | null,
    source: CompositionSourceSet,
    records: KernelStoreRecord[],
  ): OpenSeam | null {
    if (
      resolution.openReason == null
      || inputPressure.some((pressure) => pressure.inputKind === RuntimeCompositionInputKind.Component)
    ) {
      return null;
    }
    const componentSourceAddressHandle = component.binding?.sourceAddressHandle ?? sourceAddressHandle;
    const seam = new OpenSeam(
      this.store.handles.openSeam(`${local}:component-resolution:open`),
      KernelVocabulary.Template.OpenRuntimeComposition.key,
      resolution.openReason,
      componentSourceAddressHandle,
      source.evidenceHandle,
      uniqueOpenSeamReasonKinds([
        OpenSeamReasonKind.RuntimeCompositionComponentResolutionOpen,
        ...resolution.openReasonKinds,
      ]),
      [{
        reasonKind: OpenSeamReasonKind.RuntimeCompositionComponentResolutionOpen,
        summary: resolution.openReason,
        addressHandle: componentSourceAddressHandle,
        evidenceHandle: source.evidenceHandle,
      }],
    );
    records.push(seam);
    return seam;
  }

  private recordsForSource(local: string): CompositionSourceSet {
    const evidenceHandle = this.store.handles.evidence(`runtime-composition:${local}`);
    const provenanceHandle = this.store.handles.provenance(`runtime-composition:${local}`);
    return new CompositionSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Runtime-html AuCompose composition materialization from rendered controllers, binding scopes, and data-flow facts.',
          null,
        ),
        new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      ],
      evidenceHandle,
      provenanceHandle,
    );
  }

  private allocate(local: string): { readonly productHandle: ProductHandle; readonly identityHandle: IdentityHandle } {
    return {
      productHandle: this.store.handles.product(local),
      identityHandle: this.store.handles.identity(local),
    };
  }
}

function isAuComposeController(controller: RuntimeControllerFrame): boolean {
  return controller.name === AU_COMPOSE_RESOURCE_NAME;
}

function auComposeBindings(
  controllerBind: RuntimeControllerBindEmission,
  controller: RuntimeControllerFrame,
  bindingsByProduct: ReadonlyMap<ProductHandle, RuntimeBinding>,
): AuComposeBindingSet {
  const accesses = controllerBind.targetAccesses.filter((access) =>
    access.targetKind === RuntimeBindingTargetKind.ControllerViewModel
    && access.targetControllerProductHandle === controller.productHandle
  );
  return {
    template: bindingForTarget(accesses, bindingsByProduct, AuComposeBindableName.Template),
    component: bindingForTarget(accesses, bindingsByProduct, AuComposeBindableName.Component),
    model: bindingForTarget(accesses, bindingsByProduct, AuComposeBindableName.Model),
    scopeBehavior: bindingForTarget(accesses, bindingsByProduct, AuComposeBindableName.ScopeBehavior),
    tag: bindingForTarget(accesses, bindingsByProduct, AuComposeBindableName.Tag),
    flushMode: bindingForTarget(accesses, bindingsByProduct, AuComposeBindableName.FlushMode),
    composing: bindingForTarget(accesses, bindingsByProduct, AuComposeBindableName.Composing),
    composition: bindingForTarget(accesses, bindingsByProduct, AuComposeBindableName.Composition),
  };
}

function bindingForTarget(
  accesses: readonly RuntimeBindingTargetAccess[],
  bindingsByProduct: ReadonlyMap<ProductHandle, RuntimeBinding>,
  targetProperty: string,
): RuntimeBinding | null {
  const access = accesses.find((candidate) => candidate.targetProperty === targetProperty) ?? null;
  return access?.binding.productHandle == null
    ? null
    : bindingsByProduct.get(access.binding.productHandle) ?? null;
}

function staticAuComposeInputs(
  store: ProductDetailReadView,
  controller: RuntimeControllerFrame,
): StaticAuComposeInputs {
  const instruction = controller.instructionProductHandle == null
    ? null
    : store.readProductDetail(TemplateProductDetails.Instruction, controller.instructionProductHandle);
  if (!(instruction instanceof HydrateElementInstruction)) {
    return emptyStaticAuComposeInputs();
  }
  const valuesByTarget = new Map<string, string>();
  for (const handle of instruction.bindableInstructionProductHandles) {
    const child = store.readProductDetail(TemplateProductDetails.Instruction, handle);
    if (child instanceof SetPropertyInstruction) {
      valuesByTarget.set(child.targetProperty, child.value);
    }
  }
  return {
    template: staticInputValue(valuesByTarget, AuComposeBindableName.Template),
    component: staticInputValue(valuesByTarget, AuComposeBindableName.Component),
    model: staticInputValue(valuesByTarget, AuComposeBindableName.Model),
    scopeBehavior: staticInputValue(valuesByTarget, AuComposeBindableName.ScopeBehavior),
    tag: staticInputValue(valuesByTarget, AuComposeBindableName.Tag),
    flushMode: staticInputValue(valuesByTarget, AuComposeBindableName.FlushMode),
  };
}

function emptyStaticAuComposeInputs(): StaticAuComposeInputs {
  return {
    template: null,
    component: null,
    model: null,
    scopeBehavior: null,
    tag: null,
    flushMode: null,
  };
}

function staticInputValue(
  valuesByTarget: ReadonlyMap<string, string>,
  targetProperty: AuComposeBindableName,
): string | null {
  const attribute = builtInResourceBindableAttribute(AU_COMPOSE_TARGET_NAME, targetProperty);
  return valuesByTarget.get(targetProperty)
    ?? (attribute === targetProperty ? null : valuesByTarget.get(attribute) ?? null);
}

function expressionProductHandle(binding: RuntimeBinding | null): ProductHandle | null {
  return binding instanceof PropertyBinding ? binding.expressionProductHandle : null;
}

function modelResolutionKind(model: EvaluatedBinding): CompositionModelResolutionKind {
  if (model.binding == null && model.value == null) {
    return CompositionModelResolutionKind.Absent;
  }
  if (model.value != null && model.openReason == null) {
    return CompositionModelResolutionKind.StaticValue;
  }
  if (model.sourceType != null) {
    return CompositionModelResolutionKind.TypeVisible;
  }
  return CompositionModelResolutionKind.Open;
}

function componentResolutionWithInputPressure(
  resolution: ComponentResolution,
  inputPressure: readonly CompositionInputPressure[],
): ComponentResolution {
  const summaries = [
    resolution.openReason,
    ...inputPressure.map((pressure) => pressure.seam.summary),
  ].filter((summary): summary is string => summary != null);
  if (summaries.length === 0) {
    return resolution;
  }
  return {
    ...resolution,
    openReason: [...new Set(summaries)].join(' '),
    openReasonKinds: [...new Set([
      ...resolution.openReasonKinds,
      ...inputPressure.flatMap((pressure) => pressure.seam.reasonKinds),
    ])],
  };
}

function compositionInputPressureIsSatisfied(
  inputKind: RuntimeCompositionInputKind,
  input: EvaluatedBinding,
  componentResolution: ComponentResolution,
): boolean {
  if (
    inputKind !== RuntimeCompositionInputKind.Component
    || componentResolution.resolutionKind !== CompositionComponentResolutionKind.TypeCandidate
    || componentResolution.candidateCoverageKind !== CompositionComponentCandidateCoverageKind.Complete
    || input.openReasonKinds.length === 0
  ) {
    return false;
  }
  return input.openReasonKinds.every((reasonKind) =>
    reasonKind === OpenSeamReasonKind.BindingSourceNeedsRuntimeValue
    || reasonKind === OpenSeamReasonKind.BindingSourceSlotNoStaticValue
    || reasonKind === OpenSeamReasonKind.BindingSourceMemberNoStaticValue
  );
}

function valueIsObjectViewModelComponent(value: EvaluationValue): boolean {
  if (value.kind === EvaluationValueKind.Promise) {
    const fulfillment = closedEvaluationPromiseFulfillment(value);
    return fulfillment != null && valueIsObjectViewModelComponent(fulfillment);
  }
  return value.kind === EvaluationValueKind.Object
    || value.kind === EvaluationValueKind.Instance
    || value.kind === EvaluationValueKind.BoundaryObject
    || value.kind === EvaluationValueKind.Class
    || value.kind === EvaluationValueKind.Function;
}

function awaitedCompositionInputType(
  projector: CheckerAsyncTypeProjector,
  evaluated: EvaluatedBinding,
  localKey: string,
  fallbackSourceAddressHandle: AddressHandle | null,
): CheckerTypeReference | null {
  return evaluated.sourceType == null
    ? null
    : projector.awaitedTypeReference(
        evaluated.sourceType,
        localKey,
        evaluated.binding?.sourceAddressHandle ?? fallbackSourceAddressHandle,
      );
}

function openAwaitedSettlementSummary(
  inputKind: RuntimeCompositionInputKind,
  evaluated: EvaluatedBinding,
): string | null {
  if (
    inputKind !== RuntimeCompositionInputKind.Template
    && inputKind !== RuntimeCompositionInputKind.Component
  ) {
    return null;
  }
  if (
    evaluated.value?.kind !== EvaluationValueKind.Promise
    || evaluated.value.settlement.kind !== EvaluationPromiseSettlementKind.Open
  ) {
    return null;
  }
  const evidenceValue = evaluated.value.settlement.evidence.value;
  return evidenceValue.kind === EvaluationValueKind.BoundaryValue
    || evidenceValue.kind === EvaluationValueKind.BoundaryObject
    ? evidenceValue.reason
    : 'Promise settlement depends on asynchronous runtime execution.';
}

function inputSettlementKind(
  evaluated: EvaluatedBinding,
): EvaluationPromiseSettlementKind | null {
  return evaluated.value?.kind === EvaluationValueKind.Promise
    ? evaluated.value.settlement.kind
    : null;
}

function resolvedTemplateValue(
  evaluated: EvaluatedBinding,
  staticValue: string | null,
): string | null {
  if (staticValue != null) {
    return staticValue;
  }
  if (evaluated.isOpen) {
    return null;
  }
  const value = evaluated.value?.kind === EvaluationValueKind.Promise
    ? closedEvaluationPromiseFulfillment(evaluated.value)
    : evaluated.value;
  return value?.kind === EvaluationValueKind.String ? value.value : null;
}

function inputConsumptionKind(
  inputKind: RuntimeCompositionInputKind,
  evaluated: EvaluatedBinding,
  staticValue: string | null,
): CompositionInputConsumptionKind {
  if (evaluated.binding == null && evaluated.value == null && staticValue == null) {
    return CompositionInputConsumptionKind.Absent;
  }
  return inputKind === RuntimeCompositionInputKind.Template
    || inputKind === RuntimeCompositionInputKind.Component
    ? CompositionInputConsumptionKind.AwaitThenable
    : CompositionInputConsumptionKind.Direct;
}

function inputValueStateKind(
  evaluated: EvaluatedBinding,
  staticValue: string | null,
): CompositionInputValueStateKind {
  if (evaluated.binding == null && evaluated.value == null && staticValue == null) {
    return CompositionInputValueStateKind.Absent;
  }
  if (evaluated.isOpen) {
    return CompositionInputValueStateKind.Open;
  }
  if (evaluated.value?.kind === EvaluationValueKind.Promise) {
    switch (evaluated.value.settlement.kind) {
      case EvaluationPromiseSettlementKind.Fulfilled:
        return closedEvaluationPromiseFulfillment(evaluated.value) == null
          ? CompositionInputValueStateKind.Open
          : CompositionInputValueStateKind.Fulfilled;
      case EvaluationPromiseSettlementKind.Rejected:
        return CompositionInputValueStateKind.Rejected;
      case EvaluationPromiseSettlementKind.Open:
        return CompositionInputValueStateKind.Open;
    }
  }
  return evaluated.value != null || staticValue != null
    ? CompositionInputValueStateKind.Closed
    : CompositionInputValueStateKind.Open;
}

function uniqueOpenSeamReasonKinds(
  values: readonly OpenSeamReasonKind[],
): readonly OpenSeamReasonKind[] {
  return [...new Set(values)];
}

function compositionRenderingContextKind(
  input: RuntimeCompositionMaterializationRequest,
  controller: RuntimeControllerFrame,
): CompositionRenderingContextKind {
  const instructionOwner = input.projectContext.readResourceForInstruction(
    controller.instructionProductHandle,
  );
  if (instructionOwner == null) {
    throw new Error(
      `AuCompose controller '${controller.productHandle}' lost the compiler resource that owns instruction `
      + `'${controller.instructionProductHandle ?? '(missing)'}'.`,
    );
  }
  const ownerDefinition = instructionOwner.compilation.definition;
  const ownerHandle = ownerDefinition.productHandle;
  const analysisHandle = input.runtimeRendering.rootController.definitionProductHandle;
  if (ownerHandle == null || analysisHandle == null) {
    throw new Error(
      `AuCompose controller '${controller.productHandle}' lost its instruction-owner or analysis-root definition identity.`,
    );
  }
  return ownerHandle === analysisHandle
    ? CompositionRenderingContextKind.DefinitionResource
    : CompositionRenderingContextKind.RecursiveResourceInstance;
}

function componentWithComposedController(
  component: CompositionResolvedComponent,
  controller: RuntimeControllerFrame,
): CompositionResolvedComponent {
  return new CompositionResolvedComponent(
    component.definitionProductHandle,
    component.name,
    component.className,
    component.compiledTemplateProductHandle,
    controller.toReference(),
    component.resolutionKind,
    component.activationModelHandoff,
  );
}

function composedCustomElementContextResolverSlots(
  sourceAddressHandle: AddressHandle | null,
): readonly ContainerContextResolverSlotRequest[] {
  return [
    FrameworkIntrinsicDiKey.INode,
    FrameworkIntrinsicDiKey.IController,
    FrameworkIntrinsicDiKey.IInstruction,
    FrameworkIntrinsicDiKey.IRenderLocation,
    FrameworkIntrinsicDiKey.IViewFactory,
    FrameworkIntrinsicDiKey.IAuSlotsInfo,
    FrameworkIntrinsicDiKey.IHydrationContext,
  ].map((name) => new ContainerContextResolverSlotRequest({
    interfaceName: name,
    sourceAddressHandle,
  }));
}

function literalStringUnionInputValue<TValue extends string>(
  evaluated: EvaluatedBinding,
  staticValue: string | null,
  allowedValues: readonly TValue[],
  defaultValue: TValue,
): TValue | null {
  const value = evaluated.binding == null
    ? staticValue ?? defaultValue
    : literalStringFromValue(evaluated.value);
  return value != null && allowedValues.includes(value as TValue) ? value as TValue : null;
}

function literalStringInputValue(evaluated: EvaluatedBinding, staticValue: string | null): string | null {
  return evaluated.binding == null
    ? staticValue
    : literalStringFromValue(evaluated.value);
}

function literalStringFromValue(value: EvaluationValue | null): string | null {
  if (value?.kind === EvaluationValueKind.String) {
    return value.value;
  }
  return null;
}

function resolvedComponentRows(
  projector: CheckerTypeProjector,
  input: RuntimeCompositionMaterializationRequest,
  definitions: readonly (FullResourceDefinition | null)[],
  resolutionKind: CompositionComponentResolutionKind,
  model: EvaluatedBinding,
): readonly CompositionResolvedComponent[] {
  const seen = new Set<string>();
  const rows: CompositionResolvedComponent[] = [];
  definitions.forEach((definition, index) => {
    if (!(definition instanceof CustomElementDefinition) || definition.productHandle == null || seen.has(definition.productHandle)) {
      return;
    }
    seen.add(definition.productHandle);
    rows.push(new CompositionResolvedComponent(
      definition.productHandle,
      definition.name,
      definition.target.localName,
      input.projectContext.readResourceForDefinition(definition.productHandle)?.compiledTemplateProductHandle ?? null,
      null,
      resolutionKind,
      activationModelHandoff(
        projector,
        definition,
        model,
        `runtime-composition:${localKeyPart(definition.productHandle)}:activation:${index}`,
      ),
    ));
  });
  return rows;
}

function componentTypeCandidateBasisForShape(shape: CheckerTypeShape): ComponentTypeCandidateBasis {
  const carrier = shape.carrier;
  if (carrier == null) {
    return new ComponentTypeCandidateBasis([], false);
  }
  const type = carrier.type;
  const types = type.isUnion() ? type.types : [type];
  return new ComponentTypeCandidateBasis(
    types,
    !type.isIntersection() && types.every(isExactNamedClassCandidateType),
  );
}

function isExactNamedClassCandidateType(type: ts.Type): boolean {
  return classifyCheckerTypeShape(type) === CheckerTypeShapeKind.Class;
}

function definitionsForType(
  resourceDefinitions: ResourceDefinitionIndex,
  typeSystem: TypeSystemProject,
  type: ts.Type,
): readonly FullResourceDefinition[] {
  const definitions: FullResourceDefinition[] = [];
  for (const declaration of declarationCandidatesForType(type)) {
    const definition = resourceDefinitions.lookupByTypeScriptDeclaration(typeSystem, declaration);
    if (definition != null) {
      definitions.push(definition);
    }
  }
  return definitions.filter((definition, index, all) =>
    definition.type === ResourceDefinitionKind.CustomElement
    && definition.productHandle != null
    && all.findIndex((candidate) => candidate.productHandle === definition.productHandle) === index
  );
}

function declarationCandidatesForType(type: ts.Type): readonly ts.Declaration[] {
  const declarations: ts.Declaration[] = [];
  declarations.push(...(type.symbol?.declarations ?? []));
  for (const signature of type.getConstructSignatures()) {
    declarations.push(...(signature.getReturnType().symbol?.declarations ?? []));
  }
  return declarations.filter((declaration, index, all) => all.indexOf(declaration) === index);
}

function recordsForCompositionContext(
  local: string,
  context: CompositionContext,
  hostController: RuntimeControllerFrame,
  provenanceHandle: ProvenanceHandle,
  openSeamHandles: readonly OpenSeamHandle[],
  store: KernelStore,
): readonly KernelStoreRecord[] {
  return [
    new ConfigurationIdentity(
      context.identityHandle,
      KernelVocabulary.Configuration.CompositionContext.key,
      hostController.identityHandle,
      context.sourceAddressHandle,
      'composition-context',
    ),
    new MaterializedProduct(
      context.productHandle,
      KernelVocabulary.Configuration.CompositionContext.key,
      context.identityHandle,
      context.sourceAddressHandle,
      provenanceHandle,
    ),
    new MaterializationRecord(
      store.handles.materialization(`${local}:composition-context`),
      context.identityHandle,
      [context.productHandle],
      [],
      openSeamHandles,
    ),
  ];
}

function recordsForCompositionController(
  local: string,
  composition: CompositionController,
  context: CompositionContext,
  hostController: RuntimeControllerFrame,
  provenanceHandle: ProvenanceHandle,
  openSeamHandles: readonly OpenSeamHandle[],
  store: KernelStore,
): readonly KernelStoreRecord[] {
  const claims = compositionControllerSemanticClaims(local, composition, context, hostController, provenanceHandle, store);
  return [
    new ConfigurationIdentity(
      composition.identityHandle,
      KernelVocabulary.Configuration.CompositionController.key,
      hostController.identityHandle,
      composition.sourceAddressHandle,
      'composition-controller',
    ),
    new MaterializedProduct(
      composition.productHandle,
      KernelVocabulary.Configuration.CompositionController.key,
      composition.identityHandle,
      composition.sourceAddressHandle,
      provenanceHandle,
    ),
    new MaterializationRecord(
      store.handles.materialization(`${local}:composition-controller`),
      composition.identityHandle,
      [composition.productHandle],
      claims.map((claim) => claim.handle),
      openSeamHandles,
    ),
    ...claims,
  ];
}

function compositionControllerSemanticClaims(
  local: string,
  composition: CompositionController,
  context: CompositionContext,
  hostController: RuntimeControllerFrame,
  provenanceHandle: ProvenanceHandle,
  store: KernelStore,
): readonly SemanticClaim[] {
  return [
    new SemanticClaim(
      store.handles.claim(`${local}:controller-owns-composition`),
      hostController.productHandle,
      KernelVocabulary.Configuration.ControllerOwnsComposition.key,
      composition.productHandle,
      provenanceHandle,
    ),
    new SemanticClaim(
      store.handles.claim(`${local}:composition-uses-context`),
      composition.productHandle,
      KernelVocabulary.Configuration.CompositionControllerUsesContext.key,
      context.productHandle,
      provenanceHandle,
    ),
    ...composition.resolvedComponents.map((component, index) => new SemanticClaim(
      store.handles.claim(`${local}:composition-uses-definition:${index}`),
      composition.productHandle,
      KernelVocabulary.Configuration.CompositionControllerUsesDefinition.key,
      component.definitionProductHandle,
      provenanceHandle,
    )),
  ];
}
