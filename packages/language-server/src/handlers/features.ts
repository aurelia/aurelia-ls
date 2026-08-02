/**
 * LSP feature handlers: completions, hover, definition, references, rename, code actions.
 *
 * Runtime-retargeted features call semantic-runtime through the LSP session.
 * Runtime-backed handlers preserve ordinary semantic absence and let the
 * shared request boundary classify cancellation, staleness, and failure.
 */
import {
  ResponseError,
  LSPErrorCodes,
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
} from "vscode-languageserver/node";
import type { ServerContext } from "../context.js";
import { handleDocumentSymbols } from "./document-symbols.js";
import { handleWorkspaceSymbols } from "./workspace-symbols.js";
import { handleSelectionRanges } from "./selection-ranges.js";
import { handleLinkedEditingRange } from "./linked-editing-ranges.js";
import { handleFoldingRanges } from "./folding-ranges.js";
import { handleInlayHints } from "./inlay-hints.js";
import {
  mapSemanticRuntimeTemplateCodeActions,
  mapSemanticRuntimeUnresolvedTemplateCodeActions,
  mapSemanticRuntimeTemplateDefinition,
  mapSemanticRuntimeTemplateHover,
  mapSemanticRuntimeTemplateCompletions,
  mapSemanticRuntimeTemplateReferences,
  mapSemanticRuntimeTemplatePrepareRename,
  mapSemanticRuntimeTemplateRenameEdit,
  mapSemanticRuntimeRouteNodeDefinition,
  semanticRuntimeTemplateCodeActionIdentityFromData,
  semanticRuntimeTemplateCodeActionResolveData,
  type LookupTextFn,
} from "../mapping/lsp-types.js";
import { handleSemanticTokensFull } from "./semantic-tokens.js";
import {
  runSemanticRuntimeRequest,
} from "./request-guard.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";
import { isTemplateDocument } from "../utils/document-kind.js";

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

  const response = await ctx.semanticRuntime.templateCompletions(
    doc,
    params.position,
    guard,
  );
  if (response.coverage !== "complete" || response.value.missingInputs.length > 0) {
    ctx.logger.info(
      `[completion] semantic coverage is ${response.coverage}; missing inputs: ${response.value.missingInputs.join(", ") || "none"}`,
    );
  }
  return mapSemanticRuntimeTemplateCompletions(response);
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

  const response = await ctx.semanticRuntime.templateCursorInfo(
    doc,
    params.position,
    guard,
  );
  return mapSemanticRuntimeTemplateHover(response);
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
  const response = await ctx.semanticRuntime.templateCursorInfo(
    doc,
    params.position,
    guard,
  );
  const templateDefinition = mapSemanticRuntimeTemplateDefinition(response, lookupText, {
    documentUris: ctx.documentUris,
    originDocument: doc,
  });
  if (templateDefinition != null) {
    return templateDefinition;
  }

  const routeNodes = await ctx.semanticRuntime.routeNodes(guard);
  return mapSemanticRuntimeRouteNodeDefinition(routeNodes, lookupText, {
    documentUris: ctx.documentUris,
    originDocument: doc,
    position: params.position,
  });
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
  const response = await ctx.semanticRuntime.templateReferences(
    doc,
    params.position,
    params.context.includeDeclaration,
    guard,
  );
  const mapping = mapSemanticRuntimeTemplateReferences(response, lookupText, {
    documentUris: ctx.documentUris,
    originDocument: doc,
    scope: "workspace",
  });
  if (mapping.failures.length > 0) {
    ctx.logger.warn(`[references] omitted source-backed rows: ${mapping.failures.join(" ")}`);
  }
  const candidateCount = response.value.candidateRows.length;
  if (candidateCount > 0 || mapping.failures.length > 0) {
    await ctx.connection.sendNotification("window/showMessage", {
      type: mapping.failures.length > 0 ? MessageType.Warning : MessageType.Info,
      message: referenceCoverageMessage(
        mapping.value?.length ?? 0,
        candidateCount,
        mapping.failures.length,
      ),
    });
  }
  return mapping.value;
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
  const response = await ctx.semanticRuntime.templateReferences(
    doc,
    params.position,
    true,
    guard,
  );
  const mapping = mapSemanticRuntimeTemplateReferences(response, lookupText, {
    documentUris: ctx.documentUris,
    originDocument: doc,
    scope: "origin-document",
  });
  if (mapping.failures.length > 0) {
    ctx.logger.warn(`[documentHighlight] omitted source-backed rows: ${mapping.failures.join(" ")}`);
  }
  const locations = mapping.value;
  if (!locations) return null;

  const originUri = ctx.documentUris.resolve(doc.uri).uri;
  const highlights = locations
    .filter((location) => ctx.documentUris.sameDocument(location.uri, originUri))
    .map((location): DocumentHighlight => ({
      range: location.range,
      kind: DocumentHighlightKind.Text,
    }));

  return highlights.length > 0 ? highlights : null;
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

  return ctx.semanticRuntime.templateRename(doc, params.position, guard).then((response) => {
    if (response.value.status !== "available") {
      return null;
    }
    return mapSemanticRuntimeTemplatePrepareRename(response, {
      documentUris: ctx.documentUris,
      originDocument: doc,
    });
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

  const response = await ctx.semanticRuntime.templateRename(
    doc,
    params.position,
    guard,
    params.newName,
  );
  if (response.value.status !== "available") {
    throw new ResponseError(LSPErrorCodes.RequestFailed, response.value.displayText || response.summary);
  }
  const mapping = mapSemanticRuntimeTemplateRenameEdit(response, (uri) => ctx.lookupDocumentSnapshot(uri), {
    documentUris: ctx.documentUris,
    originDocument: doc,
  });
  if (mapping.edit == null) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
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
}

function candidateRenameMessage(verifiedEditCount: number, candidateCount: number): string {
  const editNoun = verifiedEditCount === 1 ? "edit" : "edits";
  const candidateNoun = candidateCount === 1 ? "usage" : "usages";
  return `Aurelia rename prepared ${verifiedEditCount} verified ${editNoun}; ${candidateCount} same-name ${candidateNoun} could not be verified and were left unchanged.`;
}

function referenceCoverageMessage(
  verifiedLocationCount: number,
  candidateCount: number,
  mappingFailureCount: number,
): string {
  const qualifications: string[] = [];
  if (candidateCount > 0) {
    qualifications.push(
      `${candidateCount} same-name ${candidateCount === 1 ? "usage could" : "usages could"} not be verified`,
    );
  }
  if (mappingFailureCount > 0) {
    qualifications.push(
      `${mappingFailureCount} source-backed ${mappingFailureCount === 1 ? "reference could" : "references could"} not be mapped`,
    );
  }
  return `Aurelia found ${verifiedLocationCount} verified ${verifiedLocationCount === 1 ? "reference" : "references"}; ${qualifications.join("; ")}.`;
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

  const response = await ctx.semanticRuntime.templateCodeActions(
    doc,
    params.range.start,
    guard,
  );
  const mappingOptions = {
    documentUris: ctx.documentUris,
    originDocument: doc,
    diagnostics: params.context.diagnostics,
    onMappingFailure: (row: { readonly title: string }, failures: readonly string[]) => {
      ctx.logger.warn(`[codeAction] skipped unsafe code action "${row.title}": ${failures.join(" ")}`);
    },
  };
  return ctx.clientSupportsCodeActionResolveEdit
    ? mapSemanticRuntimeUnresolvedTemplateCodeActions(response, (uri) => ctx.lookupDocumentSnapshot(uri), {
        ...mappingOptions,
        position: params.range.start,
      })
    : mapSemanticRuntimeTemplateCodeActions(response, (uri) => ctx.lookupDocumentSnapshot(uri), mappingOptions);
}

export async function handleCodeActionResolve(
  ctx: ServerContext,
  action: CodeAction,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<CodeAction> {
  const resolve = semanticRuntimeTemplateCodeActionResolveData(action.data);
  if (resolve == null) {
    return action;
  }
  const doc = ctx.ensureProgramDocument(resolve.textDocument.uri);
  if (doc == null || !isTemplateDocument(doc)) {
    ctx.logger.warn(`[codeAction/resolve] source document is no longer available: ${resolve.textDocument.uri}`);
    return action;
  }

  const response = await ctx.semanticRuntime.templateCodeActions(doc, resolve.position, guard);
  const candidates = mapSemanticRuntimeTemplateCodeActions(
    response,
    (uri) => ctx.lookupDocumentSnapshot(uri),
    {
      documentUris: ctx.documentUris,
      originDocument: doc,
      diagnostics: action.diagnostics,
      onMappingFailure: (row, failures) => {
        ctx.logger.warn(`[codeAction/resolve] skipped unsafe code action "${row.title}": ${failures.join(" ")}`);
      },
    },
  ) ?? [];
  const matches = candidates.filter((candidate) =>
    semanticRuntimeTemplateCodeActionIdentityFromData(candidate.data) === resolve.actionIdentity
  );
  if (matches.length !== 1 || matches[0]?.edit == null) {
    ctx.logger.warn(
      `[codeAction/resolve] action is no longer uniquely applicable: ${action.title} (${matches.length} current matches)`,
    );
    return action;
  }
  return {
    ...action,
    edit: matches[0].edit,
  };
}

// ============================================================================
// Handler Registration
// ============================================================================

export function registerFeatureHandlers(ctx: ServerContext): void {
  ctx.connection.onCompletion((params, token) => request(ctx, "completion", token, params.textDocument.uri,
    (guard) => handleCompletion(ctx, params, guard)));
  ctx.connection.onHover((params, token) => request(ctx, "hover", token, params.textDocument.uri,
    (guard) => handleHover(ctx, params, guard)));
  ctx.connection.onDefinition((params, token) => request(ctx, "definition", token, params.textDocument.uri,
    (guard) => handleDefinition(ctx, params, guard)));
  ctx.connection.onReferences((params, token) => request(ctx, "references", token, params.textDocument.uri,
    (guard) => handleReferences(ctx, params, guard)));
  ctx.connection.onDocumentHighlight((params, token) => request(ctx, "documentHighlight", token, params.textDocument.uri,
    (guard) => handleDocumentHighlight(ctx, params, guard)));
  ctx.connection.onPrepareRename((params, token) => request(ctx, "prepareRename", token, params.textDocument.uri,
    (guard) => handlePrepareRename(ctx, params, guard)));
  ctx.connection.onRenameRequest((params, token) => request(ctx, "rename", token, params.textDocument.uri,
    (guard) => handleRename(ctx, params, guard)));
  ctx.connection.onCodeAction((params, token) => request(ctx, "codeAction", token, params.textDocument.uri,
    (guard) => handleCodeAction(ctx, params, guard)));
  ctx.connection.onCodeActionResolve((action, token) => request(ctx, "codeAction/resolve", token, undefined,
    (guard) => handleCodeActionResolve(ctx, action, guard)));
  ctx.connection.onDocumentSymbol((params, token) => request(ctx, "documentSymbol", token, params.textDocument.uri,
    (guard) => handleDocumentSymbols(ctx, params, guard)));
  ctx.connection.onWorkspaceSymbol((params, token) => request(ctx, "workspaceSymbol", token, undefined,
    (guard) => handleWorkspaceSymbols(ctx, params, guard)));
  ctx.connection.onSelectionRanges((params, token) => request(ctx, "selectionRange", token, params.textDocument.uri,
    (guard) => handleSelectionRanges(ctx, params, guard)));
  ctx.connection.languages.onLinkedEditingRange((params, token) => request(ctx, "linkedEditingRange", token, params.textDocument.uri,
    (guard) => handleLinkedEditingRange(ctx, params, guard)));
  ctx.connection.onFoldingRanges((params, token) => request(ctx, "foldingRange", token, params.textDocument.uri,
    (guard) => handleFoldingRanges(ctx, params, guard)));

  // Inlay hints — binding mode resolution
  ctx.connection.languages.inlayHint.on((params, token) => request(ctx, "inlayHints", token, params.textDocument.uri,
    (guard) => handleInlayHints(ctx, params, guard)));


  ctx.connection.onRequest(SemanticTokensRequest.type, (params, token) =>
    request(ctx, "semanticTokens", token, params.textDocument.uri,
      async (guard) => await handleSemanticTokensFull(ctx, params, guard) ?? { data: [] }));
}

function request<T>(
  ctx: ServerContext,
  feature: string,
  token: CancellationToken,
  uri: string | undefined,
  handler: (guard: SemanticRuntimeLspRequestGuard) => T | Promise<T>,
): Promise<T> {
  return runSemanticRuntimeRequest(ctx, feature, token, handler, uri);
}

export { SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";
