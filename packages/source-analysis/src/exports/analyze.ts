import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import * as ts from 'typescript';

import {
  loadPackageDescriptors,
  type PackageDescriptor,
} from '../package-descriptors.js';
import type { ProgramReuseOptions } from '../program-reuse-options.js';
import { RepoSession } from '../repo-session.js';
import type {
  ExportChainStep,
  ExportFaceKind,
  ExportsOutput,
  PackageExportRecord,
  PackageExportsSummary,
} from './schema.js';

interface ModuleDeclarationInfo {
  name: string;
  line: number;
  inherentlyTypeOnly: boolean;
}

interface LocalExportSpecifierInfo {
  exportedName: string;
  originalName: string;
  line: number;
  typeOnly: boolean;
}

interface ImportBindingInfo {
  localName: string;
  importedName: string;
  line: number;
  typeOnly: boolean;
  specifier: string;
  targetFile: string | null;
}

interface NamedReexportInfo {
  exportedName: string;
  originalName: string;
  line: number;
  typeOnly: boolean;
  specifier: string;
  targetFile: string | null;
}

interface StarReexportInfo {
  line: number;
  typeOnly: boolean;
  specifier: string;
  targetFile: string | null;
}

interface NamespaceReexportInfo {
  exportedName: string;
  line: number;
  specifier: string;
  targetFile: string | null;
}

interface ModuleInfo {
  exportedDeclarations: Map<string, ModuleDeclarationInfo[]>;
  localExportSpecifiers: LocalExportSpecifierInfo[];
  importBindings: Map<string, ImportBindingInfo>;
  namedReexports: NamedReexportInfo[];
  starReexports: StarReexportInfo[];
  namespaceReexports: NamespaceReexportInfo[];
}

interface TraceResult {
  originalName: string;
  typeOnly: boolean;
  namespaceExport: boolean;
  chain: ExportChainStep[];
}

interface SymbolClassification {
  declarationName: string;
  declarationFile: string | null;
  declarationLine: number | null;
  faceKind: ExportFaceKind | 'merged';
  faceKinds: ExportFaceKind[];
  typeExported: boolean;
  valueExported: boolean;
}

interface ExportsAnalysisScope {
  readonly session: RepoSession;
  readonly repoPath: string;
  readonly repoPathNormalized: string;
  readonly workspacePackageEntrypointsByName: ReadonlyMap<string, string>;
}

interface PackageAnalysisContext extends ExportsAnalysisScope {
  program: ts.Program;
  checker: ts.TypeChecker;
  compilerOptions: ts.CompilerOptions;
  packageDir: string;
  entrypoint: string;
  moduleInfoCache: Map<string, ModuleInfo>;
  moduleExportsCache: Map<string, Set<string>>;
  sourceFileCache: Map<string, ts.SourceFile | null>;
}

export interface ExportsAnalysisResult {
  output: ExportsOutput;
  reportLines: string[];
  warnings: string[];
}

function toForwardSlash(value: string): string {
  return value.replace(/\\/g, '/');
}

function toRepoRelative(scope: ExportsAnalysisScope, absPath: string): string {
  return toForwardSlash(relative(scope.repoPath, absPath));
}

function readJsonFile<T>(absPath: string): T {
  return JSON.parse(readFileSync(absPath, 'utf-8')) as T;
}

function gitHead(cwd: string): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

