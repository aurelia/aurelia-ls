/**
 * Authoring operation ontology.
 *
 * This is the stable vocabulary for AI-assisted app creation. Concrete generators and source edits should point into
 * these descriptors instead of inventing one-off operation names or template-shaped shortcuts.
 */

export type AuthoringOperationAction =
  /** Add a new project, source, resource, or semantic structure. */
  | 'create'
  /** Wire two existing semantic/source structures together. */
  | 'connect'
  /** Change app/package/framework configuration without primarily creating a resource. */
  | 'configure'
  /** Change an existing source or semantic structure in place. */
  | 'modify'
  /** Remove an existing source or semantic structure. */
  | 'remove'
  /** Reopen or inspect the app to compare observed facts with expected effects. */
  | 'verify'
  /** Produce follow-up operations from open seams, diagnostics, or verification failures. */
  | 'repair'
  /** Convert an existing representation to another supported representation. */
  | 'migrate';

export type AuthoringTargetKind =
  /** Workspace-level project root or multi-package boundary. */
  | 'workspace'
  /** Package manifest and dependency/script metadata. */
  | 'package-manifest'
  /** Build tool, bundler, or dev-server configuration. */
  | 'build-tool'
  /** Source folders, placement policy, and project file layout. */
  | 'folder-structure'
  /** Startup module that constructs and starts the Aurelia app. */
  | 'entrypoint'
  /** Root component selected by the startup module. */
  | 'app-root'
  /** General component role before distinguishing Aurelia resource kind. */
  | 'component'
  /** Component template asset or inline template body. */
  | 'template'
  /** Stylesheet, style asset, or style ownership policy. */
  | 'style'
  /** Aurelia custom element resource. */
  | 'custom-element'
  /** Aurelia custom attribute resource. */
  | 'custom-attribute'
  /** Aurelia template-controller resource that owns synthetic view semantics. */
  | 'template-controller'
  /** Aurelia value converter resource. */
  | 'value-converter'
  /** Aurelia binding behavior resource. */
  | 'binding-behavior'
  /** Aurelia binding command extension point. */
  | 'binding-command'
  /** Aurelia attribute pattern extension point. */
  | 'attribute-pattern'
  /** Injectable service, repository, use-case class, or integration boundary. */
  | 'service'
  /** Plain domain entity, aggregate, value object, or app-owned model class. */
  | 'domain-model'
  /** Container registration, resolver, or DI key wiring. */
  | 'di-registration'
  /** Durable state/domain model owned outside a view-model instance. */
  | 'state-model'
  /** Backend/platform/client adapter boundary. */
  | 'server-integration'
  /** Framework or third-party Aurelia plugin/package surface. */
  | 'plugin'
  /** Router configuration/admission surface. */
  | 'router'
  /** Route config, route tree node, or navigation endpoint. */
  | 'route'
  /** Authentication/session/provider surface. */
  | 'auth'
  /** Authorization policy, guard, permission, or protected access surface. */
  | 'access-policy'
  /** Route lifecycle or validation hook. */
  | 'route-hook'
  /** Styling/theme/component-library policy surface. */
  | 'design-system'
  /** Template binding/event/ref/control-flow expression surface. */
  | 'template-binding'
  /** Whole reopened app semantics, usually for verification or repair. */
  | 'semantic-app';

export type AuthoringEvidenceAuthority =
  /** Evidence came directly from authored project source or source admission. */
  | 'source'
  /** Evidence came from semantic-runtime emulation of Aurelia framework behavior. */
  | 'framework-emulated'
  /** Evidence came from TypeScript checker facts rather than executed JavaScript. */
  | 'type-checker'
  /** Evidence came from a semantic-runtime projection assembled from lower-level products. */
  | 'generated-projection'
  /** Evidence came from external docs/apps/tests used as pressure, not canonical app truth. */
  | 'corpus-pressure'
  /** Evidence came from an explicit human/product policy declaration. */
  | 'user-policy'
  /** Evidence is intentionally missing or unresolved. */
  | 'open';

export type AuthoringConfidence =
  /** The value is directly observed or otherwise unambiguous in current facts. */
  | 'certain'
  /** The value is supported by real facts but still needs stronger grounding for edits. */
  | 'likely'
  /** The value is a weak reading, usually from naming, folder shape, or partial type facts. */
  | 'weak'
  /** The value competes with another visible value on the same axis. */
  | 'conflicting';

export type AuthoringPolicyState =
  /** Policy or taste was inferred from the current app facts. */
  | 'inferred'
  /** Policy or taste was declared by a user, profile, recipe, or host. */
  | 'declared'
  /** Policy or taste is proposed by the authoring layer but not yet accepted. */
  | 'proposed'
  /** No defensible policy value is currently available. */
  | 'unavailable';

export type AuthoringSupportState =
  /** Existing app facts can be observed, but authoring or verification may still be absent. */
  | 'observable'
  /** A semantic plan can be produced without claiming concrete source edits are solved. */
  | 'plannable'
  /** Concrete source edits are modeled for this surface. */
  | 'editable'
  /** Reopened app facts can be compared against expected effects for this surface. */
  | 'verifiable'
  /** Failures can be turned into follow-up repair operations. */
  | 'repairable'
  /** Some required substrate exists, but the product cannot safely promise the full surface. */
  | 'partial'
  /** The surface is not yet modeled enough to guide authoring. */
  | 'open';

/** Rank support states for minimum-state comparisons without duplicating policy in API/query code. */
export function authoringSupportStateRank(
  state: AuthoringSupportState | `${AuthoringSupportState}`,
): number {
  switch (state) {
    case 'open':
      return 0;
    case 'partial':
      return 1;
    case 'observable':
      return 2;
    case 'plannable':
      return 3;
    case 'editable':
      return 4;
    case 'verifiable':
      return 5;
    case 'repairable':
      return 6;
  }
}

export type AuthoringOpenReasonKind =
  /** No semantic facts currently justify selecting a value on this taste axis. */
  | 'taste-axis-unobserved'
  /** Multiple observed values on one axis appear to represent competing authoring choices. */
  | 'taste-axis-conflict'
  /** The semantic-runtime can see the area but does not yet publish the fact shape required by the authoring API. */
  | 'semantic-fact-partial'
  /** The operational API lacks a read surface needed for the authoring step or its verification. */
  | 'api-query-missing'
  /** The source edit/generator operation itself is not modeled yet. */
  | 'edit-operation-missing'
  /** The expected-effect vocabulary is too weak to verify the authored result after reopening. */
  | 'verification-effect-missing'
  /** The semantic-runtime model is not yet grounded against the corresponding Aurelia framework runtime shape. */
  | 'framework-grounding-missing'
  /** Package/plugin API discovery is not yet modeled deeply enough to author against transitive plugin surfaces. */
  | 'plugin-api-discovery-open'
  /** TypeChecker-visible app surface is too broad, weak, or unknown for confident authoring. */
  | 'weak-type-surface'
  /** The fact depends on runtime values that the static app-world cannot currently enumerate. */
  | 'runtime-dependent-boundary'
  /** The concept is a future product direction, not a specified or currently observable authoring shape. */
  | 'future-product-horizon'
  /** Source formatting, placement, or project edit policy is not explicit enough for automated edits. */
  | 'source-edit-policy-open'
  /** Package manager, build-tool, or script policy is not explicit enough for automated project edits. */
  | 'package-tooling-policy-open'
  /** Generated fixture reopen checks do not yet carry enough expected semantic effects. */
  | 'fixture-effect-model-open';

export type AuthoringTasteAxisLayer =
  /** A human/product preference that can guide future edits even when the current app does not prove it. */
  | 'primitive-policy'
  /** A fact-shaped pattern that can be read directly from source/framework/type-system projections. */
  | 'observed-shape'
  /** A higher-level reading derived from multiple facts and therefore weaker than direct observation. */
  | 'derived-reading';

export type AuthoringTasteAxisKey =
  /** How Aurelia resource metadata is represented at the declaration site. */
  | 'resource-declaration-mode'
  /** How resources and framework capabilities become available to the app world. */
  | 'resource-admission-mode'
  /** Where durable domain/application state lives relative to view-models and DI. */
  | 'state-ownership'
  /** How components expose selection, input, output, and attribute forwarding boundaries. */
  | 'component-interface'
  /** How templates cross from component view-models into state, domain objects, and adapter members. */
  | 'template-model-access'
  /** How route configuration, routeable components, and viewports own navigation structure. */
  | 'navigation-ownership'
  /** Where component template markup lives and how it is discovered. */
  | 'template-source-ownership'
  /** Which template rendering boundary or composition mechanism is visible. */
  | 'template-rendering-boundary'
  /** How forms and controls represent value channels. */
  | 'form-value-channel'
  /** How validation ownership is represented for form-like surfaces. */
  | 'validation-ownership'
  /** How form-like bindings are shaped by TypeChecker-visible surfaces. */
  | 'form-type-surface'
  /** Where stylesheet assets and style-system dependencies are owned. */
  | 'style-resource-ownership'
  /** How dynamic class/style state is expressed in templates. */
  | 'style-binding-model'
  /** How trustworthy TypeScript-visible surfaces are for completion, diagnostics, and edits. */
  | 'type-surface-trust'
  /** How package/workspace shape constrains app-building choices. */
  | 'package-topology'
  /** How build, dev-server, and asset-pipeline tooling responsibility is chosen. */
  | 'build-tool-profile'
  /** How source folders and feature/domain boundaries shape app-building choices. */
  | 'source-layout'
  /** How compactly and reliably an AI agent can understand the app through source plus semantic queries. */
  | 'agent-legibility';

