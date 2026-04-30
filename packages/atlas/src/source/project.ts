import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import {
  repoPathIdentity,
  repoRelativePath,
  resolveRepoPath,
  toPosixPath,
  type RepoPathIdentity,
  type RepoRelativePath,
} from "./path.js";

/** Stable id for a source package admitted into the hot TypeScript world. */
export const enum SourcePackageId {
  /** The inquiry/session package itself. */
  Atlas = "atlas",
  /** Product-owned semantic runtime substrate. */
  SemanticRuntime = "semantic-runtime",
}

/** Source snapshot implementation owned by this package. */
export const enum SourceSnapshotKind {
  /** TypeScript LanguageService with a current Program and TypeChecker. */
  TypeScriptLanguageService = "typescript-language-service",
}

/** Declaration category used by source-level inventory before semantic interpretation. */
export const enum SourceDeclarationKind {
  /** Class declaration or class expression declaration site. */
  Class = "class",
  /** Interface declaration. */
  Interface = "interface",
  /** Function declaration. */
  Function = "function",
  /** Method declaration. */
  Method = "method",
  /** Property declaration. */
  Property = "property",
  /** Accessor declaration. */
  Accessor = "accessor",
  /** Constructor declaration. */
  Constructor = "constructor",
  /** Type alias declaration. */
  TypeAlias = "type-alias",
  /** Enum declaration. */
  Enum = "enum",
  /** Variable declaration. */
  Variable = "variable",
}

/** Static package admission contract for the source substrate. */
export interface SourcePackageDefinition {
  /** Stable package id inside the source project. */
  readonly id: SourcePackageId;
  /** Package name from package.json or the intended internal package name. */
  readonly packageName: string;
  /** Repository-relative package root. */
  readonly rootPath: RepoRelativePath;
  /** Repository-relative tsconfig used to admit source files. */
  readonly tsconfigPath: RepoRelativePath;
}

/** Options used to construct the source substrate. */
export interface SourceProjectOptions {
  /** Absolute repository root; discovered from the current working directory when omitted. */
  readonly repoRoot?: string;
  /** Package definitions to admit into the shared TypeScript world. */
  readonly packages?: readonly SourcePackageDefinition[];
}

/** Source span with both TypeScript offsets and editor-friendly coordinates. */
export interface SourceSpan {
  /** Zero-based source offset at the start of the span. */
  readonly start: number;
  /** Zero-based source offset just past the end of the span. */
  readonly end: number;
  /** One-based line at the start of the span. */
  readonly startLine: number;
  /** One-based character at the start of the span. */
  readonly startCharacter: number;
  /** One-based line at the end of the span. */
  readonly endLine: number;
  /** One-based character at the end of the span. */
  readonly endCharacter: number;
}

/** Source file identity after package admission. */
export interface SourceFileIdentity extends RepoPathIdentity {
  /** Package that owns this source file, null for reachable external or library files. */
  readonly packageId: SourcePackageId | null;
}

/** Compiler-facing source package summary. */
export interface SourcePackageSummary {
  /** Stable package id inside the source project. */
  readonly id: SourcePackageId;
  /** Package name from the package definition. */
  readonly packageName: string;
  /** Repository-relative package root. */
  readonly rootPath: RepoRelativePath;
  /** Repository-relative tsconfig used for source admission. */
  readonly tsconfigPath: RepoRelativePath;
  /** Number of root file names admitted from this package tsconfig. */
  readonly rootFileCount: number;
  /** Number of Program source files currently owned by this package. */
  readonly sourceFileCount: number;
}

/** Compact source substrate summary suitable for daemon status and orientation. */
export interface SourceProjectSummary {
  /** Snapshot implementation kind. */
  readonly snapshotKind: SourceSnapshotKind;
  /** Human-readable source identity for the current working tree basis. */
  readonly identity: string;
  /** Number of admitted source packages. */
  readonly packageCount: number;
  /** Number of root files admitted from package tsconfigs. */
  readonly rootFileCount: number;
  /** Number of source files in the current TypeScript Program. */
  readonly programSourceFileCount: number;
  /** Number of Program source files owned by admitted packages. */
  readonly ownedSourceFileCount: number;
  /** Number of tsconfig diagnostics observed while admitting packages. */
  readonly configDiagnosticCount: number;
  /** Per-package source counts. */
  readonly packages: readonly SourcePackageSummary[];
}

/** Runtime snapshot for the hot source substrate. */
export interface SourceProjectSnapshot {
  /** Snapshot implementation kind. */
  readonly kind: SourceSnapshotKind;
  /** Human-readable source identity for this process-local source basis. */
  readonly identity: string;
  /** Compact source project summary. */
  readonly summary: SourceProjectSummary;
}

