import type {
  CatalogConfidence,
  CatalogGap,
  ResourceCatalog,
  ResourceGraph,
  SemanticSnapshot,
  SemanticSymbolSnapshot,
  SemanticsWithCaches,
} from '../compiler.js';
import { collectSnapshotResources, type SnapshotIdOptions, type SnapshotResource } from "./shared.js";

const SEMANTIC_SNAPSHOT_VERSION = "aurelia-semantic-snapshot@1";

export interface SemanticSnapshotOptions extends SnapshotIdOptions {
  readonly graph?: ResourceGraph | null;
  readonly catalog?: ResourceCatalog;
  readonly gaps?: readonly CatalogGap[];
  readonly confidence?: CatalogConfidence;
}

export function buildSemanticSnapshot(
  sem: SemanticsWithCaches,
  options?: SemanticSnapshotOptions,
): SemanticSnapshot {
  const resources = collectSnapshotResources(sem, options);
  const symbols = resources.map(toSemanticSymbolSnapshot);
  const catalog = options?.catalog ?? sem.catalog;
  const graph = options?.graph ?? sem.resourceGraph;
  const gaps = options?.gaps ?? catalog?.gaps;
  const confidence = options?.confidence ?? catalog?.confidence;

  return {
    version: SEMANTIC_SNAPSHOT_VERSION,
    symbols,
    ...(catalog ? { catalog } : {}),
    ...(graph !== undefined ? { graph } : {}),
    ...(gaps ? { gaps } : {}),
    ...(confidence ? { confidence } : {}),
  };
}

function toSemanticSymbolSnapshot(resource: SnapshotResource): SemanticSymbolSnapshot {
  return {
    id: resource.id,
    kind: resource.def.kind,
    name: resource.name,
    ...(resource.def.file ? { source: resource.def.file } : {}),
    data: sanitizeSnapshotData(resource.def) as Readonly<Record<string, unknown>>,
  };
}

function sanitizeSnapshotData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeSnapshotData(entry));
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      if (key === "node") continue;
      out[key] = sanitizeSnapshotData(obj[key]);
    }
    return out;
  }
  return value;
}
