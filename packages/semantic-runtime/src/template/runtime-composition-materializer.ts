import ts from 'typescript';
import { ConfigurationProductDetails } from '../configuration/product-details.js';
import {
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
  ContainerContextResolverRecordPolicy,
  ContainerContextResolverSlotRequest,
  type ContainerChildMaterializationEmission,
} from '../di/container-materializer.js';
import {
  EvaluationStringValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import { readDeclarationLocalName } from '../evaluation/ts-syntax.js';
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
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  ConfigurationIdentity,
} from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
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
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import {
  RuntimeBindingSourceValueEvaluationKind,
  RuntimeBindingSourceValueEvaluator,
} from '../observation/binding-source-value-evaluator.js';
import {
  instructionScopeLookup,
  type RuntimeInstructionScopeLookup,
} from '../observation/runtime-binding-expression.js';
import type { RuntimeBindingDataFlowEmission } from '../observation/binding-data-flow-materializer.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  type CheckerTypeReference,
  type CheckerTypeShape,
} from '../type-system/type-shape.js';
import {
  readCheckerTypeShape,
} from '../type-system/checker-type-shape-access.js';
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
  CompositionActivationModelHandoff,
  CompositionContext,
  CompositionController,
  CompositionInputFulfillmentKind,
  CompositionModelResolutionKind,
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
  RuntimeControllerLifecycleStage,
  RuntimeControllerLifecycleStepKind,
} from './runtime-controller.js';
import { RuntimeControllerPublicationMaterializer } from './runtime-controller-publication.js';
import { RuntimeRenderingSourceSet } from './runtime-rendering-source.js';
import {
  activationModelHandoff,
  activationModelHandoffForType,
  type CompositionModelEvaluation,
} from './runtime-composition-activation.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';
import type { TemplateRuntimeAnalysisProjectContext } from './template-runtime-analysis-context.js';
import type { TemplateScopeConstructionEmission } from './template-controller-scope-materializer.js';

export class RuntimeCompositionMaterializationRequest {
  constructor(
    readonly localKey: string,
    readonly runtimeRendering: RuntimeRenderingEmission,
    readonly controllerBind: RuntimeControllerBindEmission,
    readonly bindingDataFlow: RuntimeBindingDataFlowEmission,
    readonly scopes: TemplateScopeConstructionEmission,
    readonly projectContext: TemplateRuntimeAnalysisProjectContext,
    readonly resourceDefinitions: ResourceDefinitionIndex | null,
    readonly sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
  ) {}
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

interface EvaluatedBinding extends CompositionModelEvaluation {
  readonly binding: RuntimeBinding | null;
  readonly value: EvaluationValue | null;
  readonly sourceType: CheckerTypeReference | null;
  readonly openReason: string | null;
  readonly openReasonKinds: readonly OpenSeamReasonKind[];
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
  readonly objectViewModelActivationHandoff: CompositionActivationModelHandoff | null;
  readonly openReason: string | null;
  readonly openReasonKinds: readonly OpenSeamReasonKind[];
}

class ComposedChildControllerHandoff {
  constructor(
    readonly resolution: ComponentResolution,
    readonly controllers: readonly RuntimeControllerFrame[],
  ) {}
}

export class RuntimeCompositionMaterializer {
  private readonly childContainerMaterializer: ContainerChildMaterializer;
  private readonly controllerPublication: RuntimeControllerPublicationMaterializer;

  constructor(
    private readonly store: KernelStore,
  ) {
    this.childContainerMaterializer = new ContainerChildMaterializer(store);
    this.controllerPublication = new RuntimeControllerPublicationMaterializer(store);
  }

  materialize(input: RuntimeCompositionMaterializationRequest): RuntimeCompositionEmission {
    const emission = this.recordsForCompositions(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `runtime-composition:${input.localKey}`));
    }
    this.store.productDetails.addAll(TemplateProductDetails.CompositionContext, emission.contexts);
    this.store.productDetails.addAll(TemplateProductDetails.CompositionController, emission.controllers);
    for (const controller of emission.composedControllers) {
      this.store.productDetails.add(
        ConfigurationProductDetails.Controller,
        controller.productHandle,
        controller.toControllerProduct(),
      );
    }
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

