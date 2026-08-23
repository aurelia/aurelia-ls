import { groupBy } from "../../collections.js";
import {
  isProductArchitectureSameHandleFanOutCandidate,
  type ProductArchitectureProvenanceExpressionOrigin,
} from "./product-architecture-kernel-records.js";

export interface ProductArchitectureFieldProvenancePressureRow {
  readonly filePath: string;
  readonly ownerFunctionName: string | null;
  readonly fieldNameLiteral: string | null;
  readonly fieldNameExpression: string | null;
  readonly provenanceExpression: string | null;
  readonly provenanceExpressionOrigin: ProductArchitectureProvenanceExpressionOrigin;
}

/** One source owner and lexical handle expression with enough distinct fields to warrant fan-out review. */
export interface ProductArchitectureSameHandleFanOutGroup<
  TRow extends ProductArchitectureFieldProvenancePressureRow = ProductArchitectureFieldProvenancePressureRow,
> {
  readonly owner: string;
  readonly provenanceExpression: string;
  readonly rows: readonly TRow[];
  readonly fieldCount: number;
}

/** Group rows except proven one-entry/one-return callback switch remaps. */
export function productArchitectureSameHandleFanOutGroups<
  TRow extends ProductArchitectureFieldProvenancePressureRow,
>(
  rows: readonly TRow[],
): readonly ProductArchitectureSameHandleFanOutGroup<TRow>[] {
  return [...groupBy(rows.filter(isProductArchitectureSameHandleFanOutCandidate), (row) =>
    `${productArchitectureOwnerLabel(row)}\u0000${row.provenanceExpression ?? "(unknown provenance expression)"}`
  )]
    .map(([, group]) => ({
      owner: productArchitectureOwnerLabel(group[0]!),
      provenanceExpression: group[0]!.provenanceExpression ?? "(unknown provenance expression)",
      rows: group,
      fieldCount: new Set(group.map(productArchitectureFieldProvenanceLabel)).size,
    }))
    .filter((group) => group.rows.length >= 4 && group.fieldCount >= 2)
    .sort((left, right) =>
      right.rows.length - left.rows.length ||
      right.fieldCount - left.fieldCount ||
      left.owner.localeCompare(right.owner) ||
      left.provenanceExpression.localeCompare(right.provenanceExpression)
    );
}

export function productArchitectureOwnerLabel(
  row: Pick<ProductArchitectureFieldProvenancePressureRow, "filePath" | "ownerFunctionName">,
): string {
  return `${row.filePath} :: ${row.ownerFunctionName ?? "(module top level)"}`;
}

export function productArchitectureFieldProvenanceLabel(
  row: Pick<
    ProductArchitectureFieldProvenancePressureRow,
    "fieldNameLiteral" | "fieldNameExpression"
  >,
): string {
  return row.fieldNameLiteral ?? row.fieldNameExpression ?? "(dynamic field name)";
}
