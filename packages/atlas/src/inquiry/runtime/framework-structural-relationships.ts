import {
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipFamily,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import type { SourceProject } from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import type {
  FrameworkObserverEntityRow,
  FrameworkPackageExportRow,
  FrameworkRenderingStructureEntityRow,
  FrameworkRouterEntityRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import { readFrameworkObserverEntities } from "./framework-observer-entities.js";
import {
  readFrameworkRenderingStructures,
  readFrameworkRouterEntities,
} from "./framework-structural-entities.js";
import {
  concreteExportTarget,
  sourceRangeForTarget,
} from "./framework-support.js";
import { frameworkRelationshipMatchesQuery } from "./framework-relationship-utils.js";

export interface FrameworkStructuralRelationshipFilters
  extends FrameworkDiscoveryFilters {
  readonly relation?: string;
}

/** Relationship row derived from framework structural entity catalogs. */
export interface FrameworkStructuralRelationshipRow {
  readonly id: string;
  readonly family:
    | FrameworkRelationshipFamily.Observation
    | FrameworkRelationshipFamily.Rendering
    | FrameworkRelationshipFamily.Router;
  readonly relation:
    | FrameworkRelationshipRelation.DefinesObserver
    | FrameworkRelationshipRelation.DefinesRenderingStructure
    | FrameworkRelationshipRelation.DefinesRouterEntity;
  readonly mechanism: FrameworkRelationshipMechanism.SyntaxProduct;
  readonly phase: FrameworkRelationshipPhase.Definition;
  readonly packageId: string;
  readonly packageName: string;
  readonly from: FrameworkRelationshipEndpoint;
  readonly to: FrameworkRelationshipEndpoint;
  readonly source: SourceRange;
  readonly sourceRowId: string;
  readonly summary: string;
}

export function frameworkStructuralRelationshipProjection(
  family: FrameworkRelationshipFamily,
): string {
  switch (family) {
    case FrameworkRelationshipFamily.Observation:
      return "observers";
    case FrameworkRelationshipFamily.Router:
      return "router-entities";
    case FrameworkRelationshipFamily.Rendering:
    default:
      return "rendering-structures";
  }
}

/** Read observer, rendering-structure, and router entity relationships for mirrors/composition. */
export function readFrameworkStructuralRelationships(
  sourceProject: SourceProject,
  filters: FrameworkStructuralRelationshipFilters,
): readonly FrameworkStructuralRelationshipRow[] {
  return [
    ...readFrameworkObserverEntities(sourceProject, filters).flatMap((row) =>
      structuralRelationship(
        row,
        FrameworkRelationshipFamily.Observation,
        FrameworkRelationshipRelation.DefinesObserver,
        "observer",
        row.observerKinds,
      ),
    ),
    ...readFrameworkRenderingStructures(sourceProject, filters).flatMap((row) =>
      structuralRelationship(
        row,
        FrameworkRelationshipFamily.Rendering,
        FrameworkRelationshipRelation.DefinesRenderingStructure,
        "rendering/lifecycle structure",
        row.renderingStructureKinds,
      ),
    ),
    ...readFrameworkRouterEntities(sourceProject, filters).flatMap((row) =>
      structuralRelationship(
        row,
        FrameworkRelationshipFamily.Router,
        FrameworkRelationshipRelation.DefinesRouterEntity,
        "router entity",
        row.routerKinds,
      ),
    ),
  ]
    .filter((row) => frameworkRelationshipMatchesQuery(row, filters))
    .sort(
      (left, right) =>
        left.family.localeCompare(right.family) ||
        left.packageId.localeCompare(right.packageId) ||
        left.to.name.localeCompare(right.to.name) ||
        left.id.localeCompare(right.id),
    );
}

function structuralRelationship(
  row:
    | FrameworkObserverEntityRow
    | FrameworkRenderingStructureEntityRow
    | FrameworkRouterEntityRow,
  family: FrameworkStructuralRelationshipRow["family"],
  relation: FrameworkStructuralRelationshipRow["relation"],
  label: string,
  roles: readonly string[],
): readonly FrameworkStructuralRelationshipRow[] {
  const base = exportRelationshipBase(row);
  if (base === null) {
    return [];
  }
  return [
    {
      ...base,
      family,
      relation,
      mechanism: FrameworkRelationshipMechanism.SyntaxProduct,
      phase: FrameworkRelationshipPhase.Definition,
      summary: `${row.packageName} defines ${label} ${row.exportEntry.exportName} with ${roles.join(", ")} role(s).`,
    },
  ];
}

function exportRelationshipBase(
  row: FrameworkPackageExportRow,
): Omit<
  FrameworkStructuralRelationshipRow,
  "family" | "relation" | "mechanism" | "phase" | "summary"
> | null {
  const target = concreteExportTarget(row.exportEntry.targets);
  const source = sourceRangeForTarget(target);
  if (source === null) {
    return null;
  }
  return {
    id: `${row.id}:relationship:defines-structural-entity`,
    packageId: row.packageId,
    packageName: row.packageName,
    from: {
      kind: FrameworkRelationshipEndpointKind.Package,
      name: row.packageName,
      packageId: row.packageId,
      packageName: row.packageName,
      source,
    },
    to: {
      kind: FrameworkRelationshipEndpointKind.Symbol,
      name: row.exportEntry.exportName,
      packageId: row.packageId,
      packageName: row.packageName,
      source,
    },
    source,
    sourceRowId: row.id,
  };
}
