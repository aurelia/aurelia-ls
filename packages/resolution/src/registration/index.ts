export { createRegistrationAnalyzer, type RegistrationAnalyzer } from "./analyzer.js";
export { buildImportGraph, type ImportGraph } from "./import-graph.js";
export { buildRegistrationPlan, type UsageByScope } from "./plan.js";

// Registration model (see types.ts for design rationale)
export type {
  RegistrationAnalysis,
  RegistrationSite,
  RegistrationScope,
  ResourceRef,
  RegistrationEvidence,
  OrphanResource,
  UnresolvedRegistration,
  UnresolvedPattern,
  LocalRegistrationSite,
  ResolvedRegistrationSite,
} from "./types.js";

export {
  isLocalSite,
  isGlobalSite,
  isResolvedSite,
  isUnresolvedSite,
} from "./types.js";
