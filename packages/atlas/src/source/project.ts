import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import {
  findRepoRoot,
  isPathWithin,
  repoPathIdentity,
  repoRelativePath,
  normalizeFileKey,
  resolveRepoPath,
  toPosixPath,
  type RepoPathIdentity,
  type RepoRelativePath,
} from "./path.js";
import { SourceProjectFileCache } from "./project-file-cache.js";
import {
  declarationNameNode,
  isExportedDeclaration,
} from "./semantic-surface/ast.js";
import { sourceSpanForNode } from "./semantic-surface/source-ranges.js";

/** Stable id for a source package admitted into the hot TypeScript world. */
export const enum SourcePackageId {
  /** The inquiry/session package itself. */
  Atlas = "atlas",
  /** Product-owned semantic runtime substrate. */
  SemanticRuntime = "semantic-runtime",
}

/** Aurelia framework package ids admitted from the in-repo framework submodule when present. */
export const AURELIA_FRAMEWORK_PACKAGE_IDS = [
  "aurelia",
  "dialog",
  "expression-parser",
  "fetch-client",
  "i18n",
  "kernel",
  "metadata",
  "platform",
  "platform-browser",
  "route-recognizer",
  "router",
  "runtime",
  "runtime-html",
  "state",
  "template-compiler",
  "ui-virtualization",
  "validation",
  "validation-html",
  "validation-i18n",
] as const;

/** Stable id for one Aurelia framework package admitted into Atlas. */
export type AureliaFrameworkPackageId =
  (typeof AURELIA_FRAMEWORK_PACKAGE_IDS)[number];

/** Prefix for public Aurelia plugin package ids admitted from the optional plugins submodule. */
export const AURELIA_PLUGIN_PACKAGE_ID_PREFIX = "aurelia2-plugin:";

/** Prefix for environment-admitted external source packages. */
export const EXTERNAL_SOURCE_PACKAGE_ID_PREFIX = "external:";

const EXTERNAL_SOURCE_ROOTS_ENV = "ATLAS_EXTERNAL_SOURCE_ROOTS";