/** Source declaration row before product, framework, or inquiry semantics are applied. */
export interface SourceDeclarationRow {
  /** Declaration category. */
  readonly kind: SourceDeclarationKind;
  /** Declaration name, when the syntax carries a stable name. */
  readonly name: string | null;
  /** File identity that contains the declaration. */
  readonly file: SourceFileIdentity;
  /** Source span for the declaration node. */
  readonly span: SourceSpan;
  /** TypeChecker symbol key when the declaration has a checker-visible symbol. */
  readonly symbolKey: string | null;
}

/** Hot TypeScript source world shared by source, checker, and TypeChecker-driven semantic lenses. */
export class SourceProject {
  readonly #languageService: ts.LanguageService;
  readonly #packageDefinitions: readonly ResolvedSourcePackageDefinition[];
  readonly #rootFileNames: readonly string[];
  readonly #configDiagnostics: readonly ts.Diagnostic[];
  readonly #compilerOptions: ts.CompilerOptions;

  constructor(
    /** Absolute repository root used for source identity. */
    readonly repoRoot: string,
    /** Package definitions admitted into this source project. */
    packageDefinitions: readonly ResolvedSourcePackageDefinition[],
    /** Root file names admitted from package tsconfigs. */
    rootFileNames: readonly string[],
    /** Compiler options used by the shared LanguageService. */
    compilerOptions: ts.CompilerOptions,
    /** Diagnostics observed while reading package tsconfigs. */
    configDiagnostics: readonly ts.Diagnostic[],
  ) {
    this.#packageDefinitions = packageDefinitions;
    this.#rootFileNames = rootFileNames;
    this.#compilerOptions = compilerOptions;
    this.#configDiagnostics = configDiagnostics;
    this.#languageService = ts.createLanguageService(this.createLanguageServiceHost());
  }

  /** Current TypeScript Program, materialized by the LanguageService. */
  get program(): ts.Program {
    const program = this.#languageService.getProgram();
    if (program === undefined) {
      throw new Error("Source project could not materialize a TypeScript Program.");
    }
    return program;
  }

  /** Current TypeChecker owned by the current Program epoch. */
  get checker(): ts.TypeChecker {
    return this.program.getTypeChecker();
  }

  /** Return the current source substrate snapshot. */
  snapshot(): SourceProjectSnapshot {
    const summary = this.summary();
    return {
      kind: SourceSnapshotKind.TypeScriptLanguageService,
      identity: summary.identity,
      summary,
    };
  }

  /** Return a compact source project summary without running semantic analysis. */
  summary(): SourceProjectSummary {
    const programFiles = this.program.getSourceFiles();
    const ownedFiles = programFiles.filter((sourceFile) => this.packageForFileName(sourceFile.fileName) !== null);
    const packageSummaries = this.#packageDefinitions.map((definition) => {
      const sourceFileCount = ownedFiles.filter((sourceFile) => this.packageForFileName(sourceFile.fileName)?.id === definition.id).length;
      return {
        id: definition.id,
        packageName: definition.packageName,
        rootPath: definition.rootPath,
        tsconfigPath: definition.tsconfigPath,
        rootFileCount: definition.rootFileNames.length,
        sourceFileCount,
      };
    });

    return {
      snapshotKind: SourceSnapshotKind.TypeScriptLanguageService,
      identity: this.identity(),
      packageCount: this.#packageDefinitions.length,
      rootFileCount: this.#rootFileNames.length,
      programSourceFileCount: programFiles.length,
      ownedSourceFileCount: ownedFiles.length,
      configDiagnosticCount: this.#configDiagnostics.length,
      packages: packageSummaries,
    };
  }

  /** Return source files owned by admitted packages. */
  ownedSourceFiles(): readonly ts.SourceFile[] {
    return this.program.getSourceFiles().filter((sourceFile) => this.packageForFileName(sourceFile.fileName) !== null);
  }

  /** Read a source file by repository-relative or absolute path. */
  readSourceFile(
    /** Repository-relative or absolute file path. */
    filePath: string,
  ): ts.SourceFile | null {
    const absolutePath = path.isAbsolute(filePath) ? path.resolve(filePath) : resolveRepoPath(this.repoRoot, filePath);
    const normalized = normalizeFileKey(absolutePath);
    return this.program.getSourceFiles().find((sourceFile) => normalizeFileKey(sourceFile.fileName) === normalized) ?? null;
  }

  /** Return declaration rows for source files owned by admitted packages. */
  declarationRows(): readonly SourceDeclarationRow[] {
    const checker = this.checker;
    const rows: SourceDeclarationRow[] = [];
    for (const sourceFile of this.ownedSourceFiles()) {
      const file = this.sourceFileIdentity(sourceFile);
      if (file === null) {
        continue;
      }
      visitSourceDeclarations(sourceFile, (node, kind, nameNode) => {
        rows.push({
          kind,
          name: nameNode?.getText(sourceFile) ?? null,
          file,
          span: sourceSpan(sourceFile, node),
          symbolKey: symbolKeyForDeclaration(checker, nameNode ?? node),
        });
      });
    }
    return rows;
  }

  /** Return the admitted package that owns a file, or null for external/library files. */
  packageForFileName(
    /** Absolute or relative source file path. */
    fileName: string,
  ): ResolvedSourcePackageDefinition | null {
    const normalized = normalizeFileKey(fileName);
    return this.#packageDefinitions.find((definition) => normalized.startsWith(`${definition.rootFileKey}/`)) ?? null;
  }

  /** Return stable file identity for a TypeScript source file. */
  sourceFileIdentity(
    /** Source file to identify. */
    sourceFile: ts.SourceFile,
  ): SourceFileIdentity | null {
    const identity = repoPathIdentity(this.repoRoot, sourceFile.fileName);
    if (identity === null) {
      return null;
    }
    return {
      ...identity,
      packageId: this.packageForFileName(sourceFile.fileName)?.id ?? null,
    };
  }

  /** Release TypeScript semantic caches held by the language service. */
  dispose(): void {
    this.#languageService.dispose();
  }

  private createLanguageServiceHost(): ts.LanguageServiceHost {
    return {
      getCompilationSettings: () => this.#compilerOptions,
      getScriptFileNames: () => [...this.#rootFileNames],
      getScriptVersion: (fileName) => sourceVersion(fileName),
      getScriptSnapshot: (fileName) => {
        if (!existsSync(fileName)) {
          return undefined;
        }
        return ts.ScriptSnapshot.fromString(readFileSync(fileName, "utf8"));
      },
      getCurrentDirectory: () => this.repoRoot,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      readFile: ts.sys.readFile,
      fileExists: ts.sys.fileExists,
      directoryExists: ts.sys.directoryExists,
      readDirectory: ts.sys.readDirectory,
      getDirectories: ts.sys.getDirectories,
      realpath: ts.sys.realpath,
    };
  }

  private identity(): string {
    return `working-tree:${this.#packageDefinitions.map((definition) => definition.id).join("+")}`;
  }
}

