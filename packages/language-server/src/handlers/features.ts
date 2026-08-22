/**
 * LSP feature handlers: completions, hover, definition, references, rename, code actions.
 *
 * Runtime-retargeted features call semantic-runtime through the LSP session.
 * Runtime-backed handlers preserve ordinary semantic absence and let the
 * shared request boundary classify cancellation, staleness, and failure.
 */
import {
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
} from "@aurelia-ls/semantic-runtime";
import {
  CodeActionKind,
  CodeActionTriggerKind,
  ResponseError,
  LSPErrorCodes,
  SemanticTokensRequest,
  type SemanticTokens,
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
import {
  bindingModeInlayHintsEnabled,
  handleInlayHints,
} from "./inlay-hints.js";
import {
  codeActionKindMatchesOnly,
  mapFrameworkCapabilityExplanationCodeActions,
  mapSemanticRuntimeTemplateCodeActions,
  mapSemanticRuntimeUnresolvedTemplateCodeActions,
  mapSemanticRuntimeTemplateDefinition,
  mapSemanticRuntimeTemplateHover,
  mapSemanticRuntimeTemplateCompletions,
  mapSemanticRuntimeTemplateReferences,
  mapSemanticRuntimeTemplateRenameCandidates,
  mapSemanticRuntimeTemplatePrepareRename,
  mapSemanticRuntimeTemplateRenameEdit,
  semanticRuntimeTemplateCodeActionIdentityFromData,
  semanticRuntimeTemplateCodeActionResolveData,
  withSemanticRuntimeTemplateCodeActionResolveRefusal,
  type LookupTextFn,
} from "../mapping/lsp-types.js";
import { mapBindingUncertaintyExplanationCodeAction } from "../mapping/binding-uncertainty-explanation.js";
import { mapAttributeInterpretationExplanationCodeAction } from "../mapping/attribute-interpretation-explanation.js";
import {
  templateCodeActionResolveRefusal,
  type RenameCandidateRefusalData,
  type TemplateCodeActionResolveRefusalKind,
} from "../protocol.js";
import { handleSemanticTokensFull } from "./semantic-tokens.js";
import {
  runSemanticRuntimeDocumentRequest,
  runSemanticRuntimeRequest,
} from "./request-guard.js";
import type { SemanticRuntimeLspOperation } from "../runtime/semantic-runtime-session.js";
import { isTemplateDocument } from "../utils/document-kind.js";

// ============================================================================
// Completion Handler
// ============================================================================

export async function handleCompletion(
  ctx: ServerContext,
  params: CompletionParams,
  operation: SemanticRuntimeLspOperation,
): Promise<CompletionList> {
  const doc = operation.documents.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return { isIncomplete: false, items: [] };
  if (!isTemplateDocument(doc)) return { isIncomplete: false, items: [] };

  const response = await operation.templateCompletions(
    doc.uri,
    params.position,
  );
  const mapping = mapSemanticRuntimeTemplateCompletions(response, {
    documentUris: ctx.documentUris,
    originDocument: doc,
  });
  if (mapping.value == null) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      `Aurelia completion edit mapping was blocked: ${mapping.failures.join(" ")}`,
    );
  }
  if (
    response.coverage !== SemanticRuntimeAnswerCoverage.Complete
    || response.value.missingInputs.length > 0
  ) {
    operation.deferEffect({
      kind: "log",
      level: "info",
      message: `[completion] semantic coverage is ${response.coverage}; missing inputs: ${response.value.missingInputs.join(", ") || "none"}`,
    });
  }
  return mapping.value;
}

// ============================================================================
// Hover Handler
// ============================================================================

export async function handleHover(
  ctx: ServerContext,
  params: TextDocumentPositionParams,
  operation: SemanticRuntimeLspOperation,
): Promise<Hover | null> {
  const doc = operation.documents.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  const response = await operation.templateCursorInfo(
    doc.uri,
    params.position,
  );
  const mapping = mapSemanticRuntimeTemplateHover(response, {
    documentUris: ctx.documentUris,
    originDocument: doc,
  });
  if (mapping.failures.length > 0) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      `Aurelia hover mapping was blocked: ${mapping.failures.join(" ")}`,
    );
  }
  return mapping.value;
}

