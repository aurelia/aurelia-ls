/**
 * Project Discovery — Green Path Entry Point
 *
 * STATUS: stub
 * DEPENDS ON:
 *   - core/graph/          (create graph, wire convergence)
 *   - core/interpret/      (interpretProject — AST to observations)
 *   - core/convergence/    (createConvergence — merge operator)
 *   - core/resource/from-graph  (graphToResourceCatalog)
 *   - core/scope/          (evaluateScopeVisibility)
 *   - core/vocabulary/     (evaluateProjectVocabulary)
 * CONSUMED BY: semantic-workspace engine
 * REPLACES: project-semantics/resolve.ts (discoverProjectSemantics)
 *
 * This module orchestrates the full project discovery pipeline on green
 * types. It composes the independent modules that already exist:
 *
 *   ts.Program
 *     -> interpretProject(files, config)     [core/interpret]
 *     -> graph with per-field conclusions     [core/graph + core/convergence]
 *     -> graphToResourceCatalog(graph)        [core/resource/from-graph]
 *     -> evaluateScopeVisibility(graph)       [core/scope]
 *     -> evaluateProjectVocabulary(graph)     [core/vocabulary]
 *     -> ProjectSemanticsGreen
 *
 * The test harness (harness.ts) already does exactly this composition
 * in its `runInterpreter` + `analyzeTemplate` flow. This module makes
 * it production code with a stable API.
 *
 * OPEN QUESTIONS:
 * - Config shape: what does the caller pass? The old path takes
 *   ProjectSemanticsDiscoveryConfig (conventions, baseSemantics,
 *   diagnostics emitter, etc). The new path needs a subset.
 * - Template discovery: how does the caller learn which templates
 *   belong to which CE? The old path returns TemplateInfo[]. The
 *   new path can derive this from CE conclusion nodes (read the
 *   `file` field, resolve sibling .html, or read inline template).
 * - Diagnostics: gap signals live on FieldValue<T> states in the
 *   catalog. The old path assembled diagnostics eagerly. The new
 *   path can derive them lazily from catalog + scope completeness.
 * - Incremental: first version is full rebuild (interpret all files).
 *   The graph supports targeted re-evaluation (markFileStale +
 *   pull), but the orchestration for incremental isn't built yet.
 */

import type ts from 'typescript';
import type { ResourceCatalogGreen, VocabularyGreen, ScopeCompleteness } from '../resource/types.js';
import type { ProjectDepGraph } from '../graph/types.js';

// ============================================================================
// Output type
// ============================================================================

/**
 * Everything the workspace needs from project discovery.
 *
 * This replaces ProjectSemanticsDiscoveryResult (resolve.ts:109).
 * The old result had 13 fields. This has the essentials; the rest
 * are either derivable or no longer needed.
 */
export interface ProjectSemanticsGreen {
  /** The reactive graph — retained for incremental updates and
   *  red-layer queries (provenance, evidence source). */
  readonly graph: ProjectDepGraph;

  /** All discovered resources, name-indexed. Merges source-analyzed
   *  resources over the builtin catalog. */
  readonly catalog: ResourceCatalogGreen;

  /** Frozen vocabulary (BCs + APs). Must be closed before any
   *  template is analyzed. */
  readonly vocabulary: VocabularyGreen;

  /** Per-CE scope: what resources are visible, and whether negative
   *  assertions are safe. Keys are CE names. */
  readonly scopes: ReadonlyMap<string, ScopedCatalog>;

  // --- NOT YET DESIGNED ---
  // templates: which templates belong to which CE
  //   (derivable from CE conclusion fields — file, inline template)
  // diagnostics: project-level gap signals
  //   (derivable from catalog FieldValue states + scope completeness)
}

export interface ScopedCatalog {
  readonly catalog: ResourceCatalogGreen;
  readonly completeness: ScopeCompleteness;
}

// ============================================================================
// Entry point
// ============================================================================

export interface DiscoveryConfig {
  // TODO: define when implementing
  // Candidates from old config:
  //   packagePath, conventions, baseSemantics, defines,
  //   templateExtensions, styleExtensions
  readonly packagePath?: string;
}

export function discoverProjectSemanticsGreen(
  _program: ts.Program,
  _config?: DiscoveryConfig,
): ProjectSemanticsGreen {
  throw new Error(
    'stub — composition of existing modules. ' +
    'See test/torture-test/harness.ts runInterpreter + analyzeTemplate ' +
    'for the working integration pattern.',
  );
}
