import path from "node:path";
import type { Range } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import {
  semanticExactSourceReference,
  type SemanticSourceReference,
} from "@aurelia-ls/semantic-runtime";
import { canonicalDocumentUri, toFileUri } from "../utils/document-uri.js";

export interface SemanticSourceOffsetRange {
  readonly start: number;
  readonly end: number;
}

/** Follow public source anchors to the first concrete path. */
export function semanticSourceReferencePath(
  source: SemanticSourceReference | null,
): string | null {
  if (source == null) return null;
  if (source.path != null && source.path.length > 0) return source.path;
  return semanticSourceReferencePath(source.anchor ?? null);
}

/** Resolve a semantic source path through the workspace without guessing for pathless/external addresses. */
export function semanticSourceReferenceUri(
  source: SemanticSourceReference,
  workspaceRoot: string | null,
): string | null {
  const sourcePath = semanticSourceReferencePath(source);
  if (sourcePath == null) return null;
  if (sourcePath.startsWith("file:")) return canonicalDocumentUri(sourcePath).uri;
  if (path.isAbsolute(sourcePath)) return canonicalDocumentUri(toFileUri(sourcePath)).uri;
  return workspaceRoot == null
    ? null
    : canonicalDocumentUri(toFileUri(path.resolve(workspaceRoot, sourcePath))).uri;
}

export function semanticSourceReferenceFilePath(
  source: SemanticSourceReference | null,
  workspaceRoot: string | null,
): string | null {
  const sourcePath = semanticSourceReferencePath(source);
  if (sourcePath == null) return null;
  if (sourcePath.startsWith("file:")) return URI.parse(sourcePath).fsPath;
  if (path.isAbsolute(sourcePath)) return sourcePath;
  return workspaceRoot == null ? null : path.resolve(workspaceRoot, sourcePath);
}

/** Resolve an exact source span only when its offsets are valid for the current document text. */
export function semanticSourceOffsetRangeForDocument(
  source: SemanticSourceReference | null,
  document: Pick<TextDocument, "getText">,
): SemanticSourceOffsetRange | null {
  const exact = semanticExactSourceReference(source);
  if (
    exact?.start == null
    || exact.end == null
    || !Number.isInteger(exact.start)
    || !Number.isInteger(exact.end)
  ) {
    return null;
  }
  const length = document.getText().length;
  return exact.start < 0 || exact.end < exact.start || exact.end > length
    ? null
    : { start: exact.start, end: exact.end };
}

export function semanticSourceRangeForDocument(
  source: SemanticSourceReference | null,
  document: Pick<TextDocument, "getText" | "positionAt">,
): Range | null {
  const offsets = semanticSourceOffsetRangeForDocument(source, document);
  return offsets == null
    ? null
    : {
        start: document.positionAt(offsets.start),
        end: document.positionAt(offsets.end),
      };
}

export function semanticSourceReferenceMatchesDocument(
  source: SemanticSourceReference | null,
  workspaceRoot: string | null,
  documentUri: string,
): boolean {
  const exact = semanticExactSourceReference(source);
  if (exact == null) return false;
  const uri = semanticSourceReferenceUri(exact, workspaceRoot);
  return uri != null
    && canonicalDocumentUri(uri).uri === canonicalDocumentUri(documentUri).uri;
}
