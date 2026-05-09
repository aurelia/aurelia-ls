/** Analysis depth requested for one semantic app-world emission. */
export const enum SemanticAppAnalysisDepth {
  /** Runtime rendering, checker scopes, route topology, route instructions, route trees, and component agents. */
  RuntimeTopology = 'runtime-topology',
  /** Runtime topology plus Controller.bind target/source setup. */
  BindingTargets = 'binding-targets',
  /** Binding targets plus observer/value-channel and source/target data-flow products. */
  BindingObservation = 'binding-observation',
}

export const DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH = SemanticAppAnalysisDepth.BindingObservation;

export function normalizeSemanticAppAnalysisDepth(
  depth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` | null | undefined,
): SemanticAppAnalysisDepth {
  switch (depth) {
    case null:
    case undefined:
      return DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH;
    case SemanticAppAnalysisDepth.RuntimeTopology:
      return SemanticAppAnalysisDepth.RuntimeTopology;
    case SemanticAppAnalysisDepth.BindingTargets:
      return SemanticAppAnalysisDepth.BindingTargets;
    case SemanticAppAnalysisDepth.BindingObservation:
      return SemanticAppAnalysisDepth.BindingObservation;
    default:
      throw new Error(`Unknown semantic app analysis depth '${depth}'.`);
  }
}

export function semanticAppAnalysisDepthSatisfies(
  actual: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`,
  required: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`,
): boolean {
  return semanticAppAnalysisDepthRank(normalizeSemanticAppAnalysisDepth(actual))
    >= semanticAppAnalysisDepthRank(normalizeSemanticAppAnalysisDepth(required));
}

function semanticAppAnalysisDepthRank(depth: SemanticAppAnalysisDepth): number {
  switch (depth) {
    case SemanticAppAnalysisDepth.RuntimeTopology:
      return 0;
    case SemanticAppAnalysisDepth.BindingTargets:
      return 1;
    case SemanticAppAnalysisDepth.BindingObservation:
      return 2;
  }
}
