/**
 * Semantic selection ranges for Aurelia templates.
 *
 * VS Code uses these for "expand selection". Keep the ladder quiet and
 * source-backed: active token, value site, attribute, node, then template.
 */
import {
  type Position,
  type Range,
  type SelectionRange,
  type SelectionRangeParams,
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

export async function handleSelectionRanges(
  ctx: ServerContext,
  params: SelectionRangeParams,
  operation: SemanticRuntimeLspOperation,
): Promise<SelectionRange[] | null> {
  const doc = operation.documents.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  const ranges: SelectionRange[] = [];
  for (const position of params.positions) {
    const answer = await operation.templateCursorInfo(
      doc,
      position,
    );
    const range = selectionRangeForCursor(ctx, doc, position, answer.value);
    if (range == null) return null;
    ranges.push(range);
  }
  return ranges.length > 0 ? ranges : null;
}

function selectionRangeForCursor(
  ctx: ServerContext,
  doc: TextDocument,
  position: Position,
  value: SemanticTemplateCursorInfoResult,
): SelectionRange | null {
  const cursorOffset = doc.offsetAt(position);
  const candidates: OffsetRange[] = [];

  addSourceCandidate(ctx, doc, candidates, cursorOffset, value.activeSource);
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
  if (!semanticSourceReferenceMatchesDocument(source, ctx.documentUris, doc.uri)) return null;
  return semanticSourceOffsetRangeForDocument(source, doc);
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
