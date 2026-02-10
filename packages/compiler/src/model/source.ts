import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizePathForId, toSourceFileId, type NormalizedPath, type SourceFileId } from "./identity.js";
import { normalizeSpan, offsetSpan, toSourceSpan, type SourceSpan, type TextSpan } from "./span.js";

export interface SourceFile {
  /** Identity authority for deterministic IDs and hash keys (canonical absolute path). */
  readonly id: SourceFileId;
  /** Absolute runtime file path resolved against the caller cwd. */
  readonly absolutePath: string;
  /** Canonical normalized absolute path (slash-normalized, platform-cased). */
  readonly normalizedPath: NormalizedPath;
  /** Cwd-relative normalized path for UI/reporting surfaces. */
  readonly relativePath: NormalizedPath;
  /** Stable normalized hash key derived from canonical absolute path authority. */
  readonly hashKey: NormalizedPath;
}

type OffsetLike = { startOffset: number; endOffset: number } | { start: number; end: number };

export function resolveSourceFile(filePath: string | undefined | null, cwd: string = process.cwd()): SourceFile {
  const inputPath = filePath ?? "";
  const fsPath = coerceFsPath(inputPath);
  const absolutePath = isPathLikeAbsolute(fsPath) ? fsPath : path.resolve(cwd, fsPath);
  const normalizedPath = normalizePathForId(absolutePath);
  const relativeRaw = path.relative(cwd, absolutePath);
  const relativePath = normalizePathForId(relativeRaw);
  // Source identity authority is canonical absolute path.
  const identity = toSourceFileId(normalizedPath);
  const hashKey = normalizedPath;
  return {
    id: identity,
    absolutePath,
    normalizedPath,
    relativePath,
    hashKey,
  };
}

function coerceFsPath(inputPath: string): string {
  if (inputPath.startsWith("file:")) {
    try {
      return fileURLToPath(inputPath);
    } catch {
      return inputPath;
    }
  }
  return inputPath;
}

function isPathLikeAbsolute(filePath: string): boolean {
  if (!filePath) return false;
  // Keep POSIX-rooted pseudo-document paths (e.g. "/app/template.html")
  // stable across platforms instead of re-rooting to the current drive.
  if (filePath.startsWith("/")) return true;
  return path.isAbsolute(filePath);
}

export function spanFromOffsets(
  loc: OffsetLike | null | undefined,
  source?: SourceFile | SourceFileId | string | null,
): SourceSpan | null {
  const offsets = coerceOffsets(loc);
  if (!offsets) return null;
  const file = toFileId(source);
  return normalizeSpan(toSourceSpan(offsets, file));
}

export function absoluteSpan(relative: TextSpan | null | undefined, base: SourceSpan | null | undefined): SourceSpan | null {
  if (!relative || !base) return null;
  return normalizeSpan(offsetSpan(toSourceSpan(relative, base.file), base.start));
}

export function ensureSpanFile(
  span: SourceSpan | null | undefined,
  source: SourceFile | SourceFileId | string | null | undefined,
): SourceSpan | null {
  if (!span) return null;
  if (span.file) return normalizeSpan(span);
  const file = toFileId(source);
  return file ? normalizeSpan({ ...span, file }) : normalizeSpan(span);
}

export function fallbackSpan(source: SourceFile | SourceFileId | string, start = 0, end = start): SourceSpan {
  const file = toFileIdRequired(source);
  return { start, end, file };
}

export function resolveSourceSpanMaybe(
  span: SourceSpan | null | undefined,
  source: SourceFile | SourceFileId | string | null | undefined,
): SourceSpan | null {
  const withFile = ensureSpanFile(span, source);
  return withFile ? normalizeSpan(withFile) : null;
}

export function resolveSourceSpan(
  span: SourceSpan | null | undefined,
  source: SourceFile | SourceFileId | string,
  start = 0,
  end = start,
): SourceSpan {
  return normalizeSpan(ensureSpanFile(span, source) ?? fallbackSpan(source, start, end));
}

function coerceOffsets(loc: OffsetLike | null | undefined): { start: number; end: number } | null {
  if (!loc) return null;
  if ("startOffset" in loc && "endOffset" in loc) {
    return { start: loc.startOffset, end: loc.endOffset };
  }
  if ("start" in loc && "end" in loc) {
    return { start: loc.start, end: loc.end };
  }
  return null;
}

function toFileId(source: SourceFile | SourceFileId | string | null | undefined): SourceFileId | undefined {
  if (!source) return undefined;
  if (typeof source === "string") return toSourceFileId(source);
  return "id" in source ? source.id : source;
}

function toFileIdRequired(source: SourceFile | SourceFileId | string): SourceFileId {
  const id = toFileId(source);
  if (!id) throw new Error("Source file is required to build a span.");
  return id;
}