export type AuthoringTasteValueKey =
  /** Resource metadata is authored with explicit Aurelia decorators such as @customElement or @bindable. */
  | 'decorator-resource-declaration'
  /** Resource metadata is authored with static class fields/properties instead of decorators. */
  | 'static-resource-declaration'
  /** Resource metadata is authored through explicit definition objects or resource factory calls. */
  | 'definition-object-resource-declaration'
  /**
   * Resource metadata is implied by the currently specified legacy conventions plugin rules.
   * A future "modern convention" declaration lane is not active ontology until its semantics are specified.
   */
  | 'legacy-convention-resource-declaration'
  /** The app has resources, but semantic-runtime cannot yet identify the declaration mechanism. */
  | 'declaration-mechanism-unobserved'
  /** Resources are admitted by direct registration calls or registration objects. */
  | 'direct-registration-admission'
  /** Resources are admitted through framework or application bundle composition. */
  | 'bundle-registration-admission'
  /** Resources are admitted through plugin configuration APIs. */
  | 'plugin-registration-admission'
  /** A resource declares dependencies that admit additional local resources into its compiler world. */
  | 'dependency-array-admission'
  /** Resources are admitted globally by app-world registration facts instead of component dependency boundaries. */
  | 'global-resource-admission'
  /** Resources are admitted by source/file conventions rather than explicit registration or dependency declarations. */
  | 'convention-discovery-admission'
  /** Durable state is stored directly on view-model instances. */
  | 'viewmodel-local-state'
  /** Durable state is stored in injectable state/context classes. */
  | 'di-owned-state-class'
  /** Durable state and side effects are mediated by injectable services/repositories/use-case classes. */
  | 'di-owned-service-layer'
  /** App state is propagated through component bindables across multiple component boundaries. */
  | 'bindable-propagated-state'
  /** Selection/current-record state is primarily carried by route parameters. */
  | 'route-parameter-selected-state'
  /** Durable state is primarily owned by an external backend/platform boundary. */
  | 'external-service-backed-state'
  /** App state is mediated through the @aurelia/state plugin. */
  | 'aurelia-state-store'
  /** Components expose at least one bindable/public input. */
  | 'public-inputs-present'
  /** Component inputs look like scalar identifiers, usually supporting lazy lookup by state/service layers. */
  | 'scalar-id-inputs'
  /** Component inputs carry object-shaped values. Requires deeper type evidence before treating as leaf-only. */
  | 'object-inputs'
  /** Component inputs carry callback functions. Often a pressure signal outside true leaf/user-control cases. */
  | 'callback-function-inputs'
  /** Components expose output/event semantics rather than accepting callbacks as inputs. */
  | 'event-output-interface'
  /** Components forward arbitrary captured attributes to an inner element or control. */
  | 'captured-attribute-forwarding'
  /** Components expose no public bindable interface in current facts. */
  | 'no-public-component-interface'
  /** Templates bind directly through DI-owned state or domain object members instead of generated field facades. */
  | 'direct-state-domain-template-binding'
  /** Template locals or controller scopes adapt IDs/nullable lookups near the binding site. */
  | 'template-local-domain-adaptation'
  /** View-model getters/setters adapt real route, host, component, or view-specific concerns. */
  | 'meaningful-viewmodel-adaptation'
  /** Plain source-backed accessor getters are observable through ObserverLocator ComputedObserver semantics. */
  | 'source-backed-getter-observation'
  /** View-model accessors appear to only shorten another member path and may be removable boilerplate. */
  | 'one-hop-forwarding-accessor-pressure'
  /** No router facts are visible for the opened app. */
  | 'no-router'
  /** Route configuration is visible as static/data-shaped config. */
  | 'static-route-config'
  /** Route configuration is attached by route decorators. */
  | 'decorator-route-config'
  /** Route configuration is created through Route.configure(...) calls. */
  | 'configure-call-route-config'
  /** Route configuration is supplied by static class-side route metadata. */
  | 'class-static-default-route-config'
  /** Nested child routes are authored through a route config `routes` property. */
  | 'child-routes-property-route-config'
  /** Route configuration depends on dynamic/runtime values the static product may only partially enumerate. */
  | 'dynamic-route-config'
  /** Navigation structure relies on explicit viewport layout or nested viewport agent structure. */
  | 'viewport-layout-navigation'
  /** Template markup lives in a separate HTML template file with a source address. */
  | 'external-template-file'
  /** Template markup is authored inline in the component source. */
  | 'inline-template-source'
  /** Template markup is discovered through naming/file conventions. */
  | 'convention-template-file'
  /** Template ownership includes Shadow DOM semantics. */
  | 'shadow-dom-template'
  /** Template ownership uses ordinary light DOM rendering semantics. */
  | 'light-dom-template'
  /** Template composition uses built-in or custom template controllers that create child scopes/views. */
  | 'template-controller-composition'
  /** Template composition uses runtime dynamic component composition such as AuCompose. */
  | 'dynamic-component-composition'
  /** Form/control values flow through native value observers. */
  | 'native-control-value-binding'
  /** Checkbox/radio-like model state flows through checked/model binding semantics. */
  | 'checked-model-binding'
  /** Select controls use model/value matching semantics. */
  | 'select-model-binding'
  /** Checked/select controls delegate value comparison to an app-authored matcher binding. */
  | 'custom-matcher-comparison'
  /** Form values flow through custom control/component APIs instead of native element observers. */
  | 'custom-control-binding'
  /** Validation is mediated by a validation controller/plugin surface. */
  | 'validation-controller-usage'
  /** Validation is authored manually in view-model/services without plugin-level semantics. */
  | 'manual-validation-usage'
  /** Form-like bindings have weak or open TypeChecker owner/value surfaces. */
  | 'weak-form-type-surface'
  /** Form-like bindings have specific TypeChecker owner/value surfaces. */
  | 'strict-form-type-surface'
  /** Styles are owned by global stylesheets. */
  | 'global-stylesheet'
  /** Styles are owned near a component, usually as colocated CSS. */
  | 'component-stylesheet'
  /** Styles are scoped by Shadow DOM. */
  | 'shadow-dom-styles'
  /** Dynamic class tokens are authored as a whole class attribute value, such as class.bind or interpolation. */
  | 'class-token-binding'
  /** Dynamic class state is authored as one or more per-class toggles, such as active.class. */
  | 'class-toggle-binding'
  /** Dynamic CSS declarations are authored as a whole style attribute value, such as style.bind or interpolation. */
  | 'style-rule-binding'
  /** Dynamic style state is authored as one or more per-property style bindings, such as color.style. */
  | 'style-property-binding'
  /** Styles are mediated through CSS module tooling. */
  | 'css-module-style'
  /** Styles/components rely on an external CSS framework or design-system package. */
  | 'external-css-framework'
  /** TypeChecker-visible binding/member surfaces are specific enough for confident authoring. */
  | 'strict-type-surface'
  /** TypeChecker-visible binding/member surfaces contain any/unknown or similarly weak carriers. */
  | 'any-or-unknown-type-surface'
  /** TypeChecker-visible surfaces depend on index signatures rather than declared members. */
  | 'index-signature-type-surface'
  /** Type surfaces come from generated declarations or generated source. */
  | 'generated-type-surface'
  /** Authoring target is JavaScript or otherwise lacks TypeScript source surfaces. */
  | 'javascript-source-surface'
  /** Source admission/project shape identifies the selected project as one app package/application shell. */
  | 'single-app-package'
  /** The workspace contains multiple packages/apps/libraries that shape authoring scope. */
  | 'workspace-monorepo'
  /** The project is a resource/plugin library rather than an app root. */
  | 'resource-library-package'
  /** The host or user must choose the build/dev-server profile before runnable app emission. */
  | 'host-selected-build-tool'
  /** Project tooling currently covers TypeScript/module declarations without a modeled bundler profile. */
  | 'typecheck-only-tooling'
  /** Project tooling includes a recognizable bundler or dev-server configuration file. */
  | 'bundler-config-tooling'
  /** App code appears organized by feature folders. */
  | 'feature-folder-topology'
  /** App code appears organized by bounded contexts/domains. */
  | 'bounded-context-topology'
  /** Semantic facts are compact and closed enough for an agent to orient quickly. */
  | 'compact-semantic-facts'
  /** Source boundaries are explicit enough to understand with relatively few semantic queries. */
  | 'source-legible-boundaries'
  /** Open seams or partial facts are prominent enough to shape authoring risk. */
  | 'semantic-gaps-present'
  /** The app mixes competing patterns on one axis and may need local policy or cleanup suggestions. */
  | 'mixed-pattern-pressure';

