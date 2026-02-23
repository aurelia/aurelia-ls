// Semantic Model — L2 canonical authority container
//
// This module defines the SemanticModel (single truth-bearing authority for a project's
// semantic state) and SemanticModelQuery (scope-aware query interface that supersedes
// SemanticsLookup for workspace-level reads).
//
// Architectural commitment:
// - SemanticModel is the ONLY truth-bearing authority. Snapshots, caches, and derived
//   indexes are optimization-only projections.
// - SemanticModelQuery extends SemanticsLookup for backward compatibility with template
//   compilation (link stage) while adding model-level accessors needed by the workspace.
// - Query creation is scope-parameterized: each template compilation gets a scope-specific
//   query, project-level queries use default scope.

import type {
  MaterializedSemantics,
  ResourceCatalog,
  ResourceGraph,
  ResourceScopeId,
  TemplateSyntaxRegistry,
  SemanticsLookup,
  SemanticsLookupOptions,
  LocalImportDef,
  ResourceKind,
  SemanticSnapshot,
  ApiSurfaceSnapshot,
} from "./types.js";
import type { ProjectSnapshot } from "./snapshot.js";
import { buildProjectSnapshot } from "./snapshot.js";
import { createSemanticsLookup } from "./registry.js";
import type { DependencyGraph } from "./dependency-graph.js";
import { createDependencyGraph } from "./dependency-graph.js";
import type {
  ProjectSemanticsDiscoveryResult,
  ProjectSemanticsDefinitionChannels,
  ProjectSemanticsDiscoveryDiagnostic,
  TemplateInfo,
  InlineTemplateInfo,
  FileFacts,
} from "../project-semantics/index.js";
import type { NormalizedPath } from "../model/index.js";
import { stableHash, stableHashSemantics } from "../pipeline/index.js";
import { unwrapSourced } from "./sourced.js";

// ============================================================================
// Semantic Model
// ============================================================================

/**
 * The canonical semantic authority for a project.
 *
 * Wraps a `ProjectSemanticsDiscoveryResult` and provides:
 * - scope-aware queries via `query()` (replaces scattered accessor patterns)
 * - content-derived fingerprint for invalidation
 * - backward-compatible `ProjectSnapshot` via `snapshot()`
 *
 * The model is immutable after creation. To update, create a new model from
 * a fresh discovery result and compare fingerprints.
 */
export interface SemanticModel {
  /** Full discovery result (internal authority — not for direct feature consumption) */
  readonly discovery: ProjectSemanticsDiscoveryResult;
  /** Converged semantics with materialized resources */
  readonly semantics: MaterializedSemantics;
  /** Resource catalog with gap/confidence metadata */
  readonly catalog: ResourceCatalog;
  /** Syntax registry for template parsing */
  readonly syntax: TemplateSyntaxRegistry;
  /** Scope tree */
  readonly resourceGraph: ResourceGraph;
  /** Default scope for project-level queries */
  readonly defaultScope: ResourceScopeId | null;
  /** Content-derived identity (changes when semantic content changes) */
  readonly fingerprint: string;
  /**
   * Dependency graph tracking input→output relationships.
   *
   * Populated at creation time with project-level edges (file→resource, scope, vocabulary).
   * Template compilations add edges via DepRecorder for template-level tracking.
   * Used by the workspace for targeted invalidation (convergence route step 3).
   */
  readonly deps: DependencyGraph;

  /**
   * Create a scope-aware query.
   *
   * For template compilation: pass scope + localImports.
   * For project-level queries: call with no args (uses defaultScope).
   */
  query(opts?: SemanticModelQueryOptions): SemanticModelQuery;

  /**
   * Get the ProjectSnapshot (backward-compat bridge for TemplateProgram).
   * This is an optimization-only projection; query() is the canonical read path.
   */
  snapshot(): ProjectSnapshot;
}

// ============================================================================
// Query Options
// ============================================================================

export interface SemanticModelQueryOptions {
  readonly scope?: ResourceScopeId | null;
  readonly localImports?: readonly LocalImportDef[];
}

// ============================================================================
// Semantic Model Query
// ============================================================================

