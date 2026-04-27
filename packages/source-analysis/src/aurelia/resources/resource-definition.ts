import { auLink } from '../au-link.js';
import type {
  AttributePatternObservation,
  ResourceTargetObservation,
} from './resource-observation.js';
import { RecognizedResourceKind } from './resource-kind.js';

@auLink('runtime-html:CustomElementDefinition')
export class RecognizedCustomElementDefinition {
  get type(): RecognizedResourceKind.CustomElement { return RecognizedResourceKind.CustomElement; }

  constructor(
    /** Runtime target that will act as the custom element view model type. */
    readonly target: ResourceTargetObservation | null,
    /** Static custom element name when recognition closed over one. */
    readonly name: string | null,
    /** Static aliases that name the same custom element definition. */
    readonly aliases: readonly string[] = [],
  ) {}
}

@auLink('runtime-html:CustomAttributeDefinition')
export class RecognizedCustomAttributeDefinition {
  get type(): RecognizedResourceKind.CustomAttribute { return RecognizedResourceKind.CustomAttribute; }

  constructor(
    /** Runtime target that will act as the custom attribute view model type. */
    readonly target: ResourceTargetObservation | null,
    /** Static custom attribute name when recognition closed over one. */
    readonly name: string | null,
    /** Static aliases that name the same custom attribute definition. */
    readonly aliases: readonly string[] = [],
  ) {}
}

export class RecognizedTemplateControllerDefinition {
  get type(): RecognizedResourceKind.TemplateController { return RecognizedResourceKind.TemplateController; }

  constructor(
    /** Runtime target that will act as the template controller view model type. */
    readonly target: ResourceTargetObservation | null,
    /** Static template controller attribute name when recognition closed over one. */
    readonly name: string | null,
    /** Static aliases that name the same template controller definition. */
    readonly aliases: readonly string[] = [],
  ) {}
}

@auLink('runtime-html:ValueConverterDefinition')
export class RecognizedValueConverterDefinition {
  get type(): RecognizedResourceKind.ValueConverter { return RecognizedResourceKind.ValueConverter; }

  constructor(
    /** Runtime target that will act as the value converter implementation type. */
    readonly target: ResourceTargetObservation | null,
    /** Static value converter name when recognition closed over one. */
    readonly name: string | null,
    /** Static aliases that name the same value converter definition. */
    readonly aliases: readonly string[] = [],
  ) {}
}

@auLink('runtime-html:BindingBehaviorDefinition')
export class RecognizedBindingBehaviorDefinition {
  get type(): RecognizedResourceKind.BindingBehavior { return RecognizedResourceKind.BindingBehavior; }

  constructor(
    /** Runtime target that will act as the binding behavior implementation type. */
    readonly target: ResourceTargetObservation | null,
    /** Static binding behavior name when recognition closed over one. */
    readonly name: string | null,
    /** Static aliases that name the same binding behavior definition. */
    readonly aliases: readonly string[] = [],
  ) {}
}

@auLink('template-compiler:BindingCommandDefinition')
export class RecognizedBindingCommandDefinition {
  get type(): RecognizedResourceKind.BindingCommand { return RecognizedResourceKind.BindingCommand; }

  constructor(
    /** Runtime target that will act as the binding command implementation type. */
    readonly target: ResourceTargetObservation | null,
    /** Static binding command name when recognition closed over one. */
    readonly name: string | null,
    /** Static aliases that name the same binding command definition. */
    readonly aliases: readonly string[] = [],
  ) {}
}

@auLink('template-compiler:AttributePattern')
export class RecognizedAttributePatternDefinition {
  get type(): RecognizedResourceKind.AttributePattern { return RecognizedResourceKind.AttributePattern; }

  constructor(
    /** Runtime target that supplies the attribute pattern behavior. */
    readonly target: ResourceTargetObservation | null,
    /** Static parser pattern definitions recognized for this target. */
    readonly patterns: readonly AttributePatternObservation[] = [],
  ) {}
}

export type RecognizedNamedResourceDefinition =
  | RecognizedCustomElementDefinition
  | RecognizedCustomAttributeDefinition
  | RecognizedTemplateControllerDefinition
  | RecognizedValueConverterDefinition
  | RecognizedBindingBehaviorDefinition
  | RecognizedBindingCommandDefinition;

export type RecognizedResourceDefinition =
  | RecognizedNamedResourceDefinition
  | RecognizedAttributePatternDefinition;

export function createRecognizedNamedResourceDefinition(
  resourceKind: RecognizedNamedResourceDefinition['type'],
  target: ResourceTargetObservation | null,
  name: string | null,
  aliases: readonly string[],
): RecognizedNamedResourceDefinition {
  switch (resourceKind) {
    case RecognizedResourceKind.CustomElement:
      return new RecognizedCustomElementDefinition(target, name, aliases);
    case RecognizedResourceKind.CustomAttribute:
      return new RecognizedCustomAttributeDefinition(target, name, aliases);
    case RecognizedResourceKind.TemplateController:
      return new RecognizedTemplateControllerDefinition(target, name, aliases);
    case RecognizedResourceKind.ValueConverter:
      return new RecognizedValueConverterDefinition(target, name, aliases);
    case RecognizedResourceKind.BindingBehavior:
      return new RecognizedBindingBehaviorDefinition(target, name, aliases);
    case RecognizedResourceKind.BindingCommand:
      return new RecognizedBindingCommandDefinition(target, name, aliases);
  }
}
