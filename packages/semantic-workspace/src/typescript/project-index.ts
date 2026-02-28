import { DiagnosticsRuntime } from "@aurelia-ls/compiler/diagnostics/runtime.js";
import type { NormalizedPath } from "@aurelia-ls/compiler/model/identity.js";
import { IncrementalDiscovery } from "@aurelia-ls/compiler/project-semantics/incremental.js";
import type { DepNodeId, DependencyGraph } from "@aurelia-ls/compiler/schema/dependency-graph.js";
import { createSemanticModel, type SemanticModel } from "@aurelia-ls/compiler/schema/model.js";
import { BUILTIN_SEMANTICS, prepareProjectSemantics } from "@aurelia-ls/compiler/schema/registry.js";
import type { MaterializedSemantics, ResourceScopeId } from "@aurelia-ls/compiler/schema/types.js";
import type { ProjectSemanticsDiscoveryConfig, ProjectSemanticsDiscoveryResult } from "@aurelia-ls/compiler/project-semantics/resolve.js";
import { hasThirdPartyResources } from "@aurelia-ls/compiler/project-semantics/third-party/merge.js";
import { applyThirdPartyResources } from "@aurelia-ls/compiler/project-semantics/third-party/resolution.js";
import type { ThirdPartyDiscoveryResult } from "@aurelia-ls/compiler/project-semantics/third-party/types.js";
import type { Logger } from "@aurelia-ls/compiler/project-semantics/types.js";
import { createProjectDepGraph } from "@aurelia-ls/compiler/project-semantics/deps/graph.js";
import type { ProjectDepGraph } from "@aurelia-ls/compiler/project-semantics/deps/types.js";
import { interpretProject, createUnitEvaluator } from "@aurelia-ls/compiler/project-semantics/interpret/interpreter.js";
import { canonicalPath } from "@aurelia-ls/compiler/project-semantics/util/naming.js";
import type { TypeScriptProject } from "./project.js";

export interface AureliaProjectIndexOptions {
  readonly ts: TypeScriptProject;
  readonly logger: Logger;
  readonly discovery?: ProjectSemanticsDiscoveryConfigBase;
  /** Pre-computed discovery result — skips the initial discovery pipeline. */
  readonly seededDiscovery?: ProjectSemanticsDiscoveryResult;
}

type ProjectSemanticsDiscoveryConfigBase = Omit<ProjectSemanticsDiscoveryConfig, "diagnostics">;

/**
 * Bridge between TypeScript project state and SemanticModel.
 *
 * Runs `discoverProjectSemantics()` against the TS program and produces
 * a `SemanticModel` — the canonical semantic authority for the project.
 * All semantic reads go through `currentModel().query()`.
 *
 * Responsibilities:
 * - Holds TS project reference and discovery config
 * - Runs discovery on refresh
 * - Produces SemanticModel via createSemanticModel()
 * - Applies third-party overlays
 * - Uses dependency graph for targeted invalidation scoping
 */
export class AureliaProjectIndex {
  #ts: TypeScriptProject;
  #logger: Logger;
  #baseSemantics: MaterializedSemantics;
  #defaultScope: ResourceScopeId | null;
  #discoveryConfig: ProjectSemanticsDiscoveryConfigBase;
  #discovery: IncrementalDiscovery;

  #model: SemanticModel;
  #thirdPartyOverlay: ThirdPartyDiscoveryResult | null = null;
  #depGraph: ProjectDepGraph | null = null;

  constructor(options: AureliaProjectIndexOptions) {
    this.#ts = options.ts;
    this.#logger = options.logger;
    const discoveryConfig = options.discovery ?? {};
    this.#baseSemantics = prepareProjectSemantics(discoveryConfig.baseSemantics ?? BUILTIN_SEMANTICS);
    this.#defaultScope = discoveryConfig.defaultScope ?? null;
    this.#discoveryConfig = {
      ...discoveryConfig,
      baseSemantics: this.#baseSemantics,
      defaultScope: this.#defaultScope ?? discoveryConfig.defaultScope,
    };
    this.#discovery = new IncrementalDiscovery();