function gitBlobHash(filePath: string): string {
  try {
    return execFileSync('git', ['hash-object', filePath], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

function resolveTsconfigForPackage(
  scope: ExportsAnalysisScope,
  packageDir: string,
): string | null {
  return scope.session.resolveNearestTsconfig(packageDir);
}

function createFallbackProgram(entrypointAbs: string): ts.Program {
  return ts.createProgram(
    [entrypointAbs],
    {
      allowJs: false,
      checkJs: false,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
    },
  );
}

function createPackageProgram(
  scope: ExportsAnalysisScope,
  descriptor: PackageDescriptor,
  options: ProgramReuseOptions,
): ts.Program {
  const entrypointAbs = resolve(scope.repoPath, descriptor.analysisEntrypoint);
  const tsconfigPath = resolveTsconfigForPackage(scope, descriptor.packageDir);

  if (!tsconfigPath) {
    return createFallbackProgram(entrypointAbs);
  }

  const loaded = scope.session.tryLoadTsconfig(tsconfigPath);
  if (!loaded.snapshot) {
    return createFallbackProgram(entrypointAbs);
  }

  try {
    return scope.session.getProgram(loaded.snapshot.absPath, 'analysis', {
      cache: options.cachePrograms,
    })
      ?? createFallbackProgram(entrypointAbs);
  } catch {
    return createFallbackProgram(entrypointAbs);
  }
}

function getProgramSourceFile(program: ts.Program, absPath: string): ts.SourceFile | null {
  const direct = program.getSourceFile(absPath);
  if (direct) return direct;

  const normalizedTarget = toForwardSlash(resolve(absPath)).toLowerCase();
  for (const sourceFile of program.getSourceFiles()) {
    if (toForwardSlash(resolve(sourceFile.fileName)).toLowerCase() === normalizedTarget) {
      return sourceFile;
    }
  }

  return null;
}

function getSourceFile(context: PackageAnalysisContext, relPath: string): ts.SourceFile | null {
  const cached = context.sourceFileCache.get(relPath);
  if (cached !== undefined) return cached;

  const absPath = resolve(context.repoPath, relPath);
  let sourceFile = getProgramSourceFile(context.program, absPath);

  if (!sourceFile && existsSync(absPath)) {
    const scriptKind = relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    sourceFile = ts.createSourceFile(
      absPath,
      readFileSync(absPath, 'utf-8'),
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );
  }

  context.sourceFileCache.set(relPath, sourceFile ?? null);
  return sourceFile ?? null;
}

function getModuleSymbol(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
): ts.Symbol | null {
  const direct = (sourceFile as ts.SourceFile & { symbol?: ts.Symbol }).symbol;
  return direct ?? checker.getSymbolAtLocation(sourceFile) ?? null;
}

function lineOfNode(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function declarationIsTypeOnly(node: ts.Node): boolean {
  return ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node);
}

function resolveModuleTarget(
  context: PackageAnalysisContext,
  sourceFile: ts.SourceFile,
  specifier: string,
): string | null {
  if (!specifier.startsWith('.')) {
    const workspaceEntrypoint = context.workspacePackageEntrypointsByName.get(specifier);
    if (workspaceEntrypoint) return workspaceEntrypoint;
  }

  const resolvedModule = ts.resolveModuleName(
    specifier,
    sourceFile.fileName,
    context.compilerOptions,
    ts.sys,
  ).resolvedModule;

  if (!resolvedModule) return null;

  const resolvedAbsPath = toForwardSlash(resolve(resolvedModule.resolvedFileName));
  if (
    resolvedAbsPath.toLowerCase() !== context.repoPathNormalized &&
    !resolvedAbsPath.toLowerCase().startsWith(`${context.repoPathNormalized}/`)
  ) {
    return null;
  }

  const relPath = toRepoRelative(context, resolvedAbsPath);
  if (relPath.startsWith('..') || context.session.isExcludedRepoRelativePath(relPath)) return null;
  return relPath;
}

function getModuleInfo(
  context: PackageAnalysisContext,
  relPath: string,
): ModuleInfo {
  const cached = context.moduleInfoCache.get(relPath);
  if (cached) return cached;

  const sourceFile = getSourceFile(context, relPath);
  const info: ModuleInfo = {
    exportedDeclarations: new Map(),
    localExportSpecifiers: [],
    importBindings: new Map(),
    namedReexports: [],
    starReexports: [],
    namespaceReexports: [],
  };

  if (!sourceFile) {
    context.moduleInfoCache.set(relPath, info);
    return info;
  }

  const moduleSourceFile = sourceFile;

  function addExportedDeclaration(name: string, node: ts.Node): void {
    const current = info.exportedDeclarations.get(name) ?? [];
    current.push({
      name,
      line: lineOfNode(moduleSourceFile, node),
      inherentlyTypeOnly: declarationIsTypeOnly(node),
    });
    info.exportedDeclarations.set(name, current);
  }

  for (const statement of moduleSourceFile.statements) {
    if (ts.isImportDeclaration(statement) && statement.importClause && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      const targetFile = resolveModuleTarget(context, moduleSourceFile, specifier);
      const clause = statement.importClause;
      const baseTypeOnly = clause.isTypeOnly;
      const importLine = lineOfNode(moduleSourceFile, statement);

      if (clause.name) {
        info.importBindings.set(clause.name.text, {
          localName: clause.name.text,
          importedName: 'default',
          line: importLine,
          typeOnly: baseTypeOnly,
          specifier,
          targetFile,
        });
      }

      if (clause.namedBindings) {
        if (ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) {
            const importedName = (element.propertyName ?? element.name).text;
            info.importBindings.set(element.name.text, {
              localName: element.name.text,
              importedName,
              line: lineOfNode(moduleSourceFile, element),
              typeOnly: baseTypeOnly || element.isTypeOnly,
              specifier,
              targetFile,
            });
          }
        } else if (ts.isNamespaceImport(clause.namedBindings)) {
          info.importBindings.set(clause.namedBindings.name.text, {
            localName: clause.namedBindings.name.text,
            importedName: '*',
            line: lineOfNode(moduleSourceFile, clause.namedBindings),
            typeOnly: baseTypeOnly,
            specifier,
            targetFile,
          });
        }
      }

      continue;
    }

    if (ts.isFunctionDeclaration(statement) && statement.name && hasExportModifier(statement)) {
      addExportedDeclaration(statement.name.text, statement);
      continue;
    }

    if (ts.isClassDeclaration(statement) && statement.name && hasExportModifier(statement)) {
      addExportedDeclaration(statement.name.text, statement);
      continue;
    }

    if (ts.isInterfaceDeclaration(statement) && hasExportModifier(statement)) {
      addExportedDeclaration(statement.name.text, statement);
      continue;
    }

    if (ts.isTypeAliasDeclaration(statement) && hasExportModifier(statement)) {
      addExportedDeclaration(statement.name.text, statement);
      continue;
    }

    if (ts.isEnumDeclaration(statement) && hasExportModifier(statement)) {
      addExportedDeclaration(statement.name.text, statement);
      continue;
    }

    if (ts.isModuleDeclaration(statement) && hasExportModifier(statement) && ts.isIdentifier(statement.name)) {
      addExportedDeclaration(statement.name.text, statement);
      continue;
    }

    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          addExportedDeclaration(declaration.name.text, declaration);
        }
      }
      continue;
    }

    if (!ts.isExportDeclaration(statement)) continue;

    const specifier = statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : undefined;
    const targetFile = specifier ? resolveModuleTarget(context, sourceFile, specifier) : null;
    const declarationTypeOnly = statement.isTypeOnly;

    if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        const record = {
          exportedName: element.name.text,
          originalName: (element.propertyName ?? element.name).text,
          line: lineOfNode(moduleSourceFile, element),
          typeOnly: declarationTypeOnly || element.isTypeOnly,
        };

        if (specifier) {
          info.namedReexports.push({
            ...record,
            specifier,
            targetFile,
          });
        } else {
          info.localExportSpecifiers.push(record);
        }
      }
      continue;
    }

    if (statement.exportClause && ts.isNamespaceExport(statement.exportClause) && specifier) {
      info.namespaceReexports.push({
        exportedName: statement.exportClause.name.text,
        line: lineOfNode(moduleSourceFile, statement.exportClause),
        specifier,
        targetFile,
      });
      continue;
    }

    if (!statement.exportClause && specifier) {
      info.starReexports.push({
        line: lineOfNode(moduleSourceFile, statement),
        typeOnly: declarationTypeOnly,
        specifier,
        targetFile,
      });
    }
  }

  context.moduleInfoCache.set(relPath, info);
  return info;
}

