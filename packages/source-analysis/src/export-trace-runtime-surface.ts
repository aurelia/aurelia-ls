import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import * as ts from 'typescript';

import type { RepoSession } from './repo-session.js';
import type { StructuralClaimGraphRuntime } from './structural-claim-graph.js';
import type { ExportChainStep } from './semantic/export-contract.js';
import {
  traceModuleExport,
  type ExportModuleInfo,
  type ExportTraceResult,
} from './semantic/export-trace-surface.js';

export const EXPORT_ROUTE_SURFACE_SOURCE_IDS = [
  'semantic-runtime',
  'snapshot-fallback',
] as const;

export type ExportRouteSurfaceSourceId =
  typeof EXPORT_ROUTE_SURFACE_SOURCE_IDS[number];

export interface ExportTraceRuntimeOptions {
  readonly repoPath: string;
  readonly repoSession?: RepoSession;
  readonly structuralRuntime?: StructuralClaimGraphRuntime | null;
  readonly program?: ts.Program;
  readonly checker?: ts.TypeChecker;
  readonly compilerOptions?: ts.CompilerOptions;
  readonly workspacePackageEntrypointsByName?: ReadonlyMap<string, string>;
}

export interface ExportTraceRuntime {
  getModuleInfo(relPath: string): ExportModuleInfo;
  getSourceFile(relPath: string): ts.SourceFile | null;
  getExportedNamesForModule(relPath: string): ReadonlySet<string>;
  traceExport(relPath: string, exportedName: string): ExportTraceResult | null;
}

export interface ExportRouteFallback {
  readonly originalName: string;
  readonly declarationFile: string | null;
  readonly declarationLine: number | null;
  readonly declarationName: string;
  readonly typeOnly: boolean;
  readonly namespaceExport: boolean;
  readonly chain: readonly ExportChainStep[];
}

export interface ResolvedExportRoute extends ExportRouteFallback {
  readonly source: ExportRouteSurfaceSourceId;
}

export interface ResolveExportRouteOptions extends ExportTraceRuntimeOptions {
  readonly analysisEntrypoint: string;
  readonly exportedName: string;
  readonly fallback?: ExportRouteFallback;
}

const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  allowJs: false,
  checkJs: false,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  noEmit: true,
  skipLibCheck: true,
  target: ts.ScriptTarget.ES2022,
};

