// Canonical test-facing exports for language-server internals.
// Keeps test imports package-based instead of reaching into ../../src paths.
export * from "./context.js";
export * from "./feature-response.js";
export * from "./handlers/custom.js";
export * from "./handlers/features.js";
export * from "./handlers/lifecycle.js";
export * from "./handlers/semantic-tokens.js";
export * from "./handlers/inlay-hints.js";
export * from "./handlers/code-lens.js";
export * from "./handlers/document-symbols.js";
export * from "./handlers/workspace-symbols.js";
export * from "./handlers/selection-ranges.js";
export * from "./handlers/linked-editing-ranges.js";
export * from "./handlers/folding-ranges.js";
export * from "./handlers/request-guard.js";
export * from "./mapping/lsp-types.js";
export { SemanticRuntimeLspRequestAbortedError } from "./runtime/semantic-runtime-session.js";
export {
  spanToDocumentRange,
  spanToRangeOrNull,
  diagnosticToRange,
} from "./services/spans.js";
