export type UniqueStringOrder = 'preserve' | 'sorted';

export function uniqueStrings<T extends string>(
  values: readonly T[],
  order: UniqueStringOrder = 'preserve',
): readonly T[] {
  const unique = [...new Set(values)];
  return order === 'sorted'
    ? unique.sort((left, right) => left.localeCompare(right))
    : unique;
}
