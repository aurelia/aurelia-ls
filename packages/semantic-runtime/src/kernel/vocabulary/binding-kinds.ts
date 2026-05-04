import {
  defineVocabulary,
  KernelVocabularyNamespace,
  KernelVocabularySlot,
} from './core.js';

export const KernelBindingKinds = {
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
    /** Binding kind for property assignment or observation. */
    Property: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'property',
      KernelVocabularySlot.BindingKind,
      'Property binding produced from bindable or command syntax.',
    ),

    /** Binding kind for attribute assignment or observation. */
    Attribute: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'attribute',
      KernelVocabularySlot.BindingKind,
      'Attribute binding produced by attr/class/style command syntax.',
    ),

    /** Binding kind for text or attribute interpolation. */
    Interpolation: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'interpolation',
      KernelVocabularySlot.BindingKind,
      'Interpolation binding produced from text or attribute syntax.',
    ),

    /** Binding kind for event listeners. */
    Listener: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'listener',
      KernelVocabularySlot.BindingKind,
      'Event listener binding produced by trigger, capture, or related syntax.',
    ),

    /** Binding kind for iterator semantics such as repeat.for. */
    Iterator: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'iterator',
      KernelVocabularySlot.BindingKind,
      'Iterator binding produced by template-controller syntax such as repeat.for.',
    ),

    /** Binding kind for ref semantics. */
    Ref: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'ref',
      KernelVocabularySlot.BindingKind,
      'Reference binding produced by ref syntax.',
    ),

    /** Binding kind for let declarations. */
    Let: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'let',
      KernelVocabularySlot.BindingKind,
      'Let binding produced by let elements or standalone let-binding instructions.',
    ),

    /** Binding kind for text-node content updates. */
    Content: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'content',
      KernelVocabularySlot.BindingKind,
      'Content binding produced by text-binding instructions.',
    ),

    /** Binding kind for style-property updates. */
    StyleProperty: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'style-property',
      KernelVocabularySlot.BindingKind,
      'Property binding whose runtime target is an element style object.',
    ),

    /** Binding kind for spread hydration transfer. */
    Spread: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'spread',
      KernelVocabularySlot.BindingKind,
      'Spread binding that transfers captured attributes through runtime hydration context.',
    ),

    /** Binding kind for spread value updates. */
    SpreadValue: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'spread-value',
      KernelVocabularySlot.BindingKind,
      'Spread-value binding produced by spread command syntax.',
    ),

    /** Binding kind for i18n translation updates. */
    Translation: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'translation',
      KernelVocabularySlot.BindingKind,
      'I18n translation binding produced by translation renderers.',
    ),

    /** Binding kind for i18n translation parameter updates. */
    TranslationParameters: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'translation-parameters',
      KernelVocabularySlot.BindingKind,
      'I18n translation-parameters binding produced by translation parameter renderers.',
    ),

    /** Binding kind for state plugin state-to-target updates. */
    State: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'state',
      KernelVocabularySlot.BindingKind,
      'State plugin binding that updates a target property from store state.',
    ),

    /** Binding kind for state plugin dispatch listeners. */
    StateDispatch: defineVocabulary(
      KernelVocabularyNamespace.Binding,
      'state-dispatch',
      KernelVocabularySlot.BindingKind,
      'State plugin dispatch binding attached to a DOM event.',
    ),
  },
  Instruction: {
  },
} as const;
