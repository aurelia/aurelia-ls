import {
  BUILTIN_SEMANTICS,
  prepareProjectSemantics,
  stableHash,
  stableHashSemantics,
  DiagnosticsRuntime,
  type ResourceCatalog,
  type ResourceGraph,
  type ResourceScopeId,
  type MaterializedSemantics,
  type ProjectSnapshot,
  type TemplateSyntaxRegistry,
} from "@aurelia-ls/compiler";
import {
  hashObject,
  normalizeCompilerOptions,
  discoverProjectSemantics,
  applyThirdPartyResources,
  hasThirdPartyResources,
  type ProjectSemanticsDiscoveryConfig,
  type ProjectSemanticsDiscoveryResult,
  type ResourceDef,
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

interface IndexSnapshot {
  readonly discovery: ProjectSemanticsDiscoveryResult;
  readonly semantics: MaterializedSemantics;
  readonly catalog: ResourceCatalog;
  readonly syntax: TemplateSyntaxRegistry;
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
  #baseSemantics: MaterializedSemantics;
  #defaultScope: ResourceScopeId | null;
  #discoveryConfig: ProjectSemanticsDiscoveryConfigBase;

  #discovery: ProjectSemanticsDiscoveryResult;
  #semantics: MaterializedSemantics;
  #catalog: ResourceCatalog;
  #syntax: TemplateSyntaxRegistry;
  #resourceGraph: ResourceGraph;
  #fingerprint: string;

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

    const snapshot = this.#computeSnapshot();
    this.#discovery = snapshot.discovery;
    this.#semantics = snapshot.semantics;
    this.#catalog = snapshot.catalog;
    this.#syntax = snapshot.syntax;
    this.#resourceGraph = snapshot.resourceGraph;
    this.#fingerprint = snapshot.fingerprint;
  }

  refresh(): void {
    const snapshot = this.#computeSnapshot();
    const changed = snapshot.fingerprint !== this.#fingerprint;
    this.#discovery = snapshot.discovery;
    this.#semantics = snapshot.semantics;
    this.#catalog = snapshot.catalog;
    this.#syntax = snapshot.syntax;
    this.#resourceGraph = snapshot.resourceGraph;
    this.#fingerprint = snapshot.fingerprint;
    const status = changed ? "updated" : "unchanged";
    this.#logger.info(`[index] refresh ${status} fingerprint=${this.#fingerprint}`);
  }

  currentResourceGraph(): ResourceGraph {
    return this.#resourceGraph;
  }

  currentDiscovery(): ProjectSemanticsDiscoveryResult {
    return this.#discovery;
  }

  currentCatalog(): ResourceCatalog {
    return this.#catalog;
  }

  currentSyntax(): TemplateSyntaxRegistry {
    return this.#syntax;
  }

  currentSemantics(): MaterializedSemantics {
    return this.#semantics;
  }

  currentProjectSnapshot(): ProjectSnapshot {
    return {
      semantics: this.#semantics,
      catalog: this.#catalog,
      syntax: this.#syntax,
      resourceGraph: this.#resourceGraph,
      defaultScope: this.#semantics.defaultScope ?? this.#resourceGraph.root ?? null,
    };
  }

  currentFingerprint(): string {
    return this.#fingerprint;
  }

  /**
   * Merge third-party npm resources into the current snapshot.
   *
   * Called after async npm analysis completes. Applies resources to
   * the current discovery result and updates all derived artifacts.
   *
   * @returns true if the overlay changed the snapshot
   */
  applyThirdPartyOverlay(thirdParty: ThirdPartyDiscoveryResult): boolean {
    const hasResources = hasThirdPartyResources(thirdParty.resources);
    const hasGaps = thirdParty.gaps.length > 0;
    if (!hasResources && !hasGaps) return false;

    const merged = applyThirdPartyResources(this.#discovery, thirdParty.resources, {
      gaps: thirdParty.gaps,
      confidence: thirdParty.confidence,
    });

    this.#discovery = merged;
    this.#semantics = {
      ...merged.semantics,
      resourceGraph: merged.resourceGraph,
      defaultScope: this.#defaultScope ?? merged.semantics.defaultScope ?? null,
    };
    this.#catalog = merged.catalog;
    this.#syntax = merged.syntax;
    this.#resourceGraph = merged.resourceGraph;
    // Fingerprint stays the same — third-party overlay is additive,
    // we don't want to trigger a full rebuild cascade for overlays.
    return true;
  }

  #computeSnapshot(): IndexSnapshot {
    const program = this.#ts.getProgram();
    const diagnostics = new DiagnosticsRuntime();
    const result = discoverProjectSemantics(
      program,
      { ...this.#discoveryConfig, diagnostics: diagnostics.forSource("project") },
      this.#logger,
    );

    const semantics: MaterializedSemantics = {
      ...result.semantics,
      resourceGraph: result.resourceGraph,
      defaultScope: this.#defaultScope ?? result.semantics.defaultScope ?? null,
    };

    const fingerprint = hashObject({
      compilerOptions: normalizeCompilerOptions(this.#ts.compilerOptions()),
      roots: [...this.#ts.getRootFileNames()].sort(),
      semantics: stableHashSemantics(semantics),
      catalog: stableHash(result.catalog),
      syntax: stableHash(result.syntax),
      resourceGraph: stableHash(result.resourceGraph),
      templates: result.templates.map((t) => ({
        templatePath: t.templatePath,
        componentPath: t.componentPath,
        scopeId: t.scopeId,
        className: t.className,
        resourceName: t.resourceName,
      })),
      inlineTemplates: result.inlineTemplates.map((t) => ({
        componentPath: t.componentPath,
        scopeId: t.scopeId,
        className: t.className,
        resourceName: t.resourceName,
        content: t.content,
      })),
      diagnostics: result.diagnostics.map((d) => ({
        code: d.code,
        message: d.message,
        severity: d.severity,
        source: d.source ?? null,
      })),
      resources: result.resources.map((r) => ({
        kind: r.kind,
        name: unwrapSourcedValue(r.name),
        aliases: resourceAliasesForFingerprint(r),
        source: r.file,
        className: unwrapSourcedValue(r.className),
      })),
    });

    return {
      discovery: result,
      semantics,
      catalog: result.catalog,
      syntax: result.syntax,
      resourceGraph: result.resourceGraph,
      fingerprint,
    };
  }
}


function resourceAliasesForFingerprint(resource: ResourceDef): string[] {
  switch (resource.kind) {
    case "custom-element":
    case "custom-attribute":
      return aliasesFromSourcedList(resource.aliases);
    case "template-controller":
      return aliasesFromSourcedValue(resource.aliases);
    default:
      return [];
  }
}

function aliasesFromSourcedList(aliases: readonly { value?: string }[]): string[] {
  return aliases.map(alias => alias.value).filter((alias): alias is string => !!alias);
}

function aliasesFromSourcedValue(aliases: { value?: readonly string[] } | undefined): string[] {
  return aliases?.value ? [...aliases.value] : [];
}

function unwrapSourcedValue<T>(value: { value?: T } | undefined): T | undefined {
  return value?.value;
}
