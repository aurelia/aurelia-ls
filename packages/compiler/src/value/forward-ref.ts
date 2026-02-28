/**
 * Forward References — Cycle Resolution for Evaluation
 *
 * When evaluation enters a unit already on the stack (circular import,
 * mutual cross-file references), the system returns a forward reference
 * instead of failing or returning unknown. The forward reference resolves
 * when the inner computation completes.
 *
 * Isomorphic to TypeScript checker's cycle resolution: register a
 * forward reference on entry, return it on re-entry, resolve it on
 * completion. See L1 value-representation §S3.
 *
 * This is strictly better than "return unknown on cycles" because:
 * - The value IS determinable (circular imports resolve to concrete values)
 * - The gap system is reserved for genuinely undeterminable values (tier F)
 * - The dependency graph records the cycle edge for re-evaluation
 */

import type { GreenValue } from './green.js';

// =============================================================================
// Forward Reference
// =============================================================================

/**
 * A forward reference to a green value whose computation is in progress.
 *
 * Holders receive the resolved value when computation completes.
 * The reference itself is a stable identity — pointer equality on
 * the ForwardRef object identifies the same pending computation.
 */
export interface ForwardRef {
  readonly __brand: 'ForwardRef';

  /** The evaluation key (file#unitKey) this reference is for. */
  readonly key: string;

  /** Whether the value has been resolved. */
  readonly resolved: boolean;

  /**
   * The resolved green value. Throws if accessed before resolution.
   * After resolution, returns the interned canonical value.
   */
  readonly value: GreenValue;
}

// =============================================================================
// Implementation
// =============================================================================

class ForwardRefImpl implements ForwardRef {
  readonly __brand = 'ForwardRef' as const;
  readonly key: string;
  private _value: GreenValue | undefined;
  private _resolved = false;

  constructor(key: string) {
    this.key = key;
  }

  get resolved(): boolean {
    return this._resolved;
  }

  get value(): GreenValue {
    if (!this._resolved) {
      throw new Error(`Forward reference '${this.key}' accessed before resolution`);
    }
    return this._value!;
  }

  resolve(value: GreenValue): void {
    if (this._resolved) {
      throw new Error(`Forward reference '${this.key}' resolved twice`);
    }
    this._value = value;
    this._resolved = true;
  }
}

/**
 * Create a forward reference for a pending evaluation.
 *
 * @param key - The evaluation unit key (file#unitKey)
 */
export function createForwardRef(key: string): ForwardRef {
  return new ForwardRefImpl(key);
}

/**
 * Resolve a forward reference with the computed value.
 *
 * @param ref - The forward reference to resolve
 * @param value - The interned green value
 */
export function resolveForwardRef(ref: ForwardRef, value: GreenValue): void {
  if (!(ref instanceof ForwardRefImpl)) {
    throw new Error('Cannot resolve a foreign ForwardRef');
  }
  ref.resolve(value);
}

/**
 * Check if a value is a forward reference.
 */
export function isForwardRef(value: unknown): value is ForwardRef {
  return value instanceof ForwardRefImpl;
}
