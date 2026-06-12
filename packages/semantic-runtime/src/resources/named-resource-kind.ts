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
  ): NamedResourceDefinitionHeader;
}

const NamedResourceKindDescriptors: Readonly<Record<NamedResourceDefinitionKind, NamedResourceKindDescriptor>> = {
  [ResourceDefinitionKind.CustomElement]: {
    identityKind: AureliaResourceIdentityKind.CustomElement,
    createHeader: (target, name, aliases) => new CustomElementDefinitionHeader(target, name, aliases),
  },
  [ResourceDefinitionKind.CustomAttribute]: {
    identityKind: AureliaResourceIdentityKind.CustomAttribute,
    createHeader: (target, name, aliases) => new CustomAttributeDefinitionHeader(target, name, aliases),
  },
  [ResourceDefinitionKind.TemplateController]: {
    identityKind: AureliaResourceIdentityKind.TemplateController,
    createHeader: (target, name, aliases) => new TemplateControllerDefinitionHeader(target, name, aliases),
  },
  [ResourceDefinitionKind.ValueConverter]: {
    identityKind: AureliaResourceIdentityKind.ValueConverter,
    createHeader: (target, name, aliases) => new ValueConverterDefinitionHeader(target, name, aliases),
  },
  [ResourceDefinitionKind.BindingBehavior]: {
    identityKind: AureliaResourceIdentityKind.BindingBehavior,
    createHeader: (target, name, aliases) => new BindingBehaviorDefinitionHeader(target, name, aliases),
  },
  [ResourceDefinitionKind.BindingCommand]: {
    identityKind: AureliaResourceIdentityKind.BindingCommand,
    createHeader: (target, name, aliases) => new BindingCommandDefinitionHeader(target, name, aliases),
  },
};

export function createNamedResourceDefinitionHeader(
  resourceKind: NamedResourceDefinitionKind,
  target: ResourceTargetObservation | null,
  name: string | null,
  aliases: readonly string[],
): NamedResourceDefinitionHeader {
  return NamedResourceKindDescriptors[resourceKind].createHeader(target, name, aliases);
}

export function toAureliaResourceIdentityKind(
  kind: NamedResourceDefinitionKind,
): AureliaResourceIdentityKind {
  return NamedResourceKindDescriptors[kind].identityKind;
}
