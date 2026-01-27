/**
 * Export Binding Resolution
 *
 * This module provides export name resolution across module boundaries.
 * It builds a complete map of where each export ultimately comes from,
 * handling re-exports and aliases.
 */

export type {
  ResolvedExport,
  FileExportBindings,
  ExportBindingMap,
  ExportLookupResult,
} from "./types.js";

export {
  buildExportBindingMap,
  lookupExportBinding,
} from "./export-resolver.js";
