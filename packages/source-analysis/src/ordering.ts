export function compareByPrecedence<T extends string>(
  precedence: readonly T[],
  left: T,
  right: T,
): number {
  return precedenceIndex(precedence, left) - precedenceIndex(precedence, right);
}

export function compareNumbersDescending(left: number, right: number): number {
  return right - left;
}

export function compareStringsAscending(left: string, right: string): number {
  return left.localeCompare(right);
}

export function compareBooleansDescending(left: boolean, right: boolean): number {
  return Number(right) - Number(left);
}

function precedenceIndex<T extends string>(
  precedence: readonly T[],
  value: T,
): number {
  const index = precedence.indexOf(value);
  return index >= 0 ? index : precedence.length;
}
