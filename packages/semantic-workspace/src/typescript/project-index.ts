import {
  DEFAULT_SEMANTICS,
  prepareSemantics,
  stableHash,
  stableHashSemantics,
  DiagnosticsRuntime,
  type ResourceCatalog,
  type ResourceGraph,
  type ResourceScopeId,
  type SemanticsWithCaches,
  type TemplateSyntaxRegistry,
} from "@aurelia-ls/compiler";
import {
  hashObject,
  normalizeCompilerOptions,
  resolve,
  type ResolutionConfig,
  type ResolutionResult,
  type ResourceDef,
  type Logger,
} from "@aurelia-ls/compiler";
import type { TypeScriptProject } from "./project.js";

export interface AureliaProjectIndexOptions {
  readonly ts: TypeScriptProject;
  readonly logger: Logger;
  readonly resolution?: ResolutionConfigBase;
}

type ResolutionConfigBase = Omit<ResolutionConfig, "diagnostics">;

interface IndexSnapshot {
  readonly resolution: ResolutionResult;
  readonly semantics: SemanticsWithCaches;
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
  #baseSemantics: SemanticsWithCaches;
  #defaultScope: ResourceScopeId | null;
  #resolutionConfig: ResolutionConfigBase;

  #resolution: ResolutionResult;
  #semantics: SemanticsWithCaches;
  #catalog: ResourceCatalog;
  #syntax: TemplateSyntaxRegistry;
  #resourceGraph: ResourceGraph;
  #fingerprint: string;

  constructor(options: AureliaProjectIndexOptions) {
    this.#ts = options.ts;
    this.#logger = options.logger;
    const resolutionConfig = options.resolution ?? {};
    this.#baseSemantics = prepareSemantics(resolutionConfig.baseSemantics ?? DEFAULT_SEMANTICS);
    this.#defaultScope = resolutionConfig.defaultScope ?? null;
    this.#resolutionConfig = {
      ...resolutionConfig,
      baseSemantics: this.#baseSemantics,
      defaultScope: this.#defaultScope ?? resolutionConfig.defaultScope,
    };

    const snapshot = this.#computeSnapshot();
    this.#resolution = snapshot.resolution;
    this.#semantics = snapshot.semantics;
    this.#catalog = snapshot.catalog;
    this.#syntax = snapshot.syntax;
    this.#resourceGraph = snapshot.resourceGraph;
    this.#fingerprint = snapshot.fingerprint;
  }

  refresh(): void {
    const snapshot = this.#computeSnapshot();
    const changed = snapshot.fingerprint !== this.#fingerprint;
    this.#resolution = snapshot.resolution;
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

  currentResolution(): ResolutionResult {
    return this.#resolution;
  }

  currentCatalog(): ResourceCatalog {
    return this.#catalog;
  }

  currentSyntax(): TemplateSyntaxRegistry {
    return this.#syntax;
  }

  currentSemantics(): SemanticsWithCaches {
    return this.#semantics;
  }

  currentFingerprint(): string {
    return this.#fingerprint;
  }

  #computeSnapshot(): IndexSnapshot {
    const program = this.#ts.getProgram();
    const diagnostics = new DiagnosticsRuntime();
    const result = resolve(
      program,
      { ...this.#resolutionConfig, diagnostics: diagnostics.forSource("resolution") },
      this.#logger,
    );

    const semantics: SemanticsWithCaches = {
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
      resolution: result,
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
