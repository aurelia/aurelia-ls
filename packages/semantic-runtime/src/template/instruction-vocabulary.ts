import {
  KernelVocabulary,
  type InstructionKindKey,
} from '../kernel/vocabulary.js';
import { TemplateInstructionKind } from './instruction-ir.js';

export function instructionKindKeyFor(kind: TemplateInstructionKind): InstructionKindKey {
  switch (kind) {
    case TemplateInstructionKind.HydrateElement:
      return KernelVocabulary.Instruction.HydrateElement.key;
    case TemplateInstructionKind.HydrateAttribute:
      return KernelVocabulary.Instruction.HydrateAttribute.key;
    case TemplateInstructionKind.HydrateTemplateController:
      return KernelVocabulary.Instruction.HydrateTemplateController.key;
    case TemplateInstructionKind.PropertyBinding:
      return KernelVocabulary.Instruction.PropertyBinding.key;
    case TemplateInstructionKind.Interpolation:
      return KernelVocabulary.Instruction.Interpolation.key;
    case TemplateInstructionKind.ListenerBinding:
      return KernelVocabulary.Instruction.ListenerBinding.key;
    case TemplateInstructionKind.IteratorBinding:
      return KernelVocabulary.Instruction.IteratorBinding.key;
    case TemplateInstructionKind.RefBinding:
      return KernelVocabulary.Instruction.RefBinding.key;
    case TemplateInstructionKind.LetBinding:
      return KernelVocabulary.Instruction.LetBinding.key;
    case TemplateInstructionKind.TextBinding:
      return KernelVocabulary.Instruction.TextBinding.key;
    case TemplateInstructionKind.AttributeBinding:
      return KernelVocabulary.Instruction.AttributeBinding.key;
    case TemplateInstructionKind.MultiAttr:
      return KernelVocabulary.Instruction.MultiAttr.key;
    case TemplateInstructionKind.SetProperty:
      return KernelVocabulary.Instruction.SetProperty.key;
    case TemplateInstructionKind.SetAttribute:
      return KernelVocabulary.Instruction.SetAttribute.key;
    case TemplateInstructionKind.SetClassAttribute:
      return KernelVocabulary.Instruction.SetClassAttribute.key;
    case TemplateInstructionKind.SetStyleAttribute:
      return KernelVocabulary.Instruction.SetStyleAttribute.key;
    case TemplateInstructionKind.StylePropertyBinding:
      return KernelVocabulary.Instruction.StylePropertyBinding.key;
    case TemplateInstructionKind.HydrateLetElement:
      return KernelVocabulary.Instruction.HydrateLetElement.key;
    case TemplateInstructionKind.SpreadTransferedBinding:
      return KernelVocabulary.Instruction.SpreadTransferedBinding.key;
    case TemplateInstructionKind.SpreadElementPropBinding:
      return KernelVocabulary.Instruction.SpreadElementPropBinding.key;
    case TemplateInstructionKind.SpreadValueBinding:
      return KernelVocabulary.Instruction.SpreadValueBinding.key;
    case TemplateInstructionKind.TranslationBinding:
      return KernelVocabulary.Instruction.TranslationBinding.key;
    case TemplateInstructionKind.TranslationBindBinding:
      return KernelVocabulary.Instruction.TranslationBindBinding.key;
    case TemplateInstructionKind.TranslationParametersBinding:
      return KernelVocabulary.Instruction.TranslationParametersBinding.key;
    case TemplateInstructionKind.StateBinding:
      return KernelVocabulary.Instruction.StateBinding.key;
    case TemplateInstructionKind.DispatchBinding:
      return KernelVocabulary.Instruction.DispatchBinding.key;
    case TemplateInstructionKind.Open:
      throw new Error('Open instruction kind is a seam kind and cannot be materialized as an instruction product.');
  }
}
