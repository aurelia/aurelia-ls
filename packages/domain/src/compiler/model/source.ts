import path from "node:path";

import { normalizePathForId, toSourceFileId, type NormalizedPath, type SourceFileId } from "./identity.js";
import { offsetSpan, toSourceSpan, type SourceSpan, type TextSpan } from "./span.js";

export interface SourceFile {
  readonly id: SourceFileId;
  readonly absolutePath: string;
  readonly normalizedPath: NormalizedPath;
  readonly relativePath: NormalizedPath;
  /** Stable key for hashing/deterministic ids (normalized, cwd-relative when possible). */
  readonly hashKey: NormalizedPath;
}

type OffsetLike = { startOffset: number; endOffset: number } | { start: number; end: number };

export function resolveSourceFile(filePath: string | undefined | null, cwd: string = process.cwd()): SourceFile {
  const absolutePath = path.resolve(cwd, filePath ?? "");
  const normalizedPath = normalizePathForId(absolutePath);
  const relativeRaw = path.isAbsolute(absolutePath) ? path.relative(cwd, absolutePath) : absolutePath;
  const relativePath = normalizePathForId(relativeRaw);
  return {
    id: toSourceFileId(relativeRaw),
    absolutePath,
    normalizedPath,
    relativePath,
    hashKey: relativePath,
  };
}

export function spanFromOffsets(
  loc: OffsetLike | null | undefined,
  source?: SourceFile | SourceFileId | string | null,
): SourceSpan | null {
  const offsets = coerceOffsets(loc);
  if (!offsets) return null;
  const file = toFileId(source);
  return toSourceSpan(offsets, file);
}

export function absoluteSpan(relative: TextSpan | null | undefined, base: SourceSpan | null | undefined): SourceSpan | null {
  if (!relative || !base) return null;
  return offsetSpan(toSourceSpan(relative, base.file), base.start);
}

export function ensureSpanFile(
  span: SourceSpan | null | undefined,
  source: SourceFile | SourceFileId | string | null | undefined,
): SourceSpan | null {
  if (!span) return null;
  if (span.file) return span;
  const file = toFileId(source);
  return file ? { ...span, file } : span;
}

export function fallbackSpan(source: SourceFile | SourceFileId | string, start = 0, end = start): SourceSpan {
  const file = toFileIdRequired(source);
  return { start, end, file };
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
