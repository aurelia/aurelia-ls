import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { BindingCommandExecutableReference } from './binding-command-reference.js';
import type { HtmlAttributeReference, HtmlNodeReference } from './html-ir.js';

export const enum TemplateInstructionKind {
  HydrateElement = 'hydrate-element',
  HydrateAttribute = 'hydrate-attribute',
  HydrateTemplateController = 'hydrate-template-controller',
  PropertyBinding = 'property-binding',
  Interpolation = 'interpolation',
  ListenerBinding = 'listener-binding',
  IteratorBinding = 'iterator-binding',
  RefBinding = 'ref-binding',
  LetBinding = 'let-binding',
  TextBinding = 'text-binding',
  AttributeBinding = 'attribute-binding',
  MultiAttr = 'multi-attr',
  SetProperty = 'set-property',
  SetAttribute = 'set-attribute',
  SetClassAttribute = 'set-class-attribute',
  SetStyleAttribute = 'set-style-attribute',
  StylePropertyBinding = 'style-property-binding',
  HydrateLetElement = 'hydrate-let-element',
  SpreadTransferedBinding = 'spread-transfered-binding',
  SpreadElementPropBinding = 'spread-element-prop-binding',
  SpreadValueBinding = 'spread-value-binding',
  TranslationBinding = 'translation-binding',
  TranslationBindBinding = 'translation-bind-binding',
  TranslationParametersBinding = 'translation-parameters-binding',
  StateBinding = 'state-binding',
  DispatchBinding = 'dispatch-binding',
  Open = 'open',
}

export const enum TemplateBindingMode {
  OneTime = 'one-time',
  ToView = 'to-view',
  FromView = 'from-view',
  TwoWay = 'two-way',
  Default = 'default',
  Open = 'open',
}

export const enum TemplateListenerStrategy {
  Trigger = 'trigger',
  Capture = 'capture',
  Open = 'open',
}

export type TemplateInstructionField =
  | 'node'
  | 'attribute'
  | 'definition'
  | 'resource'
  | 'target'
  | 'attr'
  | 'from'
  | 'value'
  | 'command'
  | 'expression'
  | 'bindingMode'
  | 'listenerStrategy'
  | 'eventModifier'
  | 'spreadTarget'
  | 'storeName'
  | 'rawExpression'
  | 'children'
  | 'captures'
  | 'instructions'
  | 'tailInstructions'
  | 'toBindingContext'
  | 'source';

