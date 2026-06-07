import { parseConfigurableRoutePath } from '../router/route-configurable-path.js';
import type { AureliaConfigurationAdmissionKind } from './aurelia-configuration-admission-kind.js';
import type { SourcePlanProjectTooling } from './package-tooling.js';
import type { TypeScriptImportRequirement } from './typescript-import-source.js';

/** Source language family for a planned source artifact. */
export enum SourcePlanLanguage {
  /** TypeScript source file. */
  TypeScript = 'typescript',
  /** HTML template source file. */
  Html = 'html',
  /** JSON configuration or manifest source file. */
  Json = 'json',
  /** CSS stylesheet source file. */
  Css = 'css',
  /** Plain text source artifact. */
  Text = 'text',
}

/** App-topology role a source file plays after the edit is applied. */
export enum SourcePlanFileRole {
  /** Application entrypoint that boots Aurelia. */
  Entrypoint = 'entrypoint',
  /** Root component view-model. */
  RootComponent = 'root-component',
  /** Non-root component view-model. */
  Component = 'component',
  /** HTML template owned by a component or route. */
  Template = 'template',
  /** Component-scoped stylesheet. */
  ComponentStyle = 'component-style',
  /** Application-level stylesheet. */
  GlobalStyle = 'global-style',
  /** DI-injectable state or store model. */
  StateModel = 'state-model',
  /** Domain entity or value-object model. */
  DomainModel = 'domain-model',
  /** Service, repository, or adapter boundary. */
  Service = 'service',
  /** Project configuration or package tooling file. */
  ProjectConfig = 'project-config',
  /** File whose topology role is intentionally not modeled yet. */
  Other = 'other',
}

/** File-level edit shape before a host resolves conflicts or formatting. */
export enum SourcePlanEditKind {
  /** Create a file that should not already exist. */
  Create = 'create',
  /** Replace an existing file. */
  Replace = 'replace',
  /** Create or replace depending on host policy. */
  Upsert = 'upsert',
}

/** Source operation that caused a planned file artifact to exist. */
export enum SourcePlanOperationKind {
  /** Create an Aurelia entrypoint that boots a root component. */
  CreateEntrypoint = 'create-entrypoint',
  /** Create a custom-element view-model or routeable component class. */
  CreateComponentViewModel = 'create-component-view-model',
  /** Create an HTML template owned by a component or routeable surface. */
  CreateComponentTemplate = 'create-component-template',
  /** Create a caller/domain entity, value object, or domain model file. */
  CreateDomainModel = 'create-domain-model',
  /** Create a DI state, store, or shared application state model file. */
  CreateStateModel = 'create-state-model',
  /** Create a service, repository, or adapter boundary used by state or components. */
  CreateServiceModel = 'create-service-model',
  /** Create or update package/build/tooling configuration. */
  CreateProjectTooling = 'create-project-tooling',
}

/** Who owns the concrete text in this source plan. */
export enum SourcePlanTextAuthority {
  /** Semantic-runtime produced this as canonical generated source. */
  SemanticRuntimeGenerated = 'semantic-runtime-generated',
  /** App-builder produced complete source text from an app-building workflow. */
  AppBuilderGenerated = 'app-builder-generated',
  /** Semantic-runtime produced this as a complete reference instantiation of a reusable pattern. */
  SemanticRuntimeReferenceInstantiation = 'semantic-runtime-reference-instantiation',
  /** The host or AI must produce the concrete text from semantic contracts. */
  HostOwned = 'host-owned',
  /** A human/operator supplied the exact text. */
  OperatorSupplied = 'operator-supplied',
}

/** Source-plan contribution family carried alongside final generated file text. */
export enum SourcePlanContributionKind {
  /** Static TypeScript import requirement contributed before final import assembly. */
  TypeScriptImportRequirement = 'typescript-import-requirement',
  /** Concrete source fragment that participated in a generated file. */
  SourceFragment = 'source-fragment',
}

/** Source of a generated file contribution before final host application. */
export enum SourcePlanContributionOriginKind {
  /** Contribution originated from an app-builder part source invocation. */
  AppBuilderPartSourceInvocation = 'app-builder-part-source-invocation',
  /** Contribution originated from a direct app-builder ontology target. */
  AppBuilderSourceLoweringTarget = 'app-builder-source-lowering-target',
  /** Contribution originated from an app-builder ontology source-lowering invocation. */
  AppBuilderSourceLoweringInvocation = 'app-builder-source-lowering-invocation',
  /** Contribution originated from an app-builder source-lowering composition. */
  AppBuilderSourceLoweringComposition = 'app-builder-source-lowering-composition',
  /** Contribution originated from a framework configuration admission. */
  AureliaConfigurationAdmission = 'aurelia-configuration-admission',
}

/** App-builder part invocation identity carried by a neutral source-plan contribution. */
export interface SourcePlanAppBuilderPartSourceInvocationOrigin {
  readonly kind: SourcePlanContributionOriginKind.AppBuilderPartSourceInvocation;
  readonly partKind: string;
  readonly partId: string;
  readonly operationKind: string;
  readonly applicationSite: string | null;
  readonly slotKinds: readonly string[];
}

