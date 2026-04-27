import { AureliaResourceIdentityKind } from '../kernel/identity.js';

export const enum RecognizedResourceKind {
  CustomElement = 'custom-element',
  CustomAttribute = 'custom-attribute',
  TemplateController = 'template-controller',
  ValueConverter = 'value-converter',
  BindingBehavior = 'binding-behavior',
  BindingCommand = 'binding-command',
  AttributePattern = 'attribute-pattern',
}

export type NamedRecognizedResourceKind =
  | RecognizedResourceKind.CustomElement
  | RecognizedResourceKind.CustomAttribute
  | RecognizedResourceKind.TemplateController
  | RecognizedResourceKind.ValueConverter
  | RecognizedResourceKind.BindingBehavior
  | RecognizedResourceKind.BindingCommand;

export type SyntaxRecognizedResourceKind =
  | RecognizedResourceKind.BindingCommand
  | RecognizedResourceKind.AttributePattern;

export function toAureliaResourceIdentityKind(
  kind: NamedRecognizedResourceKind,
): AureliaResourceIdentityKind {
  switch (kind) {
    case RecognizedResourceKind.CustomElement:
      return AureliaResourceIdentityKind.CustomElement;
    case RecognizedResourceKind.CustomAttribute:
      return AureliaResourceIdentityKind.CustomAttribute;
    case RecognizedResourceKind.TemplateController:
      return AureliaResourceIdentityKind.TemplateController;
    case RecognizedResourceKind.ValueConverter:
      return AureliaResourceIdentityKind.ValueConverter;
    case RecognizedResourceKind.BindingBehavior:
      return AureliaResourceIdentityKind.BindingBehavior;
    case RecognizedResourceKind.BindingCommand:
      return AureliaResourceIdentityKind.BindingCommand;
  }
}

export function readResourceKindFromRuntimeTypeName(
  typeName: string,
): RecognizedResourceKind | null {
  switch (typeName) {
    case 'custom-element':
    case 'elementTypeName':
      return RecognizedResourceKind.CustomElement;
    case 'custom-attribute':
    case 'attrTypeName':
      return RecognizedResourceKind.CustomAttribute;
    case 'template-controller':
      return RecognizedResourceKind.TemplateController;
    case 'value-converter':
    case 'converterTypeName':
      return RecognizedResourceKind.ValueConverter;
    case 'binding-behavior':
    case 'behaviorTypeName':
      return RecognizedResourceKind.BindingBehavior;
    case 'binding-command':
    case 'bindingCommandTypeName':
      return RecognizedResourceKind.BindingCommand;
    case 'attribute-pattern':
      return RecognizedResourceKind.AttributePattern;
    default:
      return null;
  }
}