const EXTERNAL_SOURCE_EXCLUDED_DIRECTORIES = new Set([
  ".aurelia-artifacts",
  ".git",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

const aureliaFrameworkPackageNamesByProject = new WeakMap<
  SourceProject,
  ReadonlyMap<string, string>
>();

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
  readonly id: string;
  /** Package name from package.json or the intended internal package name. */
  readonly packageName: string;
  /** Repository-relative or absolute package root. */
  readonly rootPath: string;
  /** Repository-relative or absolute tsconfig used to admit source files. */
  readonly tsconfigPath: string;
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

/** Source file identity inside the current TypeScript Program. */
export interface SourceFileIdentity extends RepoPathIdentity {
  /** Package that owns this source file, null for reachable external or library files. */
  readonly packageId: string | null;
}

/** Compiler-facing source package summary. */
export interface SourcePackageSummary {
  /** Stable package id inside the source project. */
  readonly id: string;
  /** Package name from the package definition. */
  readonly packageName: string;
  /** Repository-relative or absolute package root. */
  readonly rootPath: string;
  /** Repository-relative or absolute tsconfig used for source admission. */
  readonly tsconfigPath: string;
  /** True when this package root is outside the Atlas repository root. */
  readonly external: boolean;
  /** Number of root file names admitted from this package tsconfig. */
  readonly rootFileCount: number;
  /** Number of Program source files currently owned by this package. */
  readonly sourceFileCount: number;
  /** Number of owned implementation source files, excluding declaration files. */
  readonly implementationSourceFileCount: number;
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
  /** Number of indexed declaration rows across admitted source files. */
  readonly declarationCount: number;
  /** Number of indexed top-level declaration rows across admitted source files. */
  readonly topLevelDeclarationCount: number;
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
  /** True when this declaration has a top-level export/default modifier. */
  readonly exported: boolean;
}

/** Hot TypeScript source world shared by source, checker, and TypeChecker-driven semantic lenses. */
export class SourceProject {
  readonly #languageService: ts.LanguageService;
  readonly #program: ts.Program;
  readonly #checker: ts.TypeChecker;
  readonly #packageDefinitions: readonly ResolvedSourcePackageDefinition[];
  readonly #rootFileNames: readonly string[];
  readonly #configDiagnostics: readonly ts.Diagnostic[];
  readonly #compilerOptions: ts.CompilerOptions;
  readonly #fileCache = new SourceProjectFileCache();
  #index: SourceProjectIndex | undefined;

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
    this.#languageService = ts.createLanguageService(
      this.createLanguageServiceHost(),
    );
    this.#program = this.materializeProgram();
    this.#checker = this.#program.getTypeChecker();
    this.#index = this.createIndex(this.#program);
  }

  /** Current TypeScript Program, materialized by the LanguageService. */
  get program(): ts.Program {
    return this.#program;
  }

  /** Current TypeChecker owned by the current Program epoch. */
  get checker(): ts.TypeChecker {
    return this.#checker;
  }

  /** Current TypeScript LanguageService used for IDE-like reference machinery. */
  get languageService(): ts.LanguageService {
    return this.#languageService;
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
    const index = this.currentIndex();
    const programFiles = index.programSourceFiles;
    const ownedFiles = index.ownedSourceFiles;
    const packageSummaries = this.#packageDefinitions.map((definition) => {
      const sourceFileCount = ownedFiles.filter(
        (sourceFile) =>
          index.packageByFileKey.get(normalizeFileKey(sourceFile.fileName))
            ?.id === definition.id,
      ).length;
      const implementationSourceFileCount =
        index.ownedImplementationSourceFilesByPackage.get(definition.id)
          ?.length ?? 0;
      return {
        id: definition.id,
        packageName: definition.packageName,
        rootPath: definition.rootPath,
        tsconfigPath: definition.tsconfigPath,
        external: definition.external,
        rootFileCount: definition.rootFileNames.length,
        sourceFileCount,
        implementationSourceFileCount,
      };
    });

    return {
      snapshotKind: SourceSnapshotKind.TypeScriptLanguageService,
      identity: this.identity(),
      packageCount: this.#packageDefinitions.length,
      rootFileCount: this.#rootFileNames.length,
      programSourceFileCount: programFiles.length,
      ownedSourceFileCount: ownedFiles.length,
      declarationCount: index.declarationRows.length,
      topLevelDeclarationCount: index.topLevelDeclarationRows.length,
      configDiagnosticCount: this.#configDiagnostics.length,
      packages: packageSummaries,
    };
  }

  /** Return source files owned by admitted packages. */
  ownedSourceFiles(): readonly ts.SourceFile[] {
    return this.currentIndex().ownedSourceFiles;
  }

  /** Return source files owned by one admitted package without scanning every package file. */
  ownedSourceFilesForPackage(
    /** Stable package id to read. */
    packageId: string,
  ): readonly ts.SourceFile[] {
    return this.currentIndex().ownedSourceFilesByPackage.get(packageId) ?? [];
  }

  /** Return implementation source files owned by one admitted package without declaration files. */
  ownedImplementationSourceFilesForPackage(
    /** Stable package id to read. */
    packageId: string,
  ): readonly ts.SourceFile[] {
    return (
      this.currentIndex().ownedImplementationSourceFilesByPackage.get(packageId) ??
      []
    );
  }

  /** Read a source file by repository-relative or absolute path. */
  readSourceFile(
    /** Repository-relative or absolute file path. */
    filePath: string,
  ): ts.SourceFile | null {
    const absolutePath = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : resolveRepoPath(this.repoRoot, filePath);
    const normalized = normalizeFileKey(absolutePath);
    return this.currentIndex().sourceFileByKey.get(normalized) ?? null;
  }

  /** Read a source file by a stable source identity, failing if the identity is stale or not admitted. */
  requiredSourceFileForIdentity(
    /** Stable identity previously issued by this source project. */
    identity: SourceFileIdentity,
  ): ts.SourceFile {
    const sourceFile = this.readSourceFile(identity.absolutePath);
    if (sourceFile === null) {
      throw new Error(`Source file identity is not admitted: ${identity.absolutePath}`);
    }
    return sourceFile;
  }

  /** Return declaration rows for source files owned by admitted packages. */
  declarationRows(): readonly SourceDeclarationRow[] {
    return this.currentIndex().declarationRows;
  }

  /** Return top-level declaration rows for package export/bridge resolution. */
  topLevelDeclarationRows(): readonly SourceDeclarationRow[] {
    return this.currentIndex().topLevelDeclarationRows;
  }

  /** Return the admitted package that owns a file, or null for external/library files. */
  packageForFileName(
    /** Absolute or relative source file path. */
    fileName: string,
  ): ResolvedSourcePackageDefinition | null {
    const normalized = normalizeFileKey(fileName);
    return (
      this.currentIndex().packageByFileKey.get(normalized) ??
      packageForFileNameFromDefinitions(this.#packageDefinitions, fileName)
    );
  }

  /** Return stable file identity for a TypeScript source file in the current Program. */
  sourceFileIdentity(
    /** Source file to identify. */
    sourceFile: ts.SourceFile,
  ): SourceFileIdentity | null {
    return (
      this.currentIndex().identityByFileKey.get(
        normalizeFileKey(sourceFile.fileName),
      ) ?? null
    );
  }

  /** Return stable file identity for a TypeScript source file that must be in the current Program. */
  requiredSourceFileIdentity(
    /** Source file expected to be indexed by this source project. */
    sourceFile: ts.SourceFile,
  ): SourceFileIdentity {
    const identity = this.sourceFileIdentity(sourceFile);
    if (identity === null) {
      throw new Error(`Source file is not in the current SourceProject Program: ${sourceFile.fileName}`);
    }
    return identity;
  }

  /** Release TypeScript semantic caches held by the language service. */
  dispose(): void {
    if (process.env.ATLAS_PROFILE_SOURCE_HOST === "1") {
      console.error(
        JSON.stringify({
          event: "atlas.source.host-cache.profile",
          identity: this.identity(),
          ...this.#fileCache.profile(),
        }),
      );
    }
    this.#languageService.dispose();
  }

  private createLanguageServiceHost(): ts.LanguageServiceHost {
    return {
      getCompilationSettings: () => this.#compilerOptions,
      getScriptFileNames: () => [...this.#rootFileNames],
      getScriptVersion: (fileName) => this.#fileCache.scriptVersion(fileName),
      getScriptSnapshot: (fileName) => this.#fileCache.scriptSnapshot(fileName),
      getCurrentDirectory: () => this.repoRoot,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      readFile: (fileName) => this.#fileCache.readFile(fileName),
      fileExists: (fileName) => this.#fileCache.fileExists(fileName),
      directoryExists: (directoryName) =>
        this.#fileCache.directoryExists(directoryName),
      readDirectory: (
        rootDir,
        extensions,
        excludes,
        includes,
        depth,
      ) =>
        this.#fileCache.readDirectory(
          rootDir,
          extensions,
          excludes,
          includes,
          depth,
        ),
      getDirectories: (directoryName) =>
        this.#fileCache.getDirectories(directoryName),
      realpath:
        ts.sys.realpath === undefined
          ? undefined
          : (fileName) => this.#fileCache.realpath(fileName),
    };
  }

  private identity(): string {
    const localPackageCount = this.#packageDefinitions.filter((definition) =>
      definition.id === SourcePackageId.Atlas ||
      definition.id === SourcePackageId.SemanticRuntime
    ).length;
    const frameworkPackageCount = this.#packageDefinitions.filter((definition) =>
      (AURELIA_FRAMEWORK_PACKAGE_IDS as readonly string[]).includes(definition.id)
    ).length;
    const publicPluginPackageCount = this.#packageDefinitions.filter((definition) =>
      definition.id.startsWith(AURELIA_PLUGIN_PACKAGE_ID_PREFIX)
    ).length;
    const externalPackageCount = this.#packageDefinitions.filter((definition) =>
      definition.id.startsWith(EXTERNAL_SOURCE_PACKAGE_ID_PREFIX)
    ).length;
    const otherPackageCount =
      this.#packageDefinitions.length -
      localPackageCount -
      frameworkPackageCount -
      publicPluginPackageCount -
      externalPackageCount;
    return [
      "working-tree",
      `packages=${this.#packageDefinitions.length}`,
      `local=${localPackageCount}`,
      `framework=${frameworkPackageCount}`,
      `public-plugin=${publicPluginPackageCount}`,
      `external=${externalPackageCount}`,
      `other=${otherPackageCount}`,
    ].join(";");
  }

  private currentIndex(): SourceProjectIndex {
    if (this.#index !== undefined) {
      return this.#index;
    }
    const program = this.#program;
    this.#index = this.createIndex(program);
    return this.#index;
  }

  private materializeProgram(): ts.Program {
    const program = this.#languageService.getProgram();
    if (program === undefined) {
      throw new Error(
        "Source project could not materialize a TypeScript Program.",
      );
    }
    return program;
  }

  private createIndex(program: ts.Program): SourceProjectIndex {
    const checker = program.getTypeChecker();
    const programSourceFiles = program.getSourceFiles();
    const sourceFileByKey = new Map<string, ts.SourceFile>();
    const packageByFileKey = new Map<string, ResolvedSourcePackageDefinition>();
    const identityByFileKey = new Map<string, SourceFileIdentity>();
    const ownedSourceFiles: ts.SourceFile[] = [];
    const ownedSourceFilesByPackage = new Map<string, ts.SourceFile[]>();
    const ownedImplementationSourceFilesByPackage = new Map<
      string,
      ts.SourceFile[]
    >();
    const declarationRows: SourceDeclarationRow[] = [];
    const topLevelDeclarationRows: SourceDeclarationRow[] = [];

    for (const sourceFile of programSourceFiles) {
      const fileKey = normalizeFileKey(sourceFile.fileName);
      sourceFileByKey.set(fileKey, sourceFile);
      const packageDefinition = packageForFileNameFromDefinitions(
        this.#packageDefinitions,
        sourceFile.fileName,
      );
      const identity = sourceFileIdentityFor(
        this.repoRoot,
        sourceFile.fileName,
        packageDefinition?.id ?? null,
      );
      identityByFileKey.set(fileKey, identity);
      if (packageDefinition === null) {
        continue;
      }
      packageByFileKey.set(fileKey, packageDefinition);
      ownedSourceFiles.push(sourceFile);
      let packageFiles = ownedSourceFilesByPackage.get(packageDefinition.id);
      if (packageFiles === undefined) {
        packageFiles = [];
        ownedSourceFilesByPackage.set(packageDefinition.id, packageFiles);
      }
      packageFiles.push(sourceFile);
      if (!sourceFile.isDeclarationFile) {
        let implementationPackageFiles =
          ownedImplementationSourceFilesByPackage.get(packageDefinition.id);
        if (implementationPackageFiles === undefined) {
          implementationPackageFiles = [];
          ownedImplementationSourceFilesByPackage.set(
            packageDefinition.id,
            implementationPackageFiles,
          );
        }
        implementationPackageFiles.push(sourceFile);
      }

      visitSourceDeclarations(sourceFile, (node, kind, nameNode) => {
        declarationRows.push(
          declarationRowFor(
            checker,
            sourceFile,
            identity,
            node,
            kind,
            nameNode,
          ),
        );
      });
      for (const node of topLevelSourceDeclarations(sourceFile)) {
        const kind = sourceDeclarationKindForNode(node);
        if (kind === null) {
          continue;
        }
        topLevelDeclarationRows.push(
          declarationRowFor(
            checker,
            sourceFile,
            identity,
            node,
            kind,
            declarationNameNode(node),
          ),
        );
      }
    }

    ownedSourceFiles.sort((left, right) =>
      left.fileName.localeCompare(right.fileName),
    );
    for (const packageFiles of ownedSourceFilesByPackage.values()) {
      packageFiles.sort((left, right) =>
        left.fileName.localeCompare(right.fileName),
      );
    }
    for (const packageFiles of ownedImplementationSourceFilesByPackage.values()) {
      packageFiles.sort((left, right) =>
        left.fileName.localeCompare(right.fileName),
      );
    }
    declarationRows.sort(compareDeclarationRows);
    topLevelDeclarationRows.sort(compareDeclarationRows);

    return {
      program,
      programSourceFiles,
      ownedSourceFiles,
      ownedSourceFilesByPackage,
      ownedImplementationSourceFilesByPackage,
      sourceFileByKey,
      packageByFileKey,
      identityByFileKey,
      declarationRows,
      topLevelDeclarationRows,
    };
  }
}

