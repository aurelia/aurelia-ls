declare const kernelHandleBrand: unique symbol;

export const enum KernelHandleKind {
  /** Handle for an address record inside one analysis store. */
  Address = 'address',
  /** Handle for a semantic identity record inside one analysis store. */
  Identity = 'identity',
  /** Handle for an evidence record inside one analysis store. */
  Evidence = 'evidence',
  /** Handle for a provenance record inside one analysis store. */
  Provenance = 'provenance',
  /** Handle for a semantic claim inside one analysis store. */
  Claim = 'claim',
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
 * Handles are serializable for tests, tooling continuations, and inspection, but they are not durable semantic
 * identities and do not promise cross-run snapshot recovery.
 */
export type KernelHandle<TKind extends KernelHandleKind> = string & { readonly [kernelHandleBrand]: TKind };

/** Store-local handle for an address record. */
export type AddressHandle = KernelHandle<KernelHandleKind.Address>;

/** Store-local handle for a semantic identity record. */
export type IdentityHandle = KernelHandle<KernelHandleKind.Identity>;

/** Store-local handle for an evidence record. */
export type EvidenceHandle = KernelHandle<KernelHandleKind.Evidence>;

/** Store-local handle for a provenance record. */
export type ProvenanceHandle = KernelHandle<KernelHandleKind.Provenance>;

/** Store-local handle for a semantic claim. */
export type ClaimHandle = KernelHandle<KernelHandleKind.Claim>;

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
  | OpenSeamHandle
  | ProductHandle
  | MaterializationHandle;

function encodeHandlePart(value: string): string {
  return encodeURIComponent(value);
}

// Handles sit on hot graph edges; keep readable prefixes short and let records own semantic names/source payload.
const compactHandleStoreThreshold = 32;
const compactHandleLocalThreshold = 64;
const compactHandleStorePrefixLength = 14;
const compactHandleLocalPrefixLength = 24;

function compactHandlePart(
  value: string,
  role: 'store' | 'local',
): string {
  const threshold = role === 'store' ? compactHandleStoreThreshold : compactHandleLocalThreshold;
  if (value.length <= threshold && !value.includes('kernel:')) {
    return value;
  }
  const prefix = readableCompactPrefix(
    value,
    role === 'store' ? compactHandleStorePrefixLength : compactHandleLocalPrefixLength,
  );
  return `${role}~${prefix}~${stableHandleHash(value)}`;
}

function serializeKernelHandle<TKind extends KernelHandleKind>(
  storeKey: string,
  kind: TKind,
  local: string,
): KernelHandle<TKind> {
  // Handles are transport/session links, not durable semantic identities. Compacting long or recursive local keys keeps
  // product graphs inspectable without retaining megabytes of repeated, URI-encoded handle ancestry in hot paths. The
  // prefix/hash form is a deliberate memory trade-off: exact semantic identity belongs in identity records and source
  // addresses, while handles only need to be stable inside one analysis store.
  return [
    'kernel',
    encodeHandlePart(compactHandlePart(storeKey, 'store')),
    kind,
    encodeHandlePart(compactHandlePart(local, 'local')),
  ].join(':') as KernelHandle<TKind>;
}

function readableCompactPrefix(value: string, maxLength: number): string {
  const normalized = value
    .slice(0, maxLength)
    .replace(/[^A-Za-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length === 0 ? 'value' : normalized;
}

function stableHandleHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(36);
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
