import type ts from "typescript";

import {
  StaticEvaluator,
  type ModuleEvaluationResult,
  type StaticEvaluationImportValues,
} from "./evaluator.js";
import {
  EvaluationExportKind,
  EvaluationImportKind,
  type EvaluationImportEntry,
  type EvaluationModuleGraph,
  type EvaluationModuleRecord,
} from "./module-graph.js";
import {
  EvaluationModuleNamespaceValue,
  EvaluationUnknownValue,
  type EvaluationValue,
} from "./value.js";
import type { SourceProject } from "../source/index.js";

interface ExportBinding {
  readonly moduleKey: string;
  readonly name: string;
  readonly node: ts.Node;
}

/** Result of evaluating a graph of local ECMAScript modules. */
export class StaticModuleGraphEvaluationResult {
  constructor(
    /** Module results by module key. */
    readonly modules: ReadonlyMap<string, ModuleEvaluationResult>,
    /** Open module-level export/import values that could not be linked exactly. */
    readonly openValues: readonly EvaluationUnknownValue[],
  ) {}
}

/** Evaluates module records with import/export linkage over an already-built module graph. */
export class StaticModuleGraphEvaluator {
  private readonly moduleResults = new Map<string, ModuleEvaluationResult>();
  private readonly openValues = new Map<string, EvaluationUnknownValue>();
  private readonly evaluatingModules = new Set<string>();
  private readonly namespaces = new Map<string, EvaluationModuleNamespaceValue>();

  constructor(
    /** Source project used by the underlying expression evaluator. */
    readonly sourceProject: SourceProject,
    /** Directed module graph built from source syntax and host resolution. */
    readonly graph: EvaluationModuleGraph,
  ) {}

  /** Evaluate one entry module and any modules needed by its imports or re-exports. */
  evaluate(entryModuleKey: string): StaticModuleGraphEvaluationResult {
    this.evaluateModule(entryModuleKey);
    return new StaticModuleGraphEvaluationResult(
      new Map(this.moduleResults),
      [...this.openValues.values()],
    );
  }

  /** Evaluate one module and return its result. */
  evaluateModule(moduleKey: string): ModuleEvaluationResult | null {
    const cached = this.moduleResults.get(moduleKey);
    if (cached !== undefined) {
      return cached;
    }
    const record = this.graph.readModule(moduleKey);
    if (record === null) {
      return null;
    }
    if (this.evaluatingModules.has(moduleKey)) {
      this.openValue(`Circular module evaluation reached ${moduleKey}.`, record.sourceFile);
      return null;
    }

    this.evaluatingModules.add(moduleKey);
    try {
      const imports = this.resolveImportValues(record);
      const result = new StaticEvaluator(this.sourceProject).evaluateSourceFile(record.sourceFile, moduleKey, imports);
      this.moduleResults.set(moduleKey, result);
      return result;
    } finally {
      this.evaluatingModules.delete(moduleKey);
    }
  }

  /** Resolve the owning binding before reading its value. Export-star diamonds compare bindings. */
  readExportValue(moduleKey: string, exportName: string): EvaluationValue | null {
    const binding = this.resolveExport(moduleKey, exportName, new Set());
    if (binding instanceof EvaluationUnknownValue) return binding;
    if (binding === null) {
      return this.openValue(`Export '${exportName}' is not known on module ${moduleKey}.`, this.graph.readModule(moduleKey)?.sourceFile ?? null);
    }
    return this.evaluateModule(binding.moduleKey)?.environment.readValue(binding.name)
      ?? this.openValue(`Export '${exportName}' could not read binding ${binding.moduleKey}#${binding.name}.`, binding.node);
  }

  private resolveExport(
    moduleKey: string,
    name: string,
    visited: Set<string>,
  ): ExportBinding | EvaluationUnknownValue | null {
    const visit = `${moduleKey}\0${name}`;
    if (visited.has(visit)) return null;
    visited.add(visit);
    const record = this.graph.readModule(moduleKey);
    if (record === null) return this.openValue(`Module ${moduleKey} is not present.`, null);
    const entry = record.exports.find(row => row.exportName === name && row.exportKind !== EvaluationExportKind.ExportAll);
    if (entry !== undefined) {
      if (entry.exportKind === EvaluationExportKind.ReExport && entry.moduleSpecifier !== null) {
        return this.resolveLinkedExport(moduleKey, entry.moduleSpecifier, entry.localName ?? name, entry.node, visited);
      }
      if (entry.localName === null) return this.openValue(`Export '${name}' has no binding.`, entry.node);
      const imported = record.imports.find(row => row.localName === entry.localName && row.exportName !== null);
      if (imported?.exportName) {
        return this.resolveLinkedExport(moduleKey, imported.moduleSpecifier, imported.exportName, imported.node, visited);
      }
      return { moduleKey, name: entry.localName, node: entry.node };
    }
    if (name === "default") return null;
    let result: ExportBinding | null = null;
    for (const star of record.exports) {
      if (star.exportKind !== EvaluationExportKind.ExportAll || star.moduleSpecifier === null) continue;
      const candidate = this.resolveLinkedExport(moduleKey, star.moduleSpecifier, name, star.node, visited);
      if (candidate === null) continue;
      if (candidate instanceof EvaluationUnknownValue) return candidate;
      if (result && (result.moduleKey !== candidate.moduleKey || result.name !== candidate.name)) {
        return this.openValue(`Export '${name}' is ambiguous across export-star entries in ${moduleKey}.`, record.sourceFile);
      }
      result = candidate;
    }
    return result;
  }