interface SourceProjectIndex {
  readonly program: ts.Program;
  readonly programSourceFiles: readonly ts.SourceFile[];
  readonly ownedSourceFiles: readonly ts.SourceFile[];
  readonly ownedSourceFilesByPackage: ReadonlyMap<string, readonly ts.SourceFile[]>;
  readonly ownedImplementationSourceFilesByPackage: ReadonlyMap<
    string,
    readonly ts.SourceFile[]
  >;
  readonly sourceFileByKey: ReadonlyMap<string, ts.SourceFile>;
  readonly packageByFileKey: ReadonlyMap<
    string,
    ResolvedSourcePackageDefinition
  >;
  readonly identityByFileKey: ReadonlyMap<string, SourceFileIdentity>;
  readonly declarationRows: readonly SourceDeclarationRow[];
  readonly topLevelDeclarationRows: readonly SourceDeclarationRow[];
}

/** Create the default source project over the internal inquiry and semantic-runtime packages. */
export function createSourceProject(
  /** Optional source project construction options. */
  options: SourceProjectOptions = {},
): SourceProject {
  const repoRoot = path.resolve(options.repoRoot ?? findRepoRoot());
  const packages =
    options.packages ?? defaultSourcePackageDefinitions(repoRoot);
  const resolvedPackages = packages.map((definition) =>
    resolveSourcePackageDefinition(repoRoot, definition),
  );
  const packageConfigs = resolvedPackages.map((definition) =>
    readPackageConfig(definition),
  );
  const rootFileNames = uniqueSortedResolvedPaths(
    packageConfigs.flatMap((config) => config.rootFileNames),
  );
  const configDiagnostics = packageConfigs.flatMap(
    (config) => config.diagnostics,
  );
  const compilerOptions = compilerOptionsForProject(packageConfigs);
  const packagesWithRoots = resolvedPackages.map((definition, index) => ({
    ...definition,
    rootFileNames: packageConfigs[index]?.rootFileNames ?? [],
  }));
  return new SourceProject(
    repoRoot,
    packagesWithRoots,
    rootFileNames,
    compilerOptions,
    configDiagnostics,
  );
}

