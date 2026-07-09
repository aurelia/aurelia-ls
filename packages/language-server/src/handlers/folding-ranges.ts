import path from "node:path";
import {
  type FoldingRange,
  type FoldingRangeParams,
} from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
  SemanticTemplateFoldingRangeRow,
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

export async function handleFoldingRanges(
  ctx: ServerContext,
  params: FoldingRangeParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<FoldingRange[] | null> {
  const doc = ctx.ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  if (!isTemplateDocument(doc)) return null;

  try {
    const answer = await ctx.semanticRuntime.templateFoldingRanges(
      doc,
      guard,
    );
    const ranges = answer.value.rows
      .map((row) => foldingRangeForRow(ctx, doc, row))
      .filter((range): range is FoldingRange => range != null);
    return ranges.length > 0 ? ranges : null;
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "foldingRange", e, params.textDocument.uri)) {
      return null;
    }
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`[foldingRange] failed for ${params.textDocument.uri}: ${message}`);
    return null;
  }
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
  const exact = semanticExactSourceReference(source);
  if (exact?.start == null || exact.end == null) return null;
  if (!sourceMatchesDocument(ctx.workspaceRoot, exact, doc.uri)) return null;

  const length = doc.getText().length;
  const start = clampOffset(exact.start, length);
  const end = Math.max(start, clampOffset(exact.end, length));
  return end > start ? { start, end } : null;
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

function clampOffset(offset: number, length: number): number {
  return Math.max(0, Math.min(offset, length));
}
