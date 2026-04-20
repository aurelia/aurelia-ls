import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import ts from 'typescript';

import { type ExportsOutput } from './exports-contract.js';
import { createLiveQueryKernel } from './live-query/runtime.js';
import {
  Framework,
  ProgramRef,
  SourceFileRef,
  SourceNodeRef,
  SourceSpan,
  SymbolRef,
  type DeclarationExport,
  type BundleArray,
  type RegistryObject,
} from './aurelia/index.js';
import {
  isAureliaFrameworkPackageName,
  resolveAureliaFrameworkRepoPath,
} from './aurelia-framework-goldens.js';

export const AURELIA_CONFIGURATION_GOLDEN_SCHEMA_VERSION = 'v0alpha1' as const;
export const AURELIA_CONFIGURATION_GOLDEN_SUITE_ID = 'aurelia-configurations' as const;

export interface AureliaConfigurationGoldenBundleArray {
  readonly kind: 'bundle-array';
  readonly packageName: string | null;
  readonly exportName: string;
  readonly declarationFile: string | null;
  readonly elementCount: number;
  readonly elementNames: readonly string[];
}

export interface AureliaConfigurationGoldenFactoryMethod {
  readonly name: string;
  readonly role: string;
  readonly returnsRegistry: boolean;
  readonly bundleSpreads: readonly string[];
  readonly helperCalls: readonly string[];
}

export interface AureliaConfigurationGoldenRegistryObject {
  readonly kind: 'registry-object';
  readonly packageName: string | null;
  readonly exportName: string;
  readonly declarationFile: string | null;
  readonly originKind: string;
  readonly registerMethod:
    | {
      readonly bundleSpreads: readonly string[];
      readonly helperCalls: readonly string[];
    }
    | null;
  readonly factoryMethods: readonly AureliaConfigurationGoldenFactoryMethod[];
}

export interface AureliaConfigurationGoldenSummary {
  readonly packageCount: number;
  readonly bundleArrayCount: number;
  readonly registryObjectCount: number;
  readonly factoryMethodCount: number;
}

export interface AureliaConfigurationGoldenSuite {
  readonly schemaVersion: typeof AURELIA_CONFIGURATION_GOLDEN_SCHEMA_VERSION;
  readonly suiteId: typeof AURELIA_CONFIGURATION_GOLDEN_SUITE_ID;
  readonly summary: AureliaConfigurationGoldenSummary;
  readonly bundleArrays: readonly AureliaConfigurationGoldenBundleArray[];
  readonly registryObjects: readonly AureliaConfigurationGoldenRegistryObject[];
}

export interface CollectAureliaConfigurationGoldensOptions {
  readonly repoPath: string;
  readonly packageNames?: readonly string[] | null;
}

export function collectAureliaConfigurationGoldens(
  options: CollectAureliaConfigurationGoldensOptions,
): AureliaConfigurationGoldenSuite {
  const repoPath = resolve(options.repoPath);
  const kernel = createLiveQueryKernel({ repoPath });
  const outputs = kernel.loadOutputs();
  return collectFromExportsOutput(outputs.exports, {
    packageNames: options.packageNames,
    repoPath,
  });
}

export function collectFromExportsOutput(
  output: ExportsOutput,
  options: {
    readonly packageNames?: readonly string[] | null;
    readonly repoPath: string;
  },
): AureliaConfigurationGoldenSuite {
  const selectedPackages = selectPackages(output, options.packageNames);
  const framework = buildFrameworkFromExportsOutput(output, options);
  const packageNameByPath = buildPackageNameByPath(selectedPackages);
  const bundleArrays = dedupeRows(
    framework.configurations().readBundleArrays()
    .slice()
    .sort(compareBundleArrays)
    .map((current) => normalizeBundleArray(current, packageNameByPath)),
    (current) => JSON.stringify(current),
  );
  const registryObjects = dedupeRows(
    framework.configurations().readRegistryObjects()
    .slice()
    .sort(compareRegistryObjects)
    .map((current) => normalizeRegistryObject(current, packageNameByPath)),
    (current) => JSON.stringify(current),
  );

  return {
    schemaVersion: AURELIA_CONFIGURATION_GOLDEN_SCHEMA_VERSION,
    suiteId: AURELIA_CONFIGURATION_GOLDEN_SUITE_ID,
    summary: {
      packageCount: selectedPackages.length,
      bundleArrayCount: bundleArrays.length,
      registryObjectCount: registryObjects.length,
      factoryMethodCount: registryObjects.reduce(
        (sum, current) => sum + current.factoryMethods.length,
        0,
      ),
    },
    bundleArrays,
    registryObjects,
  };
}

