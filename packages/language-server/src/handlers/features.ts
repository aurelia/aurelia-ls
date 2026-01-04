/**
 * LSP feature handlers: completions, hover, definition, references, rename, code actions
 *
 * Each handler is wrapped in try/catch to prevent exceptions from destabilizing
 * the LSP connection. Errors are logged and graceful fallbacks are returned.
 */
import {
  SemanticTokensRequest,
  type CompletionItem,
  type Hover,
  type Definition,
  type Location,
  type WorkspaceEdit,
  type CodeAction,
  type TextDocumentPositionParams,
  type ReferenceParams,
  type RenameParams,
  type CodeActionParams,
  type CompletionParams,
  type SemanticTokensParams,
} from "vscode-languageserver/node.js";
import {
  canonicalDocumentUri,
  type TemplateMetaIR,
  type ImportMetaIR,
  type BindableMetaIR,
  type SourceSpan,
} from "@aurelia-ls/compiler";
import type { ServerContext } from "../context.js";
import { mapCompletions, mapHover, mapLocations, mapWorkspaceEdit } from "../mapping/lsp-types.js";
import { handleSemanticTokensFull, SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";
import ts from "typescript";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import type { TextDocument } from "vscode-languageserver-textdocument";

function formatError(e: unknown): string {
  if (e instanceof Error) return e.stack ?? e.message;
  return String(e);
}

/* =============================================================================
 * META ELEMENT GO-TO-DEFINITION
 * ============================================================================= */

/**
 * Check if offset falls within an import's `from` attribute span.
 * Returns the import if found, null otherwise.
 */
export function findImportAtOffset(
  meta: TemplateMetaIR | undefined,
  offset: number
): ImportMetaIR | null {
  if (!meta) return null;
  for (const imp of meta.imports) {
    const fromLoc = imp.from.loc;
    if (fromLoc && offset >= fromLoc.start && offset < fromLoc.end) {
      return imp;
    }
  }
  return null;
}

/**
 * Resolve a module specifier to an absolute file path using TypeScript's module resolution.
 * This respects tsconfig.json paths, baseUrl, and other resolution settings.
 * Returns null if the module cannot be resolved.
 */
function resolveModuleSpecifier(
  specifier: string,
  containingFile: string,
  ctx: ServerContext
): string | null {
  const compilerOptions = ctx.tsService.compilerOptions();

  const result = ts.resolveModuleName(
    specifier,
    containingFile,
    compilerOptions,
    ts.sys,
  );

  if (result.resolvedModule?.resolvedFileName) {
    return result.resolvedModule.resolvedFileName;
  }

  // Fallback for HTML files which TypeScript doesn't resolve
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const fromDir = path.dirname(containingFile);
    const htmlPath = path.resolve(fromDir, specifier + ".html");
    if (fs.existsSync(htmlPath)) {
      return htmlPath;
    }
  }

  ctx.logger.log(`[definition] Could not resolve module '${specifier}' from '${containingFile}'`);
  return null;
}

/**
 * Find the first exported declaration in a TypeScript/JavaScript file.
 * Returns the line and character of the export, or null if not found.
 */
function findFirstExport(filePath: string): { line: number; character: number } | null {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX :
      filePath.endsWith(".jsx") ? ts.ScriptKind.JSX :
      filePath.endsWith(".js") ? ts.ScriptKind.JS :
      ts.ScriptKind.TS
    );

    // Find the first exported declaration
    for (const statement of sourceFile.statements) {
      const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
      const hasExport = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

      if (hasExport) {
        // Get the name of the declaration
        let nameNode: ts.Node | undefined;
        if (ts.isClassDeclaration(statement) && statement.name) {
          nameNode = statement.name;
        } else if (ts.isFunctionDeclaration(statement) && statement.name) {
          nameNode = statement.name;
        } else if (ts.isVariableStatement(statement)) {
          const firstDecl = statement.declarationList.declarations[0];
          if (firstDecl) nameNode = firstDecl.name;
        }

        if (nameNode) {
          const pos = sourceFile.getLineAndCharacterOfPosition(nameNode.getStart(sourceFile));
          return { line: pos.line, character: pos.character };
        }

        // If no name, use the start of the declaration
        const pos = sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile));
        return { line: pos.line, character: pos.character };
      }
    }

    // No export found, return file start
    return null;
  } catch {
    return null;
  }
}

/**
 * Get definition for meta element imports.
 * Returns a Location if the cursor is on an import's `from` attribute, null otherwise.
 */
