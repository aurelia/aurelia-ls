export type PackageId = (
  | 'kernel'
  | 'runtime'
  | 'runtime-html'
  | 'expression-parser'
  | 'template-compiler'
  | 'dialog'
  | 'fetch-client'
  | 'router'
  | 'route-recognizer'
  | 'state'
  | 'ui-virtualization'
  | 'validation'
  | 'validation-html'
  | 'i18n'
  | 'validation-i18n'
);

/**
 * Marker decorator - create a semantic anchor from a build-time implementation to the runtime equivalent of the Aurelia framework that it is meant to emulate.
 */
export function auLink(id: 'kernel:Container', isNavigationRoot: true): ClassDecorator
export function auLink(id: 'kernel:IContainer'): ClassDecorator
export function auLink(id: 'kernel:IServiceLocator'): ClassDecorator
export function auLink(id: 'kernel:DI'): ClassDecorator
export function auLink(id: 'kernel:InterfaceSymbol'): ClassDecorator
export function auLink(id: 'kernel:ResolverBuilder'): ClassDecorator
export function auLink(id: 'kernel:Registration'): ClassDecorator
export function auLink(id: 'kernel:IRegistration'): ClassDecorator
export function auLink(id: 'kernel:IRegistry'): ClassDecorator
export function auLink(id: 'kernel:Resolver'): ClassDecorator
export function auLink(id: 'kernel:ResolverStrategy'): ClassDecorator

export function auLink(id: 'kernel:inject'): ClassDecorator
export function auLink(id: 'kernel:resolve'): ClassDecorator
export function auLink(id: 'kernel:all'): ClassDecorator
export function auLink(id: 'kernel:lazy'): ClassDecorator
export function auLink(id: 'kernel:optional'): ClassDecorator
export function auLink(id: 'kernel:factory'): ClassDecorator
export function auLink(id: 'kernel:own'): ClassDecorator
export function auLink(id: 'kernel:newInstanceOf'): ClassDecorator
export function auLink(id: 'kernel:newInstanceForScope'): ClassDecorator
export function auLink(id: 'kernel:resource'): ClassDecorator
export function auLink(id: 'kernel:optionalResource'): ClassDecorator
export function auLink(id: 'kernel:allResources'): ClassDecorator

export function auLink(id: 'runtime-html:Aurelia', isNavigationRoot: true): ClassDecorator
export function auLink(id: 'runtime-html:AppRoot'): ClassDecorator
export function auLink(id: 'runtime-html:AppTask'): ClassDecorator
export function auLink(id: 'runtime-html:fromHydrationContext'): ClassDecorator

export function auLink(id: 'runtime-html:ISyntheticView'): ClassDecorator
export function auLink(id: 'runtime-html:ICustomAttributeController'): ClassDecorator
export function auLink(id: 'runtime-html:IDryCustomElementController'): ClassDecorator
export function auLink(id: 'runtime-html:IContextualCustomElementController'): ClassDecorator
export function auLink(id: 'runtime-html:ICompiledCustomElementController'): ClassDecorator
export function auLink(id: 'runtime-html:ICustomElementController'): ClassDecorator

export function auLink(id: 'runtime-html:Rendering'): ClassDecorator

export function auLink(id: 'runtime-html:CustomElementDefinition'): ClassDecorator
export function auLink(id: 'runtime-html:CustomAttributeDefinition'): ClassDecorator
export function auLink(id: 'runtime-html:BindingBehaviorDefinition'): ClassDecorator
export function auLink(id: 'runtime-html:ValueConverterDefinition'): ClassDecorator

export function auLink(id: 'runtime-html:AuCompose'): ClassDecorator
export function auLink(id: 'runtime-html:AuSlot'): ClassDecorator

export function auLink(id: 'runtime-html:If'): ClassDecorator
export function auLink(id: 'runtime-html:Else'): ClassDecorator
export function auLink(id: 'runtime-html:Portal'): ClassDecorator
export function auLink(id: 'runtime-html:Repeat'): ClassDecorator
export function auLink(id: 'ui-virtualization:VirtualRepeat'): ClassDecorator
export function auLink(id: 'runtime-html:Switch'): ClassDecorator
export function auLink(id: 'runtime-html:Case'): ClassDecorator
export function auLink(id: 'runtime-html:DefaultCase'): ClassDecorator
export function auLink(id: 'runtime-html:With'): ClassDecorator

export function auLink(id: 'runtime-html:PromiseTemplateController'): ClassDecorator
export function auLink(id: 'runtime-html:PendingTemplateController'): ClassDecorator
export function auLink(id: 'runtime-html:FulfilledTemplateController'): ClassDecorator
export function auLink(id: 'runtime-html:RejectedTemplateController'): ClassDecorator

export function auLink(id: 'runtime-html:PromiseAttributePattern'): ClassDecorator
export function auLink(id: 'runtime-html:FulfilledAttributePattern'): ClassDecorator
export function auLink(id: 'runtime-html:RejectedAttributePattern'): ClassDecorator

