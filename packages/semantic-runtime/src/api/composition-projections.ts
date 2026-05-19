import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { ProductHandle } from '../kernel/handles.js';
import { uniqueStrings } from '../kernel/collections.js';
import type { KernelStore } from '../kernel/store.js';
import type { RuntimeControllerFrame } from '../template/runtime-controller.js';
import type {
  CompositionContext,
  CompositionController,
  CompositionResolvedComponent,
} from '../template/runtime-composition.js';
import { describeAddress } from './source-reference.js';
import type {
  SemanticRuntimeCompositionActivationHandoffRow,
  SemanticRuntimeCompositionRow,
} from './contracts.js';

type RuntimeTemplateResourceEmission = AureliaAppWorldProjectEmission['templates']['resources'][number];

export function readRuntimeCompositionRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRuntimeCompositionRow[] {
  const resourcesByDefinition = runtimeResourcesByDefinition(emission.templates.resources);
  return emission.templates.resources
    .flatMap((resource) => runtimeCompositionRowsForResource(resource, resourcesByDefinition, store, handles))
    .sort((left, right) =>
      `${left.renderingDefinitionName}:${left.source?.label ?? ''}`.localeCompare(
        `${right.renderingDefinitionName}:${right.source?.label ?? ''}`,
      )
    );
}

function runtimeCompositionRowsForResource(
  resource: RuntimeTemplateResourceEmission,
  resourcesByDefinition: ReadonlyMap<ProductHandle, RuntimeTemplateResourceEmission>,
  store: KernelStore,
  handles: boolean,
): readonly SemanticRuntimeCompositionRow[] {
  const contextsByProduct = new Map(resource.runtimeAnalysis.runtimeComposition.contexts.map((context) =>
    [context.productHandle, context] as const
  ));
  const controllersByProduct = new Map([
    [resource.runtimeAnalysis.runtimeRendering.rootController.productHandle, resource.runtimeAnalysis.runtimeRendering.rootController],
    ...resource.runtimeAnalysis.runtimeRendering.controllers.map((controller) =>
      [controller.productHandle, controller] as const
    ),
    ...resource.runtimeAnalysis.runtimeComposition.composedControllers.map((controller) =>
      [controller.productHandle, controller] as const
    ),
  ]);
  return resource.runtimeAnalysis.runtimeComposition.controllers.map((composition) =>
    runtimeCompositionRow(
      resource.compilation.definition.name,
      resource.runtimeAnalysis.runtimeRendering.rootController.productHandle,
      composition,
      contextsByProduct.get(composition.context.productHandle) ?? null,
      controllersByProduct,
      resourcesByDefinition,
      store,
      handles,
    )
  );
}

