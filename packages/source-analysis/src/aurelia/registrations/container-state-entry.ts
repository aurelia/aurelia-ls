import type { ContainerWorldRef, KeyRef } from '../refs.js';
import type { RegistrationTransition } from './registration-transition.js';

// Container-state entry is what remains after one or more registration
// transitions have been applied. It is intentionally separate from both
// production and later lookup/consumption requests.
export class ContainerStateEntry {
  constructor(
    readonly id: string,
    readonly world: ContainerWorldRef,
    readonly key: KeyRef,
    readonly transitions: readonly RegistrationTransition[] = [],
    readonly note: string | null = null,
  ) {}
}
