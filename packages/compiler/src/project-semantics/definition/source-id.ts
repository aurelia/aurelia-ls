import {
  normalizePathForId,
  unwrapSourced,
  type ResourceDef,
} from "../compiler.js";
import { stableStringify } from "../fingerprint/fingerprint.js";
import type { DefinitionSourceKind } from "./solver.js";

export interface CanonicalSourceIdV1 {
  readonly v: 1;
  readonly sourceKind: DefinitionSourceKind;
  readonly packageName: string;
  readonly sourceFileKey: string;
  readonly symbolKey: string;
  readonly resourceKind: ResourceDef["kind"];
  readonly resourceName: string;
}

export interface CanonicalSourceIdentityCandidate {
  readonly resource: ResourceDef;
  readonly sourceKind: DefinitionSourceKind;
}

export function createCanonicalSourceIdV1(
  candidate: CanonicalSourceIdentityCandidate,
): CanonicalSourceIdV1 {
  const { resource } = candidate;
  return {
    v: 1,
    sourceKind: candidate.sourceKind,
    packageName: String(resource.package ?? ""),
    sourceFileKey: toCanonicalSourceFileKey(resource),
    symbolKey: String(unwrapSourced(resource.className) ?? ""),
    resourceKind: resource.kind,
    resourceName: String(unwrapSourced(resource.name) ?? ""),
  };
}

export function serializeCanonicalSourceIdV1(id: CanonicalSourceIdV1): string {
  return stableStringify(id);
}

export function canonicalSourceSortKey(
  candidate: CanonicalSourceIdentityCandidate,
): string {
  return serializeCanonicalSourceIdV1(createCanonicalSourceIdV1(candidate));
}

function toCanonicalSourceFileKey(resource: ResourceDef): string {
  if (!resource.file) return "";
  const normalizedFile = String(normalizePathForId(resource.file));
  const packageName = String(resource.package ?? "");
  if (packageName) {
    // Prefer package-relative keys when we can prove package ownership.
    const npmRelative = relativeToNodeModulesPackage(normalizedFile, packageName);
    if (npmRelative !== null) {
      return formatCanonicalSourceFileKey("npm", packageName, npmRelative);
    }
    const workspaceRelative = relativeToWorkspacePackage(normalizedFile, packageName);
    if (workspaceRelative !== null) {
      return formatCanonicalSourceFileKey("ws", packageName, workspaceRelative);
    }
  }
  // Explicit absolute fallback keeps determinism when package-relative roots
  // cannot be derived from file path + package metadata.
  return `abs:${normalizedFile}`;
}

function relativeToNodeModulesPackage(filePath: string, packageName: string): string | null {
  const segment = `/node_modules/${packageName}/`;
  const index = filePath.indexOf(segment);
  if (index < 0) return null;
  return filePath.slice(index + segment.length);
}

function relativeToWorkspacePackage(filePath: string, packageName: string): string | null {
  // Workspace package folder inference follows "@scope/name" -> "name".
  const packageFolder = packageName.split("/").pop() ?? packageName;
  const segment = `/packages/${packageFolder}/`;
  const index = filePath.indexOf(segment);
  if (index < 0) return null;
  return filePath.slice(index + segment.length);
}

function formatCanonicalSourceFileKey(
  family: "npm" | "ws",
  packageName: string,
  relativePath: string,
): string {
  if (!relativePath) return `${family}:${packageName}`;
  return `${family}:${packageName}/${relativePath}`;
}
