/**
 * Linked editing for paired template tag names.
 *
 * This is intentionally narrow: semantic-runtime proves the active HTML
 * element and exact authored open/close tag-name spans; the LSP adapter only
 * validates and projects them.
 */
import {
  type LinkedEditingRangeParams,
  type LinkedEditingRanges,
  type Range,
} from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
  SemanticTemplateCursorInfoResult,
} from "@aurelia-ls/semantic-runtime";
import type { SemanticSourceReference } from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import {
  semanticSourceOffsetRangeForDocument,
  semanticSourceReferenceMatchesDocument,
} from "../mapping/source-locations.js";
import type { SemanticRuntimeLspOperation } from "../runtime/semantic-runtime-session.js";
import { isTemplateDocument } from "../utils/document-kind.js";

interface OffsetRange {
  readonly start: number;
  readonly end: number;
}

export async function handleLinkedEditingRange(
  ctx: ServerContext,
  params: LinkedEditingRangeParams,
  operation: SemanticRuntimeLspOperation,
): Promise<LinkedEditingRanges | null> {
  const doc = operation.documents.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  const answer = await operation.templateCursorInfo(
    doc,
    params.position,
  );
  return linkedEditingRangesForCursor(ctx, doc, params.position, answer.value);
}

function linkedEditingRangesForCursor(
  ctx: ServerContext,
  doc: TextDocument,
  position: { line: number; character: number },
  value: SemanticTemplateCursorInfoResult,
): LinkedEditingRanges | null {
  const open = exactOffsetRangeForDocument(ctx, doc, value.html.tagNameSource);
  const close = exactOffsetRangeForDocument(ctx, doc, value.html.closingTagNameSource);
  if (open == null || close == null) return null;

  const cursorOffset = doc.offsetAt(position);
  if (!containsOffset(open, cursorOffset) && !containsOffset(close, cursorOffset)) {
    return null;
  }

  return {
    ranges: [
      offsetRangeToLspRange(doc, open),
      offsetRangeToLspRange(doc, close),
    ],
    wordPattern: "[-_A-Za-z0-9]+",
  };
}

function exactOffsetRangeForDocument(
  ctx: ServerContext,
  doc: TextDocument,
  source: SemanticSourceReference | null,
): OffsetRange | null {
  if (!semanticSourceReferenceMatchesDocument(source, ctx.documentUris, doc.uri)) return null;
  const range = semanticSourceOffsetRangeForDocument(source, doc);
  return range != null && range.end > range.start ? range : null;
}

function offsetRangeToLspRange(doc: TextDocument, range: OffsetRange): Range {
  return {
    start: doc.positionAt(range.start),
    end: doc.positionAt(range.end),
  };
}

function containsOffset(range: OffsetRange, offset: number): boolean {
  return range.start <= offset && offset <= range.end;
}
