/** App-builder axis that owns one compatible family of Aurelia-specific lowering choices. */
export enum AppBuilderAureliaLoweringAxis {
  /** App-wide convention admission policy; generated apps should not treat conventions as local taste. */
  AppConventionPolicy = 'app-convention-policy',
  /** Per-resource declaration style after app-wide convention policy is known. */
  ResourceDeclaration = 'resource-declaration',
  /** Per-resource metadata/configuration surfaces generated source may use. */
  ResourceConfiguration = 'resource-configuration',
  /** App-wide shared-state ownership policy when generated source needs shared state. */
  AppStateOwnership = 'app-state-ownership',
  /** Local state mechanics for compact apps, small sections, and component boundaries. */
  LocalStatePolicy = 'local-state-policy',
  /** How plain domain objects compose with view-models, state, and services. */
  DomainModeling = 'domain-modeling',
  /** App-wide router package/configuration admission policy. */
  RouterAdmission = 'router-admission',
  /** Per-area navigation composition for menus, list/detail surfaces, and view selection. */
  AreaNavigationPolicy = 'area-navigation-policy',
  /** How generated bindings cross state, route, and component boundaries. */
  BindingPolicy = 'binding-policy',
  /** Optional Aurelia package/plugin capabilities admitted by generated source. */
  PackageCapability = 'package-capability',
  /** Per-resource DOM encapsulation posture. */
  ResourceDomEncapsulation = 'resource-dom-encapsulation',
  /** App-level stylesheet assets generated source should own. */
  AppStylePolicy = 'app-style-policy',
  /** Per-resource stylesheet/style-registry assets generated source should own. */
  ResourceStylePolicy = 'resource-style-policy',
}

/** App-wide convention policy for resource discovery and generated source layout. */
export enum AppBuilderConventionPolicy {
  /** Enable Aurelia conventions and allow convention-declared resources. */
  ConventionsEnabled = 'conventions-enabled',
  /** Avoid convention reliance and declare/register resources explicitly. */
  ExplicitResourceDeclarations = 'explicit-resource-declarations',
}

/** Per-resource strategy for declaring a generated Aurelia resource. */
export enum AppBuilderResourceDeclarationMode {
  /** Declare this resource through Aurelia naming/file conventions. */
  ConventionResource = 'convention-resource',
  /** Declare this resource with explicit decorator metadata. */
  DecoratorResource = 'decorator-resource',
  /** Declare a small local resource inline to reduce file count for compact sections. */
  InlineCustomElement = 'inline-custom-element',
}

/** Stackable resource metadata/configuration surfaces available to generated resources. */
export enum AppBuilderResourceConfigurationSurface {
  /** Prefer static resource/configuration properties where they express durable app shape. */
  StaticResourceConfiguration = 'static-resource-configuration',
}

/** Mutually exclusive app-wide shared-state ownership mode. */
export enum AppBuilderAppStateOwnershipMode {
  /** Use a DI-resolved state class as the app's main shared-state boundary. */
  DiStateClass = 'di-state-class',
  /** Use @aurelia/state when plugin-backed store semantics are explicitly desired. */
  StatePluginStore = 'state-plugin-store',
}

/** Stackable local state mechanics for compact apps or small app sections. */
export enum AppBuilderLocalStatePolicy {
  /** Store small local state directly on the view-model. */
  ViewModelLocalState = 'view-model-local-state',
  /** Pass small local data through bindables at deliberate component boundaries. */
  BindablePassThrough = 'bindable-pass-through',
}

/** Domain-modeling posture independent of where app state is owned. */
export enum AppBuilderDomainModelingMode {
  /** Use ordinary classes and composed state/domain objects instead of forwarding view-model getters. */
  PlainDomainComposition = 'plain-domain-composition',
}

/** Mutually exclusive app-wide router admission policy. */
export enum AppBuilderRouterAdmissionPolicy {
  /** Do not register the router for this generated starter. */
  NoRouter = 'no-router',
  /** Register router configuration so route-driven areas can exist. */
  RouterConfiguration = 'router-configuration',
}

/** Per-area view-selection strategy after app-wide router admission is known. */
export enum AppBuilderAreaNavigationPolicy {
  /** Select local views/details through state and bindings rather than routing. */
  BindingDrivenViewSelection = 'binding-driven-view-selection',
  /** Select views/details through router instructions and viewport ownership. */
  RouterDrivenViewSelection = 'router-driven-view-selection',
}

/** Stackable binding/data-flow policies visible in generated source. */
export enum AppBuilderBindingPolicy {
  /** Bind directly through DI state/domain members when that is the cleanest expression. */
  DirectStateTemplateBinding = 'direct-state-template-binding',
  /** Use route parameters or scalar IDs when navigation/loading owns the object boundary. */
  RouteIdSelection = 'route-id-selection',
  /** Use typed object handoff only at deliberate component/detail boundaries. */
  ComponentObjectHandoff = 'component-object-handoff',
}