/** Direct app-builder ontology target identity carried by a neutral source-plan contribution. */
export interface SourcePlanAppBuilderSourceLoweringTargetOrigin {
  readonly kind: SourcePlanContributionOriginKind.AppBuilderSourceLoweringTarget;
  readonly targetKind: string;
  readonly targetId: string;
  readonly surfaceKind: string;
}

/** App-builder ontology source-lowering identity carried by a neutral source-plan contribution. */
export interface SourcePlanAppBuilderSourceLoweringInvocationOrigin {
  readonly kind: SourcePlanContributionOriginKind.AppBuilderSourceLoweringInvocation;
  readonly targetKind: string;
  readonly targetId: string;
  readonly controlPatternId: string | null;
  readonly controlId: string | null;
  readonly innerControlPatternId: string | null;
}

/** App-builder source-lowering composition identity carried by a neutral source-plan contribution. */
export interface SourcePlanAppBuilderSourceLoweringCompositionOrigin {
  readonly kind: SourcePlanContributionOriginKind.AppBuilderSourceLoweringComposition;
  readonly compositionKind: string;
  readonly targetKind: string;
  readonly targetId: string;
  readonly memberTargetIds: readonly string[];
}

/** Framework configuration admission identity carried by a neutral source-plan contribution. */
export interface SourcePlanAureliaConfigurationAdmissionOrigin {
  readonly kind: SourcePlanContributionOriginKind.AureliaConfigurationAdmission;
  readonly admissionKind: AureliaConfigurationAdmissionKind;
}

/** Source-plan contribution origin before a concrete file span exists. */
export type SourcePlanContributionOrigin =
  | SourcePlanAppBuilderPartSourceInvocationOrigin
  | SourcePlanAppBuilderSourceLoweringTargetOrigin
  | SourcePlanAppBuilderSourceLoweringInvocationOrigin
  | SourcePlanAppBuilderSourceLoweringCompositionOrigin
  | SourcePlanAureliaConfigurationAdmissionOrigin;

/** Base fields shared by source-plan file contributions. */
interface SourcePlanContributionBase {
  readonly kind: SourcePlanContributionKind;
  readonly origin: SourcePlanContributionOrigin | null;
}

/** Static import requirement contributed to a TypeScript source-plan file. */
export interface SourcePlanTypeScriptImportContribution extends SourcePlanContributionBase {
  readonly kind: SourcePlanContributionKind.TypeScriptImportRequirement;
  readonly importRequirement: TypeScriptImportRequirement;
}

/** Concrete source fragment contributed to a source-plan file before final text assembly. */
export interface SourcePlanSourceFragmentContribution extends SourcePlanContributionBase {
  readonly kind: SourcePlanContributionKind.SourceFragment;
  readonly language: SourcePlanLanguage;
  readonly text: string;
}

/** One contribution that participated in a generated source-plan file. */
export type SourcePlanContribution =
  | SourcePlanTypeScriptImportContribution
  | SourcePlanSourceFragmentContribution;

/** Conflict policy is explicit so edit application never hides overwrite behavior. */
export enum SourcePlanConflictPolicy {
  /** The host should fail if the target file already exists. */
  MustNotExist = 'must-not-exist',
  /** A file previously generated by this substrate may be replaced. */
  ReplaceGeneratedFile = 'replace-generated-file',
  /** The host owns conflict resolution. */
  HostDecides = 'host-decides',
}

/** Formatting policy is explicit because semantic-runtime should not silently own project style. */
export enum SourcePlanFormattingPolicy {
  /** Formatting follows a semantic-runtime source-plan baseline. */
  SemanticRuntimeBaseline = 'semantic-runtime-baseline',
  /** Formatting follows the app-builder source baseline. */
  AppBuilderBaseline = 'app-builder-baseline',
  /** The host formatter should own final formatting. */
  HostFormatter = 'host-formatter',
  /** A human/operator decides formatting. */
  OperatorDecides = 'operator-decides',
}

/** Package/build policy remains separate from source files. */
export enum SourcePlanPackageToolingPolicy {
  /** Package and build tooling are not modeled by this source plan. */
  NotModeled = 'not-modeled',
  /** The host owns package and build tooling. */
  HostOwned = 'host-owned',
  /** Package and build tooling follow a semantic-runtime source-plan baseline. */
  SemanticRuntimeBaseline = 'semantic-runtime-baseline',
  /** Package and build tooling follow the app-builder source-plan baseline. */
  AppBuilderBaseline = 'app-builder-baseline',
}

/** How source-pattern text relates to the caller's actual domain model. */
export enum SourcePatternDomainModelPolicy {
  /** The source text is an app-shell or framework pattern with no meaningful sample domain nouns. */
  DomainNeutral = 'domain-neutral',
  /** The source text already reflects caller-supplied domain identity and can be used as a domain-specific start. */
  CallerApplied = 'caller-applied',
  /** The source text is a complete reference instantiation; callers should rename/remap its sample domain. */
  ReferenceInstantiation = 'reference-instantiation',
  /** The host or AI must provide the concrete domain model before source text should be emitted as app code. */
  HostDomainRequired = 'host-domain-required',
}

