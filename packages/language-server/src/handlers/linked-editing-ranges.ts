/**
 * Linked editing for paired template tag names.
 *
 * This is intentionally narrow: semantic-runtime proves the active HTML
 * element and source span; the LSP adapter only locates the authored open and
 * close tag names inside that span.
 */
import path from "node:path";
import {
  type LinkedEditingRangeParams,
  type LinkedEditingRanges,
  type Range,
} from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
  SemanticTemplateCursorInfoResult,
} from "@aurelia-ls/semantic-runtime";
import {
  semanticExactSourceReference,
  type SemanticSourceReference,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import { canonicalDocumentUri, toFileUri } from "../utils/document-uri.js";
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
  const tagName = value.html.tagName;
  if (tagName == null || tagName.length === 0) return null;

  const source = semanticExactSourceReference(value.html.source);
  if (source?.start == null || source.end == null) return null;
  if (!sourceMatchesDocument(ctx.workspaceRoot, source, doc.uri)) return null;

  const text = doc.getText();
  const elementRange = {
    start: clampOffset(source.start, text.length),
    end: clampOffset(source.end, text.length),
  };
  if (elementRange.end <= elementRange.start) return null;

  const pair = tagNamePairRanges(text, elementRange, tagName);
  if (pair == null) return null;

  const cursorOffset = doc.offsetAt(position);
  if (!containsOffset(pair.open, cursorOffset) && !containsOffset(pair.close, cursorOffset)) {
    return null;
  }

  return {
    ranges: [
      offsetRangeToLspRange(doc, pair.open),
      offsetRangeToLspRange(doc, pair.close),
    ],
    wordPattern: "[-_A-Za-z0-9]+",
  };
}

function tagNamePairRanges(
  text: string,
  element: OffsetRange,
  tagName: string,
): { readonly open: OffsetRange; readonly close: OffsetRange } | null {
  const source = text.slice(element.start, element.end);
  const open = openingTagNameRange(source, tagName);
  const close = closingTagNameRange(source, tagName);
  if (open == null || close == null) return null;
  return {
    open: shiftRange(open, element.start),
    close: shiftRange(close, element.start),
  };
}

function openingTagNameRange(source: string, tagName: string): OffsetRange | null {
  const match = new RegExp(`<\\s*${escapeRegExp(tagName)}(?=[\\s>/])`, "i").exec(source);
  if (match == null) return null;
  const nameStart = skipWhitespace(source, match.index + 1);
  const nameEnd = nameStart + tagName.length;
  return sourceMatchesTagName(source, nameStart, nameEnd, tagName)
    ? { start: nameStart, end: nameEnd }
    : null;
}

function closingTagNameRange(source: string, tagName: string): OffsetRange | null {
  const matcher = new RegExp(`<\\/\\s*${escapeRegExp(tagName)}(?=[\\s>])`, "ig");
  let match: RegExpExecArray | null;
  let last: RegExpExecArray | null = null;
  while ((match = matcher.exec(source)) != null) {
    last = match;
  }
  if (last == null) return null;
  const nameStart = skipWhitespace(source, last.index + 2);
  const nameEnd = nameStart + tagName.length;
  return sourceMatchesTagName(source, nameStart, nameEnd, tagName)
    ? { start: nameStart, end: nameEnd }
    : null;
}

function skipWhitespace(source: string, start: number): number {
  let offset = start;
  while (/\s/.test(source.charAt(offset))) {
    offset += 1;
  }
  return offset;
}

function sourceMatchesTagName(
  source: string,
  start: number,
  end: number,
  tagName: string,
): boolean {
  return source.slice(start, end).toLowerCase() === tagName.toLowerCase();
}

function shiftRange(range: OffsetRange, offset: number): OffsetRange {
  return { start: range.start + offset, end: range.end + offset };
}

function offsetRangeToLspRange(doc: TextDocument, range: OffsetRange): Range {
  return {
    start: doc.positionAt(range.start),
    end: doc.positionAt(range.end),
  };
}

function sourceMatchesDocument(
  workspaceRoot: string | null,
  source: SemanticSourceReference,
  documentUri: string,
): boolean {
  const sourcePath = sourceReferencePath(source);
  if (sourcePath == null) return false;
  const uri = sourcePath.startsWith("file:")
    ? sourcePath
    : path.isAbsolute(sourcePath)
      ? toFileUri(sourcePath)
      : workspaceRoot == null
        ? null
        : toFileUri(path.resolve(workspaceRoot, sourcePath));
  return uri != null
    && canonicalDocumentUri(uri).uri === canonicalDocumentUri(documentUri).uri;
}

function sourceReferencePath(source: SemanticSourceReference | null): string | null {
  if (source == null) return null;
  return source.path ?? sourceReferencePath(source.anchor ?? null);
}

function containsOffset(range: OffsetRange, offset: number): boolean {
  return range.start <= offset && offset <= range.end;
}

function clampOffset(offset: number, length: number): number {
  return Math.max(0, Math.min(offset, length));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
