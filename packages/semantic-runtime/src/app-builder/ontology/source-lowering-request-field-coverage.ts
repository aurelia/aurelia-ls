import { APP_BUILDER_SOURCE_LOWERING_SURFACE_KINDS, APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS } from './source-lowering-surface.js';
import { uniqueStrings } from '../../kernel/collections.js';
import { appBuilderUniqueOntologyRowRefs } from './row-descriptor.js';
import type { AppBuilderOntologyRowRef } from './relation.js';
import { appBuilderSourceLoweringRequestFieldsForSourcePlanSelection, appBuilderSourceLoweringRequestFieldsForTarget } from './source-lowering-request-field-requirements.js';
import {
  APP_BUILDER_SOURCE_LOWERING_REQUEST_FIELD_REGISTRY_OWNER_KINDS,
  AppBuilderSourceLoweringRequestFieldId,
  AppBuilderSourceLoweringRequestFieldRegistryOwnerKind,
  AppBuilderSourceLoweringRequestFieldRequirementKind,
  AppBuilderSourceLoweringRequestFieldUsageOwnerKind,
  AppBuilderSourceLoweringSourcePlanSelectionKind,
  type AppBuilderSourceLoweringRequestFieldCoverageUsageSource,
  type AppBuilderSourceLoweringRequestFieldRegistryCoverageRow,
  type AppBuilderSourceLoweringRequestFieldRegistryCoverageSummary,
  type AppBuilderSourceLoweringRequestFieldRegistryCoverageSummaryOptions,
  type AppBuilderSourceLoweringRequestFieldRegistryRow,
  type AppBuilderSourceLoweringRequestFieldUsageRow,
  type AppBuilderSourceLoweringRequestFieldValueShape,
  type AppBuilderSourceLoweringSourcePlanRequestFieldSelection,
} from './source-lowering-request-field-contracts.js';
import type { AppBuilderSourceLoweringSurfaceKind } from './source-lowering-surface.js';

/** Return the exact coverage rows counted by a request-field coverage summary scope. */
export function appBuilderSourceLoweringRequestFieldRegistryCoverageRowsInSummaryScope(
  coverageRows: readonly AppBuilderSourceLoweringRequestFieldRegistryCoverageRow[],
  options: AppBuilderSourceLoweringRequestFieldRegistryCoverageSummaryOptions = {},
): readonly AppBuilderSourceLoweringRequestFieldRegistryCoverageRow[] {
  const summarizedRegistryOwnerKinds = options.summarizedRegistryOwnerKinds ?? APP_BUILDER_SOURCE_LOWERING_REQUEST_FIELD_REGISTRY_OWNER_KINDS;
  const summarizedSurfaceKinds = options.summarizedSurfaceKinds ?? APP_BUILDER_SOURCE_LOWERING_SURFACE_KINDS;
  return coverageRows.filter((row) =>
    row.registryOwnerKinds.length === 0
    || row.registryOwnerKinds.some((ownerKind) => summarizedRegistryOwnerKinds.includes(ownerKind))
    && row.registeredSurfaceKinds.some((surfaceKind) => summarizedSurfaceKinds.includes(surfaceKind))
  );
}


/** Return all registry rows that admit source-lowering request fields. */
export function appBuilderSourceLoweringRequestFieldRegistryRows(): readonly AppBuilderSourceLoweringRequestFieldRegistryRow[] {
  return [
    ...sourceLoweringTargetRequestFieldRegistryRows(),
    ...sourcePlanSelectionRequestFieldRegistryRows(),
  ];
}

