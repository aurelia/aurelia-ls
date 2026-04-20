import type { KeyRef } from '../refs.js';
import type {
  ResourceDefinitionState,
  ResourceDefinitionType,
} from './contracts.js';

export class BindingCommandDefinition implements ResourceDefinitionState<'binding-command'> {
  readonly kind = 'binding-command' as const;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly key: KeyRef | null,
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
  ) {}
}
