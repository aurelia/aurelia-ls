import {
  defineVocabulary,
  KernelVocabularyNamespace,
  KernelVocabularySlot,
} from './core.js';

export const KernelInstructionKinds = {
  Evaluation: {
  },
  TypeSystem: {
  },
  Resource: {
  },
  Di: {
  },
  Registration: {
  },
  Configuration: {
  },
  Compiler: {
  },
  Template: {
  },
  Binding: {
  },
  Instruction: {
    HydrateElement: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'hydrate-element',
      KernelVocabularySlot.InstructionKind,
      'Hydrate a custom element or element controller.',
    ),

    HydrateAttribute: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'hydrate-attribute',
      KernelVocabularySlot.InstructionKind,
      'Hydrate a custom attribute.',
    ),

    HydrateTemplateController: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'hydrate-template-controller',
      KernelVocabularySlot.InstructionKind,
      'Hydrate a template controller with a nested template.',
    ),

    HydrateLetElement: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'hydrate-let-element',
      KernelVocabularySlot.InstructionKind,
      'Hydrate a let element and its let-binding instructions.',
    ),

    PropertyBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'property-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an expression to a target property.',
    ),

    Interpolation: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'interpolation',
      KernelVocabularySlot.InstructionKind,
      'Bind text or attribute interpolation expressions.',
    ),

    ListenerBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'listener-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an event listener expression.',
    ),

    IteratorBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'iterator-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind iterator locals and iterable expression.',
    ),

    RefBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'ref-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind a ref expression.',
    ),

    LetBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'let-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind a let declaration into template scope.',
    ),

    TextBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'text-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an expression to a text node.',
    ),

    AttributeBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'attribute-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an expression to an attribute, including attr/class/style command output.',
    ),

    MultiAttr: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'multi-attr',
      KernelVocabularySlot.InstructionKind,
      'Carry one iterator multi-attribute binding entry.',
    ),

    SetProperty: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'set-property',
      KernelVocabularySlot.InstructionKind,
      'Set a static property value.',
    ),

    SetAttribute: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'set-attribute',
      KernelVocabularySlot.InstructionKind,
      'Set a static attribute value.',
    ),

    SetClassAttribute: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'set-class-attribute',
      KernelVocabularySlot.InstructionKind,
      'Set a static class attribute value.',
    ),

    SetStyleAttribute: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'set-style-attribute',
      KernelVocabularySlot.InstructionKind,
      'Set a static style attribute value.',
    ),

    StylePropertyBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'style-property-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an expression to one style property.',
    ),

    SpreadTransferedBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'spread-transfered-binding',
      KernelVocabularySlot.InstructionKind,
      'Carry the runtime marker for spread-transfered bindings.',
    ),

    SpreadElementPropBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'spread-element-prop-binding',
      KernelVocabularySlot.InstructionKind,
      'Wrap a spread instruction that targets a custom-element bindable.',
    ),

    SpreadValueBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'spread-value-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind a spread value to element or bindable spread handling.',
    ),

    TranslationBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'translation-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an i18n translation key or text expression.',
    ),

    TranslationBindBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'translation-bind-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind an i18n translation expression.',
    ),

    TranslationParametersBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'translation-parameters-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind i18n translation parameter expressions.',
    ),

    StateBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'state-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind state plugin output to a target property.',
    ),

    DispatchBinding: defineVocabulary(
      KernelVocabularyNamespace.Instruction,
      'dispatch-binding',
      KernelVocabularySlot.InstructionKind,
      'Bind state plugin dispatch handling to an event.',
    ),
  },
} as const;
