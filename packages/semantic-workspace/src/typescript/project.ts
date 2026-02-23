import path from "node:path";
import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { Logger } from "@aurelia-ls/compiler";
import type { PathUtils } from "./paths.js";
import { applyDefaultCompilerOptions, loadTsConfig, type TsConfigSnapshot } from "./tsconfig.js";

export interface TypeScriptProject {
  getProgram(): ts.Program;
  compilerOptions(): ts.CompilerOptions;
  getRootFileNames(): readonly NormalizedPath[];
  getProjectVersion(): number;
  configure?(options: TypeScriptProjectOptions): void;
  invalidate?(reason?: string): void;
  dispose?(): void;
}

export interface TypeScriptProjectOptions {
  readonly logger: Logger;
  readonly paths: PathUtils;
  readonly workspaceRoot?: string | null;
  readonly tsconfigPath?: string | null;
  readonly configFileName?: string;
}

/**
 * File-system-backed TypeScript project for discovery and index building.
 * Keeps a cached Program and recreates it when configuration changes.
 */
export class ProjectProgram implements TypeScriptProject {
  #logger: Logger;
  #paths: PathUtils;
  #workspaceRoot: string | null = null;
  #program: ts.Program | null = null;
  #compilerOptions: ts.CompilerOptions;
  #rootFileNames: NormalizedPath[] = [];
  #configPath: NormalizedPath | null = null;
  #configFingerprint = "";
  #projectVersion = 1;

  constructor(options: TypeScriptProjectOptions) {
    this.#logger = options.logger;
    this.#paths = options.paths;
    this.#compilerOptions = applyDefaultCompilerOptions({});
    this.configure(options);
  }

  configure(options: TypeScriptProjectOptions): void {
    const resolvedRoot = options.workspaceRoot ? path.resolve(options.workspaceRoot) : this.#workspaceRoot;
    const snapshot = loadTsConfig({
      workspaceRoot: resolvedRoot ?? null,
      tsconfigPath: options.tsconfigPath ?? null,
      configFileName: options.configFileName,
      logger: options.logger,
      paths: options.paths,
    });
    const fingerprint = this.#fingerprint(snapshot);
    if (fingerprint === this.#configFingerprint && resolvedRoot === this.#workspaceRoot) {
      return;
    }

    this.#workspaceRoot = resolvedRoot ?? null;
    this.#compilerOptions = snapshot.options;
    this.#rootFileNames = snapshot.rootFileNames;
    this.#configPath = snapshot.configPath;
    this.#configFingerprint = fingerprint;
    this.#projectVersion++;
    this.#program = null;

    const label = snapshot.configPath ?? "<defaults>";
    this.#logger.info(`[ts-project] configured root=${this.#workspaceRoot ?? "<cwd>"} config=${label} version=${this.#projectVersion}`);
  }

  invalidate(reason?: string): void {
    this.#program = null;
    this.#projectVersion++;
    this.#logger.log(`[ts-project] invalidated${reason ? ` (${reason})` : ""} version=${this.#projectVersion}`);
  }

  dispose(): void {
    this.#program = null;
    this.#rootFileNames = [];
    this.#configPath = null;
    this.#configFingerprint = "";
  }

  getProgram(): ts.Program {
    if (!this.#program) {
      this.#program = ts.createProgram(this.#rootFileNames, this.#compilerOptions);
      this.#logger.log(`[ts-project] program created (roots=${this.#rootFileNames.length})`);
    }
    return this.#program;
  }

  compilerOptions(): ts.CompilerOptions {
    return this.#compilerOptions;
  }

  getRootFileNames(): readonly NormalizedPath[] {
    return this.#rootFileNames;
  }

  getProjectVersion(): number {
    return this.#projectVersion;
  }

  #fingerprint(snapshot: TsConfigSnapshot): string {
    const normalizedOptions: Record<string, unknown> = {};
    for (const key of Object.keys(snapshot.options).sort()) {
      const value = (snapshot.options as Record<string, unknown>)[key];
      if (value === undefined) continue;
      normalizedOptions[key] = value;
    }
    return JSON.stringify({
      configPath: snapshot.configPath,
      options: normalizedOptions,
      roots: [...snapshot.rootFileNames].sort(),
    });
  }
}
