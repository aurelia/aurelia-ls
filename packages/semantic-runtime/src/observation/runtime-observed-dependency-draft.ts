import type { AddressHandle } from '../kernel/handles.js';
import type { CheckerTypeMemberKind } from '../type-system/type-shape.js';
import type { RuntimeObservedDependencyKind } from './runtime-binding-observation.js';

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
  readonly memberNameSpanStart?: number | null;
  readonly scopeLookupAncestor?: number | null;
  readonly spanStart: number | null;
  readonly spanEnd: number | null;
}

export function distinctRuntimeObservedDependencyDrafts<TDraft extends RuntimeObservedDependencyDraft>(
  drafts: readonly TDraft[],
): readonly TDraft[] {
  const byKey = new Map<string, TDraft>();
  for (const draft of drafts) {
    const key = runtimeObservedDependencySemanticKey(draft);
    const existing = byKey.get(key);
    if (existing == null || runtimeObservedDependencyDraftIsMoreSpecific(draft, existing)) {
      byKey.set(key, draft);
    }
  }
  return [...byKey.values()].sort(compareRuntimeObservedDependencyDrafts);
}

export function runtimeObservedDependencySemanticKey(
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

function compareRuntimeObservedDependencyDrafts(
  left: RuntimeObservedDependencyDraft,
  right: RuntimeObservedDependencyDraft,
): number {
  return [
    left.spanStart ?? -1,
    left.dependencyKind,
    left.sourceName ?? '',
    left.sourceRootName ?? '',
    left.methodName ?? '',
    left.expressionKind,
  ].join(':').localeCompare([
    right.spanStart ?? -1,
    right.dependencyKind,
    right.sourceName ?? '',
    right.sourceRootName ?? '',
    right.methodName ?? '',
    right.expressionKind,
  ].join(':'));
}

function runtimeObservedDependencyDraftIsMoreSpecific(
  candidate: RuntimeObservedDependencyDraft,
  existing: RuntimeObservedDependencyDraft,
): boolean {
  return runtimeObservedDependencyProjectionWeight(candidate) > runtimeObservedDependencyProjectionWeight(existing);
}

function runtimeObservedDependencyProjectionWeight(
  draft: RuntimeObservedDependencyDraft,
): number {
  return [
    draft.observedMemberSourceAddressHandle,
    draft.observedMemberKind,
    draft.memberNameSpanStart,
    draft.scopeLookupAncestor,
    draft.spanStart,
    draft.spanEnd,
  ].filter((value) => value != null).length;
}
