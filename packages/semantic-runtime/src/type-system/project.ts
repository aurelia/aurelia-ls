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
import {
  createTypeSystemOverlaySourceFile,
  typeSystemOverlaySegmentAt,
  type TypeSystemOverlaySource,
  type TypeSystemOverlaySourceSegment,
} from './overlay.js';
import { checkerConstructReturnTypeUnion } from './checker-signature-parameters.js';
import {
  readTypeSystemTypeScriptEnvironment,
  type TypeSystemTypeScriptEnvironment,
} from './typescript-environment.js';
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
  | 'overlay-source-index'
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
  readonly overlaySources: number;
  readonly projectSources: number;
  readonly nodeModuleSources: number;
  readonly declarationSources: number;
  readonly defaultLibrarySources: number;
  readonly externalSources: number;
  readonly sourceTextCharacters: number;
  readonly evaluatedSourceTextCharacters: number;
  readonly overlaySourceTextCharacters: number;
  readonly projectSourceTextCharacters: number;
  readonly nodeModuleSourceTextCharacters: number;
  readonly declarationSourceTextCharacters: number;
  readonly defaultLibrarySourceTextCharacters: number;
  readonly externalSourceTextCharacters: number;
}

export type TypeSystemProgramSourceFileGroupKind =
  | 'overlay-source'
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
  readonly typeScript: TypeSystemTypeScriptEnvironment;
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