export {
  resolveAureliaFrameworkRepoPath,
};

export function buildFrameworkFromExportsOutput(
  output: ExportsOutput,
  options: {
    readonly packageNames?: readonly string[] | null;
    readonly repoPath: string;
  },
): Framework {
  const selectedPackages = selectPackages(output, options.packageNames);
  const declarationExports = buildDeclarationExports(
    output,
    selectedPackages.map((current) => current.package_name),
    options.repoPath,
  );
  return new Framework(options.repoPath, {
    rootDir: options.repoPath,
    packageNames: selectedPackages.map((current) => current.package_name),
    exports: declarationExports,
  });
}

function buildDeclarationExports(
  output: ExportsOutput,
  packageNames: readonly string[],
  repoPath: string,
): readonly DeclarationExport[] {
  const program = new ProgramRef(
    'program:aurelia-configurations',
    repoPath,
    null,
  );
  const selected = new Set(packageNames);
  const seen = new Set<string>();
  const fileIndex = new Map<string, ParsedExportFile>();
  const results: DeclarationExport[] = [];

  for (const row of output.exports) {
    if (!selected.has(row.package_name) || !row.value_exported || row.declaration_file == null) {
      continue;
    }

    const parsed = getParsedExportFile(fileIndex, repoPath, program, row.declaration_file);
    if (parsed == null) {
      continue;
    }

    const declarationName = row.declaration_name || row.original_name || row.exported_name;
    const source = parsed.exportedDeclarationsByName.get(declarationName)
      ?? parsed.exportedDeclarationsByName.get(row.exported_name)
      ?? null;
    if (source == null) {
      continue;
    }

    const dedupeKey = [
      row.exported_name,
      row.declaration_file,
      source.id,
    ].join('\0');
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    results.push({
      name: row.exported_name,
      symbol: new SymbolRef(
        `symbol:${row.package_name}:${row.exported_name}:${source.id}`,
        parsed.file,
        row.declaration_name || row.original_name || row.exported_name,
        [row.exported_name],
        source,
      ),
      sourceFile: parsed.file,
    });
  }

  return results;
}

function buildPackageNameByPath(
  packages: readonly ExportsOutput['packages'][number][],
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const current of packages) {
    map.set(normalizeSlashes(current.package_dir), current.package_name);
  }
  return map;
}

function compareBundleArrays(
  left: BundleArray,
  right: BundleArray,
): number {
  return compareNullable(left.sourceExport.sourceFile?.path ?? null, right.sourceExport.sourceFile?.path ?? null)
    || left.sourceExport.name.localeCompare(right.sourceExport.name);
}

function compareRegistryObjects(
  left: RegistryObject,
  right: RegistryObject,
): number {
  return compareNullable(left.sourceExport.sourceFile?.path ?? null, right.sourceExport.sourceFile?.path ?? null)
    || left.sourceExport.name.localeCompare(right.sourceExport.name);
}

function compareNullable(
  left: string | null,
  right: string | null,
): number {
  if (left === right) {
    return 0;
  }
  if (left == null) {
    return -1;
  }
  if (right == null) {
    return 1;
  }
  return left.localeCompare(right);
}

function derivePackageName(
  sourceFilePath: string | null,
  packageNameByPath: ReadonlyMap<string, string>,
): string | null {
  if (sourceFilePath == null) {
    return null;
  }

  const normalized = normalizeSlashes(sourceFilePath);
  let bestMatch: string | null = null;
  for (const packageDir of packageNameByPath.keys()) {
    if (normalized === packageDir || normalized.startsWith(`${packageDir}/`)) {
      if (bestMatch == null || packageDir.length > bestMatch.length) {
        bestMatch = packageDir;
      }
    }
  }

  return bestMatch == null ? null : packageNameByPath.get(bestMatch) ?? null;
}

