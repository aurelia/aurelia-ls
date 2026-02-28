/**
 * Intern Pool — Hash-Consing for GreenValue
 *
 * Structural interning (L1 value-representation §S2). Structurally identical
 * green values become the same object. Cutoff comparison is then pointer
 * equality (`===`), O(1) regardless of value complexity.
 *
 * Cost model:
 * - Creation: structural hash at construction (paid once per unique value)
 * - Comparison: pointer equality (free, paid at every cutoff check)
 * - Memory: one object per unique structural value
 *
 * The hash covers ALL fields of a green value — no exclusions needed because
 * green types carry no positional data (enforced by the type system in green.ts).
 */

import type {
  GreenValue,
  GreenMethod,
  GreenStatement,
  GreenParameter,
  GreenDecorator,
  GreenBindable,
  GreenVariableDecl,
} from './green.js';

// =============================================================================
// Structural Hashing
// =============================================================================

/**
 * Compute a structural hash string for a GreenValue.
 *
 * The hash is deterministic and covers all fields. Since green types carry
 * no spans, every field participates — no whitelist needed.
 */
export function hashGreen(value: GreenValue): string {
  const parts: string[] = [];
  hashValue(value, parts);
  return parts.join('');
}

function hashValue(value: GreenValue, out: string[]): void {
  out.push(value.kind, '|');
  switch (value.kind) {
    case 'literal':
      out.push(String(value.value), '|', typeof value.value);
      return;

    case 'array':
      out.push('[');
      for (const el of value.elements) hashValue(el, out);
      out.push(']');
      return;

    case 'object':
      out.push('{');
      for (const [k, v] of sortedEntries(value.properties)) {
        out.push(k, ':');
        hashValue(v, out);
      }
      out.push('M{');
      for (const [k, m] of sortedEntries(value.methods)) {
        out.push(k, ':');
        hashMethod(m, out);
      }
      out.push('}');
      return;

    case 'function':
      out.push(value.name ?? '\0', '(');
      for (const p of value.params) hashParam(p, out);
      out.push('){');
      for (const s of value.body) hashStatement(s, out);
      out.push('}');
      return;

    case 'class':
      out.push(value.className, '@', value.filePath, 'D[');
      for (const d of value.decorators) hashDecorator(d, out);
      out.push(']S{');
      for (const [k, v] of sortedEntries(value.staticMembers)) {
        out.push(k, ':');
        hashValue(v, out);
      }
      out.push('}B[');
      for (const b of value.bindableMembers) hashBindable(b, out);
      out.push(']G[');
      for (const g of value.gapKinds) out.push(g, ',');
      out.push(']');
      return;

    case 'reference':
      out.push(value.name);
      if (value.resolved) { out.push('>'); hashValue(value.resolved, out); }
      return;

    case 'import':
      out.push(value.specifier, '#', value.exportName);
      if (value.resolvedPath) out.push('@', value.resolvedPath);
      if (value.resolved) { out.push('>'); hashValue(value.resolved, out); }
      return;

    case 'propertyAccess':
      hashValue(value.base, out);
      out.push('.', value.property);
      return;

    case 'call':
      hashValue(value.callee, out);
      out.push('(');
      for (const a of value.args) hashValue(a, out);
      out.push(')');
      if (value.returnValue) { out.push('=>'); hashValue(value.returnValue, out); }
      return;

    case 'spread':
      out.push('...');
      hashValue(value.target, out);
      if (value.expanded) {
        out.push('[');
        for (const e of value.expanded) hashValue(e, out);
        out.push(']');
      }
      return;

    case 'new':
      out.push('new ');
      hashValue(value.callee, out);
      out.push('(');
      for (const a of value.args) hashValue(a, out);
      out.push(')');
      return;

    case 'unknown':
      out.push(value.reasonKind);
      return;
  }
}

function hashMethod(m: GreenMethod, out: string[]): void {
  out.push(m.name, '(');
  for (const p of m.params) hashParam(p, out);
  out.push('){');
  for (const s of m.body) hashStatement(s, out);
  out.push('}');
}

function hashParam(p: GreenParameter, out: string[]): void {
  out.push(p.name);
  if (p.isRest) out.push('...');
  if (p.defaultValue) { out.push('='); hashValue(p.defaultValue, out); }
  out.push(',');
}

function hashDecorator(d: GreenDecorator, out: string[]): void {
  out.push('@', d.name, '(');
  for (const a of d.args) hashValue(a, out);
  out.push(')');
}

function hashBindable(b: GreenBindable, out: string[]): void {
  out.push(b.name, '(');
  for (const a of b.args) hashValue(a, out);
  out.push(')');
  if (b.type) out.push(':', b.type);
  out.push(',');
}

function hashStatement(s: GreenStatement, out: string[]): void {
  out.push(s.kind, '|');
  switch (s.kind) {
    case 'return':
      if (s.value) hashValue(s.value, out);
      return;
    case 'expression':
      hashValue(s.value, out);
      return;
    case 'variable':
      for (const d of s.declarations) hashVarDecl(d, out);
      return;
    case 'if':
      hashValue(s.condition, out);
      out.push('?{');
      for (const t of s.thenBranch) hashStatement(t, out);
      out.push('}');
      if (s.elseBranch) {
        out.push(':{');
        for (const e of s.elseBranch) hashStatement(e, out);
        out.push('}');
      }
      return;
    case 'forOf':
      out.push(s.variable, ' of ');
      hashValue(s.iterable, out);
      out.push('{');
      for (const b of s.body) hashStatement(b, out);
      out.push('}');
      return;
    case 'unknownStatement':
      out.push(s.reasonKind);
      return;
  }
}

function hashVarDecl(d: GreenVariableDecl, out: string[]): void {
  out.push(d.name, '=');
  if (d.init) hashValue(d.init, out);
  else out.push('\0');
  out.push(',');
}

function sortedEntries<V>(map: ReadonlyMap<string, V>): [string, V][] {
  return [...map.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
}

// =============================================================================
// Intern Pool
// =============================================================================

export class InternPool {
  private readonly pool = new Map<string, GreenValue>();

  /**
   * Intern a green value. Returns the canonical instance — structurally
   * identical values return the same object.
   *
   * After interning, cutoff comparison is `===` (pointer equality).
   */
  intern(value: GreenValue): GreenValue {
    const hash = hashGreen(value);
    const existing = this.pool.get(hash);
    if (existing) return existing;
    this.pool.set(hash, value);
    return value;
  }

  /** Number of unique values in the pool. */
  get size(): number {
    return this.pool.size;
  }

  /** Clear the pool (e.g., on full rebuild). */
  clear(): void {
    this.pool.clear();
  }
}
