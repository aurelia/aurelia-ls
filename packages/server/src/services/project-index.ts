import type ts from "typescript";
import {
  DEFAULT_SEMANTICS,
  type NormalizedPath,
  type ResourceGraph,
  type ResourceScopeId,
  type Semantics,
} from "@aurelia-ls/domain";
import {
  hashObject,
  normalizeCompilerOptions,
  emptyDiscovery,
  runDiscovery,
  planScopes,
} from "@aurelia-ls/resolution";
import type { Logger } from "./types.js";

export interface TypeScriptProject {
  getService(): ts.LanguageService;
  compilerOptions(): ts.CompilerOptions;
  getRootFileNames(): readonly NormalizedPath[];
  getProjectVersion(): number;
}

export interface AureliaProjectIndexOptions {
  readonly ts: TypeScriptProject;
  readonly logger: Logger;
  readonly baseSemantics?: Semantics;
  readonly defaultScope?: ResourceScopeId | null;
}

interface IndexSnapshot {
  readonly semantics: Semantics;
  readonly resourceGraph: ResourceGraph;
  readonly fingerprint: string;
}

/**
 * TS-backed project index that discovers Aurelia resources and produces the
 * semantics + resource graph snapshot used by TemplateProgram construction.
 *
 * Structured as a mini-pipeline:
 * - discovery: TS program -> resources/descriptors/registrations
 * - scoping:   resources + base semantics -> scoped resource graph + semantics
 * - fingerprint: stable snapshot for workspace invalidation
 */
export class AureliaProjectIndex {
  #ts: TypeScriptProject;
  #logger: Logger;
  #baseSemantics: Semantics;
  #defaultScope: ResourceScopeId | null;

  #semantics: Semantics;
  #resourceGraph: ResourceGraph;
  #fingerprint: string;

  constructor(options: AureliaProjectIndexOptions) {
    this.#ts = options.ts;
    this.#logger = options.logger;
    this.#baseSemantics = options.baseSemantics ?? DEFAULT_SEMANTICS;
    this.#defaultScope = options.defaultScope ?? null;

    const snapshot = this.#computeSnapshot();
    this.#semantics = snapshot.semantics;
    this.#resourceGraph = snapshot.resourceGraph;
    this.#fingerprint = snapshot.fingerprint;
  }

  refresh(): void {
    const snapshot = this.#computeSnapshot();
    const changed = snapshot.fingerprint !== this.#fingerprint;
    this.#semantics = snapshot.semantics;
    this.#resourceGraph = snapshot.resourceGraph;
    this.#fingerprint = snapshot.fingerprint;
    const status = changed ? "updated" : "unchanged";
    this.#logger.info(`[index] refresh ${status} fingerprint=${this.#fingerprint}`);
  }

  currentResourceGraph(): ResourceGraph {
    return this.#resourceGraph;
  }

  currentSemantics(): Semantics {
    return this.#semantics;
  }

  currentFingerprint(): string {
    return this.#fingerprint;
  }

  #computeSnapshot(): IndexSnapshot {
    const program = this.#ts.getService().getProgram();
    const discovery = program ? runDiscovery(program, this.#logger) : emptyDiscovery();
    const plan = planScopes({
      baseSemantics: this.#baseSemantics,
      discoveryResources: discovery.resources,
      defaultScope: this.#defaultScope,
    });

    const semantics = plan.semantics;
    const resourceGraph = plan.resourceGraph;
    const fingerprint = hashObject({
      compilerOptions: normalizeCompilerOptions(this.#ts.compilerOptions()),
      roots: [...this.#ts.getRootFileNames()].sort(),
      semantics,
      resourceGraph,
      discovered: discovery.descriptors.map((d) => ({
        kind: d.kind,
        name: d.name,
        aliases: [...d.aliases],
        source: d.source,
        className: "className" in d ? d.className : null,
      })),
    });
    return { semantics, resourceGraph, fingerprint };
  }
}
