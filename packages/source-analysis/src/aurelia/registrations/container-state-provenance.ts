import { ProvenanceSet, type ProvenanceMode } from '../provenance/index.js';
import type { RegistrationTransition } from './registration-transition.js';

export const CONTAINER_STATE_PROVENANCE_MODES = [
  'selected',
  'aggregated',
  'policy-generated',
] as const satisfies readonly ProvenanceMode[];

export type ContainerStateProvenanceMode =
  typeof CONTAINER_STATE_PROVENANCE_MODES[number];

export const CONTAINER_STATE_PROVENANCE_FIELD_KINDS = [
  'container-state',
] as const;

export type ContainerStateProvenanceFieldKind =
  typeof CONTAINER_STATE_PROVENANCE_FIELD_KINDS[number];

export class ContainerStateProvenance {
  readonly provenanceSet: ProvenanceSet<
    ContainerStateProvenanceFieldKind,
    ContainerStateProvenanceMode,
    RegistrationTransition
  >;

  constructor(
    readonly mode: ContainerStateProvenanceMode,
    readonly selectedTransition: RegistrationTransition | null,
    readonly transitions: readonly RegistrationTransition[] = [],
    readonly note: string | null = null,
  ) {
    this.provenanceSet = new ProvenanceSet(
      'container-state',
      mode,
      selectedTransition,
      transitions,
      note,
    );
  }
}