// ============================================================================
// Definition Handler
// ============================================================================

export async function handleDefinition(
  ctx: ServerContext,
  params: TextDocumentPositionParams,
  operation: SemanticRuntimeLspOperation,
): Promise<Definition | LocationLink[] | null> {
  const doc = operation.documents.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  const lookupText: LookupTextFn = (uri) => operation.documents.lookupText(uri);
  const response = await operation.templateCursorInfo(
    doc.uri,
    params.position,
  );
  const mapping = mapSemanticRuntimeTemplateDefinition(response, lookupText, {
    documentUris: ctx.documentUris,
    originDocument: doc,
  });
  if (mapping.failures.length > 0) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      `Aurelia definition mapping was blocked: ${mapping.failures.join(" ")}`,
    );
  }
  return mapping.value;
}

// ============================================================================
// References Handler
// ============================================================================

export async function handleReferences(
  ctx: ServerContext,
  params: ReferenceParams,
  operation: SemanticRuntimeLspOperation,
): Promise<Location[] | null> {
  const doc = operation.documents.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  const lookupText: LookupTextFn = (uri) => operation.documents.lookupText(uri);
  const response = await operation.templateReferences(
    doc.uri,
    params.position,
    params.context.includeDeclaration,
  );
  const mapping = mapSemanticRuntimeTemplateReferences(response, lookupText, {
    documentUris: ctx.documentUris,
    originDocument: doc,
    scope: "workspace",
  });
  if (response.result !== SemanticRuntimeAnswerResult.Answered) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      `Aurelia references mapping was blocked: ${mapping.failures.join(" ")}`,
    );
  }
  if (mapping.failures.length > 0) {
    operation.deferEffect({
      kind: "log",
      level: "warn",
      message: `[references] omitted source-backed rows: ${mapping.failures.join(" ")}`,
    });
  }
  const candidateCount = response.value.candidateRows.length;
  const coverageOpen = response.coverage !== SemanticRuntimeAnswerCoverage.Complete;
  if (coverageOpen || candidateCount > 0 || mapping.failures.length > 0) {
    operation.deferEffect({
      kind: "show-message",
      type: mapping.failures.length > 0 ? MessageType.Warning : MessageType.Info,
      message: referenceCoverageMessage(
        mapping.value?.length ?? 0,
        candidateCount,
        mapping.failures.length,
        coverageOpen,
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
  operation: SemanticRuntimeLspOperation,
): Promise<DocumentHighlight[] | null> {
  const doc = operation.documents.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  const lookupText: LookupTextFn = (uri) => operation.documents.lookupText(uri);
  const response = await operation.templateReferences(
    doc.uri,
    params.position,
    true,
  );
  const mapping = mapSemanticRuntimeTemplateReferences(response, lookupText, {
    documentUris: ctx.documentUris,
    originDocument: doc,
    scope: "origin-document",
  });
  if (response.result !== SemanticRuntimeAnswerResult.Answered) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      `Aurelia document highlight mapping was blocked: ${mapping.failures.join(" ")}`,
    );
  }
  if (mapping.failures.length > 0) {
    operation.deferEffect({
      kind: "log",
      level: "warn",
      message: `[documentHighlight] omitted source-backed rows: ${mapping.failures.join(" ")}`,
    });
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
  operation: SemanticRuntimeLspOperation,
): Promise<{ range: Range; placeholder: string } | null> {
  const doc = operation.documents.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return Promise.resolve(null);
  if (!isTemplateDocument(doc)) return Promise.resolve(null);

  return operation.templateRename(doc.uri, params.position).then((response) => {
    if (response.value.status !== "available") {
      if (response.value.reason === "unresolved-candidates") {
        const candidateMapping = mapSemanticRuntimeTemplateRenameCandidates(
          response,
          (uri) => operation.documents.lookupText(uri),
          { documentUris: ctx.documentUris, originDocument: doc },
        );
        throw renameCandidateResponseError(
          response.value.displayText || response.summary,
          response.value.reason,
          candidateMapping,
        );
      }
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
  operation: SemanticRuntimeLspOperation,
): Promise<WorkspaceEdit | null> {
  const doc = operation.documents.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  const response = await operation.templateRename(
    doc.uri,
    params.position,
    params.newName,
  );
  if (response.value.status !== "available") {
    const candidateMapping = mapSemanticRuntimeTemplateRenameCandidates(
      response,
      (uri) => operation.documents.lookupText(uri),
      { documentUris: ctx.documentUris, originDocument: doc },
    );
    throw renameCandidateResponseError(
      response.value.displayText || response.summary,
      response.value.reason,
      candidateMapping,
    );
  }
  const mapping = mapSemanticRuntimeTemplateRenameEdit(response, (uri) => operation.documents.lookupDocumentSnapshot(uri), {
    documentUris: ctx.documentUris,
    originDocument: doc,
  });
  if (mapping.edit == null) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      `Rename to '${params.newName}' was blocked: ${mapping.failures.join(" ")}`,
    );
  }
  return mapping.edit;
}

function renameCandidateResponseError(
  message: string,
  reason: string | null,
  mapping: ReturnType<typeof mapSemanticRuntimeTemplateRenameCandidates>,
): ResponseError<RenameCandidateRefusalData> {
  const data: RenameCandidateRefusalData = {
    reason,
    candidates: mapping.value,
    mappingFailures: mapping.failures,
  };
  return Object.assign(
    new ResponseError<RenameCandidateRefusalData>(LSPErrorCodes.RequestFailed, message),
    { data },
  );
}

function referenceCoverageMessage(
  verifiedLocationCount: number,
  candidateCount: number,
  mappingFailureCount: number,
  coverageOpen: boolean,
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
  if (coverageOpen && candidateCount === 0) {
    qualifications.push("full reference coverage could not be proven");
  }
  return `Aurelia found ${verifiedLocationCount} verified ${verifiedLocationCount === 1 ? "reference" : "references"}; ${qualifications.join("; ")}.`;
}

// ============================================================================
// Code Action Handler
// ============================================================================

export async function handleCodeAction(
  ctx: ServerContext,
  params: CodeActionParams,
  operation: SemanticRuntimeLspOperation,
): Promise<CodeAction[] | null> {
  if (!codeActionKindMatchesOnly(CodeActionKind.QuickFix, params.context.only)) {
    return null;
  }
  const doc = operation.documents.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  const response = await operation.templateCodeActions(
    doc.uri,
    params.range.start,
  );
  const mappingOptions = {
    documentUris: ctx.documentUris,
    originDocument: doc,
    only: params.context.only,
    diagnostics: params.context.diagnostics,
    onMappingFailure: (row: { readonly title: string }, failures: readonly string[]) => {
      operation.deferEffect({
        kind: "log",
        level: "warn",
        message: `[codeAction] skipped unsafe code action "${row.title}": ${failures.join(" ")}`,
      });
    },
  };
  const repairActions = ctx.clientSupportsCodeActionResolveEdit
    ? mapSemanticRuntimeUnresolvedTemplateCodeActions(response, (uri) => operation.documents.lookupDocumentSnapshot(uri), {
        ...mappingOptions,
        position: params.range.start,
      })
    : mapSemanticRuntimeTemplateCodeActions(response, (uri) => operation.documents.lookupDocumentSnapshot(uri), mappingOptions);
  const explanationActions = mapFrameworkCapabilityExplanationCodeActions(
    params.context.diagnostics,
    doc,
    params.context.only,
  );
  const bindingExplanationAction = params.context.triggerKind === CodeActionTriggerKind.Invoked
    ? mapBindingUncertaintyExplanationCodeAction(
        await operation.bindingUncertaintyExplanation(null, doc.uri, params.range.start),
        doc,
        params.range.start,
        params.context.only,
        {
          documentUris: ctx.documentUris,
          lookupText: (uri) => operation.documents.lookupText(uri),
        },
      )
    : null;
  const attributeExplanationAction = params.context.triggerKind === CodeActionTriggerKind.Invoked
    ? mapAttributeInterpretationExplanationCodeAction(
        await operation.attributeInterpretationExplanation(null, doc.uri, params.range.start),
        doc,
        params.range.start,
        params.context.only,
        {
          documentUris: ctx.documentUris,
          lookupText: (uri) => operation.documents.lookupText(uri),
        },
      )
    : null;
  const actions = [
    ...(repairActions ?? []),
    ...explanationActions,
    ...(bindingExplanationAction == null ? [] : [bindingExplanationAction]),
    ...(attributeExplanationAction == null ? [] : [attributeExplanationAction]),
  ];
  return actions.length === 0 ? null : actions;
}

export async function handleCodeActionResolve(
  ctx: ServerContext,
  action: CodeAction,
  operation: SemanticRuntimeLspOperation,
): Promise<CodeAction> {
  const resolve = semanticRuntimeTemplateCodeActionResolveData(action.data);
  if (resolve == null) {
    return action;
  }
  const doc = operation.documents.ensureProgramDocument(resolve.textDocument.uri);
  if (doc == null || !isTemplateDocument(doc)) {
    operation.deferEffect({
      kind: "log",
      level: "warn",
      message: `[codeAction/resolve] source document is no longer available: ${resolve.textDocument.uri}`,
    });
    return refusedResolvedCodeAction(action, "sourceDocumentUnavailable");
  }

  let requestedPlanMappingFailureCount = 0;
  const response = await operation.templateCodeActions(doc.uri, resolve.position);
  const candidates = mapSemanticRuntimeTemplateCodeActions(
    response,
    (uri) => operation.documents.lookupDocumentSnapshot(uri),
    {
      documentUris: ctx.documentUris,
      originDocument: doc,
      diagnostics: action.diagnostics,
      onMappingFailure: (row, failures, actionIdentity) => {
        if (actionIdentity === resolve.actionIdentity) {
          requestedPlanMappingFailureCount += 1;
        }
        operation.deferEffect({
          kind: "log",
          level: "warn",
          message: `[codeAction/resolve] skipped unsafe code action "${row.title}": ${failures.join(" ")}`,
        });
      },
    },
  ) ?? [];
  const matches = candidates.filter((candidate) =>
    semanticRuntimeTemplateCodeActionIdentityFromData(candidate.data) === resolve.actionIdentity
  );
  const matchingPlanCount = matches.length + requestedPlanMappingFailureCount;
  if (matchingPlanCount !== 1 || matches[0]?.edit == null) {
    operation.deferEffect({
      kind: "log",
      level: "warn",
      message: `[codeAction/resolve] action is no longer uniquely applicable: ${action.title} (${matchingPlanCount} current matching plan(s))`,
    });
    return refusedResolvedCodeAction(
      action,
      matchingPlanCount > 1
        ? "semanticPlanAmbiguous"
        : requestedPlanMappingFailureCount === 1
          ? "editMappingFailed"
          : "semanticPlanNoLongerMatches",
    );
  }
  return {
    ...action,
    edit: matches[0].edit,
  };
}

function refusedResolvedCodeAction(
  action: CodeAction,
  kind: TemplateCodeActionResolveRefusalKind,
): CodeAction {
  return withSemanticRuntimeTemplateCodeActionResolveRefusal(
    action,
    templateCodeActionResolveRefusal(kind),
  );
}

// ============================================================================
// Handler Registration
// ============================================================================

export function registerFeatureHandlers(ctx: ServerContext): void {
  ctx.connection.onCompletion((params, token) => documentRequest(ctx, "completion", token, params.textDocument.uri,
    (): CompletionList => ({ isIncomplete: false, items: [] }),
    (guard) => handleCompletion(ctx, params, guard)));
  ctx.connection.onHover((params, token) => documentRequest(ctx, "hover", token, params.textDocument.uri,
    () => null,
    (guard) => handleHover(ctx, params, guard)));
  ctx.connection.onDefinition((params, token) => documentRequest(ctx, "definition", token, params.textDocument.uri,
    () => null,
    (guard) => handleDefinition(ctx, params, guard)));
  ctx.connection.onReferences((params, token) => documentRequest(ctx, "references", token, params.textDocument.uri,
    () => null,
    (guard) => handleReferences(ctx, params, guard)));
  ctx.connection.onDocumentHighlight((params, token) => documentRequest(ctx, "documentHighlight", token, params.textDocument.uri,
    () => null,
    (guard) => handleDocumentHighlight(ctx, params, guard)));
  ctx.connection.onPrepareRename((params, token) => documentRequest(ctx, "prepareRename", token, params.textDocument.uri,
    () => null,
    (guard) => handlePrepareRename(ctx, params, guard)));
  ctx.connection.onRenameRequest((params, token) => documentRequest(ctx, "rename", token, params.textDocument.uri,
    () => null,
    (guard) => handleRename(ctx, params, guard)));
  ctx.connection.onCodeAction((params, token) => documentRequest(ctx, "codeAction", token, params.textDocument.uri,
    () => null,
    (guard) => handleCodeAction(ctx, params, guard)));
  ctx.connection.onCodeActionResolve((action, token) => {
    const uri = semanticRuntimeTemplateCodeActionResolveData(action.data)?.textDocument.uri;
    return uri == null
      ? request(ctx, "codeAction/resolve", token, undefined, (guard) => handleCodeActionResolve(ctx, action, guard))
      : documentRequest(ctx, "codeAction/resolve", token, uri,
          () => refusedResolvedCodeAction(action, "semanticPlanNoLongerMatches"),
          (guard) => handleCodeActionResolve(ctx, action, guard));
  });
  ctx.connection.onDocumentSymbol((params, token) => documentRequest(ctx, "documentSymbol", token, params.textDocument.uri,
    () => null,
    (guard) => handleDocumentSymbols(ctx, params, guard)));
  ctx.connection.onWorkspaceSymbol((params, token) => request(ctx, "workspaceSymbol", token, undefined,
    (guard) => handleWorkspaceSymbols(ctx, params, guard)));
  ctx.connection.onSelectionRanges((params, token) => documentRequest(ctx, "selectionRange", token, params.textDocument.uri,
    () => null,
    (guard) => handleSelectionRanges(ctx, params, guard)));
  ctx.connection.languages.onLinkedEditingRange((params, token) => documentRequest(ctx, "linkedEditingRange", token, params.textDocument.uri,
    () => null,
    (guard) => handleLinkedEditingRange(ctx, params, guard)));
  ctx.connection.onFoldingRanges((params, token) => documentRequest(ctx, "foldingRange", token, params.textDocument.uri,
    () => null,
    (guard) => handleFoldingRanges(ctx, params, guard)));

  // Inlay hints — binding mode resolution
  ctx.connection.languages.inlayHint.on(async (params, token) => {
    const enabled = await bindingModeInlayHintsEnabled(ctx, params.textDocument.uri);
    if (!enabled && !token.isCancellationRequested) {
      return null;
    }
    return documentRequest(ctx, "inlayHints", token, params.textDocument.uri,
      () => null,
      (operation) => handleInlayHints(ctx, params, operation));
  });


  ctx.connection.onRequest(SemanticTokensRequest.type, (params, token) =>
    documentRequest(ctx, "semanticTokens", token, params.textDocument.uri,
      (): SemanticTokens => ({ data: [] }),
      async (guard) => await handleSemanticTokensFull(ctx, params, guard) ?? { data: [] }));
}

function documentRequest<T>(
  ctx: ServerContext,
  feature: string,
  token: CancellationToken,
  uri: string,
  whenNotAuthored: (operation: SemanticRuntimeLspOperation) => T | Promise<T>,
  handler: (operation: SemanticRuntimeLspOperation) => T | Promise<T>,
): Promise<T> {
  return runSemanticRuntimeDocumentRequest(
    ctx,
    feature,
    token,
    uri,
    whenNotAuthored,
    handler,
  );
}

function request<T>(
  ctx: ServerContext,
  feature: string,
  token: CancellationToken,
  uri: string | undefined,
  handler: (operation: SemanticRuntimeLspOperation) => T | Promise<T>,
): Promise<T> {
  return runSemanticRuntimeRequest(ctx, feature, token, handler, uri);
}

export { SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";
