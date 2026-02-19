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
  const gaps = opts?.gaps;
  const { gapsByResource, projectLevelGaps } = buildGapIndex(gaps);
  return {
    resources,
    bindingCommands,
    attributePatterns,
    gaps,
    confidence: opts?.confidence,
    gapsByResource,
    projectLevelGaps,
  };
}

function buildGapIndex(gaps?: readonly CatalogGap[]): {
  gapsByResource: Readonly<Record<string, readonly CatalogGap[]>>;
  projectLevelGaps: readonly CatalogGap[];
} {
  if (!gaps || gaps.length === 0) {
    return { gapsByResource: {}, projectLevelGaps: [] };
  }
  const byResource: Record<string, CatalogGap[]> = {};
  const projectLevel: CatalogGap[] = [];
  for (const gap of gaps) {
    if (gap.resourceKind && gap.resourceName) {
      const key = `${gap.resourceKind}:${gap.resourceName}`;
      (byResource[key] ??= []).push(gap);
    } else {
      projectLevel.push(gap);
    }
  }
  return { gapsByResource: byResource, projectLevelGaps: projectLevel };
}
