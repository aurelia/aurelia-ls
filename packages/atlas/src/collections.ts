/** Count rows by a string key and return a stable, alphabetically ordered record. */
export function countBy<TValue>(
  rows: readonly TValue[],
  keyFor: (row: TValue) => string,
): Readonly<Record<string, number>> {
  return Object.fromEntries(
    [...countByMap(rows, keyFor)].sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

/** Count rows by any Map-compatible key while preserving first-seen key order. */
export function countByMap<TValue, TKey>(
  rows: readonly TValue[],
  keyFor: (row: TValue) => TKey,
): ReadonlyMap<TKey, number> {
  const counts = new Map<TKey, number>();
  for (const row of rows) {
    const key = keyFor(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Count rows matching a predicate by a string key. */
export function countByWhere<TValue>(
  rows: readonly TValue[],
  predicate: (row: TValue) => boolean,
  keyFor: (row: TValue) => string,
): Readonly<Record<string, number>> {
  return countBy(rows.filter(predicate), keyFor);
}

/** Group rows by any Map-compatible key while preserving first-seen key order. */
export function groupBy<TValue, TKey>(
  rows: readonly TValue[],
  keyFor: (row: TValue) => TKey,
): ReadonlyMap<TKey, readonly TValue[]> {
  const groups = new Map<TKey, TValue[]>();
  for (const row of rows) {
    pushMapValue(groups, keyFor(row), row);
  }
  return groups;
}

export function pushMapValue<TKey, TValue>(
  map: Map<TKey, TValue[]>,
  key: TKey,
  value: TValue,
): void {
  const values = map.get(key);
  if (values === undefined) {
    map.set(key, [value]);
  } else {
    values.push(value);
  }
}

export function pushMapSetValue<TKey, TValue>(
  map: Map<TKey, Set<TValue>>,
  key: TKey,
  value: TValue,
): void {
  const values = map.get(key);
  if (values === undefined) {
    map.set(key, new Set([value]));
  } else {
    values.add(value);
  }
}

/** Deduplicate values while preserving the first-seen key order and first value for each key. */
export function uniqueFirstByKey<TValue, TKey>(
  values: readonly TValue[],
  keyFor: (value: TValue) => TKey,
): TValue[] {
  const seen = new Set<TKey>();
  const unique: TValue[] = [];
  for (const value of values) {
    const key = keyFor(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(value);
  }
  return unique;
}

/** Deduplicate values while preserving first-seen key order and the latest value for each key. */
export function uniqueByKey<TValue, TKey>(
  values: readonly TValue[],
  keyFor: (value: TValue) => TKey,
): TValue[] {
  const byKey = new Map<TKey, TValue>();
  for (const value of values) {
    byKey.set(keyFor(value), value);
  }
  return [...byKey.values()];
}

/** Deduplicate values while preserving first-seen order. */
export function uniqueValues<TValue>(values: readonly TValue[]): TValue[] {
  return [...new Set(values)];
}

/** Deduplicate strings and return a stable alphabetical order. */
export function uniqueSortedStrings<TValue extends string>(
  values: readonly TValue[],
): TValue[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
