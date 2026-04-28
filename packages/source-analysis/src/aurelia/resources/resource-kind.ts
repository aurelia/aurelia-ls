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

export function runtimeResourceTypeNameForKind(
  kind: ResourceDefinitionKind,
): string | null {
  switch (kind) {
    case ResourceDefinitionKind.CustomElement:
      return 'custom-element';
    case ResourceDefinitionKind.CustomAttribute:
    case ResourceDefinitionKind.TemplateController:
      return 'custom-attribute';
    case ResourceDefinitionKind.ValueConverter:
      return 'value-converter';
    case ResourceDefinitionKind.BindingBehavior:
      return 'binding-behavior';
    case ResourceDefinitionKind.BindingCommand:
      return 'binding-command';
    case ResourceDefinitionKind.AttributePattern:
      return null;
  }
}

export function runtimeResourceKeyForKind(
  kind: ResourceDefinitionKind,
  name: string,
): string | null {
  const typeName = runtimeResourceTypeNameForKind(kind);
  return typeName == null
    ? null
    : `au:resource:${typeName}:${name}`;
}

export class RuntimeResourceKey {
  constructor(
    /** Runtime resource type segment, such as `custom-element` or `value-converter`. */
    readonly typeName: string,
    /** Compiler resource kind recoverable from the runtime key. */
    readonly resourceKind: NamedResourceDefinitionKind,
    /** Runtime lookup name carried by the key. */
    readonly name: string,
  ) {}
}

export function readRuntimeResourceKey(resourceKey: string): RuntimeResourceKey | null {
  const prefix = 'au:resource:';
  if (!resourceKey.startsWith(prefix)) {
    return null;
  }
  const rest = resourceKey.slice(prefix.length);
  const splitAt = rest.indexOf(':');
  if (splitAt < 1 || splitAt === rest.length - 1) {
    return null;
  }

  const typeName = rest.slice(0, splitAt);
  const name = rest.slice(splitAt + 1);
  switch (typeName) {
    case 'custom-element':
      return new RuntimeResourceKey(typeName, ResourceDefinitionKind.CustomElement, name);
    case 'custom-attribute':
      return new RuntimeResourceKey(typeName, ResourceDefinitionKind.CustomAttribute, name);
    case 'value-converter':
      return new RuntimeResourceKey(typeName, ResourceDefinitionKind.ValueConverter, name);
    case 'binding-behavior':
      return new RuntimeResourceKey(typeName, ResourceDefinitionKind.BindingBehavior, name);
    case 'binding-command':
      return new RuntimeResourceKey(typeName, ResourceDefinitionKind.BindingCommand, name);
    default:
      return null;
  }
}