export type AuthoringStyleKey =
  /** Prefer explicit Aurelia decorators for resource declaration. */
  | 'native-decorators'
  /** Prefer framework-supported source/file conventions when semantic-runtime can prove them. */
  | 'conventions'
  /** Prefer explicit resource and service registration at app/configuration boundaries. */
  | 'explicit-registration'
  /** Mix supported styles locally, with each choice justified by context rather than a global default. */
  | 'hybrid';

export type AuthoringAmbiguityResolution =
  /** The planner may choose a default when no stronger local policy exists. */
  | 'defaultable'
  /** The planner should ask the user or host because this is genuine product taste. */
  | 'ask-user'
  /** The planner needs opened-app facts before choosing. */
  | 'requires-app-analysis'
  /** The planner needs a capability/verification probe before choosing. */
  | 'requires-capability-probe';

export class AuthoringOperationFamily<TKey extends string = string> {
  readonly kind = 'authoring-operation-family' as const;

  constructor(
    readonly key: TKey,
    readonly title: string,
    readonly summary: string,
  ) {}
}

export class AuthoringTasteAxisDescriptor<TKey extends AuthoringTasteAxisKey = AuthoringTasteAxisKey> {
  readonly kind = 'authoring-taste-axis-descriptor' as const;

  constructor(
    readonly key: TKey,
    readonly title: string,
    /** Dominant layer for this axis; individual values carry their own more precise layer. */
    readonly layer: AuthoringTasteAxisLayer,
    readonly summary: string,
    readonly commonValues: readonly AuthoringTasteValueKey[],
  ) {}
}

export class AuthoringTasteValueDescriptor<TKey extends AuthoringTasteValueKey = AuthoringTasteValueKey> {
  readonly kind = 'authoring-taste-value-descriptor' as const;

  constructor(
    readonly key: TKey,
    readonly axisKey: AuthoringTasteAxisKey,
    readonly layer: AuthoringTasteAxisLayer,
    readonly summary: string,
  ) {}
}

/** A profile-, user-, or recipe-owned preference that can influence authoring shape without becoming semantic truth. */
export class AuthoringPreference {
  readonly kind = 'authoring-preference' as const;

  constructor(
    readonly axisKey: AuthoringTasteAxisKey,
    readonly valueKey: AuthoringTasteValueKey,
  ) {}
}

export const AuthoringTasteAxes = {
  ResourceDeclarationMode: new AuthoringTasteAxisDescriptor(
    'resource-declaration-mode',
    'Resource Declaration Mode',
    'observed-shape',
    'How Aurelia resource metadata is authored in source.',
    ['decorator-resource-declaration', 'static-resource-declaration', 'definition-object-resource-declaration', 'legacy-convention-resource-declaration', 'declaration-mechanism-unobserved'],
  ),
  ResourceAdmissionMode: new AuthoringTasteAxisDescriptor(
    'resource-admission-mode',
    'Resource Admission Mode',
    'observed-shape',
    'How resources, plugins, and framework capabilities enter the app world.',
    ['direct-registration-admission', 'bundle-registration-admission', 'plugin-registration-admission', 'dependency-array-admission', 'global-resource-admission', 'convention-discovery-admission'],
  ),
  StateOwnership: new AuthoringTasteAxisDescriptor(
    'state-ownership',
    'State Ownership',
    'primitive-policy',
    'Where durable app state lives and how view-models read or mutate it.',
    ['viewmodel-local-state', 'di-owned-state-class', 'di-owned-service-layer', 'bindable-propagated-state', 'route-parameter-selected-state', 'external-service-backed-state', 'aurelia-state-store'],
  ),
  ComponentInterface: new AuthoringTasteAxisDescriptor(
    'component-interface',
    'Component Interface',
    'primitive-policy',
    'How components expose public inputs, outputs, selection handles, and forwarded attributes.',
    ['public-inputs-present', 'scalar-id-inputs', 'object-inputs', 'callback-function-inputs', 'event-output-interface', 'captured-attribute-forwarding', 'no-public-component-interface'],
  ),
  TemplateModelAccess: new AuthoringTasteAxisDescriptor(
    'template-model-access',
    'Template Model Access',
    'primitive-policy',
    'How templates reach state/domain models and when view-model members are real adapters instead of boilerplate.',
    [
      'direct-state-domain-template-binding',
      'template-local-domain-adaptation',
      'meaningful-viewmodel-adaptation',
      'source-backed-getter-observation',
      'one-hop-forwarding-accessor-pressure',
    ],
  ),
  NavigationOwnership: new AuthoringTasteAxisDescriptor(
    'navigation-ownership',
    'Navigation Ownership',
    'observed-shape',
    'How route configuration, routeable components, and viewport layout are represented.',
    [
      'no-router',
      'static-route-config',
      'decorator-route-config',
      'configure-call-route-config',
      'class-static-default-route-config',
      'child-routes-property-route-config',
      'dynamic-route-config',
      'viewport-layout-navigation',
    ],
  ),
  TemplateSourceOwnership: new AuthoringTasteAxisDescriptor(
    'template-source-ownership',
    'Template Source Ownership',
    'observed-shape',
    'Where component template markup lives and how it is discovered.',
    ['external-template-file', 'inline-template-source', 'convention-template-file'],
  ),
  TemplateRenderingBoundary: new AuthoringTasteAxisDescriptor(
    'template-rendering-boundary',
    'Template Rendering Boundary',
    'observed-shape',
    'Which rendering boundary or template-composition mechanism is visible.',
    ['shadow-dom-template', 'light-dom-template', 'template-controller-composition', 'dynamic-component-composition'],
  ),
  FormValueChannel: new AuthoringTasteAxisDescriptor(
    'form-value-channel',
    'Form Value Channel',
    'observed-shape',
    'How controls and form-like components represent bound values.',
    [
      'native-control-value-binding',
      'checked-model-binding',
      'select-model-binding',
      'custom-matcher-comparison',
      'custom-control-binding',
    ],
  ),
  ValidationOwnership: new AuthoringTasteAxisDescriptor(
    'validation-ownership',
    'Validation Ownership',
    'observed-shape',
    'How validation is represented for form-like surfaces.',
    ['validation-controller-usage', 'manual-validation-usage'],
  ),
  FormTypeSurface: new AuthoringTasteAxisDescriptor(
    'form-type-surface',
    'Form Type Surface',
    'derived-reading',
    'How trustworthy TypeChecker-visible owner/value surfaces are for form-like bindings.',
    ['strict-form-type-surface', 'weak-form-type-surface'],
  ),
  StyleResourceOwnership: new AuthoringTasteAxisDescriptor(
    'style-resource-ownership',
    'Style Resource Ownership',
    'observed-shape',
    'Where stylesheet assets and style-system dependencies are owned.',
    ['global-stylesheet', 'component-stylesheet', 'shadow-dom-styles', 'css-module-style', 'external-css-framework'],
  ),
  StyleBindingModel: new AuthoringTasteAxisDescriptor(
    'style-binding-model',
    'Style Binding Model',
    'observed-shape',
    'How dynamic class/style state is expressed in templates.',
    ['class-token-binding', 'class-toggle-binding', 'style-rule-binding', 'style-property-binding'],
  ),
  TypeSurfaceTrust: new AuthoringTasteAxisDescriptor(
    'type-surface-trust',
    'Type Surface Trust',
    'derived-reading',
    'How much TypeScript surface area can be trusted for authoring, completion, and diagnostics.',
    ['strict-type-surface', 'any-or-unknown-type-surface', 'index-signature-type-surface', 'generated-type-surface', 'javascript-source-surface'],
  ),
  PackageTopology: new AuthoringTasteAxisDescriptor(
    'package-topology',
    'Package Topology',
    'observed-shape',
    'How package scale and workspace boundaries constrain authoring recommendations.',
    ['single-app-package', 'workspace-monorepo', 'resource-library-package'],
  ),
  BuildToolProfile: new AuthoringTasteAxisDescriptor(
    'build-tool-profile',
    'Build Tool Profile',
    'primitive-policy',
    'How build, dev-server, and asset-pipeline responsibility is chosen for generated or edited apps.',
    ['host-selected-build-tool', 'typecheck-only-tooling', 'bundler-config-tooling'],
  ),
  SourceLayout: new AuthoringTasteAxisDescriptor(
    'source-layout',
    'Source Layout',
    'derived-reading',
    'How source folders, features, and domain boundaries constrain authoring recommendations.',
    ['feature-folder-topology', 'bounded-context-topology'],
  ),
  AgentLegibility: new AuthoringTasteAxisDescriptor(
    'agent-legibility',
    'Agent Legibility',
    'derived-reading',
    'How easy the app is for an agent to understand through code and semantic inquiries together.',
    ['compact-semantic-facts', 'source-legible-boundaries', 'semantic-gaps-present', 'mixed-pattern-pressure'],
  ),
} as const;

