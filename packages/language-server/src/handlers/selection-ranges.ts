/**
 * Semantic selection ranges for Aurelia templates.
 *
 * VS Code uses these for "expand selection". Keep the ladder quiet and
 * source-backed: active token, value site, attribute, node, then template.
 */
import path from "node:path";
import {
  type Position,
  type Range,
  type SelectionRange,
  type SelectionRangeParams,
} from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
  SemanticSourceReference,
  SemanticTemplateCursorInfoResult,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import { canonicalDocumentUri, toFileUri } from "../utils/document-uri.js";

interface OffsetRange {
  readonly start: number;
  readonly end: number;
}

export async function handleSelectionRanges(
  ctx: ServerContext,
  params: SelectionRangeParams,
): Promise<SelectionRange[] | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;

  try {
    const ranges: SelectionRange[] = [];
    for (const position of params.positions) {
      const answer = await ctx.semanticRuntime.templateCursorInfo(doc, position);
      const range = selectionRangeForCursor(ctx, doc, position, answer.value);
      if (range == null) return null;
      ranges.push(range);
    }
    return ranges.length > 0 ? ranges : null;
  } catch (e) {
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`[selectionRange] failed for ${params.textDocument.uri}: ${message}`);
    return null;
  }
}

function selectionRangeForCursor(
  ctx: ServerContext,
  doc: TextDocument,
  position: Position,
  value: SemanticTemplateCursorInfoResult,
): SelectionRange | null {
  const cursorOffset = doc.offsetAt(position);
  const candidates: OffsetRange[] = [];

  const semanticContainer = firstOffsetRange(ctx, doc, [
    value.valueSite?.source ?? null,
    value.memberOwnerType?.source ?? null,
    value.html.attributeSource,
    value.html.source,
    value.template.source,
  ]);
  const token = semanticContainer == null
    ? null
    : identifierRangeAtOffset(doc.getText(), cursorOffset, semanticContainer);
  addCandidate(candidates, token, cursorOffset);

  addSourceCandidate(ctx, doc, candidates, cursorOffset, value.memberOwnerType?.source ?? null);
  addSourceCandidate(ctx, doc, candidates, cursorOffset, value.valueSite?.source ?? null);
  for (const diagnostic of value.diagnostics) {
    addSourceCandidate(ctx, doc, candidates, cursorOffset, diagnostic.source);
  }
  addSourceCandidate(ctx, doc, candidates, cursorOffset, value.html.attributeSource);
  addSourceCandidate(ctx, doc, candidates, cursorOffset, value.html.source);
  addSourceCandidate(ctx, doc, candidates, cursorOffset, value.template.source);

  const chain = buildContainingChain(candidates);
  if (chain.length === 0) return null;

  let current: SelectionRange | undefined;
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    current = {
      range: rangeForOffsets(doc, chain[index]!),
      ...(current == null ? {} : { parent: current }),
    };
  }
  return current ?? null;
}

function firstOffsetRange(
  ctx: ServerContext,
  doc: TextDocument,
  sources: readonly (SemanticSourceReference | null)[],
): OffsetRange | null {
  for (const source of sources) {
    const range = offsetRangeForSource(ctx, doc, source);
    if (range != null) return range;
  }
  return null;
}

function addSourceCandidate(
  ctx: ServerContext,
  doc: TextDocument,
  candidates: OffsetRange[],
  cursorOffset: number,
  source: SemanticSourceReference | null,
): void {
  addCandidate(candidates, offsetRangeForSource(ctx, doc, source), cursorOffset);
}

function addCandidate(
  candidates: OffsetRange[],
  candidate: OffsetRange | null,
  cursorOffset: number,
): void {
  if (candidate == null) return;
  if (!containsOffset(candidate, cursorOffset)) return;
  if (candidate.end <= candidate.start) return;
  if (candidates.some((existing) => sameRange(existing, candidate))) return;
  candidates.push(candidate);
}

function offsetRangeForSource(
  ctx: ServerContext,
  doc: TextDocument,
  source: SemanticSourceReference | null,
): OffsetRange | null {
  const exact = exactSource(source);
  if (exact?.start == null || exact.end == null) return null;
  if (!sourceMatchesDocument(ctx.workspaceRoot, exact, doc.uri)) return null;

  const length = doc.getText().length;
  const start = clampOffset(exact.start, length);
  const end = Math.max(start, clampOffset(exact.end, length));
  return { start, end };
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

function exactSource(source: SemanticSourceReference | null): SemanticSourceReference | null {
  if (source == null) return null;
  if (source.start != null && source.end != null) return source;
  return exactSource(source.anchor ?? null);
}

function identifierRangeAtOffset(
  text: string,
  offset: number,
  container: OffsetRange,
): OffsetRange | null {
  const boundedOffset = Math.max(container.start, Math.min(offset, container.end));
  let probe = boundedOffset;
  if (!isIdentifierChar(text.charAt(probe)) && probe > container.start) {
    probe -= 1;
  }
  if (!isIdentifierChar(text.charAt(probe))) {
    return null;
  }

  let start = probe;
  while (start > container.start && isIdentifierChar(text.charAt(start - 1))) {
    start -= 1;
  }
  let end = probe + 1;
  while (end < container.end && isIdentifierChar(text.charAt(end))) {
    end += 1;
  }
  return end > start ? { start, end } : null;
}

function isIdentifierChar(value: string): boolean {
  return /^[A-Za-z0-9_$-]$/.test(value);
}

function buildContainingChain(candidates: readonly OffsetRange[]): OffsetRange[] {
  const sorted = [...candidates].sort((left, right) => {
    const lengthDelta = rangeLength(left) - rangeLength(right);
    return lengthDelta || right.start - left.start || left.end - right.end;
  });

  const chain: OffsetRange[] = [];
  for (const candidate of sorted) {
    const innermostParent = chain.at(-1);
    if (innermostParent == null || strictlyContains(candidate, innermostParent)) {
      chain.push(candidate);
    }
  }
  return chain;
}

function rangeForOffsets(doc: TextDocument, range: OffsetRange): Range {
  return {
    start: doc.positionAt(range.start),
    end: doc.positionAt(range.end),
  };
}

function rangeLength(range: OffsetRange): number {
  return range.end - range.start;
}

function strictlyContains(outer: OffsetRange, inner: OffsetRange): boolean {
  return outer.start <= inner.start
    && inner.end <= outer.end
    && !sameRange(outer, inner);
}

function containsOffset(range: OffsetRange, offset: number): boolean {
  return range.start <= offset && offset <= range.end;
}

function sameRange(left: OffsetRange, right: OffsetRange): boolean {
  return left.start === right.start && left.end === right.end;
}

function clampOffset(offset: number, length: number): number {
  return Math.max(0, Math.min(offset, length));
}
