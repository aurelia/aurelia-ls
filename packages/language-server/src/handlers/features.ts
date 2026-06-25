/**
 * LSP feature handlers: completions, hover, definition, references, rename, code actions.
 *
 * Runtime-retargeted features call semantic-runtime through the LSP session.
 * Runtime-backed handlers catch at the protocol boundary and return the best
 * feature-specific degradation shape.
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
  DocumentHighlightKind,
  type DocumentHighlight,
  type TextDocumentPositionParams,
  type ReferenceParams,
  type RenameParams,
  type PrepareRenameParams,
  type CodeActionParams,
  type CompletionParams,
} from "vscode-languageserver/node.js";
import type { ServerContext } from "../context.js";
import { handleDocumentSymbols } from "./document-symbols.js";
import { handleWorkspaceSymbols } from "./workspace-symbols.js";
import { handleSelectionRanges } from "./selection-ranges.js";
import { handleLinkedEditingRange } from "./linked-editing-ranges.js";
import { handleFoldingRanges } from "./folding-ranges.js";
import { handleInlayHints as handleInlayHintsRequest } from "./inlay-hints.js";
import { handleCodeLens } from "./code-lens.js";
import { canonicalDocumentUri } from "../utils/document-uri.js";
import {
  createCompletionGapMarker,
  mapSemanticRuntimeTemplateCodeActions,
  mapSemanticRuntimeTemplateDefinition,
  mapSemanticRuntimeTemplateHover,
  mapSemanticRuntimeTemplateCompletions,
  mapSemanticRuntimeTemplateReferences,
  mapSemanticRuntimeTemplatePrepareRename,
  mapSemanticRuntimeTemplateRenameEdit,
  mapSemanticRuntimeRouteNodeDefinition,
  type LookupTextFn,
} from "../mapping/lsp-types.js";
import { handleSemanticTokensFull, SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";
import {
  degradationFromError,
  renderDegradationAsHoverMarkdown,
  renderDegradationAsMessage,
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

export async function handleCompletion(ctx: ServerContext, params: CompletionParams): Promise<CompletionList> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return { isIncomplete: false, items: [] };

  try {
    const response = await ctx.semanticRuntime.templateCompletions(doc, params.position);
    return mapSemanticRuntimeTemplateCompletions(response);
  } catch (error) {
    const response = degradationFromError("completion", error);
    logDegradation(ctx, "completion", response, params.textDocument.uri);
    return createCompletionGapMarker([]);
  }
}

// ============================================================================
// Hover Handler
// ============================================================================

export async function handleHover(ctx: ServerContext, params: TextDocumentPositionParams): Promise<Hover | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  try {
    const response = await ctx.semanticRuntime.templateCursorInfo(doc, params.position);
    return mapSemanticRuntimeTemplateHover(response);
  } catch (error) {
    const response = degradationFromError("hover", error);
    logDegradation(ctx, "hover", response, params.textDocument.uri);
    return {
      contents: { kind: "markdown", value: renderDegradationAsHoverMarkdown(response) },
    };
  }
}

// ============================================================================
// Definition Handler
// ============================================================================

export async function handleDefinition(
  ctx: ServerContext,
  params: TextDocumentPositionParams,
): Promise<Definition | LocationLink[] | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);
  try {
    const response = await ctx.semanticRuntime.templateCursorInfo(doc, params.position);
    const templateDefinition = mapSemanticRuntimeTemplateDefinition(response, lookupText, {
      workspaceRoot: ctx.workspaceRoot,
      originDocument: doc,
    });
    if (templateDefinition != null) {
      return templateDefinition;
    }

    try {
      const routeNodes = await ctx.semanticRuntime.routeNodes();
      const routeDefinition = mapSemanticRuntimeRouteNodeDefinition(routeNodes, lookupText, {
        workspaceRoot: ctx.workspaceRoot,
        originDocument: doc,
        position: params.position,
      });
      if (routeDefinition != null) {
        return routeDefinition;
      }
    } catch (error) {
      const response = degradationFromError("routeDefinition", error);
      logDegradation(ctx, "routeDefinition", response, params.textDocument.uri);
    }

    return null;
  } catch (error) {
    const response = degradationFromError("definition", error);
    logDegradation(ctx, "definition", response, params.textDocument.uri);
    // Definition can't render explanation text in standard LSP; log and return null
    return null;
  }
}

// ============================================================================
// References Handler
// ============================================================================

export async function handleReferences(ctx: ServerContext, params: ReferenceParams): Promise<Location[] | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);
  try {
    const response = await ctx.semanticRuntime.templateReferences(
      doc,
      params.position,
      params.context.includeDeclaration,
    );
    return mapSemanticRuntimeTemplateReferences(response, lookupText, {
      workspaceRoot: ctx.workspaceRoot,
      originDocument: doc,
    });
  } catch (error) {
    const response = degradationFromError("references", error);
    logDegradation(ctx, "references", response, params.textDocument.uri);
    return null;
  }
}

// ============================================================================
// Document Highlight Handler
// ============================================================================

export async function handleDocumentHighlight(
  ctx: ServerContext,
  params: TextDocumentPositionParams,
): Promise<DocumentHighlight[] | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);
  try {
    const response = await ctx.semanticRuntime.templateReferences(doc, params.position, false);
    const locations = mapSemanticRuntimeTemplateReferences(response, lookupText, {
      workspaceRoot: ctx.workspaceRoot,
      originDocument: doc,
    });
    if (!locations) return null;

    const originUri = canonicalDocumentUri(doc.uri).uri;
    const highlights = locations
      .filter((location) => canonicalDocumentUri(location.uri).uri === originUri)
      .map((location): DocumentHighlight => ({
        range: location.range,
        kind: DocumentHighlightKind.Text,
      }));

    return highlights.length > 0 ? highlights : null;
  } catch (error) {
    const response = degradationFromError("documentHighlight", error);
    logDegradation(ctx, "documentHighlight", response, params.textDocument.uri);
    return null;
  }
}

// ============================================================================
// Rename Handler
// ============================================================================

export function handlePrepareRename(
  ctx: ServerContext,
  params: PrepareRenameParams,
): Promise<{ range: import("vscode-languageserver/node.js").Range; placeholder: string } | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return Promise.resolve(null);

  return ctx.trace.spanAsync("lsp.prepareRename", async () => {
    try {
      const response = await ctx.semanticRuntime.templateRename(doc, params.position);
      if (response.value.status !== "available") {
        return null;
      }
      return mapSemanticRuntimeTemplatePrepareRename(response, {
        workspaceRoot: ctx.workspaceRoot,
        originDocument: doc,
      });
    } catch (e) {
      if (e instanceof ResponseError) throw e;
      const d = degradationFromError("prepareRename", e);
      logDegradation(ctx, "prepareRename", d, params.textDocument.uri);
      return null;
    }
  });
}

export async function handleRename(ctx: ServerContext, params: RenameParams): Promise<WorkspaceEdit | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);

  try {
    const response = await ctx.semanticRuntime.templateRename(doc, params.position, params.newName);
    if (response.value.status !== "available") {
      throw new ResponseError(0, response.value.displayText || response.summary);
    }
    const edit = mapSemanticRuntimeTemplateRenameEdit(response, lookupText, {
      workspaceRoot: ctx.workspaceRoot,
      originDocument: doc,
    });
    if (edit == null) {
      throw new ResponseError(0, `Rename produced no applicable edits for '${params.newName}'.`);
    }
    return edit;
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

export async function handleCodeAction(ctx: ServerContext, params: CodeActionParams): Promise<CodeAction[] | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);

  try {
    const response = await ctx.semanticRuntime.templateCodeActions(doc, params.range.start);
    return mapSemanticRuntimeTemplateCodeActions(response, lookupText, {
      workspaceRoot: ctx.workspaceRoot,
      originDocument: doc,
    });
  } catch (e) {
    const d = degradationFromError("codeAction", e);
    logDegradation(ctx, "codeAction", d, params.textDocument.uri);
    return null;
  }
}

// ============================================================================
// Handler Registration
// ============================================================================

export function registerFeatureHandlers(ctx: ServerContext): void {
  ctx.connection.onCompletion((params) => handleCompletion(ctx, params));
  ctx.connection.onHover((params) => handleHover(ctx, params));
  ctx.connection.onDefinition((params) => handleDefinition(ctx, params));
  ctx.connection.onReferences((params) => handleReferences(ctx, params));
  ctx.connection.onDocumentHighlight((params) => handleDocumentHighlight(ctx, params));
  ctx.connection.onPrepareRename((params) => handlePrepareRename(ctx, params));
  ctx.connection.onRenameRequest((params) => handleRename(ctx, params));
  ctx.connection.onCodeAction((params) => handleCodeAction(ctx, params));
  ctx.connection.onDocumentSymbol((params) => handleDocumentSymbols(ctx, params));
  ctx.connection.onWorkspaceSymbol((params) => handleWorkspaceSymbols(ctx, params));
  ctx.connection.onCodeLens((params) => handleCodeLens(ctx, params));
  ctx.connection.onSelectionRanges((params) => handleSelectionRanges(ctx, params));
  ctx.connection.languages.onLinkedEditingRange((params) => handleLinkedEditingRange(ctx, params));
  ctx.connection.onFoldingRanges((params) => handleFoldingRanges(ctx, params));

  // Inlay hints — binding mode resolution
  ctx.connection.languages.inlayHint.on((params) => handleInlayHintsRequest(ctx, params));


  ctx.connection.onRequest(SemanticTokensRequest.type, async (params) => {
    try {
      return await handleSemanticTokensFull(ctx, params) ?? { data: [] };
    } catch (error) {
      const response = degradationFromError("semanticTokens", error);
      logDegradation(ctx, "semanticTokens", response, params.textDocument.uri);
      return { data: [] };
    }
  });
}

export { SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";