/** Return admitted Aurelia framework package ids and package names for this source project. */
export function readAureliaFrameworkPackageNames(
  /** Hot source project that owns the current Program epoch. */
  sourceProject: SourceProject,
): ReadonlyMap<string, string> {
  const cached = aureliaFrameworkPackageNamesByProject.get(sourceProject);
  if (cached !== undefined) {
    return cached;
  }
  const admitted = new Set<string>(AURELIA_FRAMEWORK_PACKAGE_IDS);
  const packageNames = new Map(
    sourceProject
      .snapshot()
      .summary.packages.filter((entry) => admitted.has(entry.id))
      .map((entry) => [entry.id, entry.packageName]),
  );
  aureliaFrameworkPackageNamesByProject.set(sourceProject, packageNames);
  return packageNames;
}

/** Return the default source packages Atlas should keep hot for this repo. */
export function defaultSourcePackageDefinitions(
  /** Absolute repository root used to discover the framework submodule. */
  repoRoot: string = findRepoRoot(),
): readonly SourcePackageDefinition[] {
  const localPackages: readonly SourcePackageDefinition[] = [
    {
      id: SourcePackageId.Atlas,
      packageName: "@aurelia-ls/atlas",
      rootPath: "packages/atlas",
      tsconfigPath: "packages/atlas/tsconfig.json",
    },
    {
      id: SourcePackageId.SemanticRuntime,
      packageName: "@aurelia-ls/semantic-runtime",
      rootPath: "packages/semantic-runtime",
      tsconfigPath: "packages/semantic-runtime/tsconfig.json",
    },
  ];
  return [
    ...localPackages,
    ...defaultAureliaFrameworkPackageDefinitions(repoRoot),
    ...defaultAureliaPluginPackageDefinitions(repoRoot),
    ...defaultExternalSourcePackageDefinitions(repoRoot),
  ];
}

