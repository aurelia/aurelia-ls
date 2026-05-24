import ts from 'typescript';

import type { KernelStore } from '../kernel/store.js';
import {
  checkerSymbolMemberSourceProjection,
} from '../type-system/checker-type-member-source.js';
import {
  checkerPropertySymbol,
  checkerSymbolValueType,
} from '../type-system/checker-node-helpers.js';
import type { RuntimeObservedDependencyDraft } from './runtime-observed-dependency-draft.js';

export interface RuntimeObservedMemberSourceProjection {
  readonly observedMemberKind: RuntimeObservedDependencyDraft['observedMemberKind'];
  readonly observedMemberSourceAddressHandle: RuntimeObservedDependencyDraft['observedMemberSourceAddressHandle'];
}

export function observedMemberSourceForCheckerSymbol(
  store: KernelStore,
  symbol: ts.Symbol | null | undefined,
  declarations: readonly ts.Declaration[] | null = null,
): RuntimeObservedMemberSourceProjection | null {
  if (symbol == null) {
    return null;
  }
  const projection = checkerSymbolMemberSourceProjection(store, symbol, declarations ?? undefined);
  return {
    observedMemberKind: projection.memberKind,
    observedMemberSourceAddressHandle: projection.sourceAddressHandle,
  };
}

export function observedMemberSourceFields(
  projection: RuntimeObservedMemberSourceProjection | null,
): Pick<RuntimeObservedDependencyDraft, 'observedMemberKind' | 'observedMemberSourceAddressHandle'> {
  return projection == null
    ? {}
    : {
      observedMemberKind: projection.observedMemberKind,
      observedMemberSourceAddressHandle: projection.observedMemberSourceAddressHandle,
    };
}

export function observedDependencyWithMemberSourceForCheckerType<TDraft extends RuntimeObservedDependencyDraft>(
  store: KernelStore | null | undefined,
  checker: ts.TypeChecker,
  ownerType: ts.Type | null | undefined,
  draft: TDraft,
): TDraft {
  if (store == null || ownerType == null) {
    return draft;
  }
  const path = simpleObservedDependencyPath(draft);
  if (path.length === 0) {
    return draft;
  }
  const projection = observedMemberSourceForCheckerPath(store, checker, ownerType, path);
  return projection == null
    ? draft
    : {
      ...draft,
      ...projection,
    };
}

export function observedMemberSourceForCheckerPath(
  store: KernelStore,
  checker: ts.TypeChecker,
  ownerType: ts.Type,
  path: readonly string[],
): RuntimeObservedMemberSourceProjection | null {
  let current: ts.Type | null = ownerType;
  let currentSymbol: ts.Symbol | null = null;
  for (const segment of path) {
    if (current == null) {
      return null;
    }
    currentSymbol = checkerPropertySymbol(checker, current, segment);
    if (currentSymbol == null) {
      return null;
    }
    current = checkerSymbolValueType(checker, currentSymbol);
  }
  return observedMemberSourceForCheckerSymbol(store, currentSymbol);
}

function simpleObservedDependencyPath(
  draft: RuntimeObservedDependencyDraft,
): readonly string[] {
  const sourceName = draft.sourceName ?? draft.sourceRootName;
  if (sourceName == null || !/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/u.test(sourceName)) {
    return [];
  }
  const parts = sourceName.split('.');
  return parts[0] === 'this' ? parts.slice(1) : parts;
}
