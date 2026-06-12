/** App-builder axis that owns one compatible family of Aurelia-specific lowering choices. */
export enum AppBuilderAureliaLoweringAxis {
  /** App-wide convention admission policy; generated apps should not treat conventions as local taste. */
  AppConventionPolicy = 'app-convention-policy',
  /** Per-resource framework resource kind a generated declaration targets. */
  ResourceKind = 'resource-kind',
  /** Per-resource primary carrier that establishes a generated resource definition. */
  ResourceCarrier = 'resource-carrier',
  /** Custom-element-only template source-layout form (companion file vs inline markup). */
  CustomElementViewForm = 'custom-element-view-form',
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
  /** Custom-element-only DOM encapsulation posture (light vs shadow DOM). */
  CustomElementDomEncapsulation = 'custom-element-dom-encapsulation',
  /** App-level stylesheet assets generated source should own. */
  AppStylePolicy = 'app-style-policy',
  /** Custom-element-only stylesheet/style-registry assets generated source should own. */
  CustomElementStylePolicy = 'custom-element-style-policy',
}

/** App-wide convention policy for resource discovery and generated source layout. */
export enum AppBuilderConventionPolicy {
  /** Enable Aurelia conventions and allow convention-declared resources. */
  ConventionsEnabled = 'conventions-enabled',
  /** Avoid convention reliance and declare/register resources explicitly. */
  ExplicitResourceDeclarations = 'explicit-resource-declarations',
}

/**
 * Framework resource kind a generated declaration targets. Mirrors resources/ResourceDefinitionKind
 * (the framework resource taxonomy). Current source lowerers target CustomElement; the rest are
 * defined so future generators attach to the right axis rather than overloading carrier or view form.
 */
export enum AppBuilderResourceKind {
  /** Templated component element (`@customElement`); the default generated resource. */
  CustomElement = 'custom-element',
  /** Non-templated attribute behavior bound to a host element (`@customAttribute`). */
  CustomAttribute = 'custom-attribute',
  /** View-controlling attribute that owns a view factory (`@templateController`, e.g. if/repeat). */
  TemplateController = 'template-controller',
  /** Pipeable value transform applied within bindings (`@valueConverter`). */
  ValueConverter = 'value-converter',
  /** Binding-lifecycle modifier applied with `&` in bindings (`@bindingBehavior`). */
  BindingBehavior = 'binding-behavior',
  /** Binding-syntax command that compiles an attribute target (`@bindingCommand`). */
  BindingCommand = 'binding-command',
  /** Attribute-syntax recognizer mapping DOM attributes to targets (`AttributePattern`). */
  AttributePattern = 'attribute-pattern',
}

/**
 * Primary carrier that establishes a generated resource definition. Mirrors resources/ResourceCarrierKind.
 * The carrier creates the resource identity; additional metadata (bindables, watches, shadow options) layers
 * via separate axes that converge onto it (see resources/ResourceDefinitionConverger). Convention is gated by
 * AppConventionPolicy but composes with explicit carriers: conventions enabled app-wide does not force the
 * convention carrier for every resource. Current source lowerers use Convention/Decorator; the rest are
 * defined so future generators select a real establishment form rather than overloading this axis.
 */
export enum AppBuilderResourceCarrier {
  /** Establish by Aurelia naming/file convention; requires AppConventionPolicy to enable conventions. */
  Convention = 'convention',
  /** Establish with a class decorator such as `@customElement(...)`. */
  Decorator = 'decorator',
  /** Establish with a static class-side `$au` definition field. */
  StaticAu = 'static-$au',
  /** Establish with an imperative `CustomElement.define(...)`-style call. */
  DefineCall = 'define-call',
  /** Establish a syntax resource with an `AttributePattern.create(...)` factory call (attribute-pattern kind). */
  AttributePatternCreate = 'attribute-pattern-create',
}

/**
 * How a generated custom element provides its template in source. Custom-element-specific: only custom elements
 * associate with an HTML view, so this axis does not apply to other resource kinds. Companion-file vs inline is a
 * source-layout choice; both yield template kind Markup at the definition level, so the distinction is a
 * source-layout fact (the template's source address) rather than a template-kind difference. A template-less custom
 * element is InlineMarkup with empty/null markup, not a separate value.
 */
export enum AppBuilderCustomElementViewForm {
  /** Template lives in a separate companion `.html` file (convention-paired or imported). */
  CompanionFile = 'companion-file',
  /** Template is an inline markup string on the carrier; trades a file for locality (empty/null = no view). */
  InlineMarkup = 'inline-markup',
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
  /** Store a small caller-supplied collection directly on the view-model. */
  ViewModelLocalCollection = 'view-model-local-collection',
  /** Pass small local data through bindables at deliberate component boundaries. */
  BindablePassThrough = 'bindable-pass-through',
}

