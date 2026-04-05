import * as ts from "typescript";

export interface TypeScriptProjectSeed {
  readonly files?: Readonly<Record<string, string>>;
  readonly compilerOptions?: ts.CompilerOptions;
  readonly generation?: number;
}

export class TypeScriptProjectGeneration {
  public readonly checker: ts.TypeChecker;

  public constructor(
    public readonly generation: number,
    public readonly languageService: ts.LanguageService,
    public readonly program: ts.Program
  ) {
    this.checker = program.getTypeChecker();
  }
}

export class TypeScriptProjectPort {
  readonly #generation: number;
  readonly #languageService?: ts.LanguageService;

  public constructor(seed: TypeScriptProjectSeed = EMPTY_TYPESCRIPT_PROJECT_SEED) {
    this.#generation = seed.generation ?? 0;

    const files = seed.files === undefined
      ? []
      : Object.entries(seed.files);

    if (files.length === 0) {
      return;
    }

    const textByFile = new Map(files);
    const versionByFile = new Map(files.map(([fileName]) => [fileName, "0"] as const));
    const compilerOptions = {
      ...DEFAULT_COMPILER_OPTIONS,
      ...seed.compilerOptions
    };

    const host: ts.LanguageServiceHost = {
      getCompilationSettings: () => compilerOptions,
      getCurrentDirectory: () => "/",
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      getScriptFileNames: () => files.map(([fileName]) => fileName),
      getScriptSnapshot: (fileName) => {
        const text = textByFile.get(fileName);
        return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
      },
      getScriptVersion: (fileName) => versionByFile.get(fileName) ?? "0",
      readFile: (fileName) => textByFile.get(fileName),
      fileExists: (fileName) => textByFile.has(fileName) || ts.sys.fileExists(fileName)
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
      program
    );
  }
}

const DEFAULT_COMPILER_OPTIONS = {
  strict: true,
  target: ts.ScriptTarget.ES2023,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext
} as const satisfies ts.CompilerOptions;

const EMPTY_TYPESCRIPT_PROJECT_SEED: TypeScriptProjectSeed = {};
