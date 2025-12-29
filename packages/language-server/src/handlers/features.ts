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
import { canonicalDocumentUri } from "@aurelia-ls/compiler";
import type { ServerContext } from "../context.js";
import { mapCompletions, mapHover, mapLocations, mapWorkspaceEdit } from "../mapping/lsp-types.js";
import { handleSemanticTokensFull, SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";

function formatError(e: unknown): string {
  if (e instanceof Error) return e.stack ?? e.message;
  return String(e);
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
