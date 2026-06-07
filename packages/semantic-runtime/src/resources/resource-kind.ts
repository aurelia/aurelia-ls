export const enum ResourceCarrierKind {
  /** Class decorator such as @customElement(...) or @valueConverter(...). */
  Decorator = 'decorator',
  /** Static class-side `$au` definition metadata. */
  StaticAu = 'static-$au',
  /** Imperative definition call such as CustomElement.define(...). */
  DefineCall = 'define-call',
  /** Syntax-resource factory call such as AttributePattern.create(...). */
  AttributePatternCreate = 'attribute-pattern-create',
  /** Name derived from a conventions layer known to be active. */
  Convention = 'convention',
}

export const enum ResourceDefinitionKind {
  CustomElement = 'custom-element',
  CustomAttribute = 'custom-attribute',
  TemplateController = 'template-controller',
  ValueConverter = 'value-converter',
  BindingBehavior = 'binding-behavior',
  BindingCommand = 'binding-command',
  AttributePattern = 'attribute-pattern',
}

/** Stable value list for public schemas and catalog filters that cannot reflect over const enums. */
export const RESOURCE_DEFINITION_KINDS = [
  ResourceDefinitionKind.CustomElement,
  ResourceDefinitionKind.CustomAttribute,
  ResourceDefinitionKind.TemplateController,
  ResourceDefinitionKind.ValueConverter,
  ResourceDefinitionKind.BindingBehavior,
  ResourceDefinitionKind.BindingCommand,
  ResourceDefinitionKind.AttributePattern,
] as const;

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

export const enum NamedResourceDefinitionContributionKind {
  Header = 'header',
  DefinitionObject = 'definition-object',
  TypeStaticProperty = 'type-static-property',
  Annotation = 'annotation',
  Convention = 'convention',
}

export const enum ResourceMetadataContributionKind {
  BindableMetadata = 'bindable-metadata',
  WatchMetadata = 'watch-metadata',
}

export type ComponentResourceDefinitionContributionKind =
  | NamedResourceDefinitionContributionKind
  | ResourceMetadataContributionKind;

export const enum AttributePatternDefinitionContributionKind {
  Header = 'header',
  CreateCall = 'create-call',
  Convention = 'convention',
}

export function namedResourceContributionKindForCarrier(
  carrierKind: ResourceCarrierKind,
): NamedResourceDefinitionContributionKind {
  switch (carrierKind) {
    case ResourceCarrierKind.Decorator:
      return NamedResourceDefinitionContributionKind.Annotation;
    case ResourceCarrierKind.StaticAu:
      return NamedResourceDefinitionContributionKind.TypeStaticProperty;
    case ResourceCarrierKind.DefineCall:
      return NamedResourceDefinitionContributionKind.DefinitionObject;
    case ResourceCarrierKind.AttributePatternCreate:
      return NamedResourceDefinitionContributionKind.Header;
    case ResourceCarrierKind.Convention:
      return NamedResourceDefinitionContributionKind.Convention;
  }
}

export function attributePatternContributionKindForCarrier(
  carrierKind: ResourceCarrierKind,
): AttributePatternDefinitionContributionKind {
  switch (carrierKind) {
    case ResourceCarrierKind.AttributePatternCreate:
      return AttributePatternDefinitionContributionKind.CreateCall;
    case ResourceCarrierKind.Convention:
      return AttributePatternDefinitionContributionKind.Convention;
    case ResourceCarrierKind.Decorator:
    case ResourceCarrierKind.StaticAu:
    case ResourceCarrierKind.DefineCall:
      return AttributePatternDefinitionContributionKind.Header;
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