export function createExportTraceRuntime(
  options: ExportTraceRuntimeOptions,
): ExportTraceRuntime {
  const repoPathNormalized = toForwardSlash(resolve(options.repoPath)).toLowerCase();
  const workspacePackageEntrypointsByName = options.workspacePackageEntrypointsByName
    ?? createWorkspacePackageEntrypointsByName(options.structuralRuntime);
  const moduleInfoCache = new Map<string, ExportModuleInfo>();
  const moduleExportsCache = new Map<string, Set<string>>();
  const sourceFileCache = new Map<string, ts.SourceFile | null>();
  const sessionProgramCache = new Map<string, ts.Program | null>();
  const compilerOptionsCache = new Map<string, ts.CompilerOptions | null>();

  function getCompilerOptionsForFile(
    relPath: string,
  ): ts.CompilerOptions {
    if (options.compilerOptions) {
      return options.compilerOptions;
    }

    const cached = compilerOptionsCache.get(relPath);
    if (cached !== undefined) {
      return cached ?? DEFAULT_COMPILER_OPTIONS;
    }

    if (!options.repoSession) {
      compilerOptionsCache.set(relPath, null);
      return DEFAULT_COMPILER_OPTIONS;
    }

    const tsconfigPath = options.repoSession.resolveNearestTsconfig(relPath);
    if (!tsconfigPath) {
      compilerOptionsCache.set(relPath, null);
      return DEFAULT_COMPILER_OPTIONS;
    }

    const loaded = options.repoSession.tryLoadTsconfig(tsconfigPath);
    const compilerOptions = loaded.snapshot?.parsed.options ?? null;
    compilerOptionsCache.set(relPath, compilerOptions);
    return compilerOptions ?? DEFAULT_COMPILER_OPTIONS;
  }

  function getProgramForFile(
    relPath: string,
  ): ts.Program | null {
    if (!options.repoSession) {
      return null;
    }

    const tsconfigPath = options.repoSession.resolveNearestTsconfig(relPath);
    if (!tsconfigPath) {
      return null;
    }

    const cached = sessionProgramCache.get(tsconfigPath);
    if (cached !== undefined) {
      return cached;
    }

    const program = options.repoSession.getProgram(tsconfigPath, 'analysis', { cache: true });
    sessionProgramCache.set(tsconfigPath, program);
    return program;
  }

  function getSourceFile(
    relPath: string,
  ): ts.SourceFile | null {
    const cached = sourceFileCache.get(relPath);
    if (cached !== undefined) {
      return cached;
    }

    const absPath = resolve(options.repoPath, relPath);
    let sourceFile = options.program
      ? getProgramSourceFile(options.program, absPath)
      : null;

    if (!sourceFile) {
      const sessionProgram = getProgramForFile(relPath);
      if (sessionProgram) {
        sourceFile = getProgramSourceFile(sessionProgram, absPath);
      }
    }

    if (!sourceFile && existsSync(absPath)) {
      sourceFile = ts.createSourceFile(
        absPath,
        readFileSync(absPath, 'utf-8'),
        ts.ScriptTarget.Latest,
        true,
        scriptKindForPath(relPath),
      );
    }

    sourceFileCache.set(relPath, sourceFile ?? null);
    return sourceFile ?? null;
  }

  function buildModuleInfoFromClaims(
    relPath: string,
  ): ExportModuleInfo | null {
    const runtime = options.structuralRuntime;
    if (!runtime) {
      return null;
    }

    const fileClaim = runtime.index.sourceFileByPath.get(relPath);
    const declarations = runtime.index.declarationsByFilePath.get(relPath) ?? [];
    const importBindings = runtime.index.importBindingsBySourceFilePath.get(relPath) ?? [];
    const exportObservations = runtime.index.exportObservationsBySourceFilePath.get(relPath) ?? [];

    if (!fileClaim && declarations.length === 0 && importBindings.length === 0 && exportObservations.length === 0) {
      return null;
    }

    const info = createEmptyModuleInfo();

    for (const declaration of declarations) {
      if (!declaration.attributes.exported) {
        continue;
      }
      const current = info.exportedDeclarations.get(declaration.attributes.name) ?? [];
      current.push({
        name: declaration.attributes.name,
        line: declaration.attributes.line,
        inherentlyTypeOnly: declarationIsTypeOnly(declaration.attributes.declarationKind),
      });
      info.exportedDeclarations.set(declaration.attributes.name, current);
    }

    for (const binding of importBindings) {
      info.importBindings.set(binding.attributes.localName, {
        localName: binding.attributes.localName,
        importedName: binding.attributes.importedName,
        line: binding.attributes.line,
        typeOnly: binding.attributes.typeOnly,
        specifier: binding.attributes.specifier,
        targetFile: binding.attributes.targetFile,
      });
    }

    for (const observation of exportObservations) {
      switch (observation.attributes.observationKind) {
        case 'local-export':
          if (observation.attributes.exportedName && observation.attributes.originalName) {
            info.localExportSpecifiers.push({
              exportedName: observation.attributes.exportedName,
              originalName: observation.attributes.originalName,
              line: observation.attributes.line,
              typeOnly: observation.attributes.typeOnly,
            });
          }
          break;
        case 'named-reexport':
          if (observation.attributes.exportedName && observation.attributes.originalName) {
            info.namedReexports.push({
              exportedName: observation.attributes.exportedName,
              originalName: observation.attributes.originalName,
              line: observation.attributes.line,
              typeOnly: observation.attributes.typeOnly,
              specifier: observation.attributes.specifier ?? '',
              targetFile: observation.attributes.targetFile,
            });
          }
          break;
        case 'star-reexport':
          info.starReexports.push({
            line: observation.attributes.line,
            typeOnly: observation.attributes.typeOnly,
            specifier: observation.attributes.specifier ?? '',
            targetFile: observation.attributes.targetFile,
          });
          break;
        case 'namespace-reexport':
          if (observation.attributes.exportedName) {
            info.namespaceReexports.push({
              exportedName: observation.attributes.exportedName,
              line: observation.attributes.line,
              specifier: observation.attributes.specifier ?? '',
              targetFile: observation.attributes.targetFile,
            });
          }
          break;
      }
    }

    return info;
  }

  function resolveModuleTarget(
    relPath: string,
    sourceFile: ts.SourceFile,
    specifier: string,
  ): string | null {
    if (!specifier.startsWith('.')) {
      const workspaceEntrypoint = workspacePackageEntrypointsByName.get(specifier);
      if (workspaceEntrypoint) {
        return workspaceEntrypoint;
      }
    }

    const resolvedModule = ts.resolveModuleName(
      specifier,
      sourceFile.fileName,
      getCompilerOptionsForFile(relPath),
      ts.sys,
    ).resolvedModule;
    if (!resolvedModule) {
      return null;
    }

    const resolvedAbsPath = toForwardSlash(resolve(resolvedModule.resolvedFileName));
    if (
      resolvedAbsPath.toLowerCase() !== repoPathNormalized
      && !resolvedAbsPath.toLowerCase().startsWith(`${repoPathNormalized}/`)
    ) {
      return null;
    }

    const resolvedRelPath = toRepoRelative(options.repoPath, resolvedAbsPath);
    if (resolvedRelPath.startsWith('..') || options.repoSession?.isExcludedRepoRelativePath(resolvedRelPath)) {
      return null;
    }

    return resolvedRelPath;
  }

  function getModuleInfoFromAstFallback(
    relPath: string,
  ): ExportModuleInfo | null {
    const sourceFile = getSourceFile(relPath);
    if (!sourceFile) {
      return null;
    }

    const moduleSourceFile = sourceFile;
    const info = createEmptyModuleInfo();

    function addExportedDeclaration(
      name: string,
      node: ts.Node,
    ): void {
      const current = info.exportedDeclarations.get(name) ?? [];
      current.push({
        name,
        line: lineOfNode(moduleSourceFile, node),
        inherentlyTypeOnly: ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node),
      });
      info.exportedDeclarations.set(name, current);
    }

    function hasExportModifier(
      node: ts.Node,
    ): boolean {
      const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
      return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    }

    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement) && statement.importClause && ts.isStringLiteral(statement.moduleSpecifier)) {
        const specifier = statement.moduleSpecifier.text;
        const targetFile = resolveModuleTarget(relPath, sourceFile, specifier);
        const clause = statement.importClause;
        const baseTypeOnly = clause.isTypeOnly;
        const importLine = lineOfNode(sourceFile, statement);

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
              info.importBindings.set(element.name.text, {
                localName: element.name.text,
                importedName: (element.propertyName ?? element.name).text,
                line: lineOfNode(sourceFile, element),
                typeOnly: baseTypeOnly || element.isTypeOnly,
                specifier,
                targetFile,
              });
            }
          } else if (ts.isNamespaceImport(clause.namedBindings)) {
            info.importBindings.set(clause.namedBindings.name.text, {
              localName: clause.namedBindings.name.text,
              importedName: '*',
              line: lineOfNode(sourceFile, clause.namedBindings),
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
      if (!ts.isExportDeclaration(statement)) {
        continue;
      }

      const specifier = statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : undefined;
      const targetFile = specifier ? resolveModuleTarget(relPath, sourceFile, specifier) : null;
      const declarationTypeOnly = statement.isTypeOnly;

      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          const record = {
            exportedName: element.name.text,
            originalName: (element.propertyName ?? element.name).text,
            line: lineOfNode(sourceFile, element),
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
          line: lineOfNode(sourceFile, statement.exportClause),
          specifier,
          targetFile,
        });
        continue;
      }

      if (!statement.exportClause && specifier) {
        info.starReexports.push({
          line: lineOfNode(sourceFile, statement),
          typeOnly: declarationTypeOnly,
          specifier,
          targetFile,
        });
      }
    }

    return info;
  }

  function getModuleInfo(
    relPath: string,
  ): ExportModuleInfo {
    const cached = moduleInfoCache.get(relPath);
    if (cached) {
      return cached;
    }

    const info = buildModuleInfoFromClaims(relPath)
      ?? getModuleInfoFromAstFallback(relPath)
      ?? createEmptyModuleInfo();
    moduleInfoCache.set(relPath, info);
    return info;
  }

  function getExportedNamesForModule(
    relPath: string,
    visited = new Set<string>(),
  ): Set<string> {
    const cached = moduleExportsCache.get(relPath);
    if (cached) {
      return cached;
    }
    if (visited.has(relPath)) {
      return new Set<string>();
    }
    visited.add(relPath);

    const names = new Set<string>();
    const sourceFile = getSourceFile(relPath);
    if (options.checker && sourceFile) {
      const moduleSymbol = getModuleSymbol(options.checker, sourceFile);
      if (moduleSymbol) {
        for (const exportSymbol of options.checker.getExportsOfModule(moduleSymbol)) {
          names.add(exportSymbol.getName());
        }
      }
    }

    if (names.size === 0) {
      const moduleInfo = getModuleInfo(relPath);
      for (const name of moduleInfo.exportedDeclarations.keys()) names.add(name);
      for (const item of moduleInfo.localExportSpecifiers) names.add(item.exportedName);
      for (const item of moduleInfo.namedReexports) names.add(item.exportedName);
      for (const item of moduleInfo.namespaceReexports) names.add(item.exportedName);
      for (const item of moduleInfo.starReexports) {
        if (!item.targetFile) {
          continue;
        }
        for (const name of getExportedNamesForModule(item.targetFile, visited)) {
          names.add(name);
        }
      }
    }

    moduleExportsCache.set(relPath, names);
    return names;
  }

  return {
    getModuleInfo,
    getSourceFile,
    getExportedNamesForModule: (relPath) => getExportedNamesForModule(relPath),
    traceExport: (relPath, exportedName) =>
      traceModuleExport(
        {
          getModuleInfo,
          getSourceFile,
          getExportedNamesForModule: (targetRelPath) => getExportedNamesForModule(targetRelPath),
        },
        relPath,
        exportedName,
      ),
  };
}

