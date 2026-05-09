import type ts from 'typescript';
import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
  type StaticEvaluationImportValues,
  type StaticModuleEvaluationResult,
} from './evaluator.js';
import {
  DefaultStaticEvaluationPolicy,
  type StaticEvaluationPolicy,
} from './policy.js';
import {
  EvaluationExportKind,
  EvaluationImportKind,
  type EvaluationImportEntry,
  type EvaluationModuleGraph,
  type EvaluationModuleRecord,
} from './module-graph.js';
import type { ModuleEnvironmentRecord } from './environment.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationBoundaryValue,
  EvaluationModuleNamespaceValue,
  EvaluationObjectValue,
  EvaluationPromiseValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';

/** Result of evaluating a graph of local ECMAScript modules. */
export class StaticModuleGraphEvaluationResult {
  constructor(
    /** Module results by module key. */
    readonly modules: ReadonlyMap<string, StaticModuleEvaluationResult>,
    /** Open module-level export/import values that could not be linked exactly. */
    readonly openValues: readonly EvaluationUnknownValue[],
  ) {}
}

export interface StaticModuleExternalValueResolver {
  resolveImportValue(
    fromModuleKey: string,
    entry: EvaluationImportEntry,
  ): EvaluationValue | null;
}

/** Evaluates module records with import/export linkage over an already-built module graph. */
export class StaticModuleGraphEvaluator {
  private readonly moduleResults = new Map<string, StaticModuleEvaluationResult>();
  private readonly openValues: EvaluationUnknownValue[] = [];
  private readonly evaluatingModules = new Set<string>();
  private readonly resolvingExports = new Set<string>();

  constructor(
    /** Directed module graph built from source syntax and host resolution. */
    readonly graph: EvaluationModuleGraph,
    /** Product-specific ownership hooks for expression statements whose effects are modeled elsewhere. */
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
    /** Product-specific call intrinsics layered on top of generic ECMAScript evaluation. */
    readonly runtimeHost: StaticEvaluationRuntimeHost = {},
    /** Product-specific values for declaration/external imports that remain outside the local graph. */
    readonly externalValueResolver: StaticModuleExternalValueResolver | null = null,
  ) {}

  /** Evaluate one entry module and any modules needed by its imports or re-exports. */
  evaluate(entryModuleKey: string): StaticModuleGraphEvaluationResult {
    this.evaluateModule(entryModuleKey);
    return new StaticModuleGraphEvaluationResult(new Map(this.moduleResults), [...this.openValues]);
  }

  /** Evaluate one module and return its result. */
  evaluateModule(moduleKey: string): StaticModuleEvaluationResult | null {
    const cached = this.moduleResults.get(moduleKey);
    if (cached != null) {
      return cached;
    }
    const record = this.graph.readModule(moduleKey);
    if (record == null) {
      return null;
    }
    if (this.evaluatingModules.has(moduleKey)) {
      this.openValues.push(new EvaluationUnknownValue(`Circular module evaluation reached ${moduleKey}.`, record.sourceFile));
      return null;
    }

    this.evaluatingModules.add(moduleKey);
    const imports = this.resolveImportValues(record);
    const result = new StaticEvaluator(this.policy, {
      ...this.runtimeHost,
      resolveCommonJsRequire: (currentModuleKey, moduleSpecifier, node) =>
        this.runtimeHost.resolveCommonJsRequire?.(currentModuleKey, moduleSpecifier, node)
        ?? this.resolveCommonJsRequireValue(currentModuleKey, moduleSpecifier, node),
      resolveDynamicImport: (currentModuleKey, moduleSpecifier, node) =>
        this.runtimeHost.resolveDynamicImport?.(currentModuleKey, moduleSpecifier, node)
        ?? this.resolveDynamicImportValue(currentModuleKey, moduleSpecifier, node),
    }).evaluateSourceFile(record.sourceFile, moduleKey, imports);
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
        ? this.openValue(`Circular export resolution reached '${exportName}' on ${moduleKey}.`, record?.sourceFile ?? null)
        : null;
    }

