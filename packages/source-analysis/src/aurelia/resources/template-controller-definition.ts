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
import { CustomAttributeLifecycleHooks } from './custom-attribute-lifecycle-support.js';

// Template controllers are custom-attribute carrier truth plus later
// structural semantics. This row keeps the shared CA support bundle intact so
// later structural lowering can stand on the same admission/support base.
export class TemplateControllerDefinition implements ResourceDefinitionState<'template-controller'> {
  readonly kind = 'template-controller' as const;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly identity: CustomAttributeIdentity,
    readonly bindableSurface: CustomAttributeBindableSurface = new CustomAttributeBindableSurface(),
    readonly policy: CustomAttributePolicy = new CustomAttributePolicy(
      null,
      null,
      null,
      true,
      [],
      'Template-controller definition defaults to template-controller posture unless a materializer refines it.',
    ),
    readonly dependencyContribution: CustomAttributeDependencyContribution = new CustomAttributeDependencyContribution(),
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

  get dependencies(): CustomAttributeDependencyContribution {
    return this.dependencyContribution;
  }
}
