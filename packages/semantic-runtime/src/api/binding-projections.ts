import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import { TemplateProductDetails } from '../template/product-details.js';
import {
  RuntimeObservedDependencyKind,
  type RuntimeBindingDataFlow,
  type RuntimeBindingObservedDependency,
} from '../observation/runtime-binding-observation.js';
import {
  runtimeBindingPrimitiveValueApiDisplay,
  runtimeBindingPrimitiveValueDomainKinds,
} from '../observation/runtime-binding-primitive-value.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
import {
  describeAddress,
} from './source-reference.js';
import type {
  SemanticBindingDataFlowRow,
  SemanticBindingBehaviorApplicationRow,
  SemanticBindingObservedDependencyRow,
  SemanticBindingSourceOperationRow,
  SemanticBindingTargetAccessRow,
  SemanticBindingValueChannelRow,
  SemanticObservedMemberSourceState,
  SemanticTargetOperationRow,
} from './contracts.js';
import {
  resourceLocalBindingBehaviorApplications,
  resourceLocalBindingDataFlows,
  resourceLocalBindingObservedDependencies,
  resourceLocalBindingSourceOperations,
  resourceLocalBindingTargetAccesses,
  resourceLocalBindingTargetOperations,
  resourceLocalBindingValueChannels,
} from './runtime-resource-ownership.js';

export function readBindingTargetAccessRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticBindingTargetAccessRow[] {
  return bindingProjectionResources(emission)
    .flatMap((resource): readonly SemanticBindingTargetAccessRow[] =>
      resourceLocalBindingTargetAccesses(store, resource).map((access) => ({
        definitionName: resource.compilation.definition.name,
        bindingKind: access.binding.bindingKind,
        lookup: access.lookup,
        targetKind: access.targetKind,
        targetProperty: access.targetProperty,
        strategy: access.strategy,
        eventNames: access.eventNames,
        targetType: access.targetType?.display ?? null,
        targetTypeSource: access.targetTypeSource,
        propertyType: access.propertyType?.display ?? null,
        propertyExists: access.propertyExists,
        isWritable: access.isWritable,
        isObservable: access.isObservable,
        authority: access.authority,
        openReason: access.openReason,
        frameworkErrorCode: access.frameworkErrorCode,
        diagnosticReason: access.diagnosticReason,
        source: describeAddress(store, access.sourceAddressHandle),
        ...(handles ? {
          handles: {
            bindingProductHandle: access.binding.productHandle,
            targetAccessProductHandle: access.productHandle,
            targetTypeProductHandle: access.targetType?.productHandle ?? null,
            propertyTypeProductHandle: access.propertyType?.productHandle ?? null,
            sourceAddressHandle: access.sourceAddressHandle,
          },
        } : {}),
      }))
    )
    .sort((left, right) =>
      `${left.definitionName}:${left.targetProperty}:${left.lookup}:${left.strategy}`
        .localeCompare(`${right.definitionName}:${right.targetProperty}:${right.lookup}:${right.strategy}`)
    );
}

export function readTargetOperationRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticTargetOperationRow[] {
  return bindingProjectionResources(emission)
    .flatMap((resource): readonly SemanticTargetOperationRow[] =>
      resourceLocalBindingTargetOperations(store, resource).map((operation) => ({
        definitionName: resource.compilation.definition.name,
        ownerKind: operation.ownerKind,
        bindingKind: operation.binding?.bindingKind ?? null,
        rendererKind: operation.renderer?.rendererKind ?? null,
        targetKind: operation.targetKind,
        targetAttribute: operation.targetAttribute,
        targetProperty: operation.targetProperty,
        staticValue: operation.value,
        operationKind: operation.operationKind,
        affectedNames: operation.affectedNames,
        authority: operation.authority,
        openReason: operation.openReason,
        source: describeAddress(store, operation.sourceAddressHandle),
        ...(handles ? {
          handles: {
            bindingProductHandle: operation.binding?.productHandle ?? null,
            rendererProductHandle: operation.renderer?.productHandle ?? null,
            instructionProductHandle: operation.instructionProductHandle,
            targetOperationProductHandle: operation.productHandle,
            sourceAddressHandle: operation.sourceAddressHandle,
          },
        } : {}),
      }))
    )
    .sort((left, right) =>
      `${left.definitionName}:${left.ownerKind}:${left.targetAttribute}:${left.targetProperty}:${left.operationKind}`
        .localeCompare(`${right.definitionName}:${right.ownerKind}:${right.targetAttribute}:${right.targetProperty}:${right.operationKind}`)
    );
}

