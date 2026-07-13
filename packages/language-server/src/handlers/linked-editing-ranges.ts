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
import {
  logIfSemanticRuntimeRequestAborted,
} from "./request-guard.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";
import { isTemplateDocument } from "../utils/document-kind.js";

interface OffsetRange {
  readonly start: number;
  readonly end: number;
}

export async function handleLinkedEditingRange(
  ctx: ServerContext,
  params: LinkedEditingRangeParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<LinkedEditingRanges | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  try {
    const answer = await ctx.semanticRuntime.templateCursorInfo(
      doc,
      params.position,
      guard,
    );
    return linkedEditingRangesForCursor(ctx, doc, params.position, answer.value);
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "linkedEditingRange", e, params.textDocument.uri)) {
      return null;
    }
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`[linkedEditingRange] failed for ${params.textDocument.uri}: ${message}`);
    return null;
  }
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
  if (!semanticSourceReferenceMatchesDocument(source, ctx.workspaceRoot, doc.uri)) return null;
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
