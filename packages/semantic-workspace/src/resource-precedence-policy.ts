import { normalizePathForId, unwrapSourced, type ResourceDef } from "@aurelia-ls/compiler";

export interface ResourceCandidate {
  readonly def: ResourceDef;
}

export interface ResourceSelectionOptions {
  readonly file?: string | null;
  readonly preferredRoots?: readonly string[] | null;
}

/**
 * Canonical resource precedence policy used by query/refactor surfaces.
 *
 * Selection order:
 * 1) Exact file match (if requested)
 * 2) Preferred workspace roots
 * 3) First-party (no package) over package resources
 * 4) Name origin: config > source > builtin
 * 5) Definitions with concrete files over fileless entries
 * 6) Deterministic lexical tie-breaks
 */
export function selectResourceCandidate<T extends ResourceCandidate>(
  entries: readonly T[] | undefined,
  options?: ResourceSelectionOptions,
): T | null {
  if (!entries || entries.length === 0) return null;
  if (entries.length === 1) return entries[0] ?? null;

  const exactFile = options?.file ? normalizePathForId(options.file) : null;
  const preferredRoots = normalizeRoots(options?.preferredRoots ?? []);

  const sorted = [...entries].sort((a, b) =>
    compareCandidates(a, b, {
      exactFile,
      preferredRoots,
    }),
  );
  return sorted[0] ?? null;
}

type PreparedOptions = {
  exactFile: string | null;
  preferredRoots: readonly string[];
};

function compareCandidates<T extends ResourceCandidate>(
  a: T,
  b: T,
  options: PreparedOptions,
): number {
  const aScore = scoreCandidate(a.def, options);
  const bScore = scoreCandidate(b.def, options);

  const primary = compareNumberTuple(aScore, bScore);
  if (primary !== 0) return primary;

  const aFile = normalizedFile(a.def);
  const bFile = normalizedFile(b.def);
  const fileDelta = aFile.localeCompare(bFile);
  if (fileDelta !== 0) return fileDelta;

  const aPackage = String(a.def.package ?? "");
  const bPackage = String(b.def.package ?? "");
  const packageDelta = aPackage.localeCompare(bPackage);
  if (packageDelta !== 0) return packageDelta;

  const aName = String(unwrapSourced(a.def.name) ?? "");
  const bName = String(unwrapSourced(b.def.name) ?? "");
  const nameDelta = aName.localeCompare(bName);
  if (nameDelta !== 0) return nameDelta;

  return 0;
}

function scoreCandidate(def: ResourceDef, options: PreparedOptions): readonly number[] {
  const file = normalizedFile(def);
  const inExactFile = options.exactFile && file === options.exactFile ? 0 : 1;
  const inPreferredRoot = file && isInAnyRoot(file, options.preferredRoots) ? 0 : 1;
  const packageRank = def.package ? 1 : 0;
  const originRank = sourcedOriginRank(def.name.origin);
  const hasFileRank = file ? 0 : 1;
  // Lower tuple values are preferred. Tuple order encodes the policy order
  // documented above; keep this sequence aligned with the doc contract.
  return [inExactFile, inPreferredRoot, packageRank, originRank, hasFileRank];
}

function compareNumberTuple(a: readonly number[], b: readonly number[]): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const delta = (a[i] ?? 0) - (b[i] ?? 0);
    if (delta !== 0) return delta;
  }
  return a.length - b.length;
}

function sourcedOriginRank(origin: ResourceDef["name"]["origin"]): number {
  switch (origin) {
    case "config":
      return 0;
    case "source":
      return 1;
    case "builtin":
    default:
      return 2;
  }
}

function normalizeRoots(roots: readonly string[] | null | undefined): string[] {
  const normalized: string[] = [];
  for (const root of roots ?? []) {
    if (!root) continue;
    const value = String(normalizePathForId(root));
    normalized.push(value.endsWith("/") ? value : `${value}/`);
  }
  return normalized;
}

function normalizedFile(def: ResourceDef): string {
  return def.file ? String(normalizePathForId(def.file)) : "";
}

function isInAnyRoot(file: string, roots: readonly string[]): boolean {
  if (!file || roots.length === 0) return false;
  return roots.some((root) => file.startsWith(root));
}
