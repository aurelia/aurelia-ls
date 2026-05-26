/** Publicly grounded scenario archetype used to pressure reusable patterns without becoming a recipe identity. */
export enum AppBuilderReferenceScenarioId {
  /** Homogeneous records with table/list views, query, sort, selection, and row-level or bulk actions. */
  StructuredRecordManagement = 'structured-record-management',
  /** Browsable collections where users compare items, switch list/card/grid presentation, and drill into details. */
  CollectionBrowseAndCompare = 'collection-browse-and-compare',
  /** Side-by-side or routed primary/detail workspaces that preserve list context while inspecting or editing an item. */
  PrimaryDetailWorkspace = 'primary-detail-workspace',
  /** Form or survey flow whose questions, validation, branching, review, and submit semantics are task-owned. */
  TransactionalFormFlow = 'transactional-form-flow',
  /** Overview surface for metrics, status, events, and drill-down cards. */
  MetricsOverviewDashboard = 'metrics-overview-dashboard',
  /** Navigation shell organized around user tasks, hierarchy, sibling scenes, and important destinations. */
  TaskNavigationShell = 'task-navigation-shell',
}

/** Public source or design-system signal used only to ground a reference scenario archetype. */
export interface AppBuilderReferenceScenarioGrounding {
  readonly title: string;
  readonly summary: string;
}

/** Scenario descriptor for fixture pressure and examples; concrete names, copy, data, and CSS stay outside ontology. */
export interface AppBuilderReferenceScenarioDescriptor {
  readonly id: AppBuilderReferenceScenarioId;
  readonly title: string;
  readonly summary: string;
  readonly grounding: readonly AppBuilderReferenceScenarioGrounding[];
  readonly patternSignals: readonly string[];
  readonly nonOntologyMaterial: readonly string[];
}
