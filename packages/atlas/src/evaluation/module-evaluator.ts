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
  EvaluationValueKind,
  type EvaluationValue,
} from "./value.js";
import type { SourceProject } from "../source/index.js";

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
  private readonly openValues: EvaluationUnknownValue[] = [];
  private readonly evaluatingModules = new Set<string>();
  private readonly resolvingExports = new Set<string>();

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
      [...this.openValues],
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
      this.openValues.push(
        new EvaluationUnknownValue(
          `Circular module evaluation reached ${moduleKey}.`,
          record.sourceFile,
        ),
      );
      return null;
    }

    this.evaluatingModules.add(moduleKey);
    const imports = this.resolveImportValues(record);
    const result = new StaticEvaluator(this.sourceProject).evaluateSourceFile(
      record.sourceFile,
      moduleKey,
      imports,
    );
    this.moduleResults.set(moduleKey, result);
    this.evaluatingModules.delete(moduleKey);
    return result;
  }

  /** Resolve one export value from a module, following re-export edges when possible. */
  readExportValue(moduleKey: string, exportName: string): EvaluationValue | null {
    return this.readExportValueCore(moduleKey, exportName, true);
  }

  private readExportValueCore(
    moduleKey: string,
    exportName: string,
    reportMissing: boolean,
  ): EvaluationValue | null {
    const resolutionKey = `${moduleKey}\0${exportName}`;
    if (this.resolvingExports.has(resolutionKey)) {
      const record = this.graph.readModule(moduleKey);
      return reportMissing
        ? this.openValue(
            `Circular export resolution reached '${exportName}' on ${moduleKey}.`,
            record?.sourceFile ?? null,
          )
        : null;
    }

    this.resolvingExports.add(resolutionKey);
    try {
      return this.readExportValueCoreUnlocked(
        moduleKey,
        exportName,
        reportMissing,
      );
    } finally {
      this.resolvingExports.delete(resolutionKey);
    }
  }

  private readExportValueCoreUnlocked(
    moduleKey: string,
    exportName: string,
    reportMissing: boolean,
  ): EvaluationValue | null {
    const record = this.graph.readModule(moduleKey);
    if (record === null) {
      return this.openValue(`Module ${moduleKey} is not present.`, null);
    }
    const result = this.evaluateModule(moduleKey);
    if (result === null) {
      return this.openValue(
        `Module ${moduleKey} could not be evaluated.`,
        record.sourceFile,
      );
    }

    for (const entry of record.exports) {
      if (
        entry.exportKind === EvaluationExportKind.Local &&
        entry.exportName === exportName &&
        entry.localName !== null
      ) {
        return (
          result.environment.readValue(entry.localName) ??
          this.openValue(
            `Local export '${exportName}' did not resolve to an environment binding.`,
            entry.node,
          )
        );
      }
      if (
        entry.exportKind === EvaluationExportKind.Default &&
        exportName === "default"
      ) {
        return entry.localName === null
          ? this.openValue(
              "Default export did not expose a local environment binding.",
              entry.node,
            )
          : result.environment.readValue(entry.localName) ??
              this.openValue(
                "Default export did not resolve to a static value.",
                entry.node,
              );
      }
      if (
        entry.exportKind === EvaluationExportKind.ReExport &&
        entry.exportName === exportName &&
        entry.moduleSpecifier !== null
      ) {
        return this.readReExportValue(
          moduleKey,
          entry.moduleSpecifier,
          entry.exportName,
          entry.node,
          true,
        );
      }
    }

    const exportAllCandidates = this.readExportAllCandidates(record, exportName);
    if (exportAllCandidates.length === 1) {
      return exportAllCandidates[0] ?? null;
    }
    if (exportAllCandidates.length > 1) {
      return this.openValue(
        `Export '${exportName}' is ambiguous across export-star entries in ${moduleKey}.`,
        record.sourceFile,
      );
    }

    return reportMissing
      ? this.openValue(
          `Export '${exportName}' is not known on module ${moduleKey}.`,
          record.sourceFile,
        )
      : null;
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
      this.evaluateModule(targetModuleKey);
      return new EvaluationModuleNamespaceValue(
        targetModuleKey,
        this.readModuleExportMap(targetModuleKey),
        entry.node,
      );
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

  private readReExportValue(
    fromModuleKey: string,
    moduleSpecifier: string,
    exportName: string,
    node: ts.Node,
    reportMissing: boolean,
  ): EvaluationValue | null {
    const targetModuleKey = this.graph.readLinkedModule(
      fromModuleKey,
      moduleSpecifier,
    );
    return targetModuleKey === null
      ? this.openValue(
          `Re-export '${moduleSpecifier}' from ${fromModuleKey} did not resolve to a local module.`,
          node,
        )
      : this.readExportValueCore(targetModuleKey, exportName, reportMissing);
  }

  private readExportAllCandidates(
    record: EvaluationModuleRecord,
    exportName: string,
  ): readonly EvaluationValue[] {
    const candidates: EvaluationValue[] = [];
    for (const entry of record.exports) {
      if (
        entry.exportKind !== EvaluationExportKind.ExportAll ||
        entry.moduleSpecifier === null
      ) {
        continue;
      }
      const value = this.readReExportValue(
        record.moduleKey,
        entry.moduleSpecifier,
        exportName,
        entry.node,
        false,
      );
      if (value !== null && value.kind !== EvaluationValueKind.Unknown) {
        candidates.push(value);
      }
    }
    return candidates;
  }

  private readModuleExportMap(
    moduleKey: string,
  ): ReadonlyMap<string, EvaluationValue> {
    const exports = new Map<string, EvaluationValue>();
    const record = this.graph.readModule(moduleKey);
    if (record === null) {
      return exports;
    }
    for (const entry of record.exports) {
      if (
        entry.exportKind === EvaluationExportKind.ExportAll ||
        entry.exportName === "*"
      ) {
        continue;
      }
      const value = this.readExportValue(moduleKey, entry.exportName);
      if (value !== null) {
        exports.set(entry.exportName, value);
      }
    }
    return exports;
  }

  private openValue(reason: string, node: ts.Node | null): EvaluationUnknownValue {
    const value = new EvaluationUnknownValue(reason, node);
    this.openValues.push(value);
    return value;
  }
}
