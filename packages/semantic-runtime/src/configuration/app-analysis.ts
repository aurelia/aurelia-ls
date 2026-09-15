/** Analysis depth requested for one semantic app-world emission. */
export const enum SemanticAppAnalysisDepth {
  /** Runtime rendering, checker scopes, route topology, route instructions, route trees, and component agents. */
  RuntimeTopology = 'runtime-topology',
  /** Runtime topology plus Controller.bind target/source setup. */
  BindingTargets = 'binding-targets',
  /** Binding targets plus observer/value-channel and source/target data-flow products. */
  BindingObservation = 'binding-observation',
}

export const SEMANTIC_APP_ANALYSIS_DEPTHS = [
  'runtime-topology',
  'binding-targets',
  'binding-observation',
] as const;

export const DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH = SemanticAppAnalysisDepth.RuntimeTopology;

/** Template runtime breadth requested for one semantic app-world emission. */
export const enum SemanticTemplateAnalysisBreadth {
  /** Analyze every authored resource as its own runtime root without repeating ordinary child custom-element views. */
  ResourceLocal = 'resource-local',
  /** Expand child custom-element views beneath every analyzed app resource for aggregate runtime topology. */
  AppAggregate = 'app-aggregate',
}

export const SEMANTIC_TEMPLATE_ANALYSIS_BREADTHS = [
  'resource-local',
  'app-aggregate',
] as const;

export const DEFAULT_SEMANTIC_TEMPLATE_ANALYSIS_BREADTH = SemanticTemplateAnalysisBreadth.AppAggregate;

/** How one project frame may combine statically independent Aurelia application entrypoint graphs. */
export const enum SemanticApplicationEntrypointPolicy {
  /** Require every recognized `.app(...)` activation to belong to one connected entrypoint graph. */
  RequireSingleGraph = 'require-single-graph',
  /** Deliberately compose independent entrypoint graphs into one aggregate semantic app world. */
  AggregateIndependentGraphs = 'aggregate-independent-graphs',
}

export const SEMANTIC_APPLICATION_ENTRYPOINT_POLICIES = [
  'require-single-graph',
  'aggregate-independent-graphs',
] as const;

export const DEFAULT_SEMANTIC_APPLICATION_ENTRYPOINT_POLICY =
  SemanticApplicationEntrypointPolicy.RequireSingleGraph;

export function normalizeSemanticApplicationEntrypointPolicy(
  policy:
    | SemanticApplicationEntrypointPolicy
    | `${SemanticApplicationEntrypointPolicy}`
    | null
    | undefined,
): SemanticApplicationEntrypointPolicy {
  switch (policy) {
    case null:
    case undefined:
      return DEFAULT_SEMANTIC_APPLICATION_ENTRYPOINT_POLICY;
    case SemanticApplicationEntrypointPolicy.RequireSingleGraph:
      return SemanticApplicationEntrypointPolicy.RequireSingleGraph;
    case SemanticApplicationEntrypointPolicy.AggregateIndependentGraphs:
      return SemanticApplicationEntrypointPolicy.AggregateIndependentGraphs;
    default:
      throw new Error(`Unknown semantic application entrypoint policy '${String(policy)}'.`);
  }
}

export function normalizeSemanticTemplateAnalysisBreadth(
  breadth: SemanticTemplateAnalysisBreadth | `${SemanticTemplateAnalysisBreadth}` | null | undefined,
): SemanticTemplateAnalysisBreadth {
  switch (breadth) {
    case null:
    case undefined:
      return DEFAULT_SEMANTIC_TEMPLATE_ANALYSIS_BREADTH;
    case SemanticTemplateAnalysisBreadth.ResourceLocal:
      return SemanticTemplateAnalysisBreadth.ResourceLocal;
    case SemanticTemplateAnalysisBreadth.AppAggregate:
      return SemanticTemplateAnalysisBreadth.AppAggregate;
    default:
      throw new Error(`Unknown semantic template analysis breadth '${String(breadth)}'.`);
  }
}

export function semanticTemplateAnalysisBreadthSatisfies(
  actual: SemanticTemplateAnalysisBreadth | `${SemanticTemplateAnalysisBreadth}`,
  required: SemanticTemplateAnalysisBreadth | `${SemanticTemplateAnalysisBreadth}`,
): boolean {
  return semanticTemplateAnalysisBreadthRank(normalizeSemanticTemplateAnalysisBreadth(actual))
    >= semanticTemplateAnalysisBreadthRank(normalizeSemanticTemplateAnalysisBreadth(required));
}

export function semanticTemplateAnalysisBreadthMax(
  breadths: readonly (
    SemanticTemplateAnalysisBreadth | `${SemanticTemplateAnalysisBreadth}` | null | undefined
  )[],
): SemanticTemplateAnalysisBreadth {
  let selected = SemanticTemplateAnalysisBreadth.ResourceLocal;
  for (const breadth of breadths) {
    if (breadth == null) {
      continue;
    }
    const normalized = normalizeSemanticTemplateAnalysisBreadth(breadth);
    if (semanticTemplateAnalysisBreadthRank(normalized) > semanticTemplateAnalysisBreadthRank(selected)) {
      selected = normalized;
    }
  }
  return selected;
}

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
      throw new Error(`Unknown semantic app analysis depth '${String(depth)}'.`);
  }
}

export function semanticAppAnalysisDepthSatisfies(
  actual: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`,
  required: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`,
): boolean {
  return semanticAppAnalysisDepthRank(normalizeSemanticAppAnalysisDepth(actual))
    >= semanticAppAnalysisDepthRank(normalizeSemanticAppAnalysisDepth(required));
}

export function semanticAppAnalysisDepthMax(
  depths: readonly (SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` | null | undefined)[],
): SemanticAppAnalysisDepth {
  let selected = DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH;
  for (const depth of depths) {
    const normalized = normalizeSemanticAppAnalysisDepth(depth);
    if (semanticAppAnalysisDepthRank(normalized) > semanticAppAnalysisDepthRank(selected)) {
      selected = normalized;
    }
  }
  return selected;
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

function semanticTemplateAnalysisBreadthRank(breadth: SemanticTemplateAnalysisBreadth): number {
  switch (breadth) {
    case SemanticTemplateAnalysisBreadth.ResourceLocal:
      return 0;
    case SemanticTemplateAnalysisBreadth.AppAggregate:
      return 1;
  }
}
