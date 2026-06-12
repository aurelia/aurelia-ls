import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import { readTemplateExpressionParse } from '../template/expression-parse-product.js';
import {
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
  SemanticBindingDataFlowIssueKind,
  SemanticBindingDataFlowIssueSummaryRow,
  SemanticBindingDataFlowSummaryResult,
  SemanticBindingDataFlowSummaryRow,
  SemanticBindingBehaviorApplicationRow,
  SemanticBindingObservedDependencyMemberSourceStateSummaryRow,
  SemanticBindingObservedDependencyRow,
  SemanticBindingObservedDependencySummaryResult,
  SemanticBindingObservedDependencySummaryRow,
  SemanticBindingSourceOperationRow,
  SemanticBindingTargetAccessRow,
  SemanticBindingValueChannelCouplingSummaryRow,
  SemanticBindingValueChannelRow,
  SemanticBindingValueChannelSummaryResult,
  SemanticBindingValueChannelSummaryRow,
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

const BINDING_SUMMARY_NAME_LIMIT = 12;
const BINDING_SUMMARY_TYPE_LIMIT = 8;
const BINDING_SUMMARY_PROPERTY_LIMIT = 16;

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
        observerCouplings: valueChannel.observerCouplings,
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

export function readBindingValueChannelSummary(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): SemanticBindingValueChannelSummaryResult {
  const rows = readBindingValueChannelRows(emission, store, false);
  const summaryRows = summarizeBindingValueChannels(rows);
  const observerCouplings = summarizeBindingValueChannelCouplings(rows);
  const channelsWithoutObserverCouplings = rows.filter((row) => row.observerCouplings.length === 0).length;
  return {
    displayText: bindingValueChannelSummaryDisplayText(
      rows.length,
      summaryRows,
      observerCouplings,
      channelsWithoutObserverCouplings,
    ),
    totalRows: rows.length,
    summaryRows: summaryRows.length,
    observerCouplingRows: observerCouplings.length,
    channelsWithoutObserverCouplings,
    rows: summaryRows,
    observerCouplings,
  };
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

export function readBindingDataFlowSummary(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): SemanticBindingDataFlowSummaryResult {
  const rows = readBindingDataFlowRows(emission, store, false);
  const summaryRows = summarizeBindingDataFlows(rows);
  const issueRows = summarizeBindingDataFlowIssues(rows);
  return {
    displayText: bindingDataFlowSummaryDisplayText(rows.length, summaryRows, issueRows),
    totalRows: rows.length,
    summaryRows: summaryRows.length,
    issueRows,
    rows: summaryRows,
  };
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

export function readBindingObservedDependencySummary(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): SemanticBindingObservedDependencySummaryResult {
  const rows = readBindingObservedDependencyRows(emission, store, false);
  const summaryRows = summarizeBindingObservedDependencies(rows);
  const memberSourceStateRows = summarizeBindingObservedDependencyMemberSourceStates(rows);
  return {
    displayText: bindingObservedDependencySummaryDisplayText(rows.length, summaryRows, memberSourceStateRows),
    totalRows: rows.length,
    summaryRows: summaryRows.length,
    memberSourceStateRows,
    rows: summaryRows,
  };
}

export function bindingProjectionResources(
  emission: AureliaAppWorldProjectEmission,
) {
  return [
    ...emission.templates.resources,
    ...emission.templates.authoringResources,
  ];
}

function summarizeBindingValueChannels(
  rows: readonly SemanticBindingValueChannelRow[],
): readonly SemanticBindingValueChannelSummaryRow[] {
  const groups = new Map<string, BindingValueChannelSummaryAccumulator>();
  for (const row of rows) {
    const key = [
      row.channelKind,
      row.targetKind ?? '',
      row.targetProperty ?? '',
      sortedValues(row.observerCouplings).join(','),
    ].join('|');
    let group = groups.get(key);
    if (group == null) {
      group = {
        channelKind: row.channelKind,
        targetKind: row.targetKind,
        targetProperty: row.targetProperty,
        count: 0,
        bindingKinds: new Set(),
        authorities: new Set(),
        observerCouplings: new Set(),
        runtimeValueTypes: new Set(),
        primitiveValueDomainKinds: new Set(),
        definitionNames: new Set(),
        collectionCount: 0,
        customMatcherCount: 0,
        openCount: 0,
        openReasonKinds: new Set(),
      };
      groups.set(key, group);
    }
    group.count += 1;
    group.bindingKinds.add(row.bindingKind);
    group.authorities.add(row.authority);
    for (const coupling of row.observerCouplings) {
      group.observerCouplings.add(coupling);
    }
    if (row.runtimeValueType != null) {
      group.runtimeValueTypes.add(row.runtimeValueType);
    }
    for (const kind of row.primitiveValueDomainKinds) {
      group.primitiveValueDomainKinds.add(kind);
    }
    group.definitionNames.add(row.definitionName);
    if (row.isCollection === true) {
      group.collectionCount += 1;
    }
    if (row.usesCustomMatcher) {
      group.customMatcherCount += 1;
    }
    if (row.openReason != null || row.openReasonKinds.length > 0) {
      group.openCount += 1;
    }
    for (const reason of row.openReasonKinds) {
      group.openReasonKinds.add(reason);
    }
  }
  return [...groups.values()]
    .map((group): SemanticBindingValueChannelSummaryRow => ({
      channelKind: group.channelKind,
      targetKind: group.targetKind,
      targetProperty: group.targetProperty,
      count: group.count,
      bindingKinds: sortedValues(group.bindingKinds),
      authorities: sortedValues(group.authorities),
      observerCouplings: sortedValues(group.observerCouplings),
      runtimeValueTypes: sortedValues(group.runtimeValueTypes).slice(0, BINDING_SUMMARY_TYPE_LIMIT),
      runtimeValueTypeCount: group.runtimeValueTypes.size,
      primitiveValueDomainKinds: sortedValues(group.primitiveValueDomainKinds),
      definitionNames: sortedValues(group.definitionNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
      definitionCount: group.definitionNames.size,
      collectionCount: group.collectionCount,
      customMatcherCount: group.customMatcherCount,
      openCount: group.openCount,
      openReasonKinds: sortedValues(group.openReasonKinds),
    }))
    .sort((left, right) =>
      `${left.channelKind}:${left.targetKind ?? ''}:${left.targetProperty ?? ''}:${left.observerCouplings.join(',')}`
        .localeCompare(`${right.channelKind}:${right.targetKind ?? ''}:${right.targetProperty ?? ''}:${right.observerCouplings.join(',')}`)
    );
}

function summarizeBindingValueChannelCouplings(
  rows: readonly SemanticBindingValueChannelRow[],
): readonly SemanticBindingValueChannelCouplingSummaryRow[] {
  const groups = new Map<string, BindingValueChannelCouplingSummaryAccumulator>();
  for (const row of rows) {
    for (const coupling of row.observerCouplings) {
      let group = groups.get(coupling);
      if (group == null) {
        group = {
          observerCoupling: coupling,
          count: 0,
          channelKinds: new Set(),
          targetProperties: new Set(),
          definitionNames: new Set(),
        };
        groups.set(coupling, group);
      }
      group.count += 1;
      group.channelKinds.add(row.channelKind);
      group.targetProperties.add(row.targetProperty);
      group.definitionNames.add(row.definitionName);
    }
  }
  return [...groups.values()]
    .map((group): SemanticBindingValueChannelCouplingSummaryRow => ({
      observerCoupling: group.observerCoupling,
      count: group.count,
      channelKinds: sortedValues(group.channelKinds),
      targetProperties: sortedNullableValues(group.targetProperties).slice(0, BINDING_SUMMARY_PROPERTY_LIMIT),
      targetPropertyCount: group.targetProperties.size,
      definitionNames: sortedValues(group.definitionNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
      definitionCount: group.definitionNames.size,
    }))
    .sort((left, right) =>
      right.count - left.count
      || String(left.observerCoupling).localeCompare(String(right.observerCoupling))
    );
}

interface BindingValueChannelSummaryAccumulator {
  readonly channelKind: SemanticBindingValueChannelSummaryRow['channelKind'];
  readonly targetKind: SemanticBindingValueChannelSummaryRow['targetKind'];
  readonly targetProperty: string | null;
  count: number;
  readonly bindingKinds: Set<SemanticBindingValueChannelSummaryRow['bindingKinds'][number]>;
  readonly authorities: Set<SemanticBindingValueChannelSummaryRow['authorities'][number]>;
  readonly observerCouplings: Set<SemanticBindingValueChannelSummaryRow['observerCouplings'][number]>;
  readonly runtimeValueTypes: Set<string>;
  readonly primitiveValueDomainKinds: Set<SemanticBindingValueChannelSummaryRow['primitiveValueDomainKinds'][number]>;
  readonly definitionNames: Set<string>;
  collectionCount: number;
  customMatcherCount: number;
  openCount: number;
  readonly openReasonKinds: Set<SemanticBindingValueChannelSummaryRow['openReasonKinds'][number]>;
}

interface BindingValueChannelCouplingSummaryAccumulator {
  readonly observerCoupling: SemanticBindingValueChannelCouplingSummaryRow['observerCoupling'];
  count: number;
  readonly channelKinds: Set<SemanticBindingValueChannelCouplingSummaryRow['channelKinds'][number]>;
  readonly targetProperties: Set<string | null>;
  readonly definitionNames: Set<string>;
}

function summarizeBindingDataFlows(
  rows: readonly SemanticBindingDataFlowRow[],
): readonly SemanticBindingDataFlowSummaryRow[] {
  const groups = bindingDataFlowSummaryGroups(rows);
  return [...groups.values()]
    .map(bindingDataFlowSummaryRow)
    .sort((left, right) =>
      bindingDataFlowSummarySortKey(left).localeCompare(bindingDataFlowSummarySortKey(right))
    );
}

function bindingDataFlowSummaryGroups(
  rows: readonly SemanticBindingDataFlowRow[],
): ReadonlyMap<string, BindingDataFlowSummaryAccumulator> {
  const groups = new Map<string, BindingDataFlowSummaryAccumulator>();
  for (const row of rows) {
    const key = bindingDataFlowSummaryKey(row);
    const group = groups.get(key) ?? bindingDataFlowSummaryAccumulator(row);
    addBindingDataFlowSummaryRow(group, row);
    groups.set(key, group);
  }
  return groups;
}

function bindingDataFlowSummaryKey(row: SemanticBindingDataFlowRow): string {
  return [
    row.direction,
    row.targetKind ?? '',
    row.targetProperty ?? '',
    row.valueChannelKind ?? '',
    row.sourceKind,
  ].join('|');
}

function bindingDataFlowSummaryAccumulator(
  row: SemanticBindingDataFlowRow,
): BindingDataFlowSummaryAccumulator {
  return {
    direction: row.direction,
    targetKind: row.targetKind,
    targetProperty: row.targetProperty,
    valueChannelKind: row.valueChannelKind,
    sourceKind: row.sourceKind,
    count: 0,
    bindingKinds: new Set(),
    valueSiteKinds: new Set(),
    sourceRootNames: new Set(),
    sourceNames: new Set(),
    sourceTypes: new Set(),
    sourceTypeOpenKinds: new Set(),
    sourceTypeOpenCount: 0,
    targetValueTypes: new Set(),
    sourceWritable: emptyNullableBooleanCounts(),
    sourceToTargetAssignable: emptyNullableBooleanCounts(),
    targetToSourceAssignable: emptyNullableBooleanCounts(),
    sourceAssignmentKinds: new Set(),
    sourceAssignmentReasonKinds: new Set(),
    sourceToTargetTypeMismatchKinds: new Set(),
    targetToSourceTypeMismatchKinds: new Set(),
    frameworkErrorCodes: new Set(),
    openCount: 0,
    definitionNames: new Set(),
  };
}

function addBindingDataFlowSummaryRow(
  group: BindingDataFlowSummaryAccumulator,
  row: SemanticBindingDataFlowRow,
): void {
  group.count += 1;
  group.bindingKinds.add(row.bindingKind);
  if (row.valueSiteKind != null) {
    group.valueSiteKinds.add(row.valueSiteKind);
  }
  addNameParts(group.sourceRootNames, row.sourceRootName);
  if (row.sourceName != null) {
    group.sourceNames.add(row.sourceName);
  }
  if (row.sourceType != null) {
    group.sourceTypes.add(row.sourceType);
  }
  if (row.sourceTypeOpenKind != null) {
    group.sourceTypeOpenKinds.add(row.sourceTypeOpenKind);
    group.sourceTypeOpenCount += 1;
  } else if (row.sourceTypeOpenReason != null) {
    group.sourceTypeOpenCount += 1;
  }
  if (row.targetValueType != null) {
    group.targetValueTypes.add(row.targetValueType);
  }
  incrementNullableBooleanCounts(group.sourceWritable, row.sourceWritable);
  incrementNullableBooleanCounts(group.sourceToTargetAssignable, row.sourceToTargetAssignable);
  incrementNullableBooleanCounts(group.targetToSourceAssignable, row.targetToSourceAssignable);
  if (row.sourceAssignmentKind != null) {
    group.sourceAssignmentKinds.add(row.sourceAssignmentKind);
  }
  for (const reason of row.sourceAssignmentReasonKinds) {
    group.sourceAssignmentReasonKinds.add(reason);
  }
  for (const mismatch of row.sourceToTargetTypeMismatchKinds) {
    group.sourceToTargetTypeMismatchKinds.add(mismatch);
  }
  for (const mismatch of row.targetToSourceTypeMismatchKinds) {
    group.targetToSourceTypeMismatchKinds.add(mismatch);
  }
  if (row.frameworkErrorCode != null) {
    group.frameworkErrorCodes.add(row.frameworkErrorCode);
  }
  if (row.openReason != null) {
    group.openCount += 1;
  }
  group.definitionNames.add(row.definitionName);
}

function bindingDataFlowSummaryRow(
  group: BindingDataFlowSummaryAccumulator,
): SemanticBindingDataFlowSummaryRow {
  return {
    direction: group.direction,
    targetKind: group.targetKind,
    targetProperty: group.targetProperty,
    valueChannelKind: group.valueChannelKind,
    sourceKind: group.sourceKind,
    count: group.count,
    bindingKinds: sortedValues(group.bindingKinds),
    valueSiteKinds: sortedValues(group.valueSiteKinds),
    sourceRootNames: sortedValues(group.sourceRootNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
    sourceRootNameCount: group.sourceRootNames.size,
    sampleSourceNames: sortedValues(group.sourceNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
    sourceNameCount: group.sourceNames.size,
    sourceTypes: sortedValues(group.sourceTypes).slice(0, BINDING_SUMMARY_TYPE_LIMIT),
    sourceTypeCount: group.sourceTypes.size,
    sourceTypeOpenKinds: sortedValues(group.sourceTypeOpenKinds),
    sourceTypeOpenCount: group.sourceTypeOpenCount,
    targetValueTypes: sortedValues(group.targetValueTypes).slice(0, BINDING_SUMMARY_TYPE_LIMIT),
    targetValueTypeCount: group.targetValueTypes.size,
    sourceWritable: group.sourceWritable,
    sourceToTargetAssignable: group.sourceToTargetAssignable,
    targetToSourceAssignable: group.targetToSourceAssignable,
    sourceAssignmentKinds: sortedValues(group.sourceAssignmentKinds),
    sourceAssignmentReasonKinds: sortedValues(group.sourceAssignmentReasonKinds),
    sourceToTargetTypeMismatchKinds: sortedValues(group.sourceToTargetTypeMismatchKinds),
    targetToSourceTypeMismatchKinds: sortedValues(group.targetToSourceTypeMismatchKinds),
    frameworkErrorCodes: sortedValues(group.frameworkErrorCodes),
    openCount: group.openCount,
    definitionNames: sortedValues(group.definitionNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
    definitionCount: group.definitionNames.size,
  };
}

function bindingDataFlowSummarySortKey(row: SemanticBindingDataFlowSummaryRow): string {
  return `${row.direction}:${row.valueChannelKind ?? ''}:${row.targetKind ?? ''}:${row.targetProperty ?? ''}:${row.sourceKind}`;
}

function summarizeBindingDataFlowIssues(
  rows: readonly SemanticBindingDataFlowRow[],
): readonly SemanticBindingDataFlowIssueSummaryRow[] {
  const groups = new Map<SemanticBindingDataFlowIssueKind, BindingDataFlowIssueSummaryAccumulator>();
  for (const row of rows) {
    for (const issueKind of bindingDataFlowIssueKinds(row)) {
      let group = groups.get(issueKind);
      if (group == null) {
        group = {
          issueKind,
          count: 0,
          directions: new Set(),
          targetKinds: new Set(),
          targetProperties: new Set(),
          valueChannelKinds: new Set(),
          sourceKinds: new Set(),
          sourceRootNames: new Set(),
          sourceNames: new Set(),
          sourceTypes: new Set(),
          sourceTypeOpenKinds: new Set(),
          sourceTypeOpenCount: 0,
          targetValueTypes: new Set(),
          sourceToTargetTypeMismatchKinds: new Set(),
          targetToSourceTypeMismatchKinds: new Set(),
          frameworkErrorCodes: new Set(),
          definitionNames: new Set(),
        };
        groups.set(issueKind, group);
      }
      group.count += 1;
      group.directions.add(row.direction);
      group.targetKinds.add(row.targetKind);
      group.targetProperties.add(row.targetProperty);
      group.valueChannelKinds.add(row.valueChannelKind);
      group.sourceKinds.add(row.sourceKind);
      addNameParts(group.sourceRootNames, row.sourceRootName);
      if (row.sourceName != null) {
        group.sourceNames.add(row.sourceName);
      }
      if (row.sourceType != null) {
        group.sourceTypes.add(row.sourceType);
      }
      if (row.sourceTypeOpenKind != null) {
        group.sourceTypeOpenKinds.add(row.sourceTypeOpenKind);
        group.sourceTypeOpenCount += 1;
      } else if (row.sourceTypeOpenReason != null) {
        group.sourceTypeOpenCount += 1;
      }
      if (row.targetValueType != null) {
        group.targetValueTypes.add(row.targetValueType);
      }
      for (const mismatch of row.sourceToTargetTypeMismatchKinds) {
        group.sourceToTargetTypeMismatchKinds.add(mismatch);
      }
      for (const mismatch of row.targetToSourceTypeMismatchKinds) {
        group.targetToSourceTypeMismatchKinds.add(mismatch);
      }
      if (row.frameworkErrorCode != null) {
        group.frameworkErrorCodes.add(row.frameworkErrorCode);
      }
      group.definitionNames.add(row.definitionName);
    }
  }
  return [...groups.values()]
    .map((group): SemanticBindingDataFlowIssueSummaryRow => ({
      issueKind: group.issueKind,
      count: group.count,
      directions: sortedValues(group.directions),
      targetKinds: sortedNullableValues(group.targetKinds),
      targetProperties: sortedNullableValues(group.targetProperties).slice(0, BINDING_SUMMARY_PROPERTY_LIMIT),
      targetPropertyCount: group.targetProperties.size,
      valueChannelKinds: sortedNullableValues(group.valueChannelKinds),
      sourceKinds: sortedValues(group.sourceKinds),
      sourceRootNames: sortedValues(group.sourceRootNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
      sourceRootNameCount: group.sourceRootNames.size,
      sampleSourceNames: sortedValues(group.sourceNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
      sourceNameCount: group.sourceNames.size,
      sourceTypes: sortedValues(group.sourceTypes).slice(0, BINDING_SUMMARY_TYPE_LIMIT),
      sourceTypeCount: group.sourceTypes.size,
      sourceTypeOpenKinds: sortedValues(group.sourceTypeOpenKinds),
      sourceTypeOpenCount: group.sourceTypeOpenCount,
      targetValueTypes: sortedValues(group.targetValueTypes).slice(0, BINDING_SUMMARY_TYPE_LIMIT),
      targetValueTypeCount: group.targetValueTypes.size,
      sourceToTargetTypeMismatchKinds: sortedValues(group.sourceToTargetTypeMismatchKinds),
      targetToSourceTypeMismatchKinds: sortedValues(group.targetToSourceTypeMismatchKinds),
      frameworkErrorCodes: sortedValues(group.frameworkErrorCodes),
      definitionNames: sortedValues(group.definitionNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
      definitionCount: group.definitionNames.size,
    }))
    .sort((left, right) =>
      right.count - left.count
      || String(left.issueKind).localeCompare(String(right.issueKind))
    );
}

function bindingDataFlowIssueKinds(
  row: SemanticBindingDataFlowRow,
): readonly SemanticBindingDataFlowIssueKind[] {
  const issueKinds: SemanticBindingDataFlowIssueKind[] = [];
  const sourceToTargetActive = row.direction === 'source-to-target' || row.direction === 'two-way';
  const targetToSourceActive = row.direction === 'target-to-source' || row.direction === 'two-way';
  if (sourceToTargetActive) {
    if (row.sourceType == null && (row.sourceTypeOpenKind != null || row.sourceTypeOpenReason != null || row.sourceName != null || row.sourceRootName != null)) {
      issueKinds.push('source-type-unresolved');
    }
    if (row.sourceToTargetTypeMismatchKinds.includes('source-nullish-to-required-target')) {
      issueKinds.push('source-nullish-to-required-target');
    }
    if (row.sourceToTargetAssignable === false) {
      issueKinds.push('source-to-target-unassignable');
      if (isEmptyArrayInferenceTypeDisplay(row.targetValueType)) {
        issueKinds.push('target-empty-array-inferred');
      }
    } else if (row.sourceToTargetAssignable == null) {
      issueKinds.push('source-to-target-unknown');
    }
  }
  if (targetToSourceActive) {
    if (row.targetToSourceTypeMismatchKinds.includes('target-nullish-to-required-source')) {
      issueKinds.push('target-nullish-to-required-source');
    }
    if (row.targetToSourceAssignable === false) {
      issueKinds.push('target-to-source-unassignable');
    } else if (row.targetToSourceAssignable == null) {
      issueKinds.push('target-to-source-unknown');
    }
    if (row.sourceWritable === false) {
      issueKinds.push('source-not-writable');
    } else if (row.sourceWritable == null) {
      issueKinds.push('source-writable-unknown');
    }
  }
  if (row.frameworkErrorCode != null) {
    issueKinds.push('framework-error');
  }
  if (row.openReason != null) {
    issueKinds.push('open-data-flow');
  }
  return issueKinds;
}

interface BindingDataFlowSummaryAccumulator {
  readonly direction: SemanticBindingDataFlowSummaryRow['direction'];
  readonly targetKind: SemanticBindingDataFlowSummaryRow['targetKind'];
  readonly targetProperty: string | null;
  readonly valueChannelKind: SemanticBindingDataFlowSummaryRow['valueChannelKind'];
  readonly sourceKind: SemanticBindingDataFlowSummaryRow['sourceKind'];
  count: number;
  readonly bindingKinds: Set<SemanticBindingDataFlowSummaryRow['bindingKinds'][number]>;
  readonly valueSiteKinds: Set<SemanticBindingDataFlowSummaryRow['valueSiteKinds'][number]>;
  readonly sourceRootNames: Set<string>;
  readonly sourceNames: Set<string>;
  readonly sourceTypes: Set<string>;
  readonly sourceTypeOpenKinds: Set<SemanticBindingDataFlowSummaryRow['sourceTypeOpenKinds'][number]>;
  sourceTypeOpenCount: number;
  readonly targetValueTypes: Set<string>;
  readonly sourceWritable: MutableNullableBooleanCounts;
  readonly sourceToTargetAssignable: MutableNullableBooleanCounts;
  readonly targetToSourceAssignable: MutableNullableBooleanCounts;
  readonly sourceAssignmentKinds: Set<SemanticBindingDataFlowSummaryRow['sourceAssignmentKinds'][number]>;
  readonly sourceAssignmentReasonKinds: Set<SemanticBindingDataFlowSummaryRow['sourceAssignmentReasonKinds'][number]>;
  readonly sourceToTargetTypeMismatchKinds: Set<SemanticBindingDataFlowSummaryRow['sourceToTargetTypeMismatchKinds'][number]>;
  readonly targetToSourceTypeMismatchKinds: Set<SemanticBindingDataFlowSummaryRow['targetToSourceTypeMismatchKinds'][number]>;
  readonly frameworkErrorCodes: Set<string>;
  openCount: number;
  readonly definitionNames: Set<string>;
}

interface BindingDataFlowIssueSummaryAccumulator {
  readonly issueKind: SemanticBindingDataFlowIssueKind;
  count: number;
  readonly directions: Set<SemanticBindingDataFlowIssueSummaryRow['directions'][number]>;
  readonly targetKinds: Set<SemanticBindingDataFlowIssueSummaryRow['targetKinds'][number]>;
  readonly targetProperties: Set<string | null>;
  readonly valueChannelKinds: Set<SemanticBindingDataFlowIssueSummaryRow['valueChannelKinds'][number]>;
  readonly sourceKinds: Set<SemanticBindingDataFlowIssueSummaryRow['sourceKinds'][number]>;
  readonly sourceRootNames: Set<string>;
  readonly sourceNames: Set<string>;
  readonly sourceTypes: Set<string>;
  readonly sourceTypeOpenKinds: Set<SemanticBindingDataFlowIssueSummaryRow['sourceTypeOpenKinds'][number]>;
  sourceTypeOpenCount: number;
  readonly targetValueTypes: Set<string>;
  readonly sourceToTargetTypeMismatchKinds: Set<SemanticBindingDataFlowIssueSummaryRow['sourceToTargetTypeMismatchKinds'][number]>;
  readonly targetToSourceTypeMismatchKinds: Set<SemanticBindingDataFlowIssueSummaryRow['targetToSourceTypeMismatchKinds'][number]>;
  readonly frameworkErrorCodes: Set<string>;
  readonly definitionNames: Set<string>;
}

function isEmptyArrayInferenceTypeDisplay(display: string | null): boolean {
  return display === 'never[]' || display === 'readonly never[]';
}

function summarizeBindingObservedDependencies(
  rows: readonly SemanticBindingObservedDependencyRow[],
): readonly SemanticBindingObservedDependencySummaryRow[] {
  const groups = new Map<string, BindingObservedDependencySummaryAccumulator>();
  for (const row of rows) {
    const key = [
      row.dependencyKind,
      row.bindingKind,
      row.observedMemberSourceState,
      row.observedMemberKind ?? '',
      row.sourceRootName ?? '',
    ].join('|');
    let group = groups.get(key);
    if (group == null) {
      group = {
        dependencyKind: row.dependencyKind,
        bindingKind: row.bindingKind,
        observedMemberSourceState: row.observedMemberSourceState,
        observedMemberKind: row.observedMemberKind,
        sourceRootName: row.sourceRootName,
        count: 0,
        expressionKinds: new Set(),
        sourceRootNames: new Set(),
        sourceNames: new Set(),
        memberNames: new Set(),
        methodNames: new Set(),
        keyExpressions: new Set(),
        definitionNames: new Set(),
        sourceBackedCount: 0,
      };
      groups.set(key, group);
    }
    group.count += 1;
    group.expressionKinds.add(row.expressionKind);
    addNameParts(group.sourceRootNames, row.sourceRootName);
    if (row.sourceName != null) {
      group.sourceNames.add(row.sourceName);
    }
    if (row.memberName != null) {
      group.memberNames.add(row.memberName);
    }
    if (row.methodName != null) {
      group.methodNames.add(row.methodName);
    }
    if (row.keyExpression != null) {
      group.keyExpressions.add(row.keyExpression);
    }
    group.definitionNames.add(row.definitionName);
    if (row.observedMemberSourceState === 'source') {
      group.sourceBackedCount += 1;
    }
  }
  return [...groups.values()]
    .map((group): SemanticBindingObservedDependencySummaryRow => ({
      dependencyKind: group.dependencyKind,
      bindingKind: group.bindingKind,
      observedMemberSourceState: group.observedMemberSourceState,
      observedMemberKind: group.observedMemberKind,
      sourceRootName: group.sourceRootName,
      count: group.count,
      expressionKinds: sortedValues(group.expressionKinds),
      sourceRootNames: sortedValues(group.sourceRootNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
      sourceRootNameCount: group.sourceRootNames.size,
      sampleSourceNames: sortedValues(group.sourceNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
      sourceNameCount: group.sourceNames.size,
      memberNames: sortedValues(group.memberNames).slice(0, BINDING_SUMMARY_PROPERTY_LIMIT),
      memberNameCount: group.memberNames.size,
      methodNames: sortedValues(group.methodNames).slice(0, BINDING_SUMMARY_PROPERTY_LIMIT),
      methodNameCount: group.methodNames.size,
      keyExpressions: sortedValues(group.keyExpressions).slice(0, BINDING_SUMMARY_PROPERTY_LIMIT),
      keyExpressionCount: group.keyExpressions.size,
      definitionNames: sortedValues(group.definitionNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
      definitionCount: group.definitionNames.size,
      sourceBackedCount: group.sourceBackedCount,
    }))
    .sort((left, right) =>
      right.count - left.count
      || `${left.dependencyKind}:${left.bindingKind}:${left.observedMemberSourceState}:${left.observedMemberKind ?? ''}:${left.sourceRootName ?? ''}`
        .localeCompare(`${right.dependencyKind}:${right.bindingKind}:${right.observedMemberSourceState}:${right.observedMemberKind ?? ''}:${right.sourceRootName ?? ''}`)
    );
}

function summarizeBindingObservedDependencyMemberSourceStates(
  rows: readonly SemanticBindingObservedDependencyRow[],
): readonly SemanticBindingObservedDependencyMemberSourceStateSummaryRow[] {
  const groups = new Map<SemanticObservedMemberSourceState, BindingObservedDependencyMemberSourceStateSummaryAccumulator>();
  for (const row of rows) {
    let group = groups.get(row.observedMemberSourceState);
    if (group == null) {
      group = {
        observedMemberSourceState: row.observedMemberSourceState,
        count: 0,
        dependencyKinds: new Set(),
        bindingKinds: new Set(),
        observedMemberKinds: new Set(),
        sourceRootNames: new Set(),
        definitionNames: new Set(),
        sourceBackedCount: 0,
      };
      groups.set(row.observedMemberSourceState, group);
    }
    group.count += 1;
    group.dependencyKinds.add(row.dependencyKind);
    group.bindingKinds.add(row.bindingKind);
    group.observedMemberKinds.add(row.observedMemberKind);
    addNameParts(group.sourceRootNames, row.sourceRootName);
    group.definitionNames.add(row.definitionName);
    if (row.observedMemberSourceState === 'source') {
      group.sourceBackedCount += 1;
    }
  }
  return [...groups.values()]
    .map((group): SemanticBindingObservedDependencyMemberSourceStateSummaryRow => ({
      observedMemberSourceState: group.observedMemberSourceState,
      count: group.count,
      dependencyKinds: sortedValues(group.dependencyKinds),
      bindingKinds: sortedValues(group.bindingKinds),
      observedMemberKinds: sortedNullableValues(group.observedMemberKinds),
      sourceRootNames: sortedValues(group.sourceRootNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
      sourceRootNameCount: group.sourceRootNames.size,
      definitionNames: sortedValues(group.definitionNames).slice(0, BINDING_SUMMARY_NAME_LIMIT),
      definitionCount: group.definitionNames.size,
      sourceBackedCount: group.sourceBackedCount,
    }))
    .sort((left, right) =>
      right.count - left.count
      || left.observedMemberSourceState.localeCompare(right.observedMemberSourceState)
    );
}

interface BindingObservedDependencySummaryAccumulator {
  readonly dependencyKind: SemanticBindingObservedDependencySummaryRow['dependencyKind'];
  readonly bindingKind: SemanticBindingObservedDependencySummaryRow['bindingKind'];
  readonly observedMemberSourceState: SemanticObservedMemberSourceState;
  readonly observedMemberKind: SemanticBindingObservedDependencySummaryRow['observedMemberKind'];
  readonly sourceRootName: string | null;
  count: number;
  readonly expressionKinds: Set<string>;
  readonly sourceRootNames: Set<string>;
  readonly sourceNames: Set<string>;
  readonly memberNames: Set<string>;
  readonly methodNames: Set<string>;
  readonly keyExpressions: Set<string>;
  readonly definitionNames: Set<string>;
  sourceBackedCount: number;
}

interface BindingObservedDependencyMemberSourceStateSummaryAccumulator {
  readonly observedMemberSourceState: SemanticObservedMemberSourceState;
  count: number;
  readonly dependencyKinds: Set<SemanticBindingObservedDependencyMemberSourceStateSummaryRow['dependencyKinds'][number]>;
  readonly bindingKinds: Set<SemanticBindingObservedDependencyMemberSourceStateSummaryRow['bindingKinds'][number]>;
  readonly observedMemberKinds: Set<SemanticBindingObservedDependencyMemberSourceStateSummaryRow['observedMemberKinds'][number]>;
  readonly sourceRootNames: Set<string>;
  readonly definitionNames: Set<string>;
  sourceBackedCount: number;
}

interface MutableNullableBooleanCounts {
  yes: number;
  no: number;
  unknown: number;
}

function bindingValueChannelSummaryDisplayText(
  totalRows: number,
  rows: readonly SemanticBindingValueChannelSummaryRow[],
  observerCouplings: readonly SemanticBindingValueChannelCouplingSummaryRow[],
  channelsWithoutObserverCouplings: number,
): string {
  const openCount = rows.reduce((sum, row) => sum + row.openCount, 0);
  const firstLine =
    `Binding value channels: ${totalRows} row(s), ${rows.length} cluster(s), ` +
    `observer couplings ${formatCountRows(observerCouplings, (row) => String(row.observerCoupling))}, ` +
    `uncoupled=${channelsWithoutObserverCouplings}, open=${openCount}.`;
  const topChannels = formatCountRows(
    topCountRows(rows),
    bindingValueChannelClusterLabel,
    3,
  );
  return [
    firstLine,
    `Top value-channel clusters: ${topChannels}.`,
  ].join('\n');
}

function bindingDataFlowSummaryDisplayText(
  totalRows: number,
  rows: readonly SemanticBindingDataFlowSummaryRow[],
  issueRows: readonly SemanticBindingDataFlowIssueSummaryRow[],
): string {
  const firstLine =
    `Binding data-flow: ${totalRows} row(s), ${rows.length} cluster(s), ` +
    `issues ${formatCountRows(issueRows, (row) => row.issueKind)}.`;
  const topFlows = formatCountRows(
    topCountRows(rows),
    bindingDataFlowClusterLabel,
    3,
  );
  return [
    firstLine,
    `Top data-flow clusters: ${topFlows}.`,
  ].join('\n');
}

function bindingObservedDependencySummaryDisplayText(
  totalRows: number,
  rows: readonly SemanticBindingObservedDependencySummaryRow[],
  memberSourceStateRows: readonly SemanticBindingObservedDependencyMemberSourceStateSummaryRow[],
): string {
  const firstLine =
    `Binding observed dependencies: ${totalRows} row(s), ${rows.length} cluster(s), ` +
    `member source states ${formatCountRows(memberSourceStateRows, (row) => row.observedMemberSourceState)}.`;
  const topDependencies = formatCountRows(
    topCountRows(rows),
    bindingObservedDependencyClusterLabel,
    3,
  );
  return [
    firstLine,
    `Top observed-dependency clusters: ${topDependencies}.`,
  ].join('\n');
}

function bindingValueChannelClusterLabel(row: SemanticBindingValueChannelSummaryRow): string {
  return [
    row.channelKind,
    bindingTargetLabel(row.targetKind, row.targetProperty),
    row.observerCouplings.length === 0 ? 'uncoupled' : row.observerCouplings.join('+'),
  ].join('/');
}

function bindingDataFlowClusterLabel(row: SemanticBindingDataFlowSummaryRow): string {
  return [
    row.direction,
    row.sourceKind,
    row.valueChannelKind ?? 'no-value-channel',
    bindingTargetLabel(row.targetKind, row.targetProperty),
  ].join('/');
}

function bindingObservedDependencyClusterLabel(row: SemanticBindingObservedDependencySummaryRow): string {
  return [
    row.dependencyKind,
    row.bindingKind,
    row.observedMemberSourceState,
    row.observedMemberKind ?? 'unknown-member-kind',
    row.sourceRootName ?? 'unknown-root',
  ].join('/');
}

function bindingTargetLabel(
  targetKind: string | null,
  targetProperty: string | null,
): string {
  return `${targetKind ?? 'unknown-target'}.${targetProperty ?? '*'}`;
}

function topCountRows<T extends { readonly count: number }>(
  rows: readonly T[],
  limit = 5,
): readonly T[] {
  return [...rows]
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

function formatCountRows<T extends { readonly count: number }>(
  rows: readonly T[],
  label: (row: T) => string,
  limit = 5,
): string {
  if (rows.length === 0) {
    return 'none';
  }
  return rows
    .slice(0, limit)
    .map((row) => `${label(row)}=${row.count}`)
    .join(', ');
}

function sortedValues<T extends string>(values: Iterable<T>): T[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sortedNullableValues<T extends string>(values: Iterable<T | null>): (T | null)[] {
  return [...values].sort((left, right) =>
    (left ?? '').localeCompare(right ?? '')
  );
}

function addNameParts(target: Set<string>, name: string | null): void {
  if (name == null) {
    return;
  }
  for (const part of name.split(',')) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      target.add(trimmed);
    }
  }
}

function emptyNullableBooleanCounts(): MutableNullableBooleanCounts {
  return { yes: 0, no: 0, unknown: 0 };
}

function incrementNullableBooleanCounts(
  counts: MutableNullableBooleanCounts,
  value: boolean | null,
): void {
  if (value === true) {
    counts.yes += 1;
  } else if (value === false) {
    counts.no += 1;
  } else {
    counts.unknown += 1;
  }
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
    sourceToTargetTypeMismatchKinds: dataFlow.sourceToTargetTypeMismatchKinds,
    targetToSourceTypeMismatchKinds: dataFlow.targetToSourceTypeMismatchKinds,
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
    observedMemberSourceState: dependency.observedMemberSourceState,
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

function expressionParseForDataFlow(
  store: KernelStore,
  dataFlow: RuntimeBindingDataFlow,
): TemplateExpressionParse | null {
  return readTemplateExpressionParse(store, dataFlow.expressionProductHandle);
}
