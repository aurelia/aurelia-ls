/** Absolute authored offsets at decoded UTF-16 boundaries, retained only for non-affine text. */
export function sliceDecodedSourceOffsets(
  offsets: readonly number[] | undefined,
  start: number,
  end: number,
): readonly number[] | undefined {
  if (offsets == null) return undefined;
  const first = offsets[start]!;
  for (let index = start + 1; index <= end; index++) {
    if (offsets[index] !== first + index - start) {
      return offsets.slice(start, end + 1);
    }
  }
  return undefined;
}

/** The decoded boundary at or immediately preceding an authored cursor. */
export function decodedOffsetAtSource(
  offsets: readonly number[],
  sourceOffset: number,
  start = 0,
  end = offsets.length - 1,
): number {
  let low = start;
  let high = end;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (offsets[middle]! < sourceOffset) low = middle + 1;
    else high = middle;
  }
  return offsets[low]! > sourceOffset ? Math.max(start, low - 1) : low;
}
