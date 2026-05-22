import path from 'node:path';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';
import type {
  ProjectBootFrame,
  SourceFileAdmission,
} from '../boot/frames.js';
import {
  normalizeModuleKey,
} from '../evaluation/module-graph.js';
import {
  isStaticEvaluationSource,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import {
  SourceFileRole,
} from '../kernel/address.js';
import { buildWorkspaceTypeSystemProjectOptions } from './project-options.js';
import {
  diffCompilerHostSourceFileCacheStats,
  sharedCompilerHostSourceFileCache,
  type TypeSystemCompilerHostSourceFileCacheStats,
} from './compiler-host-source-file-cache.js';
import {
  canonicalTypeSystemPath,
  isDefaultLibrarySourceFile,
  isTypeSystemPathAtOrUnder,
} from './source-file-path.js';
export {
  clearTypeSystemCompilerHostSourceFileCache,
  readTypeSystemCompilerHostSourceFileCacheOverview,
} from './compiler-host-source-file-cache.js';
export type {
  TypeSystemCompilerHostSourceFileCacheClearPolicy,
  TypeSystemCompilerHostSourceFileCacheClearSummary,
  TypeSystemCompilerHostSourceFileCacheOverview,
  TypeSystemCompilerHostSourceFileCacheStats,
} from './compiler-host-source-file-cache.js';

export type TypeSystemProjectPhaseName =
  | 'evaluated-source-index'
  | 'project-options'
  | 'ambient-source-index'
  | 'compiler-host'
  | 'program'
  | 'checker';

export interface TypeSystemProjectPhaseTiming {
  readonly name: TypeSystemProjectPhaseName;
  readonly milliseconds: number;
  readonly itemCount?: number;
}

export interface TypeSystemProgramSourceFileStats {
  readonly total: number;
  readonly evaluatedSources: number;
  readonly ambientSources: number;
  readonly projectSources: number;
  readonly nodeModuleSources: number;
  readonly declarationSources: number;
  readonly defaultLibrarySources: number;
  readonly externalSources: number;
  readonly sourceTextCharacters: number;
  readonly evaluatedSourceTextCharacters: number;
  readonly ambientSourceTextCharacters: number;
  readonly projectSourceTextCharacters: number;
  readonly nodeModuleSourceTextCharacters: number;
  readonly declarationSourceTextCharacters: number;
  readonly defaultLibrarySourceTextCharacters: number;
  readonly externalSourceTextCharacters: number;
}

export type TypeSystemProgramSourceFileGroupKind =
  | 'ambient-source'
  | 'project-source'
  | 'node-module-package'
  | 'default-library'
  | 'external-declaration'
  | 'external-source';

export interface TypeSystemProgramSourceFileGroupStats {
  readonly groupKind: TypeSystemProgramSourceFileGroupKind;
  readonly groupKey: string;
  readonly sourceFiles: number;
  readonly sourceTextCharacters: number;
  readonly declarationSources: number;
  readonly evaluatedSources: number;
}

export interface TypeSystemProjectProfile {
  readonly totalMilliseconds: number;
  readonly phases: readonly TypeSystemProjectPhaseTiming[];
  readonly compilerOptions: TypeSystemProjectCompilerOptionsProfile;
  readonly hostSourceFileCache: TypeSystemCompilerHostSourceFileCacheStats;
  readonly programRootFiles: TypeSystemProgramSourceFileStats;
  readonly programSourceFiles: TypeSystemProgramSourceFileStats;
  readonly programRootFileGroups: readonly TypeSystemProgramSourceFileGroupStats[];
  readonly programSourceFileGroups: readonly TypeSystemProgramSourceFileGroupStats[];
}

export interface TypeSystemProjectCompilerOptionsProfile {
  readonly target: string | null;
  readonly module: string | null;
  readonly moduleResolution: string | null;
  readonly jsx: string | null;
  readonly allowJs: boolean | null;
  readonly checkJs: boolean | null;
  readonly skipLibCheck: boolean | null;
  readonly allowArbitraryExtensions: boolean | null;
  readonly experimentalDecorators: boolean | null;
  readonly hasBaseUrl: boolean;
  readonly pathMappingCount: number;
  readonly pathMappingTargetCount: number;
  readonly libraryFileCount: number;
}

export interface TypeSystemProgramNodeRemapStats {
  readonly requests: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly sameSourceHits: number;
  readonly spanHits: number;
  readonly sourceFileMisses: number;
  readonly spanMisses: number;
}

interface TypeSystemSourceFileIndexes {
  readonly byPath: Map<string, ts.SourceFile>;
  readonly byModuleKey: Map<string, ts.SourceFile>;
  readonly moduleKeyByPath: Map<string, string>;
}

/** Current TypeScript Program/checker epoch for one booted project frame. */
export class TypeSystemProject {
  private readonly moduleExportsBySpecifier = new Map<string, ReadonlyMap<string, ts.Symbol> | null>();
  private readonly programNodeRemapCache = new WeakMap<ts.Node, ts.Node | null>();
  private programNodeRemapRequests = 0;
  private programNodeRemapCacheHits = 0;
  private programNodeRemapCacheMisses = 0;
  private programNodeRemapSameSourceHits = 0;
  private programNodeRemapSpanHits = 0;
  private programNodeRemapSourceFileMisses = 0;
  private programNodeRemapSpanMisses = 0;

  constructor(
    /** Project frame whose evaluated source files anchor this checker epoch. */
    readonly project: ProjectBootFrame,
    /** Static evaluation whose parsed source files are reused by this program. */
    readonly evaluation: StaticProjectEvaluationResult,
    /** TypeScript Program for current project source and reachable dependencies. */
    readonly program: ts.Program,
    /** Checker owned by the current Program. */
    readonly checker: ts.TypeChecker,
    /** Diagnostics observed while reading or parsing the project's tsconfig, if any. */
    readonly configDiagnostics: readonly ts.Diagnostic[],
    /** Absolute tsconfig path that produced configDiagnostics, when one was present. */
    readonly configFilePath: string | null,
    /** Timing profile for this checker epoch. */
    readonly profile: TypeSystemProjectProfile,
    private readonly sourceFilesByModuleKey: ReadonlyMap<string, ts.SourceFile>,
    private readonly sourceFilesByPath: ReadonlyMap<string, ts.SourceFile>,
    private readonly moduleKeysByPath: ReadonlyMap<string, string>,
    private readonly programSourceFilesByPath: ReadonlyMap<string, ts.SourceFile>,
    private readonly ambientSourcePaths: ReadonlySet<string>,
    private readonly diagnosticSourcePaths: ReadonlySet<string> | null,
  ) {}

  /** Read a source file by evaluator module key. */
  readSourceFileByModuleKey(moduleKey: string): ts.SourceFile | null {
    return this.sourceFilesByModuleKey.get(normalizeModuleKey(moduleKey)) ?? null;
  }

  /** Read a source file by absolute, project-relative, or workspace-relative path. */
  readSourceFileByPath(fileName: string): ts.SourceFile | null {
    return this.sourceFilesByPath.get(canonicalTypeSystemPath(resolveProjectPath(this.project.rootDir, fileName)))
      ?? this.sourceFilesByPath.get(canonicalTypeSystemPath(resolveWorkspacePath(this.project.workspaceRootDir, fileName)))
      ?? null;
  }

  /** Read the Program-owned source file by absolute, project-relative, or workspace-relative path. */
  readProgramSourceFileByPath(fileName: string): ts.SourceFile | null {
    return this.programSourceFilesByPath.get(canonicalTypeSystemPath(resolveProjectPath(this.project.rootDir, fileName)))
      ?? this.programSourceFilesByPath.get(canonicalTypeSystemPath(resolveWorkspacePath(this.project.workspaceRootDir, fileName)))
      ?? null;
  }

  /** Read Program-owned TS/JS source files admitted as app source by this project frame. */
  readProjectProgramSourceFiles(): readonly ts.SourceFile[] {
    const projectRootPath = canonicalTypeSystemPath(this.project.rootDir);
    return [...this.programSourceFilesByPath.values()]
      .filter((sourceFile) => typeSystemProjectProgramDiagnosticSourceFile(
        sourceFile.fileName,
        projectRootPath,
        this.ambientSourcePaths,
        this.diagnosticSourcePaths,
      ))
      .sort((left, right) => left.fileName.localeCompare(right.fileName));
  }

  /**
   * Read the Program-owned counterpart of an evaluator/source-discovery node.
   *
   * TypeScript checker APIs expect nodes from the Program epoch. Static evaluation may hold a parsed source node with
   * the same file/span but a different AST identity, so checker-facing code should remap through this method before
   * calling `getTypeAtLocation`, `getSymbolAtLocation`, or related APIs.
   */
  readProgramNode<TNode extends ts.Node>(node: TNode): TNode | null {
    this.programNodeRemapRequests += 1;
    if (this.programNodeRemapCache.has(node)) {
      this.programNodeRemapCacheHits += 1;
      return this.programNodeRemapCache.get(node) as TNode | null;
    }
    this.programNodeRemapCacheMisses += 1;
    const sourceFile = node.getSourceFile();
    const programSourceFile = this.readProgramSourceFileByPath(sourceFile.fileName);
    if (programSourceFile == null) {
      this.programNodeRemapSourceFileMisses += 1;
      this.programNodeRemapCache.set(node, null);
      return null;
    }
    if (programSourceFile === sourceFile) {
      this.programNodeRemapSameSourceHits += 1;
      this.programNodeRemapCache.set(node, node);
      return node;
    }
    const match = findProgramNodeBySpan(programSourceFile, node);
    if (match == null) {
      this.programNodeRemapSpanMisses += 1;
    } else {
      this.programNodeRemapSpanHits += 1;
    }
    this.programNodeRemapCache.set(node, match);
    return match as TNode | null;
  }

  readProgramNodeRemapStats(): TypeSystemProgramNodeRemapStats {
    return {
      requests: this.programNodeRemapRequests,
      cacheHits: this.programNodeRemapCacheHits,
      cacheMisses: this.programNodeRemapCacheMisses,
      sameSourceHits: this.programNodeRemapSameSourceHits,
      spanHits: this.programNodeRemapSpanHits,
      sourceFileMisses: this.programNodeRemapSourceFileMisses,
      spanMisses: this.programNodeRemapSpanMisses,
    };
  }

  /** Read the evaluator module key that owns a TypeChecker source file, when it is in the evaluated project graph. */
  readModuleKeyForSourceFile(sourceFile: ts.SourceFile): string | null {
    const normalized = canonicalTypeSystemPath(sourceFile.fileName);
    return this.moduleKeysByPath.get(normalized) ?? null;
  }

  /**
   * Read the runtime instance/value type for a resource target node.
   *
   * Class declarations and class references produce the instance type because Aurelia resource metadata targets the
   * runtime view-model/controller instance. Non-constructable targets fall back to the checker type at the site.
   */
  readRuntimeTargetType(node: ts.Node): ts.Type | null {
    const checkerNode = this.readProgramNode(node);
    if (checkerNode == null) {
      return null;
    }
    const declaration = classDeclarationForTarget(this.checker, checkerNode);
    if (declaration != null) {
      const declared = declaredClassInstanceType(this.checker, declaration);
      if (declared != null) {
        return declared;
      }
    }

    const type = this.checker.getTypeAtLocation(checkerNode);
    const constructed = constructedReturnType(this.checker, type);
    return constructed ?? type ?? null;
  }

  /** Read the runtime instance/value type for an exported framework target, such as runtime-html `If`. */
  readRuntimeTargetTypeForExport(
    moduleSpecifier: string,
    exportName: string,
  ): ts.Type | null {
    const symbol = this.readExportedSymbol(moduleSpecifier, exportName);
    if (symbol == null) {
      return null;
    }

    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0] ?? null;
    if (declaration != null && (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration))) {
      const declared = declaredClassInstanceType(this.checker, declaration);
      if (declared != null) {
        return declared;
      }
    }

    const valueDeclaration = symbol.valueDeclaration ?? symbol.declarations?.[0] ?? null;
    const valueType = valueDeclaration == null
      ? null
      : this.checker.getTypeOfSymbolAtLocation(symbol, valueDeclaration);
    return valueType == null ? null : constructedReturnType(this.checker, valueType) ?? valueType;
  }

  /**
   * Read the constructor prototype chain for a class declaration in the same order as Aurelia's
   * `getPrototypeChain(Type)`: the concrete class first, then its base classes.
   */
  readClassPrototypeChain(
    declaration: ts.ClassLikeDeclarationBase,
  ): readonly ts.ClassLikeDeclarationBase[] {
    const chain: ts.ClassLikeDeclarationBase[] = [declaration];
    const seen = new Set<string>([classDeclarationKey(declaration)]);
    let current: ts.ClassLikeDeclarationBase | null = declaration;
    while ((current = this.readBaseClassDeclaration(current)) != null) {
      const key = classDeclarationKey(current);
      if (seen.has(key)) {
        break;
      }
      seen.add(key);
      chain.push(current);
    }
    return chain;
  }

  private readExportedSymbol(
    moduleSpecifier: string,
    exportName: string,
  ): ts.Symbol | null {
    const exports = this.readModuleExports(moduleSpecifier);
    const symbol = exports?.get(exportName) ?? null;
    return symbol == null ? null : this.resolveAliasedSymbol(symbol);
  }

  private readModuleExports(moduleSpecifier: string): ReadonlyMap<string, ts.Symbol> | null {
    if (this.moduleExportsBySpecifier.has(moduleSpecifier)) {
      return this.moduleExportsBySpecifier.get(moduleSpecifier)!;
    }

    const sourceFile = this.resolveModuleSourceFile(moduleSpecifier);
    const moduleSymbol = sourceFile == null ? null : this.checker.getSymbolAtLocation(sourceFile) ?? null;
    const exports = moduleSymbol == null
      ? null
      : new Map(this.checker.getExportsOfModule(moduleSymbol).map((symbol) => [symbol.getName(), symbol] as const));
    this.moduleExportsBySpecifier.set(moduleSpecifier, exports);
    return exports;
  }

  private resolveModuleSourceFile(moduleSpecifier: string): ts.SourceFile | null {
    const containingFile = path.join(this.project.rootDir, '.semantic-runtime', 'framework-type-probe.ts');
    const resolved = ts.resolveModuleName(
      moduleSpecifier,
      containingFile,
      this.program.getCompilerOptions(),
      ts.sys,
    ).resolvedModule?.resolvedFileName ?? null;
    return resolved == null ? null : this.program.getSourceFile(resolved) ?? null;
  }

  private resolveAliasedSymbol(symbol: ts.Symbol): ts.Symbol {
    return (symbol.flags & ts.SymbolFlags.Alias) === 0
      ? symbol
      : this.checker.getAliasedSymbol(symbol);
  }

  private readBaseClassDeclaration(
    declaration: ts.ClassLikeDeclarationBase,
  ): ts.ClassLikeDeclarationBase | null {
    const heritageClause = declaration.heritageClauses?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword) ?? null;
    const expression = heritageClause?.types[0]?.expression ?? null;
    if (expression == null) {
      return null;
    }

    const symbol = this.checker.getSymbolAtLocation(expression) ?? null;
    const resolved = symbol == null ? null : this.resolveAliasedSymbol(symbol);
    const declarations = resolved?.declarations ?? (resolved?.valueDeclaration == null ? [] : [resolved.valueDeclaration]);
    for (const candidate of declarations) {
      const classDeclaration = classDeclarationFromDeclaration(candidate);
      if (classDeclaration != null) {
        return classDeclaration;
      }
    }
    return null;
  }
}