/**
 * Query interface for semantic model reads.
 *
 * Extends `SemanticsLookup` (backward compatible with template compilation)
 * and adds model-level accessors for templates, definitions, facts, and
 * diagnostics that the workspace needs.
 *
 * The query is scope-aware: resource resolution respects the scope and local
 * imports provided at creation time.
 */
export interface SemanticModelQuery extends SemanticsLookup {
  /** The underlying model this query reads from */
  readonly model: SemanticModel;
  /** Scope tree (read-through from model) */
  readonly graph: ResourceGraph;
  /** Syntax registry (read-through from model) */
  readonly syntax: TemplateSyntaxRegistry;
  /** External templates discovered by the pipeline */
  readonly templates: readonly TemplateInfo[];
  /** Inline templates discovered by the pipeline */
  readonly inlineTemplates: readonly InlineTemplateInfo[];
  /** Definition channels (authority/evidence/convergence) */
  readonly definition: ProjectSemanticsDefinitionChannels;
  /** Per-file extracted facts */
  readonly facts: ReadonlyMap<NormalizedPath, FileFacts>;
  /** Diagnostics from project-semantics discovery */
  readonly discoveryDiagnostics: readonly ProjectSemanticsDiscoveryDiagnostic[];
  /** Semantic symbol snapshot for symbol ID resolution */
  readonly semanticSnapshot: SemanticSnapshot;
  /** API surface snapshot for workspace-level introspection */
  readonly apiSurfaceSnapshot: ApiSurfaceSnapshot;
  /** Get the ProjectSnapshot (optimization-only projection) */
  snapshot(): ProjectSnapshot;
}

// ============================================================================
// Factory
// ============================================================================

export interface CreateSemanticModelOptions {
  /** Override the default scope from the discovery result */
  readonly defaultScope?: ResourceScopeId | null;
}

/**
 * Create a SemanticModel from a discovery result.
 *
 * This is the canonical way to produce a model. The workspace calls this after
 * running `discoverProjectSemantics()` and uses the returned model as its
 * single semantic authority.
 */
export function createSemanticModel(
  discovery: ProjectSemanticsDiscoveryResult,
  options?: CreateSemanticModelOptions,
): SemanticModel {
  const defaultScope = options?.defaultScope
    ?? discovery.semantics.defaultScope
    ?? discovery.resourceGraph.root
    ?? null;

  const semantics: MaterializedSemantics = {
    ...discovery.semantics,
    resourceGraph: discovery.resourceGraph,
    defaultScope: defaultScope ?? undefined,
  };

  const fingerprint = computeModelFingerprint(discovery, semantics);
  const deps = buildModelDependencyGraph(discovery);

  let cachedSnapshot: ProjectSnapshot | undefined;

  const model: SemanticModel = {
    discovery,
    semantics,
    catalog: discovery.catalog,
    syntax: discovery.syntax,
    resourceGraph: discovery.resourceGraph,
    defaultScope,
    fingerprint,
    deps,

    query(opts?: SemanticModelQueryOptions): SemanticModelQuery {
      return createModelQuery(model, opts);
    },

    snapshot(): ProjectSnapshot {
      if (!cachedSnapshot) {
        cachedSnapshot = buildProjectSnapshot(semantics, {
          catalog: discovery.catalog,
          syntax: discovery.syntax,
          resourceGraph: discovery.resourceGraph,
          defaultScope,
        });
      }
      return cachedSnapshot;
    },
  };

  return model;
}

// ============================================================================
// Internal: Query construction
// ============================================================================

function createModelQuery(
  model: SemanticModel,
  opts?: SemanticModelQueryOptions,
): SemanticModelQuery {
  const lookupOpts: SemanticsLookupOptions = {
    graph: model.resourceGraph,
    scope: opts?.scope ?? model.defaultScope,
    localImports: opts?.localImports,
  };

  const lookup = createSemanticsLookup(model.semantics, lookupOpts);

  return {
    // SemanticsLookup delegation
    ...lookup,

    // Model-level access
    model,
    graph: model.resourceGraph,
    syntax: model.syntax,
    templates: model.discovery.templates,
    inlineTemplates: model.discovery.inlineTemplates,
    definition: model.discovery.definition,
    facts: model.discovery.facts,
    discoveryDiagnostics: model.discovery.diagnostics,
    semanticSnapshot: model.discovery.semanticSnapshot,
    apiSurfaceSnapshot: model.discovery.apiSurfaceSnapshot,

    snapshot(): ProjectSnapshot {
      return model.snapshot();
    },
  };
}

