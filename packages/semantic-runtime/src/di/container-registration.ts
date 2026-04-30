import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { ContainerReference } from './container.js';

export type ContainerRegistrationField =
  | 'container'
  | 'admission'
  | 'source';

/** A registration admission being applied to one concrete abstract container. */
export class ContainerRegistrationOperation {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this operation. */
    readonly productHandle: ProductHandle,
    /** Identity for this container-registration operation. */
    readonly identityHandle: IdentityHandle,
    /** Container receiving the registration admission. */
    readonly container: ContainerReference,
    /** Product handle for the registration admission being spent, when already materialized. */
    readonly admissionProductHandle: ProductHandle | null,
    /** Source address for the argument or registry step being applied. */
    readonly admissionAddressHandle: AddressHandle | null,
    /** Source address for the register call, configuration boundary, or registry body. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ContainerRegistrationField>[] = [],
  ) {}
}
