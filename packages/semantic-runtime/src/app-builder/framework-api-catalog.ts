import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
} from './part-application.js';
import {
  type NamedResourceDefinitionKind,
  ResourceDefinitionKind,
} from '../resources/resource-kind.js';

/** Stable identity of a framework TypeScript API exposed as an app-builder part. */
export enum AppBuilderFrameworkApiId {
  /** `@customElement(...)` decorator from Aurelia resource definitions. */
  CustomElementDecorator = 'custom-element-decorator',
  /** Static `$au` custom-element definition metadata on a resource class. */
  CustomElementStaticAuDefinition = 'custom-element-static-au-definition',
  /** Imperative `CustomElement.define(...)` custom-element definition call. */
  CustomElementDefineCall = 'custom-element-define-call',
  /** `@customAttribute(...)` decorator from Aurelia resource definitions. */
  CustomAttributeDecorator = 'custom-attribute-decorator',
  /** Static `$au` custom-attribute definition metadata on a resource class. */
  CustomAttributeStaticAuDefinition = 'custom-attribute-static-au-definition',
  /** Imperative `CustomAttribute.define(...)` custom-attribute definition call. */
  CustomAttributeDefineCall = 'custom-attribute-define-call',
  /** `@templateController(...)` decorator from Aurelia resource definitions. */
  TemplateControllerDecorator = 'template-controller-decorator',
  /** Static `$au` template-controller definition metadata on a resource class. */
  TemplateControllerStaticAuDefinition = 'template-controller-static-au-definition',
  /** Imperative `CustomAttribute.define({ isTemplateController: true }, ...)` definition call. */
  TemplateControllerDefineCall = 'template-controller-define-call',
  /** `@valueConverter(...)` decorator from Aurelia resource definitions. */
  ValueConverterDecorator = 'value-converter-decorator',
  /** Static `$au` value-converter definition metadata on a resource class. */
  ValueConverterStaticAuDefinition = 'value-converter-static-au-definition',
  /** Imperative `ValueConverter.define(...)` value-converter definition call. */
  ValueConverterDefineCall = 'value-converter-define-call',
  /** `@bindingBehavior(...)` decorator from Aurelia resource definitions. */
  BindingBehaviorDecorator = 'binding-behavior-decorator',
  /** Static `$au` binding-behavior definition metadata on a resource class. */
  BindingBehaviorStaticAuDefinition = 'binding-behavior-static-au-definition',
  /** Imperative `BindingBehavior.define(...)` binding-behavior definition call. */
  BindingBehaviorDefineCall = 'binding-behavior-define-call',
  /** `@bindingCommand(...)` decorator from Aurelia template-compiler resource definitions. */
  BindingCommandDecorator = 'binding-command-decorator',
  /** Static `$au` binding-command definition metadata on a resource class. */
  BindingCommandStaticAuDefinition = 'binding-command-static-au-definition',
  /** Imperative `BindingCommand.define(...)` binding-command definition call. */
  BindingCommandDefineCall = 'binding-command-define-call',
  /** `AttributePattern.create(...)` syntax-resource registry expression. */
  AttributePatternCreate = 'attribute-pattern-create',
  /** `@route(...)` decorator from @aurelia/router route configuration. */
  RouteDecorator = 'route-decorator',
  /** `IRouteContext.getRouteParameters(...)` route-context parameter read. */
  RouteContextParameterRead = 'route-context-parameter-read',
  /** `@fromState(...)` decorator from @aurelia/state. */
  FromStateDecorator = 'from-state-decorator',
  /** `@computed(...)` decorator from Aurelia observation. */
  ComputedDecorator = 'computed-decorator',
  /** `AppTask.*(...)` registry expression from Aurelia runtime-html. */
  AppTaskRegistration = 'app-task-registration',
}

/** App-builder framework API ids for the three source carriers every named resource can use. */
export interface AppBuilderNamedResourceFrameworkApiIds {
  readonly decorator: AppBuilderFrameworkApiId;
  readonly staticAu: AppBuilderFrameworkApiId;
  readonly defineCall: AppBuilderFrameworkApiId;
}

