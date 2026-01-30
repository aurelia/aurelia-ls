import path from "node:path";
import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { Logger } from "@aurelia-ls/compiler";
import type { PathUtils } from "./paths.js";

export const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  allowJs: true,
  checkJs: false,
  skipLibCheck: true,
  resolveJsonModule: true,
  noEmit: true,
  verbatimModuleSyntax: true,
  allowImportingTsExtensions: true,
  types: [],
};

export interface TsConfigSnapshot {
  readonly options: ts.CompilerOptions;
  readonly rootFileNames: NormalizedPath[];
  readonly configPath: NormalizedPath | null;
}

export interface TsConfigLoadOptions {
  readonly workspaceRoot?: string | null;
  readonly tsconfigPath?: string | null;
  readonly configFileName?: string;
  readonly logger: Logger;
  readonly paths: PathUtils;
}

export function applyDefaultCompilerOptions(options: ts.CompilerOptions): ts.CompilerOptions {
  const types = Array.isArray(options.types) ? options.types : DEFAULT_COMPILER_OPTIONS.types;
  const merged: ts.CompilerOptions = {
    ...DEFAULT_COMPILER_OPTIONS,
    ...options,
    noEmit: true,
  };
  if (types !== undefined) merged.types = types;
  return merged;
}

export function loadTsConfig(options: TsConfigLoadOptions): TsConfigSnapshot {
  const searchRoot = options.workspaceRoot ?? process.cwd();
  const configPath = resolveConfigPath(searchRoot, options.tsconfigPath ?? null, options.configFileName);
  if (!configPath) {
    options.logger.warn(`[ts] no tsconfig found under ${searchRoot}; using defaults`);
    return { options: applyDefaultCompilerOptions({}), rootFileNames: [], configPath: null };
  }

  const read = ts.readConfigFile(configPath, (file) => ts.sys.readFile(file));
  if (read.error) {
    const message = ts.flattenDiagnosticMessageText(read.error.messageText, " ");
    options.logger.error(`[ts] failed to read tsconfig at ${configPath}: ${message}`);
    return {
      options: applyDefaultCompilerOptions({}),
      rootFileNames: [],
      configPath: options.paths.canonical(configPath),
    };
  }

  const parseHost: ts.ParseConfigHost = {
    fileExists: (p) => ts.sys.fileExists(p),
    readFile: (p) => ts.sys.readFile(p),
    readDirectory: (p, extensions, excludes, includes, depth) =>
      ts.sys.readDirectory(p, extensions, excludes, includes, depth),
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames ?? false,
  };

  const parsed = ts.parseJsonConfigFileContent(read.config ?? {}, parseHost, path.dirname(configPath), undefined, configPath);
  if (parsed.errors?.length) {
    const messages = parsed.errors
      .map((e) => ts.flattenDiagnosticMessageText(e.messageText, " "))
      .filter(Boolean)
      .join("; ");
    options.logger.warn(`[ts] tsconfig parse errors: ${messages}`);
  }

  const compilerOptions = applyDefaultCompilerOptions(parsed.options ?? {});
  const rootFileNames = parsed.fileNames.map((file) => options.paths.canonical(file));
  return {
    options: compilerOptions,
    rootFileNames,
    configPath: options.paths.canonical(configPath),
  };
}

function resolveConfigPath(searchRoot: string, explicit: string | null, configFileName?: string): string | null {
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.join(searchRoot, explicit);
  }
  return ts.findConfigFile(searchRoot, (file) => ts.sys.fileExists(file), configFileName ?? "tsconfig.json") ?? null;
}
