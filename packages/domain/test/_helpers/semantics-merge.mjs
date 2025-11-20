function isPlainObject(x) {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * Test-time semantics merge:
 * - Arrays: replace entirely
 * - Plain objects:
 *     * {}                   → clear (replace with empty object)
 *     * {__replace:true,...} → replace with "rest"
 *     * otherwise deep merge per key
 * - Primitives / type mismatches: patch replaces base
 */
export function deepMergeSemantics(base, patch) {
  if (patch == null) return base;

  // Arrays: full replace
  if (Array.isArray(base) && Array.isArray(patch)) {
    return patch.slice();
  }

  // Plain objects
  if (isPlainObject(base) && isPlainObject(patch)) {
    if (Object.keys(patch).length === 0) {
      return {};
    }
    if (patch.__replace === true) {
      const { __replace, ...rest } = patch;
      return rest;
    }

    const out = { ...base };
    for (const k of Object.keys(patch)) {
      const b = base[k];
      const p = patch[k];

      if (isPlainObject(p)) {
        if (Object.keys(p).length === 0) {
          out[k] = {};
        } else {
          out[k] = deepMergeSemantics(isPlainObject(b) ? b : {}, p);
        }
      } else if (Array.isArray(p)) {
        out[k] = p.slice();
      } else {
        out[k] = p;
      }
    }
    return out;
  }

  // Primitive or type mismatch: replace
  return patch;
}
