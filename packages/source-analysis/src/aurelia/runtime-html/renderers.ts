import { TEMPLATE_INSTRUCTION_TYPE_CODES, type TemplateInstructionTypeCode } from '../template-compiler/instructions.js';

export const RUNTIME_RENDERER_KINDS = [
  'custom-element',
  'custom-attribute',
  'template-controller',
  'let-element',
  'ref-binding',
  'interpolation-binding',
  'property-binding',
  'iterator-binding',
  'text-binding',
  'listener-binding',
  'style-property-binding',
  'attribute-binding',
  'spread',
] as const;

export type RuntimeRendererKind = typeof RUNTIME_RENDERER_KINDS[number];
export class CustomElementRenderer {
  readonly kind = 'custom-element' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.hydrateElement;
  readonly createsController = true as const;
  readonly createsBinding = false as const;
  readonly recursesIntoProps = true as const;
}
export class CustomAttributeRenderer {
  readonly kind = 'custom-attribute' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.hydrateAttribute;
  readonly createsController = true as const;
  readonly createsBinding = false as const;
  readonly recursesIntoProps = true as const;
}
export class TemplateControllerRenderer {
  readonly kind = 'template-controller' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.hydrateTemplateController;
  readonly createsController = true as const;
  readonly createsBinding = false as const;
  readonly recursesIntoProps = true as const;
  readonly createsViewFactory = true as const;
}
export class LetElementRenderer {
  readonly kind = 'let-element' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.hydrateLetElement;
  readonly createsController = false as const;
  readonly createsBinding = true as const;
  readonly bindingKind = 'let' as const;
}
export class RefBindingRenderer {
  readonly kind = 'ref-binding' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.refBinding;
  readonly createsController = false as const;
  readonly createsBinding = true as const;
  readonly bindingKind = 'ref' as const;
}
export class InterpolationBindingRenderer {
  readonly kind = 'interpolation-binding' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.interpolation;
  readonly createsController = false as const;
  readonly createsBinding = true as const;
  readonly bindingKind = 'interpolation' as const;
}
export class PropertyBindingRenderer {
  readonly kind = 'property-binding' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.propertyBinding;
  readonly createsController = false as const;
  readonly createsBinding = true as const;
  readonly bindingKind = 'property' as const;
}
export class IteratorBindingRenderer {
  readonly kind = 'iterator-binding' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.iteratorBinding;
  readonly createsController = false as const;
  readonly createsBinding = true as const;
  readonly bindingKind = 'property' as const;
}
export class TextBindingRenderer {
  readonly kind = 'text-binding' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.textBinding;
  readonly createsController = false as const;
  readonly createsBinding = true as const;
  readonly bindingKind = 'content' as const;
}
export class ListenerBindingRenderer {
  readonly kind = 'listener-binding' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.listenerBinding;
  readonly createsController = false as const;
  readonly createsBinding = true as const;
  readonly bindingKind = 'listener' as const;
}
export class StylePropertyBindingRenderer {
  readonly kind = 'style-property-binding' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.stylePropertyBinding;
  readonly createsController = false as const;
  readonly createsBinding = true as const;
  readonly bindingKind = 'property' as const;
}
export class AttributeBindingRenderer {
  readonly kind = 'attribute-binding' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.attributeBinding;
  readonly createsController = false as const;
  readonly createsBinding = true as const;
  readonly bindingKind = 'attribute' as const;
}
export class SpreadRenderer {
  readonly kind = 'spread' as const;
  readonly target = TEMPLATE_INSTRUCTION_TYPE_CODES.spreadTransferedBinding;
  readonly createsController = false as const;
  readonly createsBinding = true as const;
  readonly bindingKind = 'spread' as const;
  readonly compilesCapturedAttributes = true as const;
}

export type RuntimeRenderer =
  | CustomElementRenderer
  | CustomAttributeRenderer
  | TemplateControllerRenderer
  | LetElementRenderer
  | RefBindingRenderer
  | InterpolationBindingRenderer
  | PropertyBindingRenderer
  | IteratorBindingRenderer
  | TextBindingRenderer
  | ListenerBindingRenderer
  | StylePropertyBindingRenderer
  | AttributeBindingRenderer
  | SpreadRenderer;

export class RuntimeRendererRegistryEntry {
  readonly kind = 'runtime-renderer-registry-entry' as const;

  constructor(
    readonly target: TemplateInstructionTypeCode,
    readonly renderer: RuntimeRenderer,
  ) {}
}