/** Stackable Aurelia package/plugin capabilities admitted by generated source. */
export enum AppBuilderPackageCapability {
  /** Use validation-html configuration and validate bindings. */
  ValidationHtml = 'validation-html',
  /** Use i18n configuration and translation bindings. */
  I18n = 'i18n',
}

/** Mutually exclusive resource DOM encapsulation posture. */
export enum AppBuilderResourceDomEncapsulationMode {
  /** Use ordinary light DOM and avoid Shadow DOM-specific contracts. */
  LightDom = 'light-dom',
  /** Use open Shadow DOM when style/slot encapsulation is explicitly desired. */
  OpenShadowDom = 'open-shadow-dom',
  /** Use closed Shadow DOM only when the caller explicitly wants that boundary. */
  ClosedShadowDom = 'closed-shadow-dom',
}

/** Stackable app-level stylesheet policies available to generated source. */
export enum AppBuilderAppStylePolicy {
  /** Use an application-level stylesheet owned by the app shell. */
  GlobalStylesheet = 'global-stylesheet',
}

/** Stackable per-resource stylesheet/style-registry policies available to generated source. */
export enum AppBuilderResourceStylePolicy {
  /** Use a stylesheet associated with a component without requiring Shadow DOM. */
  ComponentStylesheet = 'component-stylesheet',
  /** Use Aurelia cssModules(...) registry dependencies for class-name mapping. */
  CssModules = 'css-modules',
  /** Use Aurelia shadowCSS(...) registry dependencies for Shadow DOM style registration. */
  ShadowCssRegistry = 'shadow-css-registry',
}

export type AppBuilderAureliaLoweringChoiceId =
  | AppBuilderConventionPolicy
  | AppBuilderResourceDeclarationMode
  | AppBuilderResourceConfigurationSurface
  | AppBuilderAppStateOwnershipMode
  | AppBuilderLocalStatePolicy
  | AppBuilderDomainModelingMode
  | AppBuilderRouterAdmissionPolicy
  | AppBuilderAreaNavigationPolicy
  | AppBuilderBindingPolicy
  | AppBuilderPackageCapability
  | AppBuilderResourceDomEncapsulationMode
  | AppBuilderAppStylePolicy
  | AppBuilderResourceStylePolicy;

/** Typed Aurelia lowering selection; app-wide fields set defaults, local arrays model per-area/resource mechanics. */
export interface AppBuilderAureliaLoweringSelection {
  readonly appConventionPolicy?: AppBuilderConventionPolicy;
  readonly resourceDeclaration?: AppBuilderResourceDeclarationMode;
  readonly resourceConfigurationSurfaces?: readonly AppBuilderResourceConfigurationSurface[];
  readonly appStateOwnership?: AppBuilderAppStateOwnershipMode;
  readonly localStatePolicies?: readonly AppBuilderLocalStatePolicy[];
  readonly domainModeling?: AppBuilderDomainModelingMode;
  readonly routerAdmission?: AppBuilderRouterAdmissionPolicy;
  readonly areaNavigationPolicies?: readonly AppBuilderAreaNavigationPolicy[];
  readonly bindingPolicies?: readonly AppBuilderBindingPolicy[];
  readonly packageCapabilities?: readonly AppBuilderPackageCapability[];
  readonly resourceDomEncapsulation?: AppBuilderResourceDomEncapsulationMode;
  readonly appStylePolicies?: readonly AppBuilderAppStylePolicy[];
  readonly resourceStylePolicies?: readonly AppBuilderResourceStylePolicy[];
}

/** Aurelia-specific choice descriptor consumed by menu filtering and future lowering. */
export interface AppBuilderAureliaLoweringChoiceDescriptor {
  readonly id: AppBuilderAureliaLoweringChoiceId;
  readonly axis: AppBuilderAureliaLoweringAxis;
  readonly title: string;
  readonly summary: string;
  readonly selection: AppBuilderAureliaLoweringSelection;
}

