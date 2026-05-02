import type { FrameworkAdmissionRelationshipRow } from "../../framework/admission.js";
import {
  FrameworkRelationshipClosure,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import type { SourceProject } from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import {
  readFrameworkMaterializationIndex,
  type FrameworkMaterializationInstantiationKind,
  type FrameworkMaterializationInstantiationRow,
} from "./framework-materialization-lenses.js";
import {
  FrameworkResourceInstantiationKind,
  type FrameworkResourceInstantiationRow,
} from "./framework-resource-materialization.js";

/** Bridge class from admission rows to runtime-existence/materialization rows. */
export const enum FrameworkAdmissionMaterializationLinkKind {
  /** An admitted DI key has visible provider/runtime-existence evidence. */
  DiKeyInstantiation = "di-key-instantiation",
  /** An admitted framework resource has visible runtime/compiler/evaluator materialization evidence. */
  ResourceInstantiation = "resource-instantiation",
}

/** Exact matching basis used to join admission rows to materialization rows. */
export const enum FrameworkAdmissionMaterializationMatchBasis {
  /** The admitted DI key name exactly matched a key-instantiation row. */
  DiKeyName = "di-key-name",
  /** The admitted DI target name exactly matched the provider endpoint. */
  DiProviderName = "di-provider-name",
  /** The admitted resource source range matched the resource carrier. */
  ResourceSourceCarrier = "resource-source-carrier",
  /** The admitted resource target matched the local resource target name. */
  ResourceTargetName = "resource-target-name",
  /** The admitted resource target matched the exported carrier name. */
  ResourceExportName = "resource-export-name",
  /** The admitted resource target matched the static resource lookup name. */
  ResourceLookupName = "resource-lookup-name",
}

/** Filters understood by admission-to-materialization link reads. */
export interface FrameworkAdmissionMaterializationFilters {
  readonly packageId?: string;
  readonly exportName?: string;
  readonly relation?: string;
  readonly resourceKind?: string;
  readonly targetName?: string;
  readonly key?: string;
  readonly linkKind?: string;
  readonly materializationKind?: string;
  readonly matchBasis?: string;
  readonly query?: string;
}

/** Compact row joining one admitted target to visible materialization evidence. */
export interface FrameworkAdmissionMaterializationLinkRow {
  /** Stable bridge row id. */
  readonly id: string;
  /** Package that owns the admitting bundle/configuration source. */
  readonly packageId: string;
  /** Package name from source admission. */
  readonly packageName: string;
  /** Exported configuration or bundle name that admitted the target. */
  readonly exportName: string;
  /** Source admission relationship row id. */
  readonly admissionRelationshipId: string;
  /** Admission relation that produced this bridge. */
  readonly admissionRelation:
    | FrameworkRelationshipRelation.AdmitsDiKey
    | FrameworkRelationshipRelation.AdmitsResource;
  /** Source bundle association classifier that admitted the target. */
  readonly associationKind: string;
  /** Whether this is a DI key or resource materialization bridge. */
  readonly linkKind: FrameworkAdmissionMaterializationLinkKind;
  /** Exact basis that joined admission to materialization. */
  readonly matchBasis: FrameworkAdmissionMaterializationMatchBasis;
  /** Target endpoint admitted by the configuration/bundle. */
  readonly admittedTarget: FrameworkRelationshipEndpoint;
  /** Runtime-existence/materialization target endpoint. */
  readonly materializedTarget: FrameworkRelationshipEndpoint;
  /** Stable id of the materialization row to inspect next. */
  readonly materializationId: string;
  /** Materialization row kind. */
  readonly materializationKind:
    | FrameworkMaterializationInstantiationKind
    | FrameworkResourceInstantiationKind;
  /** Materialization route id when this bridge targets a DI key instantiation row. */
  readonly routeId?: string;
  /** Resource definition kind when this bridge targets a resource instantiation row. */
  readonly resourceKind?: string;
  /** Site kinds observed on the materialization side. */
  readonly materializationSiteKinds: readonly string[];
  /** Shared framework relations observed on the materialization side. */
  readonly materializationRelations: readonly FrameworkRelationshipRelation[];
  /** Shared framework mechanisms observed on the materialization side. */
  readonly materializationMechanisms: readonly FrameworkRelationshipMechanism[];
  /** Shared framework phases observed on the materialization side. */
  readonly materializationPhases: readonly FrameworkRelationshipPhase[];
  /** Closure class for the materialization claim. */
  readonly closure: FrameworkRelationshipClosure;
  /** Source range for the admission expression. */
  readonly source: SourceRange;
  /** Source range for the materialization row. */
  readonly materializationSource: SourceRange;
  /** Human-facing row summary. */
  readonly summary: string;
}

/** Join admission relationships to materialization rows without projecting an answer. */
export function readFrameworkAdmissionMaterializationLinks(
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
  /** Admission relationship rows already scoped by the caller. */
  relationships: readonly FrameworkAdmissionRelationshipRow[],
  /** Optional bridge filters. */
  filters: FrameworkAdmissionMaterializationFilters,
): readonly FrameworkAdmissionMaterializationLinkRow[] {
  const materialization = readFrameworkMaterializationIndex(sourceProject);
  return relationships
    .flatMap((relationship) => {
      switch (relationship.relation) {
        case FrameworkRelationshipRelation.AdmitsDiKey:
          return materialization.instantiations.flatMap((instantiation) =>
            diLinkForInstantiation(relationship, instantiation),
          );
        case FrameworkRelationshipRelation.AdmitsResource:
          return materialization.resourceInstantiations.flatMap((resource) =>
            resourceLinkForInstantiation(relationship, resource),
          );
        default:
          return [];
      }
    })
    .filter((row) => linkMatches(row, filters))
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.exportName.localeCompare(right.exportName) ||
        left.admittedTarget.name.localeCompare(right.admittedTarget.name) ||
        left.materializationKind.localeCompare(right.materializationKind) ||
        left.materializationId.localeCompare(right.materializationId),
    );
}

