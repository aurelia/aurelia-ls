import { SemanticAppQueryKind } from '../api/contracts.js';
import {
  ExpectedSemanticEffectKind,
} from './expected-effect.js';

/** Snapshot surface used by the verifier to observe an expected semantic effect kind. */
export enum ExpectedSemanticEffectObservationSurface {
  /** Project shape derived from reopened app summary and topology. */
  ProjectShape = 'project-shape',
  /** Source-file rows with generated package/build/typecheck roles. */
  ProjectSourceRoles = 'project-source-roles',
  /** App-root count from reopened app summary. */
  AppRoots = 'app-roots',
  /** Resource-definition count from reopened app summary. */
  ResourceDefinitions = 'resource-definitions',
  /** App-topology component rows. */
  Components = 'components',
  /** Component role rows nested under app-topology component rows. */
  ComponentRoles = 'component-roles',
  /** App-topology stylesheet/style ownership rows. */
  Styles = 'styles',
  /** App-topology service rows. */
  Services = 'services',
  /** App-topology state-composition rows. */
  StateCompositions = 'state-compositions',
  /** App-topology service interaction rows. */
  ServiceInteractions = 'service-interactions',
  /** App-topology service interaction binding rows. */
  ServiceInteractionBindings = 'service-interaction-bindings',
  /** Component rows whose topology has external template source. */
  ExternalTemplateComponents = 'external-template-components',
  /** Compiled-template count from reopened app summary. */
  TemplateCompilations = 'template-compilations',
  /** Template diagnostic rows. */
  TemplateDiagnostics = 'template-diagnostics',
  /** Observation issue rows. */
  ObservationIssues = 'observation-issues',
  /** Runtime controller rows. */
  RuntimeControllers = 'runtime-controllers',
  /** Runtime watcher rows. */
  RuntimeWatchers = 'runtime-watchers',
  /** Runtime watcher observed-dependency rows. */
  RuntimeWatcherObservedDependencies = 'runtime-watcher-observed-dependencies',
  /** Runtime composition rows. */
  RuntimeCompositions = 'runtime-compositions',
  /** Binding target-access rows. */
  BindingTargetAccesses = 'binding-target-accesses',
  /** Binding source-operation rows. */
  BindingSourceOperations = 'binding-source-operations',
  /** Target-operation rows. */
  TargetOperations = 'target-operations',
  /** Binding value-channel rows. */
  BindingValueChannels = 'binding-value-channels',
  /** Binding behavior application rows. */
  BindingBehaviorApplications = 'binding-behavior-applications',
  /** Binding observed-dependency rows. */
  BindingObservedDependencies = 'binding-observed-dependencies',
  /** Computed observation definition rows. */
  ComputedObservationDefinitions = 'computed-observation-definitions',
  /** Computed observer source rows. */
  ComputedObserverSources = 'computed-observer-sources',
  /** Computed observer observed-dependency rows. */
  ComputedObserverObservedDependencies = 'computed-observer-observed-dependencies',
  /** Static i18n translation-key rows. */
  I18nTranslationKeys = 'i18n-translation-keys',
  /** Runtime i18n translation binding rows. */
  I18nTranslationBindings = 'i18n-translation-bindings',
  /** State store rows. */
  StateStores = 'state-stores',
  /** Binding data-flow rows. */
  BindingDataFlows = 'binding-data-flows',
  /** Router route fact rows or topology route rows. */
  RouteFacts = 'route-facts',
  /** DI/container facts counted from reopened app summary. */
  DependencyInjectionFacts = 'dependency-injection-facts',
  /** Open semantic seam rows. */
  OpenSeams = 'open-seams',
}

/** How official docs/tests should generally seed an expected semantic effect kind. */
export enum ExpectedSemanticEffectSeedPolicy {
  /** The effect proves a generated project reopened; it does not need a dedicated corpus snippet. */
  ReopenBaseline = 'reopen-baseline',
  /** Docs/tests can plausibly provide concrete source snippets for this effect family. */
  CorpusPattern = 'corpus-pattern',
  /** The effect proves absence or closure of an issue family rather than a positive source shape. */
  ClosureContract = 'closure-contract',
}

