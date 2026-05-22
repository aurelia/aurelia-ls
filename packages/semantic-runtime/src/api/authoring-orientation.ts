import ts from 'typescript';
import type { ProjectBootFrame } from '../boot/frames.js';
import { readSemanticProjectShape } from '../boot/project-shape.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import { readDiResolveCallSites, type DiResolveCallSite } from '../di/resolve-call-recognition.js';
import type { KernelStore } from '../kernel/store.js';
import { SourceFileRole } from '../kernel/address.js';
import {
  frameworkRegistrationKindForAdmission,
  RegistrationAdmissionKind,
} from '../registration/registration-admission.js';
import { isFrameworkRegistrationGroupKind } from '../registration/framework-registration-manifest.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import {
  AuthoringCapabilityDescriptors,
  AuthoringOntology,
  authoringSupportStateRank,
  readAuthoringTasteValueDescriptor,
  type AuthoringCapabilityKey,
  type AuthoringEvidenceAuthority,
  type AuthoringOpenReasonKind,
  type AuthoringOperationFamilyKey,
  type AuthoringSupportState,
  type AuthoringTasteAxisLayer,
  type AuthoringTasteAxisKey,
  type AuthoringTasteValueKey,
} from '../authoring/ontology.js';
import {
  repairChangeDomainForPlan,
  repairKindForDiagnosticSuggestion,
  repairKindForOpenSeamReasons,
  repairPlanKindForRepair,
  repairPlanReadinessForCluster,
  repairRuntimeBoundaryKindsForOpenSeamReasons,
  repairRuntimeIntentKindsForOpenSeamReasons,
  type AuthoringRepairKind,
} from '../authoring/repair.js';
import {
  AuthoringRecipeDescriptors,
  baseRecipeKeysForRecipe,
  expectedSemanticEffectsForRecipe,
  recipeLineageKeysForRecipe,
  recipeSpecificityRankForRecipe,
} from '../authoring/recipe.js';
import {
  observeExpectedSemanticEffect,
  type ExpectedSemanticEffectObservationSnapshot,
  type ExpectedSemanticEffectObservationResult,
} from '../authoring/effect-observation.js';
import { uniqueValues } from '../collections.js';
import { semanticAuthoringExpectedEffectContractRow } from './authoring-effect-contracts.js';
import { InquiryPageRequest } from '../inquiry/page.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  RouteConfigOriginKind,
  RouteConfigValueKind,
} from '../router/model.js';
import { CheckerTypeShapeKind } from '../type-system/type-shape.js';
import { sourceRoleCounts } from './app-summary.js';
import {
  readSemanticApplicationTopology,
  semanticApplicationComponentMemberKey,
  SemanticApplicationComponentRoleKind,
} from './app-topology.js';
import {
  readBindingBehaviorApplicationRows,
  readBindingDataFlowRows,
  readBindingObservedDependencyRows,
  readBindingTargetAccessRows,
  readTargetOperationRows,
  readBindingValueChannelRows,
} from './binding-projections.js';
import {
  readI18nTranslationBindingRows,
  readI18nTranslationKeyRows,
} from './i18n-projections.js';
import { readStateStoreRows } from './state-projections.js';
import type {
  SemanticAuthoringAvailableSurfaceRow,
  SemanticAuthoringCapabilityRow,
  SemanticAuthoringCoverageRow,
  SemanticAuthoringEvidenceRow,
  SemanticAuthoringExpectedEffectRow,
  SemanticAuthoringLocusKind,
  SemanticAuthoringOpenReasonRow,
  SemanticAuthoringOperationRow,
  SemanticAuthoringOrientationResult,
  SemanticAuthoringProjectOrientation,
  SemanticAuthoringRepairActionTargetRow,
  SemanticAuthoringRecipeSeedRow,
  SemanticAuthoringRepairClusterRow,
  SemanticAuthoringRepairRow,
  SemanticAuthoringSurfaceKind,
  SemanticAuthoringTasteAxisRow,
  SemanticAuthoringTasteValueRow,
  SemanticBindingBehaviorApplicationRow,
  SemanticBindingDataFlowRow,
  SemanticBindingObservedDependencyRow,
  SemanticBindingTargetAccessRow,
  SemanticBindingValueChannelRow,
  SemanticComputedObserverObservedDependencyRow,
  SemanticComputedObserverSourceRow,
  SemanticI18nTranslationBindingRow,
  SemanticI18nTranslationKeyRow,
  SemanticStateStoreRow,
  SemanticTargetOperationRow,
  SemanticResourceDeclarationMode,
  SemanticRuntimeControllerRow,
  SemanticRuntimeCompositionRow,
  SemanticRuntimeWatcherObservedDependencyRow,
  SemanticRuntimeWatcherRow,
  SemanticTemplateDiagnosticRow,
  SemanticTemplateCursorSuggestionRow,
  SemanticTemplateCursorSuggestionValueTypeSource,
} from './contracts.js';
import { SemanticRuntimeDetail } from './contracts.js';
import { readAppOpenSeams } from './open-seam-projections.js';
import {
  readComputedObservationDefinitionRows,
  readComputedObserverObservedDependencyRows,
  readComputedObserverSourceRows,
} from './observation-projections.js';
import { readResourceDefinitionRows } from './resource-projections.js';
import {
  readRuntimeControllerRows,
  readRuntimeWatcherObservedDependencyRows,
  readRuntimeWatcherRows,
} from './controller-projections.js';
import { readRuntimeCompositionRows } from './composition-projections.js';
import { readSemanticRouteEffectFactRows } from './route-effect-facts.js';
import { RuntimeBindingValueChannelKind } from '../observation/runtime-binding-observation.js';
import { ComputedObserverRuntimeKind } from '../observation/computed-observer-source.js';
import { RuntimeBindingTargetKind } from '../template/runtime-binding.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';
import { describeAddress, type SemanticSourceReference } from './source-reference.js';
import { readSemanticTemplateDiagnostics } from './template-completion.js';
import {
  normalizeHostPath,
  sourcePathMatchesFileName,
} from '../kernel/source-address.js';

interface OrientationFacts {
  readonly project: ProjectBootFrame;
  readonly emission: AureliaAppWorldProjectEmission;
  readonly store: KernelStore;
  readonly topology: ReturnType<typeof readSemanticApplicationTopology>;
  readonly resourceDefinitions: ReturnType<typeof readResourceDefinitionRows>;
  readonly runtimeControllers: readonly SemanticRuntimeControllerRow[];
  readonly runtimeWatchers: readonly SemanticRuntimeWatcherRow[];
  readonly runtimeWatcherObservedDependencies: readonly SemanticRuntimeWatcherObservedDependencyRow[];
  readonly runtimeCompositions: readonly SemanticRuntimeCompositionRow[];
  readonly bindingTargetAccesses: readonly SemanticBindingTargetAccessRow[];
  readonly targetOperations: readonly SemanticTargetOperationRow[];
  readonly bindingValueChannels: readonly SemanticBindingValueChannelRow[];
  readonly bindingBehaviorApplications: readonly SemanticBindingBehaviorApplicationRow[];
  readonly bindingObservedDependencies: readonly SemanticBindingObservedDependencyRow[];
  readonly computedObservationDefinitions: ReturnType<typeof readComputedObservationDefinitionRows>;
  readonly computedObserverSources: readonly SemanticComputedObserverSourceRow[];
  readonly computedObserverObservedDependencies: readonly SemanticComputedObserverObservedDependencyRow[];
  readonly i18nTranslationKeys: readonly SemanticI18nTranslationKeyRow[];
  readonly i18nTranslationBindings: readonly SemanticI18nTranslationBindingRow[];
  readonly stateStores: readonly SemanticStateStoreRow[];
  readonly bindingDataFlows: readonly SemanticBindingDataFlowRow[];
  readonly templateDiagnostics: readonly SemanticTemplateDiagnosticRow[];
  readonly diResolveCallSites: readonly DiResolveCallSite[];
  readonly openSeams: ReturnType<typeof readAppOpenSeams>;
}

interface RepairClusterAccumulator {
  readonly seed: SemanticAuthoringRepairRow;
  count: number;
  siteKinds: Set<NonNullable<SemanticAuthoringRepairRow['siteKind']>>;
  valueSiteKinds: Set<NonNullable<SemanticAuthoringRepairRow['valueSiteKind']>>;
  targetMemberNames: Set<string>;
  actionTargets: Map<string, RepairClusterActionTargetAccumulator>;
  memberHints: Map<string, RepairClusterMemberHintAccumulator>;
  ownerTypeDisplays: Set<string>;
  valueTypeDisplays: Set<string>;
  actionTargetsWithSource: number;
  actionTargetsWithoutSource: number;
  missingInputs: Set<string>;
  openSeamReasonKinds: Set<SemanticAuthoringRepairRow['openSeamReasonKinds'][number]>;
  runtimeBoundaryKinds: Set<SemanticAuthoringRepairRow['runtimeBoundaryKinds'][number]>;
  runtimeIntentKinds: Set<SemanticAuthoringRepairRow['runtimeIntentKinds'][number]>;
  openReasonKinds: Set<SemanticAuthoringRepairRow['openReasonKinds'][number]>;
}

interface RepairClusterMemberHintAccumulator {
  memberName: string;
  evidenceCount: number;
  valueTypeEvidenceCount: number;
  ownerTypeDisplays: Set<string>;
  valueTypeDisplays: Set<string>;
  valueTypeSources: Set<SemanticTemplateCursorSuggestionValueTypeSource>;
}

interface RepairClusterActionTargetAccumulator {
  targetKind: SemanticAuthoringRepairActionTargetRow['targetKind'];
  source: SemanticAuthoringRepairActionTargetRow['source'];
  typeDisplay: string | null;
  evidenceCount: number;
  memberNames: Set<string>;
}

export function readSemanticAuthoringOrientation(
  project: ProjectBootFrame,
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): SemanticAuthoringOrientationResult {
  return authoringOrientationForFacts(orientationFacts(project, emission, store));
}

export function semanticAuthoringOrientationResultForDetail(
  result: SemanticAuthoringOrientationResult,
  detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
): SemanticAuthoringOrientationResult {
  if (detail === SemanticRuntimeDetail.Handles) {
    return result;
  }
  return {
    ...result,
    coverage: result.coverage.map(compactAuthoringCoverageRow),
    taste: result.taste.map(compactAuthoringTasteAxisRow),
    capabilities: result.capabilities.map(compactAuthoringCapabilityRow),
    operations: [],
    surfaces: result.surfaces.map(compactAuthoringSurfaceRow),
    recipes: result.recipes
      .filter((row) => row.currentFitState !== 'not-applicable')
      .map(compactAuthoringRecipeSeedRow),
    repairs: [],
    repairClusters: result.repairClusters.map(compactAuthoringRepairClusterRow),
  };
}

function compactAuthoringCoverageRow(
  row: SemanticAuthoringCoverageRow,
): SemanticAuthoringCoverageRow {
  return {
    ...row,
    summary: '',
    evidence: [],
  };
}

function compactAuthoringTasteAxisRow(
  row: SemanticAuthoringTasteAxisRow,
): SemanticAuthoringTasteAxisRow {
  return {
    ...row,
    values: row.values.map(compactAuthoringTasteValueRow),
    summary: '',
  };
}

function compactAuthoringTasteValueRow(
  row: SemanticAuthoringTasteValueRow,
): SemanticAuthoringTasteValueRow {
  return {
    ...row,
    summary: '',
    ontologySummary: '',
    observedSummary: '',
    evidence: [],
  };
}

function compactAuthoringCapabilityRow(
  row: SemanticAuthoringCapabilityRow,
): SemanticAuthoringCapabilityRow {
  return {
    ...row,
    summary: '',
    evidence: [],
  };
}

function compactAuthoringSurfaceRow(
  row: SemanticAuthoringAvailableSurfaceRow,
): SemanticAuthoringAvailableSurfaceRow {
  return {
    ...row,
    summary: '',
    evidence: [],
  };
}

function compactAuthoringRecipeSeedRow(
  row: SemanticAuthoringRecipeSeedRow,
): SemanticAuthoringRecipeSeedRow {
  return {
    ...row,
    summary: '',
    expectedEffectKinds: [],
    expectedEffects: [],
  };
}

function compactAuthoringRepairClusterRow(
  row: SemanticAuthoringRepairClusterRow,
): SemanticAuthoringRepairClusterRow {
  return {
    ...row,
    actionTargets: [],
    targetMemberNames: [],
    memberHints: [],
    ownerTypeDisplays: [],
    valueTypeDisplays: [],
  };
}

function orientationFacts(
  project: ProjectBootFrame,
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): OrientationFacts {
  return {
    project,
    emission,
    store,
    topology: readSemanticApplicationTopology(store, emission, false, { includeTypeSurfaces: true }),
    resourceDefinitions: readResourceDefinitionRows(emission, store, false),
    runtimeControllers: readRuntimeControllerRows(emission, store, false),
    runtimeWatchers: readRuntimeWatcherRows(emission, store, false),
    runtimeWatcherObservedDependencies: readRuntimeWatcherObservedDependencyRows(emission, store, false),
    runtimeCompositions: readRuntimeCompositionRows(emission, store, false),
    bindingTargetAccesses: readBindingTargetAccessRows(emission, store, false),
    targetOperations: readTargetOperationRows(emission, store, false),
    bindingValueChannels: readBindingValueChannelRows(emission, store, false),
    bindingBehaviorApplications: readBindingBehaviorApplicationRows(emission, store, false),
    bindingObservedDependencies: readBindingObservedDependencyRows(emission, store, false),
    computedObservationDefinitions: readComputedObservationDefinitionRows(emission, store, false),
    computedObserverSources: readComputedObserverSourceRows(emission, store, false),
    computedObserverObservedDependencies: readComputedObserverObservedDependencyRows(emission, store, false),
    i18nTranslationKeys: readI18nTranslationKeyRows(emission, store, false),
    i18nTranslationBindings: readI18nTranslationBindingRows(emission, store, false),
    stateStores: readStateStoreRows(emission, store, false),
    bindingDataFlows: readBindingDataFlowRows(emission, store, false),
    templateDiagnostics: readSemanticTemplateDiagnostics(
      store,
      project.workspaceRootDir,
      project.rootDir,
      emission,
      null,
      new InquiryPageRequest(1000, null),
      'compact',
    ).value?.rows ?? [],
    diResolveCallSites: readDiResolveCallSites(project, emission.typeSystem),
    openSeams: readAppOpenSeams(emission, store),
  };
}

function authoringOrientationForFacts(
  facts: OrientationFacts,
): SemanticAuthoringOrientationResult {
  const project = projectOrientation(facts.project, facts.emission);
  const coverage = coverageRows(facts);
  const taste = tasteRows(facts);
  const capabilities = capabilityRows(facts);
  const repairs = repairRows(facts);
  const repairClusters = repairClusterRows(repairs);
  const effectObservation = expectedEffectObservationSnapshot(
    facts,
    capabilities,
    taste,
    repairClusters,
  );
  const recipes = recipeRows(effectObservation);
  const openReasons = openReasonRows(capabilities);
  return {
    project,
    displayText: authoringOrientationDisplayText(
      project,
      coverage,
      taste,
      capabilities,
      recipes,
      repairClusters,
      openReasons,
    ),
    coverage,
    taste,
    capabilities,
    operations: operationRows(capabilities, facts),
    surfaces: surfaceRows(facts),
    recipes,
    repairs,
    repairClusters,
    openReasons,
  };
}

