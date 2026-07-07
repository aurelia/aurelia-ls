import type ts from 'typescript';
import { AureliaResourceIdentityKind } from '../kernel/identity.js';
import {
  BindingBehaviorDefinitionHeader,
  BindingCommandDefinitionHeader,
  CustomAttributeDefinitionHeader,
  CustomElementDefinitionHeader,
  TemplateControllerDefinitionHeader,
  ValueConverterDefinitionHeader,
  type NamedResourceDefinitionHeader,
} from './resource-definition.js';
import {
  ResourceDefinitionKind,
  type NamedResourceDefinitionKind,
} from './resource-kind.js';
import type { ResourceTargetObservation } from './resource-observation-primitives.js';

interface NamedResourceKindDescriptor {
  readonly identityKind: AureliaResourceIdentityKind;
  createHeader(
    target: ResourceTargetObservation | null,
    name: string | null,
    aliases: readonly string[],
    nameSourceNode: ts.Node | null,
  ): NamedResourceDefinitionHeader;
}

const NamedResourceKindDescriptors: Readonly<Record<NamedResourceDefinitionKind, NamedResourceKindDescriptor>> = {
  [ResourceDefinitionKind.CustomElement]: {
    identityKind: AureliaResourceIdentityKind.CustomElement,
    createHeader: (target, name, aliases, nameSourceNode) => new CustomElementDefinitionHeader(target, name, aliases, nameSourceNode),
  },
  [ResourceDefinitionKind.CustomAttribute]: {
    identityKind: AureliaResourceIdentityKind.CustomAttribute,
    createHeader: (target, name, aliases, nameSourceNode) => new CustomAttributeDefinitionHeader(target, name, aliases, nameSourceNode),
  },
  [ResourceDefinitionKind.TemplateController]: {
    identityKind: AureliaResourceIdentityKind.TemplateController,
    createHeader: (target, name, aliases, nameSourceNode) => new TemplateControllerDefinitionHeader(target, name, aliases, nameSourceNode),
  },
  [ResourceDefinitionKind.ValueConverter]: {
    identityKind: AureliaResourceIdentityKind.ValueConverter,
    createHeader: (target, name, aliases, nameSourceNode) => new ValueConverterDefinitionHeader(target, name, aliases, nameSourceNode),
  },
  [ResourceDefinitionKind.BindingBehavior]: {
    identityKind: AureliaResourceIdentityKind.BindingBehavior,
    createHeader: (target, name, aliases, nameSourceNode) => new BindingBehaviorDefinitionHeader(target, name, aliases, nameSourceNode),
  },
  [ResourceDefinitionKind.BindingCommand]: {
    identityKind: AureliaResourceIdentityKind.BindingCommand,
    createHeader: (target, name, aliases, nameSourceNode) => new BindingCommandDefinitionHeader(target, name, aliases, nameSourceNode),
  },
};

export function createNamedResourceDefinitionHeader(
  resourceKind: NamedResourceDefinitionKind,
  target: ResourceTargetObservation | null,
  name: string | null,
  aliases: readonly string[],
  nameSourceNode: ts.Node | null = null,
): NamedResourceDefinitionHeader {
  return NamedResourceKindDescriptors[resourceKind].createHeader(target, name, aliases, nameSourceNode);
}

export function toAureliaResourceIdentityKind(
  kind: NamedResourceDefinitionKind,
): AureliaResourceIdentityKind {
  return NamedResourceKindDescriptors[kind].identityKind;
}
