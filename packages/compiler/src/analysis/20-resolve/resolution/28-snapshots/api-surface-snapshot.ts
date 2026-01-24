import type {
  ApiSurfaceBindable,
  ApiSurfaceSnapshot,
  ApiSurfaceSymbol,
  ResourceDef,
  SemanticsWithCaches,
  SymbolId,
} from '../compiler.js';
import { unwrapSourced } from "../25-semantics/sourced.js";
import { collectSnapshotResources, type SnapshotIdOptions, type SnapshotResource } from "./shared.js";

const API_SURFACE_SNAPSHOT_VERSION = "aurelia-api-snapshot@1";

export function buildApiSurfaceSnapshot(
  sem: SemanticsWithCaches,
  options?: SnapshotIdOptions,
): ApiSurfaceSnapshot {
  const resources = collectSnapshotResources(sem, options);
  const symbols = resources.map(toApiSurfaceSymbol);
  return {
    version: API_SURFACE_SNAPSHOT_VERSION,
    symbols,
  };
}

function toApiSurfaceSymbol(resource: SnapshotResource): ApiSurfaceSymbol {
  const aliases = collectAliases(resource.def);
  const bindables = collectBindables(resource.def);
  return {
    id: resource.id,
    kind: resource.def.kind,
    name: resource.name,
    ...(aliases.length ? { aliases } : {}),
    ...(bindables?.length ? { bindables } : {}),
    ...(resource.def.file ? { source: resource.def.file } : {}),
  };
}

function collectAliases(def: ResourceDef): string[] {
  let aliases: string[] = [];

  switch (def.kind) {
    case "custom-element":
    case "custom-attribute":
      aliases = def.aliases
        .map((alias) => unwrapSourced(alias))
        .filter((alias): alias is string => !!alias);
      break;
    case "template-controller":
      aliases = (unwrapSourced(def.aliases) ?? []).slice();
      break;
    default:
      break;
  }

  aliases.sort();
  return aliases;
}

function collectBindables(def: ResourceDef): ApiSurfaceBindable[] | undefined {
  if (!("bindables" in def)) return undefined;
  const bindables = def.bindables ?? {};
  const primary = def.kind === "custom-attribute" ? unwrapSourced(def.primary) : undefined;

  const items: ApiSurfaceBindable[] = [];
  for (const [key, bindable] of Object.entries(bindables)) {
    const name = unwrapSourced(bindable.property) ?? key;
    const attribute = unwrapSourced(bindable.attribute);
    const mode = unwrapSourced(bindable.mode);
    let isPrimary = unwrapSourced(bindable.primary);
    if (!isPrimary && primary) {
      const attrName = attribute ?? name;
      if (primary === name || primary === attrName) {
        isPrimary = true;
      }
    }

    const entry: ApiSurfaceBindable = {
      name,
      ...(attribute ? { attribute } : {}),
      ...(mode ? { mode } : {}),
      ...(isPrimary ? { primary: true } : {}),
    };
    items.push(entry);
  }

  items.sort((a, b) => a.name.localeCompare(b.name));
  return items.length ? items : undefined;
}