/** Who owns presentation decisions such as layout, spacing, density, and visual tokens. */
export enum SourcePatternStylePolicy {
  /** No authored style surface is present. */
  None = 'none',
  /** Only structural style needed to make the framework/API pattern readable is modeled. */
  StructuralBaseline = 'structural-baseline',
  /** Concrete CSS is a reference fixture/example and should be adapted or replaced by the host. */
  ReferencePresentation = 'reference-presentation',
  /** The host owns all visual styling decisions. */
  HostOwned = 'host-owned',
}

/** What kind of artifact this source pattern should be treated as by source-generation clients. */
export enum SourcePatternRole {
  /** Public generated output that is intended to be a recommendable starting point for app source. */
  RecommendableSourceStart = 'recommendable-source-start',
  /** Focused reusable capability example that should be merged into another source plan rather than scaffolded wholesale. */
  PatternReference = 'pattern-reference',
  /** Complete concrete scenario used for transfer/verification; adapt nouns, data, and presentation before app use. */
  ScenarioReference = 'scenario-reference',
  /** Dense analyzer-pressure artifact; useful for semantic-runtime coverage but not a public app-building recommendation. */
  StressFixture = 'stress-fixture',
}

/** How concrete records/defaults inside a source pattern relate to caller data. */
export enum SourcePatternDataPolicy {
  /** No seed data or mock records are part of the pattern. */
  None = 'none',
  /** Data shape is a service/state contract and caller data should arrive through that boundary. */
  ServiceContract = 'service-contract',
  /** Small generated seed records follow caller source parameters and exist only to make generated source runnable. */
  GeneratedSampleData = 'generated-sample-data',
  /** Small synthetic records are included only to make the scenario runnable and analyzable. */
  SyntheticReferenceData = 'synthetic-reference-data',
  /** Caller or host must provide the data shape before source should be emitted as application code. */
  CallerSupplied = 'caller-supplied',
}

/** Why the source text has its current verbosity/density. */
export enum SourcePatternCodeEconomyPolicy {
  /** Code is intended to be terse production-style Aurelia. */
  ProductionTerse = 'production-terse',
  /** Code is explicit for teaching or transfer and may be trimmed in a real app. */
  TeachingExplicit = 'teaching-explicit',
  /** Code is complete enough to reopen and verify a scenario end-to-end. */
  ReferenceComplete = 'reference-complete',
  /** Code is deliberately dense to pressure semantic-runtime rather than to model user-facing style. */
  PressureRich = 'pressure-rich',
}

/** Public client action for source text carried by a source pattern. */
export enum SourcePatternUsePolicy {
  /** The concrete source is intended to be used as the caller's starting scaffold. */
  ApplyAsSourceStart = 'apply-as-source-start',
  /** The concrete source proves a scenario, but caller-domain code must adapt nouns, data, copy, and presentation. */
  AdaptBeforeEmitting = 'adapt-before-emitting',
  /** The concrete source is a companion capability reference; merge relevant pieces into a primary plan. */
  MergeSelectively = 'merge-selectively',
  /** The concrete source is semantic-runtime pressure only and should not be emitted as user app code. */
  AnalysisPressureOnly = 'analysis-pressure-only',
}

/** Reusable adaptation slot exposed by a source pattern. */
export enum SourcePatternParameterKind {
  /** Primary domain class or aggregate that the reference instantiation names concretely. */
  DomainEntity = 'domain-entity',
  /** Caller-owned member/field schema for forms, tables, cards, details, validation, and derived labels. */
  FieldSchema = 'field-schema',
  /** Collection, option set, action set, or repeated domain surface that must move with the entity model. */
  DomainCollection = 'domain-collection',
  /** Scalar identity used for current-object selection independent of any router involvement. */
  SelectionIdentity = 'selection-identity',
  /** Route path/query/fragment identity that must stay aligned with router config and route-context reads. */
  RouteIdentity = 'route-identity',
  /** User-visible labels, titles, and navigation copy that belong to the caller's feature vocabulary. */
  FeatureCopy = 'feature-copy',
  /** Inline records or defaults included to make the reference instantiation runnable and analyzable. */
  SampleData = 'sample-data',
  /** CSS, layout names, or visual tokens included as reference presentation rather than source-pattern ontology. */
  Presentation = 'presentation',
}

/** Expected caller value shape for a source-pattern parameter. */
export enum SourcePatternParameterValueShape {
  /** Human domain noun phrase such as "Support Ticket"; source generation may derive identifiers from it. */
  DomainTitle = 'domain-title',
  /** Lower/upper source identifier member, variable, method, property, or scalar ID name. */
  SourceMemberName = 'source-member-name',
  /** Router path text such as "support-tickets" or "support-tickets/:supportTicketId". */
  RoutePath = 'route-path',
  /** Router parameter identifier such as "supportTicketId". */
  RouteParameterName = 'route-parameter-name',
  /** User-visible route title or navigation label. */
  RouteTitle = 'route-title',
  /** Comma-separated static route section labels such as "Account, Billing, API Keys". */
  RouteSectionList = 'route-section-list',
  /** Comma-separated workflow/wizard step labels such as "Details, Billing, Review". */
  WorkflowStepList = 'workflow-step-list',
  /** Semicolon-separated named workflow section fields such as `Shipping: address; Payment: payment method select`. */
  WorkflowSectionFieldSchemaList = 'workflow-section-field-schema-list',
  /** Comma-separated field/control descriptors that still need a source-owned schema model before full source rewriting. */
  FieldSchemaList = 'field-schema-list',
  /** Semicolon-separated option groups such as `roles: admin, editor; permissions: read, write`. */
  OptionSchemaList = 'option-schema-list',
  /** Human summary of option sets, repeated collections, or domain-owned action groups. */
  DomainCollectionSummary = 'domain-collection-summary',
  /** Human-visible copy or label text owned by the caller's feature vocabulary. */
  CopyText = 'copy-text',
  /** Human summary of synthetic records or defaults included only to make a reference instantiation runnable. */
  SampleDataSummary = 'sample-data-summary',
  /** Human summary of CSS/layout/tokens that should be adapted to the host design surface. */
  PresentationSummary = 'presentation-summary',
  /** Deliberately loose value used while a more specific source-pattern parameter is being designed. */
  FreeformSummary = 'freeform-summary',
}