function getExportedNamesForModule(
  context: PackageAnalysisContext,
  relPath: string,
): Set<string> {
  const cached = context.moduleExportsCache.get(relPath);
  if (cached) return cached;

  const sourceFile = getSourceFile(context, relPath);
  const names = new Set<string>();

  if (sourceFile) {
    const moduleSymbol = getModuleSymbol(context.checker, sourceFile);
    if (moduleSymbol) {
      for (const exportSymbol of context.checker.getExportsOfModule(moduleSymbol)) {
        names.add(exportSymbol.getName());
      }
    } else {
      const moduleInfo = getModuleInfo(context, relPath);
      for (const name of moduleInfo.exportedDeclarations.keys()) names.add(name);
      for (const item of moduleInfo.localExportSpecifiers) names.add(item.exportedName);
      for (const item of moduleInfo.namedReexports) names.add(item.exportedName);
      for (const item of moduleInfo.namespaceReexports) names.add(item.exportedName);
    }
  }

  context.moduleExportsCache.set(relPath, names);
  return names;
}

function traceExport(
  context: PackageAnalysisContext,
  relPath: string,
  exportedName: string,
  visited = new Set<string>(),
): TraceResult | null {
  const visitKey = `${relPath}\0${exportedName}`;
  if (visited.has(visitKey)) return null;
  visited.add(visitKey);

  const sourceFile = getSourceFile(context, relPath);
  const moduleInfo = getModuleInfo(context, relPath);

  const localDeclarations = moduleInfo.exportedDeclarations.get(exportedName);
  if (localDeclarations && localDeclarations.length > 0) {
    const declaration = localDeclarations[0]!;
    return {
      originalName: declaration.name,
      typeOnly: declaration.inherentlyTypeOnly,
      namespaceExport: false,
      chain: [
        {
          file: relPath,
          line: declaration.line,
          kind: 'local-declaration',
          exported_name: exportedName,
          original_name: declaration.name,
          type_only: declaration.inherentlyTypeOnly,
        },
      ],
    };
  }

  for (const localExport of moduleInfo.localExportSpecifiers) {
    if (localExport.exportedName !== exportedName) continue;

    const directLocalDeclarations = moduleInfo.exportedDeclarations.get(localExport.originalName);
    if (directLocalDeclarations && directLocalDeclarations.length > 0) {
      const declaration = directLocalDeclarations[0]!;
      return {
        originalName: declaration.name,
        typeOnly: localExport.typeOnly || declaration.inherentlyTypeOnly,
        namespaceExport: false,
        chain: [
          {
            file: relPath,
            line: localExport.line,
            kind: 'local-export',
            exported_name: localExport.exportedName,
            original_name: localExport.originalName,
            type_only: localExport.typeOnly,
          },
          {
            file: relPath,
            line: declaration.line,
            kind: 'local-declaration',
            exported_name: declaration.name,
            original_name: declaration.name,
            type_only: declaration.inherentlyTypeOnly,
          },
        ],
      };
    }

    const binding = moduleInfo.importBindings.get(localExport.originalName);
    if (binding?.targetFile) {
      const traced = traceExport(context, binding.targetFile, binding.importedName, visited);
      if (traced) {
        return {
          originalName: traced.originalName,
          typeOnly: localExport.typeOnly || binding.typeOnly || traced.typeOnly,
          namespaceExport: traced.namespaceExport,
          chain: [
            {
              file: relPath,
              line: localExport.line,
              kind: 'local-export',
              exported_name: localExport.exportedName,
              original_name: localExport.originalName,
              type_only: localExport.typeOnly,
            },
            {
              file: relPath,
              line: binding.line,
              kind: 'import-alias',
              exported_name: localExport.originalName,
              original_name: binding.importedName,
              specifier: binding.specifier,
              target_file: binding.targetFile,
              type_only: binding.typeOnly,
            },
            ...traced.chain,
          ],
        };
      }
    }
  }

  for (const reexport of moduleInfo.namedReexports) {
    if (reexport.exportedName !== exportedName || !reexport.targetFile) continue;
    const traced = traceExport(context, reexport.targetFile, reexport.originalName, visited);
    if (traced) {
      return {
        originalName: traced.originalName,
        typeOnly: reexport.typeOnly || traced.typeOnly,
        namespaceExport: traced.namespaceExport,
        chain: [
          {
            file: relPath,
            line: reexport.line,
            kind: 'named-reexport',
            exported_name: reexport.exportedName,
            original_name: reexport.originalName,
            specifier: reexport.specifier,
            target_file: reexport.targetFile,
            type_only: reexport.typeOnly,
          },
          ...traced.chain,
        ],
      };
    }
  }

  for (const namespaceReexport of moduleInfo.namespaceReexports) {
    if (namespaceReexport.exportedName !== exportedName) continue;
    return {
      originalName: exportedName,
      typeOnly: false,
      namespaceExport: true,
      chain: [
        {
          file: relPath,
          line: namespaceReexport.line,
          kind: 'namespace-reexport',
          exported_name: namespaceReexport.exportedName,
          original_name: namespaceReexport.exportedName,
          specifier: namespaceReexport.specifier,
          target_file: namespaceReexport.targetFile ?? undefined,
          type_only: false,
        },
      ],
    };
  }

  for (const starReexport of moduleInfo.starReexports) {
    if (!starReexport.targetFile) continue;
    const exportedNames = getExportedNamesForModule(context, starReexport.targetFile);
    if (!exportedNames.has(exportedName)) continue;

    const traced = traceExport(context, starReexport.targetFile, exportedName, visited);
    if (traced) {
      return {
        originalName: traced.originalName,
        typeOnly: starReexport.typeOnly || traced.typeOnly,
        namespaceExport: traced.namespaceExport,
        chain: [
          {
            file: relPath,
            line: starReexport.line,
            kind: 'star-reexport',
            exported_name: exportedName,
            original_name: exportedName,
            specifier: starReexport.specifier,
            target_file: starReexport.targetFile,
            type_only: starReexport.typeOnly,
          },
          ...traced.chain,
        ],
      };
    }
  }

  if (sourceFile) {
    return {
      originalName: exportedName,
      typeOnly: false,
      namespaceExport: false,
      chain: [
        {
          file: relPath,
          line: 1,
          kind: 'fallback',
          exported_name: exportedName,
          original_name: exportedName,
        },
      ],
    };
  }

  return null;
}

