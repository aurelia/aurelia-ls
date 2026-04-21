import type { KeyRef } from '../refs.js';
import type {
  ResourceDefinitionState,
  ResourceDefinitionType,
} from './contracts.js';
import {
  BindingCommandBuildBasis,
  BindingCommandInstructionEmission,
  BindingCommandIdentity,
  BindingCommandValueHandling,
} from './binding-command-support.js';

export class BindingCommandDefinition implements ResourceDefinitionState<'binding-command'> {
  readonly kind = 'binding-command' as const;
  readonly identity: BindingCommandIdentity;
  readonly buildBasis: BindingCommandBuildBasis;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly key: KeyRef | null,
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
    identity: BindingCommandIdentity | null = null,
    buildBasis: BindingCommandBuildBasis = new BindingCommandBuildBasis(
      null,
      null,
      new BindingCommandInstructionEmission(),
      new BindingCommandValueHandling(),
      [],
      'Binding-command build basis has not been materialized yet.',
    ),
  ) {
    this.identity = identity ?? new BindingCommandIdentity(name, aliases, key);
    this.buildBasis = buildBasis;
  }
}
