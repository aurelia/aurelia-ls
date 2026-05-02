import type {
  FrameworkAdmissionRelationshipRow,
} from "../../framework/admission.js";
import {
  FrameworkRelationshipClosure,
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import type { SourceProject } from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import {
  FrameworkAdmissionMaterializationLinkKind,
  readFrameworkAdmissionMaterializationLinks,
  type FrameworkAdmissionMaterializationFilters,
  type FrameworkAdmissionMaterializationLinkRow,
} from "./framework-admission-materialization.js";
import {
  readLifecycleAppTaskExecutions,
  type FrameworkLifecycleAppTaskExecutionRow,
} from "./framework-lifecycle-lenses.js";

/** World-formation class derived from admission rows without claiming final container state. */
export const enum FrameworkAdmissionWorldFormationKind {
  /** Admission joined to visible DI/resource runtime-existence evidence. */
  RuntimeExistence = "runtime-existence",
  /** Admission joined to AppRoot lifecycle task execution evidence. */
  AppTaskExecution = "app-task-execution",
  /** Registry/configuration export was admitted, but execution is a separate downstream question. */
  RegistryExportAdmission = "registry-export-admission",
  /** Catalog/array admission was statically expanded by evaluator evidence. */
  CatalogExpansion = "catalog-expansion",
  /** Factory/registration helper was admitted, but provider execution is not closed here. */
  FactoryAdmission = "factory-admission",
  /** Concrete registration argument was admitted without a richer world-formation row. */
  RegistrationArgumentAdmission = "registration-argument-admission",
  /** Unknown admission remains unclassified. */
  UnknownAdmission = "unknown-admission",
  /** DI/resource/AppTask admission has no matching materialization/execution row yet. */
  AdmissionOnly = "admission-only",
}

/** Whether an admission row has been spent into visible world evidence. */
export const enum FrameworkAdmissionWorldFormationStatus {
  /** A DI key or resource has visible materialization evidence. */
  Materialized = "materialized",
  /** An AppTask has visible lifecycle execution evidence. */
  Executed = "executed",
  /** A catalog was statically expanded by the evaluator. */
  Expanded = "expanded",
  /** The row is intentionally only an admission fact at this layer. */
  AdmissionOnly = "admission-only",
  /** Atlas expected a downstream fact but did not find one. */
  Open = "open",
}

/** Filters for admission-to-world-formation reads. */
export interface FrameworkAdmissionWorldFormationFilters
  extends FrameworkAdmissionMaterializationFilters {
  readonly associationKind?: string;
  readonly formationKind?: string;
  readonly status?: string;
  readonly slotName?: string;
  readonly appTaskExecutionKind?: string;
}

/** Compact row joining admission to visible world-formation evidence, or preserving an admission-only boundary. */
export interface FrameworkAdmissionWorldFormationRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly exportName: string;
  readonly admissionRelationshipId: string;
  readonly admissionRelation: FrameworkRelationshipRelation;
  readonly associationKind: string;
  readonly formationKind: FrameworkAdmissionWorldFormationKind;
  readonly status: FrameworkAdmissionWorldFormationStatus;
  readonly admittedTarget: FrameworkRelationshipEndpoint;
  readonly formedTarget: FrameworkRelationshipEndpoint;
  readonly source: SourceRange;
  readonly formationSource?: SourceRange;
  readonly materializationId?: string;
  readonly materializationKind?: string;
  readonly linkKind?: FrameworkAdmissionMaterializationLinkKind;
  readonly matchBasis?: string;
  readonly resourceKind?: string;
  readonly materializationSiteKinds?: readonly string[];
  readonly lifecycleExecutionId?: string;
  readonly appTaskExecutionKind?: string;
  readonly slotName?: string;
  readonly closure: FrameworkRelationshipClosure;
  readonly openReason?: string;
  readonly summary: string;
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
    if (relationship.relation === FrameworkRelationshipRelation.AdmitsAppTask) {
      rows.push(
        ...worldFormationRowsForAppTask(sourceProject, relationship, filters),
      );
      continue;
    }
    if (
      (relationship.relation === FrameworkRelationshipRelation.AdmitsDiKey ||
        relationship.relation ===
          FrameworkRelationshipRelation.AdmitsResource) &&
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
  const formationKind = admissionOnlyFormationKind(relationship);
  const status = admissionOnlyStatus(relationship);
  const openReason = openReasonForAdmissionOnly(relationship, status);
  return {
    id: `${relationship.id}:world-formation:admission-only`,
    packageId: relationship.packageId,
    packageName: relationship.packageName,
    exportName: relationship.exportName,
    admissionRelationshipId: relationship.id,
    admissionRelation: relationship.relation,
    associationKind: relationship.associationKind,
    formationKind,
    status,
    admittedTarget: relationship.to,
    formedTarget: relationship.to,
    source: relationship.source,
    closure: FrameworkRelationshipClosure.Partial,
    ...(openReason === undefined ? {} : { openReason }),
    ...(relationship.to.resourceKind === undefined
      ? {}
      : { resourceKind: relationship.to.resourceKind }),
    summary: admissionOnlySummary(relationship, formationKind, status),
  };
}

function admissionOnlyFormationKind(
  relationship: FrameworkAdmissionRelationshipRow,
): FrameworkAdmissionWorldFormationKind {
  switch (relationship.relation) {
    case FrameworkRelationshipRelation.AdmitsRegistryExport:
      return FrameworkAdmissionWorldFormationKind.RegistryExportAdmission;
    case FrameworkRelationshipRelation.AdmitsCatalog:
      return FrameworkAdmissionWorldFormationKind.CatalogExpansion;
    case FrameworkRelationshipRelation.AdmitsFactory:
      return FrameworkAdmissionWorldFormationKind.FactoryAdmission;
    case FrameworkRelationshipRelation.AdmitsUnknownArgument:
      return FrameworkAdmissionWorldFormationKind.UnknownAdmission;
    case FrameworkRelationshipRelation.AdmitsRegistrationArgument:
      return FrameworkAdmissionWorldFormationKind.RegistrationArgumentAdmission;
    case FrameworkRelationshipRelation.AdmitsDiKey:
    case FrameworkRelationshipRelation.AdmitsResource:
    case FrameworkRelationshipRelation.AdmitsAppTask:
    default:
      return FrameworkAdmissionWorldFormationKind.AdmissionOnly;
  }
}

function admissionOnlyStatus(
  relationship: FrameworkAdmissionRelationshipRow,
): FrameworkAdmissionWorldFormationStatus {
  switch (relationship.relation) {
    case FrameworkRelationshipRelation.AdmitsCatalog:
      return FrameworkAdmissionWorldFormationStatus.Expanded;
    case FrameworkRelationshipRelation.AdmitsDiKey:
    case FrameworkRelationshipRelation.AdmitsResource:
    case FrameworkRelationshipRelation.AdmitsAppTask:
    case FrameworkRelationshipRelation.AdmitsUnknownArgument:
      return FrameworkAdmissionWorldFormationStatus.Open;
    default:
      return FrameworkAdmissionWorldFormationStatus.AdmissionOnly;
  }
}

function openReasonForAdmissionOnly(
  relationship: FrameworkAdmissionRelationshipRow,
  status: FrameworkAdmissionWorldFormationStatus,
): string | undefined {
  if (status !== FrameworkAdmissionWorldFormationStatus.Open) {
    return undefined;
  }
  switch (relationship.relation) {
    case FrameworkRelationshipRelation.AdmitsDiKey:
      return "Admitted DI key has no matching materialization row in the current Atlas indexes.";
    case FrameworkRelationshipRelation.AdmitsResource:
      return "Admitted resource has no matching resource materialization row in the current Atlas indexes.";
    case FrameworkRelationshipRelation.AdmitsAppTask:
      return "Admitted AppTask has no concrete AppRoot slot execution row joined from the helper name.";
    default:
      return "Admission remains unclassified for world formation.";
  }
}

function admissionOnlySummary(
  relationship: FrameworkAdmissionRelationshipRow,
  formationKind: FrameworkAdmissionWorldFormationKind,
  status: FrameworkAdmissionWorldFormationStatus,
): string {
  if (status === FrameworkAdmissionWorldFormationStatus.Open) {
    return `${relationship.exportName} admits ${relationship.to.name}; no downstream world-formation row is currently joined.`;
  }
  if (formationKind === FrameworkAdmissionWorldFormationKind.CatalogExpansion) {
    return `${relationship.exportName} expands catalog ${relationship.to.name} during static admission evaluation.`;
  }
  if (
    formationKind ===
    FrameworkAdmissionWorldFormationKind.RegistryExportAdmission
  ) {
    return `${relationship.exportName} admits registry/configuration export ${relationship.to.name}; execution is a separate world-formation path.`;
  }
  return `${relationship.exportName} admits ${relationship.to.name}; Atlas preserves this as an admission-only fact.`;
}

function appTaskSlotName(row: FrameworkAdmissionRelationshipRow): string | null {
  if (row.helperName?.startsWith("AppTask.") !== true) {
    return null;
  }
  return row.helperName.slice("AppTask.".length);
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
