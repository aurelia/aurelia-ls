import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { TemplateInstructionKind } from './instruction-ir.js';

export const enum RuntimeRendererKind {
  SetProperty = 'set-property-renderer',
  CustomElement = 'custom-element-renderer',
  CustomAttribute = 'custom-attribute-renderer',
  TemplateController = 'template-controller-renderer',
  LetElement = 'let-element-renderer',
  RefBinding = 'ref-binding-renderer',
  InterpolationBinding = 'interpolation-binding-renderer',
  PropertyBinding = 'property-binding-renderer',
  IteratorBinding = 'iterator-binding-renderer',
  TextBinding = 'text-binding-renderer',
  ListenerBinding = 'listener-binding-renderer',
  SetAttribute = 'set-attribute-renderer',
  SetClassAttribute = 'set-class-attribute-renderer',
  SetStyleAttribute = 'set-style-attribute-renderer',
  StylePropertyBinding = 'style-property-binding-renderer',
  AttributeBinding = 'attribute-binding-renderer',
  Spread = 'spread-renderer',
  SpreadValue = 'spread-value-renderer',
  TranslationBinding = 'translation-binding-renderer',
  TranslationBindBinding = 'translation-bind-binding-renderer',
  TranslationParametersBinding = 'translation-parameters-binding-renderer',
  StateBinding = 'state-binding-renderer',
  DispatchBinding = 'dispatch-binding-renderer',
}

export class RuntimeRendererReference {
  constructor(
    readonly rendererKind: RuntimeRendererKind,
    readonly productHandle: ProductHandle | null,
    readonly identityHandle: IdentityHandle | null,
    readonly targetInstructionKind: TemplateInstructionKind,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}
