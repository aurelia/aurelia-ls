export { createRegistrationAnalyzer, type RegistrationAnalyzer } from "./analyzer.js";
export { buildImportGraph } from "./import-graph.js";

// Legacy types (to be replaced by model.ts types)
export type {
  RegistrationIntent,
  RegistrationEvidence,
  Position,
  ImportGraph,
} from "./types.js";

// New registration model (see model.ts for design rationale)
export type {
  RegistrationAnalysis,
  RegistrationSite,
  RegistrationScope,
  ResourceRef,
  RegistrationEvidence as NewRegistrationEvidence,
  OrphanResource,
  UnresolvedRegistration,
  UnresolvedPattern,
  LocalRegistrationSite,
  ResolvedRegistrationSite,
} from "./model.js";

export {
  isLocalSite,
  isGlobalSite,
  isResolvedSite,
  isUnresolvedSite,
} from "./model.js";
