export function uniqueByKey<TValue>(
  values: readonly TValue[],
  keyFor: (value: TValue) => string,
): readonly TValue[] {
  const seen = new Set<string>();
  const result: TValue[] = [];
  for (const value of values) {
    const key = keyFor(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}
