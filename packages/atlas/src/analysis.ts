import { LensId } from "./inquiry/lens-contracts.js";

/** The three inquiry owners available directly on a caller's source project. */
export const analysisLenses = {
  memory: LensId.AtlasMemory,
  di: LensId.FrameworkDi,
  evaluator: LensId.FrameworkEvaluator,
} as const;

export * from "./source/index.js";
export * from "./evaluation/index.js";
export * from "./framework/index.js";
export { RepoRootLocus, type Locus } from "./inquiry/locus.js";
export type { Inquiry } from "./inquiry/inquiry.js";
export type { Answer } from "./inquiry/answer.js";
export { sourceSelectorFromSubject } from "./inquiry/runtime/source-selector.js";
export { answerAtlasMemory, type AtlasMemoryValue } from "./inquiry/runtime/atlas-memory-lenses.js";
export { answerFrameworkDi, type FrameworkDiValue } from "./inquiry/runtime/framework-di-lenses.js";
export { answerFrameworkEvaluator, type FrameworkEvaluatorValue } from "./inquiry/runtime/framework-evaluator-lenses.js";
export { readFrameworkMaterializationIndex } from "./inquiry/runtime/framework-materialization-lenses.js";