function faceKindForDeclaration(node: ts.Declaration): ExportFaceKind {
  if (ts.isTypeAliasDeclaration(node)) return 'type-alias';
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isClassDeclaration(node)) return 'class';
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isEnumDeclaration(node)) return 'enum';
  if (ts.isModuleDeclaration(node)) return 'namespace';
  if (ts.isVariableDeclaration(node)) {
    const flags = ts.getCombinedNodeFlags(node.parent);
    return (flags & ts.NodeFlags.Const) !== 0 ? 'const' : 'variable';
  }
  return 'unknown';
}

function classifyDeclarations(
  scope: ExportsAnalysisScope,
  declarations: readonly ts.Declaration[],
): SymbolClassification {
  const faceKinds = new Set<ExportFaceKind>();
  let declarationName = '';
  let declarationFile: string | null = null;
  let declarationLine: number | null = null;
  let typeExported = false;
  let valueExported = false;

  const preferredDeclarations = [...declarations].sort((left, right) => {
    const leftIsDeclarationFile = left.getSourceFile().isDeclarationFile ? 1 : 0;
    const rightIsDeclarationFile = right.getSourceFile().isDeclarationFile ? 1 : 0;
    return leftIsDeclarationFile - rightIsDeclarationFile;
  });

  for (const declaration of preferredDeclarations) {
    const faceKind = faceKindForDeclaration(declaration);
    faceKinds.add(faceKind);
    const sourceFile = declaration.getSourceFile();
    const relPath = toRepoRelative(scope, sourceFile.fileName);

    if (!declarationFile && !relPath.startsWith('..')) {
      declarationFile = relPath;
      declarationLine = lineOfNode(sourceFile, declaration);
      const maybeNamed = declaration as ts.NamedDeclaration;
      if (maybeNamed.name && ts.isIdentifier(maybeNamed.name)) {
        declarationName = maybeNamed.name.text;
      }
    }

    if (faceKind === 'interface' || faceKind === 'type-alias') {
      typeExported = true;
      continue;
    }

    if (faceKind === 'class' || faceKind === 'enum') {
      typeExported = true;
      valueExported = true;
      continue;
    }

    if (faceKind === 'function' || faceKind === 'const' || faceKind === 'variable' || faceKind === 'namespace') {
      valueExported = true;
    }
  }

  const orderedFaceKinds = [...faceKinds].sort();

  return {
    declarationName,
    declarationFile,
    declarationLine,
    faceKind: orderedFaceKinds.length > 1
      ? 'merged'
      : (orderedFaceKinds[0] ?? 'unknown'),
    faceKinds: orderedFaceKinds,
    typeExported,
    valueExported,
  };
}