    input.runtimeRendering.controllers.forEach((controller, index) => {
      if (!isAuComposeController(controller)) {
        return;
      }
      const local = `${input.localKey}:composition:${index}`;
      const bindings = auComposeBindings(input.controllerBind, controller, bindingsByProduct);
      const staticInputs = staticAuComposeInputs(this.store, controller);
      const template = this.evaluateBinding(input, bindings.template, scopesByInstruction);
      const component = this.evaluateBinding(input, bindings.component, scopesByInstruction);
      const model = this.evaluateModelInput(input, bindings.model, scopesByInstruction, staticInputs.model);
      const scopeBehavior = this.evaluateBinding(input, bindings.scopeBehavior, scopesByInstruction);
      const tag = this.evaluateBinding(input, bindings.tag, scopesByInstruction);
      const flushMode = this.evaluateBinding(input, bindings.flushMode, scopesByInstruction);
      const resolution = this.resolveComponent(local, input, controller, component, model, staticInputs);
      const context = this.createContext(local, controller, bindings, template, component, model, scopeBehavior, tag, flushMode, staticInputs, source.provenanceHandle);
      const controllerHandoff = this.materializeComposedChildControllers(
        local,
        input,
        controller,
        context,
        resolution,
        source,
        records,
        childContainers,
      );
      const composition = this.createController(local, controller, context, controllerHandoff.resolution, model, source.provenanceHandle);

      contexts.push(context);
      controllers.push(composition);
      composedControllers.push(...controllerHandoff.controllers);
      const seam = controllerHandoff.resolution.openReason == null
        ? null
        : this.openCompositionSeam(local, controllerHandoff.resolution, context.sourceAddressHandle, source);
      if (seam != null) {
        openSeams.push(seam);
        records.push(seam);
      }
      records.push(...recordsForCompositionContext(local, context, controller, source.provenanceHandle, this.store));
      records.push(...recordsForCompositionController(local, composition, context, controller, source.provenanceHandle, this.store));
    });

