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
  type Range,
  DocumentHighlightKind,
  type DocumentHighlight,
  type TextDocumentPositionParams,
  type ReferenceParams,
  type RenameParams,
  type PrepareRenameParams,
  type CodeActionParams,
  type CompletionParams,
  type CancellationToken,
  MessageType,
} from "vscode-languageserver/node.js";
import type { ServerContext } from "../context.js";
import { handleDocumentSymbols } from "./document-symbols.js";
import { handleWorkspaceSymbols } from "./workspace-symbols.js";
import { handleSelectionRanges } from "./selection-ranges.js";
import { handleLinkedEditingRange } from "./linked-editing-ranges.js";
import { handleFoldingRanges } from "./folding-ranges.js";
import { handleInlayHints } from "./inlay-hints.js";
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
import { handleSemanticTokensFull } from "./semantic-tokens.js";
import {
  degradationFromError,
  renderDegradationAsHoverMarkdown,
  renderDegradationAsMessage,
  type Degradation,
} from "../feature-response.js";
import {
  logIfSemanticRuntimeRequestAborted,
  semanticRuntimeRequestGuard,
} from "./request-guard.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";
import { isTemplateDocument } from "../utils/document-kind.js";

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

export async function handleCompletion(
  ctx: ServerContext,
  params: CompletionParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<CompletionList> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return { isIncomplete: false, items: [] };
  if (!isTemplateDocument(doc)) return { isIncomplete: false, items: [] };

  try {
    const response = await ctx.semanticRuntime.templateCompletions(
      doc,
      params.position,
      guard,
    );
    return mapSemanticRuntimeTemplateCompletions(response);
  } catch (error) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "completion", error, params.textDocument.uri)) {
      return { isIncomplete: false, items: [] };
    }
    const response = degradationFromError("completion", error);
    logDegradation(ctx, "completion", response, params.textDocument.uri);
    return createCompletionGapMarker([]);
  }
}

// ============================================================================
// Hover Handler
// ============================================================================

export async function handleHover(
  ctx: ServerContext,
  params: TextDocumentPositionParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<Hover | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  try {
    const response = await ctx.semanticRuntime.templateCursorInfo(
      doc,
      params.position,
      guard,
    );
    return mapSemanticRuntimeTemplateHover(response);
  } catch (error) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "hover", error, params.textDocument.uri)) {
      return null;
    }
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
  guard: SemanticRuntimeLspRequestGuard,
): Promise<Definition | LocationLink[] | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);
  try {
    const response = await ctx.semanticRuntime.templateCursorInfo(
      doc,
      params.position,
      guard,
    );
    const templateDefinition = mapSemanticRuntimeTemplateDefinition(response, lookupText, {
      workspaceRoot: ctx.workspaceRoot,
      originDocument: doc,
    });
    if (templateDefinition != null) {
      return templateDefinition;
    }

    try {
      const routeNodes = await ctx.semanticRuntime.routeNodes(guard);
      const routeDefinition = mapSemanticRuntimeRouteNodeDefinition(routeNodes, lookupText, {
        workspaceRoot: ctx.workspaceRoot,
        originDocument: doc,
        position: params.position,
      });
      if (routeDefinition != null) {
        return routeDefinition;
      }
    } catch (error) {
      if (logIfSemanticRuntimeRequestAborted(ctx, "routeDefinition", error, params.textDocument.uri)) {
        return null;
      }
      const response = degradationFromError("routeDefinition", error);
      logDegradation(ctx, "routeDefinition", response, params.textDocument.uri);
    }

    return null;
  } catch (error) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "definition", error, params.textDocument.uri)) {
      return null;
    }
    const response = degradationFromError("definition", error);
    logDegradation(ctx, "definition", response, params.textDocument.uri);
    // Definition can't render explanation text in standard LSP; log and return null
    return null;
  }
}

// ============================================================================
// References Handler
// ============================================================================

export async function handleReferences(
  ctx: ServerContext,
  params: ReferenceParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<Location[] | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);
  try {
    const response = await ctx.semanticRuntime.templateReferences(
      doc,
      params.position,
      params.context.includeDeclaration,
      guard,
    );
    return mapSemanticRuntimeTemplateReferences(response, lookupText, {
      workspaceRoot: ctx.workspaceRoot,
      originDocument: doc,
    });
  } catch (error) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "references", error, params.textDocument.uri)) {
      return null;
    }
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
  guard: SemanticRuntimeLspRequestGuard,
): Promise<DocumentHighlight[] | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);
  try {
    const response = await ctx.semanticRuntime.templateReferences(
      doc,
      params.position,
      true,
      guard,
    );
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
    if (logIfSemanticRuntimeRequestAborted(ctx, "documentHighlight", error, params.textDocument.uri)) {
      return null;
    }
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
  guard: SemanticRuntimeLspRequestGuard,
): Promise<{ range: Range; placeholder: string } | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return Promise.resolve(null);
  if (!isTemplateDocument(doc)) return Promise.resolve(null);

  return ctx.trace.spanAsync("lsp.prepareRename", async () => {
    try {
      const response = await ctx.semanticRuntime.templateRename(doc, params.position, guard);
      if (response.value.status !== "available") {
        return null;
      }
      return mapSemanticRuntimeTemplatePrepareRename(response, {
        workspaceRoot: ctx.workspaceRoot,
        originDocument: doc,
      });
    } catch (e) {
      if (logIfSemanticRuntimeRequestAborted(ctx, "prepareRename", e, params.textDocument.uri)) {
        return null;
      }
      if (e instanceof ResponseError) throw e;
      const d = degradationFromError("prepareRename", e);
      logDegradation(ctx, "prepareRename", d, params.textDocument.uri);
      return null;
    }
  });
}

