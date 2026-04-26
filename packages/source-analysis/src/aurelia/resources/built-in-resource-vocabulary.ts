import { auLink } from '../au-link.js';

@auLink('runtime-html:AuCompose')
export class AuCompose {
  readonly kind = 'custom-element-vocabulary' as const;
  readonly resourceKind = 'custom-element' as const;
  readonly name = 'au-compose' as const;
}

@auLink('runtime-html:AuSlot')
export class AuSlot {
  readonly kind = 'custom-element-vocabulary' as const;
  readonly resourceKind = 'custom-element' as const;
  readonly name = 'au-slot' as const;
}

@auLink('runtime-html:If')
export class If {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'if' as const;
}

@auLink('runtime-html:Else')
export class Else {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'else' as const;
}

@auLink('runtime-html:Portal')
export class Portal {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'portal' as const;
}

@auLink('runtime-html:Repeat')
export class Repeat {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'repeat' as const;
}

@auLink('runtime-html:Switch')
export class Switch {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'switch' as const;
}

@auLink('runtime-html:Case')
export class Case {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'case' as const;
}

@auLink('runtime-html:DefaultCase')
export class DefaultCase {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'default-case' as const;
}

@auLink('runtime-html:With')
export class With {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'with' as const;
}

@auLink('runtime-html:PromiseTemplateController')
export class PromiseTemplateController {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'promise' as const;
}

@auLink('runtime-html:PendingTemplateController')
export class PendingTemplateController {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'pending' as const;
}

@auLink('runtime-html:FulfilledTemplateController')
export class FulfilledTemplateController {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'then' as const;
}

@auLink('runtime-html:RejectedTemplateController')
export class RejectedTemplateController {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'catch' as const;
}

@auLink('ui-virtualization:VirtualRepeat')
export class VirtualRepeat {
  readonly kind = 'template-controller-vocabulary' as const;
  readonly resourceKind = 'template-controller' as const;
  readonly name = 'virtual-repeat' as const;
}

@auLink('runtime-html:PromiseAttributePattern')
export class PromiseAttributePattern {
  readonly kind = 'attribute-pattern-vocabulary' as const;
  readonly resourceKind = 'attribute-pattern' as const;
  readonly patterns = ['promise.resolve'] as const;
  readonly symbols = ['.'] as const;
}

@auLink('runtime-html:FulfilledAttributePattern')
export class FulfilledAttributePattern {
  readonly kind = 'attribute-pattern-vocabulary' as const;
  readonly resourceKind = 'attribute-pattern' as const;
  readonly patterns = ['then'] as const;
  readonly symbols = [] as const;
}

@auLink('runtime-html:RejectedAttributePattern')
export class RejectedAttributePattern {
  readonly kind = 'attribute-pattern-vocabulary' as const;
  readonly resourceKind = 'attribute-pattern' as const;
  readonly patterns = ['catch'] as const;
  readonly symbols = [] as const;
}

@auLink('template-compiler:DotSeparatedAttributePattern')
export class DotSeparatedAttributePattern {
  readonly kind = 'attribute-pattern-vocabulary' as const;
  readonly resourceKind = 'attribute-pattern' as const;
  readonly patterns = ['PART.PART', 'PART.PART.PART'] as const;
  readonly symbols = ['.'] as const;
}

@auLink('template-compiler:RefAttributePattern')
export class RefAttributePattern {
  readonly kind = 'attribute-pattern-vocabulary' as const;
  readonly resourceKind = 'attribute-pattern' as const;
  readonly patterns = ['ref', 'PART.ref'] as const;
  readonly symbols = ['.'] as const;
}

@auLink('template-compiler:EventAttributePattern')
export class EventAttributePattern {
  readonly kind = 'attribute-pattern-vocabulary' as const;
  readonly resourceKind = 'attribute-pattern' as const;
  readonly patterns = ['PART.trigger:PART', 'PART.capture:PART'] as const;
  readonly symbols = ['.', ':'] as const;
}

@auLink('template-compiler:ColonPrefixedBindAttributePattern')
export class ColonPrefixedBindAttributePattern {
  readonly kind = 'attribute-pattern-vocabulary' as const;
  readonly resourceKind = 'attribute-pattern' as const;
  readonly patterns = [':PART'] as const;
  readonly symbols = [':'] as const;
}

@auLink('template-compiler:AtPrefixedTriggerAttributePattern')
export class AtPrefixedTriggerAttributePattern {
  readonly kind = 'attribute-pattern-vocabulary' as const;
  readonly resourceKind = 'attribute-pattern' as const;
  readonly patterns = ['@PART', '@PART:PART'] as const;
  readonly symbols = ['@', ':'] as const;
}

@auLink('template-compiler:OneTimeBindingCommand')
export class OneTimeBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'one-time' as const;
}

@auLink('template-compiler:ToViewBindingCommand')
export class ToViewBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'to-view' as const;
}

@auLink('template-compiler:FromViewBindingCommand')
export class FromViewBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'from-view' as const;
}

@auLink('template-compiler:TwoWayBindingCommand')
export class TwoWayBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'two-way' as const;
}

@auLink('template-compiler:DefaultBindingCommand')
export class DefaultBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'bind' as const;
}

@auLink('template-compiler:ForBindingCommand')
export class ForBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'for' as const;
}

@auLink('template-compiler:TriggerBindingCommand')
export class TriggerBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'trigger' as const;
}

@auLink('template-compiler:CaptureBindingCommand')
export class CaptureBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'capture' as const;
}

@auLink('template-compiler:AttrBindingCommand')
export class AttrBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'attr' as const;
}

@auLink('template-compiler:StyleBindingCommand')
export class StyleBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'style' as const;
}

@auLink('template-compiler:ClassBindingCommand')
export class ClassBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'class' as const;
}

@auLink('template-compiler:RefBindingCommand')
export class RefBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'ref' as const;
}

@auLink('template-compiler:SpreadValueBindingCommand')
export class SpreadValueBindingCommand {
  readonly kind = 'binding-command-vocabulary' as const;
  readonly resourceKind = 'binding-command' as const;
  readonly name = 'spread' as const;
}