/** Domain-modeling posture independent of where app state is owned. */
export enum AppBuilderDomainModelingMode {
  /** Use ordinary classes and composed state/domain objects instead of forwarding view-model getters. */
  PlainDomainComposition = 'plain-domain-composition',
  /** Use typed immutable state records owned by a plugin store rather than DI-composed domain instances. */
  StoreStateRecordModel = 'store-state-record-model',
}

/** Mutually exclusive app-wide router admission policy. */
export enum AppBuilderRouterAdmissionPolicy {
  /** Do not register the router for this generated app source. */
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
  /** Bind through @aurelia/state store scopes, state commands, and dispatch commands. */
  StoreScopedStateBinding = 'store-scoped-state-binding',
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
  /** Use @aurelia/state store configuration, state binding behavior, and state/dispatch commands. */
  State = 'state',
  /** Use virtual-repeat for large collection rendering when virtualization is explicitly selected. */
  VirtualRepeat = 'virtual-repeat',
  /** Use Aurelia fetch-client integration for HTTP service boundaries when explicitly selected. */
  Fetch = 'fetch',
}

/** Mutually exclusive custom-element DOM encapsulation posture. Custom-element-only: shadow DOM is a custom-element
 *  concern (shadowOptions), so this axis does not apply to other resource kinds. */