interface ResolvedSourcePackageDefinition extends SourcePackageDefinition {
  readonly rootAbsolutePath: string;
  readonly rootFileKey: string;
  readonly tsconfigAbsolutePath: string;
  readonly rootFileNames: readonly string[];
  readonly external: boolean;
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
  const rootAbsolutePath = resolveSourcePath(repoRoot, definition.rootPath);
  const tsconfigAbsolutePath = resolveSourcePath(
    repoRoot,
    definition.tsconfigPath,
  );
  return {
    ...definition,
    rootAbsolutePath,
    rootFileKey: normalizeFileKey(rootAbsolutePath),
    tsconfigAbsolutePath,
    rootFileNames: [],
    external: repoRelativePath(repoRoot, rootAbsolutePath) === null,
  };
}

function readPackageConfig(
  definition: ResolvedSourcePackageDefinition,
): ReadPackageConfigResult {
  const read = ts.readConfigFile(
    definition.tsconfigAbsolutePath,
    ts.sys.readFile,
  );
  if (read.error !== undefined) {
    return {
      rootFileNames: [],
      options: defaultCompilerOptions(),
      diagnostics: [read.error],
    };
  }
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(definition.tsconfigAbsolutePath),
  );
  const rootFileNames = parsed.fileNames
    .map((fileName) => path.resolve(fileName))
    .filter((fileName) => isPathWithin(fileName, definition.rootAbsolutePath))
    .sort((left, right) => left.localeCompare(right));
  return {
    rootFileNames,
    options: parsed.options,
    diagnostics: parsed.errors,
  };
}