const ORIENTATION_TASTE_AXIS_DISPLAY_ORDER: readonly AuthoringTasteAxisKey[] = [
  'template-model-access',
  'form-value-channel',
  'navigation-ownership',
  'state-ownership',
  'component-interface',
  'resource-admission-mode',
  'template-source-ownership',
];

function authoringOrientationDisplayText(
  project: SemanticAuthoringProjectOrientation,
  coverage: readonly SemanticAuthoringCoverageRow[],
  taste: readonly SemanticAuthoringTasteAxisRow[],
  capabilities: readonly SemanticAuthoringCapabilityRow[],
  recipes: readonly SemanticAuthoringRecipeSeedRow[],
  repairClusters: readonly SemanticAuthoringRepairClusterRow[],
  openReasons: readonly SemanticAuthoringOpenReasonRow[],
): string {
  const lines = [
    `Project ${project.projectKey}: ${project.shapeKind}; ${project.sourceFiles} source file(s), ${coverage.length} coverage row(s), ${capabilities.length} capability row(s).`,
  ];
  const tasteHighlights = authoringOrientationTasteHighlights(taste, 4);
  if (tasteHighlights.length > 0) {
    lines.push(`Taste: ${tasteHighlights.join('; ')}.`);
  }
  const recipeHighlights = authoringOrientationRecipeHighlights(recipes, 4);
  if (recipeHighlights.length > 0) {
    lines.push(`Recipe fit: ${recipeHighlights.join('; ')}.`);
  }
  const repairHighlights = authoringOrientationRepairHighlights(repairClusters, 3);
  if (repairHighlights.length > 0) {
    lines.push(`Repair pressure: ${repairHighlights.join('; ')}.`);
  }
  if (openReasons.length > 0) {
    lines.push(`Open reasons: ${openReasons.slice(0, 4).map((reason) => reason.reasonKind).join(', ')}${openReasons.length > 4 ? `, plus ${openReasons.length - 4} more` : ''}.`);
  }
  return lines.join('\n');
}

function authoringOrientationTasteHighlights(
  taste: readonly SemanticAuthoringTasteAxisRow[],
  limit: number,
): readonly string[] {
  const byAxis = new Map(taste.map((axis) => [axis.axisKey, axis]));
  return [
    ...ORIENTATION_TASTE_AXIS_DISPLAY_ORDER.flatMap((axisKey) => {
      const axis = byAxis.get(axisKey);
      return axis == null ? [] : [axis];
    }),
    ...taste.filter((axis) => !ORIENTATION_TASTE_AXIS_DISPLAY_ORDER.includes(axis.axisKey as AuthoringTasteAxisKey)),
  ]
    .filter((axis) => axis.values.length > 0)
    .slice(0, limit)
    .map((axis) => `${axis.axisKey}=${axis.values.slice(0, 3).map(authoringOrientationTasteValueSummary).join(', ')}${axis.values.length > 3 ? `, plus ${axis.values.length - 3} more` : ''}`);
}

function authoringOrientationTasteValueSummary(
  value: SemanticAuthoringTasteValueRow,
): string {
  const evidenceCount = value.evidence.reduce((total, evidenceRow) => total + (evidenceRow.count ?? 1), 0);
  return evidenceCount > 0
    ? `${value.valueKey}(${evidenceCount})`
    : `${value.valueKey}`;
}

function authoringOrientationRecipeHighlights(
  recipes: readonly SemanticAuthoringRecipeSeedRow[],
  limit: number,
): readonly string[] {
  const candidates = recipes
    .filter((recipe) => recipe.currentFitState !== 'not-applicable')
    .slice()
    .sort((left, right) => recipeFitRank(right) - recipeFitRank(left) || right.specificityRank - left.specificityRank);
  const satisfied = candidates.filter((recipe) => recipe.currentFitState === 'satisfied');
  const partial = candidates.filter((recipe) => recipe.currentFitState === 'partial');
  const unsupported = candidates.filter((recipe) => recipe.currentFitState === 'unsupported');
  const primary = satisfied.length > 0
    ? satisfied
    : partial.length > 0 ? partial : unsupported;
  const rows = primary.slice(0, limit).map(authoringOrientationRecipeSummary);
  const remainingPrimary = primary.length - rows.length;
  if (remainingPrimary > 0) {
    rows.push(`${remainingPrimary} more ${primary[0]?.currentFitState ?? 'matching'} recipe candidate(s)`);
  }
  if (satisfied.length > 0 && partial.length > 0) {
    rows.push(`${partial.length} partial recipe candidate(s) hidden from primary fit`);
  }
  if (satisfied.length + partial.length > 0 && unsupported.length > 0) {
    rows.push(`${unsupported.length} unsupported recipe candidate(s)`);
  }
  return rows;
}

function authoringOrientationRecipeSummary(
  recipe: SemanticAuthoringRecipeSeedRow,
): string {
  return `${recipe.key}:${recipe.currentFitState}(${recipe.satisfiedExpectedEffectCount}/${recipe.expectedEffectCount})`;
}

function recipeFitRank(
  recipe: SemanticAuthoringRecipeSeedRow,
): number {
  switch (recipe.currentFitState) {
    case 'satisfied':
      return 4;
    case 'partial':
      return 3;
    case 'unsupported':
      return 2;
    case 'not-applicable':
      return 1;
  }
}

function authoringOrientationRepairHighlights(
  repairClusters: readonly SemanticAuthoringRepairClusterRow[],
  limit: number,
): readonly string[] {
  return repairClusters
    .filter((cluster) => cluster.count > 0)
    .slice(0, limit)
    .map((cluster) => `${cluster.repairKind}:${cluster.count}`);
}

function projectOrientation(
  project: ProjectBootFrame,
  emission: AureliaAppWorldProjectEmission,
): SemanticAuthoringProjectOrientation {
  const shape = readSemanticProjectShape(project);
  return {
    projectKey: project.projectKey,
    rootDir: project.rootDir,
    shapeKind: shape.shapeKind,
    analysisKind: shape.analysisKind,
    analysisDepth: emission.analysisDepth,
    sourceFiles: project.sourceFiles.length,
    sourceRoles: sourceRoleCounts(project),
    aureliaDependencyScopes: shape.aureliaDependencyScopes,
    aureliaSourceSignals: shape.aureliaSourceSignals,
    shapeReasons: shape.shapeReasons,
  };
}

function coverageRows(facts: OrientationFacts): readonly SemanticAuthoringCoverageRow[] {
  const routes = facts.topology.routes.length;
  const diagnostics = facts.templateDiagnostics.length;
  const componentRoles = componentRoleCount(facts);
  return [
    coverage('project-shape', 'Project Shape', 'project-shape', 'project', 'observable', 'source', 1, 'Project shape is available from package and source admission facts.'),
    coverage('app-roots', 'App Roots', 'app-root', 'app', countState(facts.topology.appRoots.length), 'framework-emulated', facts.topology.appRoots.length, 'App root configuration was recovered from the app world.'),
    coverage('source-files', 'Source Files', 'source-file', 'project', countState(facts.project.sourceFiles.length), 'source', facts.project.sourceFiles.length, 'Admitted source files are visible for project-scoped authoring.'),
    coverage('resource-definitions', 'Resource Definitions', 'resource-definition', 'resource', countState(facts.resourceDefinitions.length), 'framework-emulated', facts.resourceDefinitions.length, 'Aurelia resource definitions are recognized and queryable.'),
    coverage('resource-visibility', 'Resource Visibility', 'resource-visibility', 'template', countState(facts.emission.templates.compilerWorlds.length), 'framework-emulated', facts.emission.templates.compilerWorlds.length, 'Compiler worlds expose visible resources and syntax resources.'),
    coverage('routes', 'Routes', 'route', 'route', routes === 0 ? 'open' : 'observable', 'framework-emulated', routes, routes === 0 ? 'No route configs are present in the opened app.' : 'Route configs are queryable from the app world.', routes === 0 ? ['semantic-fact-partial'] : []),
    coverage('runtime-controllers', 'Runtime Controllers', 'runtime-controller', 'component', countState(facts.runtimeControllers.length), 'framework-emulated', facts.runtimeControllers.length, 'Runtime controller hydration rows are queryable.'),
    coverage('runtime-compositions', 'Runtime Compositions', 'runtime-composition', 'template', countState(facts.runtimeCompositions.length), 'framework-emulated', facts.runtimeCompositions.length, 'Dynamic AuCompose composition rows are queryable after binding data-flow.'),
    coverage('component-roles', 'Component Roles', 'component-role', 'component', countState(componentRoles), 'generated-projection', componentRoles, 'Derived component-role rows are available from app topology joins.'),
    coverage('binding-target-accesses', 'Binding Target Accesses', 'binding-target-access', 'template', countState(facts.bindingTargetAccesses.length), 'type-checker', facts.bindingTargetAccesses.length, 'Observer/accessor target facts are queryable for runtime bindings.'),
    coverage('target-operations', 'Target Operations', 'target-operation', 'template', countState(facts.targetOperations.length), 'framework-emulated', facts.targetOperations.length, 'Direct renderer and binding target-operation writes are queryable.'),
    coverage('binding-value-channels', 'Binding Value Channels', 'binding-value-channel', 'template', countState(facts.bindingValueChannels.length), 'type-checker', facts.bindingValueChannels.length, 'Observer-backed runtime value channels are queryable.'),
    coverage('binding-behavior-applications', 'Binding Behavior Applications', 'binding-behavior-application', 'template', countState(facts.bindingBehaviorApplications.length), 'framework-emulated', facts.bindingBehaviorApplications.length, 'Runtime binding-behavior applications are queryable after binding target facts exist.'),
    coverage('binding-data-flows', 'Binding Data Flows', 'binding-data-flow', 'template', countState(facts.bindingDataFlows.length), 'type-checker', facts.bindingDataFlows.length, 'Template source/target data-flow rows are queryable.'),
    coverage('binding-observed-dependencies', 'Binding Observed Dependencies', 'binding-observed-dependency', 'template', countState(facts.bindingObservedDependencies.length), 'framework-emulated', facts.bindingObservedDependencies.length, 'Source-side template connectable dependency rows are queryable for source-to-target bindings.'),
    coverage('computed-observation-definitions', 'Computed Observation Definitions', 'computed-observation-definition', 'component', countState(facts.computedObservationDefinitions.length), 'framework-emulated', facts.computedObservationDefinitions.length, 'Source-backed @computed getter and trackable-method dependency declarations are queryable.'),
    coverage('computed-observer-sources', 'Computed Observer Sources', 'computed-observer-source', 'component', countState(facts.computedObserverSources.length), 'framework-emulated', facts.computedObserverSources.length, 'ObserverLocator ComputedObserver and ControlledComputedObserver source rows are queryable for getter observation semantics.'),
    coverage('computed-observer-observed-dependencies', 'Computed Observer Observed Dependencies', 'computed-observer-observed-dependency', 'component', countState(facts.computedObserverObservedDependencies.length), 'framework-emulated', facts.computedObserverObservedDependencies.length, 'Computed observer dependency reads are queryable as source-observer projection data flow.'),
    coverage('template-diagnostics', 'Template Diagnostics', 'diagnostic', 'template', diagnostics === 0 ? 'observable' : 'repairable', 'type-checker', diagnostics, diagnostics === 0 ? 'Template diagnostics can be queried; current app has no diagnostic rows.' : 'Template diagnostics are present as repair pressure.'),
    coverage('open-seams', 'Open Seams', 'open-seam', 'app', facts.openSeams.length === 0 ? 'verifiable' : 'partial', 'generated-projection', facts.openSeams.length, facts.openSeams.length === 0 ? 'No app open seams are currently reported.' : 'Open seams remain and should gate authoring promises.', facts.openSeams.length === 0 ? [] : ['semantic-fact-partial']),
  ];
}

function coverage(
  key: string,
  title: string,
  surfaceKind: SemanticAuthoringSurfaceKind,
  locus: SemanticAuthoringLocusKind,
  supportState: AuthoringSupportState,
  authority: AuthoringEvidenceAuthority,
  observedCount: number,
  summary: string,
  openReasonKinds: readonly AuthoringOpenReasonKind[] = [],
): SemanticAuthoringCoverageRow {
  return {
    key,
    title,
    surfaceKind,
    locus,
    supportState,
    authority,
    observedCount,
    summary,
    openReasonKinds,
    evidence: [evidence(authority, locus, summary, observedCount)],
  };
}

function tasteRows(facts: OrientationFacts): readonly SemanticAuthoringTasteAxisRow[] {
  return [
    tasteAxis('resource-declaration-mode', resourceDeclarationValues(facts)),
    tasteAxis('resource-admission-mode', resourceAdmissionValues(facts)),
    tasteAxis('state-ownership', stateOwnershipValues(facts)),
    tasteAxis('component-interface', componentInterfaceValues(facts)),
    tasteAxis('template-model-access', templateModelAccessValues(facts)),
    tasteAxis('navigation-ownership', navigationOwnershipValues(facts)),
    tasteAxis('template-source-ownership', templateSourceOwnershipValues(facts)),
    tasteAxis('template-rendering-boundary', templateRenderingBoundaryValues(facts)),
    tasteAxis('form-value-channel', formValueChannelValues(facts)),
    tasteAxis('validation-ownership', validationOwnershipValues(facts)),
    tasteAxis('form-type-surface', formTypeSurfaceValues(facts)),
    tasteAxis('style-resource-ownership', styleResourceOwnershipValues(facts)),
    tasteAxis('style-binding-model', styleBindingModelValues(facts)),
    tasteAxis('type-surface-trust', typeSurfaceTrustValues(facts)),
    tasteAxis('package-topology', packageTopologyValues(facts)),
    tasteAxis('build-tool-profile', buildToolProfileValues(facts)),
    tasteAxis('source-layout', sourceLayoutValues(facts)),
    tasteAxis('agent-legibility', agentLegibilityValues(facts)),
  ];
}

function tasteAxis(
  axisKey: AuthoringTasteAxisKey,
  values: readonly SemanticAuthoringTasteValueRow[],
): SemanticAuthoringTasteAxisRow {
  const axis = AuthoringOntology.readTasteAxis(axisKey);
  const misplacedValue = values.find((value) => value.axisKey !== axisKey);
  if (misplacedValue != null) {
    throw new Error(`Authoring taste value ${misplacedValue.valueKey} belongs to ${misplacedValue.axisKey}, not ${axisKey}`);
  }
  const hasValues = values.length > 0;
  const layerCounts = tasteLayerCounts(values);
  const title = axis?.title ?? axisKey;
  return {
    axisKey,
    title,
    layer: axis?.layer ?? 'derived-reading',
    policyState: layerCounts.primitivePolicyValueCount > 0 ? 'inferred' : 'unavailable',
    confidence: axisConfidence(values),
    primitivePolicyValueCount: layerCounts.primitivePolicyValueCount,
    observedShapeValueCount: layerCounts.observedShapeValueCount,
    derivedReadingValueCount: layerCounts.derivedReadingValueCount,
    values,
    summary: hasValues
      ? tasteAxisSummary(title, layerCounts)
      : `No ${title} value could be observed or derived from current semantic facts.`,
    openReasonKinds: hasValues ? [] : ['taste-axis-unobserved'],
  };
}

interface TasteLayerCounts {
  readonly primitivePolicyValueCount: number;
  readonly observedShapeValueCount: number;
  readonly derivedReadingValueCount: number;
}

function tasteLayerCounts(values: readonly SemanticAuthoringTasteValueRow[]): TasteLayerCounts {
  let primitivePolicyValueCount = 0;
  let observedShapeValueCount = 0;
  let derivedReadingValueCount = 0;
  for (const value of values) {
    switch (value.layer as AuthoringTasteAxisLayer) {
      case 'primitive-policy':
        primitivePolicyValueCount++;
        break;
      case 'observed-shape':
        observedShapeValueCount++;
        break;
      case 'derived-reading':
        derivedReadingValueCount++;
        break;
    }
  }
  return {
    primitivePolicyValueCount,
    observedShapeValueCount,
    derivedReadingValueCount,
  };
}

