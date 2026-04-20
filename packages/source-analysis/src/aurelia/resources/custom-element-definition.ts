import type { KeyRef } from '../refs.js';
import type {
  ResourceDefinitionState,
  ResourceDefinitionType,
} from './contracts.js';

export class CustomElementDefinition implements ResourceDefinitionState<'custom-element'> {
  readonly kind = 'custom-element' as const;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly key: KeyRef | null,
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
    readonly bindables: readonly string[] = [],
  ) {}
}
