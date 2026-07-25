import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import {
  frameworkRegistrationKindForAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import type { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import type { ContainerReference } from './container-reference.js';
import type {
  DiRegistrationEvidenceAuthority,
  DiRegistrationValueProduct,
} from './registration-value.js';

export type ContainerRegistrationField =
  | 'container'
  | 'admission'
  | 'registrationValue'
  | 'evidenceAuthority'
  | 'frameworkRegistrationKind'
  | 'ordinal'
  | 'source';

/** A registration admission being applied to one concrete abstract container. */
export class ContainerRegistrationOperation {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this operation. */
    readonly productHandle: ProductHandle,
    /** Identity for this container-registration operation. */
    readonly identityHandle: IdentityHandle,
    /** Execution order within the app DI-spending traversal. */
    readonly ordinal: number,
    /** Container receiving the registration admission. */
    readonly container: ContainerReference,
    /** Exact registration admission being spent by this operation. */
    readonly admission: RegistrationAdmissionProduct,
    /** Reusable runtime registration object applied by this operation, when materialized. */
    readonly registrationValue: DiRegistrationValueProduct | null,
    /** Strongest evidence lane that determined dispatch for this application. */
    readonly evidenceAuthority: DiRegistrationEvidenceAuthority,
    /** Framework effect package actually selected for this application, when any. */
    readonly frameworkRegistrationKind: FrameworkRegistrationKind | null,
    /** Source address for the register call, configuration boundary, or registry body. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ContainerRegistrationField>[] = [],
  ) {}
}

/**
 * Read the framework effect package that this concrete application actually spent.
 *
 * Exact registry values outrank source admission classification. Admissions remain the authority
 * for direct framework-group products that do not materialize an IRegistry-shaped runtime value.
 */
export function frameworkRegistrationKindForOperation(
  operation: ContainerRegistrationOperation,
): FrameworkRegistrationKind | null {
  return operation.frameworkRegistrationKind;
}
