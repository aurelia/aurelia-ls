import type { NormalizedPath, SourceLocation, Sourced, TextSpan } from '../compiler.js';

export function toSourceLocation(
  file: NormalizedPath,
  span?: TextSpan,
): SourceLocation | undefined {
  if (!span) return undefined;
  return {
    file,
    pos: span.start,
    end: span.end,
  };
}

export function sourcedValue<T>(
  value: T | undefined,
  file: NormalizedPath,
  span?: TextSpan,
): Sourced<T> {
  const location = toSourceLocation(file, span);
  const result: Sourced<T> = { origin: "source" };
  if (value !== undefined) {
    (result as { value?: T }).value = value;
  }
  if (location) {
    (result as { location?: SourceLocation }).location = location;
  }
  return result;
}

export function unwrapSourced<T>(value: Sourced<T> | undefined): T | undefined {
  return value?.value;
}
