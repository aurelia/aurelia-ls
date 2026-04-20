import type { ResourceDefinitionKind } from './contracts.js';
import type { ResourceCandidate, ResourceCarrierKind, ResourceRecognitionPathKind } from './resource-candidate.js';

export const DEFINITION_FIELD_KINDS = [
  'name',
  'aliases',
  'bindables',
  'default-binding-mode',
  'is-template-controller',
  'pattern',
] as const;

export type DefinitionFieldKind =
  typeof DEFINITION_FIELD_KINDS[number];

export const DEFINITION_CONTRIBUTION_STATUSES = [
  'closed',
  'open',
] as const;

export type DefinitionContributionStatus =
  typeof DEFINITION_CONTRIBUTION_STATUSES[number];

export class DefinitionFieldContribution {
  constructor(
    readonly field: DefinitionFieldKind,
    readonly status: DefinitionContributionStatus,
    readonly originPath: ResourceRecognitionPathKind,
    readonly valueSummary: string | null = null,
    readonly note: string | null = null,
  ) {}
}

// This is still below final definition convergence. It says "this candidate,
// through this carrier lane, can contribute these fields with these origins"
// without claiming that the final definition has been materialized yet.
export class DefinitionCarrier {
  constructor(
    readonly id: string,
    readonly sourceCandidate: ResourceCandidate,
    readonly carrierKind: ResourceCarrierKind,
    readonly possibleKinds: readonly ResourceDefinitionKind[] = [],
    readonly contributions: readonly DefinitionFieldContribution[] = [],
    readonly note: string | null = null,
  ) {}
}
