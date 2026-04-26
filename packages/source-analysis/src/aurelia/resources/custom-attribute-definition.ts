import type { KeyRef } from '../refs.js';
import { auLink } from '../au-link.js';
import type {
  ResourceDefinitionState,
  ResourceDefinitionType,
} from './contracts.js';
import { BindableSurface } from './bindable-support.js';
import {
  CustomAttributeDependencyContribution,
  CustomAttributeIdentity,
  CustomAttributePolicy,
} from './custom-attribute-support.js';
import { CustomAttributeLifecycleHooks } from './custom-attribute-lifecycle-support.js';
import { WatchSurface } from './watch-support.js';

@auLink('runtime-html:CustomAttributeDefinition')
export class CustomAttributeDefinition implements ResourceDefinitionState<'custom-attribute'> {
  readonly kind = 'custom-attribute' as const;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly identity: CustomAttributeIdentity,
    readonly bindableSurface: BindableSurface = new BindableSurface(),
    readonly policy: CustomAttributePolicy = new CustomAttributePolicy(),
    readonly dependencyContribution: CustomAttributeDependencyContribution = new CustomAttributeDependencyContribution(),
    readonly defaultBindingMode: string | null = null,
    readonly watchSurface: WatchSurface = new WatchSurface(),
    readonly lifecycleHooks: CustomAttributeLifecycleHooks = new CustomAttributeLifecycleHooks(),
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