function tasteAxisSummary(
  title: string,
  counts: TasteLayerCounts,
): string {
  const parts: string[] = [];
  if (counts.primitivePolicyValueCount > 0) {
    parts.push(`${counts.primitivePolicyValueCount} primitive-policy`);
  }
  if (counts.observedShapeValueCount > 0) {
    parts.push(`${counts.observedShapeValueCount} observed-shape`);
  }
  if (counts.derivedReadingValueCount > 0) {
    parts.push(`${counts.derivedReadingValueCount} derived-reading`);
  }
  return `Read ${parts.join(', ')} ${title} value(s) from current semantic facts.`;
}

function axisConfidence(values: readonly SemanticAuthoringTasteValueRow[]): SemanticAuthoringTasteValueRow['confidence'] {
  if (values.some((value) => value.confidence === 'conflicting')) {
    return 'conflicting';
  }
  if (values.length === 0) {
    return 'weak';
  }
  if (values.every((value) => value.confidence === 'certain')) {
    return 'certain';
  }
  if (values.every((value) => value.confidence === 'certain' || value.confidence === 'likely')) {
    return 'likely';
  }
  return 'weak';
}

function tasteValue(
  valueKey: AuthoringTasteValueKey,
  confidence: SemanticAuthoringTasteValueRow['confidence'],
  authority: AuthoringEvidenceAuthority,
  locus: SemanticAuthoringLocusKind,
  summary: string,
  count: number,
): SemanticAuthoringTasteValueRow {
  const descriptor = readAuthoringTasteValueDescriptor(valueKey);
  return {
    valueKey,
    axisKey: descriptor.axisKey,
    layer: descriptor.layer,
    confidence,
    summary,
    ontologySummary: descriptor.summary,
    observedSummary: summary,
    evidence: [evidence(authority, locus, summary, count)],
  };
}

function resourceDeclarationValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const counts = new Map<AuthoringTasteValueKey, number>();
  for (const definition of facts.resourceDefinitions) {
    for (const mode of definition.declarationModes) {
      const valueKey = resourceDeclarationTasteValue(mode);
      if (valueKey != null) {
        counts.set(valueKey, (counts.get(valueKey) ?? 0) + 1);
      }
    }
  }
  if (facts.resourceDefinitions.length > 0 && counts.size === 0) {
    counts.set('declaration-mechanism-unobserved', facts.resourceDefinitions.length);
  }
  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([valueKey, count]) =>
      tasteValue(
        valueKey,
        valueKey === 'declaration-mechanism-unobserved' ? 'weak' : 'likely',
        valueKey === 'legacy-convention-resource-declaration' ? 'framework-emulated' : 'source',
        'resource',
        resourceDeclarationSummary(valueKey),
        count,
      )
    );
}

function resourceDeclarationTasteValue(
  mode: string,
): AuthoringTasteValueKey | null {
  switch (mode) {
    case 'decorator':
      return 'decorator-resource-declaration';
    case 'static-property':
      return 'static-resource-declaration';
    case 'definition-object':
    case 'factory-call':
      return 'definition-object-resource-declaration';
    case 'convention':
      return 'legacy-convention-resource-declaration';
    case 'header':
      return 'declaration-mechanism-unobserved';
    default:
      return null;
  }
}

function resourceDeclarationSummary(
  valueKey: AuthoringTasteValueKey,
): string {
  switch (valueKey) {
    case 'decorator-resource-declaration':
      return 'Resource definitions include decorator-authored metadata.';
    case 'static-resource-declaration':
      return 'Resource definitions include static class-side metadata.';
    case 'definition-object-resource-declaration':
      return 'Resource definitions include explicit definition objects or resource factory calls.';
    case 'legacy-convention-resource-declaration':
      return 'Resource definitions include currently modeled legacy convention-derived metadata.';
    case 'declaration-mechanism-unobserved':
      return 'Resource definitions are present but their declaration mechanism is not projected precisely.';
    default:
      return 'Resource declaration evidence is present.';
  }
}

function resourceAdmissionValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const admissions = facts.emission.configuration.readConfiguration().registrationAdmissions;
  const dependencyAdmissions = facts.resourceDefinitions.reduce((sum, definition) => sum + definition.dependencies.length, 0);
  const conventionAdmissions = resourceDeclarationModeCount(facts, 'convention');
  const counts = new Map<AuthoringTasteValueKey, number>();

  for (const admission of admissions) {
    const frameworkKind = frameworkRegistrationKindForAdmission(admission);
    if (frameworkKind != null) {
      incrementMap(
        counts,
        isPluginFrameworkRegistrationKind(frameworkKind)
          ? 'plugin-registration-admission'
          : 'bundle-registration-admission',
      );
      continue;
    }
    switch (admission.admissionKind) {
      case RegistrationAdmissionKind.ResourceDefinition:
      case RegistrationAdmissionKind.StaticResource:
        incrementMap(counts, 'global-resource-admission');
        break;
      case RegistrationAdmissionKind.PlainClassFallback:
        break;
      case RegistrationAdmissionKind.RegistrationFactory:
      case RegistrationAdmissionKind.ContainerRegisterArgument:
      case RegistrationAdmissionKind.AureliaRegisterArgument:
      case RegistrationAdmissionKind.AureliaFacadeDefault:
      case RegistrationAdmissionKind.RegistryMethod:
      case RegistrationAdmissionKind.ObjectMapEntry:
        incrementMap(counts, 'direct-registration-admission');
        break;
    }
  }

  if (dependencyAdmissions > 0) {
    counts.set('dependency-array-admission', dependencyAdmissions);
  }
  if (conventionAdmissions > 0) {
    counts.set('convention-discovery-admission', conventionAdmissions);
  }

  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([valueKey, count]) =>
      tasteValue(
        valueKey,
        'likely',
        'framework-emulated',
        valueKey === 'dependency-array-admission' || valueKey === 'convention-discovery-admission'
          ? 'resource'
          : 'app',
        resourceAdmissionSummary(valueKey),
        count,
      )
    );
}

function isPluginFrameworkRegistrationKind(kind: FrameworkRegistrationKind): boolean {
  if (isFrameworkRegistrationGroupKind(kind)) {
    return false;
  }
  switch (kind) {
    case FrameworkRegistrationKind.I18nConfiguration:
    case FrameworkRegistrationKind.ValidationConfiguration:
    case FrameworkRegistrationKind.ValidationHtmlConfiguration:
    case FrameworkRegistrationKind.RouterConfiguration:
    case FrameworkRegistrationKind.StateDefaultConfiguration:
    case FrameworkRegistrationKind.DialogConfiguration:
      return true;
    case FrameworkRegistrationKind.StandardConfiguration:
    case FrameworkRegistrationKind.AppTask:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultComponents:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers:
    case FrameworkRegistrationKind.RouterDefaultComponents:
    case FrameworkRegistrationKind.RouterDefaultResources:
      return false;
  }
  return false;
}

function resourceAdmissionSummary(valueKey: AuthoringTasteValueKey): string {
  switch (valueKey) {
    case 'bundle-registration-admission':
      return 'Known framework bundles or registration groups admit capabilities into the app world.';
    case 'plugin-registration-admission':
      return 'Known plugin configuration registries admit capabilities into the app world.';
    case 'direct-registration-admission':
      return 'Direct registration calls or registration objects admit capabilities into the app world.';
    case 'dependency-array-admission':
      return 'Resource dependency arrays admit local resources into component compiler worlds.';
    case 'global-resource-admission':
      return 'Resource definitions are admitted through app-wide resource registration products.';
    case 'convention-discovery-admission':
      return 'Currently modeled convention discovery admits resources without explicit registration.';
    default:
      return 'Resource admission evidence is present.';
  }
}

function incrementMap<TKey>(map: Map<TKey, number>, key: TKey, count = 1): void {
  map.set(key, (map.get(key) ?? 0) + count);
}

function stateOwnershipValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const stateClasses = facts.topology.services.filter((service) => service.role === 'state-source');
  const serviceClasses = facts.topology.services.filter((service) => service.role === 'service-source');
  const stateResolveCalls = resolveCallsForClassNames(facts, stateClasses.map((service) => service.className));
  const serviceResolveCalls = resolveCallsForClassNames(facts, serviceClasses.map((service) => service.className));
  const stateStoreSignals = aureliaStateStoreEvidenceCount(facts);
  const values: SemanticAuthoringTasteValueRow[] = [];
  if (stateClasses.length + serviceClasses.length > 0) {
    if (stateClasses.length > 0) {
      values.push(tasteValue(
        'di-owned-state-class',
        stateResolveCalls > 0 ? 'likely' : 'weak',
        stateResolveCalls > 0 ? 'type-checker' : 'source',
        'project',
        stateResolveCalls > 0
          ? 'State classes are present in app topology and used through import-aware Aurelia resolve calls.'
          : 'State classes are present in app topology; DI ownership still needs injection evidence.',
        stateClasses.length,
      ));
    }
    if (serviceClasses.length > 0) {
      values.push(tasteValue(
        'di-owned-service-layer',
        serviceResolveCalls > 0 ? 'likely' : 'weak',
        serviceResolveCalls > 0 ? 'type-checker' : 'source',
        'project',
        serviceResolveCalls > 0
          ? 'Service classes are present in app topology and used through import-aware Aurelia resolve calls.'
          : 'Service classes are present in app topology; DI ownership still needs injection evidence.',
        serviceClasses.length,
      ));
    }
  }
  if (stateStoreSignals > 0) {
    values.push(tasteValue(
      'aurelia-state-store',
      'likely',
      'framework-emulated',
      'project',
      'StateDefaultConfiguration store products or import-aware IStore resolve calls are visible.',
      stateStoreSignals,
    ));
  }
  if (facts.topology.routes.length > 0) {
    values.push(tasteValue('route-parameter-selected-state', 'weak', 'framework-emulated', 'route', 'Routes are present; route-parameter state selection requires deeper route/component flow evidence.', facts.topology.routes.length));
  }
  return values;
}

function resolveCallsForClassNames(
  facts: OrientationFacts,
  classNames: readonly string[],
): number {
  if (classNames.length === 0) {
    return 0;
  }
  const names = new Set(classNames);
  return facts.diResolveCallSites.filter((callSite) => {
    const keyName = resolveCallKeyName(callSite);
    return keyName != null && names.has(keyName);
  }).length;
}

function aureliaStateStoreEvidenceCount(facts: OrientationFacts): number {
  const configuredStores = facts.emission.state.readStores().length;
  const registrationSignals = configuredStores > 0
    ? 0
    : frameworkRegistrationAdmissionCount(facts, FrameworkRegistrationKind.StateDefaultConfiguration);
  const resolveSignals = facts.diResolveCallSites.filter((callSite) => {
    const keyName = resolveCallKeyName(callSite);
    return keyName === 'IStore' || keyName === 'IStoreRegistry';
  }).length;
  return configuredStores + registrationSignals + resolveSignals;
}

function frameworkRegistrationAdmissionCount(
  facts: OrientationFacts,
  kind: FrameworkRegistrationKind,
): number {
  return facts.emission.configuration.readConfiguration().registrationAdmissions.filter((admission) =>
    frameworkRegistrationKindForAdmission(admission) === kind
  ).length;
}

function resolveCallKeyName(callSite: DiResolveCallSite): string | null {
  if (callSite.keyName != null) {
    return callSite.keyName;
  }
  const text = callSite.keyExpressionText?.trim() ?? null;
  return text != null && /^[A-Za-z_$][\w$]*$/.test(text) ? text : null;
}

function componentInterfaceValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const bindables = facts.topology.components.flatMap((component) => component.bindables);
  const idBindables = bindables.filter((bindable) =>
    bindable.name.toLowerCase().endsWith('id') || bindable.attribute.toLowerCase().endsWith('-id')
  );
  const objectBindables = bindables.filter((bindable) => isObjectInputShape(bindable.effectiveValueTypeShapeKind));
  const callbackBindables = bindables.filter((bindable) => bindable.valueTypeHasCallSignature === true);
  const values: SemanticAuthoringTasteValueRow[] = [];
  if (bindables.length === 0) {
    values.push(tasteValue('no-public-component-interface', 'likely', 'framework-emulated', 'component', 'No component bindable rows are visible in current topology.', facts.topology.components.length));
    return values;
  }
  values.push(tasteValue('public-inputs-present', 'certain', 'framework-emulated', 'component', 'Component bindable rows are visible in current topology.', bindables.length));
  if (idBindables.length > 0) {
    values.push(tasteValue('scalar-id-inputs', 'weak', 'source', 'component', 'Bindable names include scalar ID-shaped component inputs.', idBindables.length));
  }
  if (objectBindables.length > 0) {
    values.push(tasteValue('object-inputs', 'likely', 'type-checker', 'component', 'Bindable member types include object-shaped values.', objectBindables.length));
  }
  if (callbackBindables.length > 0) {
    values.push(tasteValue('callback-function-inputs', 'likely', 'type-checker', 'component', 'Bindable member types include callable values.', callbackBindables.length));
  }
  return values;
}

function templateModelAccessValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const directStateDomainBindings = directStateDomainTemplateBindingCount(facts);
  const oneHopForwardingAccessors = oneHopForwardingAccessorCount(facts);
  const ordinaryGetterObservers = sourceBackedGetterObservationCount(facts);
  const values: SemanticAuthoringTasteValueRow[] = [];
  if (directStateDomainBindings > 0) {
    values.push(tasteValue(
      'direct-state-domain-template-binding',
      'likely',
      'generated-projection',
      'template',
      'App topology service-interaction binding rows show template bindings whose source root is an injected state/domain member.',
      directStateDomainBindings,
    ));
  }
  if (oneHopForwardingAccessors > 0) {
    values.push(tasteValue(
      'one-hop-forwarding-accessor-pressure',
      'likely',
      'source',
      'component',
      'Component accessors return a plain property chain rooted at an injected state/domain member; the template can often bind that state/domain path directly.',
      oneHopForwardingAccessors,
    ));
  }
  if (ordinaryGetterObservers > 0) {
    values.push(tasteValue(
      'source-backed-getter-observation',
      'likely',
      'framework-emulated',
      'component',
      'Binding observed-dependency rows show template reads of ordinary accessor descriptor getters with source-backed ComputedObserver availability, without @computed metadata.',
      ordinaryGetterObservers,
    ));
  }
  return values;
}

function sourceBackedGetterObservationCount(facts: OrientationFacts): number {
  const sourceBackedGetterKeys = facts.computedObserverSources
    .filter((observer) =>
      observer.observerKind === ComputedObserverRuntimeKind.ComputedObserver
      && observer.triggerKind === 'accessor-descriptor'
      && observer.memberName != null
      && observer.source?.path != null
    );
  if (sourceBackedGetterKeys.length === 0) {
    return 0;
  }

  return facts.bindingObservedDependencies.filter((dependency) =>
    dependency.observedMemberKind === 'accessor'
    && dependency.observedMemberSource?.path != null
    && sourceBackedGetterKeys.some((observer) =>
      observer.memberName === observedDependencyMemberName(dependency)
      && sourcePathMatchesFileName(dependency.observedMemberSource!.path!, observer.source!.path!)
    )
  ).length;
}

function observedDependencyMemberName(
  dependency: SemanticBindingObservedDependencyRow,
): string | null {
  return dependency.memberName ?? dependency.sourceName;
}

