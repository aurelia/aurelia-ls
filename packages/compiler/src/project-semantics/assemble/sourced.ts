import { unwrapSourced as unwrapSourcedValue, type NormalizedPath, type SourceLocation, type Sourced, type TextSpan } from '../compiler.js';

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
  if (value === undefined) {
    return sourcedUnknown(file, span);
  }
  return sourcedKnown(value, file, span);
}

export function sourcedKnown<T>(
  value: T,
  file: NormalizedPath,
  span?: TextSpan,
): Sourced<T> {
  const location = toSourceLocation(file, span);
  const result: Sourced<T> = { origin: "source", state: "known", value };
  if (location) {
    (result as { location?: SourceLocation }).location = location;
  }
  return result;
}

export function sourcedUnknown<T>(
  file: NormalizedPath,
  span?: TextSpan,
): Sourced<T> {
  const location = toSourceLocation(file, span);
  const result: Sourced<T> = { origin: "source", state: "unknown" };
  if (location) {
    (result as { location?: SourceLocation }).location = location;
  }
  return result;
}

export function unwrapSourced<T>(value: Sourced<T> | undefined): T | undefined {
  return unwrapSourcedValue(value);
}