export const AuthoringTasteValueDescriptors = {
  DecoratorResourceDeclaration: new AuthoringTasteValueDescriptor(
    'decorator-resource-declaration',
    'resource-declaration-mode',
    'observed-shape',
    'Source declares Aurelia resource metadata with decorators.',
  ),
  StaticResourceDeclaration: new AuthoringTasteValueDescriptor(
    'static-resource-declaration',
    'resource-declaration-mode',
    'observed-shape',
    'Source declares Aurelia resource metadata with static class-side metadata.',
  ),
  DefinitionObjectResourceDeclaration: new AuthoringTasteValueDescriptor(
    'definition-object-resource-declaration',
    'resource-declaration-mode',
    'observed-shape',
    'Source declares Aurelia resource metadata with definition objects or factory calls.',
  ),
  LegacyConventionResourceDeclaration: new AuthoringTasteValueDescriptor(
    'legacy-convention-resource-declaration',
    'resource-declaration-mode',
    'observed-shape',
    'Resource metadata is recovered from the currently specified legacy conventions plugin rules.',
  ),
  DeclarationMechanismUnobserved: new AuthoringTasteValueDescriptor(
    'declaration-mechanism-unobserved',
    'resource-declaration-mode',
    'derived-reading',
    'A resource exists, but the declaration mechanism is not precise enough to guide an edit.',
  ),
  DirectRegistrationAdmission: new AuthoringTasteValueDescriptor(
    'direct-registration-admission',
    'resource-admission-mode',
    'observed-shape',
    'Resources or framework capabilities are admitted through direct registration surfaces.',
  ),
  BundleRegistrationAdmission: new AuthoringTasteValueDescriptor(
    'bundle-registration-admission',
    'resource-admission-mode',
    'observed-shape',
    'Resources or framework capabilities are admitted through framework or app bundle composition.',
  ),
  PluginRegistrationAdmission: new AuthoringTasteValueDescriptor(
    'plugin-registration-admission',
    'resource-admission-mode',
    'observed-shape',
    'Resources or framework capabilities are admitted through plugin configuration APIs.',
  ),
  DependencyArrayAdmission: new AuthoringTasteValueDescriptor(
    'dependency-array-admission',
    'resource-admission-mode',
    'observed-shape',
    'A resource dependency array makes additional resources visible to a compiler world.',
  ),
  GlobalResourceAdmission: new AuthoringTasteValueDescriptor(
    'global-resource-admission',
    'resource-admission-mode',
    'observed-shape',
    'Resource visibility is app-wide because registration/admission facts expose it outside local component dependency boundaries.',
  ),
  ConventionDiscoveryAdmission: new AuthoringTasteValueDescriptor(
    'convention-discovery-admission',
    'resource-admission-mode',
    'observed-shape',
    'Resources become visible through source or file convention discovery.',
  ),
  ViewmodelLocalState: new AuthoringTasteValueDescriptor(
    'viewmodel-local-state',
    'state-ownership',
    'observed-shape',
    'Durable state appears directly on view-model instances.',
  ),
  DiOwnedStateClass: new AuthoringTasteValueDescriptor(
    'di-owned-state-class',
    'state-ownership',
    'primitive-policy',
    'Authoring should prefer injectable state/context classes for durable app state when the app supports it.',
  ),
  DiOwnedServiceLayer: new AuthoringTasteValueDescriptor(
    'di-owned-service-layer',
    'state-ownership',
    'primitive-policy',
    'Authoring should prefer injectable services, repositories, or use-case classes for side effects and integration work.',
  ),
  BindablePropagatedState: new AuthoringTasteValueDescriptor(
    'bindable-propagated-state',
    'state-ownership',
    'observed-shape',
    'State is propagated through bindables across component boundaries.',
  ),
  RouteParameterSelectedState: new AuthoringTasteValueDescriptor(
    'route-parameter-selected-state',
    'state-ownership',
    'derived-reading',
    'Route parameters appear to carry selection/current-record state.',
  ),
  ExternalServiceBackedState: new AuthoringTasteValueDescriptor(
    'external-service-backed-state',
    'state-ownership',
    'derived-reading',
    'Durable state appears to be owned primarily by an external backend or platform boundary.',
  ),
  AureliaStateStore: new AuthoringTasteValueDescriptor(
    'aurelia-state-store',
    'state-ownership',
    'observed-shape',
    'State ownership uses the @aurelia/state plugin surface.',
  ),
  PublicInputsPresent: new AuthoringTasteValueDescriptor(
    'public-inputs-present',
    'component-interface',
    'observed-shape',
    'Component bindable or public input rows are visible.',
  ),
  ScalarIdInputs: new AuthoringTasteValueDescriptor(
    'scalar-id-inputs',
    'component-interface',
    'derived-reading',
    'Component inputs look like scalar identifiers suitable for lazy lookup by state or service layers.',
  ),
  ObjectInputs: new AuthoringTasteValueDescriptor(
    'object-inputs',
    'component-interface',
    'observed-shape',
    'Component inputs carry object-shaped values.',
  ),
  CallbackFunctionInputs: new AuthoringTasteValueDescriptor(
    'callback-function-inputs',
    'component-interface',
    'observed-shape',
    'Component inputs carry callback-shaped callable values.',
  ),
  EventOutputInterface: new AuthoringTasteValueDescriptor(
    'event-output-interface',
    'component-interface',
    'primitive-policy',
    'Authoring may prefer event/output semantics instead of callback inputs for non-leaf components.',
  ),
  CapturedAttributeForwarding: new AuthoringTasteValueDescriptor(
    'captured-attribute-forwarding',
    'component-interface',
    'observed-shape',
    'Components forward captured attributes to an inner element or control.',
  ),
  NoPublicComponentInterface: new AuthoringTasteValueDescriptor(
    'no-public-component-interface',
    'component-interface',
    'observed-shape',
    'No component public input surface is visible.',
  ),
  DirectStateDomainTemplateBinding: new AuthoringTasteValueDescriptor(
    'direct-state-domain-template-binding',
    'template-model-access',
    'primitive-policy',
    'Authoring may bind templates directly through DI-owned state or domain objects when the path is clear and typed.',
  ),
  TemplateLocalDomainAdaptation: new AuthoringTasteValueDescriptor(
    'template-local-domain-adaptation',
    'template-model-access',
    'primitive-policy',
    'Authoring may use template-local values and controller narrowing for ID-to-object or nullable-object adaptation.',
  ),
  MeaningfulViewmodelAdaptation: new AuthoringTasteValueDescriptor(
    'meaningful-viewmodel-adaptation',
    'template-model-access',
    'primitive-policy',
    'View-model accessors should represent real adaptation, projection, or host/routing handoff rather than one-hop forwarding.',
  ),
  SourceBackedGetterObservation: new AuthoringTasteValueDescriptor(
    'source-backed-getter-observation',
    'template-model-access',
    'observed-shape',
    'Binding observed-dependency rows prove ordinary source-backed accessor getters are read through the ComputedObserver path without @computed.',
  ),
  OneHopForwardingAccessorPressure: new AuthoringTasteValueDescriptor(
    'one-hop-forwarding-accessor-pressure',
    'template-model-access',
    'derived-reading',
    'A view-model accessor appears to only shorten another member path and should be reviewed before recommending it.',
  ),
  NoRouter: new AuthoringTasteValueDescriptor(
    'no-router',
    'navigation-ownership',
    'observed-shape',
    'No router facts are visible for the opened app.',
  ),
  StaticRouteConfig: new AuthoringTasteValueDescriptor(
    'static-route-config',
    'navigation-ownership',
    'observed-shape',
    'Route configuration is visible as static or data-shaped config.',
  ),
  DecoratorRouteConfig: new AuthoringTasteValueDescriptor(
    'decorator-route-config',
    'navigation-ownership',
    'observed-shape',
    'Route configuration is attached through route decorators.',
  ),
  ConfigureCallRouteConfig: new AuthoringTasteValueDescriptor(
    'configure-call-route-config',
    'navigation-ownership',
    'observed-shape',
    'Route configuration is created through Route.configure(...) calls.',
  ),
  ClassStaticDefaultRouteConfig: new AuthoringTasteValueDescriptor(
    'class-static-default-route-config',
    'navigation-ownership',
    'observed-shape',
    'Route configuration originates from static class-side route metadata.',
  ),
  ChildRoutesPropertyRouteConfig: new AuthoringTasteValueDescriptor(
    'child-routes-property-route-config',
    'navigation-ownership',
    'observed-shape',
    'Nested route configuration is authored through a route config routes property.',
  ),
  DynamicRouteConfig: new AuthoringTasteValueDescriptor(
    'dynamic-route-config',
    'navigation-ownership',
    'derived-reading',
    'Route configuration depends on runtime values the static app world can only partially enumerate.',
  ),
  ViewportLayoutNavigation: new AuthoringTasteValueDescriptor(
    'viewport-layout-navigation',
    'navigation-ownership',
    'observed-shape',
    'Navigation structure uses explicit viewport layout or nested viewport agent structure.',
  ),
  ExternalTemplateFile: new AuthoringTasteValueDescriptor(
    'external-template-file',
    'template-source-ownership',
    'observed-shape',
    'Template markup lives in a source-addressable external HTML file.',
  ),
  InlineTemplateSource: new AuthoringTasteValueDescriptor(
    'inline-template-source',
    'template-source-ownership',
    'observed-shape',
    'Template markup is authored inline in component source.',
  ),
  ConventionTemplateFile: new AuthoringTasteValueDescriptor(
    'convention-template-file',
    'template-source-ownership',
    'observed-shape',
    'Template markup is discovered through naming or file conventions.',
  ),
  ShadowDomTemplate: new AuthoringTasteValueDescriptor(
    'shadow-dom-template',
    'template-rendering-boundary',
    'observed-shape',
    'Template rendering uses Shadow DOM semantics.',
  ),
  LightDomTemplate: new AuthoringTasteValueDescriptor(
    'light-dom-template',
    'template-rendering-boundary',
    'observed-shape',
    'Template rendering uses ordinary light DOM semantics.',
  ),
  TemplateControllerComposition: new AuthoringTasteValueDescriptor(
    'template-controller-composition',
    'template-rendering-boundary',
    'observed-shape',
    'Template composition uses template controllers that create child scopes or synthetic views.',
  ),
  DynamicComponentComposition: new AuthoringTasteValueDescriptor(
    'dynamic-component-composition',
    'template-rendering-boundary',
    'observed-shape',
    'Template composition uses runtime dynamic component composition through AuCompose or equivalent composition products.',
  ),
  NativeControlValueBinding: new AuthoringTasteValueDescriptor(
    'native-control-value-binding',
    'form-value-channel',
    'observed-shape',
    'Form/control values flow through native value observer semantics.',
  ),
  CheckedModelBinding: new AuthoringTasteValueDescriptor(
    'checked-model-binding',
    'form-value-channel',
    'observed-shape',
    'Checkbox, radio, or model state flows through checked/model binding semantics.',
  ),
  SelectModelBinding: new AuthoringTasteValueDescriptor(
    'select-model-binding',
    'form-value-channel',
    'observed-shape',
    'Select controls use model/value matching semantics.',
  ),
  CustomMatcherComparison: new AuthoringTasteValueDescriptor(
    'custom-matcher-comparison',
    'form-value-channel',
    'observed-shape',
    'Checked/select controls use app-authored matcher bindings for equality instead of default identity comparison.',
  ),
  CustomControlBinding: new AuthoringTasteValueDescriptor(
    'custom-control-binding',
    'form-value-channel',
    'observed-shape',
    'Form values flow through custom control or component APIs.',
  ),
  ValidationControllerUsage: new AuthoringTasteValueDescriptor(
    'validation-controller-usage',
    'validation-ownership',
    'observed-shape',
    'Validation is mediated by a validation controller or plugin surface.',
  ),
  ManualValidationUsage: new AuthoringTasteValueDescriptor(
    'manual-validation-usage',
    'validation-ownership',
    'observed-shape',
    'Validation is authored manually in view-model or service code without plugin-level semantics.',
  ),
  WeakFormTypeSurface: new AuthoringTasteValueDescriptor(
    'weak-form-type-surface',
    'form-type-surface',
    'derived-reading',
    'Form-like bindings expose weak or open TypeChecker owner/value surfaces.',
  ),
  StrictFormTypeSurface: new AuthoringTasteValueDescriptor(
    'strict-form-type-surface',
    'form-type-surface',
    'derived-reading',
    'Form-like bindings expose specific TypeChecker owner/value surfaces.',
  ),
  GlobalStylesheet: new AuthoringTasteValueDescriptor(
    'global-stylesheet',
    'style-resource-ownership',
    'observed-shape',
    'Styles are owned by global stylesheets.',
  ),
  ComponentStylesheet: new AuthoringTasteValueDescriptor(
    'component-stylesheet',
    'style-resource-ownership',
    'observed-shape',
    'Styles are owned near a component, usually as colocated CSS.',
  ),
  ShadowDomStyles: new AuthoringTasteValueDescriptor(
    'shadow-dom-styles',
    'style-resource-ownership',
    'observed-shape',
    'Styles are scoped by Shadow DOM.',
  ),
  ClassTokenBinding: new AuthoringTasteValueDescriptor(
    'class-token-binding',
    'style-binding-model',
    'observed-shape',
    'Dynamic class state is expressed through a whole class attribute value channel.',
  ),
  ClassToggleBinding: new AuthoringTasteValueDescriptor(
    'class-toggle-binding',
    'style-binding-model',
    'observed-shape',
    'Dynamic class state is expressed through per-class toggle channels.',
  ),
  StyleRuleBinding: new AuthoringTasteValueDescriptor(
    'style-rule-binding',
    'style-binding-model',
    'observed-shape',
    'Dynamic style state is expressed through a whole style attribute rule channel.',
  ),
  StylePropertyBinding: new AuthoringTasteValueDescriptor(
    'style-property-binding',
    'style-binding-model',
    'observed-shape',
    'Dynamic style state is expressed through per-property style channels.',
  ),
  CssModuleStyle: new AuthoringTasteValueDescriptor(
    'css-module-style',
    'style-resource-ownership',
    'observed-shape',
    'Styles are mediated through CSS module tooling.',
  ),
  ExternalCssFramework: new AuthoringTasteValueDescriptor(
    'external-css-framework',
    'style-resource-ownership',
    'derived-reading',
    'Styles or components rely on an external CSS framework or design-system package.',
  ),
  StrictTypeSurface: new AuthoringTasteValueDescriptor(
    'strict-type-surface',
    'type-surface-trust',
    'derived-reading',
    'TypeChecker-visible binding and member surfaces are specific enough for confident authoring.',
  ),
  AnyOrUnknownTypeSurface: new AuthoringTasteValueDescriptor(
    'any-or-unknown-type-surface',
    'type-surface-trust',
    'derived-reading',
    'TypeChecker-visible binding and member surfaces include any, unknown, or similarly weak carriers.',
  ),
  IndexSignatureTypeSurface: new AuthoringTasteValueDescriptor(
    'index-signature-type-surface',
    'type-surface-trust',
    'derived-reading',
    'TypeChecker-visible surfaces depend on index signatures rather than declared members.',
  ),
  GeneratedTypeSurface: new AuthoringTasteValueDescriptor(
    'generated-type-surface',
    'type-surface-trust',
    'derived-reading',
    'Type surfaces come from generated declarations or generated source.',
  ),
  JavascriptSourceSurface: new AuthoringTasteValueDescriptor(
    'javascript-source-surface',
    'type-surface-trust',
    'derived-reading',
    'The authoring target lacks TypeScript source surfaces.',
  ),
  SingleAppPackage: new AuthoringTasteValueDescriptor(
    'single-app-package',
    'package-topology',
    'observed-shape',
    'Source admission identifies the selected project as one app package or application shell.',
  ),
  WorkspaceMonorepo: new AuthoringTasteValueDescriptor(
    'workspace-monorepo',
    'package-topology',
    'observed-shape',
    'The workspace contains multiple packages, apps, or libraries that shape authoring scope.',
  ),
  ResourceLibraryPackage: new AuthoringTasteValueDescriptor(
    'resource-library-package',
    'package-topology',
    'observed-shape',
    'The current project is a resource or plugin library rather than an app root.',
  ),
  HostSelectedBuildTool: new AuthoringTasteValueDescriptor(
    'host-selected-build-tool',
    'build-tool-profile',
    'primitive-policy',
    'Authoring should leave bundler, dev-server, and asset-pipeline selection to the host until product policy is explicit.',
  ),
  TypecheckOnlyTooling: new AuthoringTasteValueDescriptor(
    'typecheck-only-tooling',
    'build-tool-profile',
    'observed-shape',
    'Project tooling exposes TypeScript/module-declaration support without a modeled bundler or dev-server config.',
  ),
  BundlerConfigTooling: new AuthoringTasteValueDescriptor(
    'bundler-config-tooling',
    'build-tool-profile',
    'observed-shape',
    'Project tooling includes a recognizable bundler or dev-server configuration file.',
  ),
  FeatureFolderTopology: new AuthoringTasteValueDescriptor(
    'feature-folder-topology',
    'source-layout',
    'derived-reading',
    'App code appears organized by feature folders.',
  ),
  BoundedContextTopology: new AuthoringTasteValueDescriptor(
    'bounded-context-topology',
    'source-layout',
    'derived-reading',
    'App code appears organized by bounded contexts or domains.',
  ),
  CompactSemanticFacts: new AuthoringTasteValueDescriptor(
    'compact-semantic-facts',
    'agent-legibility',
    'derived-reading',
    'Semantic facts are compact and closed enough for an agent to orient quickly.',
  ),
  SourceLegibleBoundaries: new AuthoringTasteValueDescriptor(
    'source-legible-boundaries',
    'agent-legibility',
    'derived-reading',
    'Source boundaries are explicit enough to understand with relatively few semantic queries.',
  ),
  SemanticGapsPresent: new AuthoringTasteValueDescriptor(
    'semantic-gaps-present',
    'agent-legibility',
    'derived-reading',
    'Open seams or partial facts are prominent enough to shape authoring risk.',
  ),
  MixedPatternPressure: new AuthoringTasteValueDescriptor(
    'mixed-pattern-pressure',
    'agent-legibility',
    'derived-reading',
    'The app mixes competing patterns on one axis and may need local policy or cleanup suggestions.',
  ),
} as const;

