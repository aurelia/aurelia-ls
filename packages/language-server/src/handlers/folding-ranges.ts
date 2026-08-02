import {
  type FoldingRange,
  type FoldingRangeParams,
} from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
  SemanticTemplateFoldingRangeRow,
} from "@aurelia-ls/semantic-runtime";
import type { SemanticSourceReference } from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import {
  semanticSourceOffsetRangeForDocument,
  semanticSourceReferenceMatchesDocument,
} from "../mapping/source-locations.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";
import { isTemplateDocument } from "../utils/document-kind.js";

interface OffsetRange {
  readonly start: number;
  readonly end: number;
}

export async function handleFoldingRanges(
  ctx: ServerContext,
  params: FoldingRangeParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<FoldingRange[] | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  const answer = await ctx.semanticRuntime.templateFoldingRanges(
    doc,
    guard,
  );
  const ranges = answer.value.rows
    .map((row) => foldingRangeForRow(ctx, doc, row))
    .filter((range): range is FoldingRange => range != null);
  return ranges.length > 0 ? ranges : null;
}

function foldingRangeForRow(
  ctx: ServerContext,
  doc: TextDocument,
  row: SemanticTemplateFoldingRangeRow,
): FoldingRange | null {
  const offsetRange = offsetRangeForSource(ctx, doc, row.source);
  if (offsetRange == null) return null;

  const start = doc.positionAt(offsetRange.start);
  const end = doc.positionAt(offsetRange.end);
  if (start.line >= end.line) return null;

  return {
    startLine: start.line,
    startCharacter: start.character,
    endLine: end.line,
    endCharacter: end.character,
  };
}

function offsetRangeForSource(
  ctx: ServerContext,
  doc: TextDocument,
  source: SemanticSourceReference | null,
): OffsetRange | null {
  if (!semanticSourceReferenceMatchesDocument(source, ctx.documentUris, doc.uri)) return null;
  const range = semanticSourceOffsetRangeForDocument(source, doc);
  return range != null && range.end > range.start ? range : null;
}
