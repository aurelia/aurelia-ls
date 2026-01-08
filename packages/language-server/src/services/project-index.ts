import type ts from "typescript";
import {
  DEFAULT_SEMANTICS,
  type Bindable,
  type BindingMode,
  type NormalizedPath,
  type ResourceCollections,
  type ResourceGraph,
  type ResourceScopeId,
  type Semantics,
} from "@aurelia-ls/compiler";
import { hashObject, normalizeCompilerOptions, resolve, type ResourceAnnotation } from "@aurelia-ls/resolution";
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

    const semantics: Semantics = {
      ...this.#baseSemantics,
      resources: mergedResources,
      resourceGraph: result.resourceGraph,
    };

    const fingerprint = hashObject({
      compilerOptions: normalizeCompilerOptions(this.#ts.compilerOptions()),
      roots: [...this.#ts.getRootFileNames()].sort(),
      semantics,
      resourceGraph: result.resourceGraph,
      resources: result.resources.map((r) => ({
        kind: r.kind,
        name: r.name,
        aliases: [...r.aliases],
        source: r.source,
        className: r.className,
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
  resources: readonly ResourceAnnotation[],
): ResourceCollections {
  const elements = { ...base.elements };
  const attributes = { ...base.attributes };
  const valueConverters = { ...base.valueConverters };
  const bindingBehaviors = { ...base.bindingBehaviors };

  for (const r of resources) {
    if (r.kind === "custom-element") {
      elements[r.name] = {
        kind: "element",
        name: r.name,
        bindables: annotationBindablesToRecord(r.bindables),
        ...(r.aliases.length > 0 ? { aliases: [...r.aliases] } : {}),
        ...(r.element?.containerless ? { containerless: true } : {}),
        ...(r.element?.boundary ? { boundary: true } : {}),
      };
    } else if (r.kind === "custom-attribute" || r.kind === "template-controller") {
      attributes[r.name] = {
        kind: "attribute",
        name: r.name,
        bindables: annotationBindablesToRecord(r.bindables),
        ...(r.aliases.length > 0 ? { aliases: [...r.aliases] } : {}),
        ...(r.attribute?.primary ? { primary: r.attribute.primary } : {}),
        ...(r.attribute?.isTemplateController ? { isTemplateController: true } : {}),
        ...(r.attribute?.noMultiBindings ? { noMultiBindings: true } : {}),
      };
    } else if (r.kind === "value-converter") {
      valueConverters[r.name] = {
        name: r.name,
        in: { kind: "unknown" },
        out: { kind: "unknown" },
      };
    } else if (r.kind === "binding-behavior") {
      bindingBehaviors[r.name] = { name: r.name };
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

function annotationBindablesToRecord(
  bindables: readonly ResourceAnnotation["bindables"][number][],
): Record<string, Bindable> {
  const record: Record<string, Bindable> = {};
  for (const b of bindables) {
    const bindable: Bindable = { name: b.name };
    if (b.mode) {
      bindable.mode = b.mode as BindingMode;
    }
    record[b.name] = bindable;
  }
  return record;
}
