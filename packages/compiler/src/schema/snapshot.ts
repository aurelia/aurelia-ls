import type {
  LocalImportDef,
  ResourceCatalog,
  ResourceGraph,
  ResourceScopeId,
  ProjectSemantics,
  MaterializedSemantics,
  TemplateSyntaxRegistry,
} from "./types.js";
import { materializeSemanticsForScope } from "./resource-graph.js";
import { buildTemplateSyntaxRegistry, prepareProjectSemantics } from "./registry.js";

export interface TemplateContext {
  readonly scopeId?: ResourceScopeId | null;
  readonly localImports?: readonly LocalImportDef[];
}

export interface ProjectSnapshot {
  readonly semantics: MaterializedSemantics;
  readonly catalog: ResourceCatalog;
  readonly syntax: TemplateSyntaxRegistry;
  readonly resourceGraph: ResourceGraph | null;
  readonly defaultScope: ResourceScopeId | null;
}

export interface ProjectSnapshotOptions {
  readonly catalog?: ResourceCatalog;
  readonly syntax?: TemplateSyntaxRegistry;
  readonly resourceGraph?: ResourceGraph | null;
  readonly defaultScope?: ResourceScopeId | null;
}

export interface SemanticsSnapshot {
  readonly semantics: MaterializedSemantics;
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

export function buildProjectSnapshot(
  base: ProjectSemantics,
  options: ProjectSnapshotOptions = {},
): ProjectSnapshot {
  const prepared = prepareProjectSemantics(base, options.catalog ? { catalog: options.catalog } : undefined);
  const graph = options.resourceGraph ?? prepared.resourceGraph ?? null;
  const defaultScope = options.defaultScope ?? prepared.defaultScope ?? graph?.root ?? null;
  const catalog = options.catalog ?? prepared.catalog;
  const semantics = {
    ...prepared,
    catalog,
    resourceGraph: graph ?? undefined,
    defaultScope: defaultScope ?? undefined,
  };
  const syntax = options.syntax ?? buildTemplateSyntaxRegistry(semantics);
  return {
    semantics,
    catalog,
    syntax,
    resourceGraph: graph,
    defaultScope,
  };
}

export function buildSemanticsSnapshotFromProject(
  project: ProjectSnapshot,
  context: TemplateContext = {},
): SemanticsSnapshot {
  const graph = project.resourceGraph ?? null;
  const scopeId = context.scopeId ?? project.defaultScope ?? graph?.root ?? null;
  const sem = materializeSemanticsForScope(project.semantics, graph, scopeId, context.localImports);
  const hasLocalImports = !!(context.localImports && context.localImports.length > 0);
  const catalog = hasLocalImports ? sem.catalog : project.catalog;
  const semantics = hasLocalImports ? sem : { ...sem, catalog };
  const syntax = project.syntax;
  return {
    semantics,
    catalog,
    syntax,
    scopeId: scopeId ?? null,
    resourceGraph: graph,
  };
}

export function buildSemanticsSnapshot(
  base: ProjectSemantics,
  options: SemanticsSnapshotOptions = {},
): SemanticsSnapshot {
  const project = buildProjectSnapshot(base, {
    catalog: options.catalog,
    syntax: options.syntax,
    resourceGraph: options.resourceGraph,
    ...(options.resourceScope !== undefined ? { defaultScope: options.resourceScope } : {}),
  });
  const context: TemplateContext = {
    ...(options.resourceScope !== undefined ? { scopeId: options.resourceScope } : {}),
    ...(options.localImports ? { localImports: options.localImports } : {}),
  };
  return buildSemanticsSnapshotFromProject(project, context);
}
