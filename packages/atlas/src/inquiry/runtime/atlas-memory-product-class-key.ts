import type { ProductArchitectureClassSurfaceRow } from "./product-architecture-analysis.js";
import type { AtlasMemoryRecordRow } from "./atlas-memory-contracts.js";

/** Stable identity for product classes tracked by Atlas memory live checks. */
export function atlasMemoryProductClassKey(
  value: ProductArchitectureClassSurfaceRow,
): string {
  return `${value.filePath}:${value.name}`;
}

/** Match the measured class even when the durable threshold no longer fires. */
export function trackedAtlasMemoryProductClassKeys(rows: readonly AtlasMemoryRecordRow[]): ReadonlySet<string> {
  return new Set(rows.flatMap(row => row.liveChecks.flatMap(result =>
    result.check.kind === "product-large-class" && result.productClass !== undefined
      ? [atlasMemoryProductClassKey(result.productClass)]
      : [],
  )));
}