  private resolveLinkedExport(from: string, specifier: string, name: string, node: ts.Node, visited: Set<string>) {
    const linked = this.graph.readLinkedModule(from, specifier);
    return linked === null
      ? this.openValue(`Re-export '${specifier}' from ${from} did not resolve to a module.`, node)
      : this.resolveExport(linked, name, visited);
  }

  private resolveImportValues(
    record: EvaluationModuleRecord,
  ): StaticEvaluationImportValues {
    const imports = new Map<string, EvaluationValue>();
    for (const entry of record.imports) {
      if (
        entry.localName === null ||
        entry.importKind === EvaluationImportKind.SideEffect
      ) {
        continue;
      }
      imports.set(entry.localName, this.resolveImportValue(record.moduleKey, entry));
    }
    return imports;
  }

  private resolveImportValue(
    fromModuleKey: string,
    entry: EvaluationImportEntry,
  ): EvaluationValue {
    const targetModuleKey = this.graph.readLinkedModule(
      fromModuleKey,
      entry.moduleSpecifier,
    );
    if (targetModuleKey === null) {
      return this.openValue(
        `Import '${entry.moduleSpecifier}' from ${fromModuleKey} did not resolve to a local module.`,
        entry.node,
      );
    }
    if (entry.importKind === EvaluationImportKind.Namespace) {
      return this.readNamespace(targetModuleKey);
    }
    const exportName = entry.exportName ?? "default";
    return (
      this.readExportValue(targetModuleKey, exportName) ??
      this.openValue(
        `Import '${entry.localName ?? exportName}' from ${
          entry.moduleSpecifier
        } did not resolve to a static export.`,
        entry.node,
      )
    );
  }

  private readNamespace(moduleKey: string): EvaluationModuleNamespaceValue {
    const existing = this.namespaces.get(moduleKey);
    if (existing !== undefined) return existing;
    const values = new Map<string, EvaluationValue>();
    const namespace = new EvaluationModuleNamespaceValue(moduleKey, values, this.graph.readModule(moduleKey)?.sourceFile ?? null);
    this.namespaces.set(moduleKey, namespace);
    const names = new Set<string>();
    this.collectExportNames(moduleKey, moduleKey, names, new Set());
    for (const name of names) {
      const binding = this.resolveExport(moduleKey, name, new Set());
      if (binding !== null && !(binding instanceof EvaluationUnknownValue)) {
        const value = this.evaluateModule(binding.moduleKey)?.environment.readValue(binding.name);
        if (value !== null && value !== undefined) values.set(name, value);
      }
    }
    return namespace;
  }

  private collectExportNames(moduleKey: string, root: string, names: Set<string>, visited: Set<string>): void {
    if (visited.has(moduleKey)) return;
    visited.add(moduleKey);
    const record = this.graph.readModule(moduleKey);
    for (const entry of record?.exports ?? []) {
      if (entry.exportKind === EvaluationExportKind.ExportAll && entry.moduleSpecifier !== null) {
        const linked = this.graph.readLinkedModule(moduleKey, entry.moduleSpecifier);
        if (linked !== null) this.collectExportNames(linked, root, names, visited);
      } else if (entry.exportName !== "default" || moduleKey === root) {
        names.add(entry.exportName);
      }
    }
  }

  private openValue(reason: string, node: ts.Node | null): EvaluationUnknownValue {
    const id = JSON.stringify([node?.getSourceFile().fileName, node?.pos, node?.end, reason]);
    const existing = this.openValues.get(id);
    if (existing !== undefined) return existing;
    const value = new EvaluationUnknownValue(reason, node);
    this.openValues.set(id, value);
    return value;
  }
}
