import type { FrameworkRelationshipRelation } from "../../framework/relationships.js";

export interface FrameworkRelationshipQueryFilters {
  readonly packageId?: string;
  readonly relation?: string;
  readonly query?: string;
}

export interface FrameworkRelationshipQueryRow {
  readonly packageId: string;
  readonly relation: FrameworkRelationshipRelation;
  readonly from: {
    readonly name: string;
  };
  readonly to: {
    readonly name: string;
  };
  readonly summary: string;
}

export function frameworkRelationshipMatchesQuery(
  row: FrameworkRelationshipQueryRow,
  filters: FrameworkRelationshipQueryFilters,
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