export const AuthoringOperationFamilies = {
  WorkspaceShell: new AuthoringOperationFamily(
    'workspace-shell',
    'Workspace Shell',
    'Project setup, package/build tooling, folder layout, entrypoints, and app root files.',
  ),
  CapabilityAdmission: new AuthoringOperationFamily(
    'capability-admission',
    'Capability Admission',
    'Adding framework packages, plugins, configuration registrations, and app-wide feature surfaces.',
  ),
  ResourceAuthoring: new AuthoringOperationFamily(
    'resource-authoring',
    'Resource Authoring',
    'Creating Aurelia resources such as custom elements, attributes, template controllers, converters, behaviors, and commands.',
  ),
  ComponentComposition: new AuthoringOperationFamily(
    'component-composition',
    'Component Composition',
    'Specialized component roles such as forms, routed pages, common widgets, shell layouts, and async boundaries.',
  ),
  DomainModel: new AuthoringOperationFamily(
    'domain-model',
    'Domain Model',
    'State classes, app services, repositories, use-case classes, and domain-owned app model surfaces.',
  ),
  DependencyInjection: new AuthoringOperationFamily(
    'dependency-injection',
    'Dependency Injection',
    'DI keys, registrations, injection sites, lifetimes, aliases, and container visibility.',
  ),
  Integration: new AuthoringOperationFamily(
    'integration',
    'Integration',
    'Backend clients, platform adapters, environment boundaries, and durable external capability edges.',
  ),
  Routing: new AuthoringOperationFamily(
    'routing',
    'Routing',
    'Route trees, routeable components, navigation surfaces, route hooks, and viewport/layout structure.',
  ),
  Authentication: new AuthoringOperationFamily(
    'authentication',
    'Authentication',
    'User/session services, login/logout flows, token or cookie policy, auth UI states, and auth-provider integration.',
  ),
  AccessControl: new AuthoringOperationFamily(
    'access-control',
    'Access Control',
    'Authorization policy, protected route admission, guard hooks, permission checks, and denied-state handling.',
  ),
  TemplateComposition: new AuthoringOperationFamily(
    'template-composition',
    'Template Composition',
    'Bindings, events, forms, validation, template control flow, slots, resource usage, and expression surfaces.',
  ),
  DesignSystem: new AuthoringOperationFamily(
    'design-system',
    'Design System',
    'Styling strategy, theme tokens, layout rules, accessibility defaults, and component-library integration.',
  ),
  Evolution: new AuthoringOperationFamily(
    'evolution',
    'Evolution',
    'Rename, move, extract, split, convert, upgrade, and migrate operations over existing apps.',
  ),
  Verification: new AuthoringOperationFamily(
    'verification',
    'Verification',
    'Reopening apps, checking semantic effects, surfacing open seams, and producing repair pressure.',
  ),
} as const;