    this.resolvingExports.add(resolutionKey);
    try {
      return this.readExportValueCoreUnlocked(moduleKey, exportName, reportMissing);
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
    if (record == null) {
      return this.openValue(`Module ${moduleKey} is not present in the evaluation graph.`, null);
    }
    const result = this.evaluateModule(moduleKey);
    if (result == null) {
      return this.openValue(`Module ${moduleKey} could not be evaluated.`, record.sourceFile);
    }

    for (const entry of record.exports) {
      if (entry.exportKind === EvaluationExportKind.Local && entry.exportName === exportName && entry.localName != null) {
        return result.environment.readValue(entry.localName)
          ?? this.openValue(`Local export '${exportName}' did not resolve to an environment binding.`, entry.node);
      }
      if (entry.exportKind === EvaluationExportKind.Default && exportName === 'default') {
        return entry.localName == null
          ? this.openValue('Default export did not expose a local environment binding.', entry.node)
          : result.environment.readValue(entry.localName)
            ?? this.openValue('Default export did not resolve to a static value.', entry.node);
      }
      if (entry.exportKind === EvaluationExportKind.ReExport && entry.exportName === exportName && entry.moduleSpecifier != null) {
        return this.readReExportValue(moduleKey, entry.moduleSpecifier, entry.exportName, entry.node, true);
      }
    }

    const exportAllCandidates = this.readExportAllCandidates(record, exportName);
    if (exportAllCandidates.length === 1) {
      const candidate = exportAllCandidates[0];
      if (candidate != null) {
        return candidate;
      }
    }
    if (exportAllCandidates.length > 1) {
      return this.openValue(`Export '${exportName}' is ambiguous across export-star entries in ${moduleKey}.`, record.sourceFile);
    }

    const commonJsExport = readCommonJsExportValue(result.environment, exportName);
    if (commonJsExport != null) {
      return commonJsExport;
    }

    return reportMissing
      ? this.openValue(`Export '${exportName}' is not known on module ${moduleKey}.`, record.sourceFile)
      : null;
  }

  private resolveImportValues(record: EvaluationModuleRecord): StaticEvaluationImportValues {
    const imports = new Map<string, EvaluationValue>();
    for (const entry of record.imports) {
      if (entry.localName == null || entry.importKind === EvaluationImportKind.SideEffect) {
        continue;
      }
      const value = this.resolveImportValue(record.moduleKey, entry);
      imports.set(entry.localName, value);
    }
    return imports;
  }

  private resolveImportValue(fromModuleKey: string, entry: EvaluationImportEntry): EvaluationValue {
    if (entry.importKind === EvaluationImportKind.CommonJsRequire) {
      return this.resolveCommonJsRequireValue(fromModuleKey, entry.moduleSpecifier, entry.node);
    }
    const targetModuleKey = this.graph.readLinkedModule(fromModuleKey, entry.moduleSpecifier);
    if (targetModuleKey == null) {
      return this.externalValueResolver?.resolveImportValue(fromModuleKey, entry)
        ?? (isRelativeModuleSpecifier(entry.moduleSpecifier)
          ? this.openValue(`Import '${entry.moduleSpecifier}' from ${fromModuleKey} did not resolve to a local module.`, entry.node)
          : externalImportBoundaryValue(entry));
    }
    if (entry.importKind === EvaluationImportKind.Namespace) {
      this.evaluateModule(targetModuleKey);
      return new EvaluationModuleNamespaceValue(targetModuleKey, this.readModuleExportMap(targetModuleKey), entry.node);
    }
    const exportName = entry.exportName ?? 'default';
    return this.readExportValue(targetModuleKey, exportName)
      ?? this.openValue(`Import '${entry.localName ?? exportName}' from ${entry.moduleSpecifier} did not resolve to a static export.`, entry.node);
  }

  private resolveCommonJsRequireValue(
    fromModuleKey: string,
    moduleSpecifier: string,
    node: ts.Node,
  ): EvaluationValue {
    const targetModuleKey = this.graph.readLinkedModule(fromModuleKey, moduleSpecifier);
    if (targetModuleKey == null) {
      return isRelativeModuleSpecifier(moduleSpecifier)
        ? this.openValue(`CommonJS require '${moduleSpecifier}' from ${fromModuleKey} did not resolve to a local module.`, node)
        : new EvaluationBoundaryValue(
          EvaluationBoundaryKind.ExternalModule,
          `CommonJS require '${moduleSpecifier}'`,
          node,
        );
    }
    const result = this.evaluateModule(targetModuleKey);
    if (result == null) {
      const record = this.graph.readModule(targetModuleKey);
      return this.openValue(`CommonJS require '${moduleSpecifier}' target could not be evaluated.`, record?.sourceFile ?? node);
    }
    const commonJsExport = readCommonJsRequireValue(result.environment);
    if (commonJsExport != null) {
      return commonJsExport;
    }
    return new EvaluationModuleNamespaceValue(targetModuleKey, this.readModuleExportMap(targetModuleKey), node);
  }

  private resolveDynamicImportValue(
    fromModuleKey: string,
    moduleSpecifier: string,
    node: ts.CallExpression,
  ): EvaluationValue {
    const targetModuleKey = this.graph.readLinkedModule(fromModuleKey, moduleSpecifier);
    if (targetModuleKey == null) {
      return isRelativeModuleSpecifier(moduleSpecifier)
        ? this.openValue(`Dynamic import '${moduleSpecifier}' from ${fromModuleKey} did not resolve to a local module.`, node)
        : new EvaluationPromiseValue(
          new EvaluationBoundaryObjectValue(
            EvaluationBoundaryKind.ExternalModule,
            `dynamic import '${moduleSpecifier}'`,
            new Map(),
            node,
          ),
          node,
        );
    }
    this.evaluateModule(targetModuleKey);
    return new EvaluationPromiseValue(
      new EvaluationModuleNamespaceValue(targetModuleKey, this.readModuleExportMap(targetModuleKey), node),
      node,
    );
  }

