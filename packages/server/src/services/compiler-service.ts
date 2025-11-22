import path from "node:path";
import { URI } from "vscode-uri";
import {
  compileTemplate,
  compileTemplateToSSR,
  DEFAULT_SYNTAX,
  getExpressionParser,
  type VmReflection,
  type NormalizedPath,
} from "@aurelia-ls/domain";
import type { TemplateCompilation } from "@aurelia-ls/domain";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { PathUtils } from "./paths.js";
import type { Logger } from "./types.js";

export interface CompilationRecord {
  key: NormalizedPath;
  compilation: TemplateCompilation;
}

export class CompilerService {
  #paths: PathUtils;
  #logger: Logger;
  #attrParser = DEFAULT_SYNTAX;
  #exprParser = getExpressionParser();
  #programs = new Map<NormalizedPath, TemplateCompilation>();
  #ssr = new Map<NormalizedPath, ReturnType<typeof compileTemplateToSSR>>();

  constructor(paths: PathUtils, logger: Logger) {
    this.#paths = paths;
    this.#logger = logger;
  }

  compileDocument(doc: TextDocument, vm: VmReflection, isJs = false): CompilationRecord | null {
    const fsPath = this.#fsPathFromUri(doc.uri);
    if (!fsPath || path.extname(fsPath).toLowerCase() !== ".html") return null;
    const key = this.#paths.canonical(fsPath);
    const compilation = compileTemplate({
      html: doc.getText(),
      templateFilePath: fsPath,
      isJs,
      vm,
      attrParser: this.#attrParser,
      exprParser: this.#exprParser,
    });
    this.#programs.set(key, compilation);
    this.#logger.info(`[compiler] compiled ${fsPath} (overlay=${compilation.overlay.overlayPath})`);
    return { key, compilation };
  }

  getCompilationByUri(uri: string): TemplateCompilation | null {
    const fsPath = this.#fsPathFromUri(uri);
    if (!fsPath) return null;
    const key = this.#paths.canonical(fsPath);
    return this.#programs.get(key) ?? null;
  }

  compileSsrDocument(doc: TextDocument, vm: VmReflection): ReturnType<typeof compileTemplateToSSR> | null {
    const fsPath = this.#fsPathFromUri(doc.uri);
    if (!fsPath || path.extname(fsPath).toLowerCase() !== ".html") return null;
    const key = this.#paths.canonical(fsPath);
    const cached = this.#ssr.get(key);
    if (cached) return cached;
    const result = compileTemplateToSSR({
      html: doc.getText(),
      templateFilePath: fsPath,
      isJs: false,
      vm,
      attrParser: this.#attrParser,
      exprParser: this.#exprParser,
    });
    this.#ssr.set(key, result);
    this.#logger.info(`[compiler] ssr compiled ${fsPath}`);
    return result;
  }

  invalidate(fsPath: string): void {
    const key = this.#paths.canonical(fsPath);
    this.#programs.delete(key);
    this.#ssr.delete(key);
  }

  #fsPathFromUri(uri: string): string | null {
    try {
      return URI.parse(uri).fsPath;
    } catch {
      return null;
    }
  }
}
