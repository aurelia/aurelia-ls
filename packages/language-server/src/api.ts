// Canonical test-facing exports for language-server internals.
// Keeps test imports package-based instead of reaching into ../../src paths.
export * from "./context.js";
export * from "./handlers/custom.js";
export * from "./handlers/features.js";
export * from "./handlers/lifecycle.js";
export * from "./handlers/semantic-tokens.js";
export * from "./mapping/lsp-types.js";
export {
  spanToRange as spanToDocumentRange,
  spanToRangeOrNull,
  diagnosticToRange,
} from "./services/spans.js";