function directStateDomainTemplateBindingCount(facts: OrientationFacts): number {
  const directRoots = new Set(
    facts.topology.injections
      .filter((injection) =>
        injection.consumerClassName != null
        && injection.consumerMemberName != null
        && isStateDomainRole(injection.keyDeclarationRole)
      )
      .map((injection) =>
        semanticApplicationComponentMemberKey(injection.consumerClassName!, injection.consumerMemberName!)
      ),
  );
  return facts.topology.serviceInteractionBindings.filter((binding) =>
    isStateDomainRole(binding.interactionTargetRole)
    && directRoots.has(semanticApplicationComponentMemberKey(binding.componentClassName, binding.bindingSourceRootName))
  ).length;
}

function oneHopForwardingAccessorCount(facts: OrientationFacts): number {
  const injectedStateDomainMembersByComponent = new Map<string, Set<string>>();
  for (const injection of facts.topology.injections) {
    if (
      injection.consumerClassName == null
      || injection.consumerMemberName == null
      || !isStateDomainRole(injection.keyDeclarationRole)
    ) {
      continue;
    }
    const key = componentSourceClassKey(injection.consumerPath, injection.consumerClassName);
    const members = injectedStateDomainMembersByComponent.get(key) ?? new Set<string>();
    members.add(injection.consumerMemberName);
    injectedStateDomainMembersByComponent.set(key, members);
  }

  let count = 0;
  for (const component of facts.topology.components) {
    if (component.className == null || component.source?.path == null) {
      continue;
    }
    const componentSourcePath = projectRelativeSourcePath(facts.project, component.source.path);
    const injectedMembers = injectedStateDomainMembersByComponent.get(
      componentSourceClassKey(componentSourcePath, component.className),
    );
    if (injectedMembers == null || injectedMembers.size === 0) {
      continue;
    }
    const templateReadAccessorNames = templateReadAccessorNamesForComponent(
      facts,
      component.elementName,
      componentSourcePath,
    );
    if (templateReadAccessorNames.size === 0) {
      continue;
    }
    const sourceFile = facts.emission.typeSystem.readSourceFileByPath(componentSourcePath);
    if (sourceFile == null) {
      continue;
    }
    count += countOneHopForwardingAccessors(
      sourceFile,
      component.className,
      injectedMembers,
      templateReadAccessorNames,
    );
  }
  return count;
}

function templateReadAccessorNamesForComponent(
  facts: OrientationFacts,
  definitionName: string,
  componentSourcePath: string,
): ReadonlySet<string> {
  const names = new Set<string>();
  for (const dependency of facts.bindingObservedDependencies) {
    if (
      dependency.definitionName !== definitionName
      || dependency.observedMemberKind !== 'accessor'
      || dependency.sourceName == null
      || dependency.observedMemberSource?.path == null
      || !sourcePathMatchesFileName(dependency.observedMemberSource.path, componentSourcePath)
    ) {
      continue;
    }
    names.add(dependency.sourceName);
  }
  return names;
}

function countOneHopForwardingAccessors(
  sourceFile: ts.SourceFile,
  className: string,
  injectedMembers: ReadonlySet<string>,
  templateReadAccessorNames: ReadonlySet<string>,
): number {
  let count = 0;
  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement) || statement.name?.text !== className) {
      continue;
    }
    for (const member of statement.members) {
      if (
        ts.isGetAccessorDeclaration(member)
        && member.name != null
        && ts.isIdentifier(member.name)
        && templateReadAccessorNames.has(member.name.text)
        && getterReturnsInjectedPropertyChain(member, injectedMembers)
      ) {
        count++;
      }
    }
  }
  return count;
}

function getterReturnsInjectedPropertyChain(
  getter: ts.GetAccessorDeclaration,
  injectedMembers: ReadonlySet<string>,
): boolean {
  const statements = getter.body?.statements ?? [];
  if (statements.length !== 1) {
    return false;
  }
  const statement = statements[0] ?? null;
  if (statement == null) {
    return false;
  }
  if (!ts.isReturnStatement(statement) || statement.expression == null) {
    return false;
  }
  const chain = thisPropertyAccessChain(statement.expression);
  const root = chain[0] ?? null;
  return chain.length >= 2 && root != null && injectedMembers.has(root);
}

function thisPropertyAccessChain(expression: ts.Expression): readonly string[] {
  const names: string[] = [];
  let current = unwrapExpression(expression);
  while (ts.isPropertyAccessExpression(current)) {
    names.unshift(current.name.text);
    current = unwrapExpression(current.expression);
  }
  return current.kind === ts.SyntaxKind.ThisKeyword ? names : [];
}

function componentSourceClassKey(sourcePath: string, className: string): string {
  return `${normalizeHostPath(sourcePath)}\0${className}`;
}

function projectRelativeSourcePath(project: ProjectBootFrame, sourcePath: string): string {
  const normalizedRoot = normalizeHostPath(project.rootDir);
  const normalizedSource = normalizeHostPath(sourcePath);
  const rootRelativeSource = removePathPrefix(normalizedSource, normalizedRoot);
  if (rootRelativeSource !== normalizedSource) {
    return rootRelativeSource;
  }
  const workspaceRelativeRoot = removePathPrefix(normalizedRoot, normalizeHostPath(project.workspaceRootDir));
  return removePathPrefix(normalizedSource, workspaceRelativeRoot);
}

function removePathPrefix(sourcePath: string, prefixPath: string): string {
  if (prefixPath.length === 0 || sourcePath === prefixPath) {
    return sourcePath;
  }
  const prefix = `${prefixPath}/`;
  return sourcePath.startsWith(prefix)
    ? sourcePath.slice(prefix.length)
    : sourcePath;
}

function isStateDomainRole(role: string | null): boolean {
  return role === 'state-source' || role === 'model-source';
}

function navigationOwnershipValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  if (facts.topology.routes.length === 0) {
    return [tasteValue('no-router', 'certain', 'framework-emulated', 'route', 'No route config rows are present in the opened app.', 0)];
  }
  const values: SemanticAuthoringTasteValueRow[] = [];
  const decoratorRoutes = facts.topology.routes.filter((route) =>
    route.originKind === RouteConfigOriginKind.RouteDecorator
  ).length;
  const configureCallRoutes = facts.topology.routes.filter((route) =>
    route.originKind === RouteConfigOriginKind.ConfigureCall
  ).length;
  const classStaticDefaultRoutes = facts.topology.routes.filter((route) =>
    route.originKind === RouteConfigOriginKind.ClassStaticDefaults
  ).length;
  const childRoutesPropertyRoutes = facts.topology.routes.filter((route) =>
    route.originKind === RouteConfigOriginKind.ChildRoutesProperty
  ).length;
  const openRoutes = facts.topology.routes.filter((route) =>
    route.valueKind === RouteConfigValueKind.OpenExpression
  ).length;
  const staticRoutes = facts.topology.routes.length - openRoutes;
  const viewportRoutes = facts.topology.routes.filter((route) => route.viewport != null).length;
  const viewports = facts.emission.routeRuntimeTopology.readViewports().length;
  const viewportAgents = facts.emission.routeRuntimeTopology.readViewportAgents().length;
  if (staticRoutes > 0) {
    values.push(tasteValue('static-route-config', 'likely', 'framework-emulated', 'route', 'Route config rows close through static route-config source or class-default facts.', staticRoutes));
  }
  if (decoratorRoutes > 0) {
    values.push(tasteValue('decorator-route-config', 'likely', 'source', 'route', 'Route config rows originate from Aurelia @route decorators.', decoratorRoutes));
  }
  if (configureCallRoutes > 0) {
    values.push(tasteValue('configure-call-route-config', 'likely', 'source', 'route', 'Route config rows originate from Route.configure(...) calls.', configureCallRoutes));
  }
  if (classStaticDefaultRoutes > 0) {
    values.push(tasteValue('class-static-default-route-config', 'likely', 'source', 'route', 'Route config rows originate from static class-side route metadata.', classStaticDefaultRoutes));
  }
  if (childRoutesPropertyRoutes > 0) {
    values.push(tasteValue('child-routes-property-route-config', 'likely', 'source', 'route', 'Nested route config rows originate from a route config routes property.', childRoutesPropertyRoutes));
  }
  if (openRoutes > 0) {
    values.push(tasteValue('dynamic-route-config', 'weak', 'framework-emulated', 'route', 'Some route config rows remain open because their source value is runtime-dependent or not statically enumerable.', openRoutes));
  }
  if (viewportRoutes + viewports + viewportAgents > 0) {
    values.push(tasteValue('viewport-layout-navigation', 'likely', 'framework-emulated', 'route', 'Route configs or runtime router topology expose viewport layout/agent structure.', viewportRoutes + viewports + viewportAgents));
  }
  return values;
}

function templateSourceOwnershipValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const conventionTemplates = facts.resourceDefinitions.filter((definition) =>
    definition.resourceKind === ResourceDefinitionKind.CustomElement
    && definition.template?.source != null
    && definition.declarationModes.includes('convention')
  ).length;
  const externalTemplates = facts.topology.components.filter((component) =>
    component.template?.source != null
  ).length;
  const explicitExternalTemplates = Math.max(0, externalTemplates - conventionTemplates);
  const values: SemanticAuthoringTasteValueRow[] = [];
  if (explicitExternalTemplates > 0) {
    values.push(tasteValue('external-template-file', 'certain', 'source', 'template', 'Component template assets have source references.', explicitExternalTemplates));
  }
  if (conventionTemplates > 0) {
    values.push(tasteValue('convention-template-file', 'likely', 'framework-emulated', 'template', 'Component templates are paired through the currently modeled convention rules.', conventionTemplates));
  }
  return values;
}

function templateRenderingBoundaryValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const templatedElements = facts.resourceDefinitions.filter((definition) =>
    definition.resourceKind === ResourceDefinitionKind.CustomElement && definition.template != null
  );
  const shadowTemplates = templatedElements.filter((definition) => definition.shadowMode != null).length;
  const lightDomTemplates = templatedElements.length - shadowTemplates;
  const templateCompositionHosts = facts.topology.components.reduce((count, component) =>
    count + component.roles.filter((role) =>
      role.roleKind === SemanticApplicationComponentRoleKind.TemplateCompositionHost
    ).length,
  0);
  const dynamicCompositions = facts.runtimeCompositions.filter((composition) =>
    composition.componentResolutionKind !== 'template-only'
  ).length;
  const values: SemanticAuthoringTasteValueRow[] = [];
  if (shadowTemplates > 0) {
    values.push(tasteValue('shadow-dom-template', 'likely', 'framework-emulated', 'template', 'Custom element template definitions carry shadow DOM options.', shadowTemplates));
  }
  if (lightDomTemplates > 0) {
    values.push(tasteValue('light-dom-template', 'likely', 'framework-emulated', 'template', 'Custom element template definitions render through the default light DOM boundary.', lightDomTemplates));
  }
  if (templateCompositionHosts > 0) {
    values.push(tasteValue('template-controller-composition', 'likely', 'framework-emulated', 'template', 'Component role rows show template-controller composition hosts.', templateCompositionHosts));
  }
  if (dynamicCompositions > 0) {
    values.push(tasteValue('dynamic-component-composition', 'likely', 'framework-emulated', 'template', 'Runtime composition rows show dynamic component composition hosts.', dynamicCompositions));
  }
  return values;
}

function formValueChannelValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const valueChannels = facts.bindingValueChannels.filter(isNativeControlValueChannel).length;
  const customControlChannels = facts.bindingValueChannels.filter(isCustomControlValueChannel).length;
  const checkedChannels = facts.bindingValueChannels.filter((channel) =>
    channel.targetProperty === 'checked'
    || channel.channelKind === RuntimeBindingValueChannelKind.CheckedBoolean
    || channel.channelKind === RuntimeBindingValueChannelKind.CheckedRadioValue
    || channel.channelKind === RuntimeBindingValueChannelKind.CheckedCollectionMembership
    || channel.channelKind === RuntimeBindingValueChannelKind.CheckedMapKeyedBoolean
    || channel.channelKind === RuntimeBindingValueChannelKind.CheckedModel
    || channel.channelKind === RuntimeBindingValueChannelKind.ElementModelValue
  ).length;
  const selectChannels = facts.bindingValueChannels.filter((channel) =>
    channel.channelKind === RuntimeBindingValueChannelKind.SelectSingleOptionValue
    || channel.channelKind === RuntimeBindingValueChannelKind.SelectMultipleOptionValues
    || channel.channelKind === RuntimeBindingValueChannelKind.SelectDynamicOptionValue
  ).length;
  const customMatcherChannels = facts.bindingValueChannels.filter((channel) =>
    channel.usesCustomMatcher
  ).length;
  const values: SemanticAuthoringTasteValueRow[] = [];
  if (valueChannels > 0) {
    values.push(tasteValue('native-control-value-binding', 'likely', 'framework-emulated', 'template', 'Value observer channels are present.', valueChannels));
  }
  if (checkedChannels > 0) {
    values.push(tasteValue('checked-model-binding', 'likely', 'framework-emulated', 'template', 'Checked/model binding rows are present.', checkedChannels));
  }
  if (selectChannels > 0) {
    values.push(tasteValue('select-model-binding', 'likely', 'framework-emulated', 'template', 'Select observer model/value binding rows are present.', selectChannels));
  }
  if (customMatcherChannels > 0) {
    values.push(tasteValue('custom-matcher-comparison', 'likely', 'framework-emulated', 'template', 'Checked/select value-channel rows use custom matcher bindings.', customMatcherChannels));
  }
  if (customControlChannels > 0) {
    values.push(tasteValue('custom-control-binding', 'likely', 'framework-emulated', 'template', 'Custom element/component value-channel rows are present.', customControlChannels));
  }
  return values;
}

function validationOwnershipValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const validateBindingApplications = facts.bindingBehaviorApplications.filter((application) =>
    application.behaviorName === 'validate'
  );
  const validateBindingApplicationCount = validateBindingApplications.length;
  const validateTriggerValues = uniqueValues(validateBindingApplications.flatMap((application) =>
    application.staticArgumentValues
  ));
  const validationSourceIssues = facts.emission.validation.readIssues().length;
  const validationRegistrations =
    frameworkRegistrationAdmissionCount(facts, FrameworkRegistrationKind.ValidationConfiguration)
    + frameworkRegistrationAdmissionCount(facts, FrameworkRegistrationKind.ValidationHtmlConfiguration);
  const validationResolveSignals = facts.diResolveCallSites.filter((callSite) => {
    const keyName = resolveCallKeyName(callSite);
    return keyName === 'IValidationController'
      || keyName === 'IValidationRules'
      || keyName === 'IValidationControllerFactory';
  }).length;
  const validationPluginUsage =
    validateBindingApplicationCount
    + validationSourceIssues
    + validationRegistrations
    + validationResolveSignals;
  return validationPluginUsage === 0
    ? []
    : [tasteValue(
      'validation-controller-usage',
      validateBindingApplicationCount + validationRegistrations > 0 ? 'likely' : 'weak',
      'framework-emulated',
      validateBindingApplicationCount > 0 ? 'template' : 'app',
      validationOwnershipSummary(validateBindingApplicationCount, validateTriggerValues, validationRegistrations, validationResolveSignals),
      validationPluginUsage,
    )];
}