    if (options.seededDiscovery) {
      this.#model = createSemanticModel(options.seededDiscovery, {
        defaultScope: this.#defaultScope,
      });
    } else {
      this.#model = this.#buildModel();
    }
  }

  /** The current semantic model — single source of truth. */
  currentModel(): SemanticModel {
    return this.#model;
  }

  clearDiscoveryCache(): void {
    this.#discovery.clear();
  }

  refresh(): void {
    const prevFingerprint = this.#model.fingerprint;
    const prevGraph = this.#model.deps;
    this.#model = this.#buildModelWithInvalidation(prevGraph);
    const status = this.#model.fingerprint !== prevFingerprint ? "updated" : "unchanged";
    this.#logger.info(`[index] refresh ${status} fingerprint=${this.#model.fingerprint}`);
  }

  /**
   * Merge third-party npm resources into the current model.
   *
   * Called after async npm analysis completes. Creates a new model
   * from the merged discovery result.
   *
   * @returns true if the overlay changed semantic content
   */
  applyThirdPartyOverlay(thirdParty: ThirdPartyDiscoveryResult): boolean {
    const hasResources = hasThirdPartyResources(thirdParty.resources);
    const hasGaps = thirdParty.gaps.length > 0;
    if (!hasResources && !hasGaps) return false;

    // Store for replay after incremental rebuilds (level 3 in #buildModelWithInvalidation)
    this.#thirdPartyOverlay = thirdParty;

    const merged = applyThirdPartyResources(this.#model.discovery, thirdParty.resources, {
      gaps: thirdParty.gaps,
      confidence: thirdParty.confidence,
    });

    const prevFingerprint = this.#model.fingerprint;
    this.#model = createSemanticModel(merged, {
      defaultScope: this.#defaultScope,
    });
    return this.#model.fingerprint !== prevFingerprint;
  }

  /**
   * Build a new model using dependency-graph-driven invalidation.
   *
   * Uses three levels of incrementality:
   * 1. No file content changes → keep existing model entirely.
   * 2. Content changed but facts structurally identical → keep existing model
   *    (IncrementalDiscovery skipped stages 2-10 via fact fingerprint).
   * 3. Facts changed → use previous dep graph to scope what's affected,
   *    then build new model from fresh discovery result.
   */
  #buildModelWithInvalidation(prevGraph: DependencyGraph): SemanticModel {
    const program = this.#ts.getProgram();
    const diagnostics = new DiagnosticsRuntime();
    const result = this.#discovery.refresh(
      program,
      { ...this.#discoveryConfig, diagnostics: diagnostics.forSource("project") },
      this.#logger,
    );

    // Level 1: No files changed at all → keep existing model
    if (!result.hasChanges) {
      this.#logger.info("[index] no file changes, retaining current model");
      return this.#model;
    }

    // Level 2: Content changed but facts structurally identical → keep existing model.
    // IncrementalDiscovery already skipped stages 2-10 and returned the cached result.
    if (!result.hasFactChanges) {
      this.#logger.info(
        `[index] ${result.changedFiles.size} files changed content but facts unchanged — retaining model`,
      );
      return this.#model;
    }

    // Level 3: Facts changed → use dep graph to identify affected downstream nodes.
    const affectedNodes = this.#findAffectedFromGraph(
      prevGraph,
      result.factsChangedFiles,
      result.removedFiles,
    );

    this.#logger.info(
      `[index] ${result.factsChangedFiles.size} files with fact changes → ${affectedNodes.length} affected nodes — rebuilding model`,
    );

    // Build new model from the fresh discovery result.
    // Re-apply third-party overlay if previously applied — the overlay
    // is not part of the IncrementalDiscovery result and would otherwise
    // be lost on fact-level rebuilds.
    let discovery = result.discovery;
    if (this.#thirdPartyOverlay && hasThirdPartyResources(this.#thirdPartyOverlay.resources)) {
      discovery = applyThirdPartyResources(discovery, this.#thirdPartyOverlay.resources, {
        gaps: this.#thirdPartyOverlay.gaps,
        confidence: this.#thirdPartyOverlay.confidence,
      });
    }
    return createSemanticModel(discovery, {
      defaultScope: this.#defaultScope,
    });
  }

  /**
   * Query the previous dependency graph to find all transitively affected nodes
   * when the given files changed.
   */
  #findAffectedFromGraph(
    graph: DependencyGraph,
    changedFiles: ReadonlySet<NormalizedPath>,
    removedFiles: ReadonlySet<NormalizedPath>,
  ): DepNodeId[] {
    const changedNodeIds: DepNodeId[] = [];

    for (const filePath of changedFiles) {
      const nodeId = graph.findNode('file', filePath);
      if (nodeId) changedNodeIds.push(nodeId);
    }
    for (const filePath of removedFiles) {
      const nodeId = graph.findNode('file', filePath);
      if (nodeId) changedNodeIds.push(nodeId);
    }

    if (changedNodeIds.length === 0) return [];
    return graph.getAffected(changedNodeIds);
  }

  /** Initial model build (no previous graph available). */
  #buildModel(): SemanticModel {
    const program = this.#ts.getProgram();
    const diagnostics = new DiagnosticsRuntime();
    const result = this.#discovery.refresh(
      program,
      { ...this.#discoveryConfig, diagnostics: diagnostics.forSource("project") },
      this.#logger,
    );

    // Populate the project dep graph in parallel with the existing pipeline.
    // The dep graph runs the new interpreter and records observations +
    // dependencies. It does not affect the existing SemanticModel yet —
    // consumers continue to read from the model. The dep graph is available
    // for future consumer migration.
    this.#populateDepGraph(program);

    return createSemanticModel(result.discovery, {
      defaultScope: this.#defaultScope,
    });
  }

  /** Populate the project dep graph via the new interpreter. */
  #populateDepGraph(program: import("typescript").Program): void {
    try {
      const config = {
        program,
        graph: this.#ensureDepGraph(program),
        packagePath: this.#discoveryConfig.packagePath ?? '',
        enableConventions: this.#discoveryConfig.conventions?.enabled,
      };

      const files = program
        .getSourceFiles()
        .filter(sf => !sf.isDeclarationFile)
        .map(sf => canonicalPath(sf.fileName) as NormalizedPath);

      interpretProject(files, config);
      this.#logger.info(
        `[index] dep graph populated: ${config.graph.nodeCount} nodes, ${config.graph.edgeCount} edges`,
      );
    } catch (e) {
      // Don't let dep graph failures break the existing pipeline
      this.#logger.info(
        `[index] dep graph population failed (non-blocking): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** Create or return the project dep graph. */
  #ensureDepGraph(program: import("typescript").Program): ProjectDepGraph {
    if (!this.#depGraph) {
      const evaluator = createUnitEvaluator({
        program,
        graph: null!, // Will be set below
        packagePath: this.#discoveryConfig.packagePath ?? '',
        enableConventions: this.#discoveryConfig.conventions?.enabled,
      });

      // Trivial convergence: pick the highest-tier observation.
      // The full convergence algebra will replace this when consumers
      // migrate from SemanticModel to dep graph pull().
      this.#depGraph = createProjectDepGraph(evaluator, (_resourceKey, _fieldPath, observations) => {
        if (observations.length === 0) {
          return { green: { kind: 'unknown', reasonKind: 'no-observations' }, red: { origin: 'source', state: 'unknown' } };
        }
        const tierOrder: Record<string, number> = {
          'builtin': 0,
          'analysis-convention': 1,
          'analysis-explicit': 2,
          'manifest': 3,
          'config': 4,
        };
        const sorted = [...observations].sort((a, b) =>
          (tierOrder[b.source.tier] ?? 0) - (tierOrder[a.source.tier] ?? 0)
        );
        return { green: sorted[0]!.green, red: sorted[0]!.red };
      });
    }
    return this.#depGraph;
  }
}
