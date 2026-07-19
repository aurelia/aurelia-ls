import type ts from 'typescript';
import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
  type StaticEvaluationImportValues,
  type StaticModuleEvaluationResult,
} from './evaluator.js';
import {
  readStaticCommonJsExportMap,
  readStaticCommonJsExportValue,
  readStaticCommonJsRequireValue,
} from './commonjs.js';
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
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationBoundaryValue,
  EvaluationModuleNamespaceExport,
  EvaluationModuleNamespaceValue,
  EvaluationPromiseValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';
import { isRelativeModuleSpecifier } from './module-specifier.js';

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
  private readonly evaluatorRuntimeHost: StaticEvaluationRuntimeHost;

  constructor(
    /** Directed module graph built from source syntax and host resolution. */
    readonly graph: EvaluationModuleGraph,
    /** Product-specific ownership hooks for expression statements whose effects are modeled elsewhere. */
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
    /** Product-specific call intrinsics layered on top of generic ECMAScript evaluation. */
    readonly runtimeHost: StaticEvaluationRuntimeHost = {},
    /** Product-specific values for declaration/external imports that remain outside the local graph. */
    readonly externalValueResolver: StaticModuleExternalValueResolver | null = null,
  ) {
    this.evaluatorRuntimeHost = {
      ...runtimeHost,
      resolveCommonJsRequire: (currentModuleKey, moduleSpecifier, node) =>
        runtimeHost.resolveCommonJsRequire?.(currentModuleKey, moduleSpecifier, node)
        ?? this.resolveCommonJsRequireValue(currentModuleKey, moduleSpecifier, node),
      resolveDynamicImport: (currentModuleKey, moduleSpecifier, node) =>
        runtimeHost.resolveDynamicImport?.(currentModuleKey, moduleSpecifier, node)
        ?? this.resolveDynamicImportValue(currentModuleKey, moduleSpecifier, node),
    };
  }

  /** Evaluate one entry module and any modules needed by its imports or re-exports. */
  evaluate(entryModuleKey: string): StaticModuleGraphEvaluationResult {
    return this.evaluateEntries([entryModuleKey]);
  }

  /** Evaluate several entry modules while preserving one shared module/value identity domain. */
  evaluateEntries(entryModuleKeys: readonly string[]): StaticModuleGraphEvaluationResult {
    for (const entryModuleKey of entryModuleKeys) {
      this.evaluateModule(entryModuleKey);
    }
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
    const result = new StaticEvaluator(this.policy, this.evaluatorRuntimeHost)
      .evaluateSourceFile(record.sourceFile, moduleKey, imports);
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
      if (entry.exportKind === EvaluationExportKind.Local && entry.exportName === exportName && entry.valueName != null) {
        return result.environment.readValue(entry.valueName)
          ?? this.openValue(`Local export '${exportName}' did not resolve to an environment binding.`, entry.node);
      }
      if (entry.exportKind === EvaluationExportKind.Default && exportName === 'default') {
        return entry.valueName == null
          ? this.openValue('Default export did not expose a local environment binding.', entry.node)
          : result.environment.readValue(entry.valueName)
            ?? this.openValue('Default export did not resolve to a static value.', entry.node);
      }
      if (
        entry.exportKind === EvaluationExportKind.ReExport
        && entry.exportName === exportName
        && entry.moduleSpecifier != null
        && entry.valueName != null
      ) {
        return this.readReExportValue(moduleKey, entry.moduleSpecifier, entry.valueName, entry.node, true);
      }
      if (
        entry.exportKind === EvaluationExportKind.NamespaceReExport
        && entry.exportName === exportName
        && entry.moduleSpecifier != null
      ) {
        return this.readNamespaceReExportValue(moduleKey, entry.moduleSpecifier, entry.node);
      }
    }

    const exportAllCandidates = this.readExportAllCandidates(record, exportName);
    const uniqueExportAllCandidates = uniqueExportCandidates(exportAllCandidates);
    if (uniqueExportAllCandidates.length === 1) {
      const candidate = uniqueExportAllCandidates[0];
      if (candidate != null) {
        return candidate.value;
      }
    }
    if (uniqueExportAllCandidates.length > 1) {
      return reportMissing
        ? this.openValue(`Export '${exportName}' is ambiguous across export-star entries in ${moduleKey}.`, record.sourceFile)
        : null;
    }

    const commonJsExport = readStaticCommonJsExportValue(result.environment, exportName);
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
      if (entry.importKind === EvaluationImportKind.SideEffect) {
        this.evaluateSideEffectImport(record.moduleKey, entry);
        continue;
      }
      if (entry.localName == null) {
        continue;
      }
      const value = this.resolveImportValue(record.moduleKey, entry);
      imports.set(entry.localName, value);
    }
    return imports;
  }

  private evaluateSideEffectImport(fromModuleKey: string, entry: EvaluationImportEntry): void {
    const targetModuleKey = this.graph.readLinkedModule(fromModuleKey, entry.moduleSpecifier);
    if (targetModuleKey == null) {
      if (isRelativeModuleSpecifier(entry.moduleSpecifier)) {
        this.openValue(`Side-effect import '${entry.moduleSpecifier}' from ${fromModuleKey} did not resolve to a local module.`, entry.node);
      }
      return;
    }
    const result = this.evaluateModule(targetModuleKey);
    if (result == null) {
      const record = this.graph.readModule(targetModuleKey);
      this.openValue(`Side-effect import '${entry.moduleSpecifier}' target could not be evaluated.`, record?.sourceFile ?? entry.node);
    }
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
      return this.readModuleNamespaceValue(targetModuleKey, entry.node);
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
    const commonJsExport = readStaticCommonJsRequireValue(result.environment);
    if (commonJsExport != null) {
      return commonJsExport;
    }
    return this.readModuleNamespaceValue(targetModuleKey, node);
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
      this.readModuleNamespaceValue(targetModuleKey, node),
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

  private readNamespaceReExportValue(
    fromModuleKey: string,
    moduleSpecifier: string,
    node: ts.Node,
  ): EvaluationValue {
    const targetModuleKey = this.graph.readLinkedModule(fromModuleKey, moduleSpecifier);
    return targetModuleKey == null
      ? isRelativeModuleSpecifier(moduleSpecifier)
        ? this.openValue(`Namespace re-export '${moduleSpecifier}' from ${fromModuleKey} did not resolve to a local module.`, node)
        : new EvaluationBoundaryObjectValue(
          EvaluationBoundaryKind.ExternalModule,
          `namespace re-export '${moduleSpecifier}'`,
          new Map(),
          node,
        )
      : this.readModuleNamespaceValue(targetModuleKey, node);
  }

  private readExportAllCandidates(
    record: EvaluationModuleRecord,
    exportName: string,
  ): readonly EvaluationExportCandidate[] {
    const candidates: EvaluationExportCandidate[] = [];
    for (const [index, entry] of record.exports.entries()) {
      if (entry.exportKind !== EvaluationExportKind.ExportAll || entry.moduleSpecifier == null) {
        continue;
      }
      const value = this.readReExportValue(record.moduleKey, entry.moduleSpecifier, exportName, entry.node, false);
      if (value != null && value.kind !== EvaluationValueKind.Unknown) {
        candidates.push(new EvaluationExportCandidate(
          value,
          this.readReExportBindingIdentity(record.moduleKey, entry.moduleSpecifier, exportName, new Set())
            ?? `open:${record.moduleKey}:${index}:${exportName}`,
        ));
      }
    }
    return candidates;
  }

  private readReExportBindingIdentity(
    fromModuleKey: string,
    moduleSpecifier: string,
    exportName: string,
    activeExports: Set<string>,
  ): string | null {
    const targetModuleKey = this.graph.readLinkedModule(fromModuleKey, moduleSpecifier);
    return targetModuleKey == null
      ? isRelativeModuleSpecifier(moduleSpecifier)
        ? null
        : `external:${moduleSpecifier}:${exportName}`
      : this.readExportBindingIdentity(targetModuleKey, exportName, activeExports);
  }

  /** Resolve ECMAScript export binding origin independently from the binding's current evaluator value. */
  private readExportBindingIdentity(
    moduleKey: string,
    exportName: string,
    activeExports: Set<string>,
  ): string | null {
    const activeKey = `${moduleKey}\0${exportName}`;
    if (activeExports.has(activeKey)) {
      return null;
    }
    const record = this.graph.readModule(moduleKey);
    if (record == null) {
      return null;
    }
    activeExports.add(activeKey);
    try {
      for (const entry of record.exports) {
        if (
          entry.exportKind === EvaluationExportKind.Local
          && entry.exportName === exportName
          && entry.valueName != null
        ) {
          return this.readLocalBindingIdentity(record, entry.valueName, activeExports);
        }
        if (entry.exportKind === EvaluationExportKind.Default && exportName === 'default') {
          return entry.valueName == null
            ? null
            : this.readLocalBindingIdentity(record, entry.valueName, activeExports);
        }
        if (
          entry.exportKind === EvaluationExportKind.ReExport
          && entry.exportName === exportName
          && entry.moduleSpecifier != null
          && entry.valueName != null
        ) {
          return this.readReExportBindingIdentity(
            moduleKey,
            entry.moduleSpecifier,
            entry.valueName,
            activeExports,
          );
        }
        if (
          entry.exportKind === EvaluationExportKind.NamespaceReExport
          && entry.exportName === exportName
          && entry.moduleSpecifier != null
        ) {
          const targetModuleKey = this.graph.readLinkedModule(moduleKey, entry.moduleSpecifier);
          return targetModuleKey == null
            ? isRelativeModuleSpecifier(entry.moduleSpecifier)
              ? null
              : `external-namespace:${entry.moduleSpecifier}`
            : `module-namespace:${targetModuleKey}`;
        }
      }

      const starIdentities = record.exports.flatMap((entry) => {
        if (entry.exportKind !== EvaluationExportKind.ExportAll || entry.moduleSpecifier == null) {
          return [];
        }
        const identity = this.readReExportBindingIdentity(
          moduleKey,
          entry.moduleSpecifier,
          exportName,
          activeExports,
        );
        return identity == null ? [] : [identity];
      });
      const uniqueStarIdentities = [...new Set(starIdentities)];
      if (uniqueStarIdentities.length === 1) {
        return uniqueStarIdentities[0] ?? null;
      }
      if (uniqueStarIdentities.length > 1) {
        return null;
      }

      const result = this.evaluateModule(moduleKey);
      return result != null && readStaticCommonJsExportValue(result.environment, exportName) != null
        ? `commonjs:${moduleKey}:${exportName}`
        : null;
    } finally {
      activeExports.delete(activeKey);
    }
  }

  private readLocalBindingIdentity(
    record: EvaluationModuleRecord,
    localName: string,
    activeExports: Set<string>,
  ): string | null {
    const imported = record.imports.find((entry) =>
      entry.localName === localName
      && entry.importKind !== EvaluationImportKind.SideEffect
      && entry.importKind !== EvaluationImportKind.CommonJsRequire
      && entry.importKind !== EvaluationImportKind.DynamicImport
    );
    if (imported == null) {
      return `local:${record.moduleKey}:${localName}`;
    }
    const targetModuleKey = this.graph.readLinkedModule(record.moduleKey, imported.moduleSpecifier);
    if (imported.importKind === EvaluationImportKind.Namespace) {
      return targetModuleKey == null
        ? isRelativeModuleSpecifier(imported.moduleSpecifier)
          ? null
          : `external-namespace:${imported.moduleSpecifier}`
        : `module-namespace:${targetModuleKey}`;
    }
    const targetExportName = imported.exportName ?? 'default';
    return targetModuleKey == null
      ? isRelativeModuleSpecifier(imported.moduleSpecifier)
        ? null
        : `external:${imported.moduleSpecifier}:${targetExportName}`
      : this.readExportBindingIdentity(targetModuleKey, targetExportName, activeExports);
  }

  private readModuleNamespaceValue(
    moduleKey: string,
    node: ts.Node,
  ): EvaluationModuleNamespaceValue {
    this.evaluateModule(moduleKey);
    const names = this.readModuleNamespaceExportNames(moduleKey, new Set());
    const exportEntries = new Map<string, EvaluationModuleNamespaceExport>();
    let mayHaveUnknownExports = names.open;
    for (const name of [...names.names].sort()) {
      const value = this.readExportValueCore(moduleKey, name, false);
      if (value == null) {
        mayHaveUnknownExports = true;
        continue;
      }
      mayHaveUnknownExports ||= value.kind === EvaluationValueKind.Unknown;
      exportEntries.set(name, new EvaluationModuleNamespaceExport(
        name,
        value,
        this.readModuleExportSourceNode(moduleKey, name, new Set()) ?? value.node,
      ));
    }
    return new EvaluationModuleNamespaceValue(moduleKey, exportEntries, mayHaveUnknownExports, node);
  }

  private readModuleNamespaceExportNames(
    moduleKey: string,
    activeModules: Set<string>,
  ): ModuleNamespaceExportNameSet {
    if (activeModules.has(moduleKey)) {
      return new ModuleNamespaceExportNameSet(new Set(), false);
    }
    const record = this.graph.readModule(moduleKey);
    if (record == null) {
      return new ModuleNamespaceExportNameSet(new Set(), true);
    }
    activeModules.add(moduleKey);
    const names = new Set<string>();
    let open = false;
    for (const entry of record.exports) {
      if (entry.exportKind === EvaluationExportKind.ExportAll || entry.exportName === '*' || entry.exportKind === EvaluationExportKind.ExportEquals) {
        continue;
      }
      names.add(entry.exportName);
    }
    for (const entry of record.exports) {
      if (entry.exportKind !== EvaluationExportKind.ExportAll || entry.moduleSpecifier == null) {
        continue;
      }
      const targetModuleKey = this.graph.readLinkedModule(moduleKey, entry.moduleSpecifier);
      if (targetModuleKey == null) {
        open = true;
        continue;
      }
      const nested = this.readModuleNamespaceExportNames(targetModuleKey, activeModules);
      open ||= nested.open;
      for (const name of nested.names) {
        if (name !== 'default') {
          names.add(name);
        }
      }
    }
    const result = this.evaluateModule(moduleKey);
    if (result != null) {
      for (const [name, value] of readStaticCommonJsExportMap(result.environment)) {
        void value;
        names.add(name);
      }
    } else {
      open = true;
    }
    activeModules.delete(moduleKey);
    return new ModuleNamespaceExportNameSet(names, open);
  }

  private readModuleExportSourceNode(
    moduleKey: string,
    exportName: string,
    activeModules: Set<string>,
  ): ts.Node | null {
    if (activeModules.has(moduleKey)) {
      return null;
    }
    activeModules.add(moduleKey);
    const record = this.graph.readModule(moduleKey);
    if (record == null) {
      return null;
    }
    const explicit = record.exports.find((entry) =>
      entry.exportKind !== EvaluationExportKind.ExportAll && entry.exportName === exportName
    );
    if (explicit != null) {
      return explicit.node;
    }
    for (const entry of record.exports) {
      if (entry.exportKind !== EvaluationExportKind.ExportAll || entry.moduleSpecifier == null) {
        continue;
      }
      const targetModuleKey = this.graph.readLinkedModule(moduleKey, entry.moduleSpecifier);
      if (targetModuleKey == null) {
        continue;
      }
      const nested = this.readModuleExportSourceNode(targetModuleKey, exportName, activeModules);
      if (nested != null) {
        return nested;
      }
    }
    return null;
  }

  private openValue(reason: string, node: ts.Node | null): EvaluationUnknownValue {
    const value = new EvaluationUnknownValue(reason, node);
    this.openValues.push(value);
    return value;
  }
}

class ModuleNamespaceExportNameSet {
  constructor(
    readonly names: ReadonlySet<string>,
    readonly open: boolean,
  ) {}
}

class EvaluationExportCandidate {
  constructor(
    readonly value: EvaluationValue,
    readonly bindingIdentity: string,
  ) {}
}

function uniqueExportCandidates(
  candidates: readonly EvaluationExportCandidate[],
): readonly EvaluationExportCandidate[] {
  const byBindingIdentity = new Map<string, EvaluationExportCandidate>();
  for (const candidate of candidates) {
    byBindingIdentity.set(candidate.bindingIdentity, candidate);
  }
  return [...byBindingIdentity.values()];
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
