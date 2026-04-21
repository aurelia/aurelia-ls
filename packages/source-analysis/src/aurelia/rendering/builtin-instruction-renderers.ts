import { CustomAttributeRenderer } from './custom-attribute-renderer.js';
import { CustomElementRenderer } from './custom-element-renderer.js';
import {
  CustomInstructionRenderer,
  PassiveInstructionRenderer,
  type InstructionRenderer,
} from './instruction-renderer.js';
import { InstructionRendererAdmissionProvenance } from './renderer-admission.js';
import { TemplateControllerRenderer } from '../compiler/template-controller-renderer.js';

export const BUILTIN_INSTRUCTION_RENDERER_KINDS = [
  'set-property',
  'hydrate-element',
  'hydrate-attribute',
  'hydrate-template-controller',
  'hydrate-let-element',
  'ref-binding',
  'interpolation-binding',
  'property-binding',
  'iterator-binding',
  'text-binding',
  'listener-binding',
  'set-attribute',
  'set-class-attribute',
  'set-style-attribute',
  'style-property-binding',
  'attribute-binding',
  'spread-transferred-binding',
  'spread-value-binding',
] as const;

export type BuiltinInstructionRendererKind =
  typeof BUILTIN_INSTRUCTION_RENDERER_KINDS[number];

export function createInstructionRenderer(
  referenceName: string,
  admission: InstructionRendererAdmissionProvenance,
): InstructionRenderer {
  switch (referenceName) {
    case 'SetPropertyRenderer':
      return new PassiveInstructionRenderer(
        'SetPropertyRenderer',
        'set-property',
        admission,
        'Builtin SetPropertyRenderer writes directly to the target surface. A later lowering/carrier layer should feed it concrete property-write inputs.',
      );
    case 'CustomElementRenderer':
      return new CustomElementRenderer(admission);
    case 'CustomAttributeRenderer':
      return new CustomAttributeRenderer(admission);
    case 'TemplateControllerRenderer':
      return new TemplateControllerRenderer(admission);
    case 'LetElementRenderer':
      return new PassiveInstructionRenderer(
        'LetElementRenderer',
        'hydrate-let-element',
        admission,
        'Builtin LetElementRenderer consumes let-element instructions. A later special-element lowering slice should feed it concrete let-binding carriers.',
      );
    case 'RefBindingRenderer':
      return new PassiveInstructionRenderer(
        'RefBindingRenderer',
        'ref-binding',
        admission,
        'Builtin RefBindingRenderer instantiates ref bindings once ref-lowering carriers are available.',
      );
    case 'InterpolationBindingRenderer':
      return new PassiveInstructionRenderer(
        'InterpolationBindingRenderer',
        'interpolation-binding',
        admission,
        'Builtin InterpolationBindingRenderer consumes interpolation carriers once text/plain-attribute lowering is decompressed further.',
      );
    case 'PropertyBindingRenderer':
      return new PassiveInstructionRenderer(
        'PropertyBindingRenderer',
        'property-binding',
        admission,
        'Builtin PropertyBindingRenderer consumes property-binding carriers once final binding lowering is available.',
      );
    case 'IteratorBindingRenderer':
      return new PassiveInstructionRenderer(
        'IteratorBindingRenderer',
        'iterator-binding',
        admission,
        'Builtin IteratorBindingRenderer consumes iterator-binding carriers, which later feed repeat-family behavior.',
      );
    case 'TextBindingRenderer':
      return new PassiveInstructionRenderer(
        'TextBindingRenderer',
        'text-binding',
        admission,
        'Builtin TextBindingRenderer consumes text-binding carriers once interpolation/text lowering is closed.',
      );
    case 'ListenerBindingRenderer':
      return new PassiveInstructionRenderer(
        'ListenerBindingRenderer',
        'listener-binding',
        admission,
        'Builtin ListenerBindingRenderer consumes listener-binding carriers once command/plain-attribute lowering is closed.',
      );
    case 'SetAttributeRenderer':
      return new PassiveInstructionRenderer(
        'SetAttributeRenderer',
        'set-attribute',
        admission,
        'Builtin SetAttributeRenderer writes static attributes once direct plain-attribute lowering is available.',
      );
    case 'SetClassAttributeRenderer':
      return new PassiveInstructionRenderer(
        'SetClassAttributeRenderer',
        'set-class-attribute',
        admission,
        'Builtin SetClassAttributeRenderer writes class attributes once direct plain-attribute lowering is available.',
      );
    case 'SetStyleAttributeRenderer':
      return new PassiveInstructionRenderer(
        'SetStyleAttributeRenderer',
        'set-style-attribute',
        admission,
        'Builtin SetStyleAttributeRenderer writes style attributes once direct plain-attribute lowering is available.',
      );
    case 'StylePropertyBindingRenderer':
      return new PassiveInstructionRenderer(
        'StylePropertyBindingRenderer',
        'style-property-binding',
        admission,
        'Builtin StylePropertyBindingRenderer consumes style-property binding carriers once final lowering is available.',
      );
    case 'AttributeBindingRenderer':
      return new PassiveInstructionRenderer(
        'AttributeBindingRenderer',
        'attribute-binding',
        admission,
        'Builtin AttributeBindingRenderer consumes attribute-binding carriers once final lowering is available.',
      );
    case 'SpreadRenderer':
      return new PassiveInstructionRenderer(
        'SpreadRenderer',
        'spread-transferred-binding',
        admission,
        'Builtin SpreadRenderer consumes spread-transferred binding carriers. A later spread lowering slice should feed it concrete hydration-context-aware inputs.',
      );
    case 'SpreadValueRenderer':
      return new PassiveInstructionRenderer(
        'SpreadValueRenderer',
        'spread-value-binding',
        admission,
        'Builtin SpreadValueRenderer consumes spread-value binding carriers. A later spread lowering slice should feed it concrete hydration-context-aware inputs.',
      );
    default:
      return new CustomInstructionRenderer(referenceName, admission);
  }
}