/** Reference to a lowered template instruction without expanding the product. */
export class TemplateInstructionReference {
  constructor(
    /** Instruction kind represented by the referenced product. */
    readonly instructionKind: TemplateInstructionKind,
    /** Product handle for the instruction, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Identity for the instruction, when emitted. */
    readonly identityHandle: IdentityHandle | null,
    /** Source or generated address for the instruction site. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Ordered lowered instruction list for a template, fragment, or synthetic view. */
export class TemplateInstructionSequence {
  constructor(
    /** Product handle for the materialized-product envelope that represents this sequence. */
    readonly productHandle: ProductHandle,
    /** Identity for this instruction sequence. */
    readonly identityHandle: IdentityHandle,
    /** Template, fragment, or synthetic view product that owns this sequence. */
    readonly ownerProductHandle: ProductHandle,
    /** Lowered instructions in compiler order. */
    readonly instructions: readonly TemplateInstructionReference[],
    /** Source address for the template or fragment that produced this sequence. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Lowered custom-element hydration instruction. */
@auLink('template-compiler:HydrateElementInstruction')
export class HydrateElementInstruction {
  readonly instructionKind = TemplateInstructionKind.HydrateElement;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly elementName: string,
    readonly definitionProductHandle: ProductHandle | null,
    readonly childInstructionSequenceProductHandle: ProductHandle | null,
    readonly projectionInstructionSequences: readonly HydrateElementProjectionInstructionSequence[],
    readonly bindableInstructionProductHandles: readonly ProductHandle[],
    readonly captureSyntaxProductHandles: readonly ProductHandle[],
    readonly containerless: boolean,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Projection definition compiled from child content of one custom-element usage. */
export class HydrateElementProjectionInstructionSequence {
  constructor(
    /** Slot name on the receiving custom element; empty/default content uses `default`. */
    readonly slotName: string,
    /** Instruction sequence for the compiled projection template. */
    readonly instructionSequenceProductHandle: ProductHandle,
    /** Source address for the projected child content that produced the sequence. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Lowered custom-attribute hydration instruction. */
@auLink('template-compiler:HydrateAttributeInstruction')
export class HydrateAttributeInstruction {
  readonly instructionKind = TemplateInstructionKind.HydrateAttribute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly attributeName: string,
    readonly definitionProductHandle: ProductHandle | null,
    readonly bindingInstructionProductHandles: readonly ProductHandle[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered template-controller instruction that owns a nested template sequence. */
@auLink('template-compiler:HydrateTemplateController')
export class HydrateTemplateControllerInstruction {
  readonly instructionKind = TemplateInstructionKind.HydrateTemplateController;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly controllerName: string,
    readonly definitionProductHandle: ProductHandle | null,
    readonly childInstructionSequenceProductHandle: ProductHandle | null,
    readonly bindingInstructionProductHandles: readonly ProductHandle[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered property binding instruction produced by bindable or command lowering. */
@auLink('template-compiler:PropertyBindingInstruction')
export class PropertyBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.PropertyBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly targetProperty: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly bindingMode: TemplateBindingMode,
    readonly command: BindingCommandExecutableReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered interpolation binding instruction. */
@auLink('template-compiler:InterpolationInstruction')
export class InterpolationInstruction {
  readonly instructionKind = TemplateInstructionKind.Interpolation;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference | null,
    readonly target: string | null,
    readonly expressionProductHandles: readonly ProductHandle[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered listener binding instruction. */
@auLink('template-compiler:ListenerBindingInstruction')
export class ListenerBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.ListenerBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly eventName: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly strategy: TemplateListenerStrategy,
    readonly eventModifier: string | null,
    readonly command: BindingCommandExecutableReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered iterator binding instruction such as repeat.for. */
@auLink('template-compiler:IteratorBindingInstruction')
export class IteratorBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.IteratorBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly targetProperty: string,
    readonly localNames: readonly string[],
    readonly iterableExpressionProductHandle: ProductHandle | null,
    readonly tailInstructionProductHandles: readonly ProductHandle[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered ref instruction. */
@auLink('template-compiler:RefBindingInstruction')
export class RefBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.RefBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly target: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered let-binding instruction. */
@auLink('template-compiler:LetBindingInstruction')
export class LetBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.LetBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly target: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered text-binding instruction. */
@auLink('template-compiler:TextBindingInstruction')
export class TextBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.TextBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly expressionProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered property-set instruction for static or mapped attributes. */
@auLink('template-compiler:SetPropertyInstruction')
export class SetPropertyInstruction {
  readonly instructionKind = TemplateInstructionKind.SetProperty;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly targetProperty: string,
    readonly value: string,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered attribute-set instruction for static attributes. */
@auLink('template-compiler:SetAttributeInstruction')
export class SetAttributeInstruction {
  readonly instructionKind = TemplateInstructionKind.SetAttribute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly targetAttribute: string,
    readonly value: string,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered class-attribute instruction. */
@auLink('template-compiler:SetClassAttributeInstruction')
export class SetClassAttributeInstruction {
  readonly instructionKind = TemplateInstructionKind.SetClassAttribute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly value: string,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered style-attribute instruction. */
@auLink('template-compiler:SetStyleAttributeInstruction')
export class SetStyleAttributeInstruction {
  readonly instructionKind = TemplateInstructionKind.SetStyleAttribute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly value: string,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered style-property binding instruction. */
@auLink('template-compiler:StylePropertyBindingInstruction')
export class StylePropertyBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.StylePropertyBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly targetProperty: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered attribute binding instruction for attr/class/style binding commands. */
@auLink('template-compiler:AttributeBindingInstruction')
export class AttributeBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.AttributeBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly attr: string,
    readonly target: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered multi-attribute binding instruction carried by iterator props. */
@auLink('template-compiler:MultiAttrInstruction')
export class MultiAttrInstruction {
  readonly instructionKind = TemplateInstructionKind.MultiAttr;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly target: string,
    readonly command: string | null,
    readonly value: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered hydrate-let-element instruction that owns let bindings. */
@auLink('template-compiler:HydrateLetElementInstruction')
export class HydrateLetElementInstruction {
  readonly instructionKind = TemplateInstructionKind.HydrateLetElement;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly instructionProductHandles: readonly ProductHandle[],
    readonly toBindingContext: boolean,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered marker for spread-transfered bindings. */
@auLink('template-compiler:SpreadTransferedBindingInstruction')
export class SpreadTransferedBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.SpreadTransferedBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered spread wrapper around a bindable-targeting instruction. */
@auLink('template-compiler:SpreadElementPropBindingInstruction')
export class SpreadElementPropBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.SpreadElementPropBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly instructionProductHandle: ProductHandle,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Lowered spread value binding instruction. */
@auLink('template-compiler:SpreadValueBindingInstruction')
export class SpreadValueBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.SpreadValueBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly target: '$bindables' | '$element',
    readonly value: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Extension instruction produced by i18n's `t` binding command. */
@auLink('i18n:TranslationBindingInstruction')
export class TranslationBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.TranslationBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly rawExpression: string,
    readonly target: string,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Extension instruction produced by i18n's `t.bind` binding command. */
@auLink('i18n:TranslationBindBindingInstruction')
export class TranslationBindBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.TranslationBindBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly expressionProductHandle: ProductHandle | null,
    readonly target: string,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Extension instruction produced by i18n's `t-params.bind` binding command. */
@auLink('i18n:TranslationParametersBindingInstruction')
export class TranslationParametersBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.TranslationParametersBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly expressionProductHandle: ProductHandle | null,
    readonly target: string,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Extension instruction produced by state plugin's `state` binding command. */
@auLink('state:StateBindingInstruction')
export class StateBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.StateBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly rawExpression: string,
    readonly target: string,
    readonly storeName: string | null,
    readonly expressionProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

/** Extension instruction produced by state plugin's `dispatch` binding command. */
@auLink('state:DispatchBindingInstruction')
export class DispatchBindingInstruction {
  readonly instructionKind = TemplateInstructionKind.DispatchBinding;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly eventName: string,
    readonly rawExpression: string,
    readonly storeName: string | null,
    readonly expressionProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<TemplateInstructionField>[] = [],
  ) {}
}

export type TemplateInstruction =
  | HydrateElementInstruction
  | HydrateAttributeInstruction
  | HydrateTemplateControllerInstruction
  | HydrateLetElementInstruction
  | PropertyBindingInstruction
  | InterpolationInstruction
  | ListenerBindingInstruction
  | IteratorBindingInstruction
  | RefBindingInstruction
  | LetBindingInstruction
  | TextBindingInstruction
  | SetPropertyInstruction
  | SetAttributeInstruction
  | SetClassAttributeInstruction
  | SetStyleAttributeInstruction
  | StylePropertyBindingInstruction
  | AttributeBindingInstruction
  | MultiAttrInstruction
  | SpreadTransferedBindingInstruction
  | SpreadElementPropBindingInstruction
  | SpreadValueBindingInstruction
  | TranslationBindingInstruction
  | TranslationBindBindingInstruction
  | TranslationParametersBindingInstruction
  | StateBindingInstruction
  | DispatchBindingInstruction;

export function expressionProductHandlesForInstruction(
  instruction: TemplateInstruction,
): readonly ProductHandle[] {
  switch (instruction.instructionKind) {
    case TemplateInstructionKind.PropertyBinding:
    case TemplateInstructionKind.ListenerBinding:
    case TemplateInstructionKind.RefBinding:
    case TemplateInstructionKind.LetBinding:
    case TemplateInstructionKind.TextBinding:
    case TemplateInstructionKind.AttributeBinding:
    case TemplateInstructionKind.StylePropertyBinding:
    case TemplateInstructionKind.SpreadValueBinding:
    case TemplateInstructionKind.TranslationBindBinding:
    case TemplateInstructionKind.TranslationParametersBinding:
    case TemplateInstructionKind.StateBinding:
    case TemplateInstructionKind.DispatchBinding:
      return productHandleArray(instruction.expressionProductHandle);
    case TemplateInstructionKind.IteratorBinding:
      return productHandleArray(instruction.iterableExpressionProductHandle);
    case TemplateInstructionKind.Interpolation:
      return instruction.expressionProductHandles;
    case TemplateInstructionKind.HydrateElement:
    case TemplateInstructionKind.HydrateAttribute:
    case TemplateInstructionKind.HydrateTemplateController:
    case TemplateInstructionKind.MultiAttr:
    case TemplateInstructionKind.SetProperty:
    case TemplateInstructionKind.SetAttribute:
    case TemplateInstructionKind.SetClassAttribute:
    case TemplateInstructionKind.SetStyleAttribute:
    case TemplateInstructionKind.HydrateLetElement:
    case TemplateInstructionKind.SpreadTransferedBinding:
    case TemplateInstructionKind.SpreadElementPropBinding:
    case TemplateInstructionKind.TranslationBinding:
      return [];
  }
}

function productHandleArray(handle: ProductHandle | null): readonly ProductHandle[] {
  return handle == null ? [] : [handle];
}
