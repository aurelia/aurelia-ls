import type { NodeSem } from "./types.js";
import type { SemanticsLookup } from "../../schema/types.js";

/**
 * Attr → prop normalization for interpolation on attributes.
 * Priority: naming.perTag > dom.element.attrToProp > naming.global > camelCase.
 * Preserved prefixes (data-/aria-) are handled before this is called.
 */
export function normalizeAttrToProp(host: NodeSem, rawAttr: string, lookup: SemanticsLookup): string {
  const attr = rawAttr.toLowerCase();
  if (host.kind !== "element") return camelCase(attr);

  const tag = host.tag;
  const sem = lookup.sem;

  // 1) naming.perTag (highest precedence)
  const perTag = sem.naming.perTag?.[tag]?.[attr];
  if (perTag) return perTag;

  // 2) dom.elements[tag].attrToProp overrides
  const elt = sem.dom.elements[tag];
  const domOverride = elt?.attrToProp?.[attr];
  if (domOverride) return domOverride;

  // 3) naming.global
  const global = sem.naming.attrToPropGlobal[attr];
  if (global) return global;

  // 4) host-aware case-insensitive canonicalization
  //    (handles 'classname' → 'className', 'valueasnumber' → 'valueAsNumber', etc.)
  const hostKey = lookupHostPropCaseInsensitive(host, attr);
  if (hostKey) return hostKey;

  // 5) fallback camelCase (kebab → camel)
  return camelCase(attr);
}

/**
 * Property-like normalization for `.bind/.to-view` authored names that resemble attrs.
 * Handles cases like `minlength.bind` on `<input>` → `minLength`.
 * If it already looks like a prop (has uppercase, no hyphen), return as-is.
 */
export function normalizePropLikeName(host: NodeSem, raw: string, lookup: SemanticsLookup): string {
  const looksLikeProp = /[A-Z]/.test(raw) && !raw.includes("-");
  if (looksLikeProp) return raw;
  return normalizeAttrToProp(host, raw, lookup);
}

export function camelCase(n: string): string {
  return n.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
}

function lookupHostPropCaseInsensitive(host: NodeSem, raw: string): string | null {
  if (host.kind !== "element") return null;
  const needle = raw.toLowerCase();

  // 1) Prefer custom element bindables (component props)
  if (host.custom) {
    for (const bindable of Object.values(host.custom.def.bindables)) {
      if (bindable.attribute && bindable.attribute.toLowerCase() === needle) {
        return bindable.name;
      }
    }
    for (const k of Object.keys(host.custom.def.bindables)) {
      if (k.toLowerCase() === needle) return k;
    }
  }
  // 2) Then native DOM props for this tag
  if (host.native) {
    for (const k of Object.keys(host.native.def.props)) {
      if (k.toLowerCase() === needle) return k;
    }
  }
  return null;
}