const APP_BUILDER_NAMED_RESOURCE_FRAMEWORK_API_IDS = {
  [ResourceDefinitionKind.CustomElement]: {
    decorator: AppBuilderFrameworkApiId.CustomElementDecorator,
    staticAu: AppBuilderFrameworkApiId.CustomElementStaticAuDefinition,
    defineCall: AppBuilderFrameworkApiId.CustomElementDefineCall,
  },
  [ResourceDefinitionKind.CustomAttribute]: {
    decorator: AppBuilderFrameworkApiId.CustomAttributeDecorator,
    staticAu: AppBuilderFrameworkApiId.CustomAttributeStaticAuDefinition,
    defineCall: AppBuilderFrameworkApiId.CustomAttributeDefineCall,
  },
  [ResourceDefinitionKind.TemplateController]: {
    decorator: AppBuilderFrameworkApiId.TemplateControllerDecorator,
    staticAu: AppBuilderFrameworkApiId.TemplateControllerStaticAuDefinition,
    defineCall: AppBuilderFrameworkApiId.TemplateControllerDefineCall,
  },
  [ResourceDefinitionKind.ValueConverter]: {
    decorator: AppBuilderFrameworkApiId.ValueConverterDecorator,
    staticAu: AppBuilderFrameworkApiId.ValueConverterStaticAuDefinition,
    defineCall: AppBuilderFrameworkApiId.ValueConverterDefineCall,
  },
  [ResourceDefinitionKind.BindingBehavior]: {
    decorator: AppBuilderFrameworkApiId.BindingBehaviorDecorator,
    staticAu: AppBuilderFrameworkApiId.BindingBehaviorStaticAuDefinition,
    defineCall: AppBuilderFrameworkApiId.BindingBehaviorDefineCall,
  },
  [ResourceDefinitionKind.BindingCommand]: {
    decorator: AppBuilderFrameworkApiId.BindingCommandDecorator,
    staticAu: AppBuilderFrameworkApiId.BindingCommandStaticAuDefinition,
    defineCall: AppBuilderFrameworkApiId.BindingCommandDefineCall,
  },
} as const satisfies Record<NamedResourceDefinitionKind, AppBuilderNamedResourceFrameworkApiIds>;

/** Return the app-builder API ids that lower one named resource across decorator/static/define carriers. */
export function appBuilderNamedResourceFrameworkApiIds(
  resourceKind: NamedResourceDefinitionKind,
): AppBuilderNamedResourceFrameworkApiIds {
  return APP_BUILDER_NAMED_RESOURCE_FRAMEWORK_API_IDS[resourceKind];
}

/** One framework API part: authored TypeScript syntax backed by an Aurelia exported API. */
export interface AppBuilderFrameworkApiDescriptor {
  readonly id: AppBuilderFrameworkApiId;
  readonly title: string;
  readonly summary: string;
  /** Module specifier that exports this API; used for dependency and import requirements. */
  readonly moduleSpecifier: string;
  /** Exported API name as seen in authored TypeScript imports. */
  readonly exportName: string;
  /** Display-only syntax cue; lowering must use operation/slot metadata instead. */
  readonly syntaxCue: string;
  /** Source locus families where this framework API can be applied. */
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  /** Source-operation family for this framework API. */
  readonly operationKind: AppBuilderPartOperationKind;
  /** Slots required before this API can lower to source. */
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Optional slots this API may accept for richer source generation. */
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
}

