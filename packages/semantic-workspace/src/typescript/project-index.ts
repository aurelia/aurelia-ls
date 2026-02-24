import {
  BUILTIN_SEMANTICS,
  prepareProjectSemantics,
  createSemanticModel,
  IncrementalDiscovery,
  DiagnosticsRuntime,
  type MaterializedSemantics,
  type ResourceScopeId,
  type SemanticModel,
  type NormalizedPath,
  type DependencyGraph,
  type DepNodeId,
} from "@aurelia-ls/compiler";
import {
  applyThirdPartyResources,
  hasThirdPartyResources,
  type ProjectSemanticsDiscoveryConfig,
  type Logger,
  type ThirdPartyDiscoveryResult,
} from "@aurelia-ls/compiler";
import type { TypeScriptProject } from "./project.js";

export interface AureliaProjectIndexOptions {
  readonly ts: TypeScriptProject;
  readonly logger: Logger;
  readonly discovery?: ProjectSemanticsDiscoveryConfigBase;
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

    this.#model = this.#buildModel();
  }

  /** The current semantic model — single source of truth. */
  currentModel(): SemanticModel {
    return this.#model;
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
    return createSemanticModel(result.discovery, {
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

    return createSemanticModel(result.discovery, {
      defaultScope: this.#defaultScope,
    });
  }
}