export enum AppBuilderCustomElementDomEncapsulationMode {
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

/** Stackable custom-element stylesheet/style-registry policies available to generated source. Custom-element-only:
 *  component stylesheets and shadow-CSS registries attach to a custom element's view/shadow root. */
export enum AppBuilderCustomElementStylePolicy {
  /** Use a stylesheet associated with a component without requiring Shadow DOM. */
  ComponentStylesheet = 'component-stylesheet',
  /** Use Aurelia cssModules(...) registry dependencies for class-name mapping. */
  CssModules = 'css-modules',
  /** Use Aurelia shadowCSS(...) registry dependencies for Shadow DOM style registration. */
  ShadowCssRegistry = 'shadow-css-registry',
}

export type AppBuilderAureliaLoweringChoiceId =
  | AppBuilderConventionPolicy
  | AppBuilderResourceKind
  | AppBuilderResourceCarrier
  | AppBuilderCustomElementViewForm
  | AppBuilderAppStateOwnershipMode
  | AppBuilderLocalStatePolicy
  | AppBuilderDomainModelingMode
  | AppBuilderRouterAdmissionPolicy
  | AppBuilderAreaNavigationPolicy
  | AppBuilderBindingPolicy
  | AppBuilderPackageCapability
  | AppBuilderCustomElementDomEncapsulationMode
  | AppBuilderAppStylePolicy
  | AppBuilderCustomElementStylePolicy;

/** Typed Aurelia lowering selection; app-wide fields set defaults, local arrays model per-area/resource mechanics. */
export interface AppBuilderAureliaLoweringSelection {
  readonly appConventionPolicy?: AppBuilderConventionPolicy;
  readonly resourceKind?: AppBuilderResourceKind;
  readonly resourceCarrier?: AppBuilderResourceCarrier;
  readonly customElementViewForm?: AppBuilderCustomElementViewForm;
  readonly appStateOwnership?: AppBuilderAppStateOwnershipMode;
  readonly localStatePolicies?: readonly AppBuilderLocalStatePolicy[];
  readonly domainModeling?: AppBuilderDomainModelingMode;
  readonly routerAdmission?: AppBuilderRouterAdmissionPolicy;
  readonly areaNavigationPolicies?: readonly AppBuilderAreaNavigationPolicy[];
  readonly bindingPolicies?: readonly AppBuilderBindingPolicy[];
  readonly packageCapabilities?: readonly AppBuilderPackageCapability[];
  readonly customElementDomEncapsulation?: AppBuilderCustomElementDomEncapsulationMode;
  readonly appStylePolicies?: readonly AppBuilderAppStylePolicy[];
  readonly customElementStylePolicies?: readonly AppBuilderCustomElementStylePolicy[];
}

/** Aurelia-specific choice descriptor consumed by menu filtering and future lowering. */
export interface AppBuilderAureliaLoweringChoiceDescriptor {
  readonly id: AppBuilderAureliaLoweringChoiceId;
  readonly axis: AppBuilderAureliaLoweringAxis;
  readonly title: string;
  readonly summary: string;
  readonly selection: AppBuilderAureliaLoweringSelection;
}

/** Lowering values one concrete source generator can truthfully emit; undefined means the axis is unconstrained. */
export interface AppBuilderAureliaLoweringSupport {
  readonly appConventionPolicies?: readonly AppBuilderConventionPolicy[];
  readonly resourceKinds?: readonly AppBuilderResourceKind[];
  readonly resourceCarriers?: readonly AppBuilderResourceCarrier[];
  readonly customElementViewForms?: readonly AppBuilderCustomElementViewForm[];
  readonly appStateOwnershipModes?: readonly AppBuilderAppStateOwnershipMode[];
  readonly localStatePolicies?: readonly AppBuilderLocalStatePolicy[];
  readonly domainModelingModes?: readonly AppBuilderDomainModelingMode[];
  readonly routerAdmissionPolicies?: readonly AppBuilderRouterAdmissionPolicy[];
  readonly areaNavigationPolicies?: readonly AppBuilderAreaNavigationPolicy[];
  readonly bindingPolicies?: readonly AppBuilderBindingPolicy[];
  readonly packageCapabilities?: readonly AppBuilderPackageCapability[];
  readonly customElementDomEncapsulationModes?: readonly AppBuilderCustomElementDomEncapsulationMode[];
  readonly appStylePolicies?: readonly AppBuilderAppStylePolicy[];
  readonly customElementStylePolicies?: readonly AppBuilderCustomElementStylePolicy[];
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
    if (selection.resourceKind != null) {
      merged.resourceKind = selection.resourceKind;
    }
    if (selection.resourceCarrier != null) {
      merged.resourceCarrier = selection.resourceCarrier;
    }
    if (selection.customElementViewForm != null) {
      merged.customElementViewForm = selection.customElementViewForm;
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
    if (selection.customElementDomEncapsulation != null) {
      merged.customElementDomEncapsulation = selection.customElementDomEncapsulation;
    }
    merged.localStatePolicies = appendUniqueValues(merged.localStatePolicies, selection.localStatePolicies);
    merged.areaNavigationPolicies = appendUniqueValues(merged.areaNavigationPolicies, selection.areaNavigationPolicies);
    merged.bindingPolicies = appendUniqueValues(merged.bindingPolicies, selection.bindingPolicies);
    merged.packageCapabilities = appendUniqueValues(merged.packageCapabilities, selection.packageCapabilities);
    merged.appStylePolicies = appendUniqueValues(merged.appStylePolicies, selection.appStylePolicies);
    merged.customElementStylePolicies = appendUniqueValues(merged.customElementStylePolicies, selection.customElementStylePolicies);
  }
  return merged;
}

/** Return true when the candidate selection includes every axis/value required by the desired selection. */
export function appBuilderAureliaLoweringSelectionSatisfies(
  candidate: AppBuilderAureliaLoweringSelection,
  desired: AppBuilderAureliaLoweringSelection,
): boolean {
  return scalarMatches(candidate.appConventionPolicy, desired.appConventionPolicy)
    && scalarMatches(candidate.resourceKind, desired.resourceKind)
    && scalarMatches(candidate.resourceCarrier, desired.resourceCarrier)
    && scalarMatches(candidate.customElementViewForm, desired.customElementViewForm)
    && scalarMatches(candidate.appStateOwnership, desired.appStateOwnership)
    && scalarMatches(candidate.domainModeling, desired.domainModeling)
    && scalarMatches(candidate.routerAdmission, desired.routerAdmission)
    && scalarMatches(candidate.customElementDomEncapsulation, desired.customElementDomEncapsulation)
    && includesAll(candidate.localStatePolicies, desired.localStatePolicies)
    && includesAll(candidate.areaNavigationPolicies, desired.areaNavigationPolicies)
    && includesAll(candidate.bindingPolicies, desired.bindingPolicies)
    && includesAll(candidate.packageCapabilities, desired.packageCapabilities)
    && includesAll(candidate.appStylePolicies, desired.appStylePolicies)
    && includesAll(candidate.customElementStylePolicies, desired.customElementStylePolicies);
}

/** Return selected lowering choice ids blocked by source support or by contradictory source-policy choices. */
export function appBuilderBlockedAureliaLoweringChoiceIds(
  selection: AppBuilderAureliaLoweringSelection,
  support: AppBuilderAureliaLoweringSupport,
): readonly AppBuilderAureliaLoweringChoiceId[] {
  const blocked: AppBuilderAureliaLoweringChoiceId[] = [];
  appendBlockedScalar(blocked, selection.appConventionPolicy, support.appConventionPolicies);
  appendBlockedScalar(blocked, selection.resourceKind, support.resourceKinds);
  appendBlockedScalar(blocked, selection.resourceCarrier, support.resourceCarriers);
  appendBlockedScalar(blocked, selection.customElementViewForm, support.customElementViewForms);
  appendBlockedScalar(blocked, selection.appStateOwnership, support.appStateOwnershipModes);
  appendBlockedScalar(blocked, selection.domainModeling, support.domainModelingModes);
  appendBlockedScalar(blocked, selection.routerAdmission, support.routerAdmissionPolicies);
  appendBlockedScalar(blocked, selection.customElementDomEncapsulation, support.customElementDomEncapsulationModes);
  appendBlockedValues(blocked, selection.localStatePolicies, support.localStatePolicies);
  appendBlockedValues(blocked, selection.areaNavigationPolicies, support.areaNavigationPolicies);
  appendBlockedValues(blocked, selection.bindingPolicies, support.bindingPolicies);
  appendBlockedValues(blocked, selection.packageCapabilities, support.packageCapabilities);
  appendBlockedValues(blocked, selection.appStylePolicies, support.appStylePolicies);
  appendBlockedValues(blocked, selection.customElementStylePolicies, support.customElementStylePolicies);
  appendInconsistentAureliaLoweringChoices(blocked, selection);
  return appendUniqueValues(undefined, blocked) ?? [];
}

/** Return true when a source generator can emit every selected lowering choice without silent downgrades. */
export function appBuilderAureliaLoweringSelectionIsSupported(
  selection: AppBuilderAureliaLoweringSelection,
  support: AppBuilderAureliaLoweringSupport,
): boolean {
  return appBuilderBlockedAureliaLoweringChoiceIds(selection, support).length === 0;
}

/** Keep only app semantics that should select a pattern composition rather than a source layout. */
export function appBuilderSemanticAureliaLoweringSelection(
  selection: AppBuilderAureliaLoweringSelection,
): AppBuilderAureliaLoweringSelection {
  return {
    appStateOwnership: selection.appStateOwnership,
    localStatePolicies: selection.localStatePolicies,
    domainModeling: selection.domainModeling,
    routerAdmission: selection.routerAdmission,
    areaNavigationPolicies: selection.areaNavigationPolicies,
    bindingPolicies: selection.bindingPolicies,
    packageCapabilities: selection.packageCapabilities,
  };
}

/** Flatten a typed lowering selection into stable choice IDs for menu previews and manifests. */
export function appBuilderAureliaLoweringChoiceIds(
  selection: AppBuilderAureliaLoweringSelection,
): readonly AppBuilderAureliaLoweringChoiceId[] {
  const ids: AppBuilderAureliaLoweringChoiceId[] = [];
  appendDefined(ids, selection.appConventionPolicy);
  appendDefined(ids, selection.resourceKind);
  appendDefined(ids, selection.resourceCarrier);
  appendDefined(ids, selection.customElementViewForm);
  appendDefined(ids, selection.appStateOwnership);
  appendValues(ids, selection.localStatePolicies);
  appendDefined(ids, selection.domainModeling);
  appendDefined(ids, selection.routerAdmission);
  appendValues(ids, selection.areaNavigationPolicies);
  appendValues(ids, selection.bindingPolicies);
  appendValues(ids, selection.packageCapabilities);
  appendDefined(ids, selection.customElementDomEncapsulation);
  appendValues(ids, selection.appStylePolicies);
  appendValues(ids, selection.customElementStylePolicies);
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

function appendBlockedScalar<TValue extends AppBuilderAureliaLoweringChoiceId>(
  blocked: AppBuilderAureliaLoweringChoiceId[],
  selected: TValue | undefined,
  supported: readonly TValue[] | undefined,
): void {
  if (selected !== undefined && supported !== undefined && !supported.includes(selected)) {
    blocked.push(selected);
  }
}

function appendBlockedValues<TValue extends AppBuilderAureliaLoweringChoiceId>(
  blocked: AppBuilderAureliaLoweringChoiceId[],
  selected: readonly TValue[] | undefined,
  supported: readonly TValue[] | undefined,
): void {
  if (selected == null || supported === undefined) {
    return;
  }
  for (const value of selected) {
    if (!supported.includes(value)) {
      blocked.push(value);
    }
  }
}

function appendInconsistentAureliaLoweringChoices(
  blocked: AppBuilderAureliaLoweringChoiceId[],
  selection: AppBuilderAureliaLoweringSelection,
): void {
  if (
    selection.appConventionPolicy === AppBuilderConventionPolicy.ExplicitResourceDeclarations
    && selection.resourceCarrier === AppBuilderResourceCarrier.Convention
  ) {
    blocked.push(AppBuilderConventionPolicy.ExplicitResourceDeclarations, AppBuilderResourceCarrier.Convention);
  }
}