export type AuthoringOperationFamilyKey =
  typeof AuthoringOperationFamilies[keyof typeof AuthoringOperationFamilies]['key'];

export class AuthoringProfileDescriptor<TKey extends AuthoringStyleKey = AuthoringStyleKey> {
  readonly kind = 'authoring-profile-descriptor' as const;

  constructor(
    readonly key: TKey,
    readonly title: string,
    readonly summary: string,
    readonly ambiguitySummary: string | null = null,
    readonly preferences: readonly AuthoringPreference[] = [],
  ) {}
}

export const AuthoringProfiles = {
  NativeDecorators: new AuthoringProfileDescriptor(
    'native-decorators',
    'Native Decorators',
    'Prefer explicit Aurelia decorators and explicit imports for resources whose source shape should be obvious to the reader.',
    null,
    [new AuthoringPreference('resource-declaration-mode', 'decorator-resource-declaration')],
  ),
  Conventions: new AuthoringProfileDescriptor(
    'conventions',
    'Conventions',
    'Prefer Aurelia conventions where they produce idiomatic source with less ceremony and the analyzer can verify them.',
    'Only default to conventions when the semantic runtime can prove the convention path for the target project.',
    [
      new AuthoringPreference('resource-declaration-mode', 'legacy-convention-resource-declaration'),
      new AuthoringPreference('resource-admission-mode', 'convention-discovery-admission'),
    ],
  ),
  ExplicitRegistration: new AuthoringProfileDescriptor(
    'explicit-registration',
    'Explicit Registration',
    'Prefer explicit registration for apps that value visible configuration and deterministic resource admission.',
    null,
    [new AuthoringPreference('resource-admission-mode', 'direct-registration-admission')],
  ),
  Hybrid: new AuthoringProfileDescriptor(
    'hybrid',
    'Hybrid',
    'Use decorators, conventions, and explicit registration where each is locally idiomatic and semantically verifiable.',
    'Hybrid style requires the planner to explain why each local choice is preferable.',
  ),
} as const;

export type AuthoringCapabilityKey =
  /** App root, startup, and minimal project shell can be planned, edited, or verified. */
  | 'app-shell'
  /** Package manifest, TypeScript config, declarations, and build-tool policy are modeled enough for project edits. */
  | 'package-tooling'
  /** Decorator-authored Aurelia resources can be generated and reopened as resource facts. */
  | 'native-decorator-authoring'
  /** Convention-authored resources can be generated or interpreted through specified framework/source rules. */
  | 'convention-authoring'
  /** External template assets can be created, linked, and reopened from component facts. */
  | 'external-template'
  /** Aurelia resources can be created and verified through the resource-definition substrate. */
  | 'resource-authoring'
  /** Components can be assigned app-building roles such as root, routed page, data entry, or composition host. */
  | 'component-role-authoring'
  /** DI keys, registrations, resolver slots, and injection/resolve sites can be modeled for authoring. */
  | 'dependency-injection'
  /** Router configuration, routeable components, viewports, and route-tree facts can guide authoring. */
  | 'router'
  /** Authentication/session/provider surfaces can be planned and verified. */
  | 'auth'
  /** Authorization policy, route protection, and denied-state surfaces can be planned and verified. */
  | 'access-control'
  /** Template bindings, events, control flow, forms, validation, and resource usage can be authored. */
  | 'template-composition'
  /** Stylesheet/style assets can be authored and verified as style ownership facts. */
  | 'style-asset-authoring'
  /** Theme, layout, accessibility, component-library, and visual-system policy can guide authoring. */
  | 'design-system'
  /** Existing apps can be changed through semantic rename/move/extract/split/convert/migrate operations. */
  | 'evolution'
  /** Reopened app facts can be compared against expected effects and turned into repair pressure. */
  | 'closed-loop-verification';

export class AuthoringCapabilityDescriptor<TKey extends AuthoringCapabilityKey = AuthoringCapabilityKey> {
  readonly kind = 'authoring-capability-descriptor' as const;

  constructor(
    readonly key: TKey,
    readonly title: string,
    readonly summary: string,
    /** Product-level gaps that are true before inspecting a particular app. */
    readonly productOpenReasonKinds: readonly AuthoringOpenReasonKind[] = [],
  ) {}
}

