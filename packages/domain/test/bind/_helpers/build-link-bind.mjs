import assert from "node:assert/strict";

/**
 * Lower + resolve-host + bind in one go (returns all 3 artifacts).
 * Options:
 *  - file/name: VFS identity
 *  - semOverrides: partial Semantics object to merge into DEFAULT
 */
export async function bindMarkup(markup, { file = "mem.html", name = "mem", semOverrides = undefined } = {}) {
  const indexUrl = new URL("../../../out/index.js", import.meta.url);
  const { getExpressionParser, DEFAULT_SYNTAX } = await import(indexUrl.href);

  const lowerUrl = new URL("../../../out/compiler/phases/10-lower/lower.js", import.meta.url);
  const { lowerDocument } = await import(lowerUrl.href);

  const semUrl = new URL("../../../out/compiler/language/registry.js", import.meta.url);
  const { DEFAULT: SEM_DEFAULT } = await import(semUrl.href);

  const resolveUrl = new URL("../../../out/compiler/phases/20-resolve-host/resolve.js", import.meta.url);
  const { resolveHost } = await import(resolveUrl.href);

  const bindUrl = new URL("../../../out/compiler/phases/30-bind/bind.js", import.meta.url);
  const { bindScopes } = await import(bindUrl.href);

  const exprParser = getExpressionParser();
  const attrParser = DEFAULT_SYNTAX;

  const ir = lowerDocument(markup, { attrParser, exprParser, file, name });
  assert.ok(ir && ir.templates?.length, "lowerDocument must produce a module with templates");

  const sem = semOverrides ? deepMerge(SEM_DEFAULT, semOverrides) : SEM_DEFAULT;
  const linked = resolveHost(ir, sem);

  const scope = bindScopes(linked);
  return { ir, linked, scope };
}

// --- Merge semantics for test overrides (same rules as resolve helper) ------
// - Arrays: replace entirely
// - Plain objects:
//     * {}      → clear (replace with empty object)
//     * {__replace:true, ...rest} → replace with "rest"
//     * otherwise deep merge per key
// - Primitives / type mismatches: patch replaces base
function deepMerge(base, patch) {
  if (patch == null) return base;

  if (Array.isArray(base) && Array.isArray(patch)) {
    return patch.slice();
  }

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
        out[k] = Object.keys(p).length === 0 ? {} : deepMerge(isPlainObject(b) ? b : {}, p);
      } else if (Array.isArray(p)) {
        out[k] = p.slice();
      } else {
        out[k] = p;
      }
    }
    return out;
  }

  return patch;
}

function isPlainObject(x) {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
