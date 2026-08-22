import type {
  HotDetailHandle,
  KernelRecordHandle,
  ProductHandle,
} from './handles.js';
import { KernelPublicationSurface } from './publication-surface.js';
import {
  assertSingularFieldProvenance,
  type FieldProvenance,
} from './provenance.js';
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

declare const kernelDetailReferenceClosureBrand: unique symbol;

/** Canonical deduplicated, sorted, and frozen structural closure for one rich detail. */
export type KernelDetailReferenceClosure = readonly KernelDetailReference[] & {
  readonly [kernelDetailReferenceClosureBrand]: true;
};

/** Typed detail-to-kernel dependency projection that owns normalization for one detail slot. */
export type KernelDetailReferenceProjector<TDetail> = (
  detail: TDetail,
) => KernelDetailReferenceClosure;

const noDetailReferences = Object.freeze([]) as unknown as KernelDetailReferenceClosure;

/** Explicit projector for a detail contract that carries no non-owner kernel links. */
export function noKernelDetailReferences<TDetail>(
  _detail: TDetail,
): KernelDetailReferenceClosure {
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
  assertSingularFieldProvenance(provenance);
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

/** Project product envelopes together with their exact typed rich-detail occupancies. */
export function kernelProductDetailReferences(
  descriptor: ProductDetailDescriptor<unknown>,
  ...handles: readonly (ProductHandle | null | undefined)[]
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(...handles),
    handles.map((handle) => kernelProductDetailReference(descriptor, handle)),
  );
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
): KernelDetailReferenceClosure {
  if (groups.length === 0) {
    return noDetailReferences;
  }
  const bySurface = new Map<KernelPublicationSurface, Map<string, KernelDetailReference>>();
  for (const group of groups) {
    for (const reference of group) {
      if (reference == null) {
        continue;
      }
      let byHandle = bySurface.get(reference.surface);
      if (byHandle == null) {
        byHandle = new Map();
        bySurface.set(reference.surface, byHandle);
      }
      const existing = byHandle.get(reference.handle);
      if (existing != null && existing.detailKind !== reference.detailKind) {
        throw new Error(
          `Kernel detail reference ${reference.key} expects both ${String(existing.detailKind)} and `
          + `${String(reference.detailKind)}.`,
        );
      }
      byHandle.set(reference.handle, reference);
    }
  }
  return Object.freeze(
    [...bySurface.values()].flatMap((byHandle) => [...byHandle.values()]).sort(compareKernelDetailReferences),
  ) as unknown as KernelDetailReferenceClosure;
}

function compareKernelDetailReferences(
  left: KernelDetailReference,
  right: KernelDetailReference,
): number {
  return left.surface.localeCompare(right.surface) || left.handle.localeCompare(right.handle);
}

/** Compare two already-normalized structural closures without inspecting rich payload objects. */
export function sameKernelDetailReferences(
  left: KernelDetailReferenceClosure,
  right: KernelDetailReferenceClosure,
): boolean {
  return left.length === right.length && left.every((reference, index) => {
    const candidate = right[index];
    return candidate != null
      && candidate.surface === reference.surface
      && candidate.handle === reference.handle
      && candidate.detailKind === reference.detailKind;
  });
}
