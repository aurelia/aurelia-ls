import type { ResourceDef, MaterializedSemantics, SymbolId } from '../compiler.js';
import { normalizePathForId, stableHash } from '../compiler.js';
import { unwrapSourced } from "../assemble/sourced.js";

export interface SnapshotIdOptions {
  readonly rootDir?: string;
  readonly packageRoots?: ReadonlyMap<string, string> | Readonly<Record<string, string>>;
}

export interface SnapshotResource {
  readonly def: ResourceDef;
  readonly name: string;
  readonly id: SymbolId;
  readonly sourceKey: string | null;
  readonly sortKey: string;
}

export function collectSnapshotResources(
  sem: MaterializedSemantics,
  options?: SnapshotIdOptions,
): SnapshotResource[] {
  const defs: ResourceDef[] = [];
  pushDefs(defs, sem.elements);
  pushDefs(defs, sem.attributes);
  pushDefs(defs, sem.controllers);
  pushDefs(defs, sem.valueConverters);
  pushDefs(defs, sem.bindingBehaviors);

  const resources: SnapshotResource[] = [];
  for (const def of defs) {
    const name = unwrapSourced(def.name);
    if (!name) continue;
    const sourceKey = resolveSourceKey(def, options);
    const id = createSymbolId(def, name, sourceKey);
    resources.push({
      def,
      name,
      id,
      sourceKey,
      sortKey: buildSortKey(def, name, sourceKey),
    });
  }

  resources.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return resources;
}

function pushDefs<T extends ResourceDef>(
  list: ResourceDef[],
  record: Readonly<Record<string, T>>,
): void {
  const keys = Object.keys(record).sort();
  for (const key of keys) {
    const value = record[key];
    if (value === undefined) continue;
    list.push(value);
  }
}

function buildSortKey(def: ResourceDef, name: string, sourceKey: string | null): string {
  const source = sourceKey ?? "";
  const pkg = def.package ?? "";
  const origin = def.name.origin;
  return `${def.kind}|${name}|${origin}|${source}|${pkg}`;
}

function createSymbolId(def: ResourceDef, name: string, sourceKey: string | null): SymbolId {
  const key = {
    kind: def.kind,
    name,
    origin: def.name.origin,
    source: sourceKey,
    package: def.package ?? null,
  };
  return `sym:${stableHash(key)}` as SymbolId;
}

function resolveSourceKey(def: ResourceDef, options?: SnapshotIdOptions): string | null {
  if (!def.file) return null;
  const filePath = String(def.file);

  const packageRoot = resolvePackageRoot(def, options);
  const root = packageRoot ?? resolveProjectRoot(options);
  if (!root) return null;

  return relativeToRoot(filePath, root);
}

function resolveProjectRoot(options?: SnapshotIdOptions): string | null {
  if (!options?.rootDir) return null;
  return normalizeRoot(options.rootDir);
}

function resolvePackageRoot(def: ResourceDef, options?: SnapshotIdOptions): string | null {
  if (!def.package || !def.file) return null;
  const mappedRoot = lookupPackageRoot(options?.packageRoots, def.package);
  if (mappedRoot) {
    return normalizeRoot(mappedRoot);
  }

  const filePath = String(def.file);
  const nodeSegment = `/node_modules/${def.package}/`;
  const nodeIndex = filePath.indexOf(nodeSegment);
  if (nodeIndex >= 0) {
    return filePath.slice(0, nodeIndex + nodeSegment.length - 1);
  }

  const pkgFolder = def.package.split("/").pop() ?? def.package;
  const workspaceSegment = `/packages/${pkgFolder}/`;
  const workspaceIndex = filePath.indexOf(workspaceSegment);
  if (workspaceIndex >= 0) {
    return filePath.slice(0, workspaceIndex + workspaceSegment.length - 1);
  }

  return null;
}

function lookupPackageRoot(
  roots: ReadonlyMap<string, string> | Readonly<Record<string, string>> | undefined,
  name: string,
): string | null {
  if (!roots) return null;
  if (roots instanceof Map) {
    return roots.get(name) ?? null;
  }
  const record = roots as Readonly<Record<string, string>>;
  return record[name] ?? null;
}

function normalizeRoot(rootDir: string): string {
  const normalized = String(normalizePathForId(rootDir));
  return stripTrailingSlash(normalized);
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function relativeToRoot(filePath: string, root: string): string | null {
  const prefix = root.endsWith("/") ? root : `${root}/`;
  if (filePath === root) return "";
  if (!filePath.startsWith(prefix)) return null;
  return filePath.slice(prefix.length);
}