export function resolveExportRoute(
  options: ResolveExportRouteOptions,
): ResolvedExportRoute | null {
  const runtime = hasSemanticRuntimeContext(options)
    ? createExportTraceRuntime(options)
    : null;
  const traced = runtime?.traceExport(options.analysisEntrypoint, options.exportedName) ?? null;
  const shouldUseSemanticTrace = traced && (
    traced.chain.some((step) => step.kind !== 'fallback')
    || !options.fallback
  );

  if (traced && shouldUseSemanticTrace) {
    const tracedDeclaration = traced.chain.at(-1)?.kind === 'local-declaration'
      ? traced.chain.at(-1)
      : null;

    return {
      source: 'semantic-runtime',
      originalName: traced.originalName,
      declarationFile: tracedDeclaration?.file ?? options.fallback?.declarationFile ?? null,
      declarationLine: tracedDeclaration?.line ?? options.fallback?.declarationLine ?? null,
      declarationName: tracedDeclaration?.original_name
        ?? tracedDeclaration?.exported_name
        ?? options.fallback?.declarationName
        ?? traced.originalName,
      typeOnly: traced.typeOnly,
      namespaceExport: traced.namespaceExport,
      chain: traced.chain,
    };
  }

  if (!options.fallback) {
    return null;
  }

  // TODO: Materialize a named export-trace surface for snapshot-only analysis views
  // so inquiry callers do not need to fall back to the historical export-record
  // carrier when no live semantic runtime is available.
  return {
    source: 'snapshot-fallback',
    ...options.fallback,
  };
}