/** Runtime-readable descriptor for one expected semantic effect kind. */
export interface ExpectedSemanticEffectKindDescriptorRow {
  /** Expected semantic effect kind this descriptor explains. */
  readonly kind: ExpectedSemanticEffectKind;
  /** Short display title for catalog and MCP surfaces. */
  readonly title: string;
  /** What the verifier is expected to observe for this effect family. */
  readonly summary: string;
  /** Snapshot surfaces consumed by fixture verification for this effect family. */
  readonly observationSurfaces: readonly ExpectedSemanticEffectObservationSurface[];
  /** Public query families that normally expose the observed rows. */
  readonly queryKinds: readonly SemanticAppQueryKind[];
  /** General docs/tests seeding posture for this effect kind. */
  readonly seedPolicy: ExpectedSemanticEffectSeedPolicy;
}

/** Runtime-readable expected-effect descriptor rows shared by verification, app-builder, and MCP. */
export const EXPECTED_SEMANTIC_EFFECT_KIND_DESCRIPTOR_ROWS: readonly ExpectedSemanticEffectKindDescriptorRow[] = [
  descriptor(
    ExpectedSemanticEffectKind.ProjectShape,
    'Project Shape',
    'The reopened workspace should be recognizable as an Aurelia app.',
    [ExpectedSemanticEffectObservationSurface.ProjectShape],
    [SemanticAppQueryKind.AppTopology, SemanticAppQueryKind.Summary],
    ExpectedSemanticEffectSeedPolicy.ReopenBaseline,
  ),
  descriptor(
    ExpectedSemanticEffectKind.ProjectTooling,
    'Project Tooling',
    'The reopened project should expose generated package, build, or typecheck source-file roles.',
    [ExpectedSemanticEffectObservationSurface.ProjectSourceRoles],
    [SemanticAppQueryKind.SourceFiles],
    ExpectedSemanticEffectSeedPolicy.ReopenBaseline,
  ),
  descriptor(
    ExpectedSemanticEffectKind.AppRoot,
    'App Root',
    'The reopened app should expose root Aurelia app configuration.',
    [ExpectedSemanticEffectObservationSurface.AppRoots],
    [SemanticAppQueryKind.Summary],
    ExpectedSemanticEffectSeedPolicy.ReopenBaseline,
  ),
  descriptor(
    ExpectedSemanticEffectKind.ResourceDefinition,
    'Resource Definition',
    'The reopened app should expose Aurelia resource definitions.',
    [ExpectedSemanticEffectObservationSurface.ResourceDefinitions],
    [SemanticAppQueryKind.ResourceDefinitions, SemanticAppQueryKind.Summary],
  ),
  descriptor(
    ExpectedSemanticEffectKind.Component,
    'Component',
    'The reopened app should expose custom element/component topology rows.',
    [ExpectedSemanticEffectObservationSurface.Components],
    [SemanticAppQueryKind.AppTopology],
  ),
  descriptor(
    ExpectedSemanticEffectKind.ComponentRole,
    'Component Role',
    'The reopened app should expose generated component-role evidence rows.',
    [ExpectedSemanticEffectObservationSurface.ComponentRoles],
    [SemanticAppQueryKind.AppTopology],
  ),
  descriptor(
    ExpectedSemanticEffectKind.StyleResource,
    'Style Resource',
    'The reopened app should expose stylesheet or style asset ownership rows.',
    [ExpectedSemanticEffectObservationSurface.Styles],
    [SemanticAppQueryKind.AppTopology],
  ),
  descriptor(
    ExpectedSemanticEffectKind.ServiceClass,
    'Service Class',
    'The reopened app should expose source-backed state, service, or model classes in app topology.',
    [ExpectedSemanticEffectObservationSurface.Services],
    [SemanticAppQueryKind.AppTopology],
  ),
  descriptor(
    ExpectedSemanticEffectKind.StateComposition,
    'State Composition',
    'The reopened app should expose public composed state or domain objects owned by a state class.',
    [ExpectedSemanticEffectObservationSurface.StateCompositions],
    [SemanticAppQueryKind.AppTopology],
  ),
  descriptor(
    ExpectedSemanticEffectKind.ServiceInteraction,
    'Service Interaction',
    'The reopened app should expose source-backed calls into topology service, state, or model classes.',
    [ExpectedSemanticEffectObservationSurface.ServiceInteractions],
    [SemanticAppQueryKind.AppTopology],
  ),
  descriptor(
    ExpectedSemanticEffectKind.ServiceInteractionBinding,
    'Service Interaction Binding',
    'The reopened app should join template binding source members to service, state, or model class interactions.',
    [ExpectedSemanticEffectObservationSurface.ServiceInteractionBindings],
    [SemanticAppQueryKind.AppTopology],
  ),
  descriptor(
    ExpectedSemanticEffectKind.ExternalTemplate,
    'External Template',
    'The reopened app should expose component topology rows with external template source.',
    [ExpectedSemanticEffectObservationSurface.ExternalTemplateComponents],
    [SemanticAppQueryKind.AppTopology],
  ),
  descriptor(
    ExpectedSemanticEffectKind.TemplateCompilation,
    'Template Compilation',
    'The reopened app should expose compiled template analysis.',
    [ExpectedSemanticEffectObservationSurface.TemplateCompilations],
    [SemanticAppQueryKind.TemplateCompilations, SemanticAppQueryKind.Summary],
  ),
  descriptor(
    ExpectedSemanticEffectKind.TemplateDiagnostic,
    'Template Diagnostic',
    'The reopened app should expose template diagnostic rows.',
    [ExpectedSemanticEffectObservationSurface.TemplateDiagnostics],
    [SemanticAppQueryKind.TemplateDiagnostics],
  ),
  descriptor(
    ExpectedSemanticEffectKind.ObservationIssue,
    'Observation Issue',
    'The reopened app should expose observation issue rows.',
    [ExpectedSemanticEffectObservationSurface.ObservationIssues],
    [SemanticAppQueryKind.ObservationIssues],
  ),
  descriptor(
    ExpectedSemanticEffectKind.RuntimeController,
    'Runtime Controller',
    'The reopened app should expose runtime controller and hydration facts.',
    [ExpectedSemanticEffectObservationSurface.RuntimeControllers],
    [SemanticAppQueryKind.RuntimeControllers],
  ),
  descriptor(
    ExpectedSemanticEffectKind.RuntimeWatcher,
    'Runtime Watcher',
    'The reopened app should expose controller-owned runtime watcher facts.',
    [ExpectedSemanticEffectObservationSurface.RuntimeWatchers],
    [SemanticAppQueryKind.RuntimeWatchers],
  ),
  descriptor(
    ExpectedSemanticEffectKind.RuntimeWatcherObservedDependency,
    'Runtime Watcher Observed Dependency',
    'The reopened app should expose concrete observed dependencies collected by runtime watchers.',
    [ExpectedSemanticEffectObservationSurface.RuntimeWatcherObservedDependencies],
    [SemanticAppQueryKind.RuntimeWatcherObservedDependencies],
  ),
  descriptor(
    ExpectedSemanticEffectKind.RuntimeComposition,
    'Runtime Composition',
    'The reopened app should expose dynamic au-compose runtime composition facts.',
    [ExpectedSemanticEffectObservationSurface.RuntimeCompositions],
    [SemanticAppQueryKind.RuntimeCompositions],
  ),
  descriptor(
    ExpectedSemanticEffectKind.BindingTargetAccess,
    'Binding Target Access',
    'The reopened app should expose observer/accessor target facts for template bindings.',
    [ExpectedSemanticEffectObservationSurface.BindingTargetAccesses],
    [SemanticAppQueryKind.BindingTargetAccesses],
  ),
  descriptor(
    ExpectedSemanticEffectKind.BindingSourceOperation,
    'Binding Source Operation',
    'The reopened app should expose source-side operation facts for ref and state-dispatch bindings.',
    [ExpectedSemanticEffectObservationSurface.BindingSourceOperations],
    [SemanticAppQueryKind.BindingSourceOperations],
  ),
  descriptor(
    ExpectedSemanticEffectKind.TargetOperation,
    'Target Operation',
    'The reopened app should expose direct runtime target-operation facts for renderer or binding writes.',
    [ExpectedSemanticEffectObservationSurface.TargetOperations],
    [SemanticAppQueryKind.TargetOperations],
  ),
  descriptor(
    ExpectedSemanticEffectKind.BindingValueChannel,
    'Binding Value Channel',
    'The reopened app should expose observer-backed value-channel facts for template bindings.',
    [ExpectedSemanticEffectObservationSurface.BindingValueChannels],
    [SemanticAppQueryKind.BindingValueChannels, SemanticAppQueryKind.BindingValueChannelSummary],
  ),
  descriptor(
    ExpectedSemanticEffectKind.BindingBehaviorApplication,
    'Binding Behavior Application',
    'The reopened app should expose runtime binding-behavior application facts.',
    [ExpectedSemanticEffectObservationSurface.BindingBehaviorApplications],
    [SemanticAppQueryKind.BindingBehaviorApplications],
  ),
  descriptor(
    ExpectedSemanticEffectKind.BindingObservedDependency,
    'Binding Observed Dependency',
    'The reopened app should expose source-side template connectable dependency reads for template bindings.',
    [ExpectedSemanticEffectObservationSurface.BindingObservedDependencies],
    [SemanticAppQueryKind.BindingObservedDependencies, SemanticAppQueryKind.BindingObservedDependencySummary],
  ),
  descriptor(
    ExpectedSemanticEffectKind.ComputedObservationDefinition,
    'Computed Observation Definition',
    'The reopened app should expose source-backed computed getter or method dependency declarations.',
    [ExpectedSemanticEffectObservationSurface.ComputedObservationDefinitions],
    [SemanticAppQueryKind.ComputedObservationDefinitions],
  ),
  descriptor(
    ExpectedSemanticEffectKind.ComputedObserverSource,
    'Computed Observer Source',
    'The reopened app should expose ObserverLocator computed observer source rows for getters.',
    [ExpectedSemanticEffectObservationSurface.ComputedObserverSources],
    [SemanticAppQueryKind.ComputedObserverSources],
  ),
  descriptor(
    ExpectedSemanticEffectKind.ComputedObserverObservedDependency,
    'Computed Observer Observed Dependency',
    'The reopened app should expose source-side dependency reads projected for computed observer getter semantics.',
    [ExpectedSemanticEffectObservationSurface.ComputedObserverObservedDependencies],
    [SemanticAppQueryKind.ComputedObserverObservedDependencies],
  ),
  descriptor(
    ExpectedSemanticEffectKind.I18nTranslationKey,
    'I18n Translation Key',
    'The reopened app should expose static i18n translation-key products.',
    [ExpectedSemanticEffectObservationSurface.I18nTranslationKeys],
    [SemanticAppQueryKind.I18nTranslationKeys],
  ),
  descriptor(
    ExpectedSemanticEffectKind.I18nTranslationBinding,
    'I18n Translation Binding',
    'The reopened app should expose rendered i18n translation binding target groups.',
    [ExpectedSemanticEffectObservationSurface.I18nTranslationBindings],
    [SemanticAppQueryKind.I18nTranslationBindings],
  ),
  descriptor(
    ExpectedSemanticEffectKind.StateStore,
    'State Store',
    'The reopened app should expose @aurelia/state store configuration products.',
    [ExpectedSemanticEffectObservationSurface.StateStores],
    [SemanticAppQueryKind.StateStores],
  ),
  descriptor(
    ExpectedSemanticEffectKind.BindingDataFlow,
    'Binding Data Flow',
    'The reopened app should expose source-to-target TypeChecker data-flow facts.',
    [ExpectedSemanticEffectObservationSurface.BindingDataFlows],
    [SemanticAppQueryKind.BindingDataFlows, SemanticAppQueryKind.BindingDataFlowSummary],
  ),
  descriptor(
    ExpectedSemanticEffectKind.Route,
    'Route',
    'The reopened app should expose route configuration or router topology facts.',
    [ExpectedSemanticEffectObservationSurface.RouteFacts],
    [
      SemanticAppQueryKind.Routes,
      SemanticAppQueryKind.RouterOptions,
      SemanticAppQueryKind.RouteContexts,
      SemanticAppQueryKind.RouterViewports,
      SemanticAppQueryKind.ViewportAgents,
      SemanticAppQueryKind.ComponentAgents,
      SemanticAppQueryKind.RouteTrees,
      SemanticAppQueryKind.RouteNodes,
      SemanticAppQueryKind.RoutePatterns,
      SemanticAppQueryKind.RouteEndpoints,
    ],
  ),
  descriptor(
    ExpectedSemanticEffectKind.DependencyInjection,
    'Dependency Injection',
    'The reopened app should expose DI/container registration and resolver facts.',
    [ExpectedSemanticEffectObservationSurface.DependencyInjectionFacts],
    [SemanticAppQueryKind.Summary, SemanticAppQueryKind.DiIssues],
  ),
  descriptor(
    ExpectedSemanticEffectKind.OpenSeam,
    'Open Seam',
    'The reopened app should expose open seam rows matching requested filters.',
    [ExpectedSemanticEffectObservationSurface.OpenSeams],
    [SemanticAppQueryKind.OpenSeams, SemanticAppQueryKind.OpenSeamSummary],
  ),
  descriptor(
    ExpectedSemanticEffectKind.OpenSeamClosure,
    'Open Seam Closure',
    'The reopened app should have no open seams for the requested scope.',
    [ExpectedSemanticEffectObservationSurface.OpenSeams],
    [SemanticAppQueryKind.OpenSeams, SemanticAppQueryKind.OpenSeamSummary],
    ExpectedSemanticEffectSeedPolicy.ClosureContract,
  ),
] as const;