function diLinkForInstantiation(
  relationship: FrameworkAdmissionRelationshipRow,
  instantiation: FrameworkMaterializationInstantiationRow,
): readonly FrameworkAdmissionMaterializationLinkRow[] {
  const matchBasis = diMatchBasis(relationship, instantiation);
  if (matchBasis === null) {
    return [];
  }
  return [
    {
      id: `${relationship.id}:materialization:${instantiation.id}`,
      packageId: relationship.packageId,
      packageName: relationship.packageName,
      exportName: relationship.exportName,
      admissionRelationshipId: relationship.id,
      admissionRelation: FrameworkRelationshipRelation.AdmitsDiKey,
      associationKind: relationship.associationKind,
      linkKind: FrameworkAdmissionMaterializationLinkKind.DiKeyInstantiation,
      matchBasis,
      admittedTarget: relationship.to,
      materializedTarget: instantiation.provider,
      materializationId: instantiation.id,
      materializationKind: instantiation.instantiationKind,
      routeId: instantiation.routeId,
      materializationSiteKinds: instantiation.constructionSites.map(
        (site) => site.siteKind,
      ),
      materializationRelations: [
        FrameworkRelationshipRelation.InstantiatesKey,
        ...unique(instantiation.constructionSites.map((site) => site.relation)),
      ],
      materializationMechanisms: unique(
        instantiation.constructionSites.map((site) => site.mechanism),
      ),
      materializationPhases: [FrameworkRelationshipPhase.Materialization],
      closure: instantiation.closure,
      source: relationship.source,
      materializationSource: instantiation.source,
      summary: `${relationship.exportName} admits DI key ${relationship.to.name}; ${instantiation.summary}`,
    },
  ];
}

function diMatchBasis(
  relationship: FrameworkAdmissionRelationshipRow,
  instantiation: FrameworkMaterializationInstantiationRow,
): FrameworkAdmissionMaterializationMatchBasis | null {
  const names = admissionTargetNames(relationship);
  if (names.has(instantiation.key)) {
    return FrameworkAdmissionMaterializationMatchBasis.DiKeyName;
  }
  if (names.has(instantiation.provider.name)) {
    return FrameworkAdmissionMaterializationMatchBasis.DiProviderName;
  }
  return null;
}

