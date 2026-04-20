import type { KeyRef } from '../refs.js';
import type {
  ResourceDefinitionState,
  ResourceDefinitionType,
} from './contracts.js';

export class AttributePatternDefinition implements ResourceDefinitionState<'attribute-pattern'> {
  readonly kind = 'attribute-pattern' as const;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly key: KeyRef | null,
    readonly pattern: string | null,
    readonly symbols: readonly string[] = [],
  ) {}
}