const EXPECTED_SEMANTIC_EFFECT_KIND_DESCRIPTORS_BY_KIND = new Map(
  EXPECTED_SEMANTIC_EFFECT_KIND_DESCRIPTOR_ROWS.map((row) => [row.kind, row]),
);

/** Resolve a runtime-readable expected-effect descriptor by effect kind. */
export function expectedSemanticEffectKindDescriptor(
  kind: ExpectedSemanticEffectKind,
): ExpectedSemanticEffectKindDescriptorRow | undefined {
  return EXPECTED_SEMANTIC_EFFECT_KIND_DESCRIPTORS_BY_KIND.get(kind);
}

/** Resolve runtime-readable expected-effect descriptors for an effect-kind list. */
export function expectedSemanticEffectKindDescriptorsForKinds(
  kinds: readonly ExpectedSemanticEffectKind[],
): readonly ExpectedSemanticEffectKindDescriptorRow[] {
  return kinds.flatMap((kind) => {
    const row = expectedSemanticEffectKindDescriptor(kind);
    return row == null ? [] : [row];
  });
}

function descriptor(
  kind: ExpectedSemanticEffectKind,
  title: string,
  summary: string,
  observationSurfaces: readonly ExpectedSemanticEffectObservationSurface[],
  queryKinds: readonly SemanticAppQueryKind[],
  seedPolicy: ExpectedSemanticEffectSeedPolicy = ExpectedSemanticEffectSeedPolicy.CorpusPattern,
): ExpectedSemanticEffectKindDescriptorRow {
  return {
    kind,
    title,
    summary,
    observationSurfaces,
    queryKinds,
    seedPolicy,
  };
}
