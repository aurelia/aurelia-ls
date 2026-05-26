import {
  AppBuilderAppStateOwnershipMode,
  AppBuilderAppStylePolicy,
  AppBuilderAreaNavigationPolicy,
  AppBuilderAureliaLoweringAxis,
  AppBuilderBindingPolicy,
  AppBuilderConventionPolicy,
  AppBuilderDomainModelingMode,
  AppBuilderLocalStatePolicy,
  type AppBuilderAureliaLoweringChoiceDescriptor,
  AppBuilderPackageCapability,
  AppBuilderResourceConfigurationSurface,
  AppBuilderResourceDeclarationMode,
  AppBuilderResourceDomEncapsulationMode,
  AppBuilderResourceStylePolicy,
  AppBuilderRouterAdmissionPolicy,
} from './aurelia-lowering-option.js';
import { AppBuilderDomainSlotKind } from './domain-model.js';
import {
  AppBuilderDomainFieldValueKind,
  AppBuilderDomainPresetId,
  type AppBuilderDomainPresetDescriptor,
} from './domain-preset.js';
import { AppBuilderStarterIntentId, type AppBuilderStarterIntentDescriptor } from './intent.js';
import { SourcePatternUsePolicy } from '../source-plan/source-plan.js';
import { appBuilderPattern, AppBuilderPatternId, AppBuilderPatternLevel, type AppBuilderPatternDescriptor } from './pattern.js';
import { AppBuilderReferenceScenarioId, type AppBuilderReferenceScenarioDescriptor } from './reference-scenario.js';
import {
  AppBuilderSeedDataAudience,
  AppBuilderSeedDataDensity,
  AppBuilderSeedDataPurpose,
  AppBuilderSeedDataSetId,
  type AppBuilderSeedDataSetDescriptor,
} from './seed-data.js';
import {
  AppBuilderArchitectureDepth,
  AppBuilderCodeEconomy,
  AppBuilderDataPosture,
  AppBuilderPresentationPosture,
  AppBuilderRoutingDepth,
  AppBuilderSeedProfileId,
  AppBuilderSeedScale,
  type AppBuilderSeedProfileDescriptor,
} from './seed-profile.js';
import { AppBuilderSolutionSpaceId, type AppBuilderSolutionSpaceDescriptor } from './solution-space.js';