// ============================================================================
// Internal: Fingerprint
// ============================================================================

/**
 * Content-derived identity hash over all semantic content.
 *
 * This captures the semantic surface of the model — everything that would
 * affect downstream consumers (template compilation, feature queries, etc.).
 * It excludes TS project metadata (compilerOptions, roots) which are external
 * invalidation signals handled by the workspace.
 */
/**
 * Build the project-level dependency graph from a discovery result.
 *
 * This captures the structural dependencies between files, resources, scopes,
 * and vocabulary that were established during project semantics discovery.
 * Template-level dependencies are added later via DepRecorder during compilation.
 *
 * Graph edges:
 * - convergence-entry → file (each resource depends on its source file)
 * - scope → convergence-entry (each scope references resources)
 * - vocabulary → config (vocabulary depends on binding command/pattern configuration)
 * - file nodes for all analyzed files (available for template compilation recording)
 */
function buildModelDependencyGraph(
  discovery: ProjectSemanticsDiscoveryResult,
): DependencyGraph {
  const graph = createDependencyGraph();

  // 1. Register file nodes for all analyzed files
  for (const [filePath] of discovery.facts) {
    graph.addNode('file', filePath);
  }

  // 2. Register convergence-entry nodes and file→resource edges
  const resourceKinds: readonly ResourceKind[] = [
    'custom-element',
    'custom-attribute',
    'template-controller',
    'value-converter',
    'binding-behavior',
  ];

  for (const def of discovery.definition.authority) {
    const name = unwrapSourced(def.name);
    if (!name) continue;

    const entryKey = `${def.kind}:${name}`;
    const entryNode = graph.addNode('convergence-entry', entryKey);

    // Link resource to its source file
    if (def.file) {
      graph.addDependency(entryNode, graph.addNode('file', def.file));
    }
  }

  // 3. Register scope nodes
  const resourceGraph = discovery.resourceGraph;
  if (resourceGraph) {
    for (const scopeId of Object.keys(resourceGraph.scopes)) {
      const scope = resourceGraph.scopes[scopeId as ResourceScopeId];
      if (!scope) continue;

      const scopeNode = graph.addNode('scope', scopeId);

      // Link scope to resources it contains
      if (scope.resources) {
        for (const kind of resourceKinds) {
          const collection = getResourceCollection(scope.resources, kind);
          if (collection) {
            for (const resourceName of Object.keys(collection)) {
              const entryId = graph.findNode('convergence-entry', `${kind}:${resourceName}`);
              if (entryId) {
                graph.addDependency(scopeNode, entryId);
              }
            }
          }
        }
      }
    }
  }

  // 4. Register vocabulary node (depends on syntax config)
  graph.addNode('vocabulary', 'vocabulary');

  return graph;
}

/** Get the resource collection for a given kind from partial collections. */
function getResourceCollection(
  resources: Partial<import("./types.js").ResourceCollections>,
  kind: ResourceKind,
): Readonly<Record<string, unknown>> | undefined {
  switch (kind) {
    case 'custom-element': return resources.elements;
    case 'custom-attribute': return resources.attributes;
    case 'template-controller': return resources.controllers;
    case 'value-converter': return resources.valueConverters;
    case 'binding-behavior': return resources.bindingBehaviors;
  }
}

function computeModelFingerprint(
  discovery: ProjectSemanticsDiscoveryResult,
  semantics: MaterializedSemantics,
): string {
  return stableHash({
    semantics: stableHashSemantics(semantics),
    catalog: stableHash(discovery.catalog),
    syntax: stableHash(discovery.syntax),
    resourceGraph: stableHash(discovery.resourceGraph),
    templates: discovery.templates.map((t) => ({
      templatePath: t.templatePath,
      componentPath: t.componentPath,
      scopeId: t.scopeId,
    })),
    inlineTemplates: discovery.inlineTemplates.map((t) => ({
      componentPath: t.componentPath,
      scopeId: t.scopeId,
      content: t.content,
    })),
  });
}