export function readBindingSourceOperationRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticBindingSourceOperationRow[] {
  return bindingProjectionResources(emission)
    .flatMap((resource): readonly SemanticBindingSourceOperationRow[] =>
      resourceLocalBindingSourceOperations(store, resource).map((operation) => ({
        definitionName: resource.compilation.definition.name,
        bindingKind: operation.binding.bindingKind,
        targetKind: operation.targetKind,
        targetName: operation.targetName,
        targetType: operation.targetType?.display ?? null,
        operationKind: operation.operationKind,
        authority: operation.authority,
        openReason: operation.openReason,
        source: describeAddress(store, operation.sourceAddressHandle),
        ...(handles ? {
          handles: {
            bindingProductHandle: operation.binding.productHandle,
            instructionProductHandle: operation.instructionProductHandle,
            sourceOperationProductHandle: operation.productHandle,
            targetTypeProductHandle: operation.targetType?.productHandle ?? null,
            sourceAddressHandle: operation.sourceAddressHandle,
          },
        } : {}),
      }))
    )
    .sort((left, right) =>
      `${left.definitionName}:${left.targetName}:${left.operationKind}:${left.targetKind}`
        .localeCompare(`${right.definitionName}:${right.targetName}:${right.operationKind}:${right.targetKind}`)
    );
}

export function readBindingBehaviorApplicationRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticBindingBehaviorApplicationRow[] {
  return bindingProjectionResources(emission)
    .flatMap((resource): readonly SemanticBindingBehaviorApplicationRow[] =>
      resourceLocalBindingBehaviorApplications(store, resource).map((application) => ({
        definitionName: resource.compilation.definition.name,
        bindingKind: application.binding.bindingKind,
        behaviorName: application.behaviorName,
        phase: application.phase,
        argumentCount: application.argumentCount,
        staticArgumentValues: application.staticArgumentValues,
        targetKind: application.targetAccess?.targetKind ?? null,
        targetProperty: application.targetAccess?.targetProperty ?? null,
        source: describeAddress(store, application.sourceAddressHandle),
        ...(handles ? {
          handles: {
            bindingProductHandle: application.binding.productHandle,
            bindingBehaviorApplicationProductHandle: application.productHandle,
            targetAccessProductHandle: application.targetAccess?.productHandle ?? null,
            sourceAddressHandle: application.sourceAddressHandle,
          },
        } : {}),
      }))
    )
    .sort((left, right) =>
      `${left.definitionName}:${left.behaviorName}:${left.targetProperty ?? ''}:${left.bindingKind}`
        .localeCompare(`${right.definitionName}:${right.behaviorName}:${right.targetProperty ?? ''}:${right.bindingKind}`)
    );
}

export function readBindingValueChannelRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticBindingValueChannelRow[] {
  return bindingProjectionResources(emission)
    .flatMap((resource): readonly SemanticBindingValueChannelRow[] =>
      resourceLocalBindingValueChannels(store, resource).map((valueChannel) => ({
        definitionName: resource.compilation.definition.name,
        bindingKind: valueChannel.binding.bindingKind,
        targetKind: valueChannel.targetAccess?.targetKind
          ?? valueChannel.targetOperation?.targetKind
          ?? valueChannel.sourceOperation?.targetKind
          ?? null,
        targetProperty: valueChannel.targetAccess?.targetProperty
          ?? valueChannel.targetOperation?.targetProperty
          ?? valueChannel.sourceOperation?.targetName
          ?? null,
        targetOperationKind: valueChannel.targetOperation?.operationKind ?? null,
        sourceOperationKind: valueChannel.sourceOperation?.operationKind ?? null,
        channelKind: valueChannel.channelKind,
        authority: valueChannel.authority,
        rawTargetPropertyType: valueChannel.rawTargetPropertyType?.display ?? null,
        runtimeValueType: valueChannel.runtimeValueType?.display ?? null,
        valueDomain: valueChannel.valueDomain,
        primitiveValueDomain: valueChannel.primitiveValueDomain,
        primitiveValueDomainKinds: runtimeBindingPrimitiveValueDomainKinds(valueChannel.primitiveValueDomain),
        primitiveValueDomainDisplays: valueChannel.primitiveValueDomain.map(runtimeBindingPrimitiveValueApiDisplay),
        isCollection: valueChannel.isCollection,
        usesCustomMatcher: valueChannel.usesCustomMatcher,
        openReason: valueChannel.openReason,
        openReasonKinds: valueChannel.openReasonKinds,
        source: describeAddress(store, valueChannel.sourceAddressHandle),
        ...(handles ? {
          handles: {
            bindingProductHandle: valueChannel.binding.productHandle,
            valueChannelProductHandle: valueChannel.productHandle,
            targetAccessProductHandle: valueChannel.targetAccess?.productHandle ?? null,
            targetOperationProductHandle: valueChannel.targetOperation?.productHandle ?? null,
            sourceOperationProductHandle: valueChannel.sourceOperation?.productHandle ?? null,
            rawTargetPropertyTypeProductHandle: valueChannel.rawTargetPropertyType?.productHandle ?? null,
            runtimeValueTypeProductHandle: valueChannel.runtimeValueType?.productHandle ?? null,
            sourceAddressHandle: valueChannel.sourceAddressHandle,
          },
        } : {}),
      }))
    )
    .sort((left, right) =>
      `${left.definitionName}:${left.targetProperty ?? ''}:${left.channelKind}:${left.runtimeValueType ?? ''}`
        .localeCompare(`${right.definitionName}:${right.targetProperty ?? ''}:${right.channelKind}:${right.runtimeValueType ?? ''}`)
    );
}

