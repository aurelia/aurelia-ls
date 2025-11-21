import * as fs from "node:fs";
import ts from "typescript";
import type { Logger } from "./types.js";
import { OverlayFs } from "./overlay-fs.js";
import { PathUtils } from "./paths.js";

export class TsService {
  #overlay: OverlayFs;
  #paths: PathUtils;
  #logger: Logger;
  #workspaceRoot: () => string | null;
  #projectVersion = 1;
  #service: ts.LanguageService;

  constructor(overlay: OverlayFs, paths: PathUtils, logger: Logger, workspaceRoot: () => string | null) {
    this.#overlay = overlay;
    this.#paths = paths;
    this.#logger = logger;
    this.#workspaceRoot = workspaceRoot;
    this.#service = ts.createLanguageService(this.#createHost());
  }

  compilerOptions(): ts.CompilerOptions {
    return {
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
  }

  upsertOverlay(fileAbs: string, text: string): void {
    this.#overlay.upsert(fileAbs, text);
    this.#projectVersion++;
    this.#recreate();
    this.#logger.log(`[ts] overlay updated: ${fileAbs} (version=${this.#projectVersion})`);
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

  forceOverlaySourceFile(overlayPathCanonical: string): ts.SourceFile | undefined {
    try {
      void this.#service.getSyntacticDiagnostics(overlayPathCanonical);
    } catch (e: any) {
      this.#logger.error(`getSyntacticDiagnostics threw: ${e?.message ?? String(e)}`);
    }
    const program = this.#service.getProgram();
    return program?.getSourceFile(overlayPathCanonical);
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
    const getCwd = () => this.#workspaceRoot() ?? process.cwd();

    return {
      getCompilationSettings: () => this.compilerOptions(),
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
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
      realpath: (p) => (overlay.has(p) ? p : ts.sys.realpath ? ts.sys.realpath(p) : p),

      resolveModuleNameLiterals: (lits, containingFile, redirected, options) => {
        const modHost: ts.ModuleResolutionHost = {
          fileExists: (f) => overlay.fileExists(f),
          readFile: (f) => overlay.readFile(f),
          directoryExists: ts.sys.directoryExists,
          realpath: (p) => (overlay.has(p) ? p : ts.sys.realpath ? ts.sys.realpath(p) : p),
          getCurrentDirectory: getCwd,
        };
        return lits.map((lit) => {
          const res = ts.resolveModuleName(lit.text, containingFile, options, modHost);
          if (res.resolvedModule) {
            logger.log(`resolve OK '${lit.text}' from '${containingFile}' -> '${res.resolvedModule.resolvedFileName}'`);
          } else {
            logger.warn(`resolve FAIL '${lit.text}' from '${containingFile}'`);
          }
          return { resolvedModule: res.resolvedModule } as ts.ResolvedModuleWithFailedLookupLocations;
        });
      },
    };
  }
}
