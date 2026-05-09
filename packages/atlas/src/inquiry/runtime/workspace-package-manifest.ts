import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { uniqueSortedStrings } from "../../collections.js";
import type {
  SourcePackageSummary,
  SourceProject,
} from "../../source/index.js";

/** Manifest-derived package signals used by workspace architecture analysis. */
export interface WorkspacePackageManifestSummary {
  readonly hasPackageJson: boolean;
  readonly packageManager: string | null;
  readonly scriptNames: readonly string[];
  readonly dependencyNames: readonly string[];
  readonly aureliaDependencyNames: readonly string[];
  readonly pluginDependencyNames: readonly string[];
  readonly buildToolHints: readonly string[];
}

/** Read package.json plus nearest package-manager evidence for one admitted package. */
export function readWorkspacePackageManifest(
  sourceProject: SourceProject,
  sourcePackage: SourcePackageSummary,
): WorkspacePackageManifestSummary {
  const packageRoot = absoluteSourcePath(sourceProject, sourcePackage.rootPath);
  const packageJsonPath = path.join(packageRoot, "package.json");
  const lockfilePackageManager = inferPackageManagerFromLockfiles(packageRoot);
  if (!existsSync(packageJsonPath)) {
    return emptyManifest(lockfilePackageManager);
  }
  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonLike;
    const scriptNames = objectKeys(parsed.scripts);
    const dependencyNames = dependencyNamesFromManifest(parsed);
    const aureliaDependencyNames = dependencyNames.filter(isAureliaPackageSpecifier);
    const pluginDependencyNames = dependencyNames.filter(isAureliaPluginSpecifier);
    return {
      hasPackageJson: true,
      packageManager:
        packageManagerFromManifestField(parsed.packageManager) ?? lockfilePackageManager,
      scriptNames,
      dependencyNames,
      aureliaDependencyNames,
      pluginDependencyNames,
      buildToolHints: buildToolHints(parsed, scriptNames, dependencyNames),
    };
  } catch {
    return emptyManifest(lockfilePackageManager);
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
): WorkspacePackageManifestSummary {
  return {
    hasPackageJson: false,
    packageManager,
    scriptNames: [],
    dependencyNames: [],
    aureliaDependencyNames: [],
    pluginDependencyNames: [],
    buildToolHints: [],
  };
}

function absoluteSourcePath(sourceProject: SourceProject, sourcePath: string): string {
  return path.isAbsolute(sourcePath)
    ? path.resolve(sourcePath)
    : path.join(sourceProject.repoRoot, sourcePath);
}

function objectKeys(value: unknown): readonly string[] {
  return isRecord(value) ? Object.keys(value).sort((left, right) => left.localeCompare(right)) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
