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
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import type { FrameworkExpressionEntityRow } from "./framework-entities.js";
import { readFrameworkExpressionEntities } from "./framework-structural-entities.js";
import {
  concreteExportTarget,
  sourceRangeForTarget,
} from "./framework-support.js";

export interface FrameworkExpressionRelationshipFilters
  extends FrameworkDiscoveryFilters {
  readonly relation?: string;
}

/** Relationship row derived from public expression/parser framework entities. */
export interface FrameworkExpressionRelationshipRow {
  readonly id: string;
  readonly family: FrameworkRelationshipFamily.Expression;
  readonly relation: FrameworkRelationshipRelation.DefinesExpression;
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

/** Read expression/parser entity relationships suitable for auLink and composition mirrors. */
export function readFrameworkExpressionRelationships(
  sourceProject: SourceProject,
  filters: FrameworkExpressionRelationshipFilters,
): readonly FrameworkExpressionRelationshipRow[] {
  return readFrameworkExpressionEntities(sourceProject, filters)
    .map(expressionRelationship)
    .filter((row): row is FrameworkExpressionRelationshipRow => row !== null)
    .filter((row) => expressionRelationshipMatches(row, filters))
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.to.name.localeCompare(right.to.name) ||
        left.id.localeCompare(right.id),
    );
}

function expressionRelationship(
  row: FrameworkExpressionEntityRow,
): FrameworkExpressionRelationshipRow | null {
  const target = concreteExportTarget(row.exportEntry.targets);
  const source = sourceRangeForTarget(target);
  if (source === null) {
    return null;
  }
  return {
    id: `${row.id}:relationship:defines-expression`,
    family: FrameworkRelationshipFamily.Expression,
    relation: FrameworkRelationshipRelation.DefinesExpression,
    mechanism: FrameworkRelationshipMechanism.SyntaxProduct,
    phase: FrameworkRelationshipPhase.Definition,
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
    summary: `${row.packageName} defines expression entity ${row.exportEntry.exportName} with ${row.expressionKinds.join(", ")} role(s).`,
  };
}

function expressionRelationshipMatches(
  row: FrameworkExpressionRelationshipRow,
  filters: FrameworkExpressionRelationshipFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.query === undefined ||
      row.from.name.includes(filters.query) ||
      row.to.name.includes(filters.query) ||
      row.summary.includes(filters.query))
  );
}
