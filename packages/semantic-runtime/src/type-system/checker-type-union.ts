import ts from 'typescript';
import type { KernelStore } from '../kernel/store.js';
import { readCheckerTypeShape } from './checker-type-shape-access.js';
import type { CheckerTypeReference } from './type-shape.js';

export interface CheckerBackedUnionType {
  readonly checker: ts.TypeChecker;
  readonly type: ts.Type;
}

/** Creates a TypeChecker-owned union when every reference still carries a hot type from the same checker epoch. */
export function checkerBackedUnionTypeForReferences(
  store: KernelStore,
  references: readonly CheckerTypeReference[],
): CheckerBackedUnionType | null {
  if (references.length === 0) {
    return null;
  }
  const carriers = references.map((reference) => readCheckerTypeShape(store, reference)?.carrier ?? null);
  const first = carriers[0] ?? null;
  if (first == null || carriers.some((carrier) => carrier?.checker !== first.checker)) {
    return null;
  }
  const unionType = checkerUnionType(first.checker, carriers.map((carrier) => carrier!.type));
  if (unionType == null) {
    return null;
  }
  return {
    checker: first.checker,
    type: unionType,
  };
}

type TypeCheckerWithUnionFactory = ts.TypeChecker & {
  getUnionType?: (types: readonly ts.Type[]) => ts.Type;
};

export function checkerUnionType(
  checker: ts.TypeChecker,
  types: readonly ts.Type[],
): ts.Type | null {
  if (types.length === 0) {
    return null;
  }
  const unique = uniqueCheckerTypes(types);
  if (unique.length === 1) {
    return unique[0]!;
  }
  const candidate = (checker as TypeCheckerWithUnionFactory).getUnionType;
  return typeof candidate === 'function'
    ? candidate.call(checker, unique)
    : unique[0]!;
}

export function checkerUnionTypeOrNever(
  checker: ts.TypeChecker,
  types: readonly ts.Type[],
): ts.Type {
  return checkerUnionType(checker, types) ?? checker.getNeverType();
}

export function uniqueCheckerTypes(types: readonly ts.Type[]): readonly ts.Type[] {
  const seen = new Set<ts.Type>();
  const result: ts.Type[] = [];
  for (const type of types) {
    if (seen.has(type)) {
      continue;
    }
    seen.add(type);
    result.push(type);
  }
  return result;
}