/** Reusable semantic source-pattern capability that may appear in many source plans or fixtures. */
export enum SourcePatternModuleKind {
  /** Root app source, entrypoint, root component, or external template shell. */
  AppShell = 'app-shell',
  /** Convention-based resource admission instead of explicit component metadata. */
  ResourceConvention = 'resource-convention',
  /** Explicit resource declaration through decorator, static metadata, or define-style source. */
  ResourceDefinition = 'resource-definition',
  /** RouterConfiguration, route config, navigation links, or au-viewport shell wiring. */
  RouterAdmission = 'router-admission',
  /** RouteContext, route parameters, query values, fragments, or route-owned selection handoff. */
  RouteContext = 'route-context',
  /** DI-resolved state/service/model boundary visible to templates or components. */
  DiBoundary = 'di-boundary',
  /** Ordinary class state composed from child state/model instances. */
  StateComposition = 'state-composition',
  /** Service/repository boundary owned by state for loading or submission side effects. */
  ServiceBoundary = 'service-boundary',
  /** Caller domain model, entity type, value object, or derived domain getter. */
  DomainModel = 'domain-model',
  /** Native input/select/checked/matcher/value binding channels. */
  FormValueChannel = 'form-value-channel',
  /** Search, filter, sort, pagination, or selection controls over a collection. */
  CollectionControls = 'collection-controls',
  /** Repeated rows/cards/lists and item-scope template-controller handoff. */
  ListRendering = 'list-rendering',
  /** Scalar or object identity boundary for selecting a current domain item. */
  SelectionBoundary = 'selection-boundary',
  /** Parent-to-child custom-element handoff through bindables, capture/spread, or local object APIs. */
  ComponentBoundary = 'component-boundary',
  /** If/repeat/switch/promise template-controller semantics intentionally exercised by source. */
  TemplateController = 'template-controller',
  /** Class/style binding channels, not broad design-system ownership. */
  StyleBinding = 'style-binding',
  /** Plugin configuration such as i18n, validation-html, router, or state. */
  PluginIntegration = 'plugin-integration',
  /** Dynamic component/template/model composition through au-compose. */
  DynamicComposition = 'dynamic-composition',
  /** @aurelia/state store, action, and state binding-command semantics. */
  StateStore = 'state-store',
}

/** Reusable source-pattern module identity. */
export enum SourcePatternModuleKey {
  /** Aurelia entrypoint plus root component/template shell. */
  AureliaAppShell = 'aurelia-app-shell',
  /** Convention-based resource discovery. */
  ConventionResourceAdmission = 'convention-resource-admission',
  /** Explicit resource declaration source such as `@customElement(...)`. */
  ExplicitResourceDefinition = 'explicit-resource-definition',
  /** Router configuration and viewport shell. */
  RouterShell = 'router-shell',
  /** Route context owns current selection. */
  RouteContextSelection = 'route-context-selection',
  /** Route path parameter owns current selection. */
  RouteParameterSelection = 'route-parameter-selection',
  /** Templates produce route instructions. */
  RouteLinkNavigation = 'route-link-navigation',
  /** Child route configs and routed components create nested viewport areas. */
  NestedViewportLayout = 'nested-viewport-layout',
  /** Aurelia DI owns state access. */
  DiStateBoundary = 'di-state-boundary',
  /** State composes nested state/model instances. */
  StateComposition = 'state-composition',
  /** State owns service/repository boundary. */
  StateOwnedServiceBoundary = 'state-owned-service-boundary',
  /** State owns async loading behavior. */
  ServiceBackedLoading = 'service-backed-loading',
  /** State owns submit/save side effects. */
  ServiceBackedSubmission = 'service-backed-submission',
  /** Ordinary domain class modeling. */
  OrdinaryDomainClassModel = 'ordinary-domain-class-model',
  /** Template adapts scalar identity to domain object. */
  TemplateLocalDomainLookup = 'template-local-domain-lookup',
  /** Native form observer channels. */
  NativeFormValueChannels = 'native-form-value-channels',
  /** Text value observer channel. */
  NativeTextValueChannel = 'native-text-value-channel',
  /** Boolean checked observer channel. */
  CheckedBooleanChannel = 'checked-boolean-channel',
  /** Collection checked observer channel. */
  CheckedCollectionChannel = 'checked-collection-channel',
  /** Option-model select channel. */
  SelectOptionModelChannel = 'select-option-model-channel',
  /** Object matcher select channel. */
  SelectObjectMatcherChannel = 'select-object-matcher-channel',
  /** Collection control state. */
  CollectionControls = 'collection-controls',
  /** Search/filter collection controls. */
  CollectionSearchFilterControls = 'collection-search-filter-controls',
  /** Sort collection controls. */
  CollectionSortControls = 'collection-sort-controls',
  /** Pagination collection controls. */
  CollectionPaginationControls = 'collection-pagination-controls',
  /** Selection-set collection controls. */
  CollectionSelectionSetControls = 'collection-selection-set-controls',
  /** Repeated list rendering. */
  ListRendering = 'list-rendering',
  /** Close parent/child object component boundary. */
  LocalObjectComponentBoundary = 'local-object-component-boundary',
  /** General component boundary. */
  ComponentBoundary = 'component-boundary',
  /** Attribute-capturing field-shell boundary. */
  CaptureAttributeFieldShell = 'capture-attribute-field-shell',
  /** Template-controller control flow. */
  TemplateControllerFlow = 'template-controller-flow',
  /** Class/style binding channels. */
  ClassStyleChannels = 'class-style-channels',
  /** i18n plugin integration. */
  I18nPlugin = 'i18n-plugin',
  /** Generic plugin integration. */
  PluginIntegration = 'plugin-integration',
  /** Validation plugin integration. */
  ValidationPlugin = 'validation-plugin',
  /** Dynamic component composition. */
  DynamicComponentComposition = 'dynamic-component-composition',
  /** @aurelia/state store integration. */
  AureliaStateStore = 'aurelia-state-store',
}