function resourceLinkForInstantiation(
  relationship: FrameworkAdmissionRelationshipRow,
  resource: FrameworkResourceInstantiationRow,
): readonly FrameworkAdmissionMaterializationLinkRow[] {
  const matchBasis = resourceMatchBasis(relationship, resource);
  if (matchBasis === null) {
    return [];
  }
  const siteKinds = unique(resource.materializationSites.map((site) => site.siteKind));
  const relations = unique(
    resource.materializationSites.map((site) => site.relation),
  );
  const mechanisms = unique(
    resource.materializationSites.map((site) => site.mechanism),
  );
  const phases = unique(resource.materializationSites.map((site) => site.phase));
  return [
    {
      id: `${relationship.id}:materialization:${resource.id}`,
      packageId: relationship.packageId,
      packageName: relationship.packageName,
      exportName: relationship.exportName,
      admissionRelationshipId: relationship.id,
      admissionRelation: FrameworkRelationshipRelation.AdmitsResource,
      associationKind: relationship.associationKind,
      linkKind: FrameworkAdmissionMaterializationLinkKind.ResourceInstantiation,
      matchBasis,
      admittedTarget: relationship.to,
      materializedTarget: resource.resource,
      materializationId: resource.id,
      materializationKind: resource.instantiationKind,
      resourceKind: resource.resourceKind,
      materializationSiteKinds: siteKinds,
      materializationRelations: relations,
      materializationMechanisms: mechanisms,
      materializationPhases: phases,
      closure: resource.closure,
      source: relationship.source,
      materializationSource: resource.source,
      summary: `${relationship.exportName} admits ${resource.resourceKind} ${relationship.to.name}; ${resource.summary}`,
    },
  ];
}

function resourceMatchBasis(
  relationship: FrameworkAdmissionRelationshipRow,
  resource: FrameworkResourceInstantiationRow,
): FrameworkAdmissionMaterializationMatchBasis | null {
  if (
    relationship.to.resourceKind !== undefined &&
    relationship.to.resourceKind !== resource.resourceKind
  ) {
    return null;
  }
  if (
    relationship.to.source !== undefined &&
    sourceRangeKey(relationship.to.source) === sourceRangeKey(resource.source)
  ) {
    return FrameworkAdmissionMaterializationMatchBasis.ResourceSourceCarrier;
  }
  const names = admissionTargetNames(relationship);
  if (resource.targetName !== null && names.has(resource.targetName)) {
    return FrameworkAdmissionMaterializationMatchBasis.ResourceTargetName;
  }
  if (names.has(resource.sourceExportName)) {
    return FrameworkAdmissionMaterializationMatchBasis.ResourceExportName;
  }
  if (resource.resourceName !== null && names.has(resource.resourceName)) {
    return FrameworkAdmissionMaterializationMatchBasis.ResourceLookupName;
  }
  return null;
}

function admissionTargetNames(
  relationship: FrameworkAdmissionRelationshipRow,
): ReadonlySet<string> {
  return new Set(
    [
      relationship.to.name,
      relationship.to.resourceName,
      relationship.targetName,
      relationship.catalogName,
    ].filter((name): name is string => typeof name === "string" && name.length > 0),
  );
}

function linkMatches(
  row: FrameworkAdmissionMaterializationLinkRow,
  filters: FrameworkAdmissionMaterializationFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.exportName === undefined || row.exportName === filters.exportName) &&
    (filters.relation === undefined || row.admissionRelation === filters.relation) &&
    (filters.resourceKind === undefined || row.resourceKind === filters.resourceKind) &&
    (filters.targetName === undefined ||
      row.admittedTarget.name === filters.targetName ||
      row.materializedTarget.name === filters.targetName) &&
    (filters.key === undefined ||
      row.admittedTarget.name === filters.key ||
      row.materializedTarget.name === filters.key) &&
    (filters.linkKind === undefined || row.linkKind === filters.linkKind) &&
    (filters.materializationKind === undefined ||
      row.materializationKind === filters.materializationKind) &&
    (filters.matchBasis === undefined || row.matchBasis === filters.matchBasis) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.exportName.includes(filters.query) ||
      row.admittedTarget.name.includes(filters.query) ||
      row.materializedTarget.name.includes(filters.query) ||
      row.materializationSiteKinds.some((kind) => kind.includes(filters.query!)))
  );
}

function sourceRangeKey(range: SourceRange): string {
  return `${range.filePath}:${range.start.line}:${range.start.character}:${range.end.line}:${range.end.character}`;
}

function unique<TValue extends string>(values: readonly TValue[]): readonly TValue[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
