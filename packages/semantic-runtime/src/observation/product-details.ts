import { bindingScopeReferenceKernelReferences } from '../configuration/structural-references.js';
import {
  kernelFieldProvenanceReferences,
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReferenceClosure,
} from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
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
    kernelFieldProvenanceReferences(dependency.fieldProvenance),
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
    kernelRecordReferences(dependency.observedMemberSourceAddressHandle),
    kernelFieldProvenanceReferences(dependency.fieldProvenance),
  );
}

function runtimeBindingObservedDependencyReferences(
  dependency: RuntimeBindingObservedDependency,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    runtimeBindingReferenceReferences(dependency.binding),
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
    kernelFieldProvenanceReferences(dependency.fieldProvenance),
  );
}

function computedObserverSourceReferences(
  observer: ComputedObserverSource,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
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
    kernelFieldProvenanceReferences(observer.fieldProvenance),
  );
}

function runtimeEffectReferences(
  effect: RuntimeEffect,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
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
    kernelFieldProvenanceReferences(effect.fieldProvenance),
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
      kernelFieldProvenanceReferences(issue.fieldProvenance),
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
      kernelFieldProvenanceReferences(channel.fieldProvenance),
    ),
  ),
  RuntimeBindingDataFlow: defineProductDetailSlot(
    ObservationDetailDescriptors.RuntimeBindingDataFlow,
    (dataFlow) => mergeKernelDetailReferences(
      runtimeBindingReferenceReferences(dataFlow.binding),
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
      kernelFieldProvenanceReferences(dataFlow.fieldProvenance),
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
      kernelRecordReferences(
        dependency.expressionProductHandle,
        dependency.observedMemberSourceAddressHandle,
      ),
      [kernelProductDetailReference(
        TemplateDetailDescriptors.ExpressionParse,
        dependency.expressionProductHandle,
      )],
      kernelFieldProvenanceReferences(dependency.fieldProvenance),
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
    (definition) => mergeKernelDetailReferences(
      kernelFieldProvenanceReferences(definition.fieldProvenance),
    ),
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
    (escape) => mergeKernelDetailReferences(kernelFieldProvenanceReferences(escape.fieldProvenance)),
  ),
} as const;