/** Builds the TypeChecker epoch shared by resource, template, and inquiry passes. */
export class TypeSystemProjectBuilder {
  build(
    project: ProjectBootFrame,
    evaluation: StaticProjectEvaluationResult,
  ): TypeSystemProject {
    const started = performance.now();
    const hostSourceFileCacheBefore = sharedCompilerHostSourceFileCache.snapshot();
    const phases: TypeSystemProjectPhaseTiming[] = [];
    const evaluatedSources = measureTypeSystemProjectPhase(
      phases,
      'evaluated-source-index',
      () => evaluation.readEvaluatedSources(),
      (sources) => sources.length,
    );
    const sourceFiles = typeSystemSourceFileIndexes(evaluatedSources);
    const evaluatedSourcePaths = normalizedTypeSystemPathSet(sourceFiles.byPath.keys());

    const projectOptions = measureTypeSystemProjectPhase(phases, 'project-options', () =>
      buildWorkspaceTypeSystemProjectOptions(project.rootDir, project.workspaceRootDir)
    );
    const ambientSourcePaths = normalizedTypeSystemPathSet(
      projectOptions.ambientSourceFiles.map((sourceFile) => sourceFile.fileName),
    );
    measureTypeSystemProjectPhase(
      phases,
      'ambient-source-index',
      () => addAmbientSourceFiles(sourceFiles.byPath, projectOptions.ambientSourceFiles),
      () => projectOptions.ambientSourceFiles.length,
    );

    const options = projectOptions.compilerOptions;
    const host = measureTypeSystemProjectPhase(
      phases,
      'compiler-host',
      () => createTypeSystemCompilerHost(options, sourceFiles.byPath, project.rootDir),
      () => sourceFiles.byPath.size,
    );

    const rootNames = typeSystemProgramRootNames(
      project,
      evaluatedSources,
      projectOptions.configRootFileNames,
      projectOptions.ambientSourceFiles,
    );
    const program = measureTypeSystemProjectPhase(
      phases,
      'program',
      () => ts.createProgram(rootNames, options, host),
      (created) => created.getSourceFiles().length,
    );
    const checker = measureTypeSystemProjectPhase(phases, 'checker', () =>
      program.getTypeChecker()
    );
    const programSourceFiles = program.getSourceFiles();
    const programSourceFilesByPath = typeSystemProgramSourceFileIndex(programSourceFiles);
    const programRootFiles = typeSystemRootFileStats(
      rootNames,
      project.rootDir,
      evaluatedSourcePaths,
      ambientSourcePaths,
      programSourceFilesByPath,
    );
    const programRootFileGroups = typeSystemRootFileGroups(
      rootNames,
      project.rootDir,
      evaluatedSourcePaths,
      ambientSourcePaths,
      programSourceFilesByPath,
    );
    return new TypeSystemProject(
      project,
      evaluation,
      program,
      checker,
      projectOptions.configDiagnostics,
      projectOptions.configFilePath,
      {
        totalMilliseconds: performance.now() - started,
        phases,
        compilerOptions: typeSystemProjectCompilerOptionsProfile(options),
        hostSourceFileCache: diffCompilerHostSourceFileCacheStats(
          sharedCompilerHostSourceFileCache.snapshot(),
          hostSourceFileCacheBefore,
        ),
        programRootFiles,
        programSourceFiles: typeSystemProgramSourceFileStats(
          programSourceFiles,
          project.rootDir,
          evaluatedSourcePaths,
          ambientSourcePaths,
        ),
        programRootFileGroups,
        programSourceFileGroups: typeSystemProgramSourceFileGroups(
          programSourceFiles,
          project.rootDir,
          evaluatedSourcePaths,
          ambientSourcePaths,
        ),
      },
      sourceFiles.byModuleKey,
      sourceFiles.byPath,
      sourceFiles.moduleKeyByPath,
      programSourceFilesByPath,
      ambientSourcePaths,
      typeSystemDiagnosticSourcePaths(projectOptions.configRootFileNames),
    );
  }
}