export function readBindingDataFlowRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticBindingDataFlowRow[] {
  return bindingProjectionResources(emission)
    .flatMap((resource): readonly SemanticBindingDataFlowRow[] =>
      resourceLocalBindingDataFlows(store, resource).map((dataFlow) =>
        bindingDataFlowRow(resource.compilation.definition.name, dataFlow, store, handles)
      )
    )
    .sort((left, right) =>
      `${left.definitionName}:${left.sourceName ?? ''}:${left.direction}:${left.targetProperty ?? ''}`
        .localeCompare(`${right.definitionName}:${right.sourceName ?? ''}:${right.direction}:${right.targetProperty ?? ''}`)
    );
}

export function readBindingObservedDependencyRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticBindingObservedDependencyRow[] {
  return bindingProjectionResources(emission)
    .flatMap((resource): readonly SemanticBindingObservedDependencyRow[] =>
      resourceLocalBindingObservedDependencies(store, resource).map((dependency) =>
        bindingObservedDependencyRow(resource.compilation.definition.name, dependency, store, handles)
      )
    )
    .sort((left, right) =>
      `${left.definitionName}:${left.sourceName ?? ''}:${left.dependencyKind}:${left.memberName ?? ''}`
        .localeCompare(`${right.definitionName}:${right.sourceName ?? ''}:${right.dependencyKind}:${right.memberName ?? ''}`)
    );
}

function bindingProjectionResources(
  emission: AureliaAppWorldProjectEmission,
) {
  return [
    ...emission.templates.resources,
    ...emission.templates.authoringResources,
  ];
}

function bindingDataFlowRow(
  definitionName: string,
  dataFlow: RuntimeBindingDataFlow,
  store: KernelStore,
  handles: boolean,
): SemanticBindingDataFlowRow {
  const parse = expressionParseForDataFlow(store, dataFlow);
  return {
    definitionName,
    bindingKind: dataFlow.binding.bindingKind,
    direction: dataFlow.direction,
    strictBinding: dataFlow.strictBinding,
    expressionParseState: parse?.state ?? null,
    expressionParseResultKind: parse?.resultKind ?? null,
    valueSiteKind: parse?.site.siteKind ?? null,
    sourceKind: dataFlow.sourceKind,
    sourceName: dataFlow.sourceName,
    sourceRootName: dataFlow.sourceRootName,
    sourceType: dataFlow.sourceType?.display ?? null,
    sourceTypeOpenReason: dataFlow.sourceTypeOpenReason,
    sourceTypeOpenKind: dataFlow.sourceTypeOpenKind,
    sourceAssignmentTargetType: dataFlow.sourceAssignmentTargetType?.display ?? null,
    sourceAssignmentTargetSource: describeAddress(store, dataFlow.sourceAssignmentTargetSourceAddressHandle),
    targetKind: dataFlow.targetAccess?.targetKind
      ?? dataFlow.targetOperation?.targetKind
      ?? dataFlow.sourceOperation?.targetKind
      ?? null,
    targetProperty: dataFlow.targetAccess?.targetProperty
      ?? dataFlow.targetOperation?.targetProperty
      ?? dataFlow.sourceOperation?.targetName
      ?? null,
    targetOperationKind: dataFlow.targetOperation?.operationKind ?? null,
    sourceOperationKind: dataFlow.sourceOperation?.operationKind ?? null,
    targetPropertyType: dataFlow.targetPropertyType?.display ?? null,
    targetValueType: dataFlow.targetValueType?.display ?? null,
    valueChannelKind: dataFlow.valueChannel?.channelKind ?? null,
    sourceWritable: dataFlow.sourceWritable,
    sourceAssignmentKind: dataFlow.sourceAssignmentKind,
    sourceAssignmentReason: dataFlow.sourceAssignmentReason,
    sourceAssignmentReasonKinds: dataFlow.sourceAssignmentReasonKinds,
    sourceToTargetAssignable: dataFlow.sourceToTargetAssignable,
    targetToSourceAssignable: dataFlow.targetToSourceAssignable,
    frameworkErrorCode: dataFlow.frameworkErrorCode,
    openReason: dataFlow.openReason,
    source: describeAddress(store, dataFlow.sourceAddressHandle),
    ...(handles ? {
      handles: {
        bindingProductHandle: dataFlow.binding.productHandle,
        dataFlowProductHandle: dataFlow.productHandle,
        targetAccessProductHandle: dataFlow.targetAccess?.productHandle ?? null,
        targetOperationProductHandle: dataFlow.targetOperation?.productHandle ?? null,
        sourceOperationProductHandle: dataFlow.sourceOperation?.productHandle ?? null,
        valueChannelProductHandle: dataFlow.valueChannel?.productHandle ?? null,
        expressionProductHandle: dataFlow.expressionProductHandle,
        bindingScopeProductHandle: dataFlow.bindingScope?.productHandle ?? null,
        sourceTypeProductHandle: dataFlow.sourceType?.productHandle ?? null,
        sourceAssignmentTargetTypeProductHandle: dataFlow.sourceAssignmentTargetType?.productHandle ?? null,
        sourceAssignmentTargetSourceAddressHandle: dataFlow.sourceAssignmentTargetSourceAddressHandle,
        targetPropertyTypeProductHandle: dataFlow.targetPropertyType?.productHandle ?? null,
        targetValueTypeProductHandle: dataFlow.targetValueType?.productHandle ?? null,
        sourceAddressHandle: dataFlow.sourceAddressHandle,
      },
    } : {}),
  };
}

