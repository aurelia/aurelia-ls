/**
 * Tiny prelude to make overlay type-checks compile in TS without runtime.
 * - `CollectionElement<T>`: extracts element type of arrays/sets/maps, else keeps T
 * - `__au$access<T>`: dummy generic function; TS checks the lambda against T
 *
 * We ship it as a `.d.ts`-ish string for easy injection into the TS LS VFS.
 */

export const PRELUDE_TS = `
// ---- TTC prelude (no runtime) ----
type CollectionElement<T> =
  T extends Array<infer E> ? E :
  T extends ReadonlyArray<infer E> ? E :
  T extends Set<infer E> ? E :
  T extends ReadonlySet<infer E> ? E :
  T extends Map<infer K, infer V> ? [K, V] :
  T extends number ? number :
  T extends object ? any :
  never;

/** Internal - used as a type-check anchor. */
declare function __au$access<T>(_fn: (o: T) => unknown): void;
`;
