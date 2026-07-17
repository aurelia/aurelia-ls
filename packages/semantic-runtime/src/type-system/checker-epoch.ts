import type ts from 'typescript';

declare const typeSystemProjectEpochKeyBrand: unique symbol;

/** Process-local identity for one TypeScript Program/TypeChecker epoch. */
export type TypeSystemProjectEpochKey = string & { readonly [typeSystemProjectEpochKeyBrand]: true };

/** Explicit technical epoch shared by every projection backed by one TypeChecker object. */
export class TypeSystemProjectEpoch {
  constructor(readonly key: TypeSystemProjectEpochKey) {}
}

const epochsByChecker = new WeakMap<ts.TypeChecker, TypeSystemProjectEpoch>();
let nextEpochOrdinal = 1;

/** Read or allocate the technical epoch owned by a TypeChecker object. */
export function typeSystemProjectEpochForChecker(checker: ts.TypeChecker): TypeSystemProjectEpoch {
  let epoch = epochsByChecker.get(checker);
  if (epoch == null) {
    epoch = new TypeSystemProjectEpoch(`type-system-project:${nextEpochOrdinal++}` as TypeSystemProjectEpochKey);
    epochsByChecker.set(checker, epoch);
  }
  return epoch;
}
