import path from "node:path";
import { pathToFileURL } from "node:url";
import { URI } from "vscode-uri";

export type DocumentUri = string;

export interface CanonicalDocumentUri {
  readonly uri: DocumentUri;
  readonly path: string;
  readonly file: string;
}

export function canonicalDocumentUri(input: string): CanonicalDocumentUri {
  if (looksLikeHostPath(input)) {
    return canonicalFileUri(input);
  }

  const parsed = URI.parse(input);
  if (parsed.scheme === "file") {
    if (isPosixFileUri(parsed.path, parsed.authority)) {
      const uri = parsed.toString();
      return { uri, path: parsed.path, file: parsed.path };
    }
    return canonicalFileUri(parsed.fsPath);
  }

  const logicalPath = parsed.path || input;
  return { uri: input, path: logicalPath, file: logicalPath };
}

export function toFileUri(filePath: string): DocumentUri {
  return pathToFileURL(path.normalize(filePath)).toString();
}

function canonicalFileUri(filePath: string): CanonicalDocumentUri {
  const normalized = path.normalize(filePath);
  const uri = toFileUri(normalized);
  return { uri, path: normalized, file: normalized };
}

function isPosixFileUri(uriPath: string, authority: string): boolean {
  return authority.length === 0 && uriPath.startsWith("/") && !/^\/[a-zA-Z]:/.test(uriPath);
}

function looksLikeHostPath(value: string): boolean {
  if (path.isAbsolute(value)) {
    return true;
  }
  return /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith("\\\\");
}
