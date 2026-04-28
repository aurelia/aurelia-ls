import type {
  AddressHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import { auLink } from '../kernel/au-link.js';
import { ResourceDefinitionKind } from './resource-kind.js';
import type { ResourceTargetReference } from './resource-reference.js';

export type AttributePatternDefinitionField =
  | 'target'
  | 'patterns';

@auLink('template-compiler:AttributePatternDefinition')
export class AttributePatternDefinitionEntry {
  constructor(
    readonly pattern: string,
    readonly symbols: string,
    readonly addressHandle: AddressHandle | null = null,
    readonly provenanceHandle: ProvenanceHandle | null = null,
  ) {}
}

export const enum AttributePatternDefinitionContributionKind {
  Header = 'header',
  CreateCall = 'create-call',
  Convention = 'convention',
}

// TODO(resource-convergence): AttributePattern is a registry factory in the framework, not a runtime definition class.
// Keep this model as the tooling definition of the registered parser patterns until syntax-resource convergence settles.
export class AttributePatternDefinitionContribution {
  constructor(
    readonly contributionKind: AttributePatternDefinitionContributionKind,
    readonly target: ResourceTargetReference | null = null,
    readonly patterns: readonly AttributePatternDefinitionEntry[] = [],
    readonly fieldProvenance: readonly FieldProvenance<AttributePatternDefinitionField>[] = [],
  ) {}
}

@auLink('template-compiler:AttributePattern')
export class AttributePatternDefinition {
  get type(): ResourceDefinitionKind.AttributePattern { return ResourceDefinitionKind.AttributePattern; }

  constructor(
    readonly target: ResourceTargetReference,
    readonly patterns: readonly AttributePatternDefinitionEntry[],
    readonly contributions: readonly AttributePatternDefinitionContribution[] = [],
    readonly fieldProvenance: readonly FieldProvenance<AttributePatternDefinitionField>[] = [],
  ) {}
}
