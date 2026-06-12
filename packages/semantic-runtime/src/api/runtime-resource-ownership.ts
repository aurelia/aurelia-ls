import {
  sourceSpanContains,
} from '../kernel/address.js';
import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  sourceSpanAddressForAddress,
} from '../kernel/source-address.js';
import type { KernelStore } from '../kernel/store.js';
import type {
  RuntimeBinding,
  RuntimeBindingReference,
  RuntimeBindingSourceOperation,
  RuntimeBindingTargetAccess,
  RuntimeBindingTargetOperation,
} from '../template/runtime-binding.js';
import type { RuntimeBindingBehaviorApplication } from '../template/runtime-binding-behavior.js';
import {
  RuntimeControllerCreationKind,
  type RuntimeControllerFrame,
} from '../template/runtime-controller.js';
import type { TemplateResourceRuntimeAnalysisEmission } from '../template/template-compilation-project-pass.js';
import type {
  RuntimeBindingDataFlow,
  RuntimeBindingObservedDependency,
  RuntimeBindingValueChannel,
} from '../observation/runtime-binding-observation.js';

export function resourceLocalRuntimeBindings(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBinding[] {
  return resource.runtimeAnalysis.runtimeRendering.bindings.filter((binding) =>
    runtimeBindingReferenceBelongsToResource(store, resource, binding.toReference())
  );
}

export function resourceLocalBindingTargetAccesses(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingTargetAccess[] {
  return resource.runtimeAnalysis.controllerBind.targetAccesses.filter((access) =>
    runtimeBindingReferenceBelongsToResource(store, resource, access.binding)
  );
}

export function resourceLocalBindingSourceOperations(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingSourceOperation[] {
  return resource.runtimeAnalysis.controllerBind.sourceOperations.filter((operation) =>
    runtimeBindingReferenceBelongsToResource(store, resource, operation.binding)
  );
}

export function resourceLocalBindingBehaviorApplications(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingBehaviorApplication[] {
  return resource.runtimeAnalysis.bindingBehavior.applications.filter((application) =>
    runtimeBindingReferenceBelongsToResource(store, resource, application.binding)
  );
}

export function resourceLocalBindingTargetOperations(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingTargetOperation[] {
  return [
    ...resource.runtimeAnalysis.runtimeRendering.targetOperations,
    ...resource.runtimeAnalysis.controllerBind.targetOperations,
  ].filter((operation) =>
    operation.binding == null
      ? sourceAddressBelongsToResourceTemplate(store, resource, operation.sourceAddressHandle)
      : runtimeBindingReferenceBelongsToResource(store, resource, operation.binding)
  );
}

export function resourceLocalBindingValueChannels(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingValueChannel[] {
  return resource.runtimeAnalysis.bindingValueChannel.valueChannels.filter((valueChannel) =>
    runtimeBindingReferenceBelongsToResource(store, resource, valueChannel.binding)
  );
}

export function resourceLocalBindingDataFlows(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingDataFlow[] {
  return resource.runtimeAnalysis.bindingDataFlow.dataFlows.filter((dataFlow) =>
    runtimeBindingReferenceBelongsToResource(store, resource, dataFlow.binding)
  );
}

export function resourceLocalBindingObservedDependencies(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly RuntimeBindingObservedDependency[] {
  return resource.runtimeAnalysis.bindingDataFlow.observedDependencies.filter((dependency) =>
    runtimeBindingReferenceBelongsToResource(store, resource, dependency.binding)
  );
}

function runtimeBindingReferenceBelongsToResource(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  binding: RuntimeBindingReference,
): boolean {
  const sourceOwnership = sourceAddressResourceOwnership(store, resource, binding.addressHandle);
  if (sourceOwnership != null) {
    return sourceOwnership;
  }
  if (binding.productHandle == null) {
    return false;
  }
  const context = resource.runtimeAnalysis.runtimeRendering.readRenderContextForBinding(binding.productHandle);
  if (context == null) {
    return false;
  }
  return controllerTemplateOwnerDefinitionProductHandle(context.renderingController)
    === resource.compilation.definition.productHandle;
}

function controllerTemplateOwnerDefinitionProductHandle(
  controller: RuntimeControllerFrame,
): ProductHandle | null {
  let current: RuntimeControllerFrame | null = controller;
  while (current != null) {
    switch (current.creationKind) {
      case RuntimeControllerCreationKind.RootCustomElement:
      case RuntimeControllerCreationKind.RoutedCustomElement:
      case RuntimeControllerCreationKind.CustomElement:
        return current.definitionProductHandle;
      case RuntimeControllerCreationKind.CustomAttribute:
      case RuntimeControllerCreationKind.TemplateController:
      case RuntimeControllerCreationKind.SyntheticView:
        current = current.parent;
        break;
    }
  }
  return null;
}

function sourceAddressBelongsToResourceTemplate(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  addressHandle: AddressHandle | null,
): boolean {
  return sourceAddressResourceOwnership(store, resource, addressHandle) === true;
}

function sourceAddressResourceOwnership(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  addressHandle: AddressHandle | null,
): boolean | null {
  const resourceSpan = sourceSpanAddressForAddress(
    store,
    resource.compilation.unit.templateSource.sourceAddressHandle,
  );
  const sourceSpan = sourceSpanAddressForAddress(store, addressHandle);
  return resourceSpan == null || sourceSpan == null
    ? null
    : sourceSpanContains(resourceSpan, sourceSpan);
}
