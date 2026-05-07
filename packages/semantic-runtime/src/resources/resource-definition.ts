import type {
  AttributePatternObservation,
  ResourceTargetObservation,
} from './resource-observation-primitives.js';
import type { AttributePatternDefinition } from './attribute-pattern-definition.js';
import type { BindingBehaviorDefinition } from './binding-behavior-definition.js';
import type { BindingCommandDefinition } from './binding-command-definition.js';
import type { CustomAttributeDefinition } from './custom-attribute-definition.js';
import type { CustomElementDefinition } from './custom-element-definition.js';
import { ResourceDefinitionKind } from './resource-kind.js';
import type { ValueConverterDefinition } from './value-converter-definition.js';

export class CustomElementDefinitionHeader {
  get type(): ResourceDefinitionKind.CustomElement { return ResourceDefinitionKind.CustomElement; }

  constructor(
    /** Runtime target that will act as the custom element view model type. */
    readonly target: ResourceTargetObservation | null,
    /** Static custom element name when recognition closed over one. */
    readonly name: string | null,
    /** Static aliases that name the same custom element definition. */
    readonly aliases: readonly string[] = [],
  ) {}
}

export class CustomAttributeDefinitionHeader {
  get type(): ResourceDefinitionKind.CustomAttribute { return ResourceDefinitionKind.CustomAttribute; }

  constructor(
    /** Runtime target that will act as the custom attribute view model type. */
    readonly target: ResourceTargetObservation | null,
    /** Static custom attribute name when recognition closed over one. */
    readonly name: string | null,
    /** Static aliases that name the same custom attribute definition. */
    readonly aliases: readonly string[] = [],
  ) {}
}

export class TemplateControllerDefinitionHeader {
  get type(): ResourceDefinitionKind.TemplateController { return ResourceDefinitionKind.TemplateController; }

  constructor(
    /** Runtime target that will act as the template controller view model type. */
    readonly target: ResourceTargetObservation | null,
    /** Static template controller attribute name when recognition closed over one. */
    readonly name: string | null,
    /** Static aliases that name the same template controller definition. */
    readonly aliases: readonly string[] = [],
  ) {}
}

export class ValueConverterDefinitionHeader {
  get type(): ResourceDefinitionKind.ValueConverter { return ResourceDefinitionKind.ValueConverter; }

  constructor(
    /** Runtime target that will act as the value converter implementation type. */
    readonly target: ResourceTargetObservation | null,
    /** Static value converter name when recognition closed over one. */
    readonly name: string | null,
    /** Static aliases that name the same value converter definition. */
    readonly aliases: readonly string[] = [],
  ) {}
}

export class BindingBehaviorDefinitionHeader {
  get type(): ResourceDefinitionKind.BindingBehavior { return ResourceDefinitionKind.BindingBehavior; }

  constructor(
    /** Runtime target that will act as the binding behavior implementation type. */
    readonly target: ResourceTargetObservation | null,
    /** Static binding behavior name when recognition closed over one. */
    readonly name: string | null,
    /** Static aliases that name the same binding behavior definition. */
    readonly aliases: readonly string[] = [],
  ) {}
}

export class BindingCommandDefinitionHeader {
  get type(): ResourceDefinitionKind.BindingCommand { return ResourceDefinitionKind.BindingCommand; }

  constructor(
    /** Runtime target that will act as the binding command implementation type. */
    readonly target: ResourceTargetObservation | null,
    /** Static binding command name when recognition closed over one. */
    readonly name: string | null,
    /** Static aliases that name the same binding command definition. */
    readonly aliases: readonly string[] = [],
  ) {}
}

export class AttributePatternDefinitionHeader {
  get type(): ResourceDefinitionKind.AttributePattern { return ResourceDefinitionKind.AttributePattern; }

  constructor(
    /** Runtime target that supplies the attribute pattern behavior. */
    readonly target: ResourceTargetObservation | null,
    /** Static parser pattern definitions recognized for this target. */
    readonly patterns: readonly AttributePatternObservation[] = [],
  ) {}
}

export type NamedResourceDefinitionHeader =
  | CustomElementDefinitionHeader
  | CustomAttributeDefinitionHeader
  | TemplateControllerDefinitionHeader
  | ValueConverterDefinitionHeader
  | BindingBehaviorDefinitionHeader
  | BindingCommandDefinitionHeader;

export type ResourceDefinitionHeader =
  | NamedResourceDefinitionHeader
  | AttributePatternDefinitionHeader;

export type FullResourceDefinition =
  | CustomElementDefinition
  | CustomAttributeDefinition
  | ValueConverterDefinition
  | BindingBehaviorDefinition
  | BindingCommandDefinition
  | AttributePatternDefinition;

export type TemplateCompilableResourceDefinition =
  | CustomElementDefinition
  | CustomAttributeDefinition;

export function createNamedResourceDefinitionHeader(
  resourceKind: NamedResourceDefinitionHeader['type'],
  target: ResourceTargetObservation | null,
  name: string | null,
  aliases: readonly string[],
): NamedResourceDefinitionHeader {
  switch (resourceKind) {
    case ResourceDefinitionKind.CustomElement:
      return new CustomElementDefinitionHeader(target, name, aliases);
    case ResourceDefinitionKind.CustomAttribute:
      return new CustomAttributeDefinitionHeader(target, name, aliases);
    case ResourceDefinitionKind.TemplateController:
      return new TemplateControllerDefinitionHeader(target, name, aliases);
    case ResourceDefinitionKind.ValueConverter:
      return new ValueConverterDefinitionHeader(target, name, aliases);
    case ResourceDefinitionKind.BindingBehavior:
      return new BindingBehaviorDefinitionHeader(target, name, aliases);
    case ResourceDefinitionKind.BindingCommand:
      return new BindingCommandDefinitionHeader(target, name, aliases);
  }
}
