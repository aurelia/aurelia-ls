import assert from "node:assert/strict";

/**
 * Lower + resolve-host in one go.
 * Options:
 *  - file/name: VFS identity
 *  - semOverrides: partial Semantics object to merge into DEFAULT
 */
export async function linkMarkup(markup, { file = "mem.html", name = "mem", semOverrides = undefined } = {}) {
  const indexUrl = new URL("../../../out/index.js", import.meta.url);
  const { getAureliaParsers } = await import(indexUrl.href);

  const lowerUrl = new URL("../../../out/compiler/phases/10-lower/lower.js", import.meta.url);
  const { lowerDocument } = await import(lowerUrl.href);

  const semUrl = new URL("../../../out/compiler/language/registry.js", import.meta.url);
  const { DEFAULT: SEM_DEFAULT } = await import(semUrl.href);

  const resolveUrl = new URL("../../../out/compiler/phases/20-resolve-host/resolve.js", import.meta.url);
  const { resolveHost } = await import(resolveUrl.href);

  const { attrParser, exprParser } = getAureliaParsers();

  const ir = lowerDocument(markup, { attrParser, exprParser, file, name });
  assert.ok(ir && ir.templates?.length, "lowerDocument must produce a module with templates");

  const sem = semOverrides ? deepMerge(SEM_DEFAULT, semOverrides) : SEM_DEFAULT;
  const linked = resolveHost(ir, sem);
  return linked;
}

// --- Merge semantics for test overrides -------------------------------------
// - Arrays: replace entirely
// - Plain objects:
//     * {}      → clear (replace with empty object)
//     * {__replace:true, ...rest} → replace with "rest"
//     * otherwise deep merge per key
// - Primitives / type mismatches: patch replaces base
function deepMerge(base, patch) {
  if (patch == null) return base;

  // Arrays: full replace
  if (Array.isArray(base) && Array.isArray(patch)) {
    return patch.slice();
  }

  // Plain objects
  if (isPlainObject(base) && isPlainObject(patch)) {
    // Empty object → CLEAR
    if (Object.keys(patch).length === 0) {
      return {};
    }
    // Explicit replace sentinel
    if (patch.__replace === true) {
      const { __replace, ...rest } = patch;
      return rest;
    }

    const out = { ...base };
    for (const k of Object.keys(patch)) {
      const b = base[k];
      const p = patch[k];

      if (isPlainObject(p)) {
        // Empty child object means clear that child
        if (Object.keys(p).length === 0) {
          out[k] = {};
        } else {
          out[k] = deepMerge(isPlainObject(b) ? b : {}, p);
        }
      } else if (Array.isArray(p)) {
        out[k] = p.slice();
      } else {
        out[k] = p;
      }
    }
    return out;
  }

  // Primitives or type mismatch: replace
  return patch;
}

function isPlainObject(x) {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