function validationOwnershipSummary(
  validateBindingApplications: number,
  validateTriggerValues: readonly string[],
  validationRegistrations: number,
  validationResolveSignals: number,
): string {
  if (validateBindingApplications > 0) {
    return validateTriggerValues.length === 0
      ? 'Runtime binding-behavior analysis found validation-html validate applications.'
      : `Runtime binding-behavior analysis found validation-html validate applications with static trigger values: ${validateTriggerValues.join(', ')}.`;
  }
  if (validationRegistrations > 0) {
    return 'App configuration admits @aurelia/validation or @aurelia/validation-html plugin services.';
  }
  if (validationResolveSignals > 0) {
    return 'DI resolve sites use validation service keys.';
  }
  return 'Validation source-rule issue rows show @aurelia/validation plugin surface usage.';
}

function formTypeSurfaceValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const formValueChannels = facts.bindingValueChannels.filter(isFormValueChannel).length;
  const weakTypeFlows = facts.bindingDataFlows.filter((flow) =>
    (flow.targetProperty === 'value' || flow.targetProperty === 'checked' || flow.targetProperty === 'model')
    && flow.sourceTypeOpenReason != null
  ).length;
  const weakBindableTypes = facts.topology.components
    .flatMap((component) => component.bindables)
    .filter((bindable) => bindable.valueTypeIsWeak === true).length;
  const weakDiagnostics = facts.templateDiagnostics.filter((diagnostic) =>
    diagnostic.diagnosticKind === 'weak-expression-member-owner'
    || diagnostic.missingInputs.some((missingInput) => missingInput.includes('type'))
  ).length;
  const values: SemanticAuthoringTasteValueRow[] = [];
  const weakTypeSurfaceCount = weakTypeFlows + weakBindableTypes + weakDiagnostics;
  if (weakTypeSurfaceCount > 0) {
    values.push(tasteValue('weak-form-type-surface', 'weak', 'type-checker', 'template', 'Form-like binding, bindable, or diagnostic rows expose weak type surfaces.', weakTypeSurfaceCount));
  } else if (formValueChannels > 0) {
    values.push(tasteValue('strict-form-type-surface', 'likely', 'type-checker', 'template', 'Form-like value channels have no current weak type-surface evidence.', formValueChannels));
  }
  return values;
}

function isFormValueChannel(channel: SemanticBindingValueChannelRow): boolean {
  return isNativeControlValueChannel(channel)
    || isCustomControlValueChannel(channel)
    || channel.targetProperty === 'checked'
    || channel.targetProperty === 'model'
    || channel.channelKind === RuntimeBindingValueChannelKind.CheckedBoolean
    || channel.channelKind === RuntimeBindingValueChannelKind.CheckedRadioValue
    || channel.channelKind === RuntimeBindingValueChannelKind.CheckedCollectionMembership
    || channel.channelKind === RuntimeBindingValueChannelKind.CheckedMapKeyedBoolean
    || channel.channelKind === RuntimeBindingValueChannelKind.CheckedModel
    || channel.channelKind === RuntimeBindingValueChannelKind.ElementModelValue
    || channel.channelKind === RuntimeBindingValueChannelKind.SelectSingleOptionValue
    || channel.channelKind === RuntimeBindingValueChannelKind.SelectMultipleOptionValues
    || channel.channelKind === RuntimeBindingValueChannelKind.SelectDynamicOptionValue;
}

function isNativeControlValueChannel(channel: SemanticBindingValueChannelRow): boolean {
  return channel.targetProperty === 'value'
    && channel.targetKind === RuntimeBindingTargetKind.Node;
}

function isCustomControlValueChannel(channel: SemanticBindingValueChannelRow): boolean {
  return channel.targetKind === RuntimeBindingTargetKind.ControllerViewModel
    && !isTemplateControllerValueChannel(channel.channelKind)
    && (
      channel.targetProperty === 'value'
      || channel.targetProperty === 'model'
      || channel.targetProperty === 'checked'
    );
}

function isTemplateControllerValueChannel(channelKind: SemanticBindingValueChannelRow['channelKind']): boolean {
  return channelKind === RuntimeBindingValueChannelKind.TemplateControllerTruthiness
    || channelKind === RuntimeBindingValueChannelKind.TemplateControllerValueScope
    || channelKind === RuntimeBindingValueChannelKind.TemplateControllerSwitchValue
    || channelKind === RuntimeBindingValueChannelKind.TemplateControllerSwitchCaseValue
    || channelKind === RuntimeBindingValueChannelKind.TemplateControllerPromiseValue
    || channelKind === RuntimeBindingValueChannelKind.TemplateControllerPromiseBranchValue
    || channelKind === RuntimeBindingValueChannelKind.TemplateControllerIteration;
}

function styleResourceOwnershipValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const styles = facts.topology.styles ?? [];
  const globalStyles = styles.filter((style) => style.assetKind === 'global-stylesheet').length;
  const componentStyles = styles.filter((style) => style.assetKind === 'component-stylesheet').length;
  const shadowStyles = styles.filter((style) => style.assetKind === 'shadow-dom-styles').length;
  const cssModuleStyles = styles.filter((style) => style.assetKind === 'css-module-style').length;
  const values: SemanticAuthoringTasteValueRow[] = [];
  if (globalStyles > 0) {
    values.push(tasteValue('global-stylesheet', 'likely', 'source', 'style', 'App topology contains global stylesheet imports.', globalStyles));
  }
  if (componentStyles > 0) {
    values.push(tasteValue('component-stylesheet', 'likely', 'source', 'style', 'Component source files import stylesheet assets.', componentStyles));
  }
  if (shadowStyles > 0) {
    values.push(tasteValue('shadow-dom-styles', 'likely', 'framework-emulated', 'style', 'Component style dependencies use Aurelia shadowCSS registries.', shadowStyles));
  }
  if (cssModuleStyles > 0) {
    values.push(tasteValue('css-module-style', 'likely', 'framework-emulated', 'style', 'Component style dependencies use Aurelia cssModules registries.', cssModuleStyles));
  }
  return values;
}

function styleBindingModelValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const classTokenChannels = facts.bindingValueChannels.filter((channel) =>
    channel.channelKind === RuntimeBindingValueChannelKind.ClassAttributeTokens
  ).length;
  const classToggleChannels = facts.bindingValueChannels.filter((channel) =>
    channel.channelKind === RuntimeBindingValueChannelKind.ClassToggle
  ).length;
  const styleRuleChannels = facts.bindingValueChannels.filter((channel) =>
    channel.channelKind === RuntimeBindingValueChannelKind.StyleAttributeRules
  ).length;
  const stylePropertyChannels = facts.bindingValueChannels.filter((channel) =>
    channel.channelKind === RuntimeBindingValueChannelKind.StylePropertyValue
  ).length;
  const values: SemanticAuthoringTasteValueRow[] = [];
  if (classTokenChannels > 0) {
    values.push(tasteValue('class-token-binding', 'likely', 'framework-emulated', 'template', 'Class attribute token value-channel rows are present.', classTokenChannels));
  }
  if (classToggleChannels > 0) {
    values.push(tasteValue('class-toggle-binding', 'likely', 'framework-emulated', 'template', 'Per-class toggle value-channel rows are present.', classToggleChannels));
  }
  if (styleRuleChannels > 0) {
    values.push(tasteValue('style-rule-binding', 'likely', 'framework-emulated', 'template', 'Style attribute rule value-channel rows are present.', styleRuleChannels));
  }
  if (stylePropertyChannels > 0) {
    values.push(tasteValue('style-property-binding', 'likely', 'framework-emulated', 'template', 'Per-property style value-channel rows are present.', stylePropertyChannels));
  }
  return values;
}

function typeSurfaceTrustValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const openTypeRows = facts.bindingDataFlows.filter((flow) => flow.sourceTypeOpenReason != null).length;
  const weakBindableTypes = facts.topology.components
    .flatMap((component) => component.bindables)
    .filter((bindable) => bindable.valueTypeIsWeak === true).length;
  const weakDiagnostics = facts.templateDiagnostics.filter((diagnostic) =>
    diagnostic.diagnosticKind === 'weak-expression-member-owner'
    || diagnostic.ownerTypeShapeKind === CheckerTypeShapeKind.Any
    || diagnostic.ownerTypeShapeKind === CheckerTypeShapeKind.Unknown
  ).length;
  if (facts.bindingDataFlows.length === 0) {
    return [];
  }
  return openTypeRows + weakBindableTypes + weakDiagnostics === 0
    ? [tasteValue('strict-type-surface', 'likely', 'type-checker', 'template', 'Binding data-flow rows have source type coverage in this app.', facts.bindingDataFlows.length)]
    : [tasteValue('any-or-unknown-type-surface', 'weak', 'type-checker', 'template', 'Some binding, bindable, or diagnostic rows expose open or weak type surfaces.', openTypeRows + weakBindableTypes + weakDiagnostics)];
}

function isObjectInputShape(
  shapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null,
): boolean {
  return shapeKind === CheckerTypeShapeKind.Object
    || shapeKind === CheckerTypeShapeKind.Class
    || shapeKind === CheckerTypeShapeKind.Interface;
}

function packageTopologyValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const rolefulFiles = facts.topology.files.length;
  const shape = readSemanticProjectShape(facts.project);
  const values: SemanticAuthoringTasteValueRow[] = [];
  const workspaceDependencyCount = shape.aureliaDependencyScopes
    .filter((entry) => entry.origin === 'workspace-manifest')
    .reduce((sum, entry) => sum + entry.count, 0);
  if (workspaceDependencyCount > 0) {
    values.push(tasteValue('workspace-monorepo', 'likely', 'source', 'project', 'Aurelia dependency context comes from an ancestor workspace manifest.', workspaceDependencyCount));
  }
  if (shape.shapeKind === 'aurelia-resource-library') {
    values.push(tasteValue('resource-library-package', 'certain', 'source', 'project', 'Project shape is an Aurelia resource library.', rolefulFiles));
  }
  if (shape.shapeKind === 'aurelia-app') {
    values.push(tasteValue('single-app-package', 'likely', 'source', 'project', 'The selected project is an Aurelia app package or application shell.', rolefulFiles));
  }
  return values;
}

function buildToolProfileValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const toolingConfigs = facts.project.sourceFiles.filter((source) => source.role === SourceFileRole.ToolingConfig);
  const declarationFiles = facts.project.sourceFiles.filter((source) => source.role === SourceFileRole.Declaration);
  const buildToolConfigs = toolingConfigs.filter((source) => isBuildToolConfigPath(source.path));
  const values: SemanticAuthoringTasteValueRow[] = [];
  if (buildToolConfigs.length > 0) {
    values.push(tasteValue('bundler-config-tooling', 'likely', 'source', 'project', 'Project tooling includes a recognizable bundler or dev-server config.', buildToolConfigs.length));
  }
  if (toolingConfigs.length > 0 && declarationFiles.length > 0 && buildToolConfigs.length === 0) {
    values.push(tasteValue('typecheck-only-tooling', 'likely', 'source', 'project', 'Project tooling exposes TypeScript/module declarations but no recognized bundler or dev-server config.', toolingConfigs.length + declarationFiles.length));
  }
  return values;
}

function isBuildToolConfigPath(sourcePath: string): boolean {
  const normalized = sourcePath.replace(/\\/g, '/').toLowerCase();
  const baseName = normalized.slice(normalized.lastIndexOf('/') + 1);
  return /^(vite|webpack|rollup|parcel|rspack|rsbuild|esbuild)\.config\./.test(baseName);
}

function sourceLayoutValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const rolefulFiles = facts.topology.files.length;
  if (rolefulFiles <= 3) {
    return [];
  }
  return [tasteValue('feature-folder-topology', 'weak', 'source', 'project', 'Multiple roleful app files are present; bounded context detection is not yet modeled.', rolefulFiles)];
}

function agentLegibilityValues(facts: OrientationFacts): readonly SemanticAuthoringTasteValueRow[] {
  const openSeams = facts.openSeams.length;
  const diagnostics = facts.templateDiagnostics.length;
  if (openSeams === 0 && diagnostics === 0 && facts.topology.files.length > 0) {
    return [tasteValue('compact-semantic-facts', 'likely', 'generated-projection', 'app', 'The app has roleful topology and no open seams in current analysis.', facts.topology.files.length)];
  }
  return [tasteValue('semantic-gaps-present', 'weak', 'open', 'app', 'Open seams, template diagnostics, or missing topology reduce current semantic legibility.', openSeams + diagnostics)];
}

function capabilityRows(facts: OrientationFacts): readonly SemanticAuthoringCapabilityRow[] {
  return Object.values(AuthoringCapabilityDescriptors).map((descriptor): SemanticAuthoringCapabilityRow => {
    const operations = AuthoringOntology.readOperationsByCapability(descriptor.key);
    const state = capabilitySupportState(descriptor.key, facts);
    const openReasonKinds = capabilityOpenReasons(descriptor, state, facts);
    return {
      key: descriptor.key,
      title: descriptor.title,
      familyKeys: uniqueValues(operations.map((operation) => operation.familyKey)),
      operationKinds: operations.map((operation) => operation.operationKind),
      supportState: state,
      summary: capabilitySummary(descriptor.key, descriptor.summary, state, facts),
      openReasonKinds,
      evidence: capabilityEvidence(descriptor.key, facts),
    };
  });
}

function capabilitySupportState(
  key: AuthoringCapabilityKey,
  facts: OrientationFacts,
): AuthoringSupportState {
  switch (key) {
    case 'app-shell':
      return facts.topology.appRoots.length > 0 ? 'verifiable' : 'plannable';
    case 'package-tooling':
      return projectToolingEvidenceCount(facts) > 0 ? 'observable' : 'partial';
    case 'native-decorator-authoring':
      return facts.resourceDefinitions.length > 0 ? 'observable' : 'partial';
    case 'convention-authoring':
      return resourceDeclarationModeCount(facts, 'convention') > 0 ? 'observable' : 'partial';
    case 'external-template':
      return facts.topology.components.some((component) => component.template?.source != null) ? 'verifiable' : 'partial';
    case 'resource-authoring':
      return facts.resourceDefinitions.length > 0 ? 'observable' : 'partial';
    case 'component-role-authoring':
      return componentRoleCount(facts) > 0
        ? 'observable'
        : facts.topology.components.length > 0 ? 'partial' : 'open';
    case 'dependency-injection':
      return dependencyInjectionEvidenceCount(facts) > 0 ? 'observable' : 'partial';
    case 'router':
      return routerCapabilitySupportState(facts);
    case 'auth':
    case 'access-control':
    case 'evolution':
      return 'open';
    case 'template-composition':
      return facts.bindingDataFlows.length > 0 ? 'verifiable' : 'partial';
    case 'style-asset-authoring':
      return facts.topology.styles.length > 0 ? 'verifiable' : 'partial';
    case 'design-system':
      return 'open';
    case 'closed-loop-verification':
      if (facts.openSeams.length > 0) {
        return 'partial';
      }
      return facts.templateDiagnostics.length > 0 ? 'repairable' : 'verifiable';
  }
}

function routerCapabilitySupportState(
  facts: OrientationFacts,
): AuthoringSupportState {
  const routeFactRows = readSemanticRouteEffectFactRows(facts.emission, facts.store, facts.topology);
  if (routeFactRows.some(routeFactKind('route-config'))
    && routeFactRows.some(routeFactKind('router-viewport'))
    && routeFactRows.some(routeFactKind('viewport-agent'))
    && routeFactRows.some(routeFactKind('route-tree'))
    && routeFactRows.some(routeFactKind('component-agent'))) {
    return 'verifiable';
  }
  if (routeFactRows.length > 0 || facts.topology.routes.length > 0) {
    return 'partial';
  }
  return 'open';
}

function routeFactKind(
  routeProductKind: string,
): (row: object) => boolean {
  return (row) =>
    (row as { readonly routeProductKind?: unknown }).routeProductKind === routeProductKind;
}