function runtimeCompositionRow(
  renderingDefinitionName: string,
  rootControllerProductHandle: ProductHandle,
  composition: CompositionController,
  context: CompositionContext | null,
  controllersByProduct: ReadonlyMap<ProductHandle, RuntimeControllerFrame>,
  resourcesByDefinition: ReadonlyMap<ProductHandle, RuntimeTemplateResourceEmission>,
  store: KernelStore,
  handles: boolean,
): SemanticRuntimeCompositionRow {
  const hostController = controllersByProduct.get(composition.hostControllerProductHandle) ?? null;
  const parentController = composition.parentControllerProductHandle == null
    ? null
    : controllersByProduct.get(composition.parentControllerProductHandle) ?? null;
  const compiledTemplateCount = composition.resolvedComponents.filter((component) =>
    component.compiledTemplateProductHandle != null
  ).length;
  const activationHandoffs = [
    ...composition.resolvedComponents.map((component) =>
      activationHandoffRow(component, handles)
    ),
    ...(
      composition.objectViewModelActivationHandoff == null
        ? []
        : [objectViewModelActivationHandoffRow(composition.objectViewModelActivationHandoff, handles)]
    ),
  ];
  const candidateAnalyses = candidateResourceAnalyses(composition, resourcesByDefinition);
  const candidateResourceControllers = candidateAnalyses.flatMap((resource) =>
    resource.runtimeAnalysis.runtimeRendering.controllers
  );
  const composedChildControllers = composition.resolvedComponents.flatMap((component) =>
    component.composedController?.productHandle == null
      ? []
      : [controllersByProduct.get(component.composedController.productHandle)].filter(
        (controller): controller is RuntimeControllerFrame => controller != null,
      )
  );
  return {
    renderingDefinitionName,
    renderingContextKind: composition.parentControllerProductHandle === rootControllerProductHandle
      ? 'definition-resource'
      : 'recursive-resource-instance',
    hostControllerName: hostController?.name ?? null,
    parentControllerName: parentController?.name ?? null,
    scopeBehavior: context?.scopeBehavior ?? null,
    flushMode: context?.flushMode ?? null,
    tag: context?.tag ?? null,
    hasTemplateInput: context?.templateBinding != null || context?.staticTemplate != null,
    hasComponentInput: context?.componentBinding != null || context?.staticComponent != null,
    staticComponentName: context?.staticComponent ?? null,
    templateInputFulfillmentKind: context?.templateInputFulfillmentKind ?? 'absent',
    componentInputFulfillmentKind: context?.componentInputFulfillmentKind ?? 'absent',
    modelInputFulfillmentKind: context?.modelInputFulfillmentKind ?? 'absent',
    hasTemplateBinding: context?.templateBinding != null,
    hasCompositionBinding: context?.compositionBinding != null,
    hasComposingBinding: context?.composingBinding != null,
    componentResolutionKind: composition.componentResolutionKind,
    modelResolutionKind: composition.modelResolutionKind,
    resolvedComponentCount: composition.resolvedComponents.length,
    resolvedComponentNames: composition.resolvedComponents.map((component) => component.name),
    resolvedComponentClassNames: composition.resolvedComponents.flatMap((component) =>
      component.className == null ? [] : [component.className]
    ),
    compiledTemplateCount,
    candidateResourceAnalysisState: candidateResourceAnalysisState(
      composition.resolvedComponents.length,
      candidateAnalyses.length,
    ),
    candidateResourceAnalysisCount: candidateAnalyses.length,
    candidateResourceAnalyzedComponentNames: candidateAnalyses.map((resource) =>
      resource.compilation.definition.name
    ),
    candidateResourceControllerCount: candidateResourceControllers.length,
    candidateResourceControllerCreationKinds: uniqueStrings(candidateResourceControllers.map((controller) =>
      controller.creationKind
    ), 'sorted'),
    composedChildControllerCount: composedChildControllers.length,
    composedChildControllerNames: composedChildControllers.flatMap((controller) =>
      controller.name == null ? [] : [controller.name]
    ),
    composedChildControllerCreationKinds: uniqueStrings(composedChildControllers.map((controller) =>
      controller.creationKind
    ), 'sorted'),
    activationHandoffs,
    activationHandoffKinds: activationHandoffs.map((handoff) => handoff.handoffKind),
    activationParameterTypes: activationHandoffs.flatMap((handoff) =>
      handoff.activationParameterType == null ? [] : [handoff.activationParameterType]
    ),
    modelAssignableToActivationParameterCount: activationHandoffs.filter((handoff) =>
      handoff.modelAssignableToParameter === true
    ).length,
    modelUnassignableToActivationParameterCount: activationHandoffs.filter((handoff) =>
      handoff.modelAssignableToParameter === false
    ).length,
    activationOpenReasonCount: activationHandoffs.filter((handoff) => handoff.openReason != null).length,
    openReason: composition.openReason,
    reasonKinds: composition.openReasonKinds,
    source: describeAddress(store, composition.sourceAddressHandle),
    ...(handles
      ? {
        handles: {
          compositionControllerProductHandle: composition.productHandle,
          compositionContextProductHandle: composition.context.productHandle,
          hostControllerProductHandle: composition.hostControllerProductHandle,
          parentControllerProductHandle: composition.parentControllerProductHandle,
          instructionProductHandle: context?.instructionProductHandle ?? null,
          templateBindingProductHandle: context?.templateBinding?.productHandle ?? null,
          componentBindingProductHandle: context?.componentBinding?.productHandle ?? null,
          modelBindingProductHandle: context?.modelBinding?.productHandle ?? null,
          scopeBehaviorBindingProductHandle: context?.scopeBehaviorBinding?.productHandle ?? null,
          tagBindingProductHandle: context?.tagBinding?.productHandle ?? null,
          flushModeBindingProductHandle: context?.flushModeBinding?.productHandle ?? null,
          composingBindingProductHandle: context?.composingBinding?.productHandle ?? null,
          compositionBindingProductHandle: context?.compositionBinding?.productHandle ?? null,
          sourceAddressHandle: composition.sourceAddressHandle,
        },
      }
      : {}),
  };
}