export function auLink(id: 'runtime-html:AttributeBinding'): ClassDecorator
export function auLink(id: 'runtime-html:ContentBinding'): ClassDecorator
export function auLink(id: 'runtime-html:InterpolationBinding'): ClassDecorator
export function auLink(id: 'runtime-html:LetBinding'): ClassDecorator
export function auLink(id: 'runtime-html:ListenerBinding'): ClassDecorator
export function auLink(id: 'runtime-html:PropertyBinding'): ClassDecorator
export function auLink(id: 'runtime-html:RefBinding'): ClassDecorator
export function auLink(id: 'runtime-html:SpreadBinding'): ClassDecorator

export function auLink(id: 'runtime-html:CustomElementRenderer'): ClassDecorator
export function auLink(id: 'runtime-html:CustomAttributeRenderer'): ClassDecorator
export function auLink(id: 'runtime-html:TemplateControllerRenderer'): ClassDecorator
export function auLink(id: 'runtime-html:LetElementRenderer'): ClassDecorator
export function auLink(id: 'runtime-html:RefBindingRenderer'): ClassDecorator
export function auLink(id: 'runtime-html:InterpolationBindingRenderer'): ClassDecorator
export function auLink(id: 'runtime-html:PropertyBindingRenderer'): ClassDecorator
export function auLink(id: 'runtime-html:IteratorBindingRenderer'): ClassDecorator
export function auLink(id: 'runtime-html:TextBindingRenderer'): ClassDecorator
export function auLink(id: 'runtime-html:ListenerBindingRenderer'): ClassDecorator
export function auLink(id: 'runtime-html:StylePropertyBindingRenderer'): ClassDecorator
export function auLink(id: 'runtime-html:AttributeBindingRenderer'): ClassDecorator
export function auLink(id: 'runtime-html:SpreadRenderer'): ClassDecorator

export function auLink(id: 'template-compiler:TemplateCompiler', isNavigationRoot: true): ClassDecorator
export function auLink(id: 'template-compiler:IAttrMapper'): ClassDecorator

export function auLink(id: 'template-compiler:DotSeparatedAttributePattern'): ClassDecorator
export function auLink(id: 'template-compiler:RefAttributePattern'): ClassDecorator
export function auLink(id: 'template-compiler:EventAttributePattern'): ClassDecorator
export function auLink(id: 'template-compiler:ColonPrefixedBindAttributePattern'): ClassDecorator
export function auLink(id: 'template-compiler:AtPrefixedTriggerAttributePattern'): ClassDecorator

export function auLink(id: 'template-compiler:OneTimeBindingCommand'): ClassDecorator
export function auLink(id: 'template-compiler:ToViewBindingCommand'): ClassDecorator
export function auLink(id: 'template-compiler:FromViewBindingCommand'): ClassDecorator
export function auLink(id: 'template-compiler:TwoWayBindingCommand'): ClassDecorator
export function auLink(id: 'template-compiler:DefaultBindingCommand'): ClassDecorator
export function auLink(id: 'template-compiler:ForBindingCommand'): ClassDecorator
export function auLink(id: 'template-compiler:TriggerBindingCommand'): ClassDecorator
export function auLink(id: 'template-compiler:CaptureBindingCommand'): ClassDecorator
export function auLink(id: 'template-compiler:AttrBindingCommand'): ClassDecorator
export function auLink(id: 'template-compiler:StyleBindingCommand'): ClassDecorator
export function auLink(id: 'template-compiler:ClassBindingCommand'): ClassDecorator
export function auLink(id: 'template-compiler:RefBindingCommand'): ClassDecorator
export function auLink(id: 'template-compiler:SpreadValueBindingCommand'): ClassDecorator

export function auLink(id: 'template-compiler:InterpolationInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:PropertyBindingInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:IteratorBindingInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:RefBindingInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:SetPropertyInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:MultiAttrInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:HydrateElementInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:HydrateAttributeInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:HydrateTemplateController'): ClassDecorator
export function auLink(id: 'template-compiler:HydrateLetElementInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:LetBindingInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:TextBindingInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:ListenerBindingInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:StylePropertyBindingInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:SetAttributeInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:SetClassAttributeInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:SetStyleAttributeInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:AttributeBindingInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:SpreadTransferedBindingInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:SpreadElementPropBindingInstruction'): ClassDecorator
export function auLink(id: 'template-compiler:SpreadValueBindingInstruction'): ClassDecorator

export function auLink(id: 'expression-parser:ExpressionParser', isNavigationRoot: true): ClassDecorator

export function auLink(id: `${PackageId}:${string}`, isNavigationRoot: boolean = false) {
  return function <TFunction extends Function>(target: TFunction): void {
    // Do nothing
  };
}