  private readReExportValue(
    fromModuleKey: string,
    moduleSpecifier: string,
    exportName: string,
    node: ts.Node,
    reportMissing: boolean,
  ): EvaluationValue | null {
    const targetModuleKey = this.graph.readLinkedModule(fromModuleKey, moduleSpecifier);
    return targetModuleKey == null
      ? isRelativeModuleSpecifier(moduleSpecifier)
        ? this.openValue(`Re-export '${moduleSpecifier}' from ${fromModuleKey} did not resolve to a local module.`, node)
        : new EvaluationBoundaryValue(
          EvaluationBoundaryKind.ExternalModule,
          `re-export '${exportName}' from '${moduleSpecifier}'`,
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
      if (entry.exportKind !== EvaluationExportKind.ExportAll || entry.moduleSpecifier == null) {
        continue;
      }
      const value = this.readReExportValue(record.moduleKey, entry.moduleSpecifier, exportName, entry.node, false);
      if (value != null && value.kind !== EvaluationValueKind.Unknown) {
        candidates.push(value);
      }
    }
    return candidates;
  }

  private readModuleExportMap(moduleKey: string): ReadonlyMap<string, EvaluationValue> {
    const exports = new Map<string, EvaluationValue>();
    const record = this.graph.readModule(moduleKey);
    if (record == null) {
      return exports;
    }
    for (const entry of record.exports) {
      if (entry.exportKind === EvaluationExportKind.ExportAll || entry.exportName === '*') {
        continue;
      }
      const value = this.readExportValue(moduleKey, entry.exportName);
      if (value != null) {
        exports.set(entry.exportName, value);
      }
    }
    const result = this.evaluateModule(moduleKey);
    if (result != null) {
      for (const [name, value] of readCommonJsExportMap(result.environment)) {
        if (!exports.has(name)) {
          exports.set(name, value);
        }
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

function externalImportBoundaryValue(entry: EvaluationImportEntry): EvaluationValue {
  const importedName = entry.exportName ?? entry.localName ?? '*';
  if (entry.importKind === EvaluationImportKind.Namespace) {
    return new EvaluationBoundaryObjectValue(
      EvaluationBoundaryKind.ExternalModule,
      `namespace import '${entry.moduleSpecifier}'`,
      new Map(),
      entry.node,
    );
  }
  return new EvaluationBoundaryValue(
    EvaluationBoundaryKind.ExternalModule,
    `import '${importedName}' from '${entry.moduleSpecifier}'`,
    entry.node,
  );
}

function isRelativeModuleSpecifier(moduleSpecifier: string): boolean {
  return moduleSpecifier.startsWith('./') || moduleSpecifier.startsWith('../');
}

function readCommonJsExportValue(
  environment: ModuleEnvironmentRecord,
  exportName: string,
): EvaluationValue | null {
  const moduleExports = readCommonJsModuleExportsValue(environment);
  if (exportName === 'default' && moduleExports != null) {
    return moduleExports;
  }
  if (moduleExports?.kind === EvaluationValueKind.Object) {
    return moduleExports.properties.get(exportName)?.value ?? null;
  }
  const exportsValue = readCommonJsExportsBindingObject(environment);
  if (exportName === 'default') {
    return exportsValue;
  }
  return exportsValue?.properties.get(exportName)?.value ?? null;
}

function readCommonJsExportMap(
  environment: ModuleEnvironmentRecord,
): ReadonlyMap<string, EvaluationValue> {
  const moduleExports = readCommonJsModuleExportsValue(environment);
  const exports = moduleExports?.kind === EvaluationValueKind.Object
    ? moduleExports
    : readCommonJsExportsBindingObject(environment);
  if (exports == null) {
    return new Map();
  }
  return new Map([...exports.properties].map(([name, property]) => [name, property.value]));
}

function readCommonJsRequireValue(
  environment: ModuleEnvironmentRecord,
): EvaluationValue | null {
  return readCommonJsModuleExportsValue(environment)
    ?? readCommonJsExportsBindingObject(environment);
}

function readCommonJsModuleExportsValue(
  environment: ModuleEnvironmentRecord,
): EvaluationValue | null {
  const moduleValue = environment.readValue('module');
  if (moduleValue?.kind === EvaluationValueKind.Object) {
    return moduleValue.properties.get('exports')?.value ?? null;
  }
  return null;
}

function readCommonJsExportsBindingObject(
  environment: ModuleEnvironmentRecord,
): EvaluationObjectValue | null {
  const exportsValue = environment.readValue('exports');
  return exportsValue?.kind === EvaluationValueKind.Object ? exportsValue : null;
}
