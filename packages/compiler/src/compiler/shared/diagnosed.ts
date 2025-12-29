/* =======================================================================================
 * DIAGNOSED<T> - Elm-style error accumulation primitives
 * ---------------------------------------------------------------------------------------
 * A writer monad for always-continue compilation with proper cascade suppression.
 *
 * Core concepts:
 * - Diagnosed<T>: Value + accumulated diagnostics (always produces output)
 * - StubMarker: Indicates a degraded/recovered value (suppress cascading errors)
 * - Combinators: pure, diag, map, flatMap, all for composition
 *
 * See .claude/docs/elm-style-errors.md for design rationale.
 * ======================================================================================= */

import type { CompilerDiagnostic } from "../model/diagnostics.js";
import type { SourceSpan } from "../model/ir.js";
import type { ExprId, NodeId } from "../model/identity.js";

// =============================================================================
// Core Types
// =============================================================================

/**
 * A value paired with accumulated diagnostics.
 * The value is always present (may be a stub for degraded cases).
 */
export interface Diagnosed<T> {
  readonly value: T;
  readonly diagnostics: readonly CompilerDiagnostic[];
}

/**
 * Marker indicating a value is degraded/recovered.
 * Downstream code should propagate stubs without adding new diagnostics.
 */
export interface StubMarker {
  readonly span?: SourceSpan;
  readonly exprId?: ExprId;
  readonly nodeId?: NodeId;
  /** The diagnostic that created this stub. */
  readonly diagnostic: CompilerDiagnostic;
}

// =============================================================================
// Stub Branding
// =============================================================================

/** Symbol brand for stub detection (not exported - internal implementation detail). */
const STUB_BRAND: unique symbol = Symbol("__stub");

/** Type guard to check if a value carries a stub marker. */
export function isStub<T>(value: T): value is T & { [STUB_BRAND]: StubMarker } {
  return value !== null && typeof value === "object" && STUB_BRAND in value;
}

/** Extract the stub marker from a stub value, or undefined if not a stub. */
export function getStubMarker<T>(value: T): StubMarker | undefined {
  if (isStub(value)) return value[STUB_BRAND];
  return undefined;
}

/** Attach a stub marker to an object value. */
export function withStub<T extends object>(value: T, marker: StubMarker): T {
  return Object.assign(value, { [STUB_BRAND]: marker });
}

// =============================================================================
// Constructors
// =============================================================================

/** Create a Diagnosed with a pure value and no diagnostics. */
export function pure<T>(value: T): Diagnosed<T> {
  return { value, diagnostics: [] };
}

/** Create a Diagnosed with a value and a single diagnostic. */
export function diag<T>(diagnostic: CompilerDiagnostic, value: T): Diagnosed<T> {
  return { value, diagnostics: [diagnostic] };
}

/** Create a Diagnosed with a value and multiple diagnostics. */
export function withDiags<T>(value: T, diagnostics: readonly CompilerDiagnostic[]): Diagnosed<T> {
  return { value, diagnostics };
}

// =============================================================================
// Transformations (Functor / Monad)
// =============================================================================

/** Transform the value, preserving diagnostics. */
export function map<T, U>(d: Diagnosed<T>, f: (v: T) => U): Diagnosed<U> {
  return { value: f(d.value), diagnostics: d.diagnostics };
}

/** Chain computations, merging diagnostics from both. */
export function flatMap<T, U>(d: Diagnosed<T>, f: (v: T) => Diagnosed<U>): Diagnosed<U> {
  const next = f(d.value);
  return {
    value: next.value,
    diagnostics: [...d.diagnostics, ...next.diagnostics],
  };
}

/**
 * Combine multiple Diagnosed values, merging all diagnostics.
 * Values are collected into a tuple matching the input array.
 */
export function all<T extends readonly unknown[]>(
  ds: { [K in keyof T]: Diagnosed<T[K]> }
): Diagnosed<T> {
  const values = (ds as readonly Diagnosed<unknown>[]).map(d => d.value) as unknown as T;
  const diagnostics = (ds as readonly Diagnosed<unknown>[]).flatMap(d => d.diagnostics);
  return { value: values, diagnostics };
}

