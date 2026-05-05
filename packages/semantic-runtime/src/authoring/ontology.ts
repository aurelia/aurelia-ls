/**
 * Authoring operation ontology.
 *
 * This is the stable vocabulary for AI-assisted app creation. Concrete generators and source edits should point into
 * these descriptors instead of inventing one-off operation names or template-shaped shortcuts.
 */

export type AuthoringOperationAction =
  | 'create'
  | 'connect'
  | 'configure'
  | 'modify'
  | 'remove'
  | 'verify'
  | 'repair'
  | 'migrate';

export type AuthoringTargetKind =
  | 'workspace'
  | 'package-manifest'
  | 'build-tool'
  | 'folder-structure'
  | 'entrypoint'
  | 'app-root'
  | 'component'
  | 'template'
  | 'style'
  | 'custom-element'
  | 'custom-attribute'
  | 'template-controller'
  | 'value-converter'
  | 'binding-behavior'
  | 'binding-command'
  | 'attribute-pattern'
  | 'service'
  | 'di-registration'
  | 'state-model'
  | 'server-integration'
  | 'plugin'
  | 'router'
  | 'route'
  | 'auth'
  | 'access-policy'
  | 'route-hook'
  | 'design-system'
  | 'template-binding'
  | 'semantic-app';

export type AuthoringStyleKey =
  | 'native-decorators'
  | 'conventions'
  | 'explicit-registration'
  | 'hybrid';

export type AuthoringAmbiguityResolution =
  | 'defaultable'
  | 'ask-user'
  | 'requires-app-analysis'
  | 'requires-capability-probe';

export class AuthoringOperationFamily<TKey extends string = string> {
  readonly kind = 'authoring-operation-family' as const;

  constructor(
    readonly key: TKey,
    readonly title: string,
    readonly summary: string,
  ) {}
}

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
  ) {}
}

export const AuthoringProfiles = {
  NativeDecorators: new AuthoringProfileDescriptor(
    'native-decorators',
    'Native Decorators',
    'Prefer explicit Aurelia decorators and explicit imports for resources whose source shape should be obvious to the reader.',
  ),
  Conventions: new AuthoringProfileDescriptor(
    'conventions',
    'Conventions',
    'Prefer Aurelia conventions where they produce idiomatic source with less ceremony and the analyzer can verify them.',
    'Only default to conventions when the semantic runtime can prove the convention path for the target project.',
  ),
  ExplicitRegistration: new AuthoringProfileDescriptor(
    'explicit-registration',
    'Explicit Registration',
    'Prefer explicit registration for apps that value visible configuration and deterministic resource admission.',
  ),
  Hybrid: new AuthoringProfileDescriptor(
    'hybrid',
    'Hybrid',
    'Use decorators, conventions, and explicit registration where each is locally idiomatic and semantically verifiable.',
    'Hybrid style requires the planner to explain why each local choice is preferable.',
  ),
} as const;

export type AuthoringCapabilityKey =
  | 'app-shell'
  | 'package-tooling'
  | 'native-decorator-authoring'
  | 'convention-authoring'
  | 'external-template'
  | 'resource-authoring'
  | 'component-role-authoring'
  | 'dependency-injection'
  | 'router'
  | 'auth'
  | 'access-control'
  | 'template-composition'
  | 'design-system'
  | 'evolution'
  | 'closed-loop-verification';

export class AuthoringCapabilityDescriptor<TKey extends AuthoringCapabilityKey = AuthoringCapabilityKey> {
  readonly kind = 'authoring-capability-descriptor' as const;

  constructor(
    readonly key: TKey,
    readonly title: string,
    readonly summary: string,
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
  ),
  AccessControl: new AuthoringCapabilityDescriptor(
    'access-control',
    'Access Control',
    'Author authorization policy, protected route admission, guard hooks, and denied-state handling.',
  ),
  TemplateComposition: new AuthoringCapabilityDescriptor(
    'template-composition',
    'Template Composition',
    'Author template bindings, events, control flow, forms, validation, and resource usage.',
  ),
  DesignSystem: new AuthoringCapabilityDescriptor(
    'design-system',
    'Design System',
    'Author style strategy, tokens, layouts, accessibility defaults, and component-library integration.',
  ),
  Evolution: new AuthoringCapabilityDescriptor(
    'evolution',
    'Evolution',
    'Modify existing apps through semantic rename, move, extract, split, conversion, and migration operations.',
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
    'Create an app service, repository, use-case class, or domain model class.',
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
    readonly profiles: readonly AuthoringProfileDescriptor[],
    readonly capabilities: readonly AuthoringCapabilityDescriptor[],
    readonly operations: readonly AuthoringOperationDescriptor<AuthoringOperationKind>[],
  ) {}

  readOperation(kind: AuthoringOperationKind): AuthoringOperationDescriptor<AuthoringOperationKind> | null {
    return this.operations.find((operation) => operation.operationKind === kind) ?? null;
  }

  readOperationsByFamily(familyKey: AuthoringOperationFamilyKey): readonly AuthoringOperationDescriptor<AuthoringOperationKind>[] {
    return this.operations.filter((operation) => operation.familyKey === familyKey);
  }

  readOperationsByCapability(capabilityKey: AuthoringCapabilityKey): readonly AuthoringOperationDescriptor<AuthoringOperationKind>[] {
    return this.operations.filter((operation) => operation.requiredCapabilities.includes(capabilityKey));
  }
}

export const AuthoringOntology = new AuthoringOperationOntology(
  Object.values(AuthoringOperationFamilies),
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