export const AuthoringCapabilityDescriptors = {
  AppShell: new AuthoringCapabilityDescriptor(
    'app-shell',
    'App Shell',
    'Author package, folder, entrypoint, app-root, and baseline template/style structure.',
  ),
  PackageTooling: new AuthoringCapabilityDescriptor(
    'package-tooling',
    'Package Tooling',
    'Author package manager, scripts, build tool, TypeScript config, and asset module declarations.',
    ['package-tooling-policy-open', 'source-edit-policy-open'],
  ),
  NativeDecoratorAuthoring: new AuthoringCapabilityDescriptor(
    'native-decorator-authoring',
    'Native Decorator Authoring',
    'Author explicit decorator-based Aurelia resources.',
  ),
  ConventionAuthoring: new AuthoringCapabilityDescriptor(
    'convention-authoring',
    'Convention Authoring',
    'Author convention-based resources and prove how conventions resolve.',
  ),
  ExternalTemplate: new AuthoringCapabilityDescriptor(
    'external-template',
    'External Template',
    'Author and analyze external component templates.',
  ),
  ResourceAuthoring: new AuthoringCapabilityDescriptor(
    'resource-authoring',
    'Resource Authoring',
    'Author Aurelia resources and verify resource definitions and visibility.',
  ),
  ComponentRoleAuthoring: new AuthoringCapabilityDescriptor(
    'component-role-authoring',
    'Component Role Authoring',
    'Author higher-level component roles such as forms, routed pages, widgets, and layouts.',
  ),
  DependencyInjection: new AuthoringCapabilityDescriptor(
    'dependency-injection',
    'Dependency Injection',
    'Author services, DI keys, registrations, injections, and domain model wiring.',
  ),
  Router: new AuthoringCapabilityDescriptor(
    'router',
    'Router',
    'Author route configuration, routeable components, navigation surfaces, and route hooks.',
  ),
  Auth: new AuthoringCapabilityDescriptor(
    'auth',
    'Auth',
    'Author session/user services, login/logout flows, auth provider integration, and auth UI states.',
    ['semantic-fact-partial'],
  ),
  AccessControl: new AuthoringCapabilityDescriptor(
    'access-control',
    'Access Control',
    'Author authorization policy, protected route admission, guard hooks, and denied-state handling.',
    ['semantic-fact-partial'],
  ),
  TemplateComposition: new AuthoringCapabilityDescriptor(
    'template-composition',
    'Template Composition',
    'Author template bindings, events, control flow, forms, validation, and resource usage.',
  ),
  StyleAssetAuthoring: new AuthoringCapabilityDescriptor(
    'style-asset-authoring',
    'Style Asset Authoring',
    'Author component or global stylesheet assets and verify style ownership facts.',
  ),
  DesignSystem: new AuthoringCapabilityDescriptor(
    'design-system',
    'Design System',
    'Author style strategy, tokens, layouts, accessibility defaults, and component-library integration.',
    ['source-edit-policy-open', 'semantic-fact-partial'],
  ),
  Evolution: new AuthoringCapabilityDescriptor(
    'evolution',
    'Evolution',
    'Modify existing apps through semantic rename, move, extract, split, conversion, and migration operations.',
    ['api-query-missing', 'source-edit-policy-open'],
  ),
  ClosedLoopVerification: new AuthoringCapabilityDescriptor(
    'closed-loop-verification',
    'Closed Loop Verification',
    'Reopen authored apps and compare observed semantic facts against expected effects.',
  ),
} as const;

export class AuthoringAmbiguityPoint {
  readonly kind = 'authoring-ambiguity-point' as const;

  constructor(
    readonly key: string,
    readonly summary: string,
    readonly resolution: AuthoringAmbiguityResolution,
    readonly options: readonly string[] = [],
  ) {}
}

export class AuthoringOperationDescriptor<TKey extends string = string> {
  readonly kind = 'authoring-operation-descriptor' as const;

  constructor(
    readonly operationKind: TKey,
    readonly familyKey: AuthoringOperationFamilyKey,
    readonly action: AuthoringOperationAction,
    readonly targetKind: AuthoringTargetKind,
    readonly summary: string,
    readonly requiredCapabilities: readonly AuthoringCapabilityKey[] = [],
    readonly commonAmbiguities: readonly AuthoringAmbiguityPoint[] = [],
  ) {}
}

const styleAmbiguity = new AuthoringAmbiguityPoint(
  'authoring-style',
  'Whether the source should favor decorators, conventions, explicit registration, or a local hybrid.',
  'ask-user',
  ['native-decorators', 'conventions', 'explicit-registration', 'hybrid'],
);

const designAmbiguity = new AuthoringAmbiguityPoint(
  'design-policy',
  'Visual style, density, component-library use, and accessibility policy are product choices unless a profile fixes them.',
  'ask-user',
);

const integrationAmbiguity = new AuthoringAmbiguityPoint(
  'integration-boundary',
  'Server/runtime integration shape depends on the target platform and backend contract.',
  'ask-user',
);

