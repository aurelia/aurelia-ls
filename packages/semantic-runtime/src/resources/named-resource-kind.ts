import type ts from 'typescript';
import { AureliaResourceDeclarationKind } from '../kernel/identity.js';
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
  readonly declarationKind: AureliaResourceDeclarationKind;
  createHeader(
    target: ResourceTargetObservation | null,
    name: string | null,
    aliases: readonly string[],
    nameSourceNode: ts.Node | null,
  ): NamedResourceDefinitionHeader;
}

const NamedResourceKindDescriptors: Readonly<Record<NamedResourceDefinitionKind, NamedResourceKindDescriptor>> = {
  [ResourceDefinitionKind.CustomElement]: {
    declarationKind: AureliaResourceDeclarationKind.CustomElement,
    createHeader: (target, name, aliases, nameSourceNode) => new CustomElementDefinitionHeader(target, name, aliases, nameSourceNode),
  },
  [ResourceDefinitionKind.CustomAttribute]: {
    declarationKind: AureliaResourceDeclarationKind.CustomAttribute,
    createHeader: (target, name, aliases, nameSourceNode) => new CustomAttributeDefinitionHeader(target, name, aliases, nameSourceNode),
  },
  [ResourceDefinitionKind.TemplateController]: {
    declarationKind: AureliaResourceDeclarationKind.TemplateController,
    createHeader: (target, name, aliases, nameSourceNode) => new TemplateControllerDefinitionHeader(target, name, aliases, nameSourceNode),
  },
  [ResourceDefinitionKind.ValueConverter]: {
    declarationKind: AureliaResourceDeclarationKind.ValueConverter,
    createHeader: (target, name, aliases, nameSourceNode) => new ValueConverterDefinitionHeader(target, name, aliases, nameSourceNode),
  },
  [ResourceDefinitionKind.BindingBehavior]: {
    declarationKind: AureliaResourceDeclarationKind.BindingBehavior,
    createHeader: (target, name, aliases, nameSourceNode) => new BindingBehaviorDefinitionHeader(target, name, aliases, nameSourceNode),
  },
  [ResourceDefinitionKind.BindingCommand]: {
    declarationKind: AureliaResourceDeclarationKind.BindingCommand,
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

export function toAureliaResourceDeclarationKind(
  kind: NamedResourceDefinitionKind,
): AureliaResourceDeclarationKind {
  return NamedResourceKindDescriptors[kind].declarationKind;
}
