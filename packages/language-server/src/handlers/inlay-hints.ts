/**
 * Inlay hints for Aurelia templates.
 *
 * Shows resolved binding modes inline — e.g., `.bind` resolves to `toView`
 * based on the target bindable's declared mode. This surfaces knowledge the
 * system has (how `.bind` resolves for each specific bindable) that the
 * developer would otherwise need to look up manually.
 *
 * Only shows hints where the resolution is non-obvious:
 * - `.bind` → shows the resolved mode (toView, twoWay, etc.)
 * - `.two-way`, `.to-view`, `.from-view`, `.one-time` → no hint (mode is explicit)
 * - `effectiveMode === 'default'` → no hint (unresolved, nothing useful to show)
 */
import {
  InlayHintKind,
  LSPErrorCodes,
  ResponseError,
  type InlayHint,
  type InlayHintParams,
} from "vscode-languageserver/node";
import {
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  SemanticTemplateInlayHintKind,
  semanticExactSourceReference,
  type SemanticRuntimeAnswer,
  type SemanticTemplateInlayHintsResult,
  type SemanticTemplateInlayHintRow,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import {
  semanticSourceOffsetRangeForDocument,
  semanticSourceReferenceMatchesDocument,
} from "../mapping/source-locations.js";
import type { SemanticRuntimeLspOperation } from "../runtime/semantic-runtime-session.js";
import { isTemplateDocument } from "../utils/document-kind.js";

export async function handleInlayHints(
  ctx: ServerContext,
  params: InlayHintParams,
  operation: SemanticRuntimeLspOperation,
): Promise<InlayHint[] | null> {
  const uri = params.textDocument.uri;
  const doc = operation.documents.ensureProgramDocument(uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  const answer = await operation.templateInlayHints(doc);
  assertCompleteInlayHintAnswer(answer);
  const hints = answer.value.rows
    .map((row) => mapSemanticRuntimeTemplateInlayHint(row, doc, params, ctx))
    .filter((hint): hint is InlayHint => hint != null);

  return hints.length > 0 ? hints : null;
}

/** Pull resource-scoped presentation policy before admitting managed semantic work. */
export async function bindingModeInlayHintsEnabled(
  ctx: ServerContext,
  uri: string,
): Promise<boolean> {
  if (!ctx.clientSupport.configurationPull) return false;
  try {
    const value = await ctx.connection.workspace.getConfiguration({
      scopeUri: uri,
      section: "aurelia.inlayHints.bindingMode",
    }) as unknown;
    return value === true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.logger.warn(`[inlayHints] resource configuration unavailable for ${uri}: ${message}`);
    return false;
  }
}

function mapSemanticRuntimeTemplateInlayHint(
  row: SemanticTemplateInlayHintRow,
  doc: {
    readonly uri: string;
    readonly getText: () => string;
    readonly positionAt: (offset: number) => { line: number; character: number };
  },
  params: InlayHintParams,
  ctx: ServerContext,
): InlayHint | null {
  switch (row.hintKind) {
    case SemanticTemplateInlayHintKind.BindingModeResolution:
      break;
    default:
      throw inlayHintRequestFailure(
        `semantic row uses unsupported hint kind ${JSON.stringify(row.hintKind)}.`,
      );
  }
  const exactSource = semanticExactSourceReference(row.source);
  if (exactSource == null) {
    throw inlayHintRequestFailure("semantic row has no exact authored insertion anchor.");
  }
  if (!semanticSourceReferenceMatchesDocument(exactSource, ctx.documentUris, doc.uri)) {
    throw inlayHintRequestFailure("semantic row does not target the requesting document.");
  }
  const source = semanticSourceOffsetRangeForDocument(exactSource, doc);
  if (source == null) {
    throw inlayHintRequestFailure("semantic row insertion anchor is outside the current document text.");
  }
  const position = doc.positionAt(source.end);
  if (!positionIsWithinRange(position, params.range)) {
    return null;
  }
  return {
    position,
    label: `: ${row.effectiveModeLabel}`,
    kind: InlayHintKind.Type,
    paddingLeft: false,
    paddingRight: true,
  };
}

function assertCompleteInlayHintAnswer(
  answer: SemanticRuntimeAnswer<SemanticTemplateInlayHintsResult>,
): void {
  if (
    answer.result !== SemanticRuntimeAnswerResult.Answered
    || answer.selection !== SemanticRuntimeAnswerSelection.NotApplicable
    || answer.coverage !== SemanticRuntimeAnswerCoverage.Complete
  ) {
    throw inlayHintRequestFailure(
      `semantic runtime returned result=${answer.result}; selection=${answer.selection}; coverage=${answer.coverage}.`,
    );
  }
}

function inlayHintRequestFailure(detail: string): ResponseError<unknown> {
  return new ResponseError(
    LSPErrorCodes.RequestFailed,
    `Aurelia inlay hint mapping was blocked: ${detail}`,
  );
}

function positionIsWithinRange(
  position: { readonly line: number; readonly character: number },
  range: InlayHintParams["range"],
): boolean {
  return comparePositions(position, range.start) >= 0
    && comparePositions(position, range.end) < 0;
}

function comparePositions(
  left: { readonly line: number; readonly character: number },
  right: { readonly line: number; readonly character: number },
): number {
  return left.line - right.line || left.character - right.character;
}
