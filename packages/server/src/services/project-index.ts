import { createHash } from "node:crypto";
import type ts from "typescript";
import {
  DEFAULT_SEMANTICS,
  buildResourceGraphFromSemantics,
  type NormalizedPath,
  type ResourceGraph,
  type ResourceScopeId,
  type Semantics,
} from "@aurelia-ls/domain";
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
 * Discovery is intentionally minimal for now; the index still tracks TS
 * project state and produces a stable fingerprint to drive workspace rebuilds.
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

  async refresh(): Promise<void> {
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
    const semantics = this.#composeSemantics();
    const resourceGraph = buildResourceGraphFromSemantics(semantics);
    const fingerprint = hashObject({
      projectVersion: this.#ts.getProjectVersion(),
      compilerOptions: normalizeCompilerOptions(this.#ts.compilerOptions()),
      roots: [...this.#ts.getRootFileNames()].sort(),
      semantics,
      resourceGraph,
    });
    return { semantics, resourceGraph, fingerprint };
  }

  #composeSemantics(): Semantics {
    const defaultScope = this.#defaultScope ?? this.#baseSemantics.defaultScope;
    if (defaultScope === undefined) return this.#baseSemantics;
    return { ...this.#baseSemantics, defaultScope };
  }
}

function normalizeCompilerOptions(options: ts.CompilerOptions): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(options).sort()) {
    const value = (options as Record<string, unknown>)[key];
    if (value === undefined) continue;
    normalized[key] = value;
  }
  return normalized;
}

function hashObject(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null) return "null";
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (type === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    const serialized = entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",");
    return `{${serialized}}`;
  }
  return JSON.stringify(null);
}
