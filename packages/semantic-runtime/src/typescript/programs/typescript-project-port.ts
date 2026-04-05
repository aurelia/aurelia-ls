import path from "node:path";
import * as ts from "typescript";

export interface TypeScriptProjectSeed {
  readonly files?: Readonly<Record<string, string>>;
  readonly projectRoot?: string;
  readonly tsconfigPath?: string;
  readonly compilerOptions?: ts.CompilerOptions;
  readonly generation?: number;
}

export class TypeScriptProjectGeneration {
  public readonly checker: ts.TypeChecker;

  public constructor(
    public readonly generation: number,
    public readonly languageService: ts.LanguageService,
    public readonly program: ts.Program,
    public readonly projectRoot?: string,
    public readonly configPath?: string
  ) {
    this.checker = program.getTypeChecker();
  }

  public listSemanticSourceFiles(): readonly ts.SourceFile[] {
    return this.program.getSourceFiles().filter(
      (sourceFile) => !sourceFile.isDeclarationFile && !isTypeScriptLibraryFile(sourceFile.fileName)
    );
  }
}

export class TypeScriptProjectPort {
  readonly #generation: number;
  readonly #languageService?: ts.LanguageService;
  readonly #projectRoot?: string;
  readonly #configPath?: string;

  public constructor(seed: TypeScriptProjectSeed = EMPTY_TYPESCRIPT_PROJECT_SEED) {
    this.#generation = seed.generation ?? 0;

    const fileEntries = seed.files === undefined
      ? []
      : Object.entries(seed.files);
    const configuredProject = loadConfiguredProject(seed);
    const configuredFiles = configuredProject?.fileNames ?? [];
    const allFiles = new Set([
      ...configuredFiles,
      ...fileEntries.map(([fileName]) => fileName)
    ]);

    if (allFiles.size === 0) {
      return;
    }

    this.#projectRoot = configuredProject?.projectRoot ?? seed.projectRoot;
    this.#configPath = configuredProject?.configPath ?? seed.tsconfigPath;

    const textByFile = new Map(fileEntries);
    const versionByFile = new Map(
      Array.from(allFiles, (fileName) => [fileName, "0"] as const)
    );
    const compilerOptions = {
      ...DEFAULT_COMPILER_OPTIONS,
      ...configuredProject?.compilerOptions,
      ...seed.compilerOptions
    };

    const host: ts.LanguageServiceHost = {
      getCompilationSettings: () => compilerOptions,
      getCurrentDirectory: () => this.#projectRoot ?? "/",
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      getScriptFileNames: () => Array.from(allFiles),
      getScriptSnapshot: (fileName) => {
        const text = textByFile.get(fileName) ?? ts.sys.readFile(fileName);
        return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
      },
      getScriptVersion: (fileName) => versionByFile.get(fileName) ?? "0",
      readFile: (fileName) => textByFile.get(fileName) ?? ts.sys.readFile(fileName),
      fileExists: (fileName) => textByFile.has(fileName) || ts.sys.fileExists(fileName),
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories
    };

    this.#languageService = ts.createLanguageService(host);
  }

  public publishCurrentGeneration(): TypeScriptProjectGeneration | undefined {
    if (this.#languageService === undefined) {
      return undefined;
    }

    const program = this.#languageService.getProgram();
    if (program === undefined) {
      return undefined;
    }

    return new TypeScriptProjectGeneration(
      this.#generation,
      this.#languageService,
      program,
      this.#projectRoot,
      this.#configPath
    );
  }
}

const DEFAULT_COMPILER_OPTIONS = {
  strict: true,
  target: ts.ScriptTarget.ES2023,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  experimentalDecorators: true
} as const satisfies ts.CompilerOptions;

const EMPTY_TYPESCRIPT_PROJECT_SEED: TypeScriptProjectSeed = {};

function loadConfiguredProject(
  seed: TypeScriptProjectSeed
): {
  readonly configPath: string;
  readonly projectRoot: string;
  readonly fileNames: readonly string[];
  readonly compilerOptions: ts.CompilerOptions;
} | undefined {
  const configPath = resolveConfigPath(seed);
  if (configPath === undefined || !ts.sys.fileExists(configPath)) {
    return undefined;
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error !== undefined) {
    throw new Error(formatDiagnostic(configFile.error));
  }

  const projectRoot = path.dirname(configPath);
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    projectRoot,
    undefined,
    configPath
  );
  if (parsedConfig.errors.length > 0) {
    throw new Error(parsedConfig.errors.map(formatDiagnostic).join("\n"));
  }

  return {
    configPath,
    projectRoot,
    fileNames: parsedConfig.fileNames,
    compilerOptions: parsedConfig.options
  };
}

function resolveConfigPath(seed: TypeScriptProjectSeed): string | undefined {
  if (seed.tsconfigPath !== undefined) {
    return seed.tsconfigPath;
  }

  if (seed.projectRoot !== undefined) {
    return path.join(seed.projectRoot, "tsconfig.json");
  }

  return undefined;
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

function isTypeScriptLibraryFile(fileName: string): boolean {
  return fileName.includes("/node_modules/typescript/lib/") ||
    fileName.includes("\\node_modules\\typescript\\lib\\");
}