/** Compare request-field registry ownership to observed usage sources. */
export function appBuilderSourceLoweringRequestFieldRegistryCoverageRows(
  usageSources: readonly AppBuilderSourceLoweringRequestFieldCoverageUsageSource[],
): readonly AppBuilderSourceLoweringRequestFieldRegistryCoverageRow[] {
  const registryRowsByFieldId = new Map<AppBuilderSourceLoweringRequestFieldId, AppBuilderSourceLoweringRequestFieldRegistryRow[]>();
  for (const registryRow of appBuilderSourceLoweringRequestFieldRegistryRows()) {
    const rows = registryRowsByFieldId.get(registryRow.fieldId) ?? [];
    rows.push(registryRow);
    registryRowsByFieldId.set(registryRow.fieldId, rows);
  }

  const usageRowsByFieldId = new Map<AppBuilderSourceLoweringRequestFieldId, {
    readonly sourceId: string;
    readonly usageRow: AppBuilderSourceLoweringRequestFieldUsageRow;
  }[]>();
  for (const source of usageSources) {
    for (const usageRow of source.usageRows) {
      const rows = usageRowsByFieldId.get(usageRow.fieldId) ?? [];
      rows.push({
        sourceId: source.sourceId,
        usageRow,
      });
      usageRowsByFieldId.set(usageRow.fieldId, rows);
    }
  }

  return uniqueRequestFieldIds([
    ...registryRowsByFieldId.keys(),
    ...usageRowsByFieldId.keys(),
  ]).map((fieldId) => {
    const registryRows = registryRowsByFieldId.get(fieldId) ?? [];
    const usageRows = usageRowsByFieldId.get(fieldId) ?? [];
    return {
      fieldId,
      requestFieldNames: uniqueStrings([
        ...registryRows.map((row) => row.requestFieldName),
        ...usageRows.map((row) => row.usageRow.requestFieldName),
      ], 'sorted'),
      registeredBySourceLoweringRegistry: registryRows.length > 0,
      registryOwnerKinds: uniqueRegistryOwnerKinds(registryRows.map((row) => row.ownerKind)),
      registeredTargetRefs: appBuilderUniqueOntologyRowRefs(registryRows
        .map((row) => row.targetRef)
        .filter((targetRef): targetRef is AppBuilderOntologyRowRef => targetRef != null), 'sorted'),
      registeredSourcePlanSelectionKinds: uniqueSourcePlanSelectionKinds(registryRows
        .map((row) => row.sourcePlanSelectionKind)
        .filter((selectionKind): selectionKind is AppBuilderSourceLoweringSourcePlanSelectionKind => selectionKind != null)),
      registeredSurfaceKinds: uniqueSurfaceKinds(registryRows.map((row) => row.surfaceKind)),
      registeredRequirementKinds: uniqueRequirementKinds(registryRows.map((row) => row.requirementKind)),
      requiredRegistryRowCount: registryRows.filter((row) => row.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Required).length,
      conditionalRegistryRowCount: registryRows.filter((row) => row.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional).length,
      optionalRegistryRowCount: registryRows.filter((row) => row.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Optional).length,
      usedBySource: usageRows.length > 0,
      usageSourceIds: uniqueStrings(usageRows.map((row) => row.sourceId), 'sorted'),
      usageOwnerKinds: uniqueUsageOwnerKinds(usageRows.map((row) => row.usageRow.ownerKind)),
      usageValueShapes: uniqueValueShapes(usageRows.map((row) => row.usageRow.valueShape)),
      usageCount: usageRows.length,
    };
  });
}

/** Summarize request-field registry coverage for compact review indexes. */
export function appBuilderSourceLoweringRequestFieldRegistryCoverageSummary(
  coverageRows: readonly AppBuilderSourceLoweringRequestFieldRegistryCoverageRow[],
  options: AppBuilderSourceLoweringRequestFieldRegistryCoverageSummaryOptions = {},
): AppBuilderSourceLoweringRequestFieldRegistryCoverageSummary {
  const summarizedRegistryOwnerKinds = options.summarizedRegistryOwnerKinds ?? APP_BUILDER_SOURCE_LOWERING_REQUEST_FIELD_REGISTRY_OWNER_KINDS;
  const summarizedSurfaceKinds = options.summarizedSurfaceKinds ?? APP_BUILDER_SOURCE_LOWERING_SURFACE_KINDS;
  const summarizedRows = appBuilderSourceLoweringRequestFieldRegistryCoverageRowsInSummaryScope(coverageRows, options);
  return {
    summarizedRegistryOwnerKinds: uniqueRegistryOwnerKinds(summarizedRegistryOwnerKinds),
    summarizedSurfaceKinds: uniqueSurfaceKinds(summarizedSurfaceKinds),
    requestFieldCount: summarizedRows.length,
    registeredFieldCount: summarizedRows.filter((row) => row.registeredBySourceLoweringRegistry).length,
    usedFieldCount: summarizedRows.filter((row) => row.usedBySource).length,
    unusedFieldCount: summarizedRows.filter((row) => !row.usedBySource).length,
    unregisteredUsedFieldCount: summarizedRows.filter((row) =>
      !row.registeredBySourceLoweringRegistry && row.usedBySource
    ).length,
    unusedRequiredFieldCount: summarizedRows.filter((row) =>
      !row.usedBySource
      && row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Required)
    ).length,
    unusedConditionalOnlyFieldCount: summarizedRows.filter((row) =>
      !row.usedBySource
      && !row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Required)
      && row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional)
      && !row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Optional)
    ).length,
    unusedOptionalOnlyFieldCount: summarizedRows.filter((row) =>
      !row.usedBySource
      && row.registeredRequirementKinds.length === 1
      && row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Optional)
    ).length,
    unusedMixedRequirementFieldCount: summarizedRows.filter((row) =>
      !row.usedBySource
      && !row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Required)
      && row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional)
      && row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Optional)
    ).length,
    registryOwnerKinds: uniqueRegistryOwnerKinds(summarizedRows
      .flatMap((row) => row.registryOwnerKinds)
      .filter((ownerKind) => summarizedRegistryOwnerKinds.includes(ownerKind))),
    registeredRequirementKinds: uniqueRequirementKinds(summarizedRows.flatMap((row) => row.registeredRequirementKinds)),
  };
}