function getParsedExportFile(
  cache: Map<string, ParsedExportFile | null>,
  repoPath: string,
  program: ProgramRef,
  declarationFile: string,
): ParsedExportFile | null {
  const normalized = normalizeSlashes(declarationFile);
  const cached = cache.get(normalized);
  if (cached !== undefined) {
    return cached;
  }

  const absPath = resolve(repoPath, normalized);
  if (!existsSync(absPath)) {
    cache.set(normalized, null);
    return null;
  }

  const sourceText = readFileSync(absPath, 'utf8');
  const sourceFile = ts.createSourceFile(
    absPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const file = new SourceFileRef(
    `file:${normalized}`,
    program,
    normalized,
  );
  const exportedDeclarationsByName = collectExportedDeclarations(sourceFile, file);
  const parsed = {
    file,
    exportedDeclarationsByName,
  };
  cache.set(normalized, parsed);
  return parsed;
}

function collectExportedDeclarations(
  sourceFile: ts.SourceFile,
  file: SourceFileRef,
): ReadonlyMap<string, SourceNodeRef> {
  const map = new Map<string, SourceNodeRef>();

  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) {
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          map.set(
            declaration.name.text,
            createNodeRef(file, 'VariableDeclaration', declaration),
          );
        }
      }
      continue;
    }

    if (
      (ts.isFunctionDeclaration(statement)
        || ts.isClassDeclaration(statement)
        || ts.isInterfaceDeclaration(statement)
        || ts.isTypeAliasDeclaration(statement)
        || ts.isEnumDeclaration(statement))
      && statement.name != null
    ) {
      map.set(
        statement.name.text,
        createNodeRef(file, ts.SyntaxKind[statement.kind], statement),
      );
    }
  }

  return map;
}

function createNodeRef(
  file: SourceFileRef,
  nodeKind: string,
  node: ts.Node,
): SourceNodeRef {
  return new SourceNodeRef(
    `${file.id}:${nodeKind}:${node.getStart()}-${node.end}`,
    file,
    nodeKind,
    new SourceSpan(node.getStart(), node.end),
  );
}

function hasExportModifier(
  node: ts.Node,
): boolean {
  const modifiers = ts.canHaveModifiers(node)
    ? ts.getModifiers(node)
    : undefined;
  return modifiers?.some((current) => current.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function normalizeBundleArray(
  current: BundleArray,
  packageNameByPath: ReadonlyMap<string, string>,
): AureliaConfigurationGoldenBundleArray {
  const declarationFile = current.sourceExport.sourceFile?.path ?? null;
  return {
    kind: 'bundle-array',
    packageName: derivePackageName(declarationFile, packageNameByPath),
    exportName: current.sourceExport.name,
    declarationFile,
    elementCount: current.elementCount,
    elementNames: [...current.elementNames],
  };
}

function normalizeRegistryObject(
  current: RegistryObject,
  packageNameByPath: ReadonlyMap<string, string>,
): AureliaConfigurationGoldenRegistryObject {
  const declarationFile = current.sourceExport.sourceFile?.path ?? null;
  return {
    kind: 'registry-object',
    packageName: derivePackageName(declarationFile, packageNameByPath),
    exportName: current.sourceExport.name,
    declarationFile,
    originKind: current.originKind,
    registerMethod: current.registerMethod == null
      ? null
      : {
        bundleSpreads: current.registerMethod.bundleSpreads.map((spread) => spread.referenceName),
        helperCalls: current.registerMethod.helperCalls.map((call) => call.calleeName),
      },
    factoryMethods: current.factoryMethods.map((method) => ({
      name: method.name,
      role: method.role,
      returnsRegistry: method.returnsRegistry,
      bundleSpreads: method.bundleSpreads.map((spread) => spread.referenceName),
      helperCalls: method.helperCalls.map((call) => call.calleeName),
    })),
  };
}

function normalizeSlashes(
  value: string,
): string {
  return value.replace(/\\/g, '/');
}

function dedupeRows<T>(
  rows: readonly T[],
  toKey: (row: T) => string,
): readonly T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const row of rows) {
    const key = toKey(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

function selectPackages(
  output: ExportsOutput,
  packageNames: readonly string[] | null | undefined,
): readonly ExportsOutput['packages'][number][] {
  const explicitPackages = packageNames ? new Set(packageNames) : null;
  return output.packages
    .filter((pkg) => explicitPackages
      ? explicitPackages.has(pkg.package_name)
      : isAureliaFrameworkPackageName(pkg.package_name))
    .sort((left, right) => left.package_name.localeCompare(right.package_name));
}

interface ParsedExportFile {
  readonly file: SourceFileRef;
  readonly exportedDeclarationsByName: ReadonlyMap<string, SourceNodeRef>;
}
