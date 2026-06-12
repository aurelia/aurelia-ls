import type { ProductArchitectureClassSurfaceRow } from "./product-architecture-analysis.js";
import type { AtlasMemoryProductLargeClassCheck } from "./atlas-memory-contracts.js";

/** Stable identity for product classes tracked by Atlas memory live checks. */
export function atlasMemoryProductClassKey(
  value: ProductArchitectureClassSurfaceRow | AtlasMemoryProductLargeClassCheck,
): string {
  const filePath = value.filePath;
  const className = "className" in value ? value.className : value.name;
  return `${filePath ?? "*"}:${className}`;
}
