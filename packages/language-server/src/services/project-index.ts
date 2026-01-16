import type ts from "typescript";
import {
  DEFAULT_SEMANTICS,
  buildTemplateSyntaxRegistry,
  prepareSemantics,
  stableHash,
  stableHashSemantics,
  type NormalizedPath,
  type ResourceCatalog,
  type ResourceGraph,
  type ResourceScopeId,
  type Semantics,
  type SemanticsWithCaches,
  type TemplateSyntaxRegistry,
} from "@aurelia-ls/compiler";
import { hashObject, normalizeCompilerOptions, resolve, type ResourceDef, type DefineMap } from "@aurelia-ls/resolution";
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
  readonly defines?: DefineMap;
}

interface IndexSnapshot {
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
  #defines: DefineMap | undefined;

  #semantics: SemanticsWithCaches;
  #catalog: ResourceCatalog;
  #syntax: TemplateSyntaxRegistry;
  #resourceGraph: ResourceGraph;
  #fingerprint: string;

  constructor(options: AureliaProjectIndexOptions) {
    this.#ts = options.ts;
    this.#logger = options.logger;
    this.#baseSemantics = prepareSemantics(options.baseSemantics ?? DEFAULT_SEMANTICS);
    this.#defaultScope = options.defaultScope ?? null;
    this.#defines = options.defines;

    const snapshot = this.#computeSnapshot();
    this.#semantics = snapshot.semantics;
    this.#catalog = snapshot.catalog;
    this.#syntax = snapshot.syntax;
    this.#resourceGraph = snapshot.resourceGraph;
    this.#fingerprint = snapshot.fingerprint;
  }

  refresh(): void {
    const snapshot = this.#computeSnapshot();
    const changed = snapshot.fingerprint !== this.#fingerprint;
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
    const program = this.#ts.getService().getProgram();

    if (!program) {
      // No program available - return base semantics with empty graph
      const base = this.#baseSemantics;
      const resourceGraph: ResourceGraph = base.resourceGraph ?? {
        version: "aurelia-resource-graph@1",
        root: "aurelia:root" as ResourceScopeId,
        scopes: {},
      };
      const semantics: SemanticsWithCaches = {
        ...base,
        resourceGraph,
        defaultScope: this.#defaultScope ?? base.defaultScope ?? null,
      };
      const catalog = base.catalog;
      const syntax = buildTemplateSyntaxRegistry(semantics);
      const fingerprint = hashObject({
        empty: true,
        semantics: stableHashSemantics(semantics),
        catalog: stableHash(catalog),
        syntax: stableHash(syntax),
        resourceGraph: stableHash(resourceGraph),
      });
      return { semantics, catalog, syntax, resourceGraph, fingerprint };
    }

    const result = resolve(
      program,
      {
        baseSemantics: this.#baseSemantics,
        defaultScope: this.#defaultScope,
        defines: this.#defines,
      },
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
      resources: result.resources.map((r) => ({
        kind: r.kind,
        name: unwrapSourcedValue(r.name),
        aliases: resourceAliasesForFingerprint(r),
        source: r.file,
        className: unwrapSourcedValue(r.className),
      })),
    });

    return {
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
