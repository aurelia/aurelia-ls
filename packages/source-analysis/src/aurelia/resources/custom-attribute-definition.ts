import type { KeyRef } from '../refs.js';
import type {
  ResourceDefinitionState,
  ResourceDefinitionType,
} from './contracts.js';
import {
  CustomAttributeBindableSurface,
  CustomAttributeDependencyContribution,
  CustomAttributeIdentity,
  CustomAttributePolicy,
} from './custom-attribute-support.js';

export class CustomAttributeDefinition implements ResourceDefinitionState<'custom-attribute'> {
  readonly kind = 'custom-attribute' as const;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly identity: CustomAttributeIdentity,
    readonly bindableSurface: CustomAttributeBindableSurface = new CustomAttributeBindableSurface(),
    readonly policy: CustomAttributePolicy = new CustomAttributePolicy(),
    readonly dependencyContribution: CustomAttributeDependencyContribution = new CustomAttributeDependencyContribution(),
    readonly defaultBindingMode: string | null = null,
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

  get defaultProperty(): string | null {
    return this.policy.defaultProperty;
  }

  get noMultiBindings(): boolean | null {
    return this.policy.noMultiBindings;
  }

  get containerStrategy(): 'reuse' | 'new' | null {
    return this.policy.containerStrategy;
  }

  get isTemplateController(): boolean {
    return this.policy.isTemplateController === true;
  }

  get dependencies(): CustomAttributeDependencyContribution {
    return this.dependencyContribution;
  }
}