export const APP_BUILDER_FRAMEWORK_APIS: readonly AppBuilderFrameworkApiDescriptor[] = [
  {
    id: AppBuilderFrameworkApiId.CustomElementDecorator,
    title: 'Custom Element Decorator',
    summary: 'Declare custom-element resource metadata through Aurelia\'s `@customElement(...)` decorator.',
    moduleSpecifier: 'aurelia',
    exportName: 'customElement',
    syntaxCue: '@customElement({ name: ... })',
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptDecorator],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkApi,
    requiredSlotKinds: [AppBuilderPartSlotKind.CustomElementResourceName],
    optionalSlotKinds: [
      AppBuilderPartSlotKind.ResourceTemplateExpression,
      AppBuilderPartSlotKind.ResourceDependencyExpressionList,
    ],
  },
  {
    id: AppBuilderFrameworkApiId.CustomElementStaticAuDefinition,
    title: 'Custom Element Static $au Definition',
    summary: 'Declare custom-element resource metadata through Aurelia static `$au` class metadata.',
    moduleSpecifier: '@aurelia/runtime-html',
    exportName: 'CustomElementStaticAuDefinition',
    syntaxCue: 'static readonly $au = { type: ... }',
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkApi,
    requiredSlotKinds: [AppBuilderPartSlotKind.CustomElementResourceName],
    optionalSlotKinds: [
      AppBuilderPartSlotKind.ResourceTemplateExpression,
      AppBuilderPartSlotKind.ResourceDependencyExpressionList,
    ],
  },
  {
    id: AppBuilderFrameworkApiId.CustomElementDefineCall,
    title: 'Custom Element Define Call',
    summary: 'Declare custom-element resource metadata through Aurelia `CustomElement.define(...)`.',
    moduleSpecifier: 'aurelia',
    exportName: 'CustomElement',
    syntaxCue: 'CustomElement.define({ name: ... }, Type)',
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptExpression],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkApi,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.CustomElementResourceName,
      AppBuilderPartSlotKind.ResourceTypeExpression,
    ],
    optionalSlotKinds: [
      AppBuilderPartSlotKind.ResourceTemplateExpression,
      AppBuilderPartSlotKind.ResourceDependencyExpressionList,
    ],
  },
  ...namedResourceFrameworkApiDescriptors({
    resourceKind: ResourceDefinitionKind.CustomAttribute,
    titlePrefix: 'Custom Attribute',
    summaryNoun: 'custom-attribute',
    decoratorId: AppBuilderFrameworkApiId.CustomAttributeDecorator,
    staticAuId: AppBuilderFrameworkApiId.CustomAttributeStaticAuDefinition,
    defineCallId: AppBuilderFrameworkApiId.CustomAttributeDefineCall,
    decoratorExportName: 'customAttribute',
    staticAuExportName: 'CustomAttributeStaticAuDefinition',
    staticAuModuleSpecifier: '@aurelia/runtime-html',
    defineApiExportName: 'CustomAttribute',
    optionalSlotKinds: [AppBuilderPartSlotKind.ResourceDependencyExpressionList],
  }),
  ...namedResourceFrameworkApiDescriptors({
    resourceKind: ResourceDefinitionKind.TemplateController,
    titlePrefix: 'Template Controller',
    summaryNoun: 'template-controller',
    decoratorId: AppBuilderFrameworkApiId.TemplateControllerDecorator,
    staticAuId: AppBuilderFrameworkApiId.TemplateControllerStaticAuDefinition,
    defineCallId: AppBuilderFrameworkApiId.TemplateControllerDefineCall,
    decoratorExportName: 'templateController',
    staticAuExportName: 'CustomAttributeStaticAuDefinition',
    staticAuModuleSpecifier: '@aurelia/runtime-html',
    defineApiExportName: 'CustomAttribute',
    optionalSlotKinds: [AppBuilderPartSlotKind.ResourceDependencyExpressionList],
  }),
  ...namedResourceFrameworkApiDescriptors({
    resourceKind: ResourceDefinitionKind.ValueConverter,
    titlePrefix: 'Value Converter',
    summaryNoun: 'value-converter',
    decoratorId: AppBuilderFrameworkApiId.ValueConverterDecorator,
    staticAuId: AppBuilderFrameworkApiId.ValueConverterStaticAuDefinition,
    defineCallId: AppBuilderFrameworkApiId.ValueConverterDefineCall,
    decoratorExportName: 'valueConverter',
    staticAuExportName: 'ValueConverterStaticAuDefinition',
    staticAuModuleSpecifier: '@aurelia/runtime-html',
    defineApiExportName: 'ValueConverter',
    optionalSlotKinds: [],
  }),
  ...namedResourceFrameworkApiDescriptors({
    resourceKind: ResourceDefinitionKind.BindingBehavior,
    titlePrefix: 'Binding Behavior',
    summaryNoun: 'binding-behavior',
    decoratorId: AppBuilderFrameworkApiId.BindingBehaviorDecorator,
    staticAuId: AppBuilderFrameworkApiId.BindingBehaviorStaticAuDefinition,
    defineCallId: AppBuilderFrameworkApiId.BindingBehaviorDefineCall,
    decoratorExportName: 'bindingBehavior',
    staticAuExportName: 'BindingBehaviorStaticAuDefinition',
    staticAuModuleSpecifier: '@aurelia/runtime-html',
    defineApiExportName: 'BindingBehavior',
    optionalSlotKinds: [],
  }),
  ...namedResourceFrameworkApiDescriptors({
    resourceKind: ResourceDefinitionKind.BindingCommand,
    titlePrefix: 'Binding Command',
    summaryNoun: 'binding-command',
    decoratorId: AppBuilderFrameworkApiId.BindingCommandDecorator,
    staticAuId: AppBuilderFrameworkApiId.BindingCommandStaticAuDefinition,
    defineCallId: AppBuilderFrameworkApiId.BindingCommandDefineCall,
    decoratorExportName: 'bindingCommand',
    staticAuExportName: 'BindingCommandStaticAuDefinition',
    staticAuModuleSpecifier: '@aurelia/template-compiler',
    defineApiExportName: 'BindingCommand',
    optionalSlotKinds: [],
  }),
  {
    id: AppBuilderFrameworkApiId.AttributePatternCreate,
    title: 'Attribute Pattern Create',
    summary: 'Declare attribute-pattern syntax resources through Aurelia `AttributePattern.create(...)`.',
    moduleSpecifier: 'aurelia',
    exportName: 'AttributePattern',
    syntaxCue: 'AttributePattern.create([{ pattern: ... }], Type)',
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptExpression],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkApi,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.AttributePatternDefinitionExpressionList,
      AppBuilderPartSlotKind.ResourceTypeExpression,
    ],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderFrameworkApiId.RouteDecorator,
    title: 'Route Decorator',
    summary: 'Declare router route configuration through @aurelia/router `@route(...)`.',
    moduleSpecifier: '@aurelia/router',
    exportName: 'route',
    syntaxCue: '@route({ routes: [...] })',
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptDecorator],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkApi,
    requiredSlotKinds: [AppBuilderPartSlotKind.RouteConfigurationExpression],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderFrameworkApiId.RouteContextParameterRead,
    title: 'Route Context Parameter Read',
    summary: 'Read typed route and query parameters from the current @aurelia/router route context.',
    moduleSpecifier: '@aurelia/router',
    exportName: 'IRouteContext',
    syntaxCue: 'resolve(IRouteContext).getRouteParameters<...>()',
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptExpression],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkApi,
    requiredSlotKinds: [AppBuilderPartSlotKind.RouteParameterType],
    optionalSlotKinds: [
      AppBuilderPartSlotKind.RouteContextReceiverExpression,
      AppBuilderPartSlotKind.RouteParameterMergeStrategy,
      AppBuilderPartSlotKind.RouteIncludeQueryParams,
    ],
  },
  {
    id: AppBuilderFrameworkApiId.FromStateDecorator,
    title: 'From State Decorator',
    summary: 'Project a configured @aurelia/state store selector into a field or setter through `@fromState(...)`.',
    moduleSpecifier: '@aurelia/state',
    exportName: 'fromState',
    syntaxCue: '@fromState(state => state.items)',
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptDecorator],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkApi,
    requiredSlotKinds: [AppBuilderPartSlotKind.StateSelectorExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.StateStoreName],
  },
  {
    id: AppBuilderFrameworkApiId.ComputedDecorator,
    title: 'Computed Decorator',
    summary: 'Declare explicit computed getter/method dependencies when automatic proxy observation is not sufficient or desired.',
    moduleSpecifier: 'aurelia',
    exportName: 'computed',
    syntaxCue: '@computed({ deps: [...] })',
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptDecorator],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkApi,
    requiredSlotKinds: [AppBuilderPartSlotKind.ComputedDecoratorArgumentExpression],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderFrameworkApiId.AppTaskRegistration,
    title: 'App Task Registration',
    summary: 'Create an app-level lifecycle task registry expression for an Aurelia application entrypoint.',
    moduleSpecifier: 'aurelia',
    exportName: 'AppTask',
    syntaxCue: 'AppTask.activated(() => ...)',
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptExpression],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkApi,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.AppTaskSlotName,
      AppBuilderPartSlotKind.AppTaskCallbackExpression,
    ],
    optionalSlotKinds: [AppBuilderPartSlotKind.AppTaskKeyExpression],
  },
];