function typeSystemProgramSourceFileIndex(sourceFiles: readonly ts.SourceFile[]): ReadonlyMap<string, ts.SourceFile> {
  const byPath = new Map<string, ts.SourceFile>();
  for (const sourceFile of sourceFiles) {
    byPath.set(canonicalTypeSystemPath(sourceFile.fileName), sourceFile);
  }
  return byPath;
}

function typeSystemProjectCompilerOptionsProfile(
  options: ts.CompilerOptions,
): TypeSystemProjectCompilerOptionsProfile {
  return {
    target: enumName(ts.ScriptTarget, options.target),
    module: enumName(ts.ModuleKind, options.module),
    moduleResolution: enumName(ts.ModuleResolutionKind, options.moduleResolution),
    jsx: enumName(ts.JsxEmit, options.jsx),
    allowJs: booleanOption(options.allowJs),
    checkJs: booleanOption(options.checkJs),
    skipLibCheck: booleanOption(options.skipLibCheck),
    allowArbitraryExtensions: booleanOption(options.allowArbitraryExtensions),
    experimentalDecorators: booleanOption(options.experimentalDecorators),
    hasBaseUrl: options.baseUrl != null,
    pathMappingCount: Object.keys(options.paths ?? {}).length,
    pathMappingTargetCount: Object.values(options.paths ?? {})
      .reduce((total, targets) => total + targets.length, 0),
    libraryFileCount: options.lib?.length ?? 0,
  };
}