function packageForFileNameFromDefinitions(
  definitions: readonly ResolvedSourcePackageDefinition[],
  fileName: string,
): ResolvedSourcePackageDefinition | null {
  const normalized = normalizeFileKey(fileName);
  let match: ResolvedSourcePackageDefinition | null = null;
  for (const definition of definitions) {
    if (
      normalized !== definition.rootFileKey &&
      !normalized.startsWith(`${definition.rootFileKey}/`)
    ) {
      continue;
    }
    if (match === null || definition.rootFileKey.length > match.rootFileKey.length) {
      match = definition;
    }
  }
  return match;
}

function sourceFileIdentityFor(
  repoRoot: string,
  fileName: string,
  packageId: string | null,
): SourceFileIdentity {
  const identity = repoPathIdentity(repoRoot, fileName);
  if (identity !== null) {
    return {
      ...identity,
      packageId,
    };
  }
  return {
    absolutePath: path.resolve(fileName),
    repoPath: toPosixPath(path.resolve(fileName)) as RepoRelativePath,
    packageId,
  };
}

function declarationRowFor(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  node: ts.Node,
  kind: SourceDeclarationKind,
  nameNode: ts.Node | undefined,
): SourceDeclarationRow {
  return {
    kind,
    name: nameNode?.getText(sourceFile) ?? null,
    file,
    span: sourceSpanForNode(sourceFile, node),
    symbolKey: symbolKeyForDeclaration(checker, nameNode ?? node),
    exported: isExportedDeclaration(node),
  };
}

function topLevelSourceDeclarations(
  sourceFile: ts.SourceFile,
): readonly ts.Node[] {
  const declarations: ts.Node[] = [];
  for (const statement of sourceFile.statements) {
    if (sourceDeclarationKindForNode(statement) !== null) {
      declarations.push(statement);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      declarations.push(...statement.declarationList.declarations);
    }
  }
  return declarations;
}

