import type {
  LocalImportDef,
  ResourceCatalog,
  ResourceGraph,
  ResourceScopeId,
  Semantics,
  SemanticsWithCaches,
  TemplateSyntaxRegistry,
} from "./types.js";
import { materializeSemanticsForScope } from "./resource-graph.js";
import { buildTemplateSyntaxRegistry } from "./registry.js";

export interface SemanticsSnapshot {
  readonly semantics: SemanticsWithCaches;
  readonly catalog: ResourceCatalog;
  readonly syntax: TemplateSyntaxRegistry;
  readonly scopeId: ResourceScopeId | null;
  readonly resourceGraph: ResourceGraph | null;
}

export interface SemanticsSnapshotOptions {
  readonly resourceGraph?: ResourceGraph | null;
  readonly resourceScope?: ResourceScopeId | null;
  readonly localImports?: readonly LocalImportDef[];
  readonly catalog?: ResourceCatalog;
  readonly syntax?: TemplateSyntaxRegistry;
}

export function buildSemanticsSnapshot(
  base: Semantics,
  options: SemanticsSnapshotOptions = {},
): SemanticsSnapshot {
  const graph = options.resourceGraph ?? base.resourceGraph ?? null;
  const scopeId = options.resourceScope ?? base.defaultScope ?? graph?.root ?? null;
  const sem = materializeSemanticsForScope(base, graph, scopeId, options.localImports);
  const hasLocalImports = !!(options.localImports && options.localImports.length > 0);
  const useCatalogOverride = !!(options.catalog && !hasLocalImports);
  const catalog = useCatalogOverride ? options.catalog! : sem.catalog;
  const semantics = useCatalogOverride ? { ...sem, catalog } : sem;
  const syntax = options.syntax ?? buildTemplateSyntaxRegistry(semantics);
  return {
    semantics,
    catalog,
    syntax,
    scopeId: scopeId ?? null,
    resourceGraph: graph,
  };
}
