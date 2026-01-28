import type {
  AttributePatternConfig,
  BindingCommandConfig,
  CatalogConfidence,
  CatalogGap,
  ResourceCatalog,
  ResourceCollections,
} from "./types.js";

export function buildResourceCatalog(
  resources: ResourceCollections,
  bindingCommands: Readonly<Record<string, BindingCommandConfig>>,
  attributePatterns: readonly AttributePatternConfig[],
  opts?: {
    gaps?: readonly CatalogGap[];
    confidence?: CatalogConfidence;
  },
): ResourceCatalog {
  return {
    resources,
    bindingCommands,
    attributePatterns,
    gaps: opts?.gaps,
    confidence: opts?.confidence,
  };
}