/** Create the default source project over the internal inquiry and semantic-runtime packages. */
export function createSourceProject(
  /** Optional source project construction options. */
  options: SourceProjectOptions = {},
): SourceProject {
  const repoRoot = path.resolve(options.repoRoot ?? findRepoRoot());
  const packages = options.packages ?? defaultSourcePackageDefinitions();
  const resolvedPackages = packages.map((definition) => resolveSourcePackageDefinition(repoRoot, definition));
  const packageConfigs = resolvedPackages.map((definition) => readPackageConfig(repoRoot, definition));
  const rootFileNames = uniqueSorted(packageConfigs.flatMap((config) => config.rootFileNames));
  const configDiagnostics = packageConfigs.flatMap((config) => config.diagnostics);
  const compilerOptions = compilerOptionsForProject(packageConfigs);
  const packagesWithRoots = resolvedPackages.map((definition, index) => ({
    ...definition,
    rootFileNames: packageConfigs[index]?.rootFileNames ?? [],
  }));
  return new SourceProject(repoRoot, packagesWithRoots, rootFileNames, compilerOptions, configDiagnostics);
}

/** Return the default source packages Atlas should keep hot for this repo. */
export function defaultSourcePackageDefinitions(): readonly SourcePackageDefinition[] {
  return [
    {
      id: SourcePackageId.Atlas,
      packageName: "@aurelia-ls/atlas",
      rootPath: "packages/atlas" as RepoRelativePath,
      tsconfigPath: "packages/atlas/tsconfig.json" as RepoRelativePath,
    },
    {
      id: SourcePackageId.SemanticRuntime,
      packageName: "@aurelia-ls/semantic-runtime",
      rootPath: "packages/semantic-runtime" as RepoRelativePath,
      tsconfigPath: "packages/semantic-runtime/tsconfig.json" as RepoRelativePath,
    },
  ];
}

interface ResolvedSourcePackageDefinition extends SourcePackageDefinition {
  readonly rootAbsolutePath: string;
  readonly rootFileKey: string;
  readonly tsconfigAbsolutePath: string;
  readonly rootFileNames: readonly string[];
}

interface ReadPackageConfigResult {
  readonly rootFileNames: readonly string[];
  readonly options: ts.CompilerOptions;
  readonly diagnostics: readonly ts.Diagnostic[];
}