export const APP_BUILDER_AURELIA_LOWERING_CHOICES: readonly AppBuilderAureliaLoweringChoiceDescriptor[] = [
  {
    id: AppBuilderConventionPolicy.ConventionsEnabled,
    axis: AppBuilderAureliaLoweringAxis.AppConventionPolicy,
    title: 'Conventions Enabled',
    summary: 'Use Aurelia conventions as an app-wide source layout and resource discovery policy.',
    selection: { appConventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled },
  },
  {
    id: AppBuilderConventionPolicy.ExplicitResourceDeclarations,
    axis: AppBuilderAureliaLoweringAxis.AppConventionPolicy,
    title: 'Explicit Resource Declarations',
    summary: 'Avoid convention reliance and require generated resources to declare/register their contracts explicitly.',
    selection: { appConventionPolicy: AppBuilderConventionPolicy.ExplicitResourceDeclarations },
  },
  {
    id: AppBuilderResourceDeclarationMode.ConventionResource,
    axis: AppBuilderAureliaLoweringAxis.ResourceDeclaration,
    title: 'Convention Resource',
    summary: 'Declare this generated resource through convention when app conventions are enabled.',
    selection: {
      appConventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
      resourceDeclaration: AppBuilderResourceDeclarationMode.ConventionResource,
    },
  },
  {
    id: AppBuilderResourceDeclarationMode.DecoratorResource,
    axis: AppBuilderAureliaLoweringAxis.ResourceDeclaration,
    title: 'Decorator Resource',
    summary: 'Use explicit decorators when authored source should make resource contracts visible at the class.',
    selection: {
      appConventionPolicy: AppBuilderConventionPolicy.ExplicitResourceDeclarations,
      resourceDeclaration: AppBuilderResourceDeclarationMode.DecoratorResource,
    },
  },
  {
    id: AppBuilderResourceDeclarationMode.InlineCustomElement,
    axis: AppBuilderAureliaLoweringAxis.ResourceDeclaration,
    title: 'Inline Custom Element',
    summary: 'Declare a small local custom element inline when compact code matters more than reusable file boundaries.',
    selection: { resourceDeclaration: AppBuilderResourceDeclarationMode.InlineCustomElement },
  },
  {
    id: AppBuilderResourceConfigurationSurface.StaticResourceConfiguration,
    axis: AppBuilderAureliaLoweringAxis.ResourceConfiguration,
    title: 'Static Resource Configuration',
    summary: 'Use static configuration surfaces when they express durable resource or route ownership.',
    selection: { resourceConfigurationSurfaces: [AppBuilderResourceConfigurationSurface.StaticResourceConfiguration] },
  },
  {
    id: AppBuilderAppStateOwnershipMode.DiStateClass,
    axis: AppBuilderAureliaLoweringAxis.AppStateOwnership,
    title: 'DI State Class',
    summary: 'Use a DI-resolved state class as the primary state boundary.',
    selection: { appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass },
  },
  {
    id: AppBuilderDomainModelingMode.PlainDomainComposition,
    axis: AppBuilderAureliaLoweringAxis.DomainModeling,
    title: 'Plain Domain Composition',
    summary: 'Use ordinary domain classes and composed state objects instead of view-model forwarding boilerplate.',
    selection: { domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition },
  },
  {
    id: AppBuilderAppStateOwnershipMode.StatePluginStore,
    axis: AppBuilderAureliaLoweringAxis.AppStateOwnership,
    title: 'State Plugin Store',
    summary: 'Use @aurelia/state only when plugin-backed store semantics are the intended app shape.',
    selection: { appStateOwnership: AppBuilderAppStateOwnershipMode.StatePluginStore },
  },
  {
    id: AppBuilderLocalStatePolicy.ViewModelLocalState,
    axis: AppBuilderAureliaLoweringAxis.LocalStatePolicy,
    title: 'View-Model Local State',
    summary: 'Keep small local state directly on a view-model for compact apps or isolated sections.',
    selection: { localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalState] },
  },
  {
    id: AppBuilderLocalStatePolicy.BindablePassThrough,
    axis: AppBuilderAureliaLoweringAxis.LocalStatePolicy,
    title: 'Bindable Pass-Through',
    summary: 'Pass small local data through bindables at explicit component boundaries.',
    selection: { localStatePolicies: [AppBuilderLocalStatePolicy.BindablePassThrough] },
  },
  {
    id: AppBuilderRouterAdmissionPolicy.NoRouter,
    axis: AppBuilderAureliaLoweringAxis.RouterAdmission,
    title: 'No Router',
    summary: 'Generate a component-tree starter without router registration.',
    selection: { routerAdmission: AppBuilderRouterAdmissionPolicy.NoRouter },
  },
  {
    id: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
    axis: AppBuilderAureliaLoweringAxis.RouterAdmission,
    title: 'Router Configuration',
    summary: 'Register router configuration so individual areas can choose route-driven view selection.',
    selection: { routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration },
  },
  {
    id: AppBuilderAreaNavigationPolicy.BindingDrivenViewSelection,
    axis: AppBuilderAureliaLoweringAxis.AreaNavigationPolicy,
    title: 'Binding-Driven View Selection',
    summary: 'Open details or swap local views through state and bindings instead of routing.',
    selection: { areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.BindingDrivenViewSelection] },
  },
  {
    id: AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection,
    axis: AppBuilderAureliaLoweringAxis.AreaNavigationPolicy,
    title: 'Router-Driven View Selection',
    summary: 'Open details or swap area views through router instructions and viewport ownership.',
    selection: {
      routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
      areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
    },
  },
  {
    id: AppBuilderBindingPolicy.DirectStateTemplateBinding,
    axis: AppBuilderAureliaLoweringAxis.BindingPolicy,
    title: 'Direct State Template Binding',
    summary: 'Bind templates directly to DI state/domain members when that is the clearest Aurelia code.',
    selection: { bindingPolicies: [AppBuilderBindingPolicy.DirectStateTemplateBinding] },
  },
  {
    id: AppBuilderBindingPolicy.RouteIdSelection,
    axis: AppBuilderAureliaLoweringAxis.BindingPolicy,
    title: 'Route ID Selection',
    summary: 'Use route params or scalar IDs when navigation/loading owns the object boundary.',
    selection: {
      routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
      areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
      bindingPolicies: [AppBuilderBindingPolicy.RouteIdSelection],
    },
  },
  {
    id: AppBuilderBindingPolicy.ComponentObjectHandoff,
    axis: AppBuilderAureliaLoweringAxis.BindingPolicy,
    title: 'Component Object Handoff',
    summary: 'Pass typed objects only at deliberate component/detail boundaries.',
    selection: { bindingPolicies: [AppBuilderBindingPolicy.ComponentObjectHandoff] },
  },
  {
    id: AppBuilderPackageCapability.ValidationHtml,
    axis: AppBuilderAureliaLoweringAxis.PackageCapability,
    title: 'Validation HTML',
    summary: 'Use validation-html configuration and validate bindings.',
    selection: { packageCapabilities: [AppBuilderPackageCapability.ValidationHtml] },
  },
  {
    id: AppBuilderPackageCapability.I18n,
    axis: AppBuilderAureliaLoweringAxis.PackageCapability,
    title: 'I18n',
    summary: 'Use i18n configuration and translation bindings.',
    selection: { packageCapabilities: [AppBuilderPackageCapability.I18n] },
  },
  {
    id: AppBuilderResourceDomEncapsulationMode.LightDom,
    axis: AppBuilderAureliaLoweringAxis.ResourceDomEncapsulation,
    title: 'Light DOM',
    summary: 'Generate ordinary light-DOM components without Shadow DOM-specific contracts.',
    selection: { resourceDomEncapsulation: AppBuilderResourceDomEncapsulationMode.LightDom },
  },
  {
    id: AppBuilderResourceDomEncapsulationMode.OpenShadowDom,
    axis: AppBuilderAureliaLoweringAxis.ResourceDomEncapsulation,
    title: 'Open Shadow DOM',
    summary: 'Generate components with open Shadow DOM when DOM/style encapsulation is desired.',
    selection: { resourceDomEncapsulation: AppBuilderResourceDomEncapsulationMode.OpenShadowDom },
  },
  {
    id: AppBuilderResourceDomEncapsulationMode.ClosedShadowDom,
    axis: AppBuilderAureliaLoweringAxis.ResourceDomEncapsulation,
    title: 'Closed Shadow DOM',
    summary: 'Generate closed Shadow DOM only for explicit encapsulation requirements.',
    selection: { resourceDomEncapsulation: AppBuilderResourceDomEncapsulationMode.ClosedShadowDom },
  },
  {
    id: AppBuilderAppStylePolicy.GlobalStylesheet,
    axis: AppBuilderAureliaLoweringAxis.AppStylePolicy,
    title: 'Global Stylesheet',
    summary: 'Generate or admit an application-level stylesheet owned by the app shell.',
    selection: { appStylePolicies: [AppBuilderAppStylePolicy.GlobalStylesheet] },
  },
  {
    id: AppBuilderResourceStylePolicy.ComponentStylesheet,
    axis: AppBuilderAureliaLoweringAxis.ResourceStylePolicy,
    title: 'Component Stylesheet',
    summary: 'Generate or admit a stylesheet associated with a component without requiring Shadow DOM.',
    selection: { resourceStylePolicies: [AppBuilderResourceStylePolicy.ComponentStylesheet] },
  },
  {
    id: AppBuilderResourceStylePolicy.CssModules,
    axis: AppBuilderAureliaLoweringAxis.ResourceStylePolicy,
    title: 'CSS Modules',
    summary: 'Use Aurelia cssModules(...) registry dependencies for class-name mapping.',
    selection: { resourceStylePolicies: [AppBuilderResourceStylePolicy.CssModules] },
  },
  {
    id: AppBuilderResourceStylePolicy.ShadowCssRegistry,
    axis: AppBuilderAureliaLoweringAxis.ResourceStylePolicy,
    title: 'Shadow CSS Registry',
    summary: 'Use Aurelia shadowCSS(...) registry dependencies for Shadow DOM style registration.',
    selection: {
      resourceDomEncapsulation: AppBuilderResourceDomEncapsulationMode.OpenShadowDom,
      resourceStylePolicies: [AppBuilderResourceStylePolicy.ShadowCssRegistry],
    },
  },
];

