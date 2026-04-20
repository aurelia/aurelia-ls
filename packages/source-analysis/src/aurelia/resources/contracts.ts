import type {
  KeyRef,
  SourceNodeRef,
  SymbolRef,
} from '../refs.js';

export const RESOURCE_DEFINITION_KINDS = [
  'custom-element',
  'custom-attribute',
  'template-controller',
  'value-converter',
  'binding-behavior',
  'binding-command',
  'attribute-pattern',
] as const;

export type ResourceDefinitionKind =
  typeof RESOURCE_DEFINITION_KINDS[number];

export type ResourceDefinitionType =
  SymbolRef | SourceNodeRef;

export interface ResourceDefinitionState<TKind extends ResourceDefinitionKind> {
  readonly id: string;
  readonly kind: TKind;
  readonly type: ResourceDefinitionType;
  readonly key: KeyRef | null;
}