function capabilityOpenReasons(
  descriptor: typeof AuthoringCapabilityDescriptors[keyof typeof AuthoringCapabilityDescriptors],
  state: AuthoringSupportState,
  facts: OrientationFacts,
): readonly AuthoringOpenReasonKind[] {
  const key = descriptor.key;
  const reasons: AuthoringOpenReasonKind[] = [...descriptor.productOpenReasonKinds];
  if (key === 'native-decorator-authoring' && state === 'partial') {
    reasons.push('semantic-fact-partial');
  }
  if (key === 'package-tooling' && projectToolingEvidenceCount(facts) === 0) {
    reasons.push('semantic-fact-partial');
  }
  if (key === 'external-template' && state === 'partial') {
    reasons.push('source-edit-policy-open');
  }
  if (key === 'resource-authoring' && state === 'partial') {
    reasons.push('semantic-fact-partial');
  }
  if (key === 'component-role-authoring' && componentRoleCount(facts) === 0) {
    reasons.push('semantic-fact-partial');
  }
  if (key === 'dependency-injection' && state === 'partial') {
    reasons.push('semantic-fact-partial');
  }
  if (key === 'router' && state === 'partial') {
    reasons.push('semantic-fact-partial');
    if (facts.topology.routes.length === 0) {
      reasons.push('framework-grounding-missing');
    }
  }
  if (key === 'closed-loop-verification' && facts.openSeams.length > 0) {
    reasons.push('semantic-fact-partial');
  }
  if (key === 'convention-authoring' && state === 'partial') {
    reasons.push('framework-grounding-missing');
  }
  if (key === 'style-asset-authoring' && state === 'partial') {
    reasons.push('semantic-fact-partial');
  }
  return uniqueValues(reasons);
}

function capabilitySummary(
  key: AuthoringCapabilityKey,
  descriptorSummary: string,
  state: AuthoringSupportState,
  facts: OrientationFacts,
): string {
  if (key === 'closed-loop-verification') {
    if (facts.openSeams.length > 0) {
      return `${descriptorSummary} Current app still has open seams that should become repair pressure.`;
    }
    if (facts.templateDiagnostics.length > 0) {
      return `${descriptorSummary} Current app can reopen; template diagnostics are available as repair pressure.`;
    }
    return `${descriptorSummary} Current app can reopen with no open seams or template diagnostics, and expected-effect verification is available.`;
  }
  if (key === 'package-tooling') {
    const projectToolingFacts = projectToolingEvidenceCount(facts);
    return projectToolingFacts > 0
      ? `${descriptorSummary} ${projectToolingFacts} package/tooling source-role row(s) are queryable; package-manager and build-tool execution policy remain open.`
      : `${descriptorSummary} Recipe-baseline package/typecheck plans exist, but this app exposes no package/tooling source-role rows yet and execution policy remains open.`;
  }
  if (key === 'router' && facts.topology.routes.length === 0) {
    return `${descriptorSummary} Router substrate exists, but this app has no route pressure yet.`;
  }
  if (key === 'component-role-authoring') {
    const roles = componentRoleCount(facts);
    return roles > 0
      ? `${descriptorSummary} ${roles} component role evidence row(s) are queryable from app topology.`
      : `${descriptorSummary} Component resources are visible, but no role evidence rows were derived.`;
  }
  return `${descriptorSummary} Current support state: ${state}.`;
}

function capabilityEvidence(
  key: AuthoringCapabilityKey,
  facts: OrientationFacts,
): readonly SemanticAuthoringEvidenceRow[] {
  switch (key) {
    case 'app-shell':
      return [evidence('framework-emulated', 'app', 'Recovered app roots from configuration.', facts.topology.appRoots.length)];
    case 'external-template':
      return [evidence('source', 'template', 'Recovered component template assets.', facts.topology.components.filter((component) => component.template != null).length)];
    case 'package-tooling':
      return [evidence('source', 'project', 'Recovered package manifest, tooling config, or declaration source roles.', projectToolingEvidenceCount(facts))];
    case 'resource-authoring':
    case 'native-decorator-authoring':
      return [evidence('framework-emulated', 'resource', 'Recovered resource definitions.', facts.resourceDefinitions.length)];
    case 'convention-authoring':
      return [evidence('framework-emulated', 'resource', 'Recovered convention-derived resource definitions.', resourceDeclarationModeCount(facts, 'convention'))];
    case 'template-composition':
      return [evidence('type-checker', 'template', 'Binding data-flow rows are visible.', facts.bindingDataFlows.length)];
    case 'style-asset-authoring':
      return [evidence('generated-projection', 'style', 'Style asset rows are visible in app topology.', facts.topology.styles.length)];
    case 'router':
      return [evidence('framework-emulated', 'route', 'Route rows are visible for this app.', facts.topology.routes.length)];
    case 'closed-loop-verification':
      return [evidence('generated-projection', 'app', 'Open seam rows are available after app reopen.', facts.openSeams.length)];
    case 'dependency-injection':
      return [evidence('type-checker', 'app', 'DI resolver slots or import-aware Aurelia resolve call sites are visible.', dependencyInjectionEvidenceCount(facts))];
    case 'component-role-authoring':
      return [evidence('generated-projection', 'component', 'Component role rows are derived from app roots, routes, controllers, target operations, and binding data flow.', componentRoleCount(facts))];
    default:
      return [evidence('open', 'app', 'No concrete app evidence is modeled for this capability yet.', 0)];
  }
}

function componentRoleCount(facts: OrientationFacts): number {
  return facts.topology.components.reduce((sum, component) => sum + component.roles.length, 0);
}

function dependencyInjectionEvidenceCount(facts: OrientationFacts): number {
  return facts.emission.appWorld.diWorld.resolverSlots.length + explicitAureliaResolveCallCount(facts);
}

function projectToolingEvidenceCount(facts: OrientationFacts): number {
  return facts.project.sourceFiles.filter((source) =>
    source.role === SourceFileRole.PackageManifest
    || source.role === SourceFileRole.ToolingConfig
    || source.role === SourceFileRole.Declaration
  ).length;
}

function resourceDeclarationModeCount(
  facts: OrientationFacts,
  mode: SemanticResourceDeclarationMode,
): number {
  return facts.resourceDefinitions.filter((definition) => definition.declarationModes.includes(mode)).length;
}

function explicitAureliaResolveCallCount(facts: OrientationFacts): number {
  return facts.diResolveCallSites.length;
}

function operationRows(
  capabilities: readonly SemanticAuthoringCapabilityRow[],
  facts: OrientationFacts,
): readonly SemanticAuthoringOperationRow[] {
  return AuthoringOntology.operations.map((descriptor): SemanticAuthoringOperationRow => {
    const requiredCapabilities = descriptor.requiredCapabilities.map((capabilityKey) =>
      readCapabilityRow(capabilities, capabilityKey)
    );
    const supportState = operationSupportState(descriptor.action, requiredCapabilities, facts);
    const openReasonKinds: readonly AuthoringOpenReasonKind[] = supportState === 'repairable'
      ? []
      : uniqueValues(requiredCapabilities.flatMap((capability) =>
        capability?.openReasonKinds.map((reasonKind) => reasonKind as AuthoringOpenReasonKind)
          ?? ['semantic-fact-partial']
      ));
    return {
      operationKind: descriptor.operationKind,
      familyKey: descriptor.familyKey,
      action: descriptor.action,
      targetKind: descriptor.targetKind,
      requiredCapabilityKeys: descriptor.requiredCapabilities,
      supportState,
      summary: operationSummary(descriptor.summary, descriptor.action, supportState, facts),
      openReasonKinds,
    };
  });
}

function readCapabilityRow(
  capabilities: readonly SemanticAuthoringCapabilityRow[],
  key: AuthoringCapabilityKey,
): SemanticAuthoringCapabilityRow | null {
  return capabilities.find((capability) => capability.key === key) ?? null;
}

function operationSupportState(
  action: string,
  capabilities: readonly (SemanticAuthoringCapabilityRow | null)[],
  facts: OrientationFacts,
): AuthoringSupportState {
  if (capabilities.length === 0) {
    return 'plannable';
  }
  if (action === 'repair' && authoringRepairPressureCount(facts) > 0) {
    return 'repairable';
  }
  if (capabilities.some((capability) => capability == null || capability.supportState === 'open')) {
    return 'open';
  }
  const presentCapabilities = capabilities.filter((capability): capability is SemanticAuthoringCapabilityRow =>
    capability != null
  );
  if (presentCapabilities.some((capability) => capability.supportState === 'partial')) {
    return 'partial';
  }
  if (action === 'verify' && presentCapabilities.every((capability) =>
    authoringSupportStateRank(capability.supportState) >= authoringSupportStateRank('verifiable')
  )) {
    return 'verifiable';
  }
  return 'plannable';
}

function operationSummary(
  descriptorSummary: string,
  action: string,
  supportState: AuthoringSupportState,
  facts: OrientationFacts,
): string {
  if (action === 'repair' && supportState === 'repairable') {
    return `${descriptorSummary} Repair pressure is available from ${facts.templateDiagnostics.length} template diagnostic(s) and ${facts.openSeams.length} open seam(s).`;
  }
  return `${descriptorSummary} Semantic operation support: ${supportState}.`;
}

function authoringRepairPressureCount(facts: OrientationFacts): number {
  return facts.templateDiagnostics.length + facts.openSeams.length;
}

function surfaceRows(facts: OrientationFacts): readonly SemanticAuthoringAvailableSurfaceRow[] {
  return [
    surface('app-roots', 'app-root', 'app', 'App roots', facts.topology.appRoots.length, 'framework-emulated', countState(facts.topology.appRoots.length), 'Recovered app roots.'),
    surface('components', 'resource-definition', 'component', 'Custom element components', facts.topology.components.length, 'framework-emulated', countState(facts.topology.components.length), 'Recovered custom-element components.'),
    surface('services', 'source-file', 'project', 'State and service classes', facts.topology.services.length, 'type-checker', countState(facts.topology.services.length), 'Recovered class-level state, service, and model rows from roleful support source files.'),
    surface('state-stores', 'plugin-api', 'project', '@aurelia/state stores', facts.emission.state.readStores().length, 'framework-emulated', countState(facts.emission.state.readStores().length), 'Recovered StateDefaultConfiguration store builder products before AppTask execution.'),
    surface('resources', 'resource-definition', 'resource', 'Resource definitions', facts.resourceDefinitions.length, 'framework-emulated', countState(facts.resourceDefinitions.length), 'Recovered Aurelia resource definitions.'),
    surface('resource-visibility', 'resource-visibility', 'template', 'Resource visibility', facts.emission.templates.compilerWorlds.length, 'framework-emulated', countState(facts.emission.templates.compilerWorlds.length), 'Compiler-world resource visibility rows.'),
    surface('routes', 'route', 'route', 'Routes', facts.topology.routes.length, 'framework-emulated', facts.topology.routes.length === 0 ? 'open' : 'observable', 'Recovered app route configs.'),
    surface('templates', 'template', 'template', 'Compiled templates', facts.emission.templates.resources.length, 'framework-emulated', countState(facts.emission.templates.resources.length), 'Compiled app-runtime templates.'),
    surface('runtime-controllers', 'runtime-controller', 'component', 'Runtime controllers', facts.runtimeControllers.length, 'framework-emulated', countState(facts.runtimeControllers.length), 'Runtime controller hydration rows.'),
    surface('component-roles', 'component-role', 'component', 'Component roles', componentRoleCount(facts), 'generated-projection', countState(componentRoleCount(facts)), 'Derived app-topology component role rows.'),
    surface('binding-target-accesses', 'binding-target-access', 'template', 'Binding target accesses', facts.bindingTargetAccesses.length, 'type-checker', countState(facts.bindingTargetAccesses.length), 'Observer/accessor target rows for runtime bindings.'),
    surface('target-operations', 'target-operation', 'template', 'Target operations', facts.targetOperations.length, 'framework-emulated', countState(facts.targetOperations.length), 'Direct runtime renderer and binding target writes.'),
    surface('binding-value-channels', 'binding-value-channel', 'template', 'Binding value channels', facts.bindingValueChannels.length, 'type-checker', countState(facts.bindingValueChannels.length), 'Observer-backed runtime value-channel rows.'),
    surface('binding-behavior-applications', 'binding-behavior-application', 'template', 'Binding behavior applications', facts.bindingBehaviorApplications.length, 'framework-emulated', countState(facts.bindingBehaviorApplications.length), 'Runtime binding-behavior application rows.'),
    surface('binding-data-flows', 'binding-data-flow', 'template', 'Binding data flows', facts.bindingDataFlows.length, 'type-checker', countState(facts.bindingDataFlows.length), 'TypeChecker-backed binding data-flow rows.'),
    surface('binding-observed-dependencies', 'binding-observed-dependency', 'template', 'Binding observed dependencies', facts.bindingObservedDependencies.length, 'framework-emulated', countState(facts.bindingObservedDependencies.length), 'Source-side template connectable dependency rows.'),
    surface('computed-observation-definitions', 'computed-observation-definition', 'component', 'Computed observation definitions', facts.computedObservationDefinitions.length, 'framework-emulated', countState(facts.computedObservationDefinitions.length), 'Source-backed @computed dependency declarations.'),
    surface('computed-observer-sources', 'computed-observer-source', 'component', 'Computed observer sources', facts.computedObserverSources.length, 'framework-emulated', countState(facts.computedObserverSources.length), 'ObserverLocator getter source-observer rows.'),
    surface('computed-observer-observed-dependencies', 'computed-observer-observed-dependency', 'component', 'Computed observer observed dependencies', facts.computedObserverObservedDependencies.length, 'framework-emulated', countState(facts.computedObserverObservedDependencies.length), 'Computed observer source dependency rows.'),
    surface('template-diagnostics', 'diagnostic', 'template', 'Template diagnostics', facts.templateDiagnostics.length, 'type-checker', facts.templateDiagnostics.length === 0 ? 'observable' : 'repairable', 'Template diagnostics available for authoring repair pressure.'),
    surface('open-seams', 'open-seam', 'app', 'Open seams', facts.openSeams.length, 'generated-projection', facts.openSeams.length === 0 ? 'verifiable' : 'partial', 'Open semantic seam rows.'),
  ];
}

function surface(
  key: string,
  surfaceKind: SemanticAuthoringSurfaceKind,
  locus: SemanticAuthoringLocusKind,
  title: string,
  count: number,
  authority: AuthoringEvidenceAuthority,
  supportState: AuthoringSupportState,
  summary: string,
): SemanticAuthoringAvailableSurfaceRow {
  return {
    key,
    surfaceKind,
    locus,
    title,
    count,
    supportState,
    authority,
    summary,
    evidence: [evidence(authority, locus, summary, count)],
  };
}