function getMetaImportDefinition(
  ctx: ServerContext,
  doc: TextDocument,
  offset: number,
  templatePath: string
): Location | null {
  const canonical = canonicalDocumentUri(doc.uri);
  const compilation = ctx.workspace.program.getCompilation(canonical.uri);
  if (!compilation) return null;

  const template = compilation.linked.templates[0];
  if (!template) return null;

  const importMeta = findImportAtOffset(template.templateMeta, offset);
  if (!importMeta) return null;

  const specifier = importMeta.from.value;
  const resolvedPath = resolveModuleSpecifier(specifier, templatePath, ctx);

  if (!resolvedPath) {
    return null;
  }

  const targetUri = pathToFileURL(resolvedPath).href;

  // Try to find the first export location for a better navigation experience
  const exportLocation = findFirstExport(resolvedPath);
  const targetLine = exportLocation?.line ?? 0;
  const targetChar = exportLocation?.character ?? 0;

  return {
    uri: targetUri,
    range: {
      start: { line: targetLine, character: targetChar },
      end: { line: targetLine, character: targetChar },
    },
  };
}

/* =============================================================================
 * META ELEMENT HOVER
 * ============================================================================= */

/**
 * Hover result for meta elements.
 */
export interface MetaHoverResult {
  contents: string;
  span: SourceSpan;
}

/**
 * Check if offset is within a span.
 */
function isWithinSpan(offset: number, span: SourceSpan | undefined): boolean {
  if (!span) return false;
  return offset >= span.start && offset < span.end;
}

/**
 * Get hover for import meta elements.
 */
function getImportHover(
  meta: TemplateMetaIR,
  offset: number
): MetaHoverResult | null {
  for (const imp of meta.imports) {
    // Check if on tag name
    if (imp.tagLoc && isWithinSpan(offset, imp.tagLoc)) {
      const kind = imp.kind === "require" ? "require" : "import";
      return {
        contents: `**<${kind}>** — Import Aurelia resources from a module`,
        span: imp.tagLoc,
      };
    }

    // Check if on from attribute value
    if (isWithinSpan(offset, imp.from.loc)) {
      const hasAlias = imp.defaultAlias || (imp.namedAliases && imp.namedAliases.length > 0);
      const aliasInfo = hasAlias
        ? "\n\n*Has aliases configured*"
        : "";
      return {
        contents: `**Module:** \`${imp.from.value}\`${aliasInfo}`,
        span: imp.from.loc,
      };
    }

    // Check if on default alias
    if (imp.defaultAlias && isWithinSpan(offset, imp.defaultAlias.loc)) {
      return {
        contents: `**Alias:** \`${imp.defaultAlias.value}\`\n\nRenames the default export from \`${imp.from.value}\``,
        span: imp.defaultAlias.loc,
      };
    }

    // Check if on named aliases
    if (imp.namedAliases) {
      for (const alias of imp.namedAliases) {
        if (isWithinSpan(offset, alias.exportName.loc)) {
          return {
            contents: `**Export:** \`${alias.exportName.value}\`\n\nAliased as \`${alias.alias.value}\``,
            span: alias.exportName.loc,
          };
        }
        if (isWithinSpan(offset, alias.alias.loc)) {
          return {
            contents: `**Alias:** \`${alias.alias.value}\`\n\nFor export \`${alias.exportName.value}\` from \`${imp.from.value}\``,
            span: alias.alias.loc,
          };
        }
      }
    }
  }
  return null;
}

/**
 * Get hover for bindable meta elements.
 */
function getBindableHover(
  meta: TemplateMetaIR,
  offset: number
): MetaHoverResult | null {
  for (const bindable of meta.bindables) {
    // Check if on tag name
    if (bindable.tagLoc && isWithinSpan(offset, bindable.tagLoc)) {
      return {
        contents: `**<bindable>** — Declare a bindable property for this component`,
        span: bindable.tagLoc,
      };
    }

    // Check if on name attribute
    if (isWithinSpan(offset, bindable.name.loc)) {
      const modeInfo = bindable.mode ? `, mode: ${bindable.mode.value}` : "";
      const attrInfo = bindable.attribute ? `, attribute: ${bindable.attribute.value}` : "";
      return {
        contents: `**Bindable:** \`${bindable.name.value}\`${modeInfo}${attrInfo}`,
        span: bindable.name.loc,
      };
    }

    // Check if on mode attribute
    if (bindable.mode && isWithinSpan(offset, bindable.mode.loc)) {
      return {
        contents: `**Binding Mode:** \`${bindable.mode.value}\`\n\nControls data flow direction for this bindable`,
        span: bindable.mode.loc,
      };
    }

    // Check if on attribute attribute
    if (bindable.attribute && isWithinSpan(offset, bindable.attribute.loc)) {
      return {
        contents: `**HTML Attribute:** \`${bindable.attribute.value}\`\n\nThe attribute name used in templates (differs from property name \`${bindable.name.value}\`)`,
        span: bindable.attribute.loc,
      };
    }
  }
  return null;
}

