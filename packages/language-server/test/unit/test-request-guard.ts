import type {
  SemanticRuntimeLspGeneration,
  SemanticRuntimeLspRequestGuard,
} from "../../src/runtime/semantic-runtime-session.js";

export const testAnalysisGeneration: SemanticRuntimeLspGeneration = {
  requestEpoch: 0,
  workspaceGeneration: 0,
  sourceWorldRevision: "semantic-source-world:test",
  fingerprint: "semantic-runtime:test",
};

export const testRequestGuard: SemanticRuntimeLspRequestGuard = {
  requestEpoch: testAnalysisGeneration.requestEpoch,
  isCancellationRequested: null,
};