    return new RuntimeCompositionEmission(contexts, controllers, composedControllers, childContainers, openSeams, records);
  }

  private createContext(
    local: string,
    controller: RuntimeControllerFrame,
    bindings: AuComposeBindingSet,
    template: EvaluatedBinding,
    component: EvaluatedBinding,
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
      inputFulfillmentKind(template, staticInputs.template),
      inputFulfillmentKind(component, staticInputs.component),
      inputFulfillmentKind(model, staticInputs.model),
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
      resolution.resolutionKind,
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
    source: CompositionSourceSet,
    records: KernelStoreRecord[],
    childContainers: ContainerChildMaterializationEmission[],
  ): ComposedChildControllerHandoff {
    if (resolution.resolutionKind !== CompositionComponentResolutionKind.StaticValue
      || resolution.candidates.length !== 1) {
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
    const parentContainer = hostController.containerFrame;
    if (parentContainer == null || input.resourceDefinitions == null) {
      return null;
    }
    const definition = input.resourceDefinitions.lookupByProduct(component.definitionProductHandle);
    if (!(definition instanceof CustomElementDefinition)) {
      return null;
    }

    const childContainer = this.childContainerMaterializer.materializeChild(new ContainerChildMaterializationRequest(
      `${local}:container`,
      parentContainer,
      context.sourceAddressHandle,
      `au-compose:${definition.name}:container`,
      composedCustomElementContextResolverSlots(context.sourceAddressHandle),
      null,
      ContainerContextResolverRecordPolicy.PublishAll,
    ));
    records.push(...childContainer.records);
    childContainers.push(childContainer);

    const allocation = this.allocate(`${local}:controller`);
    const controller = new RuntimeControllerFrame(
      RuntimeControllerCreationKind.CustomElement,
      allocation.productHandle,
      allocation.identityHandle,
      definition.name,
      childContainer.container.toReference(),
      childContainer.container,
      definition.productHandle,
      definition.target,
      context.sourceAddressHandle,
      hostController,
      null,
      null,
      definition.strict,
      context.sourceAddressHandle ?? definition.sourceAddressHandle,
      source.provenanceHandle,
    );
    controller.recordLifecycleStep(
      RuntimeControllerLifecycleStage.Hydration,
      RuntimeControllerLifecycleStepKind.CreateChildContainer,
      childContainer.container.productHandle,
      childContainer.container.sourceAddressHandle,
      'AuCompose.compose created a child container for a closed custom-element composition branch.',
    );
    hostController.addChild(controller);
    records.push(new SemanticClaim(
      this.store.handles.claim(`${local}:host-has-composed-child`),
      hostController.productHandle,
      KernelVocabulary.Configuration.ControllerHasChild.key,
      controller.productHandle,
      source.provenanceHandle,
    ));
    this.controllerPublication.recordController(
      `${local}:runtime-controller`,
      controller,
      input.projectContext,
      new RuntimeRenderingSourceSet([], source.evidenceHandle, source.provenanceHandle),
      records,
      [],
      new Map(),
    );
    return controller;
  }

  private evaluateBinding(
    input: RuntimeCompositionMaterializationRequest,
    binding: RuntimeBinding | null,
    scopesByInstruction: RuntimeInstructionScopeLookup,
  ): EvaluatedBinding {
    if (!(binding instanceof PropertyBinding)) {
      return {
        binding,
        value: null,
        sourceType: null,
        openReason: binding == null ? 'No binding was supplied.' : 'AuCompose composition input was not a PropertyBinding.',
        openReasonKinds: [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
      };
    }
    const flow = input.bindingDataFlow.readDataFlowsForBinding(binding.productHandle)[0] ?? null;
    const expression = bindingExpressionAstForProduct(this.store, binding.expressionProductHandle);
    const scope = scopesByInstruction.scopeForBinding(input.runtimeRendering, binding);
    if (expression == null || scope == null || input.sourceValueEvaluator == null) {
      return {
        binding,
        value: null,
        sourceType: flow?.sourceType ?? null,
        openReason: 'AuCompose binding source could not be evaluated because expression, scope, or evaluator state is unavailable.',
        openReasonKinds: [OpenSeamReasonKind.BindingSourceSlotNoStaticValue],
      };
    }
    const evaluated = input.sourceValueEvaluator.evaluate(expression, scope);
    return {
      binding,
      value: evaluated.value,
      sourceType: flow?.sourceType ?? null,
      openReason: evaluated.kind === RuntimeBindingSourceValueEvaluationKind.Open
        ? evaluated.openReason
        : null,
      openReasonKinds: evaluated.openReasonKinds,
    };
  }

  private evaluateModelInput(
    input: RuntimeCompositionMaterializationRequest,
    binding: RuntimeBinding | null,
    scopesByInstruction: RuntimeInstructionScopeLookup,
    staticModel: string | null,
  ): EvaluatedBinding {
    if (binding != null || staticModel == null) {
      return this.evaluateBinding(input, binding, scopesByInstruction);
    }
    return {
      binding: null,
      value: new EvaluationStringValue(staticModel),
      sourceType: null,
      openReason: null,
      openReasonKinds: [],
    };
  }

  private resolveComponent(
    local: string,
    input: RuntimeCompositionMaterializationRequest,
    controller: RuntimeControllerFrame,
    component: EvaluatedBinding,
    model: EvaluatedBinding,
    staticInputs: StaticAuComposeInputs,
  ): ComponentResolution {
    if (component.binding == null && staticInputs.component == null) {
      return {
        candidates: [],
        resolutionKind: CompositionComponentResolutionKind.TemplateOnly,
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
          objectViewModelActivationHandoff: null,
          openReason: null,
          openReasonKinds: [],
        };
      }
      return {
        candidates: [],
        resolutionKind: CompositionComponentResolutionKind.TemplateOnly,
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
        objectViewModelActivationHandoff: null,
        openReason: null,
        openReasonKinds: [],
      };
    }
    if (component.value != null && valueIsObjectViewModelComponent(component.value)) {
      return {
        candidates: [],
        resolutionKind: CompositionComponentResolutionKind.ObjectViewModel,
        objectViewModelActivationHandoff: activationModelHandoffForType(
          this.store,
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
    const typeCandidates = this.resolveComponentType(input, component.sourceType, model);
    if (typeCandidates.length > 0) {
      return {
        candidates: typeCandidates,
        resolutionKind: CompositionComponentResolutionKind.TypeCandidate,
        objectViewModelActivationHandoff: null,
        openReason: null,
        openReasonKinds: [],
      };
    }
    return {
      candidates: [],
      resolutionKind: CompositionComponentResolutionKind.Open,
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
      return this.resolveComponentValue(input, controller, value.fulfilledValue, resolutionKind, model);
    }
    if (value.kind === EvaluationValueKind.String) {
      const slot = controller.parent?.containerFrame?.find('custom-element', value.value).resourceSlot ?? null;
      const definition = input.resourceDefinitions.lookupByProduct(slot?.resourceProductHandle ?? null);
      return resolvedComponentRows(this.store, input, [definition], resolutionKind, model);
    }
    if (value.kind === EvaluationValueKind.Class || value.kind === EvaluationValueKind.Function) {
      return resolvedComponentRows(this.store, input, [input.resourceDefinitions.lookupValue(value)], resolutionKind, model);
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
    const slot = controller.parent?.containerFrame?.find('custom-element', componentName).resourceSlot ?? null;
    const definition = input.resourceDefinitions.lookupByProduct(slot?.resourceProductHandle ?? null);
    return resolvedComponentRows(this.store, input, [definition], CompositionComponentResolutionKind.StaticValue, model);
  }

  private resolveComponentType(
    input: RuntimeCompositionMaterializationRequest,
    sourceType: CheckerTypeReference | null,
    model: EvaluatedBinding,
  ): readonly CompositionResolvedComponent[] {
    if (input.resourceDefinitions == null || sourceType?.productHandle == null) {
      return [];
    }
    const shape = readCheckerTypeShape(this.store, sourceType);
    if (shape == null) {
      return [];
    }
    const definitions = candidateTypesForShape(shape)
      .flatMap((type) => definitionsForType(input.resourceDefinitions!, type));
    return resolvedComponentRows(this.store, input, definitions, CompositionComponentResolutionKind.TypeCandidate, model);
  }

  private openCompositionSeam(
    local: string,
    resolution: ComponentResolution,
    sourceAddressHandle: AddressHandle | null,
    source: CompositionSourceSet,
  ): OpenSeam {
    return new OpenSeam(
      this.store.handles.openSeam(`${local}:open`),
      KernelVocabulary.Instruction.OpenInstruction.key,
      resolution.openReason ?? 'AuCompose composition remains open.',
      sourceAddressHandle,
      source.evidenceHandle,
      resolution.openReasonKinds,
    );
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
  return controller.name === 'au-compose';
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
    template: bindingForTarget(accesses, bindingsByProduct, 'template'),
    component: bindingForTarget(accesses, bindingsByProduct, 'component'),
    model: bindingForTarget(accesses, bindingsByProduct, 'model'),
    scopeBehavior: bindingForTarget(accesses, bindingsByProduct, 'scopeBehavior'),
    tag: bindingForTarget(accesses, bindingsByProduct, 'tag'),
    flushMode: bindingForTarget(accesses, bindingsByProduct, 'flushMode'),
    composing: bindingForTarget(accesses, bindingsByProduct, 'composing'),
    composition: bindingForTarget(accesses, bindingsByProduct, 'composition'),
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
  store: KernelStore,
  controller: RuntimeControllerFrame,
): StaticAuComposeInputs {
  const instruction = controller.instructionProductHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.Instruction, controller.instructionProductHandle);
  if (!(instruction instanceof HydrateElementInstruction)) {
    return emptyStaticAuComposeInputs();
  }
  const valuesByTarget = new Map<string, string>();
  for (const handle of instruction.bindableInstructionProductHandles) {
    const child = store.productDetails.read(TemplateProductDetails.Instruction, handle);
    if (child instanceof SetPropertyInstruction) {
      valuesByTarget.set(child.targetProperty, child.value);
    }
  }
  return {
    template: staticInputValue(valuesByTarget, 'template'),
    component: staticInputValue(valuesByTarget, 'component'),
    model: staticInputValue(valuesByTarget, 'model'),
    scopeBehavior: staticInputValue(valuesByTarget, 'scopeBehavior', 'scope-behavior'),
    tag: staticInputValue(valuesByTarget, 'tag'),
    flushMode: staticInputValue(valuesByTarget, 'flushMode', 'flush-mode'),
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
  targetProperty: string,
  alternateTargetProperty: string | null = null,
): string | null {
  return valuesByTarget.get(targetProperty)
    ?? (alternateTargetProperty == null ? null : valuesByTarget.get(alternateTargetProperty) ?? null);
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

function valueIsObjectViewModelComponent(value: EvaluationValue): boolean {
  if (value.kind === EvaluationValueKind.Promise) {
    return valueIsObjectViewModelComponent(value.fulfilledValue);
  }
  return value.kind === EvaluationValueKind.Object
    || value.kind === EvaluationValueKind.Instance
    || value.kind === EvaluationValueKind.BoundaryObject
    || value.kind === EvaluationValueKind.Class
    || value.kind === EvaluationValueKind.Function;
}

function inputFulfillmentKind(
  evaluated: EvaluatedBinding,
  staticValue: string | null,
): CompositionInputFulfillmentKind {
  if (evaluated.binding == null && evaluated.value == null && staticValue == null) {
    return CompositionInputFulfillmentKind.Absent;
  }
  if (evaluated.value?.kind === EvaluationValueKind.Promise) {
    return CompositionInputFulfillmentKind.Promise;
  }
  if (evaluated.value != null || staticValue != null) {
    return CompositionInputFulfillmentKind.Direct;
  }
  if (evaluated.openReason != null) {
    return CompositionInputFulfillmentKind.Open;
  }
  return evaluated.binding == null
    ? CompositionInputFulfillmentKind.Absent
    : CompositionInputFulfillmentKind.Open;
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
    'INode',
    'IController',
    'IInstruction',
    'IRenderLocation',
    'IViewFactory',
    'IAuSlotsInfo',
    'IHydrationContext',
  ].map((name) => new ContainerContextResolverSlotRequest(name, sourceAddressHandle));
}

function literalStringUnionInputValue<TValue extends string>(
  evaluated: EvaluatedBinding,
  staticValue: string | null,
  allowedValues: readonly TValue[],
  defaultValue: TValue,
): TValue | null {
  const value = literalStringInputValue(evaluated, staticValue) ?? defaultValue;
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
  if (value?.kind === EvaluationValueKind.Promise) {
    return literalStringFromValue(value.fulfilledValue);
  }
  return null;
}

function resolvedComponentRows(
  store: KernelStore,
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
      input.projectContext.readCompiledTemplateForDefinition(definition.productHandle),
      null,
      resolutionKind,
      activationModelHandoff(store, definition, model, `runtime-composition:${localKeyPart(definition.productHandle)}:activation:${index}`),
    ));
  });
  return rows;
}

function candidateTypesForShape(shape: CheckerTypeShape): readonly ts.Type[] {
  const carrier = shape.carrier;
  if (carrier == null) {
    return [];
  }
  const type = carrier.type;
  return type.isUnion() ? type.types : [type];
}

function definitionsForType(
  resourceDefinitions: ResourceDefinitionIndex,
  type: ts.Type,
): readonly FullResourceDefinition[] {
  const definitions: FullResourceDefinition[] = [];
  for (const declaration of declarationCandidatesForType(type)) {
    const definition = definitionForDeclaration(resourceDefinitions, declaration);
    if (definition != null) {
      definitions.push(definition);
    }
  }
  return definitions.filter((definition, index, all) =>
    definition.productHandle != null
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

function definitionForDeclaration(
  resourceDefinitions: ResourceDefinitionIndex,
  declaration: ts.Declaration,
): FullResourceDefinition | null {
  const localName = readDeclarationLocalName(declaration);
  if (localName == null) {
    return null;
  }
  const definition = resourceDefinitions.lookupByModuleLocal(declaration.getSourceFile().fileName, localName)
    ?? resourceDefinitions.lookupByLocalName(localName);
  return definition?.type === ResourceDefinitionKind.CustomElement ? definition : null;
}

function recordsForCompositionContext(
  local: string,
  context: CompositionContext,
  hostController: RuntimeControllerFrame,
  provenanceHandle: ProvenanceHandle,
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
    ),
  ];
}

function recordsForCompositionController(
  local: string,
  composition: CompositionController,
  context: CompositionContext,
  hostController: RuntimeControllerFrame,
  provenanceHandle: ProvenanceHandle,
  store: KernelStore,
): readonly KernelStoreRecord[] {
  const claims = [
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
    ),
    ...claims,
  ];
}
