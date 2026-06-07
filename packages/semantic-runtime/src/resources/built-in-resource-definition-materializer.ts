import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  BindableDefinition,
  BindableSetterDefinition,
} from './bindable-definition.js';
import {
  builtInAttributeBindableDescriptors,
  builtInDefaultProperty,
  builtInElementBindableDescriptors,
  builtInNoMultiBindings,
  type BuiltInResourceBindableDescriptor,
} from './built-in-resource-bindables.js';
import {
  BindingBehaviorDefinition,
} from './binding-behavior-definition.js';
import type {
  BuiltInResource,
} from './built-in-resources.js';
import {
  CustomAttributeContainerStrategy,
  CustomAttributeDefinition,
} from './custom-attribute-definition.js';
import {
  CustomElementCaptureDefinition,
  CustomElementCaptureKind,
  CustomElementDefinition,
  CustomElementTemplateDefinition,
  CustomElementTemplateKind,
} from './custom-element-definition.js';
import type { FullResourceDefinition } from './resource-definition.js';
import { BuiltInResourceTargetTypeProjector } from './built-in-resource-target-type.js';
import {
  ResourceDefinitionKind,
  runtimeResourceKeyForKind,
} from './resource-kind.js';
import {
  ResourceAliasDefinition,
  ResourceTargetReference,
} from './resource-reference.js';
import {
  ValueConverterDefinition,
} from './value-converter-definition.js';

export interface BuiltInResourceDefinitionSource {
  readonly addressHandle: AddressHandle;
  readonly provenanceHandle: ProvenanceHandle;
}

export function materializeBuiltInResourceDefinition(
  resource: BuiltInResource,
  local: string,
  productHandle: ProductHandle,
  identityHandle: IdentityHandle,
  source: BuiltInResourceDefinitionSource,
  targetTypes: BuiltInResourceTargetTypeProjector | null,
): FullResourceDefinition | null {
  const target = builtInResourceTarget(resource, local, identityHandle, source, targetTypes);
  const aliases = builtInResourceAliases(resource, source);
  const key = runtimeResourceKeyForKind(resource.resourceKind, resource.name);
  if (key == null) {
    return null;
  }

  switch (resource.resourceKind) {
    case ResourceDefinitionKind.CustomElement:
      return builtInCustomElementDefinition(resource, productHandle, identityHandle, source, target, aliases, key);
    case ResourceDefinitionKind.CustomAttribute:
    case ResourceDefinitionKind.TemplateController:
      return builtInCustomAttributeDefinition(resource, productHandle, identityHandle, source, target, aliases, key);
    case ResourceDefinitionKind.ValueConverter:
      return new ValueConverterDefinition(
        productHandle,
        identityHandle,
        source.addressHandle,
        target,
        resource.name,
        aliases,
        key,
        [],
        [],
      );
    case ResourceDefinitionKind.BindingBehavior:
      return new BindingBehaviorDefinition(
        productHandle,
        identityHandle,
        source.addressHandle,
        target,
        resource.name,
        aliases,
        key,
        [],
        [],
      );
  }
}

function builtInResourceTarget(
  resource: BuiltInResource,
  local: string,
  identityHandle: IdentityHandle,
  source: BuiltInResourceDefinitionSource,
  targetTypes: BuiltInResourceTargetTypeProjector | null,
): ResourceTargetReference {
  return new ResourceTargetReference(
    null,
    source.addressHandle,
    resource.targetName,
    targetTypes?.targetTypeReference(resource, local, source.addressHandle, identityHandle) ?? null,
  );
}

function builtInResourceAliases(
  resource: BuiltInResource,
  source: BuiltInResourceDefinitionSource,
): readonly ResourceAliasDefinition[] {
  return resource.aliases.map((alias) =>
    new ResourceAliasDefinition(alias, source.addressHandle, source.provenanceHandle)
  );
}

function builtInCustomElementDefinition(
  resource: BuiltInResource,
  productHandle: ProductHandle,
  identityHandle: IdentityHandle,
  source: BuiltInResourceDefinitionSource,
  target: ResourceTargetReference,
  aliases: readonly ResourceAliasDefinition[],
  key: string,
): CustomElementDefinition {
  return new CustomElementDefinition(
    productHandle,
    identityHandle,
    source.addressHandle,
    target,
    resource.name,
    aliases,
    key,
    new CustomElementCaptureDefinition(resource.targetName === 'AuCompose'
      ? CustomElementCaptureKind.All
      : CustomElementCaptureKind.None),
    new CustomElementTemplateDefinition(CustomElementTemplateKind.None),
    [],
    [],
    null,
    false,
    [],
    builtInElementBindables(resource.targetName, source),
    resource.targetName === 'AuCompose' || resource.targetName === 'AuSlot',
    null,
    false,
    false,
    [],
    null,
    resource.targetName === 'AuSlot'
      ? new ResourceTargetReference(null, source.addressHandle, 'AuSlot.processContent')
      : null,
    [],
    [],
  );
}

function builtInCustomAttributeDefinition(
  resource: BuiltInResource,
  productHandle: ProductHandle,
  identityHandle: IdentityHandle,
  source: BuiltInResourceDefinitionSource,
  target: ResourceTargetReference,
  aliases: readonly ResourceAliasDefinition[],
  key: string,
): CustomAttributeDefinition {
  return new CustomAttributeDefinition(
    productHandle,
    identityHandle,
    source.addressHandle,
    target,
    resource.name,
    aliases,
    key,
    resource.resourceKind === ResourceDefinitionKind.TemplateController,
    builtInAttributeBindables(resource.targetName, source),
    builtInNoMultiBindings(resource.targetName),
    [],
    [],
    CustomAttributeContainerStrategy.Reuse,
    builtInDefaultProperty(resource.targetName),
    [],
    [],
  );
}

function builtInElementBindables(
  targetName: string,
  source: BuiltInResourceDefinitionSource,
): readonly BindableDefinition[] {
  return bindables(source, builtInElementBindableDescriptors(targetName));
}

function builtInAttributeBindables(
  targetName: string,
  source: BuiltInResourceDefinitionSource,
): readonly BindableDefinition[] {
  return bindables(source, builtInAttributeBindableDescriptors(targetName));
}

function bindables(
  source: BuiltInResourceDefinitionSource,
  inputs: readonly BuiltInResourceBindableDescriptor[],
): readonly BindableDefinition[] {
  return inputs.map((input) => new BindableDefinition(
    input.attribute,
    input.callback,
    input.mode,
    input.name,
    new BindableSetterDefinition(
      input.setterKind,
      input.setterName == null
        ? null
        : new ResourceTargetReference(null, source.addressHandle, input.setterName),
    ),
    source.addressHandle,
  ));
}
