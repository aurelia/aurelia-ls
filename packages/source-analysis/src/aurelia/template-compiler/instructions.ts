import type { ForOfStatement, Interpolation, IsBindingBehavior } from '../expression/ast.js';
import { auLink } from '../au-link.js';

export const BINDING_MODES = {
  default: 0,
  oneTime: 1,
  toView: 2,
  fromView: 4,
  twoWay: 6,
} as const;

export type BindingMode = typeof BINDING_MODES[keyof typeof BINDING_MODES];

export const TEMPLATE_INSTRUCTION_TYPE_CODES = {
  hydrateElement: 0,
  hydrateAttribute: 1,
  hydrateTemplateController: 2,
  hydrateLetElement: 3,
  setProperty: 10,
  interpolation: 11,
  propertyBinding: 12,
  letBinding: 13,
  refBinding: 14,
  iteratorBinding: 15,
  multiAttr: 16,
  textBinding: 30,
  listenerBinding: 31,
  attributeBinding: 32,
  stylePropertyBinding: 33,
  setAttribute: 34,
  setClassAttribute: 35,
  setStyleAttribute: 36,
  spreadTransferedBinding: 50,
  spreadElementProp: 51,
  spreadValueBinding: 52,
} as const;

export type TemplateInstructionTypeCode =
  typeof TEMPLATE_INSTRUCTION_TYPE_CODES[keyof typeof TEMPLATE_INSTRUCTION_TYPE_CODES];

export const TEMPLATE_INSTRUCTION_FAMILY_KINDS = [
  'hydration',
  'property-binding',
  'dom-binding',
  'spread',
] as const;

export type TemplateInstructionFamilyKind =
  typeof TEMPLATE_INSTRUCTION_FAMILY_KINDS[number];

export type TemplateCompilerExpressionSeed = string | IsBindingBehavior;
export type TemplateCompilerInterpolationSeed = string | Interpolation;
export type TemplateCompilerLetExpressionSeed =
  | string
  | IsBindingBehavior
  | Interpolation;
export type TemplateCompilerForOfSeed = string | ForOfStatement;
export type TemplateComponentDefinitionSeed = Record<PropertyKey, unknown>;
export type TemplateAttributeSyntaxSeed = Record<PropertyKey, unknown>;

@auLink('template-compiler:InterpolationInstruction')
export class InterpolationInstruction {
  readonly kind = 'interpolation-instruction' as const;
  readonly family = 'property-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.interpolation;

  constructor(
    readonly from: TemplateCompilerInterpolationSeed,
    readonly to: string,
  ) {}
}

@auLink('template-compiler:PropertyBindingInstruction')
export class PropertyBindingInstruction {
  readonly kind = 'property-binding-instruction' as const;
  readonly family = 'property-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.propertyBinding;

  constructor(
    readonly from: TemplateCompilerExpressionSeed,
    readonly to: string,
    readonly mode: BindingMode,
  ) {}
}

@auLink('template-compiler:IteratorBindingInstruction')
export class IteratorBindingInstruction {
  readonly kind = 'iterator-binding-instruction' as const;
  readonly family = 'property-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.iteratorBinding;

  constructor(
    readonly forOf: TemplateCompilerForOfSeed,
    readonly to: string,
    readonly props: readonly MultiAttrInstruction[] = [],
  ) {}
}

@auLink('template-compiler:RefBindingInstruction')
export class RefBindingInstruction {
  readonly kind = 'ref-binding-instruction' as const;
  readonly family = 'property-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.refBinding;

  constructor(
    readonly from: TemplateCompilerExpressionSeed,
    readonly to: string,
  ) {}
}

@auLink('template-compiler:SetPropertyInstruction')
export class SetPropertyInstruction {
  readonly kind = 'set-property-instruction' as const;
  readonly family = 'property-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.setProperty;

  constructor(
    readonly value: unknown,
    readonly to: string,
  ) {}
}

@auLink('template-compiler:MultiAttrInstruction')
export class MultiAttrInstruction {
  readonly kind = 'multi-attr-instruction' as const;
  readonly family = 'property-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.multiAttr;

  constructor(
    readonly value: TemplateCompilerExpressionSeed,
    readonly to: string,
    readonly command: string | null,
  ) {}
}

@auLink('template-compiler:HydrateElementInstruction')
export class HydrateElementInstruction<
  TData extends Record<PropertyKey, unknown> = Record<PropertyKey, unknown>,
  TDefinition extends TemplateComponentDefinitionSeed = TemplateComponentDefinitionSeed,
> {
  readonly kind = 'hydrate-element-instruction' as const;
  readonly family = 'hydration' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.hydrateElement;

  constructor(
    readonly res: string | TDefinition,
    readonly props: readonly TemplateInstruction[] = [],
    readonly projections: Readonly<Record<string, TDefinition>> | null = null,
    readonly containerless: boolean = false,
    readonly captures: readonly TemplateAttributeSyntaxSeed[] | undefined = undefined,
    readonly data: TData = {} as TData,
  ) {}
}

@auLink('template-compiler:HydrateAttributeInstruction')
export class HydrateAttributeInstruction<
  TDefinition extends TemplateComponentDefinitionSeed = TemplateComponentDefinitionSeed,
> {
  readonly kind = 'hydrate-attribute-instruction' as const;
  readonly family = 'hydration' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.hydrateAttribute;

  constructor(
    readonly res: string | TDefinition,
    readonly alias: string | undefined = undefined,
    readonly props: readonly TemplateInstruction[] = [],
  ) {}
}