function booleanOption(value: boolean | undefined): boolean | null {
  return value == null ? null : value;
}

function enumName(
  enumType: Record<string, string | number>,
  value: number | undefined,
): string | null {
  if (value == null) {
    return null;
  }
  const label = enumType[value];
  return typeof label === 'string' ? label : String(value);
}

function findProgramNodeBySpan<TNode extends ts.Node>(
  root: ts.SourceFile,
  sourceNode: TNode,
): TNode | null {
  let match: ts.Node | null = null;
  const visit = (node: ts.Node): void => {
    if (match != null) {
      return;
    }
    if (node.kind === sourceNode.kind && node.pos === sourceNode.pos && node.end === sourceNode.end) {
      match = node;
      return;
    }
    if (node.pos <= sourceNode.pos && sourceNode.end <= node.end) {
      ts.forEachChild(node, visit);
    }
  };
  visit(root);
  return match as TNode | null;
}

function typeSystemSourceFileIndexes(
  evaluatedSources: ReturnType<StaticProjectEvaluationResult['readEvaluatedSources']>,
): TypeSystemSourceFileIndexes {
  const byPath = new Map<string, ts.SourceFile>();
  const byModuleKey = new Map<string, ts.SourceFile>();
  const moduleKeyByPath = new Map<string, string>();
  for (const source of evaluatedSources) {
    if (!isTypeSystemProgramRootSourceFile(source.sourceFile.fileName)) {
      continue;
    }
    const normalizedPath = canonicalTypeSystemPath(source.sourceFile.fileName);
    const normalizedModuleKey = normalizeModuleKey(source.moduleKey);
    byPath.set(normalizedPath, source.sourceFile);
    byModuleKey.set(normalizedModuleKey, source.sourceFile);
    moduleKeyByPath.set(normalizedPath, normalizedModuleKey);
  }
  return { byPath, byModuleKey, moduleKeyByPath };
}