/** Slot that carries the resource name for a named-resource framework API part. */
export function appBuilderNamedResourceNameSlotKind(
  resourceKind: NamedResourceDefinitionKind,
): AppBuilderPartSlotKind.CustomElementResourceName | AppBuilderPartSlotKind.ResourceName {
  return resourceKind === ResourceDefinitionKind.CustomElement
    ? AppBuilderPartSlotKind.CustomElementResourceName
    : AppBuilderPartSlotKind.ResourceName;
}

interface NamedResourceFrameworkApiDescriptorRequest {
  readonly resourceKind: NamedResourceDefinitionKind;
  readonly titlePrefix: string;
  readonly summaryNoun: string;
  readonly decoratorId: AppBuilderFrameworkApiId;
  readonly staticAuId: AppBuilderFrameworkApiId;
  readonly defineCallId: AppBuilderFrameworkApiId;
  readonly decoratorExportName: string;
  readonly staticAuExportName: string;
  readonly staticAuModuleSpecifier: string;
  readonly defineApiExportName: string;
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
}

function namedResourceFrameworkApiDescriptors(
  request: NamedResourceFrameworkApiDescriptorRequest,
): readonly AppBuilderFrameworkApiDescriptor[] {
  const requiredResourceNameSlot = appBuilderNamedResourceNameSlotKind(request.resourceKind);
  return [
    {
      id: request.decoratorId,
      title: `${request.titlePrefix} Decorator`,
      summary: `Declare ${request.summaryNoun} resource metadata through Aurelia's \`@${request.decoratorExportName}(...)\` decorator.`,
      moduleSpecifier: 'aurelia',
      exportName: request.decoratorExportName,
      syntaxCue: `@${request.decoratorExportName}({ name: ... })`,
      applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptDecorator],
      operationKind: AppBuilderPartOperationKind.ApplyFrameworkApi,
      requiredSlotKinds: [requiredResourceNameSlot],
      optionalSlotKinds: request.optionalSlotKinds,
    },
    {
      id: request.staticAuId,
      title: `${request.titlePrefix} Static $au Definition`,
      summary: `Declare ${request.summaryNoun} resource metadata through Aurelia static \`$au\` class metadata.`,
      moduleSpecifier: request.staticAuModuleSpecifier,
      exportName: request.staticAuExportName,
      syntaxCue: 'static readonly $au = { type: ... }',
      applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
      operationKind: AppBuilderPartOperationKind.ApplyFrameworkApi,
      requiredSlotKinds: [requiredResourceNameSlot],
      optionalSlotKinds: request.optionalSlotKinds,
    },
    {
      id: request.defineCallId,
      title: `${request.titlePrefix} Define Call`,
      summary: `Declare ${request.summaryNoun} resource metadata through Aurelia \`${request.defineApiExportName}.define(...)\`.`,
      moduleSpecifier: 'aurelia',
      exportName: request.defineApiExportName,
      syntaxCue: `${request.defineApiExportName}.define({ name: ... }, Type)`,
      applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptExpression],
      operationKind: AppBuilderPartOperationKind.ApplyFrameworkApi,
      requiredSlotKinds: [
        requiredResourceNameSlot,
        AppBuilderPartSlotKind.ResourceTypeExpression,
      ],
      optionalSlotKinds: request.optionalSlotKinds,
    },
  ];
}

/** Package dependency needed before this framework API can be imported in generated source. */
export function appBuilderFrameworkApiDependency(
  api: AppBuilderFrameworkApiDescriptor,
): string {
  return api.moduleSpecifier;
}

/** Look up a framework API descriptor by id. */
export function appBuilderFrameworkApiDescriptor(id: AppBuilderFrameworkApiId): AppBuilderFrameworkApiDescriptor {
  const api = APP_BUILDER_FRAMEWORK_APIS.find((candidate) => candidate.id === id);
  if (api == null) {
    throw new Error(`Unknown app-builder framework API '${id}'.`);
  }
  return api;
}
