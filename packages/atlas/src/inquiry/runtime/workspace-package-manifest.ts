import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { isRecord, uniqueSortedStrings } from "../../collections.js";
import type {
  SourcePackageSummary,
  SourceProject,
} from "../../source/index.js";
import {
  resolveRepoPath,
  toPosixPath,
} from "../../source/index.js";

/** Manifest-derived package signals used by workspace architecture analysis. */
export interface WorkspacePackageManifestSummary {
  readonly hasPackageJson: boolean;
  readonly packageManager: string | null;
  readonly scriptNames: readonly string[];
  readonly dependencyNames: readonly string[];
  readonly localAureliaDependencyNames: readonly string[];
  readonly workspaceAureliaDependencyNames: readonly string[];
  readonly aureliaDependencyNames: readonly string[];
  readonly pluginDependencyNames: readonly string[];
  readonly buildToolHints: readonly string[];
}

/** Read package.json plus nearest package-manager evidence for one admitted package. */
export function readWorkspacePackageManifest(
  sourceProject: SourceProject,
  sourcePackage: SourcePackageSummary,
): WorkspacePackageManifestSummary {
  const packageRoot = resolveRepoPath(sourceProject.repoRoot, sourcePackage.rootPath);
  const packageJsonPath = path.join(packageRoot, "package.json");
  const lockfilePackageManager = inferPackageManagerFromLockfiles(packageRoot);
  const workspaceDependencyNames = workspaceAureliaDependencyNames(packageRoot);
  if (!existsSync(packageJsonPath)) {
    return emptyManifest(lockfilePackageManager, workspaceDependencyNames);
  }
  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonLike;
    const scriptNames = objectKeys(parsed.scripts);
    const dependencyNames = dependencyNamesFromManifest(parsed);
    const localAureliaDependencyNames = dependencyNames.filter(isAureliaPackageSpecifier);
    const aureliaDependencyNames = uniqueSortedStrings([
      ...localAureliaDependencyNames,
      ...workspaceDependencyNames,
    ]);
    const pluginDependencyNames = aureliaDependencyNames.filter(isAureliaPluginSpecifier);
    return {
      hasPackageJson: true,
      packageManager:
        packageManagerFromManifestField(parsed.packageManager) ?? lockfilePackageManager,
      scriptNames,
      dependencyNames,
      localAureliaDependencyNames,
      workspaceAureliaDependencyNames: workspaceDependencyNames,
      aureliaDependencyNames,
      pluginDependencyNames,
      buildToolHints: buildToolHints(parsed, scriptNames, dependencyNames),
    };
  } catch {
    return emptyManifest(lockfilePackageManager, workspaceDependencyNames);
  }
}

export function isWorkspaceScriptSignal(name: string): boolean {
  return /^(build|dev|start|serve|test|lint|check|preview|watch|storybook)/.test(name);
}

export function isAureliaPackageSpecifier(specifier: string): boolean {
  return (
    specifier === "aurelia" ||
    specifier.startsWith("@aurelia/") ||
    isAureliaPluginSpecifier(specifier)
  );
}

export function isAureliaPluginSpecifier(specifier: string): boolean {
  return specifier.startsWith("aurelia2-") || specifier.includes("/aurelia2-");
}

interface PackageJsonLike {
  readonly packageManager?: unknown;
  readonly workspaces?: unknown;
  readonly scripts?: unknown;
  readonly dependencies?: unknown;
  readonly devDependencies?: unknown;
  readonly peerDependencies?: unknown;
  readonly optionalDependencies?: unknown;
}

function dependencyNamesFromManifest(manifest: PackageJsonLike): readonly string[] {
  return uniqueSortedStrings([
    ...objectKeys(manifest.dependencies),
    ...objectKeys(manifest.devDependencies),
    ...objectKeys(manifest.peerDependencies),
    ...objectKeys(manifest.optionalDependencies),
  ]);
}

function buildToolHints(
  manifest: PackageJsonLike,
  scriptNames: readonly string[],
  dependencyNames: readonly string[],
): readonly string[] {
  const haystack = uniqueSortedStrings([
    ...scriptNames,
    ...dependencyNames,
    ...objectKeys(manifest.scripts).flatMap((name) => scriptText(manifest.scripts, name)),
  ]).join(" ").toLowerCase();
  return [
    "vite",
    "webpack",
    "rollup",
    "tsup",
    "esbuild",
    "nx",
    "turbo",
    "jest",
    "vitest",
    "playwright",
    "storybook",
  ].filter((hint) => haystack.includes(hint));
}

function scriptText(scripts: unknown, name: string): readonly string[] {
  if (!isRecord(scripts)) {
    return [];
  }
  const value = scripts[name];
  return typeof value === "string" ? [value] : [];
}

