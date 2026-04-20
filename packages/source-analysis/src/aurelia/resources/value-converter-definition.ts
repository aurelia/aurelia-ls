import type { KeyRef } from '../refs.js';
import type {
  ResourceDefinitionState,
  ResourceDefinitionType,
} from './contracts.js';

export class ValueConverterDefinition implements ResourceDefinitionState<'value-converter'> {
  readonly kind = 'value-converter' as const;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly key: KeyRef | null,
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
  ) {}
}