/**
 * Collect results from an array, accumulating all diagnostics.
 * Useful for mapping over collections with Diagnosed-returning functions.
 */
export function collect<T, U>(
  items: readonly T[],
  f: (item: T, index: number) => Diagnosed<U>
): Diagnosed<U[]> {
  const results: U[] = [];
  const diagnostics: CompilerDiagnostic[] = [];
  for (let i = 0; i < items.length; i++) {
    const d = f(items[i]!, i);
    results.push(d.value);
    diagnostics.push(...d.diagnostics);
  }
  return { value: results, diagnostics };
}

// =============================================================================
// Recovery Helpers
// =============================================================================

/**
 * Require a non-null value; emit diagnostic and use fallback if null/undefined.
 * The fallback is automatically marked as a stub if it's an object.
 */
export function require<T>(
  value: T | null | undefined,
  fallback: T,
  mkDiag: () => CompilerDiagnostic
): Diagnosed<T> {
  if (value == null) {
    const d = mkDiag();
    const stubbed = typeof fallback === "object" && fallback !== null
      ? withStub(fallback as T & object, { diagnostic: d })
      : fallback;
    return diag(d, stubbed as T);
  }
  return pure(value);
}

/**
 * Lookup a key in a map/record; emit diagnostic and use fallback if not found.
 * The fallback is automatically marked as a stub if it's an object.
 */
export function lookup<V>(
  source: Map<string, V> | Record<string, V>,
  key: string,
  fallback: V,
  mkDiag: () => CompilerDiagnostic
): Diagnosed<V> {
  const value = source instanceof Map ? source.get(key) : source[key];
  if (value === undefined) {
    const d = mkDiag();
    const stubbed = typeof fallback === "object" && fallback !== null
      ? withStub(fallback as V & object, { diagnostic: d })
      : fallback;
    return diag(d, stubbed as V);
  }
  return pure(value);
}

// =============================================================================
// Stub Propagation
// =============================================================================

/**
 * If input is a stub, propagate it to output without new diagnostics.
 * Use this at the start of resolution functions to short-circuit on degraded input.
 *
 * @returns Diagnosed with stub output if input was stub, null to continue normal processing
 *
 * @example
 * function resolveProperty(element: ElementDef): Diagnosed<PropDef> {
 *   const propagated = propagateStub(element, () => stubPropDef());
 *   if (propagated) return propagated;  // Short-circuit: element was stub
 *   // ... normal resolution logic ...
 * }
 */
export function propagateStub<TIn, TOut extends object>(
  input: TIn,
  mkStubOutput: () => TOut
): Diagnosed<TOut> | null {
  const marker = getStubMarker(input);
  if (marker) {
    return pure(withStub(mkStubOutput(), marker));
  }
  return null; // Continue with normal processing
}

/**
 * Check if any of the inputs are stubs.
 * Useful for deciding whether to skip validation on degraded inputs.
 */
export function anyStub(...values: unknown[]): boolean {
  return values.some(v => isStub(v));
}

// =============================================================================
// Diagnostic Accumulator (for imperative code)
// =============================================================================

/**
 * Helper class for imperative diagnostic accumulation.
 * Use when converting existing code that pushes to a diags array.
 */
export class DiagnosticAccumulator {
  private readonly _diagnostics: CompilerDiagnostic[] = [];

  /** Push a diagnostic to the accumulator. */
  push(d: CompilerDiagnostic): void {
    this._diagnostics.push(d);
  }

  /** Push multiple diagnostics. */
  pushAll(ds: readonly CompilerDiagnostic[]): void {
    this._diagnostics.push(...ds);
  }

  /** Merge diagnostics from a Diagnosed result. */
  merge<T>(d: Diagnosed<T>): T {
    this._diagnostics.push(...d.diagnostics);
    return d.value;
  }

  /** Get all accumulated diagnostics. */
  get diagnostics(): readonly CompilerDiagnostic[] {
    return this._diagnostics;
  }

  /** Wrap a value with accumulated diagnostics. */
  wrap<T>(value: T): Diagnosed<T> {
    return { value, diagnostics: this._diagnostics };
  }
}
