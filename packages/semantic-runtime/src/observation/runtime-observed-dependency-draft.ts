import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { CheckerTypeMemberKind } from '../type-system/type-shape.js';
import type { RuntimeObservedDependencyKind, RuntimeObservedMemberSourceRoute } from './runtime-binding-observation.js';

export interface RuntimeObservedDependencyDraft {
  readonly dependencyKind: RuntimeObservedDependencyKind;
  readonly expressionKind: string;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly memberName: string | null;
  readonly keyExpression: string | null;
  readonly methodName: string | null;
  readonly observedMemberKind?: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null;
  readonly observedMemberSourceAddressHandle?: AddressHandle | null;
  readonly observedMemberSourceRoute?: RuntimeObservedMemberSourceRoute | null;
  /** Canonical source file that owns `spanStart` / `spanEnd`; null only for parser-local or generated rows. */
  readonly sourceFileAddressHandle?: AddressHandle | null;
  readonly memberNameSpanStart?: number | null;
  readonly memberNameSpanEnd?: number | null;
  readonly scopeLookupAncestor?: number | null;
  readonly spanStart: number | null;
  readonly spanEnd: number | null;
}

/** Observation effect paired with the exact owner-qualified access occurrence that induced it. */
export interface RuntimeObservedDependencyAccessUseDraft extends RuntimeObservedDependencyDraft {
  readonly accessUseProductHandle: ProductHandle;
  /** Exact source already published for the inducing access; null only for source-less generated operations. */
  readonly accessUseSourceAddressHandle: AddressHandle | null;
}

/** Suppresses duplicate traversal of one source occurrence without coalescing separate authored reads. */
export function runtimeObservedDependencyOccurrenceKey(
  draft: RuntimeObservedDependencyDraft,
): string {
  return [
    draft.dependencyKind,
    draft.expressionKind,
    draft.sourceName ?? '',
    draft.sourceRootName ?? '',
    draft.memberName ?? '',
    draft.keyExpression ?? '',
    draft.methodName ?? '',
    draft.sourceFileAddressHandle ?? '',
    draft.memberNameSpanStart ?? '',
    draft.memberNameSpanEnd ?? '',
    draft.spanStart ?? '',
    draft.spanEnd ?? '',
  ].join('|');
}

export function runtimeObservedDependencyIdentityLocalName(
  draft: RuntimeObservedDependencyDraft,
  index: number,
): string {
  return [
    draft.dependencyKind,
    draft.sourceName ?? draft.sourceRootName ?? draft.methodName ?? draft.expressionKind,
    draft.spanStart ?? index,
    draft.spanEnd ?? index,
  ].join(':');
}
