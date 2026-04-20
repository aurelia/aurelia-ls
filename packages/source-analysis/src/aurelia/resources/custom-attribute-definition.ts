import type { KeyRef } from '../refs.js';
import type {
  ResourceDefinitionState,
  ResourceDefinitionType,
} from './contracts.js';

export class CustomAttributeDefinition implements ResourceDefinitionState<'custom-attribute'> {
  readonly kind = 'custom-attribute' as const;

  constructor(
    readonly id: string,
    readonly type: ResourceDefinitionType,
    readonly key: KeyRef | null,
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
    readonly defaultBindingMode: string | null = null,
    readonly isTemplateController: boolean = false,
  ) {}
}