@auLink('template-compiler:HydrateTemplateController')
export class HydrateTemplateController<
  TDefinition extends TemplateComponentDefinitionSeed = TemplateComponentDefinitionSeed,
> {
  readonly kind = 'hydrate-template-controller-instruction' as const;
  readonly family = 'hydration' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.hydrateTemplateController;

  constructor(
    readonly def: TemplateComponentDefinitionSeed,
    readonly res: string | TDefinition,
    readonly alias: string | undefined = undefined,
    readonly props: readonly TemplateInstruction[] = [],
  ) {}
}

@auLink('template-compiler:HydrateLetElementInstruction')
export class HydrateLetElementInstruction {
  readonly kind = 'hydrate-let-element-instruction' as const;
  readonly family = 'hydration' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.hydrateLetElement;

  constructor(
    readonly instructions: readonly LetBindingInstruction[] = [],
    readonly toBindingContext: boolean = false,
  ) {}
}

@auLink('template-compiler:LetBindingInstruction')
export class LetBindingInstruction {
  readonly kind = 'let-binding-instruction' as const;
  readonly family = 'property-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.letBinding;

  constructor(
    readonly from: TemplateCompilerLetExpressionSeed,
    readonly to: string,
  ) {}
}

@auLink('template-compiler:TextBindingInstruction')
export class TextBindingInstruction {
  readonly kind = 'text-binding-instruction' as const;
  readonly family = 'dom-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.textBinding;

  constructor(
    readonly from: TemplateCompilerExpressionSeed,
  ) {}
}

@auLink('template-compiler:ListenerBindingInstruction')
export class ListenerBindingInstruction {
  readonly kind = 'listener-binding-instruction' as const;
  readonly family = 'dom-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.listenerBinding;

  constructor(
    readonly from: TemplateCompilerExpressionSeed,
    readonly to: string,
    readonly capture: boolean = false,
    readonly modifier: string | null = null,
  ) {}
}

@auLink('template-compiler:StylePropertyBindingInstruction')
export class StylePropertyBindingInstruction {
  readonly kind = 'style-property-binding-instruction' as const;
  readonly family = 'dom-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.stylePropertyBinding;

  constructor(
    readonly from: TemplateCompilerExpressionSeed,
    readonly to: string,
  ) {}
}

@auLink('template-compiler:SetAttributeInstruction')
export class SetAttributeInstruction {
  readonly kind = 'set-attribute-instruction' as const;
  readonly family = 'dom-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.setAttribute;

  constructor(
    readonly value: string,
    readonly to: string,
  ) {}
}

@auLink('template-compiler:SetClassAttributeInstruction')
export class SetClassAttributeInstruction {
  readonly kind = 'set-class-attribute-instruction' as const;
  readonly family = 'dom-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.setClassAttribute;

  constructor(
    readonly value: string,
  ) {}
}

@auLink('template-compiler:SetStyleAttributeInstruction')
export class SetStyleAttributeInstruction {
  readonly kind = 'set-style-attribute-instruction' as const;
  readonly family = 'dom-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.setStyleAttribute;

  constructor(
    readonly value: string,
  ) {}
}

@auLink('template-compiler:AttributeBindingInstruction')
export class AttributeBindingInstruction {
  readonly kind = 'attribute-binding-instruction' as const;
  readonly family = 'dom-binding' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.attributeBinding;

  constructor(
    readonly attr: string,
    readonly from: TemplateCompilerExpressionSeed,
    readonly to: string,
  ) {}
}

@auLink('template-compiler:SpreadTransferedBindingInstruction')
export class SpreadTransferedBindingInstruction {
  readonly kind = 'spread-transfered-binding-instruction' as const;
  readonly family = 'spread' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.spreadTransferedBinding;
}

@auLink('template-compiler:SpreadElementPropBindingInstruction')
export class SpreadElementPropBindingInstruction {
  readonly kind = 'spread-element-prop-binding-instruction' as const;
  readonly family = 'spread' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.spreadElementProp;

  constructor(
    readonly instruction: TemplateInstruction,
  ) {}
}

@auLink('template-compiler:SpreadValueBindingInstruction')
export class SpreadValueBindingInstruction {
  readonly kind = 'spread-value-binding-instruction' as const;
  readonly family = 'spread' as const;
  readonly type = TEMPLATE_INSTRUCTION_TYPE_CODES.spreadValueBinding;

  constructor(
    readonly target: '$bindables' | '$element',
    readonly from: string,
  ) {}
}

export type TemplateInstruction =
  | InterpolationInstruction
  | PropertyBindingInstruction
  | IteratorBindingInstruction
  | RefBindingInstruction
  | SetPropertyInstruction
  | MultiAttrInstruction
  | HydrateElementInstruction
  | HydrateAttributeInstruction
  | HydrateTemplateController
  | HydrateLetElementInstruction
  | LetBindingInstruction
  | TextBindingInstruction
  | ListenerBindingInstruction
  | StylePropertyBindingInstruction
  | SetAttributeInstruction
  | SetClassAttributeInstruction
  | SetStyleAttributeInstruction
  | AttributeBindingInstruction
  | SpreadTransferedBindingInstruction
  | SpreadElementPropBindingInstruction
  | SpreadValueBindingInstruction;