function addAmbientSourceFiles(
  byPath: Map<string, ts.SourceFile>,
  ambientSourceFiles: readonly ts.SourceFile[],
): void {
  for (const ambientSource of ambientSourceFiles) {
    byPath.set(canonicalTypeSystemPath(ambientSource.fileName), ambientSource);
  }
}

function typeSystemProgramSourceFileStats(
  sourceFiles: readonly ts.SourceFile[],
  projectRootDir: string,
  evaluatedSourcePaths: ReadonlySet<string>,
  ambientSourcePaths: ReadonlySet<string>,
): TypeSystemProgramSourceFileStats {
  const projectRootPath = canonicalTypeSystemPath(projectRootDir);
  let evaluatedSources = 0;
  let ambientSources = 0;
  let projectSources = 0;
  let nodeModuleSources = 0;
  let declarationSources = 0;
  let defaultLibrarySources = 0;
  let externalSources = 0;
  let sourceTextCharacters = 0;
  let evaluatedSourceTextCharacters = 0;
  let ambientSourceTextCharacters = 0;
  let projectSourceTextCharacters = 0;
  let nodeModuleSourceTextCharacters = 0;
  let declarationSourceTextCharacters = 0;
  let defaultLibrarySourceTextCharacters = 0;
  let externalSourceTextCharacters = 0;

  for (const sourceFile of sourceFiles) {
    const normalized = canonicalTypeSystemPath(sourceFile.fileName);
    const sourceTextLength = sourceFile.text.length;
    sourceTextCharacters += sourceTextLength;
    if (evaluatedSourcePaths.has(normalized)) {
      evaluatedSources += 1;
      evaluatedSourceTextCharacters += sourceTextLength;
    }
    if (ambientSourcePaths.has(normalized)) {
      ambientSources += 1;
      ambientSourceTextCharacters += sourceTextLength;
    }
    if (isTypeSystemPathAtOrUnder(normalized, projectRootPath)) {
      projectSources += 1;
      projectSourceTextCharacters += sourceTextLength;
    } else if (normalized.includes('/node_modules/')) {
      nodeModuleSources += 1;
      nodeModuleSourceTextCharacters += sourceTextLength;
    } else if (!isDefaultLibrarySourceFile(normalized)) {
      externalSources += 1;
      externalSourceTextCharacters += sourceTextLength;
    }
    if (sourceFile.isDeclarationFile) {
      declarationSources += 1;
      declarationSourceTextCharacters += sourceTextLength;
    }
    if (isDefaultLibrarySourceFile(normalized)) {
      defaultLibrarySources += 1;
      defaultLibrarySourceTextCharacters += sourceTextLength;
    }
  }

  return {
    total: sourceFiles.length,
    evaluatedSources,
    ambientSources,
    projectSources,
    nodeModuleSources,
    declarationSources,
    defaultLibrarySources,
    externalSources,
    sourceTextCharacters,
    evaluatedSourceTextCharacters,
    ambientSourceTextCharacters,
    projectSourceTextCharacters,
    nodeModuleSourceTextCharacters,
    declarationSourceTextCharacters,
    defaultLibrarySourceTextCharacters,
    externalSourceTextCharacters,
  };
}