function bindingObservedDependencyRow(
  definitionName: string,
  dependency: RuntimeBindingObservedDependency,
  store: KernelStore,
  handles: boolean,
): SemanticBindingObservedDependencyRow {
  return {
    definitionName,
    bindingKind: dependency.binding.bindingKind,
    dependencyKind: dependency.dependencyKind,
    expressionKind: dependency.expressionKind,
    sourceName: dependency.sourceName,
    sourceRootName: dependency.sourceRootName,
    memberName: dependency.memberName,
    keyExpression: dependency.keyExpression,
    methodName: dependency.methodName,
    observedMemberKind: dependency.observedMemberKind,
    observedMemberSource: describeAddress(store, dependency.observedMemberSourceAddressHandle),
    observedMemberSourceState: observedMemberSourceState(dependency),
    spanStart: dependency.spanStart,
    spanEnd: dependency.spanEnd,
    source: describeAddress(store, dependency.sourceAddressHandle),
    ...(handles ? {
      handles: {
        bindingProductHandle: dependency.binding.productHandle,
        dataFlowProductHandle: dependency.dataFlowProductHandle,
        observedDependencyProductHandle: dependency.productHandle,
        expressionProductHandle: dependency.expressionProductHandle,
        bindingScopeProductHandle: dependency.bindingScope?.productHandle ?? null,
        observedMemberSourceAddressHandle: dependency.observedMemberSourceAddressHandle,
        sourceAddressHandle: dependency.sourceAddressHandle,
      },
    } : {}),
  };
}

function observedMemberSourceState(
  dependency: RuntimeBindingObservedDependency,
): SemanticObservedMemberSourceState {
  if (dependency.observedMemberSourceAddressHandle != null) {
    return 'source';
  }
  if (isTemporaryObservedCollectionOwner(dependency)) {
    return 'temporary-value';
  }
  if (isRuntimeScopeName(dependency.sourceName) || isRuntimeScopeName(dependency.sourceRootName)) {
    return 'runtime-scope-name';
  }
  if (
    dependency.memberName == null
    && dependency.keyExpression == null
    && (dependency.expressionKind === 'AccessScope' || dependency.expressionKind === 'CallScope')
  ) {
    return 'scope-open';
  }
  return 'open';
}

function isTemporaryObservedCollectionOwner(
  dependency: RuntimeBindingObservedDependency,
): boolean {
  return (
    (
      dependency.dependencyKind === RuntimeObservedDependencyKind.TemplateCollectionRead
      || dependency.dependencyKind === RuntimeObservedDependencyKind.ProxyCollectionRead
      || dependency.dependencyKind === RuntimeObservedDependencyKind.DeepCollectionRead
    )
    && dependency.memberName == null
    && dependency.keyExpression == null
    && dependency.methodName != null
    && dependency.sourceName != null
    && dependency.sourceRootName != null
    && dependency.sourceName !== dependency.sourceRootName
  );
}

function isRuntimeScopeName(name: string | null): boolean {
  return name?.startsWith('$') === true;
}

function expressionParseForDataFlow(
  store: KernelStore,
  dataFlow: RuntimeBindingDataFlow,
): TemplateExpressionParse | null {
  return dataFlow.expressionProductHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.ExpressionParse, dataFlow.expressionProductHandle);
}
