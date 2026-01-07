export { extractAllFacts, extractSourceFacts } from "./extractor.js";
export type { ExtractionOptions } from "./extractor.js";
export { extractClassFacts } from "./class-extractor.js";

// === Value Resolution Helpers ===
// Bridges class extraction with the value model for resolving identifier references.
export type { PropertyResolutionContext } from "./value-helpers.js";
export { buildSimpleContext, buildContextWithProgram, resolveToString, resolveToBoolean } from "./value-helpers.js";
export { extractRegistrationCalls } from "./registrations.js";
export { extractDefineCalls } from "./define-calls.js";
export { resolveImports } from "./import-resolver.js";
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

// === Extraction Types ===
export type {
  SourceFacts,
  ClassFacts,
  DecoratorFact,
  DecoratorArgFact,
  PropertyValueFact,
  StaticAuFact,
  StaticDependenciesFact,
  DependencyRef,
  BindableMemberFact,
  BindableDefFact,
  RegistrationCallFact,
  RegistrationArgFact,
  DefineCallFact,
  BindingMode,
  Position,
  ImportFact,
  ImportedName,
  ExportFact,
  ExportedName,
  SiblingFileFact,
  TemplateImportFact,
  NamedAlias,
} from "./types.js";
