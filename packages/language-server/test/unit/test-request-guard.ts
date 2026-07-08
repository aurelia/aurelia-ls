import type { SemanticRuntimeLspRequestGuard } from "../../src/runtime/semantic-runtime-session.js";

export const testRequestGuard: SemanticRuntimeLspRequestGuard = {
  generation: {
    workspaceGeneration: 0,
    sourceGeneration: 0,
    fingerprint: "semantic-runtime:test",
  },
  isCancellationRequested: null,
};