/** Reusable adaptation parameter identity. */
export enum SourcePatternParameterKey {
  /** Detail route parameter name shared by route config, route context, and navigation source. */
  DetailRouteParameter = 'detail-route-parameter',
  /** List route path shared by route config and navigation source. */
  ListRoutePath = 'list-route-path',
}

/** Adaptation group identity for related source-pattern parameters. */
export enum SourcePatternAdaptationGroupKey {
  /** Route path and parameter identity must move together. */
  RouteIdentity = 'route-identity',
}

/** How far semantic-runtime can currently carry a source-pattern parameter into emitted artifacts. */
export enum SourcePatternParameterApplicationPolicy {
  /** The parameter is a marker for AI/host adaptation; semantic-runtime does not rewrite source for it yet. */
  AdvisoryOnly = 'advisory-only',
  /** The parameter has a source-owned application that changes generated source text. */
  SourceTextInput = 'source-text-input',
}

/** Outcome for a caller-supplied source-pattern value on a source-plan request. */
export enum SourcePatternParameterApplicationState {
  /** The value matched a parameter whose policy lets semantic-runtime apply it to this source plan. */
  AppliedToSourcePlan = 'applied-to-source-plan',
  /** The value matched a source-applicable parameter, but the built source plan did not reflect the requested value. */
  NotAppliedToSourcePlan = 'not-applied-to-source-plan',
  /** The value matched an advisory marker; the host/AI must adapt concrete source manually. */
  AdvisoryOnly = 'advisory-only',
  /** The value named no parameter on the selected source pattern. */
  UnknownParameter = 'unknown-parameter',
  /** More than one value was supplied for the same source-pattern parameter. */
  DuplicateParameterValue = 'duplicate-parameter-value',
  /** The supplied value does not match the parameter's declared value shape. */
  InvalidParameterValue = 'invalid-parameter-value',
}

/** Reusable source-pattern module metadata. */
export class SourcePatternModule {
  constructor(
    readonly key: SourcePatternModuleKey,
    readonly kind: SourcePatternModuleKind,
    readonly title: string,
    readonly summary: string,
  ) {}
}

/** Parameter cluster that should be considered together when adapting a reference instantiation. */
export class SourcePatternAdaptationGroup {
  constructor(
    readonly key: SourcePatternAdaptationGroupKey,
    readonly title: string,
    readonly summary: string,
    readonly parameterKeys: readonly SourcePatternParameterKey[],
  ) {}
}

/** Reusable adaptation parameter exposed by a source pattern. */
export class SourcePatternParameter {
  constructor(
    readonly key: SourcePatternParameterKey,
    readonly kind: SourcePatternParameterKind,
    readonly applicationPolicy: SourcePatternParameterApplicationPolicy,
    readonly valueShape: SourcePatternParameterValueShape,
    readonly title: string,
    /** Current value reflected by generated source for this parameter, or null when no source-owned value exists. */
    readonly sourceValue: string | null,
    readonly summary: string,
  ) {}
}

export interface SourcePatternParameterValue {
  readonly key: SourcePatternParameterKey;
  readonly value: string;
}

/** Observable result of applying one caller value to a lowered source pattern. */
export interface SourcePatternParameterApplication {
  readonly key: SourcePatternParameterKey;
  readonly value: string;
  readonly parameter: SourcePatternParameter | null;
  readonly state: SourcePatternParameterApplicationState;
  readonly summary: string;
}

/** Reusable source pattern metadata, separate from a particular fixture/default instantiation. */
export class SourcePattern {
  readonly kind = 'source-pattern' as const;

