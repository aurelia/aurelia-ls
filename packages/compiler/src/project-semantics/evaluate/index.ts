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

export { evaluateFileFacts } from "./partial-evaluation.js";
export type {
  PartialEvaluationResult,
  PartialEvaluationFileResult,
  PartialEvaluationOptions,
} from "./partial-evaluation.js";

export type { PropertyResolutionContext } from "./value-helpers.js";
export {
  buildSimpleContext,
  buildContextWithProgram,
  createProgramResolver,
  resolveToString,
  resolveToBoolean,
} from "./value-helpers.js";

export * from "./value/index.js";