/** Merge lowering selections with later selections overriding scalar axes and appending stackable axes. */
export function mergeAppBuilderAureliaLoweringSelections(
  ...selections: readonly (AppBuilderAureliaLoweringSelection | null | undefined)[]
): AppBuilderAureliaLoweringSelection {
  const merged: MutableAureliaLoweringSelection = {};
  for (const selection of selections) {
    if (selection == null) {
      continue;
    }
    if (selection.appConventionPolicy != null) {
      merged.appConventionPolicy = selection.appConventionPolicy;
    }
    if (selection.resourceDeclaration != null) {
      merged.resourceDeclaration = selection.resourceDeclaration;
    }
    if (selection.appStateOwnership != null) {
      merged.appStateOwnership = selection.appStateOwnership;
    }
    if (selection.domainModeling != null) {
      merged.domainModeling = selection.domainModeling;
    }
    if (selection.routerAdmission != null) {
      merged.routerAdmission = selection.routerAdmission;
    }
    if (selection.resourceDomEncapsulation != null) {
      merged.resourceDomEncapsulation = selection.resourceDomEncapsulation;
    }
    merged.resourceConfigurationSurfaces = appendUniqueValues(
      merged.resourceConfigurationSurfaces,
      selection.resourceConfigurationSurfaces,
    );
    merged.localStatePolicies = appendUniqueValues(merged.localStatePolicies, selection.localStatePolicies);
    merged.areaNavigationPolicies = appendUniqueValues(merged.areaNavigationPolicies, selection.areaNavigationPolicies);
    merged.bindingPolicies = appendUniqueValues(merged.bindingPolicies, selection.bindingPolicies);
    merged.packageCapabilities = appendUniqueValues(merged.packageCapabilities, selection.packageCapabilities);
    merged.appStylePolicies = appendUniqueValues(merged.appStylePolicies, selection.appStylePolicies);
    merged.resourceStylePolicies = appendUniqueValues(merged.resourceStylePolicies, selection.resourceStylePolicies);
  }
  return merged;
}

/** Return true when the candidate selection includes every axis/value required by the desired selection. */
export function appBuilderAureliaLoweringSelectionSatisfies(
  candidate: AppBuilderAureliaLoweringSelection,
  desired: AppBuilderAureliaLoweringSelection,
): boolean {
  return scalarMatches(candidate.appConventionPolicy, desired.appConventionPolicy)
    && scalarMatches(candidate.resourceDeclaration, desired.resourceDeclaration)
    && scalarMatches(candidate.appStateOwnership, desired.appStateOwnership)
    && scalarMatches(candidate.domainModeling, desired.domainModeling)
    && scalarMatches(candidate.routerAdmission, desired.routerAdmission)
    && scalarMatches(candidate.resourceDomEncapsulation, desired.resourceDomEncapsulation)
    && includesAll(candidate.resourceConfigurationSurfaces, desired.resourceConfigurationSurfaces)
    && includesAll(candidate.localStatePolicies, desired.localStatePolicies)
    && includesAll(candidate.areaNavigationPolicies, desired.areaNavigationPolicies)
    && includesAll(candidate.bindingPolicies, desired.bindingPolicies)
    && includesAll(candidate.packageCapabilities, desired.packageCapabilities)
    && includesAll(candidate.appStylePolicies, desired.appStylePolicies)
    && includesAll(candidate.resourceStylePolicies, desired.resourceStylePolicies);
}

/** Flatten a typed lowering selection into stable choice IDs for menu previews and manifests. */
export function appBuilderAureliaLoweringChoiceIds(
  selection: AppBuilderAureliaLoweringSelection,
): readonly AppBuilderAureliaLoweringChoiceId[] {
  const ids: AppBuilderAureliaLoweringChoiceId[] = [];
  appendDefined(ids, selection.appConventionPolicy);
  appendDefined(ids, selection.resourceDeclaration);
  appendValues(ids, selection.resourceConfigurationSurfaces);
  appendDefined(ids, selection.appStateOwnership);
  appendValues(ids, selection.localStatePolicies);
  appendDefined(ids, selection.domainModeling);
  appendDefined(ids, selection.routerAdmission);
  appendValues(ids, selection.areaNavigationPolicies);
  appendValues(ids, selection.bindingPolicies);
  appendValues(ids, selection.packageCapabilities);
  appendDefined(ids, selection.resourceDomEncapsulation);
  appendValues(ids, selection.appStylePolicies);
  appendValues(ids, selection.resourceStylePolicies);
  return ids;
}

type MutableAureliaLoweringSelection = {
  -readonly [TKey in keyof AppBuilderAureliaLoweringSelection]: AppBuilderAureliaLoweringSelection[TKey];
};

function appendUniqueValues<TValue>(
  existing: readonly TValue[] | undefined,
  incoming: readonly TValue[] | undefined,
): readonly TValue[] | undefined {
  if (incoming == null || incoming.length === 0) {
    return existing;
  }
  const values = existing == null ? [] : [...existing];
  for (const value of incoming) {
    if (!values.includes(value)) {
      values.push(value);
    }
  }
  return values;
}

function scalarMatches<TValue>(
  candidate: TValue | undefined,
  desired: TValue | undefined,
): boolean {
  return desired == null || candidate === desired;
}

function includesAll<TValue>(
  candidate: readonly TValue[] | undefined,
  desired: readonly TValue[] | undefined,
): boolean {
  return desired == null || desired.every((value) => candidate?.includes(value) === true);
}

function appendDefined(
  ids: AppBuilderAureliaLoweringChoiceId[],
  value: AppBuilderAureliaLoweringChoiceId | undefined,
): void {
  if (value != null) {
    ids.push(value);
  }
}

function appendValues(
  ids: AppBuilderAureliaLoweringChoiceId[],
  values: readonly AppBuilderAureliaLoweringChoiceId[] | undefined,
): void {
  if (values != null) {
    ids.push(...values);
  }
}
