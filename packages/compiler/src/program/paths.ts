import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizePathForId,
  toSourceFileId,
  type NormalizedPath,
  type SourceFileId,
} from "../model/identity.js";
import { computeOverlayBaseName } from "../synthesis/overlay/paths.js";
// Program layer imports
import { asDocumentUri, type DocumentUri } from "./primitives.js";

function toFsPath(input: string): string {
  if (input.startsWith("file:")) {
    try {
      return fileURLToPath(input);
    } catch {
      // Fall back to the raw string if the URI is malformed; caller enforces contracts.
    }
  }
  return input;
}

/** Normalize/brand a document identifier so hosts can't drift on URI shapes. */
export function normalizeDocumentUri(input: string | DocumentUri): DocumentUri {
  const fsPath = toFsPath(String(input));
  const normalized = normalizePathForId(fsPath);
  return asDocumentUri(normalized);
}

export interface CanonicalDocumentUri {
  readonly uri: DocumentUri;
  readonly path: NormalizedPath;
  readonly file: SourceFileId;
}

/** Canonicalize a document URI into normalized path + SourceFileId (UTF-16 offsets implied). */
export function canonicalDocumentUri(input: string | DocumentUri): CanonicalDocumentUri {
  const uri = normalizeDocumentUri(input);
  const pathLike = normalizePathForId(uri);
  return {
    uri,
    path: pathLike,
    file: toSourceFileId(pathLike),
  };
}

export interface TemplatePathConventions {
  readonly template: CanonicalDocumentUri;
  readonly overlay: {
    readonly baseName: string;
    readonly filename: string;
    readonly path: NormalizedPath;
    readonly uri: DocumentUri;
    readonly file: SourceFileId;
  };
}

/**
 * Compute canonical overlay filenames and URIs for a template.
 * Keeps separators normalized and threads SourceFileIds for provenance.
 */
export function deriveTemplatePaths(
  template: string | DocumentUri,
  opts: { isJs: boolean; overlayBaseName?: string },
): TemplatePathConventions {
  const templateId = canonicalDocumentUri(template);
  const dir = path.posix.dirname(templateId.path);

  const overlayBase = computeOverlayBaseName(templateId.path, opts.overlayBaseName);
  const overlayFilename = `${overlayBase}${opts.isJs ? ".js" : ".ts"}`;
  const overlayPath = normalizePathForId(path.posix.join(dir, overlayFilename));
  const overlayUri = asDocumentUri(overlayPath);

  return {
    template: templateId,
    overlay: {
      baseName: overlayBase,
      filename: overlayFilename,
      path: overlayPath,
      uri: overlayUri,
      file: toSourceFileId(overlayPath),
    },
  };
}