export async function handleRename(
  ctx: ServerContext,
  params: RenameParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<WorkspaceEdit | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  try {
    const response = await ctx.semanticRuntime.templateRename(
      doc,
      params.position,
      guard,
      params.newName,
    );
    if (response.value.status !== "available") {
      throw new ResponseError(0, response.value.displayText || response.summary);
    }
    const mapping = mapSemanticRuntimeTemplateRenameEdit(response, (uri) => ctx.lookupDocumentSnapshot(uri), {
      workspaceRoot: ctx.workspaceRoot,
      originDocument: doc,
    });
    if (mapping.edit == null) {
      // All-or-nothing: name every unmappable or stale row instead of applying a partial rename.
      throw new ResponseError(
        0,
        `Rename to '${params.newName}' was blocked: ${mapping.failures.join(" ")}`,
      );
    }
    if (response.value.candidateRows.length > 0) {
      await ctx.connection.sendNotification("window/showMessage", {
        type: MessageType.Info,
        message: candidateRenameMessage(response.value.edits.length, response.value.candidateRows.length),
      });
    }
    return mapping.edit;
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "rename", e, params.textDocument.uri)) {
      return null;
    }
    if (e instanceof ResponseError) throw e;
    // Boot doc: Degradation for rename → error response, NOT null
    const d = degradationFromError("rename", e);
    logDegradation(ctx, "rename", d, params.textDocument.uri);
    throw new ResponseError(0, renderDegradationAsMessage(d));
  }
}

function candidateRenameMessage(verifiedEditCount: number, candidateCount: number): string {
  const editNoun = verifiedEditCount === 1 ? "edit" : "edits";
  const candidateNoun = candidateCount === 1 ? "usage" : "usages";
  return `Aurelia rename prepared ${verifiedEditCount} verified ${editNoun}; ${candidateCount} same-name ${candidateNoun} could not be verified and were left unchanged.`;
}

// ============================================================================
// Code Action Handler
// ============================================================================

export async function handleCodeAction(
  ctx: ServerContext,
  params: CodeActionParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<CodeAction[] | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  try {
    const response = await ctx.semanticRuntime.templateCodeActions(
      doc,
      params.range.start,
      guard,
    );
    return mapSemanticRuntimeTemplateCodeActions(response, (uri) => ctx.lookupDocumentSnapshot(uri), {
      workspaceRoot: ctx.workspaceRoot,
      originDocument: doc,
      diagnostics: params.context.diagnostics,
      onMappingFailure: (row, failures) => {
        ctx.logger.warn(`[codeAction] skipped unsafe code action "${row.title}": ${failures.join(" ")}`);
      },
    });
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "codeAction", e, params.textDocument.uri)) {
      return null;
    }
    const d = degradationFromError("codeAction", e);
    logDegradation(ctx, "codeAction", d, params.textDocument.uri);
    return null;
  }
}

// ============================================================================
// Handler Registration
// ============================================================================

export function registerFeatureHandlers(ctx: ServerContext): void {
  ctx.connection.onCompletion((params, token) => handleCompletion(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onHover((params, token) => handleHover(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onDefinition((params, token) => handleDefinition(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onReferences((params, token) => handleReferences(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onDocumentHighlight((params, token) => handleDocumentHighlight(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onPrepareRename((params, token) => handlePrepareRename(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onRenameRequest((params, token) => handleRename(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onCodeAction((params, token) => handleCodeAction(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onDocumentSymbol((params, token) => handleDocumentSymbols(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onWorkspaceSymbol((params, token) => handleWorkspaceSymbols(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onCodeLens((params, token) => handleCodeLens(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onSelectionRanges((params, token) => handleSelectionRanges(ctx, params, requestGuard(ctx, token)));
  ctx.connection.languages.onLinkedEditingRange((params, token) => handleLinkedEditingRange(ctx, params, requestGuard(ctx, token)));
  ctx.connection.onFoldingRanges((params, token) => handleFoldingRanges(ctx, params, requestGuard(ctx, token)));

  // Inlay hints — binding mode resolution
  ctx.connection.languages.inlayHint.on((params, token) => handleInlayHints(ctx, params, requestGuard(ctx, token)));


  ctx.connection.onRequest(SemanticTokensRequest.type, async (params, token) => {
    try {
      return await handleSemanticTokensFull(ctx, params, requestGuard(ctx, token)) ?? { data: [] };
    } catch (error) {
      if (logIfSemanticRuntimeRequestAborted(ctx, "semanticTokens", error, params.textDocument.uri)) {
        return { data: [] };
      }
      const response = degradationFromError("semanticTokens", error);
      logDegradation(ctx, "semanticTokens", response, params.textDocument.uri);
      return { data: [] };
    }
  });
}

function requestGuard(ctx: ServerContext, token: CancellationToken): SemanticRuntimeLspRequestGuard {
  return semanticRuntimeRequestGuard(ctx, token);
}

export { SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";
