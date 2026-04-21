import type { RegistrationTransition } from './registration-transition.js';

export const CONTAINER_STATE_PROVENANCE_MODES = [
  'selected',
  'aggregated',
  'policy-generated',
] as const;

export type ContainerStateProvenanceMode =
  typeof CONTAINER_STATE_PROVENANCE_MODES[number];

export class ContainerStateProvenance {
  constructor(
    readonly mode: ContainerStateProvenanceMode,
    readonly selectedTransition: RegistrationTransition | null,
    readonly transitions: readonly RegistrationTransition[] = [],
    readonly note: string | null = null,
  ) {}
}
