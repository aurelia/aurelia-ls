/** Predicate for dropping empty route path segments after slash splitting. */
export function isNonEmptyRoutePathSegment(segment: string): boolean {
  return segment.length > 0;
}