export const APP_BUILDER_SEED_PROFILES: readonly AppBuilderSeedProfileDescriptor[] = [
  {
    id: AppBuilderSeedProfileId.MinimalRunnable,
    title: 'Minimal Runnable',
    summary: 'Smallest useful app seed: one package, one shell, minimal data, and the fewest clear files.',
    axes: {
      scale: AppBuilderSeedScale.Minimal,
      dataPosture: AppBuilderDataPosture.NoData,
      architectureDepth: AppBuilderArchitectureDepth.SingleComponent,
      routingDepth: AppBuilderRoutingDepth.None,
      presentationPosture: AppBuilderPresentationPosture.UnstyledFunctional,
      codeEconomy: AppBuilderCodeEconomy.FewestFiles,
    },
    sourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    defaultAureliaLowering: {
      appConventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
      routerAdmission: AppBuilderRouterAdmissionPolicy.NoRouter,
      localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalState],
      resourceDomEncapsulation: AppBuilderResourceDomEncapsulationMode.LightDom,
    },
  },
  {
    id: AppBuilderSeedProfileId.CleanStarter,
    title: 'Clean Starter',
    summary: 'Default growth-friendly starter with DI state, direct state/domain binding, and modest source boundaries.',
    axes: {
      scale: AppBuilderSeedScale.Starter,
      dataPosture: AppBuilderDataPosture.InMemoryState,
      architectureDepth: AppBuilderArchitectureDepth.StateClass,
      routingDepth: AppBuilderRoutingDepth.SimpleRoutes,
      presentationPosture: AppBuilderPresentationPosture.BasicPolished,
      codeEconomy: AppBuilderCodeEconomy.Balanced,
    },
    sourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    defaultAureliaLowering: {
      appConventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
      appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
      bindingPolicies: [AppBuilderBindingPolicy.DirectStateTemplateBinding],
      resourceDomEncapsulation: AppBuilderResourceDomEncapsulationMode.LightDom,
    },
  },
  {
    id: AppBuilderSeedProfileId.ServiceBackedFoundation,
    title: 'Service-Backed Foundation',
    summary: 'Starter with state/domain/service seams, async loading/submission, and explicit error/empty handling.',
    axes: {
      scale: AppBuilderSeedScale.ProductionFoundation,
      dataPosture: AppBuilderDataPosture.ServiceStub,
      architectureDepth: AppBuilderArchitectureDepth.ServiceBacked,
      routingDepth: AppBuilderRoutingDepth.SimpleRoutes,
      presentationPosture: AppBuilderPresentationPosture.OperationalDense,
      codeEconomy: AppBuilderCodeEconomy.Balanced,
    },
    sourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    defaultAureliaLowering: {
      appConventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
      appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
      domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
      bindingPolicies: [AppBuilderBindingPolicy.DirectStateTemplateBinding],
      resourceDomEncapsulation: AppBuilderResourceDomEncapsulationMode.LightDom,
    },
  },
  {
    id: AppBuilderSeedProfileId.LargeAppFoundation,
    title: 'Large App Foundation',
    summary: 'Explicit boundaries for multiple features, area navigation, domain composition, service seams, and future packages.',
    axes: {
      scale: AppBuilderSeedScale.LargeAppFoundation,
      dataPosture: AppBuilderDataPosture.ServiceStub,
      architectureDepth: AppBuilderArchitectureDepth.DomainComposition,
      routingDepth: AppBuilderRoutingDepth.NestedRoutes,
      presentationPosture: AppBuilderPresentationPosture.OperationalDense,
      codeEconomy: AppBuilderCodeEconomy.ExplicitBoundaries,
    },
    sourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    defaultAureliaLowering: {
      appConventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
      appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
      domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
      routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
      bindingPolicies: [AppBuilderBindingPolicy.DirectStateTemplateBinding],
      resourceDomEncapsulation: AppBuilderResourceDomEncapsulationMode.LightDom,
    },
  },
];

export const APP_BUILDER_SOLUTION_SPACES: readonly AppBuilderSolutionSpaceDescriptor[] = [
  {
    id: AppBuilderSolutionSpaceId.CommerceStorefront,
    title: 'Commerce Storefront',
    summary: 'Shopping/catalog experience with browsing, comparison, pricing, cart, checkout, and account-service pressure.',
    commonUserGoals: ['browse items', 'compare options', 'manage cart', 'checkout', 'track account/order state'],
  },
  {
    id: AppBuilderSolutionSpaceId.CatalogDirectory,
    title: 'Catalog Directory',
    summary: 'Browsable/searchable directory for people, places, services, documents, media, or reusable resources.',
    commonUserGoals: ['search catalog', 'filter results', 'compare records', 'open detail', 'save or share a result'],
  },
  {
    id: AppBuilderSolutionSpaceId.OperationsBackoffice,
    title: 'Operations Backoffice',
    summary: 'Internal workspace for managing records, statuses, assignments, approvals, and repeated operational actions.',
    commonUserGoals: ['find record', 'filter by status', 'edit details', 'perform action', 'review queue'],
  },
  {
    id: AppBuilderSolutionSpaceId.SupportWorkspace,
    title: 'Support Workspace',
    summary: 'Case/ticket/inbox workspace for triage, response, assignment, status, and customer or incident context.',
    commonUserGoals: ['triage queue', 'open case', 'reply or update', 'change status', 'assign owner'],
  },
  {
    id: AppBuilderSolutionSpaceId.ContentKnowledgeBase,
    title: 'Content Knowledge Base',
    summary: 'Searchable content/document/library surface with categorization, detail views, and editorial or consumption workflows.',
    commonUserGoals: ['search content', 'filter categories', 'read detail', 'edit metadata', 'publish or archive'],
  },
  {
    id: AppBuilderSolutionSpaceId.LearningPortal,
    title: 'Learning Portal',
    summary: 'Course/training portal with catalog browsing, enrollment/progress state, lesson detail, and completion workflows.',
    commonUserGoals: ['browse courses', 'open lesson', 'track progress', 'complete task', 'review results'],
  },
  {
    id: AppBuilderSolutionSpaceId.ReportingAnalytics,
    title: 'Reporting Analytics',
    summary: 'Dashboard/reporting surface for metrics, status, trends, alerts, and drill-down analysis.',
    commonUserGoals: ['scan metrics', 'inspect status', 'filter period', 'open drill-down', 'export or share insight'],
  },
  {
    id: AppBuilderSolutionSpaceId.AccountSettings,
    title: 'Account Settings',
    summary: 'Profile, preference, tenant, workspace, or account configuration surface with forms and save/validation semantics.',
    commonUserGoals: ['edit profile', 'change preferences', 'manage tenant settings', 'validate input', 'save changes'],
  },
];

export const APP_BUILDER_DOMAIN_PRESETS: readonly AppBuilderDomainPresetDescriptor[] = [
  {
    id: AppBuilderDomainPresetId.TaskList,
    title: 'Task List',
    summary: 'Small task/todo domain for starter collection rendering and add-item value-flow pressure.',
    entityTitle: 'Task',
    entityTypeName: 'Task',
    collectionMemberName: 'tasks',
    identityMemberName: 'id',
    fields: [
      {
        name: 'title',
        title: 'Title',
        valueKind: AppBuilderDomainFieldValueKind.Text,
        required: true,
      },
      {
        name: 'done',
        title: 'Done',
        valueKind: AppBuilderDomainFieldValueKind.Boolean,
      },
    ],
    slotKinds: [
      AppBuilderDomainSlotKind.EntityTitle,
      AppBuilderDomainSlotKind.EntityTypeName,
      AppBuilderDomainSlotKind.CollectionMemberName,
      AppBuilderDomainSlotKind.IdentityMemberName,
      AppBuilderDomainSlotKind.FieldSchema,
    ],
    solutionSpaceIds: [
      AppBuilderSolutionSpaceId.OperationsBackoffice,
      AppBuilderSolutionSpaceId.AccountSettings,
      AppBuilderSolutionSpaceId.SupportWorkspace,
    ],
    referenceScenarioIds: [
      AppBuilderReferenceScenarioId.StructuredRecordManagement,
      AppBuilderReferenceScenarioId.TransactionalFormFlow,
    ],
  },
];

