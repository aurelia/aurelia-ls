/**
 * Red Provenance Wrappers — Sourced<T> and Configured<T>
 *
 * The red layer of the value representation (L1 value-representation §S1).
 * Carries source location, declaration form, observation chain — everything
 * that does NOT participate in value-sensitive cutoff comparison.
 *
 * Sourced<T> wraps a value with provenance. The structural content
 * (what the value IS) lives in the green layer. The provenance (where
 * it came from, how it was observed) lives here.
 *
 * Previously in schema/types.ts. Moved here so both halves of the
 * green/red split are discoverable in the same directory.
 */

import type ts from 'typescript';
import type { NormalizedPath } from '../model/identity.js';

export interface SourceLocation {
  readonly file: NormalizedPath;
  readonly pos: number;
  readonly end: number;
}

/** Extensible via config, but always has a known value. */
export type Configured<T> =
  | { origin: 'builtin'; value: T }
  | { origin: 'config'; value: T; location: SourceLocation };

/** Full provenance — source analysis can result in unknown. */
export type Sourced<T> =
  | { origin: 'builtin'; value: T }
  | { origin: 'config'; value: T; location: SourceLocation }
  | { origin: 'source'; state: 'known'; value: T; node?: ts.Node; location?: SourceLocation }
  | { origin: 'source'; state: 'unknown'; value?: undefined; node?: ts.Node; location?: SourceLocation };
