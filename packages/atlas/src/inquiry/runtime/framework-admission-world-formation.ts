import type {
  FrameworkAdmissionRelationshipRow,
} from "../../framework/admission.js";
import {
  FrameworkAdmissionWorldFormationKind,
  FrameworkAdmissionWorldFormationStatus,
  frameworkAdmissionWorldFormation,
  type FrameworkAdmissionWorldFormationRow,
} from "../../framework/admission-world.js";
import {
  FrameworkRelationshipClosure,
  FrameworkRelationshipEndpointKind,
} from "../../framework/relationships.js";
import type { SourceProject } from "../../source/index.js";
import {
  readFrameworkAdmissionMaterializationLinks,
  type FrameworkAdmissionMaterializationFilters,
  type FrameworkAdmissionMaterializationLinkRow,
} from "./framework-admission-materialization.js";
import { appTaskSlotName } from "./framework-admission-continuations.js";
import {
  readLifecycleAppTaskExecutions,
  type FrameworkLifecycleAppTaskExecutionRow,
} from "./framework-lifecycle-lenses.js";

/** Filters for admission-to-world-formation reads. */
export interface FrameworkAdmissionWorldFormationFilters
  extends FrameworkAdmissionMaterializationFilters {
  readonly associationKind?: string;
  readonly formationKind?: string;
  readonly status?: string;
  readonly slotName?: string;
  readonly appTaskExecutionKind?: string;
}

/** Read admission-to-world rows over already-scoped admission relationships. */
export function readFrameworkAdmissionWorldFormationRows(
  sourceProject: SourceProject,
  relationships: readonly FrameworkAdmissionRelationshipRow[],
  filters: FrameworkAdmissionWorldFormationFilters,
): readonly FrameworkAdmissionWorldFormationRow[] {
  const materializationLinks = readFrameworkAdmissionMaterializationLinks(
    sourceProject,
    relationships,
    filters,
  );
  const materializedAdmissionIds = new Set(
    materializationLinks.map((row) => row.admissionRelationshipId),
  );
  const rows: FrameworkAdmissionWorldFormationRow[] = [
    ...materializationLinks.map(worldFormationRowForMaterializationLink),
  ];

  for (const relationship of relationships) {
    if (relationship.to.kind === FrameworkRelationshipEndpointKind.AppTask) {
      rows.push(
        ...worldFormationRowsForAppTask(sourceProject, relationship, filters),
      );
      continue;
    }
    if (
      (relationship.to.kind === FrameworkRelationshipEndpointKind.DiKey ||
        relationship.to.kind === FrameworkRelationshipEndpointKind.Resource) &&
      materializedAdmissionIds.has(relationship.id)
    ) {
      continue;
    }
    rows.push(worldFormationRowForAdmissionOnly(relationship));
  }

  return rows
    .filter((row) => worldFormationMatches(row, filters))
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.exportName.localeCompare(right.exportName) ||
        left.formationKind.localeCompare(right.formationKind) ||
        left.status.localeCompare(right.status) ||
        left.admittedTarget.name.localeCompare(right.admittedTarget.name) ||
        left.id.localeCompare(right.id),
    );
}

function worldFormationRowForMaterializationLink(
  link: FrameworkAdmissionMaterializationLinkRow,
): FrameworkAdmissionWorldFormationRow {
  return {
    id: `${link.id}:world-formation`,
    packageId: link.packageId,
    packageName: link.packageName,
    exportName: link.exportName,
    admissionRelationshipId: link.admissionRelationshipId,
    admissionRelation: link.admissionRelation,
    associationKind: link.associationKind,
    formationKind: FrameworkAdmissionWorldFormationKind.RuntimeExistence,
    status: FrameworkAdmissionWorldFormationStatus.Materialized,
    admittedTarget: link.admittedTarget,
    formedTarget: link.materializedTarget,
    source: link.source,
    formationSource: link.materializationSource,
    materializationId: link.materializationId,
    materializationKind: link.materializationKind,
    linkKind: link.linkKind,
    matchBasis: link.matchBasis,
    ...(link.resourceKind === undefined ? {} : { resourceKind: link.resourceKind }),
    materializationSiteKinds: link.materializationSiteKinds,
    closure: link.closure,
    summary: `${link.exportName} spends admitted ${link.admittedTarget.name} into ${link.materializationKind} world evidence via ${link.matchBasis}.`,
  };
}

function worldFormationRowsForAppTask(
  sourceProject: SourceProject,
  relationship: FrameworkAdmissionRelationshipRow,
  filters: FrameworkAdmissionWorldFormationFilters,
): readonly FrameworkAdmissionWorldFormationRow[] {
  const slotName = appTaskSlotName(relationship);
  const executions =
    slotName === null
      ? []
      : readLifecycleAppTaskExecutions(sourceProject, {
          slotName,
          appTaskExecutionKind: filters.appTaskExecutionKind,
          query: filters.query,
        });
  if (executions.length === 0) {
    return [worldFormationRowForAdmissionOnly(relationship)];
  }
  return executions.map((execution) =>
    worldFormationRowForAppTaskExecution(relationship, execution),
  );
}

