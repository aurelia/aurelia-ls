/** Lowercase the first character without changing the rest of the string. */
export function lowerFirst(value: string): string {
  return value.length === 0
    ? value
    : `${value[0]!.toLowerCase()}${value.slice(1)}`;
}
