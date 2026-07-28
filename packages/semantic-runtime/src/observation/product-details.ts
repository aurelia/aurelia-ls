import { bindingScopeReferenceKernelReferences } from '../configuration/structural-references.js';
import {
  kernelHotDetailReference,
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReferenceClosure,
} from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import { RuntimeExpressionDetailDescriptors } from '../runtime-expression/detail-descriptors.js';
import type { TemplateVisibleResourceReference } from '../template/compiler-world-reference.js';
import { TemplateDetailDescriptors } from '../template/detail-descriptors.js';
import {
  runtimeBindingReferenceReferences,
  runtimeBindingSourceOperationReferenceReferences,
  runtimeBindingTargetAccessReferenceReferences,
  runtimeBindingTargetOperationReferenceReferences,
  runtimeValueConverterApplicationReferenceReferences,
  runtimeWatcherReferenceReferences,
} from '../template/structural-references.js';
import { checkerTypeReferenceKernelReferences } from '../type-system/structural-references.js';
import { TypeSystemHotDetailDescriptors } from '../type-system/detail-descriptors.js';
import type {
  RuntimeBindingDataFlowValueConverterWritebackStage,
  RuntimeBindingObservedDependency,
} from './runtime-binding-observation.js';
import type { ComputedObserverObservedDependency, ComputedObserverSource } from './computed-observer-source.js';
import type { RuntimeEffect, RuntimeEffectObservedDependency } from './runtime-effect.js';
import { ObservationDetailDescriptors } from './detail-descriptors.js';
import {
  computedObserverSourceReferenceReferences,
  runtimeBindingValueChannelReferenceReferences,
  runtimeEffectReferenceReferences,
} from './structural-references.js';

function runtimeExpressionAccessUseRecords(
  productHandle: RuntimeBindingObservedDependency['accessUseProductHandle'],
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(productHandle),
    [kernelProductDetailReference(
      RuntimeExpressionDetailDescriptors.AccessUse,
      productHandle,
    )],
  );
}

function visibleResourceReferenceRecords(
  reference: TemplateVisibleResourceReference | null,
): KernelDetailReferenceClosure {
  return reference == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        kernelRecordReferences(
          reference.resourceProductHandle,
          reference.resourceIdentityHandle,
          reference.definitionProductHandle,
          reference.sourceAddressHandle,
        ),
      );
}

function valueConverterWritebackStageRecords(
  stage: RuntimeBindingDataFlowValueConverterWritebackStage,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    runtimeValueConverterApplicationReferenceReferences(stage.application),
    visibleResourceReferenceRecords(stage.application.resource),
    checkerTypeReferenceKernelReferences(stage.inputType),
    checkerTypeReferenceKernelReferences(stage.outputType),
    kernelRecordReferences(stage.sourceAddressHandle),
  );
}

function computedObserverDependencyRecords(
  dependency: ComputedObserverObservedDependency,
  includeObserverBackReference: boolean,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    includeObserverBackReference
      ? computedObserverSourceReferenceReferences(dependency.computedObserver)
      : kernelRecordReferences(),
    runtimeExpressionAccessUseRecords(dependency.accessUseProductHandle),
  );
}

function runtimeEffectDependencyRecords(
  dependency: RuntimeEffectObservedDependency,
  includeEffectBackReference: boolean,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    includeEffectBackReference
      ? runtimeEffectReferenceReferences(dependency.effect)
      : kernelRecordReferences(),
    runtimeExpressionAccessUseRecords(dependency.accessUseProductHandle),
    kernelRecordReferences(dependency.observedMemberSourceAddressHandle),
  );
}

function runtimeBindingObservedDependencyReferences(
  dependency: RuntimeBindingObservedDependency,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    runtimeBindingReferenceReferences(dependency.binding),
    runtimeExpressionAccessUseRecords(dependency.accessUseProductHandle),
    kernelRecordReferences(
      dependency.dataFlowProductHandle,
      dependency.expressionProductHandle,
      dependency.observedMemberSourceAddressHandle,
    ),
    [kernelProductDetailReference(
      ObservationDetailDescriptors.RuntimeBindingDataFlow,
      dependency.dataFlowProductHandle,
    )],
    [kernelProductDetailReference(
      TemplateDetailDescriptors.ExpressionParse,
      dependency.expressionProductHandle,
    )],
    bindingScopeReferenceKernelReferences(dependency.bindingScope),
  );
}

function computedObserverSourceReferences(
  observer: ComputedObserverSource,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    ...observer.accessUses.map((accessUse) => mergeKernelDetailReferences(
      kernelRecordReferences(
        accessUse.productHandle,
        accessUse.identityHandle,
        accessUse.sourceAddressHandle,
        accessUse.nameSourceAddressHandle,
      ),
      [kernelProductDetailReference(
        RuntimeExpressionDetailDescriptors.AccessUse,
        accessUse.productHandle,
      )],
    )),
    ...observer.observedDependencies.map((dependency) => mergeKernelDetailReferences(
      kernelRecordReferences(
        dependency.productHandle,
        dependency.identityHandle,
        dependency.sourceAddressHandle,
      ),
      [kernelProductDetailReference(
        ObservationDetailDescriptors.ComputedObserverObservedDependency,
        dependency.productHandle,
      )],
      computedObserverDependencyRecords(dependency, false),
    )),
  );
}

