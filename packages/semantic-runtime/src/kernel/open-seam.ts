import type {
  AddressHandle,
  EvidenceHandle,
  OpenSeamHandle,
} from './handles.js';
import type { OpenSeamKindKey } from './vocabulary.js';

/** First-class unresolved point that must not disappear behind nulls or missing arrays. */
export class OpenSeam {
  /** String discriminator for serialized open-seam records. */
  readonly kind = 'open-seam' as const;

  constructor(
    /** Store-local handle for this open seam. */
    readonly handle: OpenSeamHandle,
    /** Controlled vocabulary key describing the seam category. */
    readonly seamKindKey: OpenSeamKindKey,
    /** Short explanation of what remained unresolved. */
    readonly summary: string,
    /** Optional address handle where the unresolved pressure is visible. */
    readonly addressHandle: AddressHandle | null = null,
    /** Optional direct evidence handle that produced the seam. */
    readonly evidenceHandle: EvidenceHandle | null = null,
  ) {}
}