function typeSystemProgramSourceFileGroups(
  sourceFiles: readonly ts.SourceFile[],
  projectRootDir: string,
  evaluatedSourcePaths: ReadonlySet<string>,
  ambientSourcePaths: ReadonlySet<string>,
): readonly TypeSystemProgramSourceFileGroupStats[] {
  const projectRootPath = canonicalTypeSystemPath(projectRootDir);
  const groups = new Map<string, MutableTypeSystemProgramSourceFileGroupStats>();
  for (const sourceFile of sourceFiles) {
    recordTypeSystemProgramSourceFileGroup(
      groups,
      sourceFile.fileName,
      sourceFile.text.length,
      sourceFile.isDeclarationFile,
      projectRootPath,
      evaluatedSourcePaths,
      ambientSourcePaths,
    );
  }
  return sortedTypeSystemProgramSourceFileGroups(groups);
}

function typeSystemRootFileStats(
  rootNames: readonly string[],
  projectRootDir: string,
  evaluatedSourcePaths: ReadonlySet<string>,
  ambientSourcePaths: ReadonlySet<string>,
  programSourceFilesByPath: ReadonlyMap<string, ts.SourceFile>,
): TypeSystemProgramSourceFileStats {
  const projectRootPath = canonicalTypeSystemPath(projectRootDir);
  let evaluatedSources = 0;
  let ambientSources = 0;
  let projectSources = 0;
  let nodeModuleSources = 0;
  let declarationSources = 0;
  let defaultLibrarySources = 0;
  let externalSources = 0;
  let sourceTextCharacters = 0;
  let evaluatedSourceTextCharacters = 0;
  let ambientSourceTextCharacters = 0;
  let projectSourceTextCharacters = 0;
  let nodeModuleSourceTextCharacters = 0;
  let declarationSourceTextCharacters = 0;
  let defaultLibrarySourceTextCharacters = 0;
  let externalSourceTextCharacters = 0;

  for (const rootName of rootNames) {
    const normalized = canonicalTypeSystemPath(rootName);
    const sourceTextLength = programSourceFilesByPath.get(normalized)?.text.length ?? 0;
    sourceTextCharacters += sourceTextLength;
    if (evaluatedSourcePaths.has(normalized)) {
      evaluatedSources += 1;
      evaluatedSourceTextCharacters += sourceTextLength;
    }
    if (ambientSourcePaths.has(normalized)) {
      ambientSources += 1;
      ambientSourceTextCharacters += sourceTextLength;
    }
    if (isTypeSystemPathAtOrUnder(normalized, projectRootPath)) {
      projectSources += 1;
      projectSourceTextCharacters += sourceTextLength;
    } else if (normalized.includes('/node_modules/')) {
      nodeModuleSources += 1;
      nodeModuleSourceTextCharacters += sourceTextLength;
    } else if (!isDefaultLibrarySourceFile(normalized)) {
      externalSources += 1;
      externalSourceTextCharacters += sourceTextLength;
    }
    if (normalized.endsWith('.d.ts')) {
      declarationSources += 1;
      declarationSourceTextCharacters += sourceTextLength;
    }
    if (isDefaultLibrarySourceFile(normalized)) {
      defaultLibrarySources += 1;
      defaultLibrarySourceTextCharacters += sourceTextLength;
    }
  }

  return {
    total: rootNames.length,
    evaluatedSources,
    ambientSources,
    projectSources,
    nodeModuleSources,
    declarationSources,
    defaultLibrarySources,
    externalSources,
    sourceTextCharacters,
    evaluatedSourceTextCharacters,
    ambientSourceTextCharacters,
    projectSourceTextCharacters,
    nodeModuleSourceTextCharacters,
    declarationSourceTextCharacters,
    defaultLibrarySourceTextCharacters,
    externalSourceTextCharacters,
  };
}

function typeSystemRootFileGroups(
  rootNames: readonly string[],
  projectRootDir: string,
  evaluatedSourcePaths: ReadonlySet<string>,
  ambientSourcePaths: ReadonlySet<string>,
  programSourceFilesByPath: ReadonlyMap<string, ts.SourceFile>,
): readonly TypeSystemProgramSourceFileGroupStats[] {
  const projectRootPath = canonicalTypeSystemPath(projectRootDir);
  const groups = new Map<string, MutableTypeSystemProgramSourceFileGroupStats>();
  for (const rootName of rootNames) {
    const normalized = canonicalTypeSystemPath(rootName);
    const sourceFile = programSourceFilesByPath.get(normalized) ?? null;
    recordTypeSystemProgramSourceFileGroup(
      groups,
      rootName,
      sourceFile?.text.length ?? 0,
      sourceFile?.isDeclarationFile ?? normalized.endsWith('.d.ts'),
      projectRootPath,
      evaluatedSourcePaths,
      ambientSourcePaths,
    );
  }
  return sortedTypeSystemProgramSourceFileGroups(groups);
}

interface MutableTypeSystemProgramSourceFileGroupStats {
  groupKind: TypeSystemProgramSourceFileGroupKind;
  groupKey: string;
  sourceFiles: number;
  sourceTextCharacters: number;
  declarationSources: number;
  evaluatedSources: number;
}