function runtimeEffectReferences(
  effect: RuntimeEffect,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    ...effect.accessUses.map((accessUse) => mergeKernelDetailReferences(
      kernelRecordReferences(
        accessUse.productHandle,
        accessUse.identityHandle,
        accessUse.sourceAddressHandle,
        accessUse.nameSourceAddressHandle,
      ),
      [kernelProductDetailReference(
        RuntimeExpressionDetailDescriptors.AccessUse,
        accessUse.productHandle,
      )],
    )),
    ...effect.observedDependencies.map((dependency) => mergeKernelDetailReferences(
      kernelRecordReferences(
        dependency.productHandle,
        dependency.identityHandle,
        dependency.sourceAddressHandle,
      ),
      [kernelProductDetailReference(
        ObservationDetailDescriptors.RuntimeEffectObservedDependency,
        dependency.productHandle,
      )],
      runtimeEffectDependencyRecords(dependency, false),
    )),
  );
}

/**
 * Typed detail slots for observer, value-channel, and binding data-flow products.
 *
 * Observation materializers own these slots even when the framework-shaped binding classes remain in the template
 * runtime model. This keeps target observation/data-flow products discoverable without forcing callers through the
 * broader template product-detail surface.
 */
export const ObservationProductDetails = {
  Issue: defineProductDetailSlot(
    ObservationDetailDescriptors.Issue,
    (issue) => mergeKernelDetailReferences(
      kernelRecordReferences(...issue.relatedSources.map((source) => source.addressHandle)),
    ),
  ),
  RuntimeBindingValueChannel: defineProductDetailSlot(
    ObservationDetailDescriptors.RuntimeBindingValueChannel,
    (channel) => mergeKernelDetailReferences(
      runtimeBindingReferenceReferences(channel.binding),
      runtimeBindingTargetAccessReferenceReferences(channel.targetAccess),
      runtimeBindingTargetOperationReferenceReferences(channel.targetOperation),
      runtimeBindingSourceOperationReferenceReferences(channel.sourceOperation),
      checkerTypeReferenceKernelReferences(channel.rawTargetPropertyType),
      checkerTypeReferenceKernelReferences(channel.runtimeValueType),
      checkerTypeReferenceKernelReferences(channel.admittedSourceOwnerType),
      checkerTypeReferenceKernelReferences(channel.admittedSourceValueType),
      [kernelHotDetailReference(
        TypeSystemHotDetailDescriptors.TypeMember,
        channel.admittedSourceMemberHandle,
      )],
      kernelRecordReferences(channel.admittedSourceMemberSourceAddressHandle),
    ),
  ),
  RuntimeBindingDataFlow: defineProductDetailSlot(
    ObservationDetailDescriptors.RuntimeBindingDataFlow,
    (dataFlow) => mergeKernelDetailReferences(
      runtimeBindingReferenceReferences(dataFlow.binding),
      ...dataFlow.accessUseProductHandles.map(runtimeExpressionAccessUseRecords),
      runtimeBindingTargetAccessReferenceReferences(dataFlow.targetAccess),
      runtimeBindingTargetOperationReferenceReferences(dataFlow.targetOperation),
      runtimeBindingSourceOperationReferenceReferences(dataFlow.sourceOperation),
      runtimeBindingValueChannelReferenceReferences(dataFlow.valueChannel),
      kernelRecordReferences(
        dataFlow.expressionProductHandle,
        dataFlow.sourceAssignmentTargetSourceAddressHandle,
      ),
      [kernelProductDetailReference(
        TemplateDetailDescriptors.ExpressionParse,
        dataFlow.expressionProductHandle,
      )],
      bindingScopeReferenceKernelReferences(dataFlow.bindingScope),
      checkerTypeReferenceKernelReferences(dataFlow.sourceType),
      checkerTypeReferenceKernelReferences(dataFlow.sourceAssignmentTargetType),
      checkerTypeReferenceKernelReferences(dataFlow.targetPropertyType),
      checkerTypeReferenceKernelReferences(dataFlow.targetValueType),
      checkerTypeReferenceKernelReferences(dataFlow.targetToSourceValueType),
      ...dataFlow.valueConverterWritebackStages.map(valueConverterWritebackStageRecords),
    ),
  ),
  RuntimeBindingObservedDependency: defineProductDetailSlot(
    ObservationDetailDescriptors.RuntimeBindingObservedDependency,
    runtimeBindingObservedDependencyReferences,
  ),
  RuntimeWatcherObservedDependency: defineProductDetailSlot(
    ObservationDetailDescriptors.RuntimeWatcherObservedDependency,
    (dependency) => mergeKernelDetailReferences(
      runtimeWatcherReferenceReferences(dependency.watcher),
      runtimeExpressionAccessUseRecords(dependency.accessUseProductHandle),
      kernelRecordReferences(
        dependency.expressionProductHandle,
        dependency.observedMemberSourceAddressHandle,
      ),
      [kernelProductDetailReference(
        TemplateDetailDescriptors.ExpressionParse,
        dependency.expressionProductHandle,
      )],
    ),
  ),
  ComputedObserverSource: defineProductDetailSlot(
    ObservationDetailDescriptors.ComputedObserverSource,
    computedObserverSourceReferences,
  ),
  ComputedObserverObservedDependency: defineProductDetailSlot(
    ObservationDetailDescriptors.ComputedObserverObservedDependency,
    (dependency) => computedObserverDependencyRecords(dependency, true),
  ),
  ComputedObservationDefinition: defineProductDetailSlot(
    ObservationDetailDescriptors.ComputedObservationDefinition,
    () => mergeKernelDetailReferences(),
  ),
  RuntimeEffect: defineProductDetailSlot(
    ObservationDetailDescriptors.RuntimeEffect,
    runtimeEffectReferences,
  ),
  RuntimeEffectObservedDependency: defineProductDetailSlot(
    ObservationDetailDescriptors.RuntimeEffectObservedDependency,
    (dependency) => runtimeEffectDependencyRecords(dependency, true),
  ),
  ProxyObservableEscape: defineProductDetailSlot(
    ObservationDetailDescriptors.ProxyObservableEscape,
    () => mergeKernelDetailReferences(),
  ),
} as const;