  constructor(
    readonly key: string,
    readonly title: string,
    readonly summary: string,
    readonly role: SourcePatternRole,
    readonly domainModelPolicy: SourcePatternDomainModelPolicy,
    readonly stylePolicy: SourcePatternStylePolicy,
    readonly dataPolicy: SourcePatternDataPolicy,
    readonly codeEconomyPolicy: SourcePatternCodeEconomyPolicy,
    readonly adaptationNotes: readonly string[],
    readonly parameters: readonly SourcePatternParameter[] = [],
    readonly modules: readonly SourcePatternModule[] = [],
    readonly adaptationGroups: readonly SourcePatternAdaptationGroup[] = [],
  ) {}
}

/** Read the first caller value for a source-pattern parameter key. */
export function sourcePatternParameterValue(
  values: readonly SourcePatternParameterValue[],
  key: SourcePatternParameterKey,
): string | null {
  return values.find((value) => value.key === key)?.value ?? null;
}

/** Read the source-reflected value for a source-pattern parameter from a built source pattern. */
export function sourcePatternParameterSourceValue(
  pattern: SourcePattern | null,
  key: SourcePatternParameterKey,
): string | null {
  return pattern?.parameters.find((parameter) => parameter.key === key)?.sourceValue ?? null;
}

/** Evaluate caller source-pattern values against a generated pattern and its reflected source values. */
export function sourcePatternParameterApplications(
  pattern: SourcePattern | null,
  values: readonly SourcePatternParameterValue[] = [],
): readonly SourcePatternParameterApplication[] {
  const seen = new Set<SourcePatternParameterKey>();
  return values.map((value) => {
    const parameter = pattern?.parameters.find((candidate) => candidate.key === value.key) ?? null;
    if (seen.has(value.key)) {
      return sourcePatternParameterApplication(
        value,
        parameter,
        SourcePatternParameterApplicationState.DuplicateParameterValue,
        `Source-pattern parameter '${value.key}' was supplied more than once.`,
      );
    }
    seen.add(value.key);
    if (parameter == null) {
      return sourcePatternParameterApplication(
        value,
        null,
        SourcePatternParameterApplicationState.UnknownParameter,
        `Source-pattern parameter '${value.key}' is not declared by the selected source pattern.`,
      );
    }
    const validationSummary = sourcePatternParameterValueValidationSummary(parameter, value.value);
    if (validationSummary != null) {
      return sourcePatternParameterApplication(
        value,
        parameter,
        SourcePatternParameterApplicationState.InvalidParameterValue,
        validationSummary,
      );
    }
    switch (parameter.applicationPolicy) {
      case SourcePatternParameterApplicationPolicy.AdvisoryOnly:
        return sourcePatternParameterApplication(
          value,
          parameter,
          SourcePatternParameterApplicationState.AdvisoryOnly,
          `Source-pattern parameter '${value.key}' is advisory for this pattern; the host must adapt concrete source manually.`,
        );
      case SourcePatternParameterApplicationPolicy.SourceTextInput:
        return sourcePatternParameterApplication(
          value,
          parameter,
          parameter.sourceValue === value.value
            ? SourcePatternParameterApplicationState.AppliedToSourcePlan
            : SourcePatternParameterApplicationState.NotAppliedToSourcePlan,
          parameter.sourceValue === value.value
            ? `Source-pattern parameter '${value.key}' was reflected in the generated source pattern.`
            : `Source-pattern parameter '${value.key}' requested '${value.value}', but generated source still reports '${parameter.sourceValue ?? '<none>'}'.`,
        );
    }
  });
}

export function sourcePatternUsePolicy(
  pattern: Pick<SourcePattern, 'role' | 'domainModelPolicy' | 'stylePolicy' | 'dataPolicy' | 'codeEconomyPolicy'>,
): SourcePatternUsePolicy {
  if (
    pattern.role === SourcePatternRole.StressFixture
    || pattern.codeEconomyPolicy === SourcePatternCodeEconomyPolicy.PressureRich
  ) {
    return SourcePatternUsePolicy.AnalysisPressureOnly;
  }
  if (pattern.role === SourcePatternRole.PatternReference) {
    return SourcePatternUsePolicy.MergeSelectively;
  }
  if (
    pattern.role === SourcePatternRole.ScenarioReference
    || pattern.domainModelPolicy === SourcePatternDomainModelPolicy.ReferenceInstantiation
    || pattern.stylePolicy === SourcePatternStylePolicy.ReferencePresentation
    || pattern.dataPolicy === SourcePatternDataPolicy.SyntheticReferenceData
    || pattern.codeEconomyPolicy === SourcePatternCodeEconomyPolicy.ReferenceComplete
  ) {
    return SourcePatternUsePolicy.AdaptBeforeEmitting;
  }
  return SourcePatternUsePolicy.ApplyAsSourceStart;
}