function defaultAureliaFrameworkPackageDefinitions(
  repoRoot: string,
): readonly SourcePackageDefinition[] {
  const frameworkRoot = findAureliaFrameworkRootSourcePath(repoRoot);
  if (frameworkRoot === null) {
    return [];
  }
  return AURELIA_FRAMEWORK_PACKAGE_IDS.map((id) => ({
    id,
    packageName: id === "aurelia" ? "aurelia" : `@aurelia/${id}`,
    rootPath: path.posix.join(frameworkRoot, "packages", id),
    tsconfigPath: path.posix.join(
      frameworkRoot,
      "packages",
      id,
      "tsconfig.json",
    ),
  }));
}

function findAureliaFrameworkRootSourcePath(repoRoot: string): string | null {
  const configured = process.env.ATLAS_AURELIA_FRAMEWORK_ROOT;
  if (configured !== undefined && configured.length > 0) {
    return frameworkRootSourcePathIfPresent(repoRoot, configured);
  }
  return frameworkRootSourcePathIfPresent(repoRoot, "aurelia");
}

function frameworkRootSourcePathIfPresent(
  repoRoot: string,
  sourcePath: string,
): string | null {
  const absolutePath = resolveSourcePath(repoRoot, sourcePath);
  if (
    !existsSync(path.join(absolutePath, "packages", "kernel", "tsconfig.json"))
  ) {
    return null;
  }
  return repoRelativePath(repoRoot, absolutePath) ?? absolutePath;
}

function defaultAureliaPluginPackageDefinitions(
  repoRoot: string,
): readonly SourcePackageDefinition[] {
  const pluginRoot = findAureliaPluginRootSourcePath(repoRoot);
  if (pluginRoot === null) {
    return [];
  }
  const packagesRoot = resolveSourcePath(
    repoRoot,
    path.posix.join(pluginRoot, "packages"),
  );
  const packageDirs = safeReadDirectory(packagesRoot)
    .filter((entry) =>
      existsSync(path.join(packagesRoot, entry, "tsconfig.json")),
    )
    .sort((left, right) => left.localeCompare(right));

  return packageDirs.map((dir) => {
    const rootPath = path.posix.join(pluginRoot, "packages", dir);
    return {
      id: `${AURELIA_PLUGIN_PACKAGE_ID_PREFIX}${dir}`,
      packageName:
        readPackageName(path.join(packagesRoot, dir, "package.json")) ?? dir,
      rootPath,
      tsconfigPath: path.posix.join(rootPath, "tsconfig.json"),
    };
  });
}

function findAureliaPluginRootSourcePath(repoRoot: string): string | null {
  const configured = process.env.ATLAS_AURELIA_PLUGIN_ROOT;
  if (configured !== undefined && configured.length > 0) {
    return pluginRootSourcePathIfPresent(repoRoot, configured);
  }
  return pluginRootSourcePathIfPresent(repoRoot, "aurelia2-plugins");
}

function pluginRootSourcePathIfPresent(
  repoRoot: string,
  sourcePath: string,
): string | null {
  const absolutePath = resolveSourcePath(repoRoot, sourcePath);
  if (!existsSync(path.join(absolutePath, "packages"))) {
    return null;
  }
  return repoRelativePath(repoRoot, absolutePath) ?? absolutePath;
}

function defaultExternalSourcePackageDefinitions(
  repoRoot: string,
): readonly SourcePackageDefinition[] {
  const roots = configuredExternalSourceRoots(repoRoot);
  return roots.flatMap((root, index) =>
    discoverExternalSourcePackageDefinitions(repoRoot, root, index),
  );
}

function configuredExternalSourceRoots(repoRoot: string): readonly string[] {
  const configured = process.env[EXTERNAL_SOURCE_ROOTS_ENV];
  if (configured === undefined || configured.trim().length === 0) {
    return [];
  }
  return parseExternalSourceRoots(configured)
    .map((entry) => resolveSourcePath(repoRoot, entry))
    .filter((entry, index, entries) => existsSync(entry) && entries.indexOf(entry) === index);
}