function resolveSourcePackageDefinition(
  repoRoot: string,
  definition: SourcePackageDefinition,
): ResolvedSourcePackageDefinition {
  const rootAbsolutePath = resolveRepoPath(repoRoot, definition.rootPath);
  const tsconfigAbsolutePath = resolveRepoPath(repoRoot, definition.tsconfigPath);
  return {
    ...definition,
    rootAbsolutePath,
    rootFileKey: normalizeFileKey(rootAbsolutePath),
    tsconfigAbsolutePath,
    rootFileNames: [],
  };
}

function readPackageConfig(
  repoRoot: string,
  definition: ResolvedSourcePackageDefinition,
): ReadPackageConfigResult {
  const read = ts.readConfigFile(definition.tsconfigAbsolutePath, ts.sys.readFile);
  if (read.error !== undefined) {
    return { rootFileNames: [], options: defaultCompilerOptions(), diagnostics: [read.error] };
  }
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(definition.tsconfigAbsolutePath),
  );
  const rootFileNames = parsed.fileNames
    .map((fileName) => path.resolve(fileName))
    .filter((fileName) => repoRelativePath(repoRoot, fileName) !== null)
    .sort((left, right) => left.localeCompare(right));
  return {
    rootFileNames,
    options: parsed.options,
    diagnostics: parsed.errors,
  };
}

function compilerOptionsForProject(
  configs: readonly ReadPackageConfigResult[],
): ts.CompilerOptions {
  const firstOptions = configs.find((config) => Object.keys(config.options).length > 0)?.options ?? {};
  const {
    composite: _composite,
    declaration: _declaration,
    emitDeclarationOnly: _emitDeclarationOnly,
    outDir: _outDir,
    rootDir: _rootDir,
    tsBuildInfoFile: _tsBuildInfoFile,
    ...safeOptions
  } = firstOptions;

  return {
    ...defaultCompilerOptions(),
    ...safeOptions,
    noEmit: true,
  };
}

function defaultCompilerOptions(): ts.CompilerOptions {
  return {
    allowJs: false,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2023,
  };
}

function findRepoRoot(): string {
  let current = path.resolve(process.cwd());
  while (true) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not find repo root from ${process.cwd()}.`);
    }
    current = parent;
  }
}

function sourceSpan(sourceFile: ts.SourceFile, node: ts.Node): SourceSpan {
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  const startPosition = sourceFile.getLineAndCharacterOfPosition(start);
  const endPosition = sourceFile.getLineAndCharacterOfPosition(end);
  return {
    start,
    end,
    startLine: startPosition.line + 1,
    startCharacter: startPosition.character + 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

function visitSourceDeclarations(
  node: ts.Node,
  visit: (node: ts.Node, kind: SourceDeclarationKind, nameNode: ts.Node | undefined) => void,
): void {
  const declaration = declarationKind(node);
  if (declaration !== null) {
    visit(node, declaration, declarationNameNode(node));
  }
  ts.forEachChild(node, (child) => visitSourceDeclarations(child, visit));
}

function declarationKind(node: ts.Node): SourceDeclarationKind | null {
  if (ts.isClassDeclaration(node)) {
    return SourceDeclarationKind.Class;
  }
  if (ts.isInterfaceDeclaration(node)) {
    return SourceDeclarationKind.Interface;
  }
  if (ts.isFunctionDeclaration(node)) {
    return SourceDeclarationKind.Function;
  }
  if (ts.isMethodDeclaration(node)) {
    return SourceDeclarationKind.Method;
  }
  if (ts.isPropertyDeclaration(node)) {
    return SourceDeclarationKind.Property;
  }
  if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
    return SourceDeclarationKind.Accessor;
  }
  if (ts.isConstructorDeclaration(node)) {
    return SourceDeclarationKind.Constructor;
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return SourceDeclarationKind.TypeAlias;
  }
  if (ts.isEnumDeclaration(node)) {
    return SourceDeclarationKind.Enum;
  }
  if (ts.isVariableDeclaration(node)) {
    return SourceDeclarationKind.Variable;
  }
  return null;
}

function declarationNameNode(node: ts.Node): ts.Node | undefined {
  if ("name" in node) {
    const named = node as { readonly name?: ts.Node | null };
    return named.name ?? undefined;
  }
  return undefined;
}

function symbolKeyForDeclaration(
  checker: ts.TypeChecker,
  node: ts.Node,
): string | null {
  const symbol = checker.getSymbolAtLocation(node);
  if (symbol === undefined) {
    return null;
  }
  return checker.getFullyQualifiedName(symbol);
}

function sourceVersion(fileName: string): string {
  try {
    return String(statSync(fileName).mtimeMs);
  } catch {
    return "0";
  }
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => path.resolve(value)))].sort((left, right) => left.localeCompare(right));
}

function normalizeFileKey(fileName: string): string {
  return toPosixPath(path.resolve(fileName)).toLowerCase();
}
