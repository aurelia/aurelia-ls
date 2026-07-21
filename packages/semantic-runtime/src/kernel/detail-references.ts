import type {
  HotDetailHandle,
  KernelRecordHandle,
  ProductHandle,
} from './handles.js';
import { KernelPublicationSurface } from './publication-surface.js';
import type { FieldProvenance } from './provenance.js';
import type {
  HotDetailDescriptor,
  ProductDetailDescriptor,
} from './detail-descriptors.js';

/** Immutable structural edge to one normalized kernel record. */
export class KernelRecordReference {
  readonly surface = KernelPublicationSurface.Record;
  readonly detailKind = null;

  constructor(readonly handle: KernelRecordHandle) {
    Object.freeze(this);
  }

  /** Stable exact-read identity for normalization and dependency indexes. */
  get key(): string {
    return `${this.surface}:${this.handle}`;
  }
}

/** Immutable structural edge to one typed product-detail occupancy. */
export class KernelProductDetailReference {
  readonly surface = KernelPublicationSurface.ProductDetail;

  constructor(
    readonly handle: ProductHandle,
    readonly detailKind: string,
  ) {
    Object.freeze(this);
  }

  /** Stable exact-read identity for normalization and dependency indexes. */
  get key(): string {
    return `${this.surface}:${this.handle}`;
  }
}

/** Immutable structural edge to one typed hot-detail occupancy. */
export class KernelHotDetailReference {
  readonly surface = KernelPublicationSurface.HotDetail;

  constructor(
    readonly handle: HotDetailHandle,
    readonly detailKind: string,
  ) {
    Object.freeze(this);
  }

  /** Stable exact-read identity for normalization and dependency indexes. */
  get key(): string {
    return `${this.surface}:${this.handle}`;
  }
}

/** Surface-discriminated structural edge projected from one typed rich-detail payload. */
export type KernelDetailReference =
  | KernelRecordReference
  | KernelProductDetailReference
  | KernelHotDetailReference;

/** Typed detail-to-kernel dependency projection owned by one detail slot. */
export type KernelDetailReferenceProjector<TDetail> = (
  detail: TDetail,
) => readonly KernelDetailReference[];

const noDetailReferences: readonly KernelDetailReference[] = Object.freeze([]);

/** Explicit projector for a detail contract that carries no non-owner kernel links. */
export function noKernelDetailReferences<TDetail>(
  _detail: TDetail,
): readonly KernelDetailReference[] {
  return noDetailReferences;
}

/** Project nullable normalized-record handles into structural references. */
export function kernelRecordReferences(
  ...handles: readonly (KernelRecordHandle | null | undefined)[]
): readonly KernelDetailReference[] {
  return handles
    .filter((handle): handle is KernelRecordHandle => handle != null)
    .map((handle) => new KernelRecordReference(handle));
}

/** Project the durable provenance rows carried by field-level epistemic facts. */
export function kernelFieldProvenanceReferences<TField extends string>(
  provenance: readonly FieldProvenance<TField>[],
): readonly KernelDetailReference[] {
  return kernelRecordReferences(...provenance.map((entry) => entry.provenanceHandle));
}

/** Project one typed product-detail occupancy when a payload requires rich expansion, not only its product envelope. */
export function kernelProductDetailReference(
  descriptor: ProductDetailDescriptor<unknown>,
  handle: ProductHandle | null | undefined,
): KernelDetailReference | null {
  return handle == null
    ? null
    : new KernelProductDetailReference(handle, descriptor.detailKind);
}

/** Project one typed hot-detail occupancy required by a parent or sibling payload. */
export function kernelHotDetailReference(
  descriptor: HotDetailDescriptor<unknown>,
  handle: HotDetailHandle | null | undefined,
): KernelDetailReference | null {
  return handle == null
    ? null
    : new KernelHotDetailReference(handle, descriptor.detailKind);
}

/** Merge explicit reference groups into one deduplicated, frozen closure. */
export function mergeKernelDetailReferences(
  ...groups: readonly (readonly (KernelDetailReference | null | undefined)[])[]
): readonly KernelDetailReference[] {
  const byKey = new Map<string, KernelDetailReference>();
  for (const reference of groups.flat()) {
    if (reference == null) {
      continue;
    }
    const existing = byKey.get(reference.key);
    if (existing != null && existing.detailKind !== reference.detailKind) {
      throw new Error(
        `Kernel detail reference ${reference.key} expects both ${String(existing.detailKind)} and `
        + `${String(reference.detailKind)}.`,
      );
    }
    byKey.set(reference.key, reference);
  }
  return Object.freeze([...byKey.values()].sort((left, right) => left.key.localeCompare(right.key)));
}

/** Compare two already-normalized structural closures without inspecting rich payload objects. */
export function sameKernelDetailReferences(
  left: readonly KernelDetailReference[],
  right: readonly KernelDetailReference[],
): boolean {
  return left.length === right.length && left.every((reference, index) => {
    const candidate = right[index];
    return candidate != null
      && candidate.surface === reference.surface
      && candidate.handle === reference.handle
      && candidate.detailKind === reference.detailKind;
  });
}
