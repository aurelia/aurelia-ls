import type {
  EvidenceHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { KernelStoreRecord } from '../kernel/store.js';

/** Shared provenance/evidence envelope for a runtime Rendering materialization pass. */
export class RuntimeRenderingSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}