function classifySymbol(
  scope: ExportsAnalysisScope,
  checker: ts.TypeChecker,
  exportSymbol: ts.Symbol,
): SymbolClassification {
  const resolvedSymbol = (exportSymbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(exportSymbol)
    : exportSymbol;
  const declarations = resolvedSymbol.declarations ?? exportSymbol.declarations ?? [];

  if (declarations.length === 0) {
    return {
      declarationName: resolvedSymbol.getName(),
      declarationFile: null,
      declarationLine: null,
      faceKind: 'unknown',
      faceKinds: ['unknown'],
      typeExported: (resolvedSymbol.flags & ts.SymbolFlags.Type) !== 0,
      valueExported: (resolvedSymbol.flags & ts.SymbolFlags.Value) !== 0,
    };
  }

  const classified = classifyDeclarations(scope, declarations);
  if (!classified.declarationName) {
    classified.declarationName = resolvedSymbol.getName();
  }

  if (!classified.typeExported && (resolvedSymbol.flags & ts.SymbolFlags.Type) !== 0) {
    classified.typeExported = true;
  }

  if (!classified.valueExported && (resolvedSymbol.flags & ts.SymbolFlags.Value) !== 0) {
    classified.valueExported = true;
  }

  return classified;
}

function computePackageRevision(
  scope: ExportsAnalysisScope,
  files: Iterable<string>,
): string {
  const hash = createHash('sha1');

  for (const relPath of [...new Set(files)].sort()) {
    hash.update(relPath);
    hash.update('\0');

    const absPath = resolve(scope.repoPath, relPath);
    if (!existsSync(absPath)) {
      hash.update('(missing)');
      hash.update('\0');
      continue;
    }

    hash.update(readFileSync(absPath));
    hash.update('\0');
  }

  return hash.digest('hex');
}

function analyzePackage(
  scope: ExportsAnalysisScope,
  descriptor: PackageDescriptor,
  options: ProgramReuseOptions,
): {
  summary: PackageExportsSummary;
  records: PackageExportRecord[];
} {
  const program = createPackageProgram(scope, descriptor, options);
  const context: PackageAnalysisContext = {
    ...scope,
    program,
    checker: program.getTypeChecker(),
    compilerOptions: program.getCompilerOptions(),
    packageDir: descriptor.packageDir,
    entrypoint: descriptor.analysisEntrypoint,
    moduleInfoCache: new Map(),
    moduleExportsCache: new Map(),
    sourceFileCache: new Map(),
  };

  const entrypointAbs = resolve(scope.repoPath, descriptor.analysisEntrypoint);
  const entrypointSourceFile = getProgramSourceFile(program, entrypointAbs);
  const entrypointModuleSymbol = entrypointSourceFile
    ? getModuleSymbol(context.checker, entrypointSourceFile)
    : null;

  if (!entrypointSourceFile || !entrypointModuleSymbol) {
    return {
      summary: {
        package_name: descriptor.packageName,
        package_dir: descriptor.packageDir,
        package_revision: computePackageRevision(scope, [
          descriptor.packageJsonPath,
          descriptor.analysisEntrypoint,
          descriptor.sourceEntrypoint ?? '',
          descriptor.publicTypesEntrypoint ?? '',
        ].filter(Boolean)),
        analysis_basis: descriptor.analysisBasis,
        analysis_entrypoint: descriptor.analysisEntrypoint,
        source_entrypoint: descriptor.sourceEntrypoint,
        public_types_entrypoint: descriptor.publicTypesEntrypoint,
        export_count: 0,
        type_only_export_count: 0,
        value_export_count: 0,
        merged_export_count: 0,
      },
      records: [],
    };
  }

  const packageFiles = new Set<string>([
    descriptor.packageJsonPath,
    descriptor.analysisEntrypoint,
  ]);

  if (descriptor.sourceEntrypoint) packageFiles.add(descriptor.sourceEntrypoint);
  if (descriptor.publicTypesEntrypoint) packageFiles.add(descriptor.publicTypesEntrypoint);

  const exportSymbols = context.checker
    .getExportsOfModule(entrypointModuleSymbol)
    .filter((symbol) => symbol.getName() !== '__esModule')
    .sort((left, right) => left.getName().localeCompare(right.getName()));

  const records: PackageExportRecord[] = exportSymbols.map((exportSymbol) => {
    const exportedName = exportSymbol.getName();
    const trace = traceExport(context, descriptor.analysisEntrypoint, exportedName);
    const classification = classifySymbol(scope, context.checker, exportSymbol);

    if (trace) {
      for (const step of trace.chain) {
        packageFiles.add(step.file);
        if (step.target_file) packageFiles.add(step.target_file);
      }
    }

    if (classification.declarationFile) packageFiles.add(classification.declarationFile);

    const typeOnly = trace?.typeOnly ?? (!classification.valueExported && classification.typeExported);
    const originalName = trace?.originalName ?? classification.declarationName ?? exportedName;
    const tracedDeclaration = trace?.chain.at(-1)?.kind === 'local-declaration'
      ? trace.chain.at(-1)
      : null;
    const declarationFile = tracedDeclaration?.file ?? classification.declarationFile;
    const declarationLine = tracedDeclaration?.line ?? classification.declarationLine;
    const declarationName = tracedDeclaration?.original_name
      ?? tracedDeclaration?.exported_name
      ?? classification.declarationName
      ?? originalName;

    return {
      package_name: descriptor.packageName,
      package_dir: descriptor.packageDir,
      analysis_basis: descriptor.analysisBasis,
      analysis_entrypoint: descriptor.analysisEntrypoint,
      exported_name: exportedName,
      original_name: originalName,
      declaration_name: declarationName,
      source_module: declarationFile,
      declaration_file: declarationFile,
      declaration_line: declarationLine,
      type_only: typeOnly,
      type_exported: classification.typeExported || typeOnly,
      value_exported: !typeOnly && classification.valueExported,
      face_kind: classification.faceKind,
      face_kinds: classification.faceKinds,
      namespace_export: trace?.namespaceExport ?? false,
      chain: trace?.chain ?? [
        {
          file: descriptor.analysisEntrypoint,
          line: 1,
          kind: 'fallback',
          exported_name: exportedName,
          original_name: originalName,
        },
      ],
    };
  });

  const typeOnlyExportCount = records.filter((record) => record.type_only).length;
  const valueExportCount = records.filter((record) => record.value_exported).length;
  const mergedExportCount = records.filter((record) => record.face_kind === 'merged').length;

  return {
    summary: {
      package_name: descriptor.packageName,
      package_dir: descriptor.packageDir,
      package_revision: computePackageRevision(scope, packageFiles),
      analysis_basis: descriptor.analysisBasis,
      analysis_entrypoint: descriptor.analysisEntrypoint,
      source_entrypoint: descriptor.sourceEntrypoint,
      public_types_entrypoint: descriptor.publicTypesEntrypoint,
      export_count: records.length,
      type_only_export_count: typeOnlyExportCount,
      value_export_count: valueExportCount,
      merged_export_count: mergedExportCount,
    },
    records,
  };
}

export function generateExportsAnalysis(
  nextSession: RepoSession,
  options: ProgramReuseOptions = {},
): ExportsAnalysisResult {
  const descriptors = loadPackageDescriptors(nextSession);
  const workspacePackageEntrypointsByName = new Map<string, string>();

  for (const descriptor of descriptors) {
    workspacePackageEntrypointsByName.set(
      descriptor.packageName,
      descriptor.sourceEntrypoint ?? descriptor.analysisEntrypoint,
    );
  }

  const scope: ExportsAnalysisScope = {
    session: nextSession,
    repoPath: nextSession.repoPath,
    repoPathNormalized: toForwardSlash(nextSession.repoPath).toLowerCase(),
    workspacePackageEntrypointsByName,
  };

  const packageAnalyses = descriptors.map((descriptor) => analyzePackage(scope, descriptor, options));
  const packageSummaries = packageAnalyses
    .map((analysis) => analysis.summary)
    .sort((left, right) => left.package_name.localeCompare(right.package_name));
  const exportRecords = packageAnalyses
    .flatMap((analysis) => analysis.records)
    .sort((left, right) =>
      left.package_name.localeCompare(right.package_name) ||
      left.exported_name.localeCompare(right.exported_name)
    );

  const output: ExportsOutput = {
    root: scope.repoPath,
    generated_at: new Date().toISOString(),
    source_commit: gitHead(scope.repoPath),
    analyzer_commit: gitBlobHash(resolve(import.meta.dirname!, 'analyze.js')),
    summary: {
      packages_analyzed: packageSummaries.length,
      exports: exportRecords.length,
      type_only_exports: exportRecords.filter((record) => record.type_only).length,
      value_exports: exportRecords.filter((record) => record.value_exported).length,
      merged_exports: exportRecords.filter((record) => record.face_kind === 'merged').length,
    },
    packages: packageSummaries,
    exports: exportRecords,
  };

  const reportLines = [
    "",
    `Packages analyzed: ${packageSummaries.length}`,
    `Exports:           ${output.summary.exports}`,
    `Type-only exports: ${output.summary.type_only_exports}`,
    `Value exports:     ${output.summary.value_exports}`,
    `Merged exports:    ${output.summary.merged_exports}`,
    "",
  ];

  return {
    output,
    reportLines,
    warnings: [],
  };
}
