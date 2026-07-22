import type { KernelRecordHandle } from './handles.js';
import type { FieldProvenance } from './provenance.js';

/** Observable decision made while replacing one computation-owned publication. */
export const enum KernelPublicationDecisionKind {
  /** A handle did not exist in the prior manifest and is published for the first time. */
  Publish = 'publish',
  /** Semantic value and witness data are unchanged, so the existing object remains current. */
  Retain = 'retain',
  /** Semantic value is unchanged, but source/provenance witness data must be refreshed. */
  RefreshWitness = 'refresh-witness',
  /** Semantic value changed and the prior object is replaced. */
  Replace = 'replace',
  /** The prior manifest owned the handle and the new publication no longer emits it. */
  Withdraw = 'withdraw',
}

export type KernelComparablePublicationDecision =
  | KernelPublicationDecisionKind.Retain
  | KernelPublicationDecisionKind.RefreshWitness
  | KernelPublicationDecisionKind.Replace;

/** Store-owned record comparison available to rich-detail comparators. */
export interface KernelPublicationComparisonContext {
  compareRecordHandles(
    previous: KernelRecordHandle | null,
    next: KernelRecordHandle | null,
  ): KernelComparablePublicationDecision;
}

export type KernelDetailComparator<TDetail> = (
  previous: TDetail,
  next: TDetail,
  context: KernelPublicationComparisonContext,
) => KernelComparablePublicationDecision;

/** Whether two record-backed witness fields retain the same current kernel record. */
export function sameKernelRecordWitness(
  previousHandle: KernelRecordHandle | null,
  nextHandle: KernelRecordHandle | null,
  context: KernelPublicationComparisonContext,
): boolean {
  if (previousHandle == null || nextHandle == null) {
    return previousHandle === nextHandle;
  }
  return previousHandle === nextHandle
    && context.compareRecordHandles(previousHandle, nextHandle) === KernelPublicationDecisionKind.Retain;
}

/** Whether field-level provenance retains the same ordered field witnesses. */
export function sameKernelFieldProvenance<TField extends string>(
  previous: readonly FieldProvenance<TField>[],
  next: readonly FieldProvenance<TField>[],
  context: KernelPublicationComparisonContext,
): boolean {
  return previous.length === next.length
    && previous.every((entry, index) => {
      const candidate = next[index];
      return candidate != null
        && entry.field === candidate.field
        && sameKernelRecordWitness(entry.provenanceHandle, candidate.provenanceHandle, context);
    });
}