/**
 * Get hover for other meta elements (shadow-dom, containerless, capture, alias).
 */
function getOtherMetaHover(
  meta: TemplateMetaIR,
  offset: number
): MetaHoverResult | null {
  // Shadow DOM
  if (meta.shadowDom && meta.shadowDom.tagLoc && isWithinSpan(offset, meta.shadowDom.tagLoc)) {
    return {
      contents: `**<use-shadow-dom>** — Enable Shadow DOM encapsulation for this component`,
      span: meta.shadowDom.tagLoc,
    };
  }

  // Containerless
  if (meta.containerless && meta.containerless.tagLoc && isWithinSpan(offset, meta.containerless.tagLoc)) {
    return {
      contents: `**<containerless>** — Render component content without the host element wrapper`,
      span: meta.containerless.tagLoc,
    };
  }

  // Capture
  if (meta.capture && meta.capture.tagLoc && isWithinSpan(offset, meta.capture.tagLoc)) {
    return {
      contents: `**<capture>** — Capture all unrecognized attributes as bindings`,
      span: meta.capture.tagLoc,
    };
  }

  // Aliases
  for (const alias of meta.aliases) {
    if (alias.tagLoc && isWithinSpan(offset, alias.tagLoc)) {
      return {
        contents: `**<alias>** — Define an alternative name for this component`,
        span: alias.tagLoc,
      };
    }
  }

  return null;
}

/**
 * Get hover for meta elements.
 * Returns hover content and span if the cursor is on a meta element, null otherwise.
 */
export function getMetaElementHover(
  meta: TemplateMetaIR | undefined,
  offset: number
): MetaHoverResult | null {
  if (!meta) return null;

  // Check imports first (most common)
  const importHover = getImportHover(meta, offset);
  if (importHover) return importHover;

  // Check bindables
  const bindableHover = getBindableHover(meta, offset);
  if (bindableHover) return bindableHover;

  // Check other meta elements
  return getOtherMetaHover(meta, offset);
}

/**
 * Get hover for meta elements from compilation.
 */
function getMetaHover(
  ctx: ServerContext,
  doc: TextDocument,
  offset: number
): Hover | null {
  const canonical = canonicalDocumentUri(doc.uri);
  const compilation = ctx.workspace.program.getCompilation(canonical.uri);
  if (!compilation) return null;

  const template = compilation.linked.templates[0];
  if (!template) return null;

  const result = getMetaElementHover(template.templateMeta, offset);
  if (!result) return null;

  // Convert span to range
  const startPos = doc.positionAt(result.span.start);
  const endPos = doc.positionAt(result.span.end);

  return {
    contents: {
      kind: "markdown",
      value: result.contents,
    },
    range: {
      start: startPos,
      end: endPos,
    },
  };
}

/* =============================================================================
 * TEMPLATE IMPORT DIAGNOSTICS
 * ============================================================================= */

/**
 * Diagnostic for an unresolved template import.
 */
export interface TemplateImportDiagnostic {
  code: string;
  message: string;
  severity: "error" | "warning";
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

/**
 * Validate template imports and return diagnostics for unresolved imports.
 * Returns an array of diagnostics for imports that couldn't be resolved.
 */
export function validateTemplateImports(
  ctx: ServerContext,
  doc: TextDocument,
  templatePath: string
): TemplateImportDiagnostic[] {
  const canonical = canonicalDocumentUri(doc.uri);
  const compilation = ctx.workspace.program.getCompilation(canonical.uri);
  if (!compilation) return [];

  const template = compilation.linked.templates[0];
  if (!template?.templateMeta) return [];

  const diagnostics: TemplateImportDiagnostic[] = [];

  for (const imp of template.templateMeta.imports) {
    const specifier = imp.from.value;
    const resolvedPath = resolveModuleSpecifier(specifier, templatePath, ctx);

    if (!resolvedPath) {
      // Only emit diagnostics for relative imports (package imports may not be resolvable yet)
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        const startPos = doc.positionAt(imp.from.loc.start);
        const endPos = doc.positionAt(imp.from.loc.end);

        diagnostics.push({
          code: "AU1200",
          message: `Cannot resolve module '${specifier}'`,
          severity: "error",
          range: {
            start: { line: startPos.line, character: startPos.character },
            end: { line: endPos.line, character: endPos.character },
          },
        });
      }
    }
  }

  return diagnostics;
}

export function handleCompletion(ctx: ServerContext, params: CompletionParams): CompletionItem[] {
  try {
    const doc = ctx.ensureProgramDocument(params.textDocument.uri);
    if (!doc) return [];
    const canonical = canonicalDocumentUri(doc.uri);
    const completions = ctx.workspace.languageService.getCompletions(canonical.uri, params.position);
    return mapCompletions(completions);
  } catch (e) {
    ctx.logger.error(`[completion] failed for ${params.textDocument.uri}: ${formatError(e)}`);
    return [];
  }
}