function recordTypeSystemProgramSourceFileGroup(
  groups: Map<string, MutableTypeSystemProgramSourceFileGroupStats>,
  fileName: string,
  sourceTextCharacters: number,
  isDeclarationFile: boolean,
  projectRootPath: string,
  evaluatedSourcePaths: ReadonlySet<string>,
  ambientSourcePaths: ReadonlySet<string>,
): void {
  const normalized = canonicalTypeSystemPath(fileName);
  const group = typeSystemProgramSourceFileGroup(normalized, projectRootPath, ambientSourcePaths);
  const key = `${group.groupKind}:${group.groupKey}`;
  const current = groups.get(key) ?? {
    groupKind: group.groupKind,
    groupKey: group.groupKey,
    sourceFiles: 0,
    sourceTextCharacters: 0,
    declarationSources: 0,
    evaluatedSources: 0,
  };
  current.sourceFiles += 1;
  current.sourceTextCharacters += sourceTextCharacters;
  if (isDeclarationFile) {
    current.declarationSources += 1;
  }
  if (evaluatedSourcePaths.has(normalized)) {
    current.evaluatedSources += 1;
  }
  groups.set(key, current);
}

function typeSystemProgramSourceFileGroup(
  normalizedFileName: string,
  projectRootPath: string,
  ambientSourcePaths: ReadonlySet<string>,
): Pick<TypeSystemProgramSourceFileGroupStats, 'groupKind' | 'groupKey'> {
  if (ambientSourcePaths.has(normalizedFileName)) {
    return { groupKind: 'ambient-source', groupKey: 'semantic-runtime-ambient' };
  }
  if (isDefaultLibrarySourceFile(normalizedFileName)) {
    return { groupKind: 'default-library', groupKey: 'typescript-default-library' };
  }
  const packageName = typeSystemNodeModulePackageName(normalizedFileName);
  if (packageName != null) {
    return { groupKind: 'node-module-package', groupKey: packageName };
  }
  if (isTypeSystemPathAtOrUnder(normalizedFileName, projectRootPath)) {
    return { groupKind: 'project-source', groupKey: 'project' };
  }
  return normalizedFileName.endsWith('.d.ts')
    ? { groupKind: 'external-declaration', groupKey: 'external-declarations' }
    : { groupKind: 'external-source', groupKey: 'external-source' };
}

function typeSystemNodeModulePackageName(normalizedFileName: string): string | null {
  const marker = '/node_modules/';
  const index = normalizedFileName.lastIndexOf(marker);
  if (index < 0) {
    return null;
  }
  const packagePath = normalizedFileName.slice(index + marker.length);
  const segments = packagePath.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return null;
  }
  if (segments[0] === '.pnpm') {
    const nested = packagePath.indexOf(marker);
    return nested < 0 ? '.pnpm' : typeSystemNodeModulePackageName(packagePath.slice(nested));
  }
  return segments[0]?.startsWith('@') && segments.length > 1
    ? `${segments[0]}/${segments[1]}`
    : segments[0] ?? null;
}

function sortedTypeSystemProgramSourceFileGroups(
  groups: ReadonlyMap<string, MutableTypeSystemProgramSourceFileGroupStats>,
): readonly TypeSystemProgramSourceFileGroupStats[] {
  return [...groups.values()]
    .sort((left, right) =>
      right.sourceTextCharacters - left.sourceTextCharacters
      || right.sourceFiles - left.sourceFiles
      || left.groupKind.localeCompare(right.groupKind)
      || left.groupKey.localeCompare(right.groupKey)
    );
}

function normalizedTypeSystemPathSet(
  fileNames: Iterable<string>,
): ReadonlySet<string> {
  return new Set([...fileNames].map((fileName) => canonicalTypeSystemPath(fileName)));
}

function typeSystemProgramRootNames(
  project: ProjectBootFrame,
  evaluatedSources: ReturnType<StaticProjectEvaluationResult['readEvaluatedSources']>,
  configRootFileNames: readonly string[] | null,
  ambientSourceFiles: readonly ts.SourceFile[],
): readonly string[] {
  const rootNames: string[] = [];
  const seen = new Set<string>();
  if (configRootFileNames == null) {
    for (const admission of project.sourceFiles) {
      if (!isTypeSystemProgramRootAdmission(admission)) {
        continue;
      }
      addUniqueTypeSystemRootName(rootNames, seen, resolveProjectPath(project.rootDir, admission.path));
    }
  } else {
    for (const fileName of configRootFileNames) {
      if (!isTypeSystemProgramRootSourceFile(fileName)) {
        continue;
      }
      addUniqueTypeSystemRootName(rootNames, seen, fileName);
    }
  }
  const projectRootPath = canonicalTypeSystemPath(project.rootDir);
  for (const source of evaluatedSources) {
    const sourcePath = canonicalTypeSystemPath(source.sourceFile.fileName);
    if (!isTypeSystemPathAtOrUnder(sourcePath, projectRootPath)) {
      continue;
    }
    if (!isTypeSystemProgramRootSourceFile(source.sourceFile.fileName)) {
      continue;
    }
    addUniqueTypeSystemRootName(rootNames, seen, source.sourceFile.fileName);
  }
  for (const ambientSourceFile of ambientSourceFiles) {
    addUniqueTypeSystemRootName(rootNames, seen, ambientSourceFile.fileName);
  }
  return rootNames;
}

