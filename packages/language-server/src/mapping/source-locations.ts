import type { Range } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import {
  semanticExactSourceReference,
  type SemanticSourceReference,
} from "@aurelia-ls/semantic-runtime";
import type { WorkspaceDocumentUris } from "../utils/document-uri.js";

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
  documentUris: WorkspaceDocumentUris,
): string | null {
  const sourcePath = semanticSourceReferencePath(source);
  if (sourcePath == null) return null;
  if (sourcePath.includes(":")) {
    const parsed = URI.parse(sourcePath);
    if (parsed.scheme.length > 1) {
      const filePath = documentUris.hostPath(sourcePath);
      return filePath == null ? parsed.toString() : documentUris.uriForHostPath(filePath);
    }
  }
  const hostPath = documentUris.hostPath(sourcePath);
  if (hostPath != null) return documentUris.uriForHostPath(hostPath);
  return documentUris.uriForWorkspaceRelativePath(sourcePath);
}

export function semanticSourceReferenceFilePath(
  source: SemanticSourceReference | null,
  documentUris: WorkspaceDocumentUris,
): string | null {
  const sourcePath = semanticSourceReferencePath(source);
  if (sourcePath == null) return null;
  if (sourcePath.includes(":")) {
    const parsed = URI.parse(sourcePath);
    if (parsed.scheme.length > 1) return documentUris.hostPath(sourcePath);
    const filePath = documentUris.hostPath(sourcePath);
    if (filePath != null) return filePath;
  }
  const hostPath = documentUris.hostPath(sourcePath);
  return hostPath ?? documentUris.hostPathForWorkspaceRelativePath(sourcePath);
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
  documentUris: WorkspaceDocumentUris,
  documentUri: string,
): boolean {
  const exact = semanticExactSourceReference(source);
  if (exact == null) return false;
  const uri = semanticSourceReferenceUri(exact, documentUris);
  return uri != null && documentUris.sameDocument(uri, documentUri);
}