export function sourcePatternUseSummary(
  pattern: Pick<SourcePattern, 'role' | 'domainModelPolicy' | 'stylePolicy' | 'dataPolicy' | 'codeEconomyPolicy'>,
): string {
  switch (sourcePatternUsePolicy(pattern)) {
    case SourcePatternUsePolicy.ApplyAsSourceStart:
      return 'Concrete source is a recommendable starting scaffold unless an existing app already owns that structure.';
    case SourcePatternUsePolicy.AdaptBeforeEmitting:
      return 'Concrete source is transfer material; adapt caller domain names, data defaults, copy, and presentation before emitting app code.';
    case SourcePatternUsePolicy.MergeSelectively:
      return 'Concrete source is a companion capability reference; merge only the relevant modules and semantic promises into the primary plan.';
    case SourcePatternUsePolicy.AnalysisPressureOnly:
      return 'Concrete source is analyzer pressure and should not be emitted as public app code.';
  }
}

function sourcePatternParameterApplication(
  value: SourcePatternParameterValue,
  parameter: SourcePatternParameter | null,
  state: SourcePatternParameterApplicationState,
  summary: string,
): SourcePatternParameterApplication {
  return {
    key: value.key,
    value: value.value,
    parameter,
    state,
    summary,
  };
}

function sourcePatternParameterValueValidationSummary(
  parameter: SourcePatternParameter,
  value: string,
): string | null {
  switch (parameter.valueShape) {
    case SourcePatternParameterValueShape.DomainTitle:
    case SourcePatternParameterValueShape.RouteTitle:
    case SourcePatternParameterValueShape.CopyText:
    case SourcePatternParameterValueShape.SampleDataSummary:
    case SourcePatternParameterValueShape.PresentationSummary:
    case SourcePatternParameterValueShape.DomainCollectionSummary:
    case SourcePatternParameterValueShape.FieldSchemaList:
    case SourcePatternParameterValueShape.OptionSchemaList:
    case SourcePatternParameterValueShape.RouteSectionList:
    case SourcePatternParameterValueShape.WorkflowStepList:
    case SourcePatternParameterValueShape.WorkflowSectionFieldSchemaList:
    case SourcePatternParameterValueShape.FreeformSummary:
      return value.length > 0 && !/[\r\n]/.test(value)
        ? null
        : `Source-pattern parameter '${parameter.key}' expected a non-empty single-line ${parameter.valueShape}.`;
    case SourcePatternParameterValueShape.SourceMemberName:
    case SourcePatternParameterValueShape.RouteParameterName:
      return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)
        ? null
        : `Source-pattern parameter '${parameter.key}' expected an identifier-like ${parameter.valueShape}.`;
    case SourcePatternParameterValueShape.RoutePath:
      return routePathParameterValueValidationSummary(parameter, value);
  }
}

function routePathParameterValueValidationSummary(
  parameter: SourcePatternParameter,
  value: string,
): string | null {
  if (value.length === 0 || /[\r\n<>&]/.test(value)) {
    return `Source-pattern parameter '${parameter.key}' expected a non-empty route path safe for generated TypeScript and HTML attribute source.`;
  }
  const parse = parseConfigurableRoutePath(value, false);
  if (parse.issues.length === 0) {
    return null;
  }
  return `Source-pattern parameter '${parameter.key}' expected a valid Aurelia configurable route path: ${parse.issues[0]!.message}`;
}

/** Concrete file text, when a producer can emit it without another policy decision. */
export class SourcePlanText {
  readonly kind = 'source-plan-text' as const;

  constructor(
    readonly text: string,
    readonly authority: SourcePlanTextAuthority,
  ) {}
}

/** Policy envelope for applying a source edit plan. */
export class SourcePlanPolicy {
  readonly kind = 'source-plan-policy' as const;

  constructor(
    readonly conflictPolicy: SourcePlanConflictPolicy,
    readonly formattingPolicy: SourcePlanFormattingPolicy,
    readonly packageToolingPolicy: SourcePlanPackageToolingPolicy,
  ) {}
}

/** One file-level source artifact requested by a source plan. */
export class SourcePlanFile {
  readonly kind = 'source-plan-file' as const;

  constructor(
    readonly path: string,
    readonly role: SourcePlanFileRole,
    readonly language: SourcePlanLanguage,
    readonly editKind: SourcePlanEditKind,
    readonly operationKind: SourcePlanOperationKind | null,
    readonly text: SourcePlanText | null,
    readonly contributions: readonly SourcePlanContribution[] = [],
  ) {}
}

/** Planned source artifacts before a host writes files or resolves conflicts. */
export class SourcePlan {
  readonly kind = 'source-plan' as const;

  constructor(
    readonly rootDir: string,
    readonly policy: SourcePlanPolicy,
    readonly files: readonly SourcePlanFile[],
    /** Structured package/typecheck artifacts that are applied beside app source, when the source plan owns them. */
    readonly projectTooling: SourcePlanProjectTooling | null = null,
    /** Pattern/reference-instantiation metadata so clients do not mistake sample domains for source-pattern ontology. */
    readonly pattern: SourcePattern | null = null,
  ) {}

  get hasCompleteFileText(): boolean {
    return this.files.every((file) => file.text != null)
      && (this.projectTooling?.hasCompleteFileText ?? true);
  }
}

/** File artifact staged by SourcePlanAssembly before it becomes a SourcePlanFile. */
export interface SourcePlanFileArtifact {
  readonly path: string;
  readonly role: SourcePlanFileRole;
  readonly language: SourcePlanLanguage;
  readonly operationKind: SourcePlanOperationKind | null;
  readonly text: string | null;
  readonly editKind?: SourcePlanEditKind;
  readonly textAuthority?: SourcePlanTextAuthority;
  readonly contributions?: readonly SourcePlanContribution[];
}

