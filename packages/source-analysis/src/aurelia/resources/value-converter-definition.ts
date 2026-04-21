import type { KeyRef } from '../refs.js';
import type {
  ResourceDefinitionState,
  ResourceDefinitionType,
} from './contracts.js';
import {
  ValueConverterBehavior,
  ValueConverterIdentity,
} from './value-converter-support.js';

export class ValueConverterDefinition implements ResourceDefinitionState<'value-converter'> {
  readonly kind = 'value-converter' as const;
  readonly identity: ValueConverterIdentity;
  readonly behavior: ValueConverterBehavior;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly key: KeyRef | null,
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
    identity: ValueConverterIdentity | null = null,
    behavior: ValueConverterBehavior = new ValueConverterBehavior(
      [],
      null,
      null,
      null,
      [],
      'Value-converter behavior has not been materialized yet.',
    ),
  ) {
    this.identity = identity ?? new ValueConverterIdentity(name, aliases, key);
    this.behavior = behavior;
  }
}
