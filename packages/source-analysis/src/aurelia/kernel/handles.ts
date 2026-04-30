declare const kernelHandleBrand: unique symbol;

export const enum KernelHandleKind {
  /** Handle for an address record inside one analysis store. */
  Address = 'address',
  /** Handle for a semantic identity record inside one analysis store. */
  Identity = 'identity',
  /** Handle for an evidence record or evidence set inside one analysis store. */
  Evidence = 'evidence',
  /** Handle for a provenance record inside one analysis store. */
  Provenance = 'provenance',
  /** Handle for a semantic claim or claim set inside one analysis store. */
  Claim = 'claim',
  /** Handle for a derivation edge record inside one analysis store. */
  DerivationEdge = 'derivation-edge',
  /** Handle for a derivation rule definition inside one analysis store. */
  DerivationRule = 'derivation-rule',
  /** Handle for a derivation record inside one analysis store. */
  Derivation = 'derivation',
  /** Handle for an open seam record inside one analysis store. */
  OpenSeam = 'open-seam',
  /** Handle for a materialized product inside one analysis store. */
  Product = 'product',
  /** Handle for a materialization record inside one analysis store. */
  Materialization = 'materialization',
}

/**
 * Branded string handle for record links in the active analysis store.
 *
 * Handles are serializable for tests, MCP continuations, and inspection, but they are not durable semantic
 * identities and do not promise cross-run snapshot recovery.
 */
export type KernelHandle<TKind extends KernelHandleKind> = string & { readonly [kernelHandleBrand]: TKind };

/** Store-local handle for an address record. */
export type AddressHandle = KernelHandle<KernelHandleKind.Address>;

/** Store-local handle for a semantic identity record. */
export type IdentityHandle = KernelHandle<KernelHandleKind.Identity>;

/** Store-local handle for an evidence record or evidence set. */
export type EvidenceHandle = KernelHandle<KernelHandleKind.Evidence>;

/** Store-local handle for a provenance record. */
export type ProvenanceHandle = KernelHandle<KernelHandleKind.Provenance>;

/** Store-local handle for a semantic claim or claim set. */
export type ClaimHandle = KernelHandle<KernelHandleKind.Claim>;

/** Store-local handle for a derivation edge record. */
export type DerivationEdgeHandle = KernelHandle<KernelHandleKind.DerivationEdge>;

/** Store-local handle for a derivation rule definition. */
export type DerivationRuleHandle = KernelHandle<KernelHandleKind.DerivationRule>;

/** Store-local handle for a derivation record. */
export type DerivationHandle = KernelHandle<KernelHandleKind.Derivation>;

/** Store-local handle for an open seam record. */
export type OpenSeamHandle = KernelHandle<KernelHandleKind.OpenSeam>;

/** Store-local handle for a materialized product. */
export type ProductHandle = KernelHandle<KernelHandleKind.Product>;

/** Store-local handle for a materialization record. */
export type MaterializationHandle = KernelHandle<KernelHandleKind.Materialization>;

/** Any store-local kernel record handle that can be used as a normalized link. */
export type KernelRecordHandle =
  | AddressHandle
  | IdentityHandle
  | EvidenceHandle
  | ProvenanceHandle
  | ClaimHandle
  | DerivationEdgeHandle
  | DerivationRuleHandle
  | DerivationHandle
  | OpenSeamHandle
  | ProductHandle
  | MaterializationHandle;

function encodeHandlePart(value: string): string {
  return encodeURIComponent(value);
}

function serializeKernelHandle<TKind extends KernelHandleKind>(
  storeKey: string,
  kind: TKind,
  local: string,
): KernelHandle<TKind> {
  return [
    'kernel',
    encodeHandlePart(storeKey),
    kind,
    encodeHandlePart(local),
  ].join(':') as KernelHandle<TKind>;
}

/** Scoped handle factory for analysis-step-local record keys in one active analysis store. */
export class KernelHandleFactory {
  constructor(
    /** Human-readable label for the store that owns handles minted by this factory. */
    private readonly storeKey: string,
  ) {}

  /** Mint an address handle from an analysis-step-local key. */
  address(local: string): AddressHandle {
    return serializeKernelHandle(this.storeKey, KernelHandleKind.Address, local);
  }

  /** Mint an identity handle from an analysis-step-local key. */
  identity(local: string): IdentityHandle {
    return serializeKernelHandle(this.storeKey, KernelHandleKind.Identity, local);
  }

  /** Mint an evidence handle from an analysis-step-local key. */
  evidence(local: string): EvidenceHandle {
    return serializeKernelHandle(this.storeKey, KernelHandleKind.Evidence, local);
  }

  /** Mint a provenance handle from an analysis-step-local key. */
  provenance(local: string): ProvenanceHandle {
    return serializeKernelHandle(this.storeKey, KernelHandleKind.Provenance, local);
  }

  /** Mint a claim handle from an analysis-step-local key. */
  claim(local: string): ClaimHandle {
    return serializeKernelHandle(this.storeKey, KernelHandleKind.Claim, local);
  }

  /** Mint a derivation-edge handle from an analysis-step-local key. */
  derivationEdge(local: string): DerivationEdgeHandle {
    return serializeKernelHandle(this.storeKey, KernelHandleKind.DerivationEdge, local);
  }

  /** Mint a derivation-rule handle from an analysis-step-local key. */
  derivationRule(local: string): DerivationRuleHandle {
    return serializeKernelHandle(this.storeKey, KernelHandleKind.DerivationRule, local);
  }

  /** Mint a derivation handle from an analysis-step-local key. */
  derivation(local: string): DerivationHandle {
    return serializeKernelHandle(this.storeKey, KernelHandleKind.Derivation, local);
  }

  /** Mint an open-seam handle from an analysis-step-local key. */
  openSeam(local: string): OpenSeamHandle {
    return serializeKernelHandle(this.storeKey, KernelHandleKind.OpenSeam, local);
  }

  /** Mint a product handle from an analysis-step-local key. */
  product(local: string): ProductHandle {
    return serializeKernelHandle(this.storeKey, KernelHandleKind.Product, local);
  }

  /** Mint a materialization handle from an analysis-step-local key. */
  materialization(local: string): MaterializationHandle {
    return serializeKernelHandle(this.storeKey, KernelHandleKind.Materialization, local);
  }
}
