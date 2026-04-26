import type { KeyRef } from '../refs.js';
import { auLink } from '../au-link.js';
import type {
  ResourceDefinitionState,
  ResourceDefinitionType,
} from './contracts.js';
import {
  BindingBehaviorExecutionSurface,
  BindingBehaviorIdentity,
} from './binding-behavior-support.js';

@auLink('runtime-html:BindingBehaviorDefinition')
export class BindingBehaviorDefinition implements ResourceDefinitionState<'binding-behavior'> {
  readonly kind = 'binding-behavior' as const;
  readonly identity: BindingBehaviorIdentity;
  readonly execution: BindingBehaviorExecutionSurface;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly key: KeyRef | null,
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
    identity: BindingBehaviorIdentity | null = null,
    execution: BindingBehaviorExecutionSurface = new BindingBehaviorExecutionSurface(
      null,
      null,
      null,
      [],
      'Binding-behavior execution surface has not been materialized yet.',
    ),
  ) {
    this.identity = identity ?? new BindingBehaviorIdentity(name, aliases, key);
    this.execution = execution;
  }
}