/** Stateful source-plan assembler that carries edit policy and text authority across generated files. */
export class SourcePlanAssembly {
  private readonly stagedFiles: SourcePlanFile[] = [];

  constructor(
    readonly rootDir: string,
    readonly policy: SourcePlanPolicy,
    readonly defaultTextAuthority: SourcePlanTextAuthority,
    readonly defaultEditKind: SourcePlanEditKind = SourcePlanEditKind.Create,
  ) {}

  addFile(artifact: SourcePlanFileArtifact): this {
    this.stagedFiles.push(new SourcePlanFile(
      artifact.path,
      artifact.role,
      artifact.language,
      artifact.editKind ?? this.defaultEditKind,
      artifact.operationKind,
      artifact.text == null
        ? null
        : new SourcePlanText(artifact.text, artifact.textAuthority ?? this.defaultTextAuthority),
      artifact.contributions ?? [],
    ));
    return this;
  }

  addSourcePlanFile(file: SourcePlanFile): this {
    this.stagedFiles.push(file);
    return this;
  }

  build(
    projectTooling: SourcePlanProjectTooling | null = null,
    pattern: SourcePattern | null = null,
  ): SourcePlan {
    return new SourcePlan(
      this.rootDir,
      this.policy,
      [...this.stagedFiles],
      projectTooling,
      pattern,
    );
  }
}

export function semanticRuntimeSourceEditPolicy(
  packageToolingPolicy: SourcePlanPackageToolingPolicy = SourcePlanPackageToolingPolicy.NotModeled,
): SourcePlanPolicy {
  return new SourcePlanPolicy(
    SourcePlanConflictPolicy.MustNotExist,
    SourcePlanFormattingPolicy.SemanticRuntimeBaseline,
    packageToolingPolicy,
  );
}

export function sourcePlanHasCompleteText(
  sourcePlan: SourcePlan,
): boolean {
  return sourcePlan.hasCompleteFileText;
}

export function referenceInstantiationSourceFiles(
  files: readonly SourcePlanFile[],
): readonly SourcePlanFile[] {
  return files.map((file) => sourceFileWithTextAuthority(
    file,
    SourcePlanTextAuthority.SemanticRuntimeReferenceInstantiation,
  ));
}

export function sourceFileWithTextAuthority(
  file: SourcePlanFile,
  textAuthority: SourcePlanTextAuthority,
): SourcePlanFile {
  return new SourcePlanFile(
    file.path,
    file.role,
    file.language,
    file.editKind,
    file.operationKind,
    file.text == null
      ? null
      : new SourcePlanText(file.text.text, textAuthority),
    file.contributions,
  );
}

/** Create a source-plan import contribution from a static TypeScript import requirement. */
export function sourcePlanTypeScriptImportContribution(
  importRequirement: TypeScriptImportRequirement,
  origin: SourcePlanContributionOrigin | null = null,
): SourcePlanTypeScriptImportContribution {
  return {
    kind: SourcePlanContributionKind.TypeScriptImportRequirement,
    origin,
    importRequirement,
  };
}

/** Create source-plan import contributions from static TypeScript import requirements. */
export function sourcePlanTypeScriptImportContributions(
  importRequirements: readonly TypeScriptImportRequirement[],
  origin: SourcePlanContributionOrigin | null = null,
): readonly SourcePlanTypeScriptImportContribution[] {
  return importRequirements.map((importRequirement) =>
    sourcePlanTypeScriptImportContribution(importRequirement, origin));
}

/** Create a source-plan source-fragment contribution before concrete file spans are known. */
export function sourcePlanSourceFragmentContribution(
  language: SourcePlanLanguage,
  text: string,
  origin: SourcePlanContributionOrigin | null = null,
): SourcePlanSourceFragmentContribution {
  return {
    kind: SourcePlanContributionKind.SourceFragment,
    origin,
    language,
    text,
  };
}

/** Create a source-plan origin for a framework configuration admission. */
export function sourcePlanAureliaConfigurationAdmissionOrigin(
  admissionKind: AureliaConfigurationAdmissionKind,
): SourcePlanAureliaConfigurationAdmissionOrigin {
  return {
    kind: SourcePlanContributionOriginKind.AureliaConfigurationAdmission,
    admissionKind,
  };
}

/** Read static TypeScript import requirements contributed to a source-plan file. */
export function sourcePlanFileTypeScriptImportRequirements(
  file: SourcePlanFile,
): readonly TypeScriptImportRequirement[] {
  return sourcePlanContributionTypeScriptImportRequirements(file.contributions);
}

/** Read static TypeScript import requirements from source-plan contributions. */
export function sourcePlanContributionTypeScriptImportRequirements(
  contributions: readonly SourcePlanContribution[],
): readonly TypeScriptImportRequirement[] {
  return contributions
    .filter((contribution): contribution is SourcePlanTypeScriptImportContribution =>
      contribution.kind === SourcePlanContributionKind.TypeScriptImportRequirement)
    .map((contribution) => contribution.importRequirement);
}