function parseExternalSourceRoots(configured: string): readonly string[] {
  const trimmed = configured.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === "string")
        : [];
    } catch {
      return [];
    }
  }
  return trimmed
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function discoverExternalSourcePackageDefinitions(
  repoRoot: string,
  externalRoot: string,
  rootIndex: number,
): readonly SourcePackageDefinition[] {
  const packageRoots = discoverPackageRoots(externalRoot);
  return packageRoots.map((packageRoot, packageIndex) => {
    const packageName =
      readPackageName(path.join(packageRoot, "package.json")) ??
      path.basename(packageRoot);
    const id = `${EXTERNAL_SOURCE_PACKAGE_ID_PREFIX}${rootIndex}:${packageIndex}:${sourcePackageIdSlug(packageName)}`;
    return {
      id,
      packageName,
      rootPath: repoRelativePath(repoRoot, packageRoot) ?? packageRoot,
      tsconfigPath:
        repoRelativePath(repoRoot, path.join(packageRoot, "tsconfig.json")) ??
        path.join(packageRoot, "tsconfig.json"),
    };
  });
}

function discoverPackageRoots(
  root: string,
): readonly string[] {
  const roots: string[] = [];
  const visit = (directory: string, depth: number): void => {
    if (depth > 6) {
      return;
    }
    if (
      existsSync(path.join(directory, "package.json")) &&
      existsSync(path.join(directory, "tsconfig.json"))
    ) {
      roots.push(directory);
    }
    for (const entry of safeReadDirectory(directory)) {
      if (
        entry.startsWith(".") ||
        EXTERNAL_SOURCE_EXCLUDED_DIRECTORIES.has(entry)
      ) {
        continue;
      }
      visit(path.join(directory, entry), depth + 1);
    }
  };
  visit(root, 0);
  return roots.sort((left, right) => left.localeCompare(right));
}

function sourcePackageIdSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "package";
}

function resolveSourcePath(repoRoot: string, sourcePath: string): string {
  return path.isAbsolute(sourcePath)
    ? path.resolve(sourcePath)
    : resolveRepoPath(repoRoot, sourcePath);
}

function safeReadDirectory(dir: string): readonly string[] {
  try {
    return readdirSync(dir).filter((entry) =>
      statSync(path.join(dir, entry)).isDirectory(),
    );
  } catch {
    return [];
  }
}

function readPackageName(packageJsonPath: string): string | null {
  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      readonly name?: unknown;
    };
    return typeof parsed.name === "string" ? parsed.name : null;
  } catch {
    return null;
  }
}

function compilerOptionsForProject(
  configs: readonly ReadPackageConfigResult[],
): ts.CompilerOptions {
  const firstOptions =
    configs.find((config) => Object.keys(config.options).length > 0)?.options ??
    {};
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

function visitSourceDeclarations(
  node: ts.Node,
  visit: (
    node: ts.Node,
    kind: SourceDeclarationKind,
    nameNode: ts.Node | undefined,
  ) => void,
): void {
  const declaration = sourceDeclarationKindForNode(node);
  if (declaration !== null) {
    visit(node, declaration, declarationNameNode(node));
  }
  ts.forEachChild(node, (child) => visitSourceDeclarations(child, visit));
}

export function sourceDeclarationKindForNode(node: ts.Node): SourceDeclarationKind | null {
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

function uniqueSortedResolvedPaths(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => path.resolve(value)))].sort(
    (left, right) => left.localeCompare(right),
  );
}

function compareDeclarationRows(
  left: SourceDeclarationRow,
  right: SourceDeclarationRow,
): number {
  return (
    left.file.repoPath.localeCompare(right.file.repoPath) ||
    left.span.start - right.span.start ||
    left.kind.localeCompare(right.kind) ||
    (left.name ?? "").localeCompare(right.name ?? "")
  );
}