function runtimeResourcesByDefinition(
  resources: readonly RuntimeTemplateResourceEmission[],
): ReadonlyMap<ProductHandle, RuntimeTemplateResourceEmission> {
  const result = new Map<ProductHandle, RuntimeTemplateResourceEmission>();
  for (const resource of resources) {
    const definitionHandle = resource.compilation.definition.productHandle;
    if (definitionHandle != null) {
      result.set(definitionHandle, resource);
    }
  }
  return result;
}

function candidateResourceAnalyses(
  composition: CompositionController,
  resourcesByDefinition: ReadonlyMap<ProductHandle, RuntimeTemplateResourceEmission>,
): readonly RuntimeTemplateResourceEmission[] {
  const seen = new Set<ProductHandle>();
  const resources: RuntimeTemplateResourceEmission[] = [];
  for (const candidate of composition.resolvedComponents) {
    if (seen.has(candidate.definitionProductHandle)) {
      continue;
    }
    seen.add(candidate.definitionProductHandle);
    const resource = resourcesByDefinition.get(candidate.definitionProductHandle) ?? null;
    if (resource != null) {
      resources.push(resource);
    }
  }
  return resources;
}

function candidateResourceAnalysisState(
  resolvedCount: number,
  analyzedCount: number,
): SemanticRuntimeCompositionRow['candidateResourceAnalysisState'] {
  if (resolvedCount === 0 || analyzedCount === 0) {
    return 'none';
  }
  return analyzedCount >= resolvedCount
    ? 'complete'
    : 'partial';
}

function activationHandoffRow(
  component: CompositionResolvedComponent,
  handles: boolean,
): SemanticRuntimeCompositionActivationHandoffRow {
  const handoff = component.activationModelHandoff;
  return {
    componentName: component.name,
    componentClassName: component.className,
    methodKind: handoff.methodKind,
    handoffKind: handoff.handoffKind,
    activationParameterType: handoff.activationParameterType?.display ?? null,
    modelType: handoff.modelType?.display ?? null,
    modelAssignableToParameter: handoff.modelAssignableToParameter,
    openReason: handoff.openReason,
    ...(handles
      ? {
        handles: {
          componentDefinitionProductHandle: component.definitionProductHandle,
          activationParameterTypeProductHandle: handoff.activationParameterType?.productHandle ?? null,
          modelTypeProductHandle: handoff.modelType?.productHandle ?? null,
        },
      }
      : {}),
  };
}

function objectViewModelActivationHandoffRow(
  handoff: CompositionResolvedComponent['activationModelHandoff'],
  handles: boolean,
): SemanticRuntimeCompositionActivationHandoffRow {
  return {
    componentName: 'object-view-model',
    componentClassName: null,
    methodKind: handoff.methodKind,
    handoffKind: handoff.handoffKind,
    activationParameterType: handoff.activationParameterType?.display ?? null,
    modelType: handoff.modelType?.display ?? null,
    modelAssignableToParameter: handoff.modelAssignableToParameter,
    openReason: handoff.openReason,
    ...(handles
      ? {
        handles: {
          componentDefinitionProductHandle: null,
          activationParameterTypeProductHandle: handoff.activationParameterType?.productHandle ?? null,
          modelTypeProductHandle: handoff.modelType?.productHandle ?? null,
        },
      }
      : {}),
  };
}
