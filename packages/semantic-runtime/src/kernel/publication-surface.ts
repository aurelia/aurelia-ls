/** Kernel occupancy surface shared by publication, exact reads, and structural detail references. */
export const enum KernelPublicationSurface {
  /** Normalized address, identity, evidence, provenance, claim, product, or materialization record. */
  Record = 'record',
  /** Typed detail whose lifetime is bound to a materialized-product envelope. */
  ProductDetail = 'product-detail',
  /** Typed epoch-local detail stored outside the normalized product envelope. */
  HotDetail = 'hot-detail',
}
