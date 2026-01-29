import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import type { ExternalPackageSpec } from "./schema.js";

let cachedRepoRoot: string | null = null;

export function resolveRepoRoot(): string {
  if (cachedRepoRoot) return cachedRepoRoot;
  const explicit = process.env.AURELIA_HARNESS_REPO_ROOT;
  if (explicit) {
    cachedRepoRoot = resolvePath(explicit);
    return cachedRepoRoot;
  }

  let current = resolvePath(process.cwd());
  while (true) {
    const pkgPath = join(current, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
        if (pkg.name === "aurelia-ls") {
          cachedRepoRoot = current;
          return cachedRepoRoot;
        }
      } catch {
        // ignore malformed json and keep walking
      }
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  cachedRepoRoot = resolvePath(process.cwd());
  return cachedRepoRoot;
}

export function resolveExternalPackagePath(id: string): string {
  const root = resolveRepoRoot();
  if (id.startsWith("@test/")) {
    const name = id.slice("@test/".length);
    return join(root, "packages", "compiler", "test", "project-semantics", "npm", "fixtures", name);
  }
  if (id === "aurelia" || id.startsWith("@aurelia/")) {
    const name = id === "aurelia" ? "aurelia" : id.slice("@aurelia/".length);
    return join(root, "aurelia", "packages", name);
  }
  if (id.startsWith("aurelia2-")) {
    return join(root, "aurelia2-plugins", "packages", id);
  }
  return join(root, "node_modules", id);
}

export function readPackageName(pkgPath: string): string | undefined {
  const pkgJsonPath = join(pkgPath, "package.json");
  if (!existsSync(pkgJsonPath)) return undefined;
  try {
    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as { name?: string };
    return pkg.name;
  } catch {
    return undefined;
  }
}

export function resolveExternalPackageSpec(spec: ExternalPackageSpec): ExternalPackageSpec {
  const path = spec.path ?? (spec.id ? resolveExternalPackagePath(spec.id) : undefined);
  if (!path) {
    throw new Error("External package spec requires either path or id.");
  }
  const pkgJsonPath = join(path, "package.json");
  if (!existsSync(path) || !existsSync(pkgJsonPath)) {
    const label = spec.id ?? path;
    throw new Error(`External package path not found for "${label}".`);
  }
  const id = spec.id ?? readPackageName(path);
  return {
    ...spec,
    path,
    ...(id ? { id } : {}),
  };
}

export function mergePackageRoots(
  base: Readonly<Record<string, string>> | undefined,
  specs: readonly ExternalPackageSpec[],
): Readonly<Record<string, string>> | undefined {
  if (!specs.length && !base) return base;
  const merged: Record<string, string> = { ...(base ?? {}) };
  for (const spec of specs) {
    if (!spec.id) continue;
    if (merged[spec.id]) continue;
    if (!spec.path) continue;
    merged[spec.id] = spec.path;
  }
  return Object.keys(merged).length ? merged : base;
}
