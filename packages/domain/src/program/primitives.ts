import type { SourceSpan } from "../compiler/model/span.js";
import type { ExprId, NodeId, FrameId, UriString } from "../compiler/model/identity.js";

/**
 * Program-layer primitives. These deliberately alias existing brands so we do
 * not create parallel identity types while keeping the program API self-contained.
 */

/** Canonical identifier for a document (alias to UriString to avoid drift). */
export type DocumentUri = UriString;

/**
 * Immutable snapshot of a text document (URI + version + text).
 * Hosts feed these through SourceStore; the program never reads the filesystem.
 */
export interface DocumentSnapshot {
  readonly uri: DocumentUri;
  readonly version: number;
  readonly text: string;
}

/** Brand a string as a DocumentUri without validation (utility for adapters). */
export function asDocumentUri(input: string): DocumentUri {
  return input as DocumentUri;
}

// Convenience re-exports of common ids/spans for higher layers.
export type TemplateExprId = ExprId;
export type TemplateNodeId = NodeId;
export type TemplateFrameId = FrameId;
export type TemplateSpan = SourceSpan;
