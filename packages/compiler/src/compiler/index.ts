// Compiler public API
//
// This barrel re-exports from all compiler sub-modules.
// Import from here rather than deep paths for stability.

// === Facade ===
export { compileTemplate, type CompileOptions, type CompileOverlayResult, type TemplateCompilation, type TemplateDiagnostics, type StageMetaSnapshot } from "./facade.js";
export { createDefaultEngine, runCorePipeline, type CoreCompileOptions, type CorePipelineResult } from "./pipeline/index.js";

// === Model (Foundation) ===
export * from "./model/index.js";

// === Language ===
export * from "./language/index.js";

// === Parsing ===
export * from "./parsing/index.js";

// === Shared ===
export * from "./shared/index.js";

// === Pipeline ===
export * from "./pipeline/index.js";

// === Synthesis ===
export * from "./synthesis/index.js";

// === Analysis ===
export * from "./analysis/index.js";
