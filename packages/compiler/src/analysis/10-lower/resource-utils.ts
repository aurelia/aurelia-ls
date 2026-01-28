import type { AttrRes, ElementRes, ResourceCatalog } from "../../schema/registry.js";

export function resolveElementDef(tag: string, catalog: ResourceCatalog): ElementRes | null {
  const normalized = tag.toLowerCase();
  const direct = catalog.resources.elements[normalized];
  if (direct) return direct;
  for (const def of Object.values(catalog.resources.elements)) {
    if (def.aliases?.includes(normalized)) return def;
  }
  return null;
}

export function resolveAttrDef(name: string, catalog: ResourceCatalog): AttrRes | null {
  const normalized = name.toLowerCase();
  const direct = catalog.resources.attributes[normalized];
  if (direct) return direct;
  for (const def of Object.values(catalog.resources.attributes)) {
    if (def.aliases?.includes(normalized)) return def;
  }
  return null;
}
