import type ts from "typescript";
import {
  DEFAULT_SEMANTICS,
  prepareSemantics,
  type Bindable,
  type BindableDef,
  type NormalizedPath,
  type ResourceCollections,
  type ResourceGraph,
  type ResourceScopeId,
  type Semantics,
  type SemanticsWithCaches,
  type TypeRef,
} from "@aurelia-ls/compiler";
import { hashObject, normalizeCompilerOptions, resolve, type ResourceDef } from "@aurelia-ls/resolution";
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
  readonly semantics: SemanticsWithCaches;
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

  #semantics: SemanticsWithCaches;
  #resourceGraph: ResourceGraph;
  #fingerprint: string;

  constructor(options: AureliaProjectIndexOptions) {
    this.#ts = options.ts;
    this.#logger = options.logger;
    this.#baseSemantics = prepareSemantics(options.baseSemantics ?? DEFAULT_SEMANTICS);
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
      const semantics = this.#baseSemantics;
      const resourceGraph: ResourceGraph = semantics.resourceGraph ?? {
        version: "aurelia-resource-graph@1",
        root: "aurelia:root" as ResourceScopeId,
        scopes: {},
      };
      const fingerprint = hashObject({ empty: true });
      return { semantics, resourceGraph, fingerprint };
    }

    const result = resolve(
      program,
      {
        baseSemantics: this.#baseSemantics,
        defaultScope: this.#defaultScope,
      },
      this.#logger,
    );

    // Merge discovered resources into semantics.resources
    const mergedResources = mergeDiscoveredResources(this.#baseSemantics.resources, result.resources);

    const semantics = prepareSemantics(
      { ...this.#baseSemantics, resourceGraph: result.resourceGraph },
      { resources: mergedResources },
    );

    const fingerprint = hashObject({
      compilerOptions: normalizeCompilerOptions(this.#ts.compilerOptions()),
      roots: [...this.#ts.getRootFileNames()].sort(),
      semantics,
      resourceGraph: result.resourceGraph,
      resources: result.resources.map((r) => ({
        kind: r.kind,
        name: unwrapSourcedValue(r.name),
        aliases: resourceAliasesForFingerprint(r),
        source: r.file,
        className: unwrapSourcedValue(r.className),
      })),
    });

    return { semantics, resourceGraph: result.resourceGraph, fingerprint };
  }
}

/**
 * Merge discovered resources into base resources.
 */
function mergeDiscoveredResources(
  base: ResourceCollections,
  resources: readonly ResourceDef[],
): ResourceCollections {
  const elements = { ...base.elements };
  const attributes = { ...base.attributes };
  const valueConverters = { ...base.valueConverters };
  const bindingBehaviors = { ...base.bindingBehaviors };

  for (const r of resources) {
    const name = unwrapSourcedValue(r.name) ?? "";
    if (!name) continue;
    if (r.kind === "custom-element") {
      const aliases = aliasesFromSourcedList(r.aliases);
      elements[name] = {
        kind: "element",
        name,
        bindables: bindableDefsToRecord(r.bindables),
        ...(aliases.length > 0 ? { aliases } : {}),
        ...(unwrapSourcedValue(r.containerless) ? { containerless: true } : {}),
        ...(unwrapSourcedValue(r.boundary) ? { boundary: true } : {}),
      };
    } else if (r.kind === "custom-attribute") {
      const aliases = aliasesFromSourcedList(r.aliases);
      const primary = unwrapSourcedValue(r.primary) ?? findPrimaryBindableName(r.bindables) ?? undefined;
      attributes[name] = {
        kind: "attribute",
        name,
        bindables: bindableDefsToRecord(r.bindables),
        ...(aliases.length > 0 ? { aliases } : {}),
        ...(primary ? { primary } : {}),
        ...(unwrapSourcedValue(r.noMultiBindings) ? { noMultiBindings: true } : {}),
      };
    } else if (r.kind === "template-controller") {
      const aliases = aliasesFromSourcedValue(r.aliases);
      const primary = findPrimaryBindableName(r.bindables) ?? undefined;
      attributes[name] = {
        kind: "attribute",
        name,
        bindables: bindableDefsToRecord(r.bindables),
        ...(aliases.length > 0 ? { aliases } : {}),
        ...(primary ? { primary } : {}),
        isTemplateController: true,
        ...(unwrapSourcedValue(r.noMultiBindings) ? { noMultiBindings: true } : {}),
      };
    } else if (r.kind === "value-converter") {
      valueConverters[name] = {
        name,
        in: { kind: "unknown" },
        out: { kind: "unknown" },
      };
    } else if (r.kind === "binding-behavior") {
      bindingBehaviors[name] = { name };
    }
  }

  return {
    elements,
    attributes,
    controllers: base.controllers,
    valueConverters,
    bindingBehaviors,
  };
}

function bindableDefsToRecord(
  bindables: Readonly<Record<string, BindableDef>>,
): Record<string, Bindable> {
  const record: Record<string, Bindable> = {};
  for (const [key, def] of Object.entries(bindables)) {
    const name = unwrapSourcedValue(def.property) ?? key;
    const attribute = unwrapSourcedValue(def.attribute);
    const mode = unwrapSourcedValue(def.mode);
    const primary = unwrapSourcedValue(def.primary);
    const type = toTypeRefOptional(unwrapSourcedValue(def.type));
    const doc = unwrapSourcedValue(def.doc);

    const bindable: Bindable = {
      name,
      ...(attribute ? { attribute } : {}),
      ...(mode ? { mode } : {}),
      ...(primary !== undefined ? { primary } : {}),
      ...(type ? { type } : {}),
      ...(doc ? { doc } : {}),
    };

    record[bindable.name] = bindable;
  }
  return record;
}

function findPrimaryBindableName(defs: Readonly<Record<string, BindableDef>>): string | null {
  for (const [key, def] of Object.entries(defs)) {
    const primary = unwrapSourcedValue(def.primary);
    if (primary) return unwrapSourcedValue(def.property) ?? key;
  }
  return null;
}

function toTypeRefOptional(typeName: string | undefined): TypeRef | undefined {
  if (!typeName) return undefined;
  const trimmed = typeName.trim();
  if (!trimmed) return undefined;
  if (trimmed === "any") return { kind: "any" };
  if (trimmed === "unknown") return { kind: "unknown" };
  return { kind: "ts", name: trimmed };
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
