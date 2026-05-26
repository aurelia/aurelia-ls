import type { SourcePatternUsePolicy } from '../source-plan/source-plan.js';
import type { AppBuilderSolutionSpaceId } from './solution-space.js';

/** Layer where a reusable app-building pattern primarily makes its architectural promise. */
export enum AppBuilderPatternLevel {
  /** Project/package admission, entrypoint, build/tooling, and workspace placement shape. */
  SourceProjectShape = 'source-project-shape',
  /** Durable application frame such as app shell, router shell, navigation shell, or plugin shell. */
  ApplicationFrame = 'application-frame',
  /** User-facing feature surface such as a form, resource index, collection browser, or dashboard. */
  FeatureSurface = 'feature-surface',
  /** State, domain, service, repository, route, session, cache, or plugin boundary. */
  StateDomainIntegrationBoundary = 'state-domain-integration-boundary',
  /** Aurelia-visible interaction mechanism such as value channels, routes, controllers, or class/style bindings. */
  InteractionMechanism = 'interaction-mechanism',
  /** Cross-cutting capability such as validation, i18n, authorization, loading/error/empty, or accessibility. */
  CrossCuttingCapability = 'cross-cutting-capability',
}

/** Stable reusable app-building mechanic identity; app-specific domain examples should not appear here. */
export enum AppBuilderPatternId {
  /** One package with one app entrypoint and source files intended to open as an Aurelia app. */
  SingleAppPackage = 'single-app-package',
  /** Workspace package that contains an app and may coexist with libraries, tooling, or non-app packages. */
  WorkspaceAppPackage = 'workspace-app-package',
  /** Package whose purpose is to expose reusable Aurelia resources rather than an app entrypoint. */
  ResourceLibraryPackage = 'resource-library-package',
  /** Root component, entrypoint, and template without router-owned navigation. */
  MinimalAppShell = 'minimal-app-shell',
  /** Router configuration, routeable components, navigation links, and at least one au-viewport. */
  RoutedAppShell = 'routed-app-shell',
  /** Static section/tab/sidebar navigation whose sections may host independent feature surfaces. */
  SectionedNavigationShell = 'sectioned-navigation-shell',
  /** Router-driven area layout whose named or nested viewports follow from selected route areas. */
  ViewportLayoutShell = 'viewport-layout-shell',
  /** Draft object editing through direct domain/state bindings and submit-readiness behavior. */
  DraftForm = 'draft-form',
  /** Draft or edit form with a service/API submit boundary and submitting/error/success state. */
  ServiceBackedSubmitForm = 'service-backed-submit-form',
  /** Route-selected existing object or draft, usually via a route parameter and loading/lookup boundary. */
  RoutedEditForm = 'routed-edit-form',
  /** Settings/preferences editing surface where a scalar id should not be invented unless the domain requires it. */
  SettingsForm = 'settings-form',
  /** Ordered step flow with stateful progress, next/back rules, and final review pressure. */
  MultiStepWorkflow = 'multi-step-workflow',
  /** Operational collection-management surface with search/filter/sort/page/selection/action mechanics. */
  ResourceIndex = 'resource-index',
  /** Browsing surface for a collection where presentation can be list, card, grid, or table. */
  CollectionBrowser = 'collection-browser',
  /** Card/list presentation profile for a collection browser. */
  CollectionCardBrowser = 'collection-card-browser',
  /** Dense table presentation profile for a collection browser or resource index. */
  CollectionTableBrowser = 'collection-table-browser',
  /** List/detail route pair with route parameter selection, lookup/loading, and return navigation. */
  RoutedCollectionDetail = 'routed-collection-detail',
  /** Multiple summary widgets over state/services with drill-down links and operational density. */
  Dashboard = 'dashboard',
  /** App-level state object resolved through DI and read directly from templates or domain classes. */
  DiOwnedAppState = 'di-owned-app-state',
  /** State object composed from ordinary classes, domain entities, collections, and nested value objects. */
  ComposedDomainState = 'composed-domain-state',
  /** Ordinary domain class with behavior and accessor getters that Aurelia can observe through the observer system. */
  PlainDomainEntity = 'plain-domain-entity',
  /** Getter owned by the domain model because it expresses real behavior, not view-model forwarding. */
  ComputedDomainGetter = 'computed-domain-getter',
  /** Service/repository boundary owned by state or domain code for loading/querying external data. */
  ApiBackedLoading = 'api-backed-loading',
  /** Service/repository boundary owned by state or domain code for saving/submitting external data. */
  ApiBackedSubmit = 'api-backed-submit',
  /** Template reads directly through DI-owned state or domain objects rather than forwarding view-model getters. */
  DirectStateTemplateRead = 'direct-state-template-read',
  /** Template-local object narrowing or handoff such as let/if/with before rendering a detail surface. */
  TemplateLocalObjectHandoff = 'template-local-object-handoff',
  /** Scalar identity boundary used when route selection, lazy loading, or independent component ownership requires it. */
  IdToObjectLookup = 'id-to-object-lookup',
  /** Native input value binding where Aurelia's value observer owns target/source flow. */
  NativeValueChannel = 'native-value-channel',
  /** Select option model/value mechanics where domain identity and string coercion must stay explicit. */
  SelectModelDomainValue = 'select-model-domain-value',
  /** Checkbox/radio checked channel for booleans, array/set/map membership, or keyed values. */
  CheckedCollectionChannel = 'checked-collection-channel',
  /** Route parameter or query parameter selected state used by a feature or shell. */
  RouteParameterSelection = 'route-parameter-selection',
  /** Class token/map or style property binding owned by template/binding semantics. */
  ClassStyleBinding = 'class-style-binding',
  /** Loading, error, and empty branches around async or query-backed state. */
  LoadingErrorEmptyState = 'loading-error-empty-state',
  /** Validation rules, validation controller ownership, validate bindings, and validation display. */
  ValidationPolicy = 'validation-policy',
  /** Translation resources, translation bindings, and localized text/validation mechanics. */
  I18nLocalization = 'i18n-localization',
  /** Component input boundary where a typed object is intentionally handed to a child surface. */
  ComponentObjectBoundary = 'component-object-boundary',
  /** Dynamic component/template composition through au-compose or equivalent composition machinery. */
  DynamicComposition = 'dynamic-composition',
  /** Plugin-backed store/state facility such as @aurelia/state. */
  PluginStoreState = 'plugin-store-state',
}

/** Reusable mechanic descriptor consumed by composition, guidance, and future lowering. */
export interface AppBuilderPatternDescriptor {
  readonly id: AppBuilderPatternId;
  readonly level: AppBuilderPatternLevel;
  readonly title: string;
  readonly summary: string;
  readonly defaultSourcePolicy: SourcePatternUsePolicy;
  readonly solutionSpaceIds?: readonly AppBuilderSolutionSpaceId[];
  readonly requires?: readonly AppBuilderPatternId[];
  readonly companions?: readonly AppBuilderPatternId[];
  readonly cautions?: readonly string[];
}

/** Compact descriptor helper used to keep the catalog declarative. */
export function appBuilderPattern(
  descriptor: AppBuilderPatternDescriptor,
): AppBuilderPatternDescriptor {
  return descriptor;
}