function expectedEffectObservationSnapshot(
  facts: OrientationFacts,
  capabilities: readonly SemanticAuthoringCapabilityRow[],
  taste: readonly SemanticAuthoringTasteAxisRow[],
  repairClusters: readonly SemanticAuthoringRepairClusterRow[],
): ExpectedSemanticEffectObservationSnapshot {
  const shape = readSemanticProjectShape(facts.project);
  return {
    projectShapeKind: shape.shapeKind,
    projectSourceRoles: sourceRoleCounts(facts.project),
    appRoots: facts.topology.appRoots.length,
    resourceDefinitions: facts.resourceDefinitions.length,
    components: facts.topology.components,
    styles: facts.topology.styles,
    services: facts.topology.services,
    stateCompositions: facts.topology.stateCompositions,
    serviceInteractions: facts.topology.serviceInteractions,
    serviceInteractionBindings: facts.topology.serviceInteractionBindings,
    compiledResources: facts.emission.templates.resources.length,
    templateDiagnostics: facts.templateDiagnostics,
    runtimeControllers: facts.runtimeControllers,
    runtimeWatchers: facts.runtimeWatchers,
    runtimeWatcherObservedDependencies: facts.runtimeWatcherObservedDependencies,
    runtimeCompositions: facts.runtimeCompositions,
    bindingTargetAccesses: facts.bindingTargetAccesses,
    targetOperations: facts.targetOperations,
    bindingValueChannels: facts.bindingValueChannels,
    bindingObservedDependencies: facts.bindingObservedDependencies,
    computedObservationDefinitions: facts.computedObservationDefinitions,
    computedObserverSources: facts.computedObserverSources,
    computedObserverObservedDependencies: facts.computedObserverObservedDependencies,
    bindingBehaviorApplications: facts.bindingBehaviorApplications,
    i18nTranslationKeys: facts.i18nTranslationKeys,
    i18nTranslationBindings: facts.i18nTranslationBindings,
    stateStores: facts.stateStores,
    bindingDataFlows: facts.bindingDataFlows,
    routeFacts: facts.emission.routes.readRouteConfigs().length +
      facts.emission.routeRecognizer.readConfigurableRoutes().length +
      facts.emission.routeRecognizer.readEndpoints().length,
    routeFactRows: readSemanticRouteEffectFactRows(facts.emission, facts.store, facts.topology),
    routes: facts.topology.routes,
    dependencyInjectionFacts: facts.emission.appWorld.diWorld.containers.length +
      facts.emission.appWorld.diWorld.resolverSlots.length +
      facts.emission.configuration.readConfiguration().registrationAdmissions.length,
    capabilities,
    taste,
    repairClusters,
    openSeams: facts.openSeams.length,
  };
}

function recipeRows(
  observation: ExpectedSemanticEffectObservationSnapshot,
): readonly SemanticAuthoringRecipeSeedRow[] {
  return Object.values(AuthoringRecipeDescriptors).map((descriptor) => {
    const expectedEffects = expectedSemanticEffectsForRecipe(descriptor.key);
    const expectedEffectRows = expectedEffects.map((effect) =>
      expectedEffectRow(effect, observeExpectedSemanticEffect(effect, observation))
    );
    const signatureEffectRows = expectedEffectRows.filter(isRecipeSignatureEffect);
    const discriminatorEffectRows = expectedEffectRows.filter((effect) => effect.role === 'discriminator');
    const currentFit = recipeCurrentFit(expectedEffectRows);
    return {
      key: descriptor.key,
      title: descriptor.title,
      operationKinds: descriptor.operationKinds,
      baseRecipeKeys: baseRecipeKeysForRecipe(descriptor.key),
      lineageRecipeKeys: recipeLineageKeysForRecipe(descriptor.key),
      specificityRank: recipeSpecificityRankForRecipe(descriptor.key),
      expectedEffectKinds: uniqueValues(expectedEffects.map((effect) => effect.effectKind)),
      expectedEffects: expectedEffectRows,
      expectedEffectCount: expectedEffects.length,
      satisfiedExpectedEffectCount: expectedEffectRows.filter((effect) => effect.currentOutcome === 'satisfied').length,
      failedExpectedEffectCount: expectedEffectRows.filter((effect) => effect.currentOutcome === 'failed').length,
      unsupportedExpectedEffectCount: expectedEffectRows.filter((effect) => effect.currentOutcome === 'unsupported').length,
      signatureExpectedEffectCount: signatureEffectRows.length,
      satisfiedSignatureExpectedEffectCount: signatureEffectRows.filter((effect) => effect.currentOutcome === 'satisfied').length,
      failedSignatureExpectedEffectCount: signatureEffectRows.filter((effect) => effect.currentOutcome === 'failed').length,
      unsupportedSignatureExpectedEffectCount: signatureEffectRows.filter((effect) => effect.currentOutcome === 'unsupported').length,
      discriminatorExpectedEffectCount: discriminatorEffectRows.length,
      satisfiedDiscriminatorExpectedEffectCount: discriminatorEffectRows.filter((effect) => effect.currentOutcome === 'satisfied').length,
      failedDiscriminatorExpectedEffectCount: discriminatorEffectRows.filter((effect) => effect.currentOutcome === 'failed').length,
      unsupportedDiscriminatorExpectedEffectCount: discriminatorEffectRows.filter((effect) => effect.currentOutcome === 'unsupported').length,
      currentFitState: currentFit,
      supportState: descriptor.supportState,
      summary: descriptor.summary,
      openReasonKinds: descriptor.openReasonKinds,
    };
  });
}

function expectedEffectRow(
  effect: ReturnType<typeof expectedSemanticEffectsForRecipe>[number],
  observation: ExpectedSemanticEffectObservationResult,
): SemanticAuthoringExpectedEffectRow {
  return {
    ...semanticAuthoringExpectedEffectContractRow(effect),
    currentObservedCount: observation.observedCount,
    currentOutcome: observation.outcome,
  };
}

function recipeCurrentFit(
  expectedEffects: readonly SemanticAuthoringExpectedEffectRow[],
): SemanticAuthoringRecipeSeedRow['currentFitState'] {
  if (expectedEffects.every((effect) => effect.currentOutcome === 'satisfied')) {
    return 'satisfied';
  }
  if (recipeDiscriminatorsSatisfied(expectedEffects) === false) {
    return 'not-applicable';
  }
  if (recipeSignatureSatisfied(expectedEffects) === false) {
    return 'not-applicable';
  }
  return expectedEffects.some((effect) => effect.currentOutcome === 'unsupported')
    ? 'unsupported'
    : 'partial';
}

function recipeSignatureSatisfied(
  expectedEffects: readonly SemanticAuthoringExpectedEffectRow[],
): boolean | null {
  const signatureEffects = expectedEffects.filter(isRecipeSignatureEffect);
  if (signatureEffects.length === 0) {
    return null;
  }
  return signatureEffects.some((effect) => effect.currentOutcome === 'satisfied');
}

function recipeDiscriminatorsSatisfied(
  expectedEffects: readonly SemanticAuthoringExpectedEffectRow[],
): boolean | null {
  const discriminatorEffects = expectedEffects.filter((effect) => effect.role === 'discriminator');
  if (discriminatorEffects.length === 0) {
    return null;
  }
  return discriminatorEffects.every((effect) => effect.currentOutcome === 'satisfied');
}

function isRecipeSignatureEffect(
  effect: SemanticAuthoringExpectedEffectRow,
): boolean {
  return effect.role === 'signature' || effect.role === 'discriminator';
}

function repairRows(facts: OrientationFacts): readonly SemanticAuthoringRepairRow[] {
  return [
    ...facts.templateDiagnostics.map((diagnostic, index) =>
      repairRowForTemplateDiagnostic(diagnostic, index)
    ),
    ...facts.openSeams.map((seam, index) =>
      repairRowForOpenSeam(facts, seam, index)
    ),
  ];
}

function repairRowForTemplateDiagnostic(
  diagnostic: SemanticTemplateDiagnosticRow,
  index: number,
): SemanticAuthoringRepairRow {
  const repairKind = repairKindForDiagnosticSuggestion(diagnostic.suggestion?.suggestionKind);
  return {
    key: `template-diagnostic:${index}:${diagnostic.diagnosticKind}:${diagnostic.selectedMemberName ?? 'none'}`,
    repairKind,
    evidenceKind: 'template-diagnostic',
    operationKind: 'repair-app',
    supportState: 'repairable',
    authority: diagnosticAuthority(diagnostic),
    locus: 'template',
    source: diagnostic.source,
    diagnosticKind: diagnostic.diagnosticKind,
    siteKind: diagnostic.siteKind,
    valueSiteKind: diagnostic.valueSiteKind,
    seamKindKey: null,
    missingInputs: diagnostic.missingInputs,
    openSeamReasonKinds: [],
    runtimeBoundaryKinds: [],
    runtimeIntentKinds: [],
    suggestion: diagnostic.suggestion,
    summary: repairSummaryForTemplateDiagnostic(diagnostic, repairKind),
    openReasonKinds: ['source-edit-policy-open'],
  };
}

function diagnosticAuthority(
  diagnostic: SemanticTemplateDiagnosticRow,
): AuthoringEvidenceAuthority {
  switch (diagnostic.diagnosticAuthority) {
    case 'framework-runtime-behavior':
    case 'framework-error-code':
      return 'framework-emulated';
    case 'semantic-authoring-policy':
    default:
      return 'type-checker';
  }
}

function repairSummaryForTemplateDiagnostic(
  diagnostic: SemanticTemplateDiagnosticRow,
  repairKind: AuthoringRepairKind,
): string {
  return `${repairKind}: ${diagnostic.suggestion?.summary ?? diagnostic.summary}`;
}

function repairRowForOpenSeam(
  facts: OrientationFacts,
  seam: OrientationFacts['openSeams'][number],
  index: number,
): SemanticAuthoringRepairRow {
  const repairKind = repairKindForOpenSeamReasons(seam.reasonKinds);
  const runtimeBoundaryKinds = repairRuntimeBoundaryKindsForOpenSeamReasons(seam.reasonKinds);
  const runtimeIntentKinds = repairRuntimeIntentKindsForOpenSeamReasons(seam.reasonKinds);
  const source = describeAddress(facts.store, seam.addressHandle);
  return {
    key: `open-seam:${index}:${seam.seamKindKey}`,
    repairKind,
    evidenceKind: 'open-seam',
    operationKind: 'repair-app',
    supportState: repairKind === 'resolve-runtime-boundary' ? 'repairable' : 'partial',
    authority: 'open',
    locus: 'app',
    source,
    diagnosticKind: null,
    siteKind: null,
    valueSiteKind: null,
    seamKindKey: seam.seamKindKey,
    missingInputs: [],
    openSeamReasonKinds: seam.reasonKinds,
    runtimeBoundaryKinds,
    runtimeIntentKinds,
    suggestion: repairSuggestionForOpenSeam(seam, source),
    summary: repairSummaryForOpenSeam(seam.summary, repairKind),
    openReasonKinds: repairOpenReasonsForOpenSeam(repairKind),
  };
}

function repairSuggestionForOpenSeam(
  seam: OrientationFacts['openSeams'][number],
  source: SemanticSourceReference | null,
): SemanticTemplateCursorSuggestionRow {
  return {
    suggestionKind: 'resolve-runtime-boundary',
    actionKind: 'declare-runtime-boundary',
    actionTarget: source == null
      ? null
      : {
        targetKind: 'runtime-boundary',
        source,
        memberName: null,
        typeDisplay: null,
      },
    summary: `${seam.seamKindKey} needs explicit runtime intent before an app-source or substrate repair is honest.`,
    targetMemberName: null,
    ownerTypeDisplay: null,
    valueTypeDisplay: null,
    valueTypeSource: null,
  };
}

function repairClusterRows(
  rows: readonly SemanticAuthoringRepairRow[],
): readonly SemanticAuthoringRepairClusterRow[] {
  const clusters = new Map<string, RepairClusterAccumulator>();
  for (const row of rows) {
    addRepairClusterRow(clusters, row);
  }
  return [...clusters.entries()]
    .map(([key, cluster]) => repairClusterRow(key, cluster))
    .sort((left, right) =>
      right.count - left.count
      || left.repairKind.localeCompare(right.repairKind)
      || left.key.localeCompare(right.key)
    );
}

function addRepairClusterRow(
  clusters: Map<string, RepairClusterAccumulator>,
  row: SemanticAuthoringRepairRow,
): void {
  const key = repairClusterKey(row);
  const existing = clusters.get(key);
  if (existing === undefined) {
    clusters.set(key, newRepairCluster(row));
    return;
  }
  mergeRepairClusterRow(existing, row);
}

function newRepairCluster(row: SemanticAuthoringRepairRow): RepairClusterAccumulator {
  return {
    seed: row,
    count: 1,
    siteKinds: optionalSet(row.siteKind),
    valueSiteKinds: optionalSet(row.valueSiteKind),
    targetMemberNames: optionalSet(row.suggestion?.targetMemberName ?? null),
    actionTargets: repairClusterActionTargetMap(row),
    memberHints: repairClusterMemberHintMap(row),
    ownerTypeDisplays: optionalSet(row.suggestion?.ownerTypeDisplay ?? null),
    valueTypeDisplays: optionalSet(row.suggestion?.valueTypeDisplay ?? null),
    actionTargetsWithSource: row.suggestion?.actionTarget?.source == null ? 0 : 1,
    actionTargetsWithoutSource: row.suggestion?.actionTarget == null || row.suggestion.actionTarget.source != null ? 0 : 1,
    missingInputs: new Set(row.missingInputs),
    openSeamReasonKinds: new Set(row.openSeamReasonKinds),
    runtimeBoundaryKinds: new Set(row.runtimeBoundaryKinds),
    runtimeIntentKinds: new Set(row.runtimeIntentKinds),
    openReasonKinds: new Set(row.openReasonKinds),
  };
}

function mergeRepairClusterRow(
  cluster: RepairClusterAccumulator,
  row: SemanticAuthoringRepairRow,
): void {
  cluster.count += 1;
  addOptional(cluster.siteKinds, row.siteKind);
  addOptional(cluster.valueSiteKinds, row.valueSiteKind);
  addOptional(cluster.targetMemberNames, row.suggestion?.targetMemberName ?? null);
  addRepairClusterActionTargetRow(cluster, row);
  addRepairClusterMemberHint(cluster, row);
  addOptional(cluster.ownerTypeDisplays, row.suggestion?.ownerTypeDisplay ?? null);
  addOptional(cluster.valueTypeDisplays, row.suggestion?.valueTypeDisplay ?? null);
  addRepairClusterActionTarget(cluster, row);
  addAll(cluster.missingInputs, row.missingInputs);
  addAll(cluster.openSeamReasonKinds, row.openSeamReasonKinds);
  addAll(cluster.runtimeBoundaryKinds, row.runtimeBoundaryKinds);
  addAll(cluster.runtimeIntentKinds, row.runtimeIntentKinds);
  addAll(cluster.openReasonKinds, row.openReasonKinds);
}

function addRepairClusterActionTarget(
  cluster: RepairClusterAccumulator,
  row: SemanticAuthoringRepairRow,
): void {
  if (row.suggestion?.actionTarget == null) {
    return;
  }
  if (row.suggestion.actionTarget.source == null) {
    cluster.actionTargetsWithoutSource += 1;
  } else {
    cluster.actionTargetsWithSource += 1;
  }
}

function repairClusterActionTargetMap(
  row: SemanticAuthoringRepairRow,
): Map<string, RepairClusterActionTargetAccumulator> {
  const actionTargets = new Map<string, RepairClusterActionTargetAccumulator>();
  const target = row.suggestion?.actionTarget ?? null;
  if (target == null) {
    return actionTargets;
  }
  const actionTarget = newRepairClusterActionTarget(row);
  if (actionTarget != null) {
    actionTargets.set(repairActionTargetSurfaceKey(target), actionTarget);
  }
  return actionTargets;
}

function addRepairClusterActionTargetRow(
  cluster: RepairClusterAccumulator,
  row: SemanticAuthoringRepairRow,
): void {
  const target = row.suggestion?.actionTarget ?? null;
  if (target == null) {
    return;
  }
  const key = repairActionTargetSurfaceKey(target);
  const existing = cluster.actionTargets.get(key);
  if (existing === undefined) {
    const actionTarget = newRepairClusterActionTarget(row);
    if (actionTarget != null) {
      cluster.actionTargets.set(key, actionTarget);
    }
    return;
  }
  mergeRepairClusterActionTarget(existing, row);
}

