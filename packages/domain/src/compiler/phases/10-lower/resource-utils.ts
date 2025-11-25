import type { AttrRes, ElementRes, Semantics } from "../../language/registry.js";

export function resolveElementDef(tag: string, sem: Semantics): ElementRes | null {
  const normalized = tag.toLowerCase();
  const direct = sem.resources.elements[normalized];
  if (direct) return direct;
  for (const def of Object.values(sem.resources.elements)) {
    if (def.aliases?.includes(normalized)) return def;
  }
  return null;
}

export function resolveAttrDef(name: string, sem: Semantics): AttrRes | null {
  const normalized = name.toLowerCase();
  const direct = sem.resources.attributes[normalized];
  if (direct) return direct;
  for (const def of Object.values(sem.resources.attributes)) {
    if (def.aliases?.includes(normalized)) return def;
  }
  return null;
}