export const APP_BUILDER_SEED_DATA_SETS: readonly AppBuilderSeedDataSetDescriptor[] = [
  {
    id: AppBuilderSeedDataSetId.None,
    title: 'No Seed Data',
    summary: 'Generate the starter with an empty collection or empty domain state.',
    audience: AppBuilderSeedDataAudience.PublicStarter,
    density: AppBuilderSeedDataDensity.None,
    purposes: [AppBuilderSeedDataPurpose.EmptyState],
    records: [],
  },
  {
    id: AppBuilderSeedDataSetId.TaskListPublicSmall,
    title: 'Task List Public Small',
    summary: 'Small public-friendly task-list records for starter collection rendering.',
    audience: AppBuilderSeedDataAudience.PublicStarter,
    density: AppBuilderSeedDataDensity.Small,
    purposes: [AppBuilderSeedDataPurpose.HappyPath, AppBuilderSeedDataPurpose.ValueFlow],
    domainPresetId: AppBuilderDomainPresetId.TaskList,
    records: [
      { id: 1, title: 'Buy groceries', done: true },
      { id: 2, title: 'Schedule dentist appointment', done: false },
      { id: 3, title: 'Prepare weekly plan', done: false },
    ],
  },
  {
    id: AppBuilderSeedDataSetId.TaskListInspectionFlow,
    title: 'Task List Inspection Flow',
    summary: 'Task-list records for inspecting checked binding, derived status labels, and longer display text.',
    audience: AppBuilderSeedDataAudience.InspectionFixture,
    density: AppBuilderSeedDataDensity.Small,
    purposes: [
      AppBuilderSeedDataPurpose.ValueFlow,
      AppBuilderSeedDataPurpose.DisplayRichness,
      AppBuilderSeedDataPurpose.EdgeCase,
    ],
    domainPresetId: AppBuilderDomainPresetId.TaskList,
    records: [
      { id: 1, title: 'Archive completed notes', done: true },
      { id: 2, title: 'Follow up on the long-running support request before Friday', done: false },
      { id: 3, title: 'Check calendar availability', done: false },
    ],
  },
];

