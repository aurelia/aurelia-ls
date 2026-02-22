import type { NormalizedPath, ResourceDef } from "../compiler.js";
import { normalizePathForId, unwrapSourced } from "../compiler.js";
import type { DefinitionCandidateOverride, DefinitionConvergenceRecord } from "../assemble/build.js";

export function createDiscoveryConvergenceOverrides(
  recognizedResources: readonly ResourceDef[],
  templateMetaResources: readonly ResourceDef[],
  packagePath?: string,
  matchSources?: ReadonlyMap<ResourceDef, string>,
): ReadonlyMap<ResourceDef, DefinitionCandidateOverride> {
  const overrides = new Map<ResourceDef, DefinitionCandidateOverride>();
  const base = createEvidenceConvergenceOverrides(recognizedResources, packagePath);
  for (const [resource, override] of base) {
    overrides.set(resource, override);
  }
  // Convention-matched resources get lower priority than explicit analysis.
  // Applied after evidence overrides so convention classification wins over
  // the external-package "analysis-explicit" tag.
  if (matchSources) {
    for (const resource of recognizedResources) {
      if (matchSources.get(resource) === "convention") {
        overrides.set(resource, {
          sourceKind: "analysis-convention",
          evidenceRank: 4,
        });
      }
    }
  }
  for (const resource of templateMetaResources) {
    overrides.set(resource, {
      sourceKind: "analysis-convention",
      // Template metadata should backfill unknowns but not override stronger
      // class/runtime-known fields when both are present.
      evidenceRank: 5,
    });
  }
  return overrides;
}

export function createEvidenceConvergenceOverrides(
  resources: readonly ResourceDef[],
  packagePath?: string,
): ReadonlyMap<ResourceDef, DefinitionCandidateOverride> {
  if (!packagePath) {
    return new Map();
  }
  const overrides = new Map<ResourceDef, DefinitionCandidateOverride>();
  const packageRoot = normalizePathForId(packagePath);
  for (const resource of resources) {
    const file = resource.file ? normalizePathForId(resource.file) : null;
    if (!file) continue;
    if (isProjectLocalResource(file, packageRoot)) continue;
    overrides.set(resource, {
      sourceKind: "analysis-explicit",
      evidenceRank: 2,
    });
  }
  return overrides;
}

export function createConvergenceReplayOverrides(
  resources: readonly ResourceDef[],
  convergence: readonly DefinitionConvergenceRecord[],
): ReadonlyMap<ResourceDef, DefinitionCandidateOverride> {
  const weakCandidateIds = new Set<string>();
  for (const record of convergence) {
    for (const candidate of record.candidates) {
      if (candidate.sourceKind !== "analysis-convention") continue;
      weakCandidateIds.add(candidate.candidateId);
    }
  }
  if (weakCandidateIds.size === 0) {
    return new Map();
  }

  const overrides = new Map<ResourceDef, DefinitionCandidateOverride>();
  const groupOrdinal = new Map<string, number>();
  for (const resource of resources) {
    const name = unwrapSourced(resource.name);
    if (!name) continue;
    const groupKey = `${resource.kind}:${name}`;
    const ordinal = (groupOrdinal.get(groupKey) ?? 0) + 1;
    groupOrdinal.set(groupKey, ordinal);
    const candidateId = createDefaultCandidateId(resource, ordinal);
    if (!weakCandidateIds.has(candidateId)) continue;
    overrides.set(resource, {
      sourceKind: "analysis-convention",
      evidenceRank: 4,
      candidateId,
    });
  }
  return overrides;
}

export function createReplayConvergenceOverrides(
  resources: readonly ResourceDef[],
  convergence: readonly DefinitionConvergenceRecord[],
  packagePath?: string,
): ReadonlyMap<ResourceDef, DefinitionCandidateOverride> {
  return mergeDefinitionCandidateOverrides(
    createEvidenceConvergenceOverrides(resources, packagePath),
    createConvergenceReplayOverrides(resources, convergence),
  );
}

export function mergeDefinitionCandidateOverrides(
  ...maps: readonly ReadonlyMap<ResourceDef, DefinitionCandidateOverride>[]
): ReadonlyMap<ResourceDef, DefinitionCandidateOverride> {
  if (maps.length === 0) return new Map();
  if (maps.length === 1) return maps[0]!;
  const merged = new Map<ResourceDef, DefinitionCandidateOverride>();
  for (const map of maps) {
    for (const [resource, override] of map) {
      merged.set(resource, override);
    }
  }
  return merged;
}

function createDefaultCandidateId(resource: ResourceDef, ordinal: number): string {
  const name = unwrapSourced(resource.name) ?? "";
  const className = unwrapSourced(resource.className) ?? "";
  const file = resource.file ?? "";
  return `${resource.kind}|${name}|${className}|${file}|${ordinal}`;
}

function isProjectLocalResource(
  file: NormalizedPath,
  packageRoot: NormalizedPath,
): boolean {
  const normalizedRoot = packageRoot.endsWith("/")
    ? packageRoot.slice(0, -1)
    : packageRoot;
  const normalizedFile = file;
  if (normalizedFile.includes("/node_modules/")) return false;
  return normalizedFile === normalizedRoot || normalizedFile.startsWith(`${normalizedRoot}/`);
}
