// === Unified extraction (FileFacts + ClassValue) ===
export {
  extractAllFileFacts,
  extractFileFacts,
  extractFileContext,
} from "./file-facts-extractor.js";

// === Value Resolution Helpers ===
// Bridges class extraction with the value model for resolving identifier references.
export type { PropertyResolutionContext } from "./value-helpers.js";
export {
  buildSimpleContext,
  buildContextWithProgram,
  createProgramResolver,
  resolveToString,
  resolveToBoolean,
} from "./value-helpers.js";
export {
  extractTemplateImports,
  resolveTemplateImportPaths,
  extractComponentTemplateImports,
} from "./template-imports.js";

// === Analysis Result Types ===
// These types are used throughout the resolution package for confidence-tracked analysis.
// They originated in npm-analysis but are universal patterns for any analysis operation.
export type {
  AnalysisResult,
  Confidence,
  AnalysisGap,
  GapLocation,
  GapReason,
} from "./types.js";
export {
  success,
  highConfidence,
  partial,
  combine,
  compareConfidence,
  gap,
} from "./types.js";

// Re-export ExtractionOptions type from file-facts-extractor
export type { ExtractionOptions } from "./file-facts-extractor.js";