function sourceLoweringTargetRequestFieldRegistryRows(): readonly AppBuilderSourceLoweringRequestFieldRegistryRow[] {
  return APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS.flatMap((targetRow) =>
    appBuilderSourceLoweringRequestFieldsForTarget(targetRow.targetRef).map((field) => ({
      ownerKind: AppBuilderSourceLoweringRequestFieldRegistryOwnerKind.SourceLoweringTarget,
      targetRef: targetRow.targetRef,
      fieldId: field.fieldId,
      requestFieldName: field.requestFieldName,
      surfaceKind: field.surfaceKind,
      requirementKind: field.requirementKind,
    })),
  );
}

function sourcePlanSelectionRequestFieldRegistryRows(): readonly AppBuilderSourceLoweringRequestFieldRegistryRow[] {
  const sourcePlanSelections: readonly [
    AppBuilderSourceLoweringSourcePlanSelectionKind,
    AppBuilderSourceLoweringSourcePlanRequestFieldSelection,
  ][] = [
    [AppBuilderSourceLoweringSourcePlanSelectionKind.AppShell, { sourceLoweringAppShell: true }],
    [AppBuilderSourceLoweringSourcePlanSelectionKind.ApplicationAssembly, { sourceLoweringApplicationAssembly: true }],
    [AppBuilderSourceLoweringSourcePlanSelectionKind.RouterBackedListDetail, { sourceLoweringRouterBackedListDetail: true }],
    [AppBuilderSourceLoweringSourcePlanSelectionKind.DiStateClass, { sourceLoweringDiStateClass: true }],
    [AppBuilderSourceLoweringSourcePlanSelectionKind.LocalViewModelState, { sourceLoweringLocalViewModelState: true }],
    [AppBuilderSourceLoweringSourcePlanSelectionKind.TargetInvocation, { sourceLoweringInvocation: true }],
    [AppBuilderSourceLoweringSourcePlanSelectionKind.FragmentComposition, { sourceLoweringComposition: true }],
    [AppBuilderSourceLoweringSourcePlanSelectionKind.ComponentPair, { sourceLoweringComponentPair: true }],
  ];
  return sourcePlanSelections.flatMap(([sourcePlanSelectionKind, selection]) =>
    appBuilderSourceLoweringRequestFieldsForSourcePlanSelection(selection).map((field) => ({
      ownerKind: AppBuilderSourceLoweringRequestFieldRegistryOwnerKind.SourcePlanSelection,
      sourcePlanSelectionKind,
      fieldId: field.fieldId,
      requestFieldName: field.requestFieldName,
      surfaceKind: field.surfaceKind,
      requirementKind: field.requirementKind,
    })),
  );
}


function uniqueRequestFieldIds(
  values: Iterable<AppBuilderSourceLoweringRequestFieldId>,
): readonly AppBuilderSourceLoweringRequestFieldId[] {
  return [...new Set(values)].sort();
}

function uniqueRegistryOwnerKinds(
  values: readonly AppBuilderSourceLoweringRequestFieldRegistryOwnerKind[],
): readonly AppBuilderSourceLoweringRequestFieldRegistryOwnerKind[] {
  return [...new Set(values)].sort();
}

function uniqueSourcePlanSelectionKinds(
  values: readonly AppBuilderSourceLoweringSourcePlanSelectionKind[],
): readonly AppBuilderSourceLoweringSourcePlanSelectionKind[] {
  return [...new Set(values)].sort();
}

function uniqueSurfaceKinds(
  values: readonly AppBuilderSourceLoweringSurfaceKind[],
): readonly AppBuilderSourceLoweringSurfaceKind[] {
  return [...new Set(values)].sort();
}

function uniqueRequirementKinds(
  values: readonly AppBuilderSourceLoweringRequestFieldRequirementKind[],
): readonly AppBuilderSourceLoweringRequestFieldRequirementKind[] {
  return [...new Set(values)].sort();
}

function uniqueUsageOwnerKinds(
  values: readonly AppBuilderSourceLoweringRequestFieldUsageOwnerKind[],
): readonly AppBuilderSourceLoweringRequestFieldUsageOwnerKind[] {
  return [...new Set(values)].sort();
}

function uniqueValueShapes(
  values: readonly AppBuilderSourceLoweringRequestFieldValueShape[],
): readonly AppBuilderSourceLoweringRequestFieldValueShape[] {
  const byKey = new Map<string, AppBuilderSourceLoweringRequestFieldValueShape>();
  for (const value of values) {
    byKey.set(JSON.stringify(value), value);
  }
  return [...byKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);
}
