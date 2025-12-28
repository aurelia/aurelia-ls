import * as fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { Logger } from "./types.js";
import type { OverlayFs } from "./overlay-fs.js";
import type { PathUtils } from "./paths.js";

const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
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

export interface TsServiceConfig {
  readonly workspaceRoot?: string | null;
  readonly tsconfigPath?: string | null;
  readonly configFileName?: string;
}

interface TsConfigSnapshot {
  readonly options: ts.CompilerOptions;
  readonly rootFileNames: NormalizedPath[];
  readonly configPath: NormalizedPath | null;
}

export class TsService {
  #overlay: OverlayFs;
  #paths: PathUtils;
  #logger: Logger;
  #workspaceRoot: string | null = null;
  #projectVersion = 1;
  #service: ts.LanguageService;
  #compilerOptions: ts.CompilerOptions;
  #rootFileNames: NormalizedPath[] = [];
  #configPath: NormalizedPath | null = null;
  #configFingerprint: string;

  constructor(overlay: OverlayFs, paths: PathUtils, logger: Logger) {
    this.#overlay = overlay;
    this.#paths = paths;
    this.#logger = logger;
    this.#compilerOptions = this.#withDefaults({});
    this.#configFingerprint = this.#fingerprint(this.#compilerOptions, this.#rootFileNames, this.#configPath);
    this.#overlay.setBaseRoots(this.#rootFileNames);
    this.#service = ts.createLanguageService(this.#createHost());
  }

  configure(options: TsServiceConfig = {}): void {
    const resolvedRoot = options.workspaceRoot ? path.resolve(options.workspaceRoot) : this.#workspaceRoot;
    const snapshot = this.#loadConfig(resolvedRoot ?? null, options.tsconfigPath ?? null, options.configFileName);
    const fingerprint = this.#fingerprint(snapshot.options, snapshot.rootFileNames, snapshot.configPath);
    if (fingerprint === this.#configFingerprint && resolvedRoot === this.#workspaceRoot) {
      return;
    }

    this.#workspaceRoot = resolvedRoot ?? null;
    this.#compilerOptions = snapshot.options;
    this.#rootFileNames = snapshot.rootFileNames;
    this.#configPath = snapshot.configPath;
    this.#configFingerprint = fingerprint;
    this.#overlay.setBaseRoots(this.#rootFileNames);
    this.#projectVersion++;
    this.#recreate();

    const label = snapshot.configPath ?? "<defaults>";
    this.#logger.info(`[ts] configured root=${this.#workspaceRoot ?? "<cwd>"} config=${label} version=${this.#projectVersion}`);
  }

  compilerOptions(): ts.CompilerOptions {
    return this.#compilerOptions;
  }

  getRootFileNames(): readonly NormalizedPath[] {
    return this.#rootFileNames;
  }

  upsertOverlay(fileAbs: string, text: string): void {
    const canonical = this.#paths.canonical(fileAbs);
    this.#overlay.upsert(canonical, text);
    this.#projectVersion++;
    this.#recreate();
    this.#logger.log(`[ts] overlay updated: ${canonical} (version=${this.#projectVersion})`);
  }

  deleteOverlay(fileAbs: string): void {
    const canonical = this.#paths.canonical(fileAbs);
    this.#overlay.delete(canonical);
    this.#projectVersion++;
    this.#recreate();
    this.#logger.log(`[ts] overlay removed: ${canonical} (version=${this.#projectVersion})`);
  }

  ensurePrelude(preludePath: string, text: string): void {
    if (this.#overlay.has(preludePath)) return;
    this.upsertOverlay(preludePath, text);
  }

  getService(): ts.LanguageService {
    return this.#service;
  }

  getProjectVersion(): number {
    return this.#projectVersion;
  }

  forceOverlaySourceFile(overlayPath: string): ts.SourceFile | undefined {
    const target = this.#paths.canonical(overlayPath);
    try {
      void this.#service.getSyntacticDiagnostics(target);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.#logger.error(`getSyntacticDiagnostics threw: ${message}`);
    }
    const program = this.#service.getProgram();
    return program?.getSourceFile(target);
  }

  tsSpanToRange(
    fileName: string,
    start: number,
    length: number,
  ): { start: { line: number; character: number }; end: { line: number; character: number } } | null {
    const sf = this.#service.getProgram()?.getSourceFile(fileName);
    if (!sf) return null;
    const a = ts.getLineAndCharacterOfPosition(sf, start);
    const b = ts.getLineAndCharacterOfPosition(sf, start + length);
    return { start: { line: a.line, character: a.character }, end: { line: b.line, character: b.character } };
  }

  #recreate(): void {
    try {
      this.#service.dispose();
    } catch {}
    this.#service = ts.createLanguageService(this.#createHost());
    this.#logger.log(`[ts] language service recreated (projectVersion=${this.#projectVersion})`);
  }

  #createHost(): ts.LanguageServiceHost {
    const paths = this.#paths;
    const overlay = this.#overlay;
    const logger = this.#logger;
    const getCwd = () => this.#workspaceRoot ?? process.cwd();