function packageManagerFromManifestField(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0 || normalized.startsWith("@")) {
    return null;
  }
  const [name = ""] = normalized.split("@", 1);
  return isKnownPackageManagerName(name) ? name : null;
}

function inferPackageManagerFromLockfiles(packageRoot: string): string | null {
  let current = path.resolve(packageRoot);
  for (let depth = 0; depth <= 8; depth += 1) {
    const packageManager = packageManagerFromDirectoryFiles(current);
    if (packageManager !== null) {
      return packageManager;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
  return null;
}

function workspaceAureliaDependencyNames(packageRoot: string): readonly string[] {
  const projectRoot = path.resolve(packageRoot);
  let current = path.dirname(projectRoot);

  for (let depth = 0; depth <= 8; depth += 1) {
    const manifest = readPackageJson(current);
    if (manifest !== null && workspacePatterns(manifest).some((pattern) =>
      workspacePatternMatchesProject(pattern, path.relative(current, projectRoot))
    )) {
      return dependencyNamesFromManifest(manifest).filter(isAureliaPackageSpecifier);
    }
    const parent = path.dirname(current);
    if (sameResolvedPath(parent, current)) {
      break;
    }
    current = parent;
  }

  return [];
}

function readPackageJson(packageRoot: string): PackageJsonLike | null {
  try {
    return JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8")) as PackageJsonLike;
  } catch {
    return null;
  }
}

function workspacePatterns(manifest: PackageJsonLike): readonly string[] {
  const value = manifest.workspaces;
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (isRecord(value)) {
    const packages = value["packages"];
    return Array.isArray(packages)
      ? packages.filter((entry): entry is string => typeof entry === "string")
      : [];
  }
  return [];
}

function workspacePatternMatchesProject(
  pattern: string,
  relativeProjectRoot: string,
): boolean {
  const normalizedProjectRoot = toPosixPath(path.normalize(relativeProjectRoot));
  if (normalizedProjectRoot.length === 0 || normalizedProjectRoot.startsWith("../")) {
    return false;
  }
  const normalizedPattern = normalizeWorkspacePattern(pattern);
  if (normalizedPattern.startsWith("!")) {
    return false;
  }
  return globPatternToRegExp(normalizedPattern).test(normalizedProjectRoot);
}

function normalizeWorkspacePattern(pattern: string): string {
  let normalized = toPosixPath(path.normalize(pattern)).replace(/^\.\//, "");
  while (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function globPatternToRegExp(pattern: string): RegExp {
  const body = pattern
    .split("/")
    .map((segment) => {
      if (segment === "**") {
        return "(?:[^/]+/)*[^/]+";
      }
      return segment
        .replace(/[\\^$+?.()|[\]{}]/g, "\\$&")
        .replace(/\*/g, "[^/]*");
    })
    .join("/");
  return new RegExp(`^${body}$`);
}

function sameResolvedPath(left: string, right: string): boolean {
  return toPosixPath(path.resolve(left)).toLowerCase() === toPosixPath(path.resolve(right)).toLowerCase();
}

function packageManagerFromDirectoryFiles(directory: string): string | null {
  if (
    existsSync(path.join(directory, "pnpm-lock.yaml")) ||
    existsSync(path.join(directory, "pnpm-workspace.yaml"))
  ) {
    return "pnpm";
  }
  if (existsSync(path.join(directory, "yarn.lock"))) {
    return "yarn";
  }
  if (
    existsSync(path.join(directory, "package-lock.json")) ||
    existsSync(path.join(directory, "npm-shrinkwrap.json"))
  ) {
    return "npm";
  }
  if (
    existsSync(path.join(directory, "bun.lock")) ||
    existsSync(path.join(directory, "bun.lockb"))
  ) {
    return "bun";
  }
  return null;
}

function isKnownPackageManagerName(name: string): boolean {
  return name === "pnpm" || name === "yarn" || name === "npm" || name === "bun";
}

function emptyManifest(
  packageManager: string | null = null,
  workspaceAureliaDependencyNames: readonly string[] = [],
): WorkspacePackageManifestSummary {
  return {
    hasPackageJson: false,
    packageManager,
    scriptNames: [],
    dependencyNames: [],
    localAureliaDependencyNames: [],
    workspaceAureliaDependencyNames,
    aureliaDependencyNames: workspaceAureliaDependencyNames,
    pluginDependencyNames: workspaceAureliaDependencyNames.filter(isAureliaPluginSpecifier),
    buildToolHints: [],
  };
}

function objectKeys(value: unknown): readonly string[] {
  return isRecord(value) ? Object.keys(value).sort((left, right) => left.localeCompare(right)) : [];
}