export const APP_BUILDER_PATTERN_CATALOG: readonly AppBuilderPatternDescriptor[] = [
  appBuilderPattern({
    id: AppBuilderPatternId.SingleAppPackage,
    level: AppBuilderPatternLevel.SourceProjectShape,
    title: 'Single App Package',
    summary: 'One package owns a reopenable Aurelia app entrypoint and app source files.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.WorkspaceAppPackage,
    level: AppBuilderPatternLevel.SourceProjectShape,
    title: 'Workspace App Package',
    summary: 'Monorepo package containing an Aurelia app alongside libraries, tooling, or non-app packages.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.ResourceLibraryPackage,
    level: AppBuilderPatternLevel.SourceProjectShape,
    title: 'Resource Library Package',
    summary: 'Package that publishes reusable Aurelia resources, plugins, or app-building primitives instead of an app entrypoint.',
    defaultSourcePolicy: SourcePatternUsePolicy.MergeSelectively,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.MinimalAppShell,
    level: AppBuilderPatternLevel.ApplicationFrame,
    title: 'Minimal App Shell',
    summary: 'Root component, external template, and entrypoint for a focused component-tree app.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    requires: [AppBuilderPatternId.SingleAppPackage],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.RoutedAppShell,
    level: AppBuilderPatternLevel.ApplicationFrame,
    title: 'Routed App Shell',
    summary: 'Router configuration, routeable components, navigation links, and au-viewport ownership.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    requires: [AppBuilderPatternId.MinimalAppShell],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.SectionedNavigationShell,
    level: AppBuilderPatternLevel.ApplicationFrame,
    title: 'Sectioned Navigation Shell',
    summary: 'Section/tab/sidebar navigation where each area can be binding-driven or router-driven.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    requires: [AppBuilderPatternId.MinimalAppShell],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.ViewportLayoutShell,
    level: AppBuilderPatternLevel.ApplicationFrame,
    title: 'Viewport Layout Shell',
    summary: 'Router-driven named or nested viewport regions for route-selected master/detail, sibling workspace, or multi-pane navigation.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    requires: [AppBuilderPatternId.RoutedAppShell],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.DraftForm,
    level: AppBuilderPatternLevel.FeatureSurface,
    title: 'Draft Form',
    summary: 'Editable draft object with direct template/domain bindings and real domain submit-readiness behavior.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    solutionSpaceIds: [
      AppBuilderSolutionSpaceId.AccountSettings,
      AppBuilderSolutionSpaceId.OperationsBackoffice,
      AppBuilderSolutionSpaceId.SupportWorkspace,
      AppBuilderSolutionSpaceId.CommerceStorefront,
    ],
    companions: [AppBuilderPatternId.DiOwnedAppState, AppBuilderPatternId.NativeValueChannel],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.ServiceBackedSubmitForm,
    level: AppBuilderPatternLevel.FeatureSurface,
    title: 'Service-Backed Submit Form',
    summary: 'Draft or edit form with API/service submit boundary and submitting/error/success state.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    solutionSpaceIds: [
      AppBuilderSolutionSpaceId.AccountSettings,
      AppBuilderSolutionSpaceId.OperationsBackoffice,
      AppBuilderSolutionSpaceId.SupportWorkspace,
      AppBuilderSolutionSpaceId.CommerceStorefront,
    ],
    requires: [AppBuilderPatternId.DraftForm, AppBuilderPatternId.ApiBackedSubmit],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.RoutedEditForm,
    level: AppBuilderPatternLevel.FeatureSurface,
    title: 'Routed Edit Form',
    summary: 'Route-selected form surface with explicit parameter selection and loading/lookup semantics.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    solutionSpaceIds: [
      AppBuilderSolutionSpaceId.OperationsBackoffice,
      AppBuilderSolutionSpaceId.SupportWorkspace,
      AppBuilderSolutionSpaceId.ContentKnowledgeBase,
    ],
    requires: [AppBuilderPatternId.RoutedAppShell, AppBuilderPatternId.DraftForm, AppBuilderPatternId.RouteParameterSelection],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.SettingsForm,
    level: AppBuilderPatternLevel.FeatureSurface,
    title: 'Settings Form',
    summary: 'Account, profile, tenant, workspace, or preference editing surface where the current subject is implicit.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    solutionSpaceIds: [AppBuilderSolutionSpaceId.AccountSettings],
    requires: [AppBuilderPatternId.DraftForm],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.MultiStepWorkflow,
    level: AppBuilderPatternLevel.FeatureSurface,
    title: 'Multi-Step Workflow',
    summary: 'Ordered task flow with progress, validation, review, back/next transitions, and a final submit or completion action.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    solutionSpaceIds: [
      AppBuilderSolutionSpaceId.AccountSettings,
      AppBuilderSolutionSpaceId.CommerceStorefront,
      AppBuilderSolutionSpaceId.SupportWorkspace,
      AppBuilderSolutionSpaceId.LearningPortal,
    ],
    companions: [AppBuilderPatternId.DraftForm, AppBuilderPatternId.ValidationPolicy],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.ResourceIndex,
    level: AppBuilderPatternLevel.FeatureSurface,
    title: 'Resource Index',
    summary: 'Operational collection-management surface with search, filters, sorting, pagination, selection, and actions.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    solutionSpaceIds: [
      AppBuilderSolutionSpaceId.OperationsBackoffice,
      AppBuilderSolutionSpaceId.SupportWorkspace,
      AppBuilderSolutionSpaceId.ContentKnowledgeBase,
      AppBuilderSolutionSpaceId.CatalogDirectory,
    ],
    companions: [AppBuilderPatternId.CollectionTableBrowser, AppBuilderPatternId.ApiBackedLoading],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.CollectionBrowser,
    level: AppBuilderPatternLevel.FeatureSurface,
    title: 'Collection Browser',
    summary: 'Browsable collection surface with list, card, grid, or table presentation plus filtering and selection pressure.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    solutionSpaceIds: [
      AppBuilderSolutionSpaceId.CommerceStorefront,
      AppBuilderSolutionSpaceId.CatalogDirectory,
      AppBuilderSolutionSpaceId.ContentKnowledgeBase,
      AppBuilderSolutionSpaceId.LearningPortal,
      AppBuilderSolutionSpaceId.OperationsBackoffice,
    ],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.CollectionCardBrowser,
    level: AppBuilderPatternLevel.FeatureSurface,
    title: 'Collection Card Browser',
    summary: 'Card/list collection browser for storefronts, catalogs, galleries, directories, and comparison-heavy browsing.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    solutionSpaceIds: [
      AppBuilderSolutionSpaceId.CommerceStorefront,
      AppBuilderSolutionSpaceId.CatalogDirectory,
      AppBuilderSolutionSpaceId.ContentKnowledgeBase,
      AppBuilderSolutionSpaceId.LearningPortal,
    ],
    requires: [AppBuilderPatternId.CollectionBrowser],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.CollectionTableBrowser,
    level: AppBuilderPatternLevel.FeatureSurface,
    title: 'Collection Table Browser',
    summary: 'Dense row-oriented collection browser for admin, operations, support, content, and reporting workspaces.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    solutionSpaceIds: [
      AppBuilderSolutionSpaceId.OperationsBackoffice,
      AppBuilderSolutionSpaceId.SupportWorkspace,
      AppBuilderSolutionSpaceId.ContentKnowledgeBase,
      AppBuilderSolutionSpaceId.ReportingAnalytics,
    ],
    requires: [AppBuilderPatternId.CollectionBrowser],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.RoutedCollectionDetail,
    level: AppBuilderPatternLevel.FeatureSurface,
    title: 'Routed Collection Detail',
    summary: 'List/detail route pair with route parameter selection, data-driven links, and detail lookup/loading.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    solutionSpaceIds: [
      AppBuilderSolutionSpaceId.CommerceStorefront,
      AppBuilderSolutionSpaceId.CatalogDirectory,
      AppBuilderSolutionSpaceId.OperationsBackoffice,
      AppBuilderSolutionSpaceId.SupportWorkspace,
      AppBuilderSolutionSpaceId.ContentKnowledgeBase,
      AppBuilderSolutionSpaceId.LearningPortal,
    ],
    requires: [AppBuilderPatternId.RoutedAppShell, AppBuilderPatternId.RouteParameterSelection],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.Dashboard,
    level: AppBuilderPatternLevel.FeatureSurface,
    title: 'Dashboard',
    summary: 'Overview surface with metrics, status cards, operational summaries, event streams, and drill-down links.',
    defaultSourcePolicy: SourcePatternUsePolicy.MergeSelectively,
    solutionSpaceIds: [
      AppBuilderSolutionSpaceId.ReportingAnalytics,
      AppBuilderSolutionSpaceId.OperationsBackoffice,
      AppBuilderSolutionSpaceId.SupportWorkspace,
    ],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.DiOwnedAppState,
    level: AppBuilderPatternLevel.StateDomainIntegrationBoundary,
    title: 'DI-Owned App State',
    summary: 'Application state resolved through DI and available directly to view-models, templates, and domain objects.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.ComposedDomainState,
    level: AppBuilderPatternLevel.StateDomainIntegrationBoundary,
    title: 'Composed Domain State',
    summary: 'State object composed from ordinary domain classes, collections, value objects, and derived getters.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    companions: [AppBuilderPatternId.PlainDomainEntity, AppBuilderPatternId.ComputedDomainGetter],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.PlainDomainEntity,
    level: AppBuilderPatternLevel.StateDomainIntegrationBoundary,
    title: 'Plain Domain Entity',
    summary: 'Ordinary TypeScript class with behavior and accessors that can participate in Aurelia observation.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    companions: [AppBuilderPatternId.ComputedDomainGetter],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.ComputedDomainGetter,
    level: AppBuilderPatternLevel.StateDomainIntegrationBoundary,
    title: 'Computed Domain Getter',
    summary: 'Getter that belongs to the domain model because it expresses real behavior or derived state.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    requires: [AppBuilderPatternId.PlainDomainEntity],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.ApiBackedLoading,
    level: AppBuilderPatternLevel.StateDomainIntegrationBoundary,
    title: 'API-Backed Loading',
    summary: 'State or service boundary for async loading, refresh, loading/error/empty state, and result adoption.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    companions: [AppBuilderPatternId.LoadingErrorEmptyState],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.ApiBackedSubmit,
    level: AppBuilderPatternLevel.StateDomainIntegrationBoundary,
    title: 'API-Backed Submit',
    summary: 'State or service boundary for save/submit commands, pending state, validation handoff, and completion result.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    companions: [AppBuilderPatternId.LoadingErrorEmptyState],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.DirectStateTemplateRead,
    level: AppBuilderPatternLevel.InteractionMechanism,
    title: 'Direct State Template Read',
    summary: 'Template reads ordinary state/domain members directly when state ownership is already clear.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    cautions: ['Use a real adaptation member when route/query projection or presentation state changes the meaning of the value.'],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.TemplateLocalObjectHandoff,
    level: AppBuilderPatternLevel.InteractionMechanism,
    title: 'Template Local Object Handoff',
    summary: 'Template-local narrowing or object binding handoff through let/if/with/repeat before a detail or child surface renders.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    companions: [AppBuilderPatternId.ComponentObjectBoundary],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.IdToObjectLookup,
    level: AppBuilderPatternLevel.InteractionMechanism,
    title: 'ID To Object Lookup',
    summary: 'Scalar identity boundary with lookup/loading semantics for routes, lazy detail surfaces, or independently owned components.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    companions: [AppBuilderPatternId.RouteParameterSelection],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.NativeValueChannel,
    level: AppBuilderPatternLevel.InteractionMechanism,
    title: 'Native Value Channel',
    summary: 'Native input value binding through Aurelia value observers for text, number, date, textarea, and related controls.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.SelectModelDomainValue,
    level: AppBuilderPatternLevel.InteractionMechanism,
    title: 'Select Model Domain Value',
    summary: 'Select option model/value semantics that preserve domain identity when appropriate and surface coercion explicitly.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.CheckedCollectionChannel,
    level: AppBuilderPatternLevel.InteractionMechanism,
    title: 'Checked Collection Channel',
    summary: 'Checkbox/radio checked semantics over booleans, arrays, sets, maps, and element model identity.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.RouteParameterSelection,
    level: AppBuilderPatternLevel.InteractionMechanism,
    title: 'Route Parameter Selection',
    summary: 'Route or query parameter selection that drives current item, filter, tab, or feature state.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    requires: [AppBuilderPatternId.RoutedAppShell],
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.ClassStyleBinding,
    level: AppBuilderPatternLevel.InteractionMechanism,
    title: 'Class Style Binding',
    summary: 'Class token, class-map, style property, or style-map binding for stateful presentation.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.LoadingErrorEmptyState,
    level: AppBuilderPatternLevel.InteractionMechanism,
    title: 'Loading Error Empty State',
    summary: 'Template/control-flow states for loading, error, empty, and ready branches around async or query-backed data.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.ValidationPolicy,
    level: AppBuilderPatternLevel.CrossCuttingCapability,
    title: 'Validation Policy',
    summary: 'Validation rules, validation-html configuration, validate bindings, and validation display.',
    defaultSourcePolicy: SourcePatternUsePolicy.MergeSelectively,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.I18nLocalization,
    level: AppBuilderPatternLevel.CrossCuttingCapability,
    title: 'I18n Localization',
    summary: 'Translation resources, translation bindings, translated form/copy text, and localized validation.',
    defaultSourcePolicy: SourcePatternUsePolicy.MergeSelectively,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.ComponentObjectBoundary,
    level: AppBuilderPatternLevel.InteractionMechanism,
    title: 'Component Object Boundary',
    summary: 'Typed object input boundary for child/detail components that intentionally own a local rendering surface.',
    defaultSourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.DynamicComposition,
    level: AppBuilderPatternLevel.InteractionMechanism,
    title: 'Dynamic Composition',
    summary: 'Dynamic component or template composition through au-compose or equivalent composition machinery.',
    defaultSourcePolicy: SourcePatternUsePolicy.MergeSelectively,
  }),
  appBuilderPattern({
    id: AppBuilderPatternId.PluginStoreState,
    level: AppBuilderPatternLevel.StateDomainIntegrationBoundary,
    title: 'Plugin Store State',
    summary: 'Plugin-backed state/store facility for apps that explicitly want store semantics and reducer/action-style flow.',
    defaultSourcePolicy: SourcePatternUsePolicy.MergeSelectively,
  }),
];

