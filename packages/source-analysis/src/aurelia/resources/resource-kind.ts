import { AureliaResourceIdentityKind } from '../kernel/identity.js';

export const enum ResourceDefinitionKind {
  CustomElement = 'custom-element',
  CustomAttribute = 'custom-attribute',
  TemplateController = 'template-controller',
  ValueConverter = 'value-converter',
  BindingBehavior = 'binding-behavior',
  BindingCommand = 'binding-command',
  AttributePattern = 'attribute-pattern',
}

export type NamedResourceDefinitionKind =
  | ResourceDefinitionKind.CustomElement
  | ResourceDefinitionKind.CustomAttribute
  | ResourceDefinitionKind.TemplateController
  | ResourceDefinitionKind.ValueConverter
  | ResourceDefinitionKind.BindingBehavior
  | ResourceDefinitionKind.BindingCommand;

export type SyntaxResourceDefinitionKind =
  | ResourceDefinitionKind.BindingCommand
  | ResourceDefinitionKind.AttributePattern;

export function toAureliaResourceIdentityKind(
  kind: NamedResourceDefinitionKind,
): AureliaResourceIdentityKind {
  switch (kind) {
    case ResourceDefinitionKind.CustomElement:
      return AureliaResourceIdentityKind.CustomElement;
    case ResourceDefinitionKind.CustomAttribute:
      return AureliaResourceIdentityKind.CustomAttribute;
    case ResourceDefinitionKind.TemplateController:
      return AureliaResourceIdentityKind.TemplateController;
    case ResourceDefinitionKind.ValueConverter:
      return AureliaResourceIdentityKind.ValueConverter;
    case ResourceDefinitionKind.BindingBehavior:
      return AureliaResourceIdentityKind.BindingBehavior;
    case ResourceDefinitionKind.BindingCommand:
      return AureliaResourceIdentityKind.BindingCommand;
  }
}

export function readResourceKindFromRuntimeTypeName(
  typeName: string,
): ResourceDefinitionKind | null {
  switch (typeName) {
    case 'custom-element':
    case 'elementTypeName':
      return ResourceDefinitionKind.CustomElement;
    case 'custom-attribute':
    case 'attrTypeName':
      return ResourceDefinitionKind.CustomAttribute;
    case 'template-controller':
      return ResourceDefinitionKind.TemplateController;
    case 'value-converter':
    case 'converterTypeName':
      return ResourceDefinitionKind.ValueConverter;
    case 'binding-behavior':
    case 'behaviorTypeName':
      return ResourceDefinitionKind.BindingBehavior;
    case 'binding-command':
    case 'bindingCommandTypeName':
      return ResourceDefinitionKind.BindingCommand;
    case 'attribute-pattern':
      return ResourceDefinitionKind.AttributePattern;
    default:
      return null;
  }
}
