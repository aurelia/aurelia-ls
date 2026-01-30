/**
 * LSP feature handlers: completions, hover, definition, references, rename, code actions.
 *
 * All semantics come from the Semantic Workspace engine. This adapter only maps
 * workspace results into LSP types and handles transport-level safety.
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
} from "vscode-languageserver/node.js";
import { canonicalDocumentUri } from "@aurelia-ls/compiler";
import type { ServerContext } from "../context.js";
import {
  mapSemanticWorkspaceEdit,
  mapWorkspaceCompletions,
  mapWorkspaceHover,
  mapWorkspaceLocations,
  type LookupTextFn,
} from "../mapping/lsp-types.js";
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
    const completions = ctx.workspace.query(canonical.uri).completions(params.position);
    return mapWorkspaceCompletions(completions);
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
    const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);
    const hover = ctx.workspace.query(canonical.uri).hover(params.position);
    return mapWorkspaceHover(hover, lookupText);
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
    const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);
    const locations = ctx.workspace.query(canonical.uri).definition(params.position);
    return mapWorkspaceLocations(locations, lookupText);
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
    const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);
    const locations = ctx.workspace.query(canonical.uri).references(params.position);
    return mapWorkspaceLocations(locations, lookupText);
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
    const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);
    const result = ctx.workspace.refactor().rename({
      uri: canonical.uri,
      position: params.position,
      newName: params.newName,
    });
    if ("error" in result) return null;
    return mapSemanticWorkspaceEdit(result.edit, lookupText);
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
    const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);
    const actions = ctx.workspace.refactor().codeActions({
      uri: canonical.uri,
      position: params.range.start,
    });
    const mapped: CodeAction[] = [];
    for (const action of actions) {
      const edit = mapSemanticWorkspaceEdit(action.edit ?? null, lookupText);
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

export function registerFeatureHandlers(ctx: ServerContext): void {
  ctx.connection.onCompletion((params) => handleCompletion(ctx, params));
  ctx.connection.onHover((params) => handleHover(ctx, params));
  ctx.connection.onDefinition((params) => handleDefinition(ctx, params));
  ctx.connection.onReferences((params) => handleReferences(ctx, params));
  ctx.connection.onRenameRequest((params) => handleRename(ctx, params));
  ctx.connection.onCodeAction((params) => handleCodeAction(ctx, params));

  ctx.connection.onRequest(SemanticTokensRequest.type, (params) => {
    const result = handleSemanticTokensFull(ctx, params);
    return result ?? { data: [] };
  });
}

export { SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";
