import type { ContainerWorldRef, KeyRef } from '../refs.js';
import type { RegistrationTransition } from './registration-transition.js';
import type { ContainerStateClosureBasis } from './container-state-closure-basis.js';
import type { ContainerStateQualification } from './container-state-qualification.js';
import type { RegistrationResolverBasis } from './registration-resolver-basis.js';

// This is the bounded basis beneath keyed container-state materialization. It
// keeps lineage, resolver/value basis, qualification, and closure basis
// separate instead of compressing them into one transition object.
export class ContainerStateCandidate {
  constructor(
    readonly id: string,
    readonly world: ContainerWorldRef | null,
    readonly key: KeyRef | null,
    readonly transition: RegistrationTransition,
    readonly resolverBasis: RegistrationResolverBasis | null,
    readonly qualification: ContainerStateQualification | null,
    readonly closureBasis: ContainerStateClosureBasis | null,
    readonly note: string | null = null,
  ) {}
}
