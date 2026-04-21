import type { KeyRef } from '../refs.js';
import type {
  ResourceDefinitionState,
  ResourceDefinitionType,
} from './contracts.js';
import {
  CustomElementBindableSurface,
  CustomElementDependencyContribution,
  CustomElementIdentity,
  CustomElementPolicy,
  CustomElementTemplateSource,
} from './custom-element-support.js';

export class CustomElementDefinition implements ResourceDefinitionState<'custom-element'> {
  readonly kind = 'custom-element' as const;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly identity: CustomElementIdentity,
    readonly policy: CustomElementPolicy = new CustomElementPolicy(),
    readonly bindableSurface: CustomElementBindableSurface = new CustomElementBindableSurface(),
    readonly dependencyContribution: CustomElementDependencyContribution = new CustomElementDependencyContribution(),
    readonly templateSource: CustomElementTemplateSource = new CustomElementTemplateSource(
      'open',
      null,
      null,
      null,
      'Template source has not been materialized yet.',
    ),
  ) {}

  get key(): KeyRef | null {
    return this.identity.key;
  }

  get name(): string | null {
    return this.identity.name;
  }

  get aliases(): readonly string[] {
    return this.identity.aliases;
  }

  get dependencies(): CustomElementDependencyContribution {
    return this.dependencyContribution;
  }
}
