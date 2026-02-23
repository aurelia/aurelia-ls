import {
  BUILTIN_SEMANTICS,
  prepareProjectSemantics,
  createSemanticModel,
  IncrementalDiscovery,
  DiagnosticsRuntime,
  type MaterializedSemantics,
  type ResourceScopeId,
  type SemanticModel,
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
    this.#model = this.#buildModel();
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

  #buildModel(): SemanticModel {
    const program = this.#ts.getProgram();
    const diagnostics = new DiagnosticsRuntime();
    const result = this.#discovery.refresh(
      program,
      { ...this.#discoveryConfig, diagnostics: diagnostics.forSource("project") },
      this.#logger,
    );

    return createSemanticModel(result, {
      defaultScope: this.#defaultScope,
    });
  }
}
