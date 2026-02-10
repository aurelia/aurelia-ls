import type {
  CatalogConfidence,
  CatalogGap,
  ResourceCatalog,
  ResourceGraph,
  SemanticSnapshot,
  SemanticSymbolSnapshot,
  MaterializedSemantics,
} from '../compiler.js';
import { sanitizeSourcedSnapshotValue } from "../compiler.js";
import { collectSnapshotResources, type SnapshotIdOptions, type SnapshotResource } from "./shared.js";

const SEMANTIC_SNAPSHOT_VERSION = "aurelia-semantic-snapshot@1";

export interface SemanticSnapshotOptions extends SnapshotIdOptions {
  readonly graph?: ResourceGraph | null;
  readonly catalog?: ResourceCatalog;
  readonly gaps?: readonly CatalogGap[];
  readonly confidence?: CatalogConfidence;
}

export function buildSemanticSnapshot(
  sem: MaterializedSemantics,
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
    data: sanitizeSourcedSnapshotValue(resource.def) as Readonly<Record<string, unknown>>,
  };
}
