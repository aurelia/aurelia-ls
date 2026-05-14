export type PackageId =
  | 'kernel'
  | 'runtime'
  | 'runtime-html'
  | 'template-compiler'
  | 'expression-parser'
  | 'i18n'
  | 'state'
  | 'validation-html'
  | 'router'
  | 'route-recognizer';

export type AuLinkFacet =
  | 'resource-definition'
  | 'binding-behavior-semantics'
  | 'value-converter-semantics'
  | 'template-controller-semantics'
  | 'validation-controller-semantics'
  | 'router-runtime-model';

export interface AuLinkOptions {
  readonly facet?: AuLinkFacet;
}

/**
 * Pure marker decorator that lets Atlas correlate new analysis substrate boundaries with the Aurelia runtime.
 *
 * Keep this catalog small while the compiler model is being rebuilt. Old mirror-era placements should not be
 * treated as semantic ground truth for new materializers.
 */
export function auLink(id: 'kernel:Container'): ClassDecorator;
export function auLink(id: 'kernel:ContainerConfiguration'): ClassDecorator;
export function auLink(id: 'kernel:Resolver'): ClassDecorator;
export function auLink(id: 'kernel:InstanceProvider'): ClassDecorator;
export function auLink(id: 'kernel:ParameterizedRegistry'): ClassDecorator;
export function auLink(id: 'kernel:IRegistry'): ClassDecorator;
export function auLink(id: 'kernel:IModuleLoader'): ClassDecorator;
export function auLink(id: 'kernel:ModuleLoader'): ClassDecorator;
export function auLink(id: 'kernel:AnalyzedModule'): ClassDecorator;
export function auLink(id: 'kernel:ModuleItem'): ClassDecorator;
export function auLink(id: 'runtime:Scope'): ClassDecorator;
export function auLink(id: 'runtime:BindingContext'): ClassDecorator;
export function auLink(id: 'runtime:IOverrideContext'): ClassDecorator;
export function auLink(id: 'runtime:IEffect'): ClassDecorator;
export function auLink(id: 'runtime:IObserverLocator'): ClassDecorator;
export function auLink(id: 'runtime:ObserverLocator'): ClassDecorator;
export function auLink(id: 'runtime:PropertyAccessor'): ClassDecorator;
export function auLink(id: 'runtime:SetterObserver'): ClassDecorator;
export function auLink(id: 'runtime:ComputedObserver'): ClassDecorator;
export function auLink(id: 'runtime:CollectionLengthObserver'): ClassDecorator;
export function auLink(id: 'runtime:CollectionSizeObserver'): ClassDecorator;
export function auLink(id: 'runtime:ArrayIndexObserver'): ClassDecorator;
export function auLink(id: 'runtime:astEvaluate'): ClassDecorator;
export function auLink(id: 'runtime-html:Aurelia'): ClassDecorator;
export function auLink(id: 'runtime-html:AppRoot'): ClassDecorator;
export function auLink(id: 'runtime-html:IAppRootConfig'): ClassDecorator;
export function auLink(id: 'runtime-html:IAppTask'): ClassDecorator;
export function auLink(id: 'runtime-html:IController'): ClassDecorator;
export function auLink(id: 'runtime-html:IComponentController'): ClassDecorator;
export function auLink(id: 'runtime-html:IHydratableController'): ClassDecorator;
export function auLink(id: 'runtime-html:ISyntheticView'): ClassDecorator;
export function auLink(id: 'runtime-html:IViewFactory'): ClassDecorator;
export function auLink(id: 'runtime-html:ICustomAttributeController'): ClassDecorator;
export function auLink(id: 'runtime-html:IDryCustomElementController'): ClassDecorator;
export function auLink(id: 'runtime-html:IContextualCustomElementController'): ClassDecorator;
export function auLink(id: 'runtime-html:ICompiledCustomElementController'): ClassDecorator;
export function auLink(id: 'runtime-html:ICustomElementController'): ClassDecorator;
export function auLink(id: 'runtime-html:CustomElementDefinition'): ClassDecorator;
export function auLink(id: 'runtime-html:CustomAttributeDefinition'): ClassDecorator;
export function auLink(id: 'runtime-html:BindableDefinition'): ClassDecorator;
export function auLink(id: 'runtime-html:WatchDefinition'): ClassDecorator;
export function auLink(id: 'runtime-html:ValueConverterDefinition'): ClassDecorator;
export function auLink(id: 'runtime-html:BindingBehaviorDefinition'): ClassDecorator;
export function auLink(id: 'runtime-html:DebounceBindingBehavior'): ClassDecorator;
export function auLink(id: 'runtime-html:OneTimeBindingBehavior'): ClassDecorator;
export function auLink(id: 'runtime-html:ToViewBindingBehavior'): ClassDecorator;
export function auLink(id: 'runtime-html:FromViewBindingBehavior'): ClassDecorator;
export function auLink(id: 'runtime-html:SignalBindingBehavior'): ClassDecorator;
export function auLink(id: 'runtime-html:ThrottleBindingBehavior'): ClassDecorator;
export function auLink(id: 'runtime-html:TwoWayBindingBehavior'): ClassDecorator;
export function auLink(id: 'runtime-html:AttrBindingBehavior'): ClassDecorator;
export function auLink(id: 'runtime-html:SelfBindingBehavior'): ClassDecorator;
export function auLink(id: 'runtime-html:UpdateTriggerBindingBehavior'): ClassDecorator;
export function auLink(id: 'runtime-html:SanitizeValueConverter'): ClassDecorator;
export function auLink(id: 'runtime-html:If'): ClassDecorator;
export function auLink(id: 'runtime-html:Else'): ClassDecorator;
export function auLink(id: 'runtime-html:Repeat'): ClassDecorator;
export function auLink(id: 'runtime-html:With'): ClassDecorator;
export function auLink(id: 'runtime-html:Switch'): ClassDecorator;
export function auLink(id: 'runtime-html:Case'): ClassDecorator;
export function auLink(id: 'runtime-html:DefaultCase'): ClassDecorator;
export function auLink(id: 'runtime-html:PromiseTemplateController'): ClassDecorator;
export function auLink(id: 'runtime-html:PendingTemplateController'): ClassDecorator;
export function auLink(id: 'runtime-html:FulfilledTemplateController'): ClassDecorator;
export function auLink(id: 'runtime-html:RejectedTemplateController'): ClassDecorator;
export function auLink(id: 'runtime-html:AuCompose'): ClassDecorator;
export function auLink(id: 'runtime-html:Portal'): ClassDecorator;
export function auLink(id: 'runtime-html:Focus'): ClassDecorator;
export function auLink(id: 'runtime-html:Show'): ClassDecorator;
export function auLink(id: 'runtime-html:AuSlot'): ClassDecorator;
export function auLink(id: 'runtime-html:PromiseAttributePattern'): ClassDecorator;
export function auLink(id: 'runtime-html:FulfilledAttributePattern'): ClassDecorator;
export function auLink(id: 'runtime-html:RejectedAttributePattern'): ClassDecorator;
export function auLink(id: 'runtime-html:ResourceResolver'): ClassDecorator;
export function auLink(id: 'runtime-html:Rendering'): ClassDecorator;
export function auLink(id: 'runtime-html:SetPropertyRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:CustomElementRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:CustomAttributeRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:TemplateControllerRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:LetElementRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:RefBindingRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:InterpolationBindingRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:PropertyBindingRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:IteratorBindingRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:TextBindingRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:ListenerBindingRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:SetAttributeRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:SetClassAttributeRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:SetStyleAttributeRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:StylePropertyBindingRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:AttributeBindingRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:SpreadRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:SpreadValueRenderer'): ClassDecorator;
export function auLink(id: 'runtime-html:PropertyBinding'): ClassDecorator;
export function auLink(id: 'runtime-html:AttributeBinding'): ClassDecorator;
export function auLink(id: 'runtime-html:LetBinding'): ClassDecorator;
export function auLink(id: 'runtime-html:ListenerBinding'): ClassDecorator;
export function auLink(id: 'runtime-html:InterpolationBinding'): ClassDecorator;
export function auLink(id: 'runtime-html:RefBinding'): ClassDecorator;
export function auLink(id: 'runtime-html:ContentBinding'): ClassDecorator;
export function auLink(id: 'runtime-html:SpreadBinding'): ClassDecorator;
export function auLink(id: 'runtime-html:SpreadValueBinding'): ClassDecorator;
export function auLink(id: 'runtime-html:NodeObserverLocator'): ClassDecorator;
export function auLink(id: 'runtime-html:DataAttributeAccessor'): ClassDecorator;
export function auLink(id: 'runtime-html:ValueAttributeObserver'): ClassDecorator;
export function auLink(id: 'runtime-html:CheckedObserver'): ClassDecorator;
export function auLink(id: 'runtime-html:SelectValueObserver'): ClassDecorator;
export function auLink(id: 'template-compiler:BindingCommandDefinition'): ClassDecorator;
export function auLink(id: 'template-compiler:AttributePatternDefinition'): ClassDecorator;
export function auLink(id: 'template-compiler:AttributePattern'): ClassDecorator;
export function auLink(id: 'template-compiler:DotSeparatedAttributePattern'): ClassDecorator;
export function auLink(id: 'template-compiler:RefAttributePattern'): ClassDecorator;
export function auLink(id: 'template-compiler:EventAttributePattern'): ClassDecorator;
export function auLink(id: 'template-compiler:ColonPrefixedBindAttributePattern'): ClassDecorator;
export function auLink(id: 'template-compiler:AtPrefixedTriggerAttributePattern'): ClassDecorator;
export function auLink(id: 'template-compiler:TemplateCompiler'): ClassDecorator;
export function auLink(id: 'template-compiler:CompilationContext'): ClassDecorator;
export function auLink(id: 'template-compiler:ICompiledElementComponentDefinition'): ClassDecorator;
export function auLink(id: 'template-compiler:IElementBindablesInfo'): ClassDecorator;
export function auLink(id: 'template-compiler:IAttributeBindablesInfo'): ClassDecorator;
export function auLink(id: 'template-compiler:IAttributeParser'): ClassDecorator;
export function auLink(id: 'template-compiler:IAttributePattern'): ClassDecorator;
export function auLink(id: 'template-compiler:SyntaxInterpreter'): ClassDecorator;
export function auLink(id: 'template-compiler:CompiledPattern'): ClassDecorator;
export function auLink(id: 'template-compiler:AttrSyntax'): ClassDecorator;
export function auLink(id: 'template-compiler:IBindingCommandResolver'): ClassDecorator;
export function auLink(id: 'template-compiler:BindingCommandInstance'): ClassDecorator;
export function auLink(id: 'template-compiler:ICommandBuildInfo'): ClassDecorator;
export function auLink(id: 'runtime-html:AttrMapper'): ClassDecorator;
export function auLink(id: 'expression-parser:IExpressionParser'): ClassDecorator;
export function auLink(id: 'expression-parser:ExpressionParser'): ClassDecorator;
export function auLink(id: 'expression-parser:AccessThisExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:AccessBoundaryExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:AccessGlobalExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:AccessScopeExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:ArrayLiteralExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:ObjectLiteralExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:PrimitiveLiteralExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:NewExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:TemplateExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:UnaryExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:CallScopeExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:CallMemberExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:CallFunctionExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:CallGlobalExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:AccessMemberExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:AccessKeyedExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:TaggedTemplateExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:BinaryExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:ConditionalExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:AssignExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:ArrowFunction'): ClassDecorator;
export function auLink(id: 'expression-parser:ValueConverterExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:BindingBehaviorExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:ArrayBindingPattern'): ClassDecorator;
export function auLink(id: 'expression-parser:ObjectBindingPattern'): ClassDecorator;
export function auLink(id: 'expression-parser:BindingIdentifier'): ClassDecorator;
export function auLink(id: 'expression-parser:ForOfStatement'): ClassDecorator;
export function auLink(id: 'expression-parser:Interpolation'): ClassDecorator;
export function auLink(id: 'expression-parser:DestructuringAssignmentExpression'): ClassDecorator;
export function auLink(id: 'expression-parser:CustomExpression'): ClassDecorator;
export function auLink(id: 'template-compiler:DefaultBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:OneTimeBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:FromViewBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:ToViewBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:TwoWayBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:ForBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:RefBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:TriggerBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:CaptureBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:ClassBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:StyleBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:AttrBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:SpreadValueBindingCommand'): ClassDecorator;
export function auLink(id: 'template-compiler:InterpolationInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:PropertyBindingInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:IteratorBindingInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:RefBindingInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:SetPropertyInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:MultiAttrInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:HydrateElementInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:HydrateAttributeInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:HydrateTemplateController'): ClassDecorator;
export function auLink(id: 'template-compiler:HydrateLetElementInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:LetBindingInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:TextBindingInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:ListenerBindingInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:StylePropertyBindingInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:SetAttributeInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:SetClassAttributeInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:SetStyleAttributeInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:AttributeBindingInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:SpreadTransferedBindingInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:SpreadElementPropBindingInstruction'): ClassDecorator;
export function auLink(id: 'template-compiler:SpreadValueBindingInstruction'): ClassDecorator;
export function auLink(id: 'i18n:TranslationBindingInstruction'): ClassDecorator;
export function auLink(id: 'i18n:TranslationBindBindingInstruction'): ClassDecorator;
export function auLink(id: 'i18n:TranslationParametersBindingInstruction'): ClassDecorator;
export function auLink(id: 'i18n:TranslationBindingRenderer'): ClassDecorator;
export function auLink(id: 'i18n:TranslationBindBindingRenderer'): ClassDecorator;
export function auLink(id: 'i18n:TranslationParametersBindingRenderer'): ClassDecorator;
export function auLink(id: 'i18n:TranslationBinding'): ClassDecorator;
export function auLink(id: 'i18n:TranslationValueConverter'): ClassDecorator;
export function auLink(id: 'i18n:TranslationBindingBehavior'): ClassDecorator;
export function auLink(id: 'i18n:DateFormatValueConverter'): ClassDecorator;
export function auLink(id: 'i18n:DateFormatBindingBehavior'): ClassDecorator;
export function auLink(id: 'i18n:NumberFormatValueConverter'): ClassDecorator;
export function auLink(id: 'i18n:NumberFormatBindingBehavior'): ClassDecorator;
export function auLink(id: 'i18n:RelativeTimeValueConverter'): ClassDecorator;
export function auLink(id: 'i18n:RelativeTimeBindingBehavior'): ClassDecorator;
export function auLink(id: 'i18n:TranslationParametersAttributePattern'): ClassDecorator;
export function auLink(id: 'i18n:TranslationBindingCommand'): ClassDecorator;
export function auLink(id: 'i18n:TranslationBindBindingCommand'): ClassDecorator;
export function auLink(id: 'i18n:TranslationParametersBindingCommand'): ClassDecorator;
export function auLink(id: 'state:StateBindingBehavior'): ClassDecorator;
export function auLink(id: 'state:StateAttributePattern'): ClassDecorator;
export function auLink(id: 'state:StateBindingCommand'): ClassDecorator;
export function auLink(id: 'state:DispatchBindingCommand'): ClassDecorator;
export function auLink(id: 'state:StateBindingInstruction'): ClassDecorator;
export function auLink(id: 'state:DispatchBindingInstruction'): ClassDecorator;
export function auLink(id: 'state:StateBindingInstructionRenderer'): ClassDecorator;
export function auLink(id: 'state:DispatchBindingInstructionRenderer'): ClassDecorator;
export function auLink(id: 'state:StateBinding'): ClassDecorator;
export function auLink(id: 'state:StateDispatchBinding'): ClassDecorator;
export function auLink(id: 'validation-html:ValidateBindingBehavior'): ClassDecorator;
export function auLink(id: 'validation-html:ValidationController'): ClassDecorator;
export function auLink(id: 'validation-html:ValidationErrorsCustomAttribute'): ClassDecorator;
export function auLink(id: 'validation-html:ValidationContainerCustomElement'): ClassDecorator;
export function auLink(id: 'router:RouterRegistration'): ClassDecorator;
export function auLink(id: 'router:RouterConfiguration'): ClassDecorator;
export function auLink(id: 'router:IRouterOptions'): ClassDecorator;
export function auLink(id: 'router:RouterOptions'): ClassDecorator;
export function auLink(id: 'router:IRouter'): ClassDecorator;
export function auLink(id: 'router:Router'): ClassDecorator;
export function auLink(id: 'router:IContextRouter'): ClassDecorator;
export function auLink(id: 'router:ContextRouter'): ClassDecorator;
export function auLink(id: 'router:ICurrentRoute'): ClassDecorator;
export function auLink(id: 'router:CurrentRoute'): ClassDecorator;
export function auLink(id: 'router:IRouteContext'): ClassDecorator;
export function auLink(id: 'router:RouteContext'): ClassDecorator;
export function auLink(id: 'router:RouteConfigContext'): ClassDecorator;
export function auLink(id: 'router:RouteConfig'): ClassDecorator;
export function auLink(id: 'router:RouteableComponent'): ClassDecorator;
export function auLink(id: 'router:RouteNode'): ClassDecorator;
export function auLink(id: 'router:RouteTree'): ClassDecorator;
export function auLink(id: 'router:ViewportInstruction'): ClassDecorator;
export function auLink(id: 'router:ViewportInstructionTree'): ClassDecorator;
export function auLink(id: 'router:TypedNavigationInstruction'): ClassDecorator;
export function auLink(id: 'router:ViewportRequest'): ClassDecorator;
export function auLink(id: 'router:ViewportAgent'): ClassDecorator;
export function auLink(id: 'router:ComponentAgent'): ClassDecorator;
export function auLink(id: 'router:HrefCustomAttribute'): ClassDecorator;
export function auLink(id: 'router:LoadCustomAttribute'): ClassDecorator;
export function auLink(id: 'router:ViewportCustomElement'): ClassDecorator;
export function auLink(id: 'route-recognizer:RouteRecognizer'): ClassDecorator;
export function auLink(id: 'route-recognizer:ConfigurableRoute'): ClassDecorator;
export function auLink(id: 'route-recognizer:Endpoint'): ClassDecorator;
export function auLink(id: 'route-recognizer:State'): ClassDecorator;
export function auLink(id: 'route-recognizer:RecognizedRoute'): ClassDecorator;
export function auLink(id: 'route-recognizer:Parameter'): ClassDecorator;
export function auLink(id: 'route-recognizer:StaticSegment'): ClassDecorator;
export function auLink(id: 'route-recognizer:DynamicSegment'): ClassDecorator;
export function auLink(id: 'route-recognizer:StarSegment'): ClassDecorator;
export function auLink(id: `${PackageId}:${string}`, options?: AuLinkOptions): ClassDecorator;
export function auLink(
  _id: `${PackageId}:${string}`,
  _options?: AuLinkOptions,
): ClassDecorator {
  return function <TFunction extends Function>(_target: TFunction): void {
    // Marker only.
  };
}
