import type { ContainerWorldRef, KeyRef } from '../refs.js';
import type { RegistrationTransition } from './registration-transition.js';
import type { ContainerStateClosureBasis } from './container-state-closure-basis.js';
import type { ContainerStateProvenance } from './container-state-provenance.js';
import type { ContainerStateQualification } from './container-state-qualification.js';
import type { ContainerStateSlot } from './container-state-slot.js';

// Container-state entry is what remains after one or more registration
// transitions have been applied. It is intentionally separate from both
// production and later lookup/consumption requests.
export class ContainerStateEntry {
  constructor(
    readonly id: string,
    readonly world: ContainerWorldRef,
    readonly key: KeyRef,
    readonly qualification: ContainerStateQualification | null = null,
    readonly closureBasis: ContainerStateClosureBasis | null = null,
    readonly slots: readonly ContainerStateSlot[] = [],
    readonly provenance: ContainerStateProvenance | null = null,
    readonly note: string | null = null,
  ) {}

  get transitions(): readonly RegistrationTransition[] {
    return this.provenance?.transitions ?? [];
  }
}