export interface TypeSystemProjectBuildOptions {
  /**
   * Additional Program-owned virtual TypeScript sources for Aurelia semantic representations.
   *
   * These are appended to the default semantic-runtime overlays and are checker roots, not ordinary TypeScript
   * diagnostic roots. Use this path when a later pass has enough semantic information to represent template,
   * controller, router, or plugin surfaces in TypeScript without growing a second checker setup path.
   */
  readonly overlaySources?: readonly TypeSystemOverlaySource[];
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
  private readonly programNodeRemapSpanIndexesByPath = new Map<string, ReadonlyMap<string, ts.Node>>();
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
    private readonly overlaySourcesByPath: ReadonlyMap<string, TypeSystemOverlaySource>,
    private readonly overlaySourcePaths: ReadonlySet<string>,
    private readonly diagnosticSourcePaths: ReadonlySet<string> | null,
  ) {}

  /** Read an evaluator-owned source file by evaluator module key. */
  readEvaluatedSourceFileByModuleKey(moduleKey: string): ts.SourceFile | null {
    return this.sourceFilesByModuleKey.get(normalizeModuleKey(moduleKey)) ?? null;
  }

  /** Read the Program-owned source file associated with an evaluator module key. */
  readProgramSourceFileByModuleKey(moduleKey: string): ts.SourceFile | null {
    const evaluatedSourceFile = this.readEvaluatedSourceFileByModuleKey(moduleKey);
    return evaluatedSourceFile == null ? null : this.readProgramSourceFileByPath(evaluatedSourceFile.fileName);
  }

  /** Read an evaluator-owned source file by absolute, project-relative, or workspace-relative path. */
  readEvaluatedSourceFileByPath(fileName: string): ts.SourceFile | null {
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

  /** Read all semantic-runtime overlay sources admitted into this checker epoch. */
  readOverlaySources(): readonly TypeSystemOverlaySource[] {
    return [...this.overlaySourcesByPath.values()]
      .sort((left, right) => left.fileName.localeCompare(right.fileName));
  }

  /** Read overlay metadata by absolute, project-relative, or workspace-relative generated source path. */
  readOverlaySourceByPath(fileName: string): TypeSystemOverlaySource | null {
    return this.overlaySourcesByPath.get(canonicalTypeSystemPath(resolveProjectPath(this.project.rootDir, fileName)))
      ?? this.overlaySourcesByPath.get(canonicalTypeSystemPath(resolveWorkspacePath(this.project.workspaceRootDir, fileName)))
      ?? null;
  }

  /** Read the overlay source metadata for a Program SourceFile, when the file is synthetic. */
  readOverlaySourceForProgramSourceFile(sourceFile: ts.SourceFile): TypeSystemOverlaySource | null {
    return this.overlaySourcesByPath.get(canonicalTypeSystemPath(sourceFile.fileName)) ?? null;
  }

  /** Read the overlay segment covering a generated source position, when one was declared. */
  readOverlaySourceSegmentAt(
    fileName: string,
    position: number,
  ): TypeSystemOverlaySourceSegment | null {
    const source = this.readOverlaySourceByPath(fileName);
    return source == null ? null : typeSystemOverlaySegmentAt(source, position);
  }

  /** Classify a Program source file through boot admission first, then checker-owned dependency/source buckets. */
  readProgramSourceFileRole(fileName: string): SourceFileRole | null {
    const sourceFile = this.readProgramSourceFileByPath(fileName);
    if (sourceFile == null) {
      return null;
    }
    const normalized = canonicalTypeSystemPath(sourceFile.fileName);
    const admitted = sourceAdmissionForTypeSystemPath(this.project, normalized);
    if (admitted != null) {
      return admitted.role;
    }
    return typeSystemProgramSourceFileRole(
      sourceFile,
      canonicalTypeSystemPath(this.project.rootDir),
      this.overlaySourcePaths,
    );
  }

  /** Read Program-owned TS/JS source files admitted as app source by this project frame. */
  readProjectProgramSourceFiles(): readonly ts.SourceFile[] {
    const projectRootPath = canonicalTypeSystemPath(this.project.rootDir);
    return [...this.programSourceFilesByPath.values()]
      .filter((sourceFile) => typeSystemProjectProgramDiagnosticSourceFile(
        sourceFile.fileName,
        projectRootPath,
        this.overlaySourcePaths,
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
    const match = this.readProgramNodeBySpan(programSourceFile, node);
    if (match == null) {
      this.programNodeRemapSpanMisses += 1;
    } else {
      this.programNodeRemapSpanHits += 1;
    }
    this.programNodeRemapCache.set(node, match);
    return match as TNode | null;
  }

  /** Read a Program-owned expression counterpart and reject impossible span matches explicitly. */
  readProgramExpression<TExpression extends ts.Expression>(expression: TExpression): TExpression | null {
    const node = this.readProgramNode(expression);
    return node != null && ts.isExpression(node) ? node : null;
  }

  /** Read a Program-owned declaration counterpart and reject impossible span matches explicitly. */
  readProgramDeclaration<TDeclaration extends ts.Declaration>(declaration: TDeclaration): TDeclaration | null {
    return this.readProgramNode(declaration);
  }

  /** Read a TypeChecker type only after remapping an evaluator/source-discovery node into this Program epoch. */
  readProgramTypeAtLocation(node: ts.Node): ts.Type | null {
    const checkerNode = this.readProgramNode(node);
    return checkerNode == null ? null : this.checker.getTypeAtLocation(checkerNode);
  }

  /** Read a TypeChecker type node only after remapping it into this Program epoch. */
  readProgramTypeFromTypeNode(node: ts.TypeNode): ts.Type | null {
    const checkerNode = this.readProgramNode(node);
    return checkerNode == null || !ts.isTypeNode(checkerNode)
      ? null
      : this.checker.getTypeFromTypeNode(checkerNode);
  }

  /** Read a TypeChecker symbol only after remapping an evaluator/source-discovery node into this Program epoch. */
  readProgramSymbolAtLocation(node: ts.Node): ts.Symbol | null {
    const checkerNode = this.readProgramNode(node);
    return checkerNode == null ? null : this.checker.getSymbolAtLocation(checkerNode) ?? null;
  }

  /** Read an alias-resolved TypeChecker symbol from a Program-remapped value site. */
  readProgramAliasedSymbolAtLocation(node: ts.Node): ts.Symbol | null {
    const symbol = this.readProgramSymbolAtLocation(node);
    return symbol == null ? null : this.resolveAliasedSymbol(symbol);
  }

  /** Read a symbol's value type at a Program-remapped location. */
  readProgramTypeOfSymbolAtLocation(
    symbol: ts.Symbol,
    location: ts.Node,
  ): ts.Type | null {
    const checkerLocation = this.readProgramNode(location);
    return checkerLocation == null ? null : this.checker.getTypeOfSymbolAtLocation(symbol, checkerLocation);
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

  private readProgramNodeBySpan<TNode extends ts.Node>(
    programSourceFile: ts.SourceFile,
    sourceNode: TNode,
  ): TNode | null {
    return this.readProgramNodeSpanIndex(programSourceFile).get(typeSystemProgramNodeSpanKey(sourceNode)) as TNode | undefined ?? null;
  }

  private readProgramNodeSpanIndex(
    programSourceFile: ts.SourceFile,
  ): ReadonlyMap<string, ts.Node> {
    const sourcePath = canonicalTypeSystemPath(programSourceFile.fileName);
    const cached = this.programNodeRemapSpanIndexesByPath.get(sourcePath);
    if (cached != null) {
      return cached;
    }
    const index = typeSystemProgramNodeSpanIndex(programSourceFile);
    this.programNodeRemapSpanIndexesByPath.set(sourcePath, index);
    return index;
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
    buildOptions: TypeSystemProjectBuildOptions = {},
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
    const overlaySources = typeSystemProjectOverlaySources(projectOptions.overlaySources, buildOptions.overlaySources);
    const overlaySourceFiles = overlaySources.map(createTypeSystemOverlaySourceFile);
    const overlaySourcesByPath = typeSystemOverlaySourceIndex(overlaySources);
    const overlaySourcePaths = normalizedTypeSystemPathSet(
      overlaySourceFiles.map((sourceFile) => sourceFile.fileName),
    );
    measureTypeSystemProjectPhase(
      phases,
      'overlay-source-index',
      () => addOverlaySourceFiles(sourceFiles.byPath, overlaySourceFiles),
      () => overlaySourceFiles.length,
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
      overlaySourceFiles,
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
      overlaySourcePaths,
      programSourceFilesByPath,
    );
    const programRootFileGroups = typeSystemRootFileGroups(
      rootNames,
      project.rootDir,
      evaluatedSourcePaths,
      overlaySourcePaths,
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
        typeScript: readTypeSystemTypeScriptEnvironment(project.rootDir, project.workspaceRootDir),
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
          overlaySourcePaths,
        ),
        programRootFileGroups,
        programSourceFileGroups: typeSystemProgramSourceFileGroups(
          programSourceFiles,
          project.rootDir,
          evaluatedSourcePaths,
          overlaySourcePaths,
        ),
      },
      sourceFiles.byModuleKey,
      sourceFiles.byPath,
      sourceFiles.moduleKeyByPath,
      programSourceFilesByPath,
      overlaySourcesByPath,
      overlaySourcePaths,
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

function typeSystemProjectOverlaySources(
  defaultOverlaySources: readonly TypeSystemOverlaySource[],
  additionalOverlaySources: readonly TypeSystemOverlaySource[] | undefined,
): readonly TypeSystemOverlaySource[] {
  if (additionalOverlaySources == null || additionalOverlaySources.length === 0) {
    return defaultOverlaySources;
  }
  const sources: TypeSystemOverlaySource[] = [];
  const seen = new Set<string>();
  for (const source of [...defaultOverlaySources, ...additionalOverlaySources]) {
    const key = canonicalTypeSystemPath(source.fileName);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    sources.push(source);
  }
  return sources;
}

function typeSystemOverlaySourceIndex(
  sources: readonly TypeSystemOverlaySource[],
): ReadonlyMap<string, TypeSystemOverlaySource> {
  return new Map(sources.map((source) => [canonicalTypeSystemPath(source.fileName), source] as const));
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

function typeSystemProgramNodeSpanIndex(
  root: ts.SourceFile,
): ReadonlyMap<string, ts.Node> {
  const index = new Map<string, ts.Node>();
  const visit = (node: ts.Node): void => {
    index.set(typeSystemProgramNodeSpanKey(node), node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return index;
}

function typeSystemProgramNodeSpanKey(
  node: ts.Node,
): string {
  return `${node.kind}:${node.pos}:${node.end}`;
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

function addOverlaySourceFiles(
  byPath: Map<string, ts.SourceFile>,
  overlaySourceFiles: readonly ts.SourceFile[],
): void {
  for (const overlaySource of overlaySourceFiles) {
    byPath.set(canonicalTypeSystemPath(overlaySource.fileName), overlaySource);
  }
}

function typeSystemProgramSourceFileStats(
  sourceFiles: readonly ts.SourceFile[],
  projectRootDir: string,
  evaluatedSourcePaths: ReadonlySet<string>,
  overlaySourcePaths: ReadonlySet<string>,
): TypeSystemProgramSourceFileStats {
  const projectRootPath = canonicalTypeSystemPath(projectRootDir);
  let evaluatedSources = 0;
  let overlaySources = 0;
  let projectSources = 0;
  let nodeModuleSources = 0;
  let declarationSources = 0;
  let defaultLibrarySources = 0;
  let externalSources = 0;
  let sourceTextCharacters = 0;
  let evaluatedSourceTextCharacters = 0;
  let overlaySourceTextCharacters = 0;
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
    if (overlaySourcePaths.has(normalized)) {
      overlaySources += 1;
      overlaySourceTextCharacters += sourceTextLength;
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
    overlaySources,
    projectSources,
    nodeModuleSources,
    declarationSources,
    defaultLibrarySources,
    externalSources,
    sourceTextCharacters,
    evaluatedSourceTextCharacters,
    overlaySourceTextCharacters,
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
  overlaySourcePaths: ReadonlySet<string>,
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
      overlaySourcePaths,
    );
  }
  return sortedTypeSystemProgramSourceFileGroups(groups);
}

function typeSystemRootFileStats(
  rootNames: readonly string[],
  projectRootDir: string,
  evaluatedSourcePaths: ReadonlySet<string>,
  overlaySourcePaths: ReadonlySet<string>,
  programSourceFilesByPath: ReadonlyMap<string, ts.SourceFile>,
): TypeSystemProgramSourceFileStats {
  const projectRootPath = canonicalTypeSystemPath(projectRootDir);
  let evaluatedSources = 0;
  let overlaySources = 0;
  let projectSources = 0;
  let nodeModuleSources = 0;
  let declarationSources = 0;
  let defaultLibrarySources = 0;
  let externalSources = 0;
  let sourceTextCharacters = 0;
  let evaluatedSourceTextCharacters = 0;
  let overlaySourceTextCharacters = 0;
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
    if (overlaySourcePaths.has(normalized)) {
      overlaySources += 1;
      overlaySourceTextCharacters += sourceTextLength;
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
    overlaySources,
    projectSources,
    nodeModuleSources,
    declarationSources,
    defaultLibrarySources,
    externalSources,
    sourceTextCharacters,
    evaluatedSourceTextCharacters,
    overlaySourceTextCharacters,
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
  overlaySourcePaths: ReadonlySet<string>,
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
      overlaySourcePaths,
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
  overlaySourcePaths: ReadonlySet<string>,
): void {
  const normalized = canonicalTypeSystemPath(fileName);
  const group = typeSystemProgramSourceFileGroup(normalized, projectRootPath, overlaySourcePaths);
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
  overlaySourcePaths: ReadonlySet<string>,
): Pick<TypeSystemProgramSourceFileGroupStats, 'groupKind' | 'groupKey'> {
  if (overlaySourcePaths.has(normalizedFileName)) {
    return { groupKind: 'overlay-source', groupKey: 'semantic-runtime-overlay' };
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

function typeSystemProgramSourceFileRole(
  sourceFile: ts.SourceFile,
  projectRootPath: string,
  overlaySourcePaths: ReadonlySet<string>,
): SourceFileRole {
  const normalized = canonicalTypeSystemPath(sourceFile.fileName);
  if (overlaySourcePaths.has(normalized)) {
    return SourceFileRole.Generated;
  }
  if (sourceFile.isDeclarationFile || isDefaultLibrarySourceFile(normalized)) {
    return SourceFileRole.Declaration;
  }
  if (typeSystemNodeModulePackageName(normalized) != null) {
    return SourceFileRole.ExternalSource;
  }
  if (isTypeSystemPathAtOrUnder(normalized, projectRootPath)) {
    return SourceFileRole.Unknown;
  }
  return SourceFileRole.ExternalSource;
}

function sourceAdmissionForTypeSystemPath(
  project: ProjectBootFrame,
  normalizedFileName: string,
): SourceFileAdmission | null {
  return project.sourceFiles.find((source) => {
    const projectPath = canonicalTypeSystemPath(resolveProjectPath(project.rootDir, source.path));
    const workspacePath = canonicalTypeSystemPath(resolveWorkspacePath(project.workspaceRootDir, source.path));
    return projectPath === normalizedFileName || workspacePath === normalizedFileName;
  }) ?? null;
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
  overlaySourceFiles: readonly ts.SourceFile[],
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
  for (const overlaySourceFile of overlaySourceFiles) {
    addUniqueTypeSystemRootName(rootNames, seen, overlaySourceFile.fileName);
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
  return (
    admission.role === SourceFileRole.AppSource
    || admission.role === SourceFileRole.ToolingScript
    || admission.role === SourceFileRole.Declaration
  )
    && isStaticEvaluationSource(admission.language)
    && isTypeSystemProgramRootSourceFile(admission.path);
}

function typeSystemProjectProgramDiagnosticSourceFile(
  fileName: string,
  projectRootPath: string,
  overlaySourcePaths: ReadonlySet<string>,
  diagnosticSourcePaths: ReadonlySet<string> | null,
): boolean {
  const normalized = canonicalTypeSystemPath(fileName);
  return isTypeSystemPathAtOrUnder(normalized, projectRootPath)
    && !overlaySourcePaths.has(normalized)
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
  // Constructors instantiate one runtime target shape; overload-sensitive authored calls use the call projector instead.
  return checkerConstructReturnTypeUnion(checker, type);
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