    return {
      getCompilationSettings: () => this.#compilerOptions,
      getCurrentDirectory: getCwd,
      getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
      getProjectVersion: () => String(this.#projectVersion),
      useCaseSensitiveFileNames: () => paths.isCaseSensitive(),

      getScriptFileNames: () => overlay.listScriptRoots(),
      getScriptVersion: (f) => overlay.snapshot(f)?.version.toString() ?? "0",

      getScriptSnapshot: (f) => {
        const snap = overlay.snapshot(f);
        if (snap) {
          logger.log(`[host] snapshot overlay: ${f}`);
          return ts.ScriptSnapshot.fromString(snap.text);
        }
        try {
          if (fs.existsSync(f)) {
            logger.log(`[host] snapshot disk: ${f}`);
            return ts.ScriptSnapshot.fromString(fs.readFileSync(f, "utf8"));
          }
        } catch {}
        logger.warn(`[host] snapshot miss: ${f}`);
        return undefined;
      },

      fileExists: (f) => overlay.fileExists(f),
      readFile: (f) => overlay.readFile(f),
      readDirectory: (p, extensions, excludes, includes, depth) => ts.sys.readDirectory(p, extensions, excludes, includes, depth),
      directoryExists: (p) => ts.sys.directoryExists(p),
      getDirectories: (p) => ts.sys.getDirectories(p),
      realpath: (p) => (overlay.has(p) ? p : ts.sys.realpath ? ts.sys.realpath(p) : p),

      resolveModuleNameLiterals: (lits, containingFile, _redirected, options) => {
        const modHost: ts.ModuleResolutionHost = {
          fileExists: (f) => overlay.fileExists(f),
          readFile: (f) => overlay.readFile(f),
          directoryExists: (p) => ts.sys.directoryExists(p),
          realpath: (p) => (overlay.has(p) ? p : ts.sys.realpath ? ts.sys.realpath(p) : p),
          getCurrentDirectory: getCwd,
        };
        return lits.map((lit) => {
          const res = ts.resolveModuleName(lit.text, containingFile, options ?? this.#compilerOptions, modHost);
          if (res.resolvedModule) {
            logger.log(`resolve OK '${lit.text}' from '${containingFile}' -> '${res.resolvedModule.resolvedFileName}'`);
          } else {
            logger.warn(`resolve FAIL '${lit.text}' from '${containingFile}'`);
          }
          return { resolvedModule: res.resolvedModule };
        });
      },
    };
  }

  #loadConfig(
    workspaceRoot: string | null,
    tsconfigPath: string | null,
    configFileName?: string,
  ): TsConfigSnapshot {
    const searchRoot = workspaceRoot ?? process.cwd();
    const configPath = this.#resolveConfigPath(searchRoot, tsconfigPath, configFileName);
    if (!configPath) {
      this.#logger.warn(`[ts] no tsconfig found under ${searchRoot}; using defaults`);
      return { options: this.#withDefaults({}), rootFileNames: [], configPath: null };
    }

    const read = ts.readConfigFile(configPath, (file) => ts.sys.readFile(file));
    if (read.error) {
      const message = ts.flattenDiagnosticMessageText(read.error.messageText, " ");
      this.#logger.error(`[ts] failed to read tsconfig at ${configPath}: ${message}`);
      return { options: this.#withDefaults({}), rootFileNames: [], configPath: this.#paths.canonical(configPath) };
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
      this.#logger.warn(`[ts] tsconfig parse errors: ${messages}`);
    }

    const options = this.#withDefaults(parsed.options ?? {});
    const rootFileNames = parsed.fileNames.map((file) => this.#paths.canonical(file));
    return { options, rootFileNames, configPath: this.#paths.canonical(configPath) };
  }

  #resolveConfigPath(searchRoot: string, explicit: string | null, configFileName?: string): string | null {
    if (explicit) {
      return path.isAbsolute(explicit) ? explicit : path.join(searchRoot, explicit);
    }
    return ts.findConfigFile(searchRoot, (file) => ts.sys.fileExists(file), configFileName ?? "tsconfig.json") ?? null;
  }

  #fingerprint(
    options: ts.CompilerOptions,
    roots: readonly NormalizedPath[],
    configPath: NormalizedPath | null,
  ): string {
    const normalizedOptions: Record<string, unknown> = {};
    for (const key of Object.keys(options).sort()) {
      const value = (options as Record<string, unknown>)[key];
      if (value === undefined) continue;
      normalizedOptions[key] = value;
    }
    return JSON.stringify({
      configPath,
      options: normalizedOptions,
      roots: [...roots].sort(),
    });
  }

  #withDefaults(options: ts.CompilerOptions): ts.CompilerOptions {
    const types = Array.isArray(options.types) ? options.types : DEFAULT_COMPILER_OPTIONS.types;
    const merged: ts.CompilerOptions = {
      ...DEFAULT_COMPILER_OPTIONS,
      ...options,
      noEmit: true,
    };
    if (types !== undefined) merged.types = types;
    return merged;
  }
}