function typeSystemDiagnosticSourcePaths(
  configRootFileNames: readonly string[] | null,
): ReadonlySet<string> | null {
  if (configRootFileNames == null) {
    return null;
  }
  return normalizedTypeSystemPathSet(
    configRootFileNames.filter(isTypeSystemProgramRootSourceFile),
  );
}

function addUniqueTypeSystemRootName(
  rootNames: string[],
  seen: Set<string>,
  fileName: string,
): void {
  const normalized = canonicalTypeSystemPath(fileName);
  if (seen.has(normalized)) {
    return;
  }
  seen.add(normalized);
  rootNames.push(fileName);
}

function isTypeSystemProgramRootAdmission(
  admission: Pick<SourceFileAdmission, 'language' | 'role' | 'path'>,
): boolean {
  return admission.role === SourceFileRole.AppSource
    && isStaticEvaluationSource(admission.language)
    && isTypeSystemProgramRootSourceFile(admission.path);
}

function typeSystemProjectProgramDiagnosticSourceFile(
  fileName: string,
  projectRootPath: string,
  ambientSourcePaths: ReadonlySet<string>,
  diagnosticSourcePaths: ReadonlySet<string> | null,
): boolean {
  const normalized = canonicalTypeSystemPath(fileName);
  return isTypeSystemPathAtOrUnder(normalized, projectRootPath)
    && !ambientSourcePaths.has(normalized)
    && !normalized.includes('/node_modules/')
    && !isDefaultLibrarySourceFile(normalized)
    && isTypeSystemProgramRootSourceFile(normalized)
    && (diagnosticSourcePaths == null || diagnosticSourcePaths.has(normalized));
}

function createTypeSystemCompilerHost(
  options: ts.CompilerOptions,
  byPath: ReadonlyMap<string, ts.SourceFile>,
  projectRootDir: string,
): ts.CompilerHost {
  const compilerHost = ts.createCompilerHost(options, true);
  const defaultGetSourceFile = compilerHost.getSourceFile.bind(compilerHost);
  compilerHost.getSourceFile = (
    fileName,
    languageVersionOrOptions,
    onError,
    shouldCreateNewSourceFile,
  ) => {
    const existing = byPath.get(canonicalTypeSystemPath(fileName));
    return existing ?? sharedCompilerHostSourceFileCache.readOrCreate(
      fileName,
      languageVersionOrOptions,
      projectRootDir,
      shouldCreateNewSourceFile,
      () => defaultGetSourceFile(fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile),
    );
  };
  return compilerHost;
}

function classDeclarationForTarget(
  checker: ts.TypeChecker,
  node: ts.Node,
): ts.ClassLikeDeclarationBase | null {
  if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
    return node;
  }
  if (
    ts.isIdentifier(node)
    && (ts.isClassDeclaration(node.parent) || ts.isClassExpression(node.parent))
    && node.parent.name === node
  ) {
    return node.parent;
  }
  if (ts.isIdentifier(node)) {
    const symbol = checker.getSymbolAtLocation(node) ?? null;
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0] ?? null;
    if (declaration != null && (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration))) {
      return declaration;
    }
  }
  return null;
}

function declaredClassInstanceType(
  checker: ts.TypeChecker,
  declaration: ts.ClassLikeDeclarationBase,
): ts.Type | null {
  const symbol = declaration.name == null ? checker.getSymbolAtLocation(declaration) : checker.getSymbolAtLocation(declaration.name);
  return symbol == null ? null : checker.getDeclaredTypeOfSymbol(symbol);
}

function constructedReturnType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const signature = type.getConstructSignatures()[0] ?? null;
  return signature == null ? null : checker.getReturnTypeOfSignature(signature);
}

function classDeclarationFromDeclaration(
  declaration: ts.Declaration,
): ts.ClassLikeDeclarationBase | null {
  if (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration)) {
    return declaration;
  }
  if (ts.isVariableDeclaration(declaration) && declaration.initializer != null && ts.isClassExpression(declaration.initializer)) {
    return declaration.initializer;
  }
  return null;
}

function classDeclarationKey(
  declaration: ts.ClassLikeDeclarationBase,
): string {
  const sourceFile = declaration.getSourceFile();
  return `${sourceFile.fileName}:${declaration.pos}:${declaration.end}`;
}

function resolveProjectPath(rootDir: string, fileName: string): string {
  return path.isAbsolute(fileName) ? fileName : path.join(rootDir, fileName);
}

function resolveWorkspacePath(workspaceRootDir: string, fileName: string): string {
  return path.isAbsolute(fileName) ? fileName : path.join(workspaceRootDir, fileName);
}

function isTypeSystemProgramRootSourceFile(fileName: string): boolean {
  switch (path.extname(fileName).toLowerCase()) {
    case '.ts':
    case '.tsx':
    case '.mts':
    case '.cts':
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return true;
    default:
      return false;
  }
}

function measureTypeSystemProjectPhase<TValue>(
  phases: TypeSystemProjectPhaseTiming[],
  name: TypeSystemProjectPhaseName,
  read: () => TValue,
  itemCount?: (value: TValue) => number | undefined,
): TValue {
  const started = performance.now();
  const value = read();
  phases.push({
    name,
    milliseconds: performance.now() - started,
    itemCount: itemCount?.(value),
  });
  return value;
}