function newRepairClusterActionTarget(
  row: SemanticAuthoringRepairRow,
): RepairClusterActionTargetAccumulator | null {
  const target = row.suggestion?.actionTarget ?? null;
  if (target == null) {
    return null;
  }
  const accumulator: RepairClusterActionTargetAccumulator = {
    targetKind: target.targetKind,
    source: target.source,
    typeDisplay: target.typeDisplay,
    evidenceCount: 0,
    memberNames: new Set(),
  };
  mergeRepairClusterActionTarget(accumulator, row);
  return accumulator;
}

function mergeRepairClusterActionTarget(
  target: RepairClusterActionTargetAccumulator,
  row: SemanticAuthoringRepairRow,
): void {
  target.evidenceCount += 1;
  addOptional(target.memberNames, row.suggestion?.targetMemberName ?? null);
}

function repairClusterMemberHintMap(
  row: SemanticAuthoringRepairRow,
): Map<string, RepairClusterMemberHintAccumulator> {
  const memberHints = new Map<string, RepairClusterMemberHintAccumulator>();
  const memberName = row.suggestion?.targetMemberName ?? null;
  if (memberName == null) {
    return memberHints;
  }
  const hint = newRepairClusterMemberHint(memberName);
  mergeRepairClusterMemberHint(hint, row);
  memberHints.set(memberName, hint);
  return memberHints;
}

function addRepairClusterMemberHint(
  cluster: RepairClusterAccumulator,
  row: SemanticAuthoringRepairRow,
): void {
  const memberName = row.suggestion?.targetMemberName ?? null;
  if (memberName == null) {
    return;
  }
  const existing = cluster.memberHints.get(memberName);
  if (existing === undefined) {
    const hint = newRepairClusterMemberHint(memberName);
    mergeRepairClusterMemberHint(hint, row);
    cluster.memberHints.set(memberName, hint);
    return;
  }
  mergeRepairClusterMemberHint(existing, row);
}

function newRepairClusterMemberHint(
  memberName: string,
): RepairClusterMemberHintAccumulator {
  return {
    memberName,
    evidenceCount: 0,
    valueTypeEvidenceCount: 0,
    ownerTypeDisplays: new Set(),
    valueTypeDisplays: new Set(),
    valueTypeSources: new Set(),
  };
}

function mergeRepairClusterMemberHint(
  hint: RepairClusterMemberHintAccumulator,
  row: SemanticAuthoringRepairRow,
): void {
  hint.evidenceCount += 1;
  addOptional(hint.ownerTypeDisplays, row.suggestion?.ownerTypeDisplay ?? null);
  const valueTypeDisplay = row.suggestion?.valueTypeDisplay ?? null;
  if (valueTypeDisplay != null) {
    hint.valueTypeEvidenceCount += 1;
    hint.valueTypeDisplays.add(valueTypeDisplay);
    addOptional(hint.valueTypeSources, row.suggestion?.valueTypeSource ?? null);
  }
}

function repairClusterRow(
  key: string,
  cluster: RepairClusterAccumulator,
): SemanticAuthoringRepairClusterRow {
  const seed = cluster.seed;
  const planning = repairClusterPlanning(seed, cluster);
  return {
    key, repairKind: seed.repairKind, evidenceKind: seed.evidenceKind,
    planKind: planning.planKind, changeDomain: planning.changeDomain, planReadiness: planning.planReadiness,
    operationKind: seed.operationKind, supportState: seed.supportState, authority: seed.authority, locus: seed.locus,
    diagnosticKind: seed.diagnosticKind, seamKindKey: seed.seamKindKey,
    siteKinds: sortedSetValues(cluster.siteKinds), valueSiteKinds: sortedSetValues(cluster.valueSiteKinds),
    suggestionKind: seed.suggestion?.suggestionKind ?? null, actionKind: seed.suggestion?.actionKind ?? null,
    actionTargetKind: seed.suggestion?.actionTarget?.targetKind ?? null,
    actionTargetSourceCoverage: planning.actionTargetSourceCoverage,
    actionTargetCount: cluster.actionTargets.size,
    actionTargets: repairClusterActionTargets(cluster.actionTargets),
    count: cluster.count, targetMemberCount: cluster.targetMemberNames.size,
    targetMemberNames: sortedSetValues(cluster.targetMemberNames),
    memberHints: repairClusterMemberHints(cluster.memberHints),
    ownerTypeCount: cluster.ownerTypeDisplays.size, ownerTypeDisplays: sortedSetValues(cluster.ownerTypeDisplays),
    valueTypeCount: cluster.valueTypeDisplays.size, valueTypeDisplays: sortedSetValues(cluster.valueTypeDisplays),
    missingInputs: sortedSetValues(cluster.missingInputs), openSeamReasonKinds: sortedSetValues(cluster.openSeamReasonKinds),
    runtimeBoundaryKinds: sortedSetValues(cluster.runtimeBoundaryKinds),
    runtimeIntentKinds: sortedSetValues(cluster.runtimeIntentKinds),
    openReasonKinds: planning.openReasonKinds,
    summary: repairClusterSummary(seed, cluster.count),
  };
}

function repairClusterPlanning(
  seed: SemanticAuthoringRepairRow,
  cluster: RepairClusterAccumulator,
): Pick<SemanticAuthoringRepairClusterRow, 'planKind' | 'changeDomain' | 'planReadiness' | 'actionTargetSourceCoverage' | 'openReasonKinds'> {
  const openReasonKinds = sortedSetValues(cluster.openReasonKinds);
  const actionTargetSourceCoverageValue = actionTargetSourceCoverage(
    cluster.actionTargetsWithSource,
    cluster.actionTargetsWithoutSource,
  );
  const planKind = repairPlanKindForRepair(
    seed.repairKind,
    seed.suggestion?.actionKind ?? null,
    seed.suggestion?.actionTarget?.targetKind ?? null,
  );
  return {
    planKind,
    changeDomain: repairChangeDomainForPlan(planKind),
    planReadiness: repairPlanReadinessForCluster(
      planKind,
      actionTargetSourceCoverageValue,
      openReasonKinds,
    ),
    actionTargetSourceCoverage: actionTargetSourceCoverageValue,
    openReasonKinds,
  };
}

function optionalSet<T extends string>(value: T | null): Set<T> {
  const values = new Set<T>();
  addOptional(values, value);
  return values;
}

function addOptional<T extends string>(values: Set<T>, value: T | null): void {
  if (value != null) {
    values.add(value);
  }
}

function addAll<T extends string>(target: Set<T>, values: readonly T[]): void {
  for (const value of values) {
    target.add(value);
  }
}

function actionTargetSourceCoverage(
  withSource: number,
  withoutSource: number,
): SemanticAuthoringRepairClusterRow['actionTargetSourceCoverage'] {
  if (withSource + withoutSource === 0) {
    return 'not-applicable';
  }
  if (withoutSource === 0) {
    return 'all';
  }
  return withSource === 0 ? 'none' : 'some';
}

function repairClusterKey(row: SemanticAuthoringRepairRow): string {
  const signature = [
    row.evidenceKind,
    row.repairKind,
    row.operationKind,
    row.supportState,
    row.authority,
    row.locus,
    row.diagnosticKind ?? 'none',
    row.seamKindKey ?? 'none',
    row.suggestion?.suggestionKind ?? 'none',
    row.suggestion?.actionKind ?? 'none',
    row.suggestion?.actionTarget?.targetKind ?? 'none',
    row.suggestion?.actionTarget == null
      ? 'target-surface:none'
      : `target-surface:${repairActionTargetSurfaceKey(row.suggestion.actionTarget)}`,
    ...[...row.missingInputs].sort(),
    ...[...row.openSeamReasonKinds].sort(),
  ].join(':');
  return [
    'repair-cluster',
    row.evidenceKind,
    row.repairKind,
    row.diagnosticKind ?? row.seamKindKey ?? 'none',
    row.suggestion?.suggestionKind ?? 'none',
    row.suggestion?.actionTarget?.targetKind ?? 'none',
    stableKeyFingerprint(signature),
  ].join(':');
}

function repairClusterSummary(
  row: SemanticAuthoringRepairRow,
  count: number,
): string {
  const action = row.suggestion?.actionKind ?? 'inspect';
  return `${count} ${row.evidenceKind} repair row(s) ask to ${action} through ${row.repairKind}.`;
}

function repairClusterActionTargets(
  actionTargets: ReadonlyMap<string, RepairClusterActionTargetAccumulator>,
): SemanticAuthoringRepairClusterRow['actionTargets'] {
  return [...actionTargets.values()]
    .map((target) => ({
      targetKind: target.targetKind,
      source: target.source,
      typeDisplay: target.typeDisplay,
      memberNames: sortedSetValues(target.memberNames),
      evidenceCount: target.evidenceCount,
    }))
    .sort((left, right) =>
      right.evidenceCount - left.evidenceCount
      || left.targetKind.localeCompare(right.targetKind)
      || sourceReferenceSortKey(left.source).localeCompare(sourceReferenceSortKey(right.source))
      || (left.typeDisplay ?? '').localeCompare(right.typeDisplay ?? '')
    );
}

function repairClusterMemberHints(
  memberHints: ReadonlyMap<string, RepairClusterMemberHintAccumulator>,
): SemanticAuthoringRepairClusterRow['memberHints'] {
  return [...memberHints.values()]
    .map((hint) => ({
      memberName: hint.memberName,
      evidenceCount: hint.evidenceCount,
      ownerTypeDisplays: sortedSetValues(hint.ownerTypeDisplays),
      valueTypeDisplays: sortedSetValues(hint.valueTypeDisplays),
      valueTypeSources: sortedSetValues(hint.valueTypeSources),
      valueTypeCoverage: repairMemberHintValueTypeCoverage(
        hint.valueTypeEvidenceCount,
        hint.evidenceCount,
      ),
    }))
    .sort((left, right) =>
      right.evidenceCount - left.evidenceCount
      || left.memberName.localeCompare(right.memberName)
    );
}

function repairActionTargetSurfaceKey(
  target: NonNullable<NonNullable<SemanticAuthoringRepairRow['suggestion']>['actionTarget']>,
): string {
  return [
    target.targetKind,
    sourceReferenceClusterKey(target.source),
    target.typeDisplay ?? 'type:none',
  ].map(encodedKeyPart).join('|');
}

function sourceReferenceSortKey(
  source: SemanticAuthoringRepairActionTargetRow['source'],
): string {
  return sourceReferenceClusterKey(source);
}

function sourceReferenceClusterKey(
  source: SemanticAuthoringRepairActionTargetRow['source'],
): string {
  if (source == null) {
    return 'source:none';
  }
  return [
    source.kind,
    source.path ?? '',
    source.start == null ? '' : String(source.start),
    source.end == null ? '' : String(source.end),
    source.role ?? '',
    source.scheme ?? '',
    source.value ?? '',
    source.anchor == null ? '' : sourceReferenceClusterKey(source.anchor),
  ].map(encodedKeyPart).join('@');
}

function encodedKeyPart(value: string): string {
  return encodeURIComponent(value);
}

function stableKeyFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function repairMemberHintValueTypeCoverage(
  valueTypeEvidenceCount: number,
  evidenceCount: number,
): SemanticAuthoringRepairClusterRow['memberHints'][number]['valueTypeCoverage'] {
  if (valueTypeEvidenceCount === 0) {
    return 'none';
  }
  return valueTypeEvidenceCount === evidenceCount ? 'all' : 'some';
}

function sortedSetValues<T extends string>(values: ReadonlySet<T>): readonly T[] {
  return [...values].sort();
}

function repairSummaryForOpenSeam(
  summary: string,
  repairKind: AuthoringRepairKind,
): string {
  return `${repairKind}: ${summary}`;
}

function repairOpenReasonsForOpenSeam(
  repairKind: AuthoringRepairKind,
): readonly AuthoringOpenReasonKind[] {
  switch (repairKind) {
    case 'resolve-runtime-boundary':
      return ['runtime-dependent-boundary', 'source-edit-policy-open'];
    case 'extend-semantic-substrate':
      return ['semantic-fact-partial'];
    case 'inspect-open-seam':
    default:
      return ['semantic-fact-partial', 'source-edit-policy-open'];
  }
}

function openReasonRows(capabilities: readonly SemanticAuthoringCapabilityRow[]): readonly SemanticAuthoringOpenReasonRow[] {
  const rows = new Map<AuthoringOpenReasonKind, Set<AuthoringCapabilityKey>>();
  for (const capability of capabilities) {
    for (const reason of capability.openReasonKinds) {
      const key = reason as AuthoringOpenReasonKind;
      const blocking = rows.get(key) ?? new Set<AuthoringCapabilityKey>();
      blocking.add(capability.key as AuthoringCapabilityKey);
      rows.set(key, blocking);
    }
  }
  return [...rows.entries()]
    .map(([reasonKind, blockingCapabilityKeys]) => ({
      reasonKind,
      locus: locusForOpenReason(reasonKind),
      summary: summaryForOpenReason(reasonKind),
      blockingCapabilityKeys: [...blockingCapabilityKeys].sort(),
    }))
    .sort((left, right) => left.reasonKind.localeCompare(right.reasonKind));
}

function locusForOpenReason(reasonKind: AuthoringOpenReasonKind): SemanticAuthoringLocusKind {
  switch (reasonKind) {
    case 'package-tooling-policy-open':
      return 'package';
    case 'plugin-api-discovery-open':
      return 'package';
    case 'weak-type-surface':
      return 'template';
    case 'runtime-dependent-boundary':
      return 'app';
    case 'source-edit-policy-open':
      return 'source-file';
    case 'fixture-effect-model-open':
      return 'app';
    default:
      return 'app';
  }
}

function summaryForOpenReason(reasonKind: AuthoringOpenReasonKind): string {
  switch (reasonKind) {
    case 'taste-axis-unobserved':
      return 'The app does not expose enough evidence to infer this taste axis.';
    case 'taste-axis-conflict':
      return 'Multiple competing taste values are visible and need policy or local explanation.';
    case 'semantic-fact-partial':
      return 'The current semantic facts are partial for this authoring capability.';
    case 'api-query-missing':
      return 'The public API does not yet expose the needed query.';
    case 'edit-operation-missing':
      return 'The source edit operation is not modeled yet.';
    case 'verification-effect-missing':
      return 'Expected semantic effects are not rich enough to verify this operation.';
    case 'framework-grounding-missing':
      return 'Framework-source grounding or Atlas mirror evidence is missing.';
    case 'plugin-api-discovery-open':
      return 'Plugin API discovery is not yet part of the product answer.';
    case 'weak-type-surface':
      return 'TypeChecker-visible owner/member surfaces are weak or unknown.';
    case 'runtime-dependent-boundary':
      return 'The fact depends on runtime values the static product has not modeled.';
    case 'future-product-horizon':
      return 'The concept is a future product direction rather than a specified authoring shape.';
    case 'source-edit-policy-open':
      return 'Formatting/source-edit policy is not modeled.';
    case 'package-tooling-policy-open':
      return 'Package manager, scripts, or build tooling policy is not modeled.';
    case 'fixture-effect-model-open':
      return 'Generated fixture expected effects are not modeled deeply enough yet.';
  }
}

function countState(count: number): AuthoringSupportState {
  return count > 0 ? 'observable' : 'open';
}

function evidence(
  authority: AuthoringEvidenceAuthority,
  locus: SemanticAuthoringLocusKind,
  summary: string,
  count: number,
): SemanticAuthoringEvidenceRow {
  return {
    authority,
    locus,
    summary,
    source: null,
    count,
  };
}