export const APP_BUILDER_REFERENCE_SCENARIOS: readonly AppBuilderReferenceScenarioDescriptor[] = [
  {
    id: AppBuilderReferenceScenarioId.StructuredRecordManagement,
    title: 'Structured Record Management',
    summary: 'Reference scenario for dense record views with query, sort, selection, inline or row actions, and optional bulk operations.',
    grounding: [
      {
        title: 'Material Design data tables',
        summary: 'Data tables display sets of raw data and support query/manipulation, row selection, sorting, editing, and menus.',
      },
      {
        title: 'PatternFly filters',
        summary: 'Filters narrow content from tables, data lists, or card views with single or multiple attributes.',
      },
    ],
    patternSignals: ['table/list rows', 'query/filter/sort', 'row selection', 'bulk action', 'inline edit'],
    nonOntologyMaterial: ['business noun choices', 'sample rows', 'column copy', 'visual styling'],
  },
  {
    id: AppBuilderReferenceScenarioId.CollectionBrowseAndCompare,
    title: 'Collection Browse And Compare',
    summary: 'Reference scenario for browsing homogeneous items as lists, cards, or grids with comparison, filtering, pagination, and drill-down pressure.',
    grounding: [
      {
        title: 'Material Design lists',
        summary: 'Lists present related homogeneous data, with filtering, sorting, primary actions, and supplemental actions.',
      },
      {
        title: 'PatternFly card view',
        summary: 'Card view is a reusable pattern for gallery-style browsing, alongside filters and primary-detail.',
      },
    ],
    patternSignals: ['list/card/grid presentation', 'compare item summaries', 'filter/sort/page', 'single-item drill-down'],
    nonOntologyMaterial: ['catalog names', 'image choices', 'marketing copy', 'domain sample data', 'card styling'],
  },
  {
    id: AppBuilderReferenceScenarioId.PrimaryDetailWorkspace,
    title: 'Primary Detail Workspace',
    summary: 'Reference scenario for selecting a primary list/table/card item and keeping context while inspecting or editing details.',
    grounding: [
      {
        title: 'PatternFly primary-detail',
        summary: 'Primary-detail shows a list of items and corresponding selected-item details, often preserving context for edits.',
      },
    ],
    patternSignals: ['selected item', 'detail pane or route', 'context-preserving edit', 'list/detail coordination'],
    nonOntologyMaterial: ['specific object names', 'detail copy', 'drawer dimensions', 'presentation theme'],
  },
  {
    id: AppBuilderReferenceScenarioId.TransactionalFormFlow,
    title: 'Transactional Form Flow',
    summary: 'Reference scenario for asking only necessary questions, validating answers, branching, reviewing, saving, and submitting.',
    grounding: [
      {
        title: 'GOV.UK structuring forms',
        summary: 'Form design starts from why each question is needed, common scenarios, branching, and one thing per page when useful.',
      },
      {
        title: 'ONS service patterns',
        summary: 'Patterns combine components to help users carry out tasks such as entering information, correcting errors, or sending forms.',
      },
    ],
    patternSignals: ['field schema', 'validation', 'branching', 'review/check answers', 'submit result'],
    nonOntologyMaterial: ['real service policy', 'question wording', 'eligibility rules', 'submission copy'],
  },
  {
    id: AppBuilderReferenceScenarioId.MetricsOverviewDashboard,
    title: 'Metrics Overview Dashboard',
    summary: 'Reference scenario for status, metrics, events, summaries, and drill-down cards over app or process state.',
    grounding: [
      {
        title: 'PatternFly dashboard',
        summary: 'Dashboards provide overviews of metrics or indicators through cards and grid layouts.',
      },
    ],
    patternSignals: ['metric card', 'status aggregate', 'trend/event summary', 'drill-down link'],
    nonOntologyMaterial: ['metric names', 'chart styling', 'sample numbers', 'business-specific status labels'],
  },
  {
    id: AppBuilderReferenceScenarioId.TaskNavigationShell,
    title: 'Task Navigation Shell',
    summary: 'Reference scenario for organizing app routes around content, tasks, hierarchy, siblings, and important destinations.',
    grounding: [
      {
        title: 'Material Design navigation',
        summary: 'Navigation should be organized around content and tasks, with hierarchy, siblings, collections, links, and prioritized paths.',
      },
    ],
    patternSignals: ['route hierarchy', 'sibling sections', 'frequent destinations', 'task-prioritized navigation'],
    nonOntologyMaterial: ['actual section names', 'brand navigation copy', 'domain route nouns', 'visual navigation treatment'],
  },
];

