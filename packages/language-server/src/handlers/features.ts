/**
 * LSP feature handlers: completions, hover, definition, references, rename, code actions.
 *
 * All semantics come from the Semantic Workspace engine. This adapter only maps
 * workspace results into LSP types and handles the FeatureResponse boundary.
 *
 * Invariant: Never catch-and-return-null. All workspace calls go through
 * adaptWorkspaceCall which produces FeatureResponse<T>. Degradation is
 * rendered as structured output, not silence.
 */
import {
  ResponseError,
  SemanticTokensRequest,
  type CompletionList,
  type Hover,
  type Definition,
  type Location,
  type LocationLink,
  type WorkspaceEdit,
  type CodeAction,
  type TextDocumentPositionParams,
  type ReferenceParams,
  type RenameParams,
  type PrepareRenameParams,
  type CodeActionParams,
  type CompletionParams,
} from "vscode-languageserver/node.js";
import { canonicalDocumentUri } from "@aurelia-ls/compiler/program/paths.js";
import type { RenameResult } from "@aurelia-ls/semantic-workspace/types.js";
import type { ServerContext } from "../context.js";
import { handleInlayHints as handleInlayHintsRequest } from "./inlay-hints.js";
import {
  createCompletionGapMarker,
  mapPrepareRename,
  mapRenameResult,
  mapSemanticWorkspaceEdit,
  mapWorkspaceCompletions,
  mapWorkspaceHover,
  mapWorkspaceLocations,
  mapWorkspaceLocationsAsLinks,
  type LookupTextFn,
} from "../mapping/lsp-types.js";
import { handleSemanticTokensFull, SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";
import {
  adaptWorkspaceCall,
  isDegradation,
  isNotApplicable,
  isSuccess,
  degradationFromError,
  renderDegradationAsHoverMarkdown,
  renderDegradationAsMessage,
  type FeatureResponse,
  type Degradation,
} from "../feature-response.js";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Log a degradation. Always log, never swallow.
 * This replaces the old catch-and-log pattern with structured output.
 */
function logDegradation(ctx: ServerContext, feature: string, d: Degradation, uri?: string): void {
  const location = uri ? ` for ${uri}` : "";
  ctx.logger.warn(`[${feature}] degraded (rung ${d.rung})${location}: ${d.what} — ${d.why}`);
}

// ============================================================================
// Completion Handler
// ============================================================================

export function handleCompletion(ctx: ServerContext, params: CompletionParams): CompletionList {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return { isIncomplete: false, items: [] };

  const canonical = canonicalDocumentUri(doc.uri);

  const response = adaptWorkspaceCall("completions", () =>
    ctx.workspace.query(canonical.uri).completions(params.position),
  );

  if (isDegradation(response)) {
    logDegradation(ctx, "completion", response, params.textDocument.uri);
    // Degradation → incomplete list with gap marker explaining the degradation
    return createCompletionGapMarker([]);
  }

  if (isNotApplicable(response)) {
    return { isIncomplete: false, items: [] };
  }

  // L2 convergence: isIncomplete is now a scope-model signal from the workspace,
  // not inferred from diagnostics at this boundary.
  const result = response;
  const mapped = mapWorkspaceCompletions(result.items);

  if (result.isIncomplete) {
    if (mapped.length === 0) return { isIncomplete: true, items: [] };
    return createCompletionGapMarker(mapped);
  }

  return { isIncomplete: false, items: mapped };
}

// ============================================================================
// Hover Handler
// ============================================================================

export function handleHover(ctx: ServerContext, params: TextDocumentPositionParams): Hover | null {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const canonical = canonicalDocumentUri(doc.uri);
  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);

  const response = adaptWorkspaceCall("hover", () =>
    ctx.workspace.query(canonical.uri).hover(params.position),
  );

  if (isDegradation(response)) {
    logDegradation(ctx, "hover", response, params.textDocument.uri);
    // Boot doc: "Degradation rung 2/3 → hover with explanation text (NOT null)"
    return {
      contents: { kind: "markdown", value: renderDegradationAsHoverMarkdown(response) },
    };
  }

  if (isNotApplicable(response)) {
    // Legitimate absence — cursor on whitespace
    return null;
  }

  return mapWorkspaceHover(response, lookupText);
}

// ============================================================================
// Definition Handler
// ============================================================================

export function handleDefinition(
  ctx: ServerContext,
  params: TextDocumentPositionParams,
): Definition | LocationLink[] | null {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const canonical = canonicalDocumentUri(doc.uri);
  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);

  const response = adaptWorkspaceCall("definition", () =>
    ctx.workspace.query(canonical.uri).definition(params.position),
  );

  if (isDegradation(response)) {
    logDegradation(ctx, "definition", response, params.textDocument.uri);
    // Definition can't render explanation text in standard LSP; log and return null
    return null;
  }

  if (isNotApplicable(response)) {
    return null;
  }

  // Use LocationLink for richer navigation (origin range, peek support)
  return mapWorkspaceLocationsAsLinks(response, lookupText);
}

