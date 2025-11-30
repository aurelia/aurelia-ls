import path from "node:path";

import { normalizePathForId, type NormalizedPath } from "../../model/identity.js";

function normalizePathLike(input: string): NormalizedPath {
  return normalizePathForId(input);
}

/**
 * Compute the base name for overlay artifacts (without extension).
 * Keeps the original base when provided, otherwise uses `<basename>.__au.ttc.overlay`.
 */
export function computeOverlayBaseName(templatePath: string, override?: string): string {
  if (override) return override;
  const normalized = normalizePathLike(templatePath);
  const base = path.posix.basename(normalized, path.posix.extname(normalized));
  return `${base}.__au.ttc.overlay`;
}

/** Compute the overlay filename (including extension) for a template. */
export function overlayFilename(templatePath: string, isJs: boolean, overrideBase?: string): string {
  const base = computeOverlayBaseName(templatePath, overrideBase);
  const ext = isJs ? ".js" : ".ts";
  return `${base}${ext}`;
}

/** Compute the normalized overlay path for a template (directory preserved). */
export function overlayPath(templatePath: string, isJs: boolean, overrideBase?: string): NormalizedPath {
  const normalized = normalizePathLike(templatePath);
  const dir = path.posix.dirname(normalized);
  const filename = overlayFilename(normalized, isJs, overrideBase);
  return normalizePathLike(path.posix.join(dir, filename));
}