export const APP_BUILDER_STARTER_INTENTS: readonly AppBuilderStarterIntentDescriptor[] = [
  {
    id: AppBuilderStarterIntentId.MinimalAppStarter,
    title: 'Minimal App Starter',
    summary: 'Create a tiny runnable Aurelia app shell before feature/domain choices matter.',
    supportedSeedProfileIds: [AppBuilderSeedProfileId.MinimalRunnable, AppBuilderSeedProfileId.CleanStarter],
    supportedScenarioIds: [AppBuilderReferenceScenarioId.TaskNavigationShell],
    primaryPatternIds: [AppBuilderPatternId.SingleAppPackage, AppBuilderPatternId.MinimalAppShell],
    optionalPatternIds: [],
    requiredDomainSlotKinds: [],
    defaultAureliaLowering: {
      appConventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
      resourceDeclaration: AppBuilderResourceDeclarationMode.ConventionResource,
      routerAdmission: AppBuilderRouterAdmissionPolicy.NoRouter,
      localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalState],
      resourceDomEncapsulation: AppBuilderResourceDomEncapsulationMode.LightDom,
    },
  },
  {
    id: AppBuilderStarterIntentId.RoutedAppStarter,
    title: 'Routed App Starter',
    summary: 'Create an app shell with routes, routeable components, navigation, and one or more viewports.',
    supportedSeedProfileIds: [
      AppBuilderSeedProfileId.CleanStarter,
      AppBuilderSeedProfileId.ServiceBackedFoundation,
      AppBuilderSeedProfileId.LargeAppFoundation,
    ],
    supportedScenarioIds: [AppBuilderReferenceScenarioId.TaskNavigationShell],
    primaryPatternIds: [AppBuilderPatternId.RoutedAppShell],
    optionalPatternIds: [AppBuilderPatternId.SectionedNavigationShell, AppBuilderPatternId.ViewportLayoutShell],
    requiredDomainSlotKinds: [],
    defaultAureliaLowering: { routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration },
  },
  {
    id: AppBuilderStarterIntentId.FormWorkflowStarter,
    title: 'Form Workflow Starter',
    summary: 'Create an editable form or workflow surface with typed fields, state, validation-ready shape, and submit semantics.',
    supportedSeedProfileIds: [
      AppBuilderSeedProfileId.CleanStarter,
      AppBuilderSeedProfileId.ServiceBackedFoundation,
      AppBuilderSeedProfileId.LargeAppFoundation,
    ],
    supportedScenarioIds: [AppBuilderReferenceScenarioId.TransactionalFormFlow],
    primaryPatternIds: [AppBuilderPatternId.DraftForm],
    optionalPatternIds: [
      AppBuilderPatternId.ServiceBackedSubmitForm,
      AppBuilderPatternId.RoutedEditForm,
      AppBuilderPatternId.MultiStepWorkflow,
      AppBuilderPatternId.ValidationPolicy,
      AppBuilderPatternId.I18nLocalization,
    ],
    requiredDomainSlotKinds: [AppBuilderDomainSlotKind.EntityTitle, AppBuilderDomainSlotKind.FieldSchema],
    defaultAureliaLowering: {
      appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
      bindingPolicies: [AppBuilderBindingPolicy.DirectStateTemplateBinding],
    },
  },
  {
    id: AppBuilderStarterIntentId.CollectionListStarter,
    title: 'Collection List Starter',
    summary: 'Create a small state-backed collection list with selectable seed data and an add-item input.',
    supportedSeedProfileIds: [
      AppBuilderSeedProfileId.CleanStarter,
      AppBuilderSeedProfileId.ServiceBackedFoundation,
      AppBuilderSeedProfileId.LargeAppFoundation,
    ],
    supportedScenarioIds: [
      AppBuilderReferenceScenarioId.StructuredRecordManagement,
      AppBuilderReferenceScenarioId.CollectionBrowseAndCompare,
      AppBuilderReferenceScenarioId.TransactionalFormFlow,
    ],
    primaryPatternIds: [AppBuilderPatternId.CollectionBrowser],
    optionalPatternIds: [
      AppBuilderPatternId.DiOwnedAppState,
      AppBuilderPatternId.ComposedDomainState,
      AppBuilderPatternId.PlainDomainEntity,
      AppBuilderPatternId.DirectStateTemplateRead,
      AppBuilderPatternId.NativeValueChannel,
      AppBuilderPatternId.CheckedCollectionChannel,
      AppBuilderPatternId.ClassStyleBinding,
    ],
    requiredDomainSlotKinds: [
      AppBuilderDomainSlotKind.EntityTitle,
      AppBuilderDomainSlotKind.EntityTypeName,
      AppBuilderDomainSlotKind.CollectionMemberName,
      AppBuilderDomainSlotKind.IdentityMemberName,
      AppBuilderDomainSlotKind.FieldSchema,
    ],
    defaultAureliaLowering: {
      appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
      domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
      routerAdmission: AppBuilderRouterAdmissionPolicy.NoRouter,
      bindingPolicies: [AppBuilderBindingPolicy.DirectStateTemplateBinding],
    },
  },
  {
    id: AppBuilderStarterIntentId.CollectionManagementStarter,
    title: 'Collection Management Starter',
    summary: 'Create a searchable/filterable/sortable collection surface with selection and action mechanics.',
    supportedSeedProfileIds: [
      AppBuilderSeedProfileId.CleanStarter,
      AppBuilderSeedProfileId.ServiceBackedFoundation,
      AppBuilderSeedProfileId.LargeAppFoundation,
    ],
    supportedScenarioIds: [AppBuilderReferenceScenarioId.StructuredRecordManagement],
    primaryPatternIds: [AppBuilderPatternId.ResourceIndex, AppBuilderPatternId.CollectionTableBrowser],
    optionalPatternIds: [
      AppBuilderPatternId.ApiBackedLoading,
      AppBuilderPatternId.SelectModelDomainValue,
      AppBuilderPatternId.CheckedCollectionChannel,
      AppBuilderPatternId.ClassStyleBinding,
      AppBuilderPatternId.RoutedCollectionDetail,
    ],
    requiredDomainSlotKinds: [
      AppBuilderDomainSlotKind.EntityTitle,
      AppBuilderDomainSlotKind.CollectionMemberName,
      AppBuilderDomainSlotKind.FieldSchema,
    ],
    defaultAureliaLowering: {
      appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
      bindingPolicies: [AppBuilderBindingPolicy.DirectStateTemplateBinding],
    },
  },
  {
    id: AppBuilderStarterIntentId.BrowseDetailStarter,
    title: 'Browse Detail Starter',
    summary: 'Create a list/card/grid browse surface with route or local detail selection.',
    supportedSeedProfileIds: [
      AppBuilderSeedProfileId.CleanStarter,
      AppBuilderSeedProfileId.ServiceBackedFoundation,
      AppBuilderSeedProfileId.LargeAppFoundation,
    ],
    supportedScenarioIds: [
      AppBuilderReferenceScenarioId.CollectionBrowseAndCompare,
      AppBuilderReferenceScenarioId.PrimaryDetailWorkspace,
    ],
    primaryPatternIds: [AppBuilderPatternId.CollectionBrowser, AppBuilderPatternId.RoutedCollectionDetail],
    optionalPatternIds: [
      AppBuilderPatternId.CollectionCardBrowser,
      AppBuilderPatternId.ApiBackedLoading,
      AppBuilderPatternId.ComponentObjectBoundary,
      AppBuilderPatternId.RouteParameterSelection,
    ],
    requiredDomainSlotKinds: [
      AppBuilderDomainSlotKind.EntityTitle,
      AppBuilderDomainSlotKind.CollectionMemberName,
      AppBuilderDomainSlotKind.FieldSchema,
    ],
    defaultAureliaLowering: {
      appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
      routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
      areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
      bindingPolicies: [AppBuilderBindingPolicy.RouteIdSelection],
    },
  },
  {
    id: AppBuilderStarterIntentId.DashboardStarter,
    title: 'Dashboard Starter',
    summary: 'Create a summary surface over metrics, status, events, and drill-down links.',
    supportedSeedProfileIds: [AppBuilderSeedProfileId.ServiceBackedFoundation, AppBuilderSeedProfileId.LargeAppFoundation],
    supportedScenarioIds: [AppBuilderReferenceScenarioId.MetricsOverviewDashboard],
    primaryPatternIds: [AppBuilderPatternId.Dashboard],
    optionalPatternIds: [
      AppBuilderPatternId.ApiBackedLoading,
      AppBuilderPatternId.DynamicComposition,
      AppBuilderPatternId.RoutedCollectionDetail,
    ],
    requiredDomainSlotKinds: [AppBuilderDomainSlotKind.FieldSchema],
    defaultAureliaLowering: {
      appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
      bindingPolicies: [AppBuilderBindingPolicy.DirectStateTemplateBinding],
    },
  },
];