function worldFormationRowForAppTaskExecution(
  relationship: FrameworkAdmissionRelationshipRow,
  execution: FrameworkLifecycleAppTaskExecutionRow,
): FrameworkAdmissionWorldFormationRow {
  return {
    id: `${relationship.id}:world-formation:${execution.id}`,
    packageId: relationship.packageId,
    packageName: relationship.packageName,
    exportName: relationship.exportName,
    admissionRelationshipId: relationship.id,
    admissionRelation: relationship.relation,
    associationKind: relationship.associationKind,
    formationKind: FrameworkAdmissionWorldFormationKind.AppTaskExecution,
    status: FrameworkAdmissionWorldFormationStatus.Executed,
    admittedTarget: relationship.to,
    formedTarget: {
      kind: FrameworkRelationshipEndpointKind.AppTask,
      name: execution.slotName ?? execution.lifecycleStage,
      packageId: execution.packageId,
      packageName: execution.packageName,
      source: execution.source,
    },
    source: relationship.source,
    formationSource: execution.source,
    lifecycleExecutionId: execution.id,
    appTaskExecutionKind: execution.executionKind,
    ...(execution.slotName === null ? {} : { slotName: execution.slotName }),
    closure: FrameworkRelationshipClosure.Exact,
    summary: `${relationship.exportName} admits AppTask ${relationship.to.name}; AppRoot executes ${execution.summary}`,
  };
}

function worldFormationRowForAdmissionOnly(
  relationship: FrameworkAdmissionRelationshipRow,
): FrameworkAdmissionWorldFormationRow {
  const interpretation =
    frameworkAdmissionWorldFormation.interpretAdmissionOnly(relationship);
  const result = {
    id: `${relationship.id}:world-formation:admission-only`,
    packageId: relationship.packageId,
    packageName: relationship.packageName,
    exportName: relationship.exportName,
    admissionRelationshipId: relationship.id,
    admissionRelation: relationship.relation,
    associationKind: relationship.associationKind,
    formationKind: interpretation.formationKind,
    status: interpretation.status,
    admittedTarget: relationship.to,
    formedTarget: relationship.to,
    source: relationship.source,
    closure: interpretation.closure,
    summary: interpretation.summary,
  };
  if (interpretation.openReason !== undefined) {
    Object.assign(result, { openReason: interpretation.openReason });
  }
  if (relationship.to.resourceKind !== undefined) {
    Object.assign(result, { resourceKind: relationship.to.resourceKind });
  }
  return result;
}

function worldFormationMatches(
  row: FrameworkAdmissionWorldFormationRow,
  filters: FrameworkAdmissionWorldFormationFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.exportName === undefined || row.exportName === filters.exportName) &&
    (filters.relation === undefined || row.admissionRelation === filters.relation) &&
    (filters.associationKind === undefined ||
      row.associationKind === filters.associationKind) &&
    (filters.resourceKind === undefined || row.resourceKind === filters.resourceKind) &&
    (filters.targetName === undefined ||
      row.admittedTarget.name === filters.targetName ||
      row.formedTarget.name === filters.targetName) &&
    (filters.key === undefined ||
      row.admittedTarget.name === filters.key ||
      row.formedTarget.name === filters.key) &&
    (filters.linkKind === undefined || row.linkKind === filters.linkKind) &&
    (filters.materializationKind === undefined ||
      row.materializationKind === filters.materializationKind) &&
    (filters.matchBasis === undefined || row.matchBasis === filters.matchBasis) &&
    (filters.formationKind === undefined ||
      row.formationKind === filters.formationKind) &&
    (filters.status === undefined || row.status === filters.status) &&
    (filters.slotName === undefined || row.slotName === filters.slotName) &&
    (filters.appTaskExecutionKind === undefined ||
      row.appTaskExecutionKind === filters.appTaskExecutionKind) &&
    (filters.query === undefined ||
      [
        row.packageId,
        row.exportName,
        row.admissionRelation,
        row.associationKind,
        row.formationKind,
        row.status,
        row.admittedTarget.name,
        row.formedTarget.name,
        row.materializationKind,
        row.matchBasis,
        row.resourceKind,
        row.slotName,
        row.appTaskExecutionKind,
        row.openReason,
        row.summary,
      ].some(
        (value) =>
          typeof value === "string" && value.includes(filters.query!),
      ) ||
      row.materializationSiteKinds?.some((kind) =>
        kind.includes(filters.query!),
      ) === true)
  );
}
