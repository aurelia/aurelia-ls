import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  BindableBindingMode,
  BindableDefinition,
  BindableSetterDefinition,
  BindableSetterKind,
} from './bindable-definition.js';
import { bindableAttributeNameForProperty } from './bindable-attribute.js';
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

interface BuiltInBindableInput {
  readonly name: string;
  readonly attribute?: string;
  readonly callback?: string;
  readonly mode?: BindableBindingMode;
  readonly setterKind?: BindableSetterKind;
  readonly setterName?: string;
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
  switch (targetName) {
    case 'AuCompose':
      return bindables(source, [
        { name: 'template' },
        { name: 'component' },
        { name: 'model' },
        { name: 'scopeBehavior', setterKind: BindableSetterKind.Function, setterName: 'AuCompose.scopeBehavior.set' },
        { name: 'composing', mode: BindableBindingMode.FromView },
        { name: 'composition', mode: BindableBindingMode.FromView },
        { name: 'tag' },
        { name: 'flushMode', setterKind: BindableSetterKind.Function, setterName: 'AuCompose.flushMode.set' },
      ]);
    case 'AuSlot':
      return bindables(source, [
        { name: 'expose' },
        { name: 'slotchange' },
      ]);
    case 'ViewportCustomElement':
      return bindables(source, [
        { name: 'name' },
        { name: 'usedBy' },
        { name: 'default' },
        { name: 'fallback' },
      ]);
    case 'ValidationContainerCustomElement':
      return bindables(source, [
        { name: 'controller' },
        { name: 'errors' },
      ]);
    default:
      return [];
  }
}

function builtInAttributeBindables(
  targetName: string,
  source: BuiltInResourceDefinitionSource,
): readonly BindableDefinition[] {
  switch (targetName) {
    case 'If':
      return bindables(source, [
        { name: 'value' },
        { name: 'cache', setterKind: BindableSetterKind.Function, setterName: 'If.cache.set' },
      ]);
    case 'Repeat':
      return bindables(source, [{ name: 'items' }]);
    case 'VirtualRepeat':
      return bindables(source, [
        { name: 'local' },
        { name: 'items' },
      ]);
    case 'With':
    case 'Switch':
    case 'PromiseTemplateController':
    case 'Show':
      return bindables(source, [{ name: 'value' }]);
    case 'PendingTemplateController':
      return bindables(source, [{ name: 'value', mode: BindableBindingMode.ToView }]);
    case 'FulfilledTemplateController':
    case 'RejectedTemplateController':
      return bindables(source, [{ name: 'value', mode: BindableBindingMode.FromView }]);
    case 'Case':
    case 'DefaultCase':
      return bindables(source, [
        { name: 'value' },
        {
          name: 'fallThrough',
          mode: BindableBindingMode.OneTime,
          setterKind: BindableSetterKind.Function,
          setterName: `${targetName}.fallThrough.set`,
        },
      ]);
    case 'Portal':
      return bindables(source, [
        { name: 'target' },
        { name: 'position' },
        { name: 'activated' },
        { name: 'activating' },
        { name: 'callbackContext' },
        { name: 'renderContext', callback: 'targetChanged' },
        { name: 'strict' },
        { name: 'deactivated' },
        { name: 'deactivating' },
      ]);
    case 'Focus':
      return bindables(source, [{ name: 'value', mode: BindableBindingMode.TwoWay }]);
    case 'LoadCustomAttribute':
      return bindables(source, [
        { name: 'route' },
        { name: 'params' },
        { name: 'attribute' },
        { name: 'active', mode: BindableBindingMode.FromView },
        { name: 'context' },
      ]);
    case 'HrefCustomAttribute':
      return bindables(source, [{ name: 'value' }]);
    case 'ValidationErrorsCustomAttribute':
      return bindables(source, [
        { name: 'controller' },
        { name: 'errors', mode: BindableBindingMode.TwoWay },
      ]);
    case 'Else':
    default:
      return [];
  }
}

function builtInDefaultProperty(targetName: string): string {
  switch (targetName) {
    case 'Repeat':
    case 'VirtualRepeat':
      return 'items';
    case 'Portal':
      return 'target';
    case 'LoadCustomAttribute':
      return 'route';
    case 'ValidationErrorsCustomAttribute':
      return 'errors';
    default:
      return 'value';
  }
}

function builtInNoMultiBindings(targetName: string): boolean {
  switch (targetName) {
    case 'HrefCustomAttribute':
      return true;
    default:
      return false;
  }
}

function bindables(
  source: BuiltInResourceDefinitionSource,
  inputs: readonly BuiltInBindableInput[],
): readonly BindableDefinition[] {
  return inputs.map((input) => new BindableDefinition(
    input.attribute ?? bindableAttributeNameForProperty(input.name),
    input.callback ?? `${input.name}Changed`,
    input.mode ?? BindableBindingMode.ToView,
    input.name,
    new BindableSetterDefinition(
      input.setterKind ?? BindableSetterKind.Default,
      input.setterName == null
        ? null
        : new ResourceTargetReference(null, source.addressHandle, input.setterName),
    ),
    source.addressHandle,
  ));
}