export const AuthoringOperationDescriptors = {
  SetupApp: new AuthoringOperationDescriptor(
    'setup-app',
    'workspace-shell',
    'create',
    'workspace',
    'Create a framework-normal Aurelia app shell with package tooling, source layout, entrypoint, root component, and template.',
    ['app-shell', 'package-tooling', 'closed-loop-verification'],
    [styleAmbiguity],
  ),
  CreateProjectFiles: new AuthoringOperationDescriptor(
    'create-project-files',
    'workspace-shell',
    'create',
    'folder-structure',
    'Create or update package, TypeScript, build, and source-root files required by the app shell.',
    ['package-tooling'],
  ),
  CreateEntrypoint: new AuthoringOperationDescriptor(
    'create-entrypoint',
    'workspace-shell',
    'create',
    'entrypoint',
    'Create the startup module that constructs Aurelia, registers capabilities, selects the app root, and starts.',
    ['app-shell'],
  ),
  CreateRootComponent: new AuthoringOperationDescriptor(
    'create-root-component',
    'workspace-shell',
    'create',
    'app-root',
    'Create the root custom element source and attach an idiomatic external template.',
    ['app-shell', 'external-template'],
    [styleAmbiguity],
  ),
  CreateExternalTemplate: new AuthoringOperationDescriptor(
    'create-external-template',
    'workspace-shell',
    'create',
    'template',
    'Create or attach an external component template asset.',
    ['external-template'],
  ),
  CreateStyleAsset: new AuthoringOperationDescriptor(
    'create-style-asset',
    'design-system',
    'create',
    'style',
    'Create or attach a stylesheet, CSS module, or Shadow DOM style asset with explicit ownership.',
    ['style-asset-authoring'],
    [designAmbiguity],
  ),
  ConfigurePlugin: new AuthoringOperationDescriptor(
    'configure-plugin',
    'capability-admission',
    'configure',
    'plugin',
    'Add a framework package or plugin to app configuration and verify the admitted capability.',
    ['closed-loop-verification'],
  ),
  CreateComponent: new AuthoringOperationDescriptor(
    'create-component',
    'resource-authoring',
    'create',
    'custom-element',
    'Create a custom element resource with source, template, bindables, and resource visibility expectations.',
    ['resource-authoring', 'external-template'],
    [styleAmbiguity],
  ),
  CreateCustomAttribute: new AuthoringOperationDescriptor(
    'create-custom-attribute',
    'resource-authoring',
    'create',
    'custom-attribute',
    'Create a custom attribute resource with bindables and usage guidance.',
    ['resource-authoring'],
    [styleAmbiguity],
  ),
  CreateTemplateController: new AuthoringOperationDescriptor(
    'create-template-controller',
    'resource-authoring',
    'create',
    'template-controller',
    'Create a template controller resource and model its synthetic-view implications.',
    ['resource-authoring', 'template-composition'],
    [styleAmbiguity],
  ),
  CreateValueConverter: new AuthoringOperationDescriptor(
    'create-value-converter',
    'resource-authoring',
    'create',
    'value-converter',
    'Create a value converter and verify template expression usage.',
    ['resource-authoring', 'template-composition'],
  ),
  CreateBindingBehavior: new AuthoringOperationDescriptor(
    'create-binding-behavior',
    'resource-authoring',
    'create',
    'binding-behavior',
    'Create a binding behavior for uncommon binding-pipeline customization.',
    ['resource-authoring', 'template-composition'],
  ),
  CreateFormComponent: new AuthoringOperationDescriptor(
    'create-form-component',
    'component-composition',
    'create',
    'component',
    'Create a data-producing or data-editing component with binding, validation, and submission semantics.',
    ['component-role-authoring', 'template-composition'],
    [designAmbiguity],
  ),
  CreateWidgetComponent: new AuthoringOperationDescriptor(
    'create-widget-component',
    'component-composition',
    'create',
    'component',
    'Create a reusable display or interaction widget with clear inputs, outputs, and accessibility expectations.',
    ['component-role-authoring', 'template-composition'],
    [designAmbiguity],
  ),
  CreateService: new AuthoringOperationDescriptor(
    'create-service',
    'domain-model',
    'create',
    'service',
    'Create an app service, repository, use-case class, or integration-facing domain service.',
    ['dependency-injection'],
  ),
  CreateDomainModel: new AuthoringOperationDescriptor(
    'create-domain-model',
    'domain-model',
    'create',
    'domain-model',
    'Create a plain domain entity, aggregate, value object, or app-owned model class.',
    ['dependency-injection'],
  ),
  RegisterDependency: new AuthoringOperationDescriptor(
    'register-dependency',
    'dependency-injection',
    'connect',
    'di-registration',
    'Register a service or value with the app container and verify DI visibility.',
    ['dependency-injection', 'closed-loop-verification'],
  ),
  CreateStateModel: new AuthoringOperationDescriptor(
    'create-state-model',
    'domain-model',
    'create',
    'state-model',
    'Create vanilla state/domain classes before deciding whether a framework state package is required.',
    ['dependency-injection'],
  ),
  ConfigureStateStore: new AuthoringOperationDescriptor(
    'configure-state-store',
    'domain-model',
    'configure',
    'state-model',
    'Configure @aurelia/state stores, initial state, action handlers, and template store-binding expectations.',
    ['template-composition', 'closed-loop-verification'],
  ),
  CreateServerIntegration: new AuthoringOperationDescriptor(
    'create-server-integration',
    'integration',
    'create',
    'server-integration',
    'Create a client/adaptor boundary for a backend or platform integration.',
    ['dependency-injection'],
    [integrationAmbiguity],
  ),
  ConfigureRouter: new AuthoringOperationDescriptor(
    'configure-router',
    'routing',
    'configure',
    'router',
    'Admit router support and create the app route surface.',
    ['router', 'closed-loop-verification'],
  ),
  AddRoute: new AuthoringOperationDescriptor(
    'add-route',
    'routing',
    'connect',
    'route',
    'Add a route and connect it to a routeable component.',
    ['router', 'component-role-authoring'],
  ),
  SetupAuth: new AuthoringOperationDescriptor(
    'setup-auth',
    'authentication',
    'configure',
    'auth',
    'Create session/user services, auth provider integration, login/logout flows, and user-facing auth states.',
    ['auth', 'dependency-injection', 'closed-loop-verification'],
    [integrationAmbiguity],
  ),
  ProtectRoute: new AuthoringOperationDescriptor(
    'protect-route',
    'access-control',
    'connect',
    'access-policy',
    'Connect authorization policy to routes, route hooks, and denied-state handling.',
    ['access-control', 'auth', 'router', 'closed-loop-verification'],
    [integrationAmbiguity],
  ),
  AddRouteHook: new AuthoringOperationDescriptor(
    'add-route-hook',
    'routing',
    'connect',
    'route-hook',
    'Add route lifecycle or validation hooks with explicit semantic effects.',
    ['router'],
  ),
  AddTemplateBinding: new AuthoringOperationDescriptor(
    'add-template-binding',
    'template-composition',
    'connect',
    'template-binding',
    'Add template binding, event, command, converter, behavior, or control-flow usage.',
    ['template-composition'],
  ),
  ApplyDesignSystem: new AuthoringOperationDescriptor(
    'apply-design-system',
    'design-system',
    'configure',
    'design-system',
    'Apply style strategy, tokens, layout rules, accessibility defaults, or component-library integration.',
    ['design-system'],
    [designAmbiguity],
  ),
  ExtractComponent: new AuthoringOperationDescriptor(
    'extract-component',
    'evolution',
    'modify',
    'component',
    'Extract a component from existing source while preserving bindings, resources, and source navigation.',
    ['evolution', 'component-role-authoring', 'closed-loop-verification'],
  ),
  ConvertInlineTemplateToExternal: new AuthoringOperationDescriptor(
    'convert-inline-template-to-external',
    'evolution',
    'migrate',
    'template',
    'Move an inline template to an external template asset and preserve semantic equivalence.',
    ['evolution', 'external-template', 'closed-loop-verification'],
  ),
  VerifyApp: new AuthoringOperationDescriptor(
    'verify-app',
    'verification',
    'verify',
    'semantic-app',
    'Reopen the app and verify expected semantic effects against observed facts and open seams.',
    ['closed-loop-verification'],
  ),
  RepairApp: new AuthoringOperationDescriptor(
    'repair-app',
    'verification',
    'repair',
    'semantic-app',
    'Turn verification failures or open seams into follow-up authoring operations.',
    ['closed-loop-verification'],
  ),
} as const;

export type AuthoringOperationKind =
  typeof AuthoringOperationDescriptors[keyof typeof AuthoringOperationDescriptors]['operationKind'];

export class AuthoringOperationOntology {
  readonly kind = 'authoring-operation-ontology' as const;

  constructor(
    readonly families: readonly AuthoringOperationFamily<AuthoringOperationFamilyKey>[],
    readonly tasteAxes: readonly AuthoringTasteAxisDescriptor[],
    readonly tasteValues: readonly AuthoringTasteValueDescriptor[],
    readonly profiles: readonly AuthoringProfileDescriptor[],
    readonly capabilities: readonly AuthoringCapabilityDescriptor[],
    readonly operations: readonly AuthoringOperationDescriptor<AuthoringOperationKind>[],
  ) {
    validateTasteDescriptors(tasteAxes, tasteValues);
  }

  readOperation(kind: AuthoringOperationKind): AuthoringOperationDescriptor<AuthoringOperationKind> | null {
    return this.operations.find((operation) => operation.operationKind === kind) ?? null;
  }

  readOperationsByFamily(familyKey: AuthoringOperationFamilyKey): readonly AuthoringOperationDescriptor<AuthoringOperationKind>[] {
    return this.operations.filter((operation) => operation.familyKey === familyKey);
  }

  readOperationsByCapability(capabilityKey: AuthoringCapabilityKey): readonly AuthoringOperationDescriptor<AuthoringOperationKind>[] {
    return this.operations.filter((operation) => operation.requiredCapabilities.includes(capabilityKey));
  }

  readTasteAxis(axisKey: AuthoringTasteAxisKey): AuthoringTasteAxisDescriptor | null {
    return this.tasteAxes.find((axis) => axis.key === axisKey) ?? null;
  }

  readTasteValue(valueKey: AuthoringTasteValueKey): AuthoringTasteValueDescriptor | null {
    return this.tasteValues.find((value) => value.key === valueKey) ?? null;
  }
}

export const AuthoringOntology = new AuthoringOperationOntology(
  Object.values(AuthoringOperationFamilies),
  Object.values(AuthoringTasteAxes),
  Object.values(AuthoringTasteValueDescriptors),
  Object.values(AuthoringProfiles),
  Object.values(AuthoringCapabilityDescriptors),
  Object.values(AuthoringOperationDescriptors),
);

export function readAuthoringOperationDescriptor(
  kind: AuthoringOperationKind,
): AuthoringOperationDescriptor<AuthoringOperationKind> {
  const descriptor = AuthoringOntology.readOperation(kind);
  if (descriptor == null) {
    throw new Error(`Unknown authoring operation kind: ${kind}`);
  }
  return descriptor;
}

export function readAuthoringTasteValueDescriptor(
  valueKey: AuthoringTasteValueKey,
): AuthoringTasteValueDescriptor {
  const descriptor = AuthoringOntology.readTasteValue(valueKey);
  if (descriptor == null) {
    throw new Error(`Unknown authoring taste value key: ${valueKey}`);
  }
  return descriptor;
}

function validateTasteDescriptors(
  axes: readonly AuthoringTasteAxisDescriptor[],
  values: readonly AuthoringTasteValueDescriptor[],
): void {
  const axesByKey = new Map(axes.map((axis) => [axis.key, axis]));
  const valuesByKey = new Map(values.map((value) => [value.key, value]));
  for (const axis of axes) {
    let hasDominantLayerValue = false;
    for (const valueKey of axis.commonValues) {
      const value = valuesByKey.get(valueKey);
      if (value == null) {
        throw new Error(`Authoring taste axis ${axis.key} references unknown value ${valueKey}`);
      }
      if (value.axisKey !== axis.key) {
        throw new Error(`Authoring taste value ${value.key} belongs to ${value.axisKey}, not ${axis.key}`);
      }
      if (value.layer === axis.layer) {
        hasDominantLayerValue = true;
      }
    }
    if (!hasDominantLayerValue) {
      throw new Error(`Authoring taste axis ${axis.key} has no common values in its dominant layer ${axis.layer}`);
    }
  }
  for (const value of values) {
    const axis = axesByKey.get(value.axisKey);
    if (axis == null) {
      throw new Error(`Authoring taste value ${value.key} references unknown axis ${value.axisKey}`);
    }
    if (!axis.commonValues.includes(value.key)) {
      throw new Error(`Authoring taste value ${value.key} is missing from axis ${value.axisKey}`);
    }
  }
}
