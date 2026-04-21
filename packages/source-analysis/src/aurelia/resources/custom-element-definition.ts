import type { KeyRef } from '../refs.js';
import type {
  ResourceDefinitionState,
  ResourceDefinitionType,
} from './contracts.js';
import { BindableSurface } from './bindable-support.js';
import { ChildrenSurface } from './children-support.js';
import {
  CustomElementDependencyContribution,
  CustomElementIdentity,
  CustomElementPolicy,
  CustomElementTemplateSource,
} from './custom-element-support.js';
import { CustomElementLifecycleHooks } from './custom-element-lifecycle-support.js';
import { CustomElementSlotTopology } from './custom-element-slot-topology-support.js';
import { SlottedSurface } from './slotted-support.js';
import { WatchSurface } from './watch-support.js';

export class CustomElementDefinition implements ResourceDefinitionState<'custom-element'> {
  readonly kind = 'custom-element' as const;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly identity: CustomElementIdentity,
    readonly policy: CustomElementPolicy = new CustomElementPolicy(),
    readonly bindableSurface: BindableSurface = new BindableSurface(),
    readonly dependencyContribution: CustomElementDependencyContribution = new CustomElementDependencyContribution(),
    readonly templateSource: CustomElementTemplateSource = new CustomElementTemplateSource(
      'open',
      null,
      null,
      null,
      'Template source has not been materialized yet.',
    ),
    readonly watchSurface: WatchSurface = new WatchSurface(),
    readonly lifecycleHooks: CustomElementLifecycleHooks = new CustomElementLifecycleHooks(),
    readonly childrenSurface: ChildrenSurface = new ChildrenSurface(),
    readonly slottedSurface: SlottedSurface = new SlottedSurface(),
    readonly slotTopology: CustomElementSlotTopology = new CustomElementSlotTopology(),
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