// ============================================================================
// References Handler
// ============================================================================

export function handleReferences(ctx: ServerContext, params: ReferenceParams): Location[] | null {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const canonical = canonicalDocumentUri(doc.uri);
  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);

  const response = adaptWorkspaceCall("references", () =>
    ctx.workspace.query(canonical.uri).references(params.position),
  );

  if (isDegradation(response)) {
    logDegradation(ctx, "references", response, params.textDocument.uri);
    // References can't render inline; log and return null
    return null;
  }

  if (isNotApplicable(response)) {
    return null;
  }

  return mapWorkspaceLocations(response, lookupText);
}

// ============================================================================
// Rename Handler
// ============================================================================

export function handlePrepareRename(
  ctx: ServerContext,
  params: PrepareRenameParams,
): { range: import("vscode-languageserver/node.js").Range; placeholder: string } | null {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const canonical = canonicalDocumentUri(doc.uri);
  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);

  try {
    const result = ctx.workspace.refactor().prepareRename({
      uri: canonical.uri,
      position: params.position,
    });

    if ("error" in result) {
      throw new ResponseError(0, result.error.message);
    }

    return mapPrepareRename(result.result, lookupText, canonical.uri);
  } catch (e) {
    if (e instanceof ResponseError) throw e;
    const d = degradationFromError("prepareRename", e);
    logDegradation(ctx, "prepareRename", d, params.textDocument.uri);
    return null;
  }
}

export function handleRename(ctx: ServerContext, params: RenameParams): WorkspaceEdit | null {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const canonical = canonicalDocumentUri(doc.uri);
  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);

  try {
    const result = ctx.workspace.refactor().rename({
      uri: canonical.uri,
      position: params.position,
      newName: params.newName,
    });

    if ("error" in result) {
      // Boot doc: "Degradation → returned as error response with the explanation, NOT as null"
      throw new ResponseError(0, result.error.message);
    }

    // If the workspace returns a rich RenameResult (with annotations, file renames),
    // use the rich mapping. Otherwise fall through to basic mapping.
    if ("rename" in result) {
      const renameResult = (result as { rename: RenameResult }).rename;
      return mapRenameResult(renameResult, lookupText);
    }

    return mapSemanticWorkspaceEdit(result.edit, lookupText);
  } catch (e) {
    if (e instanceof ResponseError) throw e;
    // Boot doc: Degradation for rename → error response, NOT null
    const d = degradationFromError("rename", e);
    logDegradation(ctx, "rename", d, params.textDocument.uri);
    throw new ResponseError(0, renderDegradationAsMessage(d));
  }
}

// ============================================================================
// Code Action Handler
// ============================================================================

export function handleCodeAction(ctx: ServerContext, params: CodeActionParams): CodeAction[] | null {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const canonical = canonicalDocumentUri(doc.uri);
  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);

  const response = adaptWorkspaceCall("codeAction", () =>
    ctx.workspace.refactor().codeActions({
      uri: canonical.uri,
      position: params.range.start,
    }),
  );

  if (isDegradation(response)) {
    logDegradation(ctx, "codeAction", response, params.textDocument.uri);
    return null;
  }

  if (isNotApplicable(response)) {
    return null;
  }

  const mapped: CodeAction[] = [];
  for (const action of response) {
    const edit = mapSemanticWorkspaceEdit(action.edit ?? null, lookupText);
    if (!edit) continue;
    const mappedAction: CodeAction = { title: action.title, edit };
    if (action.kind) mappedAction.kind = action.kind;
    mapped.push(mappedAction);
  }
  return mapped.length ? mapped : null;
}

// ============================================================================
// Handler Registration
// ============================================================================

export function registerFeatureHandlers(ctx: ServerContext): void {
  ctx.connection.onCompletion((params) => handleCompletion(ctx, params));
  ctx.connection.onHover((params) => handleHover(ctx, params));
  ctx.connection.onDefinition((params) => handleDefinition(ctx, params));
  ctx.connection.onReferences((params) => handleReferences(ctx, params));
  ctx.connection.onPrepareRename((params) => handlePrepareRename(ctx, params));
  ctx.connection.onRenameRequest((params) => handleRename(ctx, params));
  ctx.connection.onCodeAction((params) => handleCodeAction(ctx, params));

  // Inlay hints — binding mode resolution
  ctx.connection.languages.inlayHint.on((params) => handleInlayHintsRequest(ctx, params));


  ctx.connection.onRequest(SemanticTokensRequest.type, (params) => {
    const response = adaptWorkspaceCall("semanticTokens", () =>
      handleSemanticTokensFull(ctx, params),
    );

    if (isDegradation(response)) {
      logDegradation(ctx, "semanticTokens", response, params.textDocument.uri);
      return { data: [] };
    }

    return isSuccess(response) && response ? response : { data: [] };
  });
}

export { SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";