export function handleHover(ctx: ServerContext, params: TextDocumentPositionParams): Hover | null {
  try {
    const doc = ctx.ensureProgramDocument(params.textDocument.uri);
    if (!doc) return null;
    const canonical = canonicalDocumentUri(doc.uri);

    // Check for meta element hover first
    const offset = doc.offsetAt(params.position);
    const metaHover = getMetaHover(ctx, doc, offset);
    if (metaHover) {
      return metaHover;
    }

    // Fall through to regular TypeScript-based hover
    return mapHover(ctx.workspace.languageService.getHover(canonical.uri, params.position));
  } catch (e) {
    ctx.logger.error(`[hover] failed for ${params.textDocument.uri}: ${formatError(e)}`);
    return null;
  }
}

export function handleDefinition(ctx: ServerContext, params: TextDocumentPositionParams): Definition | null {
  try {
    const doc = ctx.ensureProgramDocument(params.textDocument.uri);
    if (!doc) return null;
    const canonical = canonicalDocumentUri(doc.uri);

    // Check for meta element import definition first
    const offset = doc.offsetAt(params.position);
    const metaDefinition = getMetaImportDefinition(ctx, doc, offset, canonical.path);
    if (metaDefinition) {
      return metaDefinition;
    }

    // Fall through to regular TypeScript-based definition
    return mapLocations(ctx.workspace.languageService.getDefinition(canonical.uri, params.position));
  } catch (e) {
    ctx.logger.error(`[definition] failed for ${params.textDocument.uri}: ${formatError(e)}`);
    return null;
  }
}

export function handleReferences(ctx: ServerContext, params: ReferenceParams): Location[] | null {
  try {
    const doc = ctx.ensureProgramDocument(params.textDocument.uri);
    if (!doc) return null;
    const canonical = canonicalDocumentUri(doc.uri);
    return mapLocations(ctx.workspace.languageService.getReferences(canonical.uri, params.position));
  } catch (e) {
    ctx.logger.error(`[references] failed for ${params.textDocument.uri}: ${formatError(e)}`);
    return null;
  }
}

export function handleRename(ctx: ServerContext, params: RenameParams): WorkspaceEdit | null {
  try {
    const doc = ctx.ensureProgramDocument(params.textDocument.uri);
    if (!doc) return null;
    const canonical = canonicalDocumentUri(doc.uri);
    const edits = ctx.workspace.languageService.renameSymbol(canonical.uri, params.position, params.newName);
    return mapWorkspaceEdit(edits);
  } catch (e) {
    ctx.logger.error(`[rename] failed for ${params.textDocument.uri}: ${formatError(e)}`);
    return null;
  }
}

export function handleCodeAction(ctx: ServerContext, params: CodeActionParams): CodeAction[] | null {
  try {
    const doc = ctx.ensureProgramDocument(params.textDocument.uri);
    if (!doc) return null;
    const canonical = canonicalDocumentUri(doc.uri);
    const actions = ctx.workspace.languageService.getCodeActions(canonical.uri, params.range);
    const mapped: CodeAction[] = [];
    for (const action of actions) {
      const edit = mapWorkspaceEdit(action.edits);
      if (!edit) continue;
      const mappedAction: CodeAction = { title: action.title, edit };
      if (action.kind) mappedAction.kind = action.kind;
      mapped.push(mappedAction);
    }
    return mapped.length ? mapped : null;
  } catch (e) {
    ctx.logger.error(`[codeAction] failed for ${params.textDocument.uri}: ${formatError(e)}`);
    return null;
  }
}

/**
 * Registers all LSP feature handlers on the connection.
 */
export function registerFeatureHandlers(ctx: ServerContext): void {
  ctx.connection.onCompletion((params) => handleCompletion(ctx, params));
  ctx.connection.onHover((params) => handleHover(ctx, params));
  ctx.connection.onDefinition((params) => handleDefinition(ctx, params));
  ctx.connection.onReferences((params) => handleReferences(ctx, params));
  ctx.connection.onRenameRequest((params) => handleRename(ctx, params));
  ctx.connection.onCodeAction((params) => handleCodeAction(ctx, params));

  // Semantic tokens for rich syntax highlighting
  // Use onRequest instead of languages.semanticTokens.on for proper LSP handling
  ctx.connection.onRequest(SemanticTokensRequest.type, (params) => {
    const result = handleSemanticTokensFull(ctx, params);
    // Return empty data array instead of null (LSP requires SemanticTokens, not null)
    return result ?? { data: [] };
  });
}

// Re-export legend for capability registration
export { SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";