function createEmptyModuleInfo(): ExportModuleInfo {
  return {
    exportedDeclarations: new Map(),
    localExportSpecifiers: [],
    importBindings: new Map(),
    namedReexports: [],
    starReexports: [],
    namespaceReexports: [],
  };
}

function createWorkspacePackageEntrypointsByName(
  runtime?: StructuralClaimGraphRuntime | null,
): ReadonlyMap<string, string> {
  if (!runtime) {
    return new Map();
  }

  const entrypoints = new Map<string, string>();
  for (const packageClaim of runtime.index.packages) {
    entrypoints.set(
      packageClaim.attributes.packageName,
      packageClaim.attributes.sourceEntrypoint ?? packageClaim.attributes.analysisEntrypoint,
    );
  }
  return entrypoints;
}

function getProgramSourceFile(
  program: ts.Program,
  absPath: string,
): ts.SourceFile | null {
  const direct = program.getSourceFile(absPath);
  if (direct) {
    return direct;
  }

  const normalizedTarget = toForwardSlash(resolve(absPath)).toLowerCase();
  for (const sourceFile of program.getSourceFiles()) {
    if (toForwardSlash(resolve(sourceFile.fileName)).toLowerCase() === normalizedTarget) {
      return sourceFile;
    }
  }

  return null;
}

function getModuleSymbol(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
): ts.Symbol | null {
  const direct = (sourceFile as ts.SourceFile & { symbol?: ts.Symbol }).symbol;
  return direct ?? checker.getSymbolAtLocation(sourceFile) ?? null;
}

function declarationIsTypeOnly(
  faceKind: string,
): boolean {
  return faceKind === 'interface' || faceKind === 'type';
}

function lineOfNode(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function hasSemanticRuntimeContext(
  options: ExportTraceRuntimeOptions,
): boolean {
  return Boolean(options.structuralRuntime || options.repoSession || options.program);
}

function scriptKindForPath(
  relPath: string,
): ts.ScriptKind {
  if (relPath.endsWith('.tsx')) {
    return ts.ScriptKind.TSX;
  }
  return ts.ScriptKind.TS;
}

function toRepoRelative(
  repoPath: string,
  absPath: string,
): string {
  return toForwardSlash(relative(repoPath, absPath));
}

function toForwardSlash(
  value: string,
): string {
  return value.replace(/\\/g, '/');
}