export function appBuilderPatternDescriptor(
  id: AppBuilderPatternId,
): AppBuilderPatternDescriptor {
  const descriptor = APP_BUILDER_PATTERN_CATALOG.find((candidate) => candidate.id === id);
  if (descriptor == null) {
    throw new Error(`Unknown app-builder pattern: ${id}`);
  }
  return descriptor;
}

export function appBuilderSeedProfileDescriptor(
  id: AppBuilderSeedProfileId,
): AppBuilderSeedProfileDescriptor {
  const descriptor = APP_BUILDER_SEED_PROFILES.find((candidate) => candidate.id === id);
  if (descriptor == null) {
    throw new Error(`Unknown app-builder seed profile: ${id}`);
  }
  return descriptor;
}

export function appBuilderStarterIntentDescriptor(
  id: AppBuilderStarterIntentId,
): AppBuilderStarterIntentDescriptor {
  const descriptor = APP_BUILDER_STARTER_INTENTS.find((candidate) => candidate.id === id);
  if (descriptor == null) {
    throw new Error(`Unknown app-builder starter intent: ${id}`);
  }
  return descriptor;
}

export function appBuilderAureliaLoweringChoiceDescriptor(
  id: AppBuilderAureliaLoweringChoiceDescriptor['id'],
): AppBuilderAureliaLoweringChoiceDescriptor {
  const descriptor = APP_BUILDER_AURELIA_LOWERING_CHOICES.find((candidate) => candidate.id === id);
  if (descriptor == null) {
    throw new Error(`Unknown app-builder Aurelia lowering choice: ${id}`);
  }
  return descriptor;
}

export function appBuilderDomainPresetDescriptor(
  id: AppBuilderDomainPresetId,
): AppBuilderDomainPresetDescriptor {
  const descriptor = APP_BUILDER_DOMAIN_PRESETS.find((candidate) => candidate.id === id);
  if (descriptor == null) {
    throw new Error(`Unknown app-builder domain preset: ${id}`);
  }
  return descriptor;
}

export function appBuilderSeedDataSetDescriptor(
  id: AppBuilderSeedDataSetId,
): AppBuilderSeedDataSetDescriptor {
  const descriptor = APP_BUILDER_SEED_DATA_SETS.find((candidate) => candidate.id === id);
  if (descriptor == null) {
    throw new Error(`Unknown app-builder seed data set: ${id}`);
  }
  return descriptor;
}

export function appBuilderReferenceScenarioDescriptor(
  id: AppBuilderReferenceScenarioId,
): AppBuilderReferenceScenarioDescriptor {
  const descriptor = APP_BUILDER_REFERENCE_SCENARIOS.find((candidate) => candidate.id === id);
  if (descriptor == null) {
    throw new Error(`Unknown app-builder reference scenario: ${id}`);
  }
  return descriptor;
}
