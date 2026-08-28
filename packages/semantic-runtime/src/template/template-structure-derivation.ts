import type { ClaimEndpointHandle } from '../kernel/claim.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  productDetailAddressHandle,
  productDetailHandle,
  productDetailIdentityHandle,
} from '../kernel/product-details.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { ProductKindKey } from '../kernel/vocabulary.js';

const StructureDerivationDetailKind = 'template.structure-derivation';

/** Exact semantic authority that performed one structural transition. */
export const enum TemplateStructureDerivationAuthority {
  HtmlTreeBuilder = 'html-tree-builder',
  TemplateElementFactory = 'template-element-factory',
  TemplateCompiler = 'template-compiler',
}

/** Product reference accepted on either side of a structural derivation. */
export class TemplateStructureReference {
  constructor(
    readonly productKindKey: ProductKindKey,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle | null,
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Ordered input or output term; a narrow segment address is optional and never inferred from array position. */
export class TemplateStructureDerivationTerm {
  constructor(
    readonly structure: TemplateStructureReference,
    readonly segmentAddressHandle: AddressHandle | null = null,
  ) {}
}

export type TemplateStructureDerivationField =
  | 'authority'
  | 'inputs'
  | 'outputs'
  | 'causes'
  | 'operationOrdinal'
  | 'source';

/**
 * One ordered structural hyperedge.
 *
 * Cardinality remains factual rather than classified: N→1 represents a merge, 1→N can represent reconstruction,
 * 0→1 is an implied or generated product according to authority, and N→0 is a parser/compiler discard.
 */
export class TemplateStructureDerivation {
  constructor(
    readonly authority: TemplateStructureDerivationAuthority,
    readonly inputs: readonly TemplateStructureDerivationTerm[],
    readonly outputs: readonly TemplateStructureDerivationTerm[],
    readonly causeHandles: readonly ClaimEndpointHandle[],
    readonly fieldProvenance: readonly FieldProvenance<TemplateStructureDerivationField>[] = [],
    /** Family-global compiler operation ordinal; null for parser/factory derivations and legacy compiler products. */
    readonly operationOrdinal: number | null = null,
  ) {
    if (
      operationOrdinal != null
      && (!Number.isSafeInteger(operationOrdinal) || operationOrdinal < 0)
    ) {
      throw new Error('Template structure derivation has an invalid compiler operation ordinal.');
    }
  }

  get productHandle(): ProductHandle {
    return productDetailHandle(this, StructureDerivationDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, StructureDerivationDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, StructureDerivationDetailKind);
  }
}
