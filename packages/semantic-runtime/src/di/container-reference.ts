import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';

/** Lightweight reference to a modeled container. */
export class ContainerReference {
  constructor(
    /** Container identity when world construction has modeled it. */
    readonly identityHandle: IdentityHandle | null,
    /** Container product handle when this reference points at a materialized container product. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the expression or app boundary that mentioned the container. */
    readonly addressHandle: AddressHandle | null,
    /** Local source name for traces when identity is still open. */
    readonly localName: string | null,
  ) {}
}
