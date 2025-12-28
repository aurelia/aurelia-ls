/**
 * LSP feature handlers: completions, hover, definition, references, rename, code actions
 */
import type {
  CompletionItem,
  Hover,
  Definition,
  Location,
  WorkspaceEdit,
  CodeAction,
  TextDocumentPositionParams,
  ReferenceParams,
  RenameParams,
  CodeActionParams,
  CompletionParams,
} from "vscode-languageserver/node.js";
import { canonicalDocumentUri } from "@aurelia-ls/compiler";
import type { ServerContext } from "../context.js";
import { mapCompletions, mapHover, mapLocations, mapWorkspaceEdit } from "../mapping/lsp-types.js";

export function handleCompletion(ctx: ServerContext, params: CompletionParams): CompletionItem[] {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return [];
  const canonical = canonicalDocumentUri(doc.uri);
  const completions = ctx.workspace.languageService.getCompletions(canonical.uri, params.position);
  return mapCompletions(completions);
}

export function handleHover(ctx: ServerContext, params: TextDocumentPositionParams): Hover | null {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  return mapHover(ctx.workspace.languageService.getHover(canonical.uri, params.position));
}

export function handleDefinition(ctx: ServerContext, params: TextDocumentPositionParams): Definition | null {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  return mapLocations(ctx.workspace.languageService.getDefinition(canonical.uri, params.position));
}

export function handleReferences(ctx: ServerContext, params: ReferenceParams): Location[] | null {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  return mapLocations(ctx.workspace.languageService.getReferences(canonical.uri, params.position));
}

export function handleRename(ctx: ServerContext, params: RenameParams): WorkspaceEdit | null {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  const edits = ctx.workspace.languageService.renameSymbol(canonical.uri, params.position, params.newName);
  return mapWorkspaceEdit(edits);
}

export function handleCodeAction(ctx: ServerContext, params: CodeActionParams): CodeAction[] | null {
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
}
