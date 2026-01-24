/**
 * Export Binding Types
 *
 * Types for resolving export names across module boundaries.
 * This layer answers: "If I import name X from file Y, what class does it refer to?"
 */

import type { NormalizedPath } from '../compiler.js';

/**
 * A resolved export binding - the final destination of an export name.
 */
export interface ResolvedExport {
  /** The file where the class/value is actually defined */
  readonly definitionPath: NormalizedPath;

  /** The actual name in the definition file */
  readonly definitionName: string;
}

/**
 * Map from export name to its resolved binding.
 * For a file, tells you where each exported name ultimately comes from.
 */
export type FileExportBindings = ReadonlyMap<string, ResolvedExport>;

/**
 * Complete export binding map for all files in the project.
 * Map: filePath → (exportName → ResolvedExport)
 */
export type ExportBindingMap = ReadonlyMap<NormalizedPath, FileExportBindings>;

/**
 * Result of looking up an export.
 */
export type ExportLookupResult =
  | { readonly found: true; readonly binding: ResolvedExport }
  | { readonly found: false; readonly reason: string };
