import path from 'node:path';
import type { SemanticRuntimeProjectInputHost } from '../kernel/project-input.js';
import {
  BootProjectDiscoveryMode,
  type ResolvedBootProjectInput,
} from './frames.js';
import {
  readPackageName,
  safeIsDirectory,
  safeReadDirectory,
  isHostPathWithin,
} from './host-files.js';
import { AURELIA_PROJECT_CONFIGURATION_FILE_NAME } from './project-configuration.js';
import { canonicalTypeSystemPath } from '../type-system/source-file-path.js';
import {
  AuthoredSourceBoundary,
  authoredSourceExclusionsWithin,
} from './source-boundary.js';
import {
  deterministicProjectRootAdmissionOrigins,
  ProjectRootAdmissionOriginKind,
  type ProjectRootAdmissionOrigin,
  type ProjectRootMarkerAdmissionOrigin,
} from './project-root-admission.js';

const DISCOVERY_EXCLUDED_DIRECTORIES = new Set([
  'coverage',
  'dist',
  'node_modules',
  'out',
]);

const MAX_PROJECT_DISCOVERY_DEPTH = 7;

const PROJECT_ROOT_MARKERS = [
  ['package.json', ProjectRootAdmissionOriginKind.PackageJsonMarker],
  ['tsconfig.json', ProjectRootAdmissionOriginKind.TsconfigJsonMarker],
  ['jsconfig.json', ProjectRootAdmissionOriginKind.JsconfigJsonMarker],
  [AURELIA_PROJECT_CONFIGURATION_FILE_NAME, ProjectRootAdmissionOriginKind.AureliaProjectJsonMarker],
] as const;

interface DiscoveredProjectRoot {
  readonly rootDir: string;
  readonly admissionOrigins: readonly ProjectRootAdmissionOrigin[];
}

/** Discover boot project frames from exact project-root markers without interpreting their contents. */
export function discoverBootProjects(
  rootDir: string,
  host: SemanticRuntimeProjectInputHost,
  mode: BootProjectDiscoveryMode | `${BootProjectDiscoveryMode}` = BootProjectDiscoveryMode.ProjectMarkers,
  excludedWorkspaceRoots: readonly string[] = [],
  projectRootHints: readonly string[] = [],
): readonly ResolvedBootProjectInput[] {
  const absoluteRoot = path.resolve(rootDir);
  const workspaceBoundary = new AuthoredSourceBoundary(absoluteRoot, excludedWorkspaceRoots);
  if (mode === BootProjectDiscoveryMode.SingleRoot) {
    return [{
      rootDir: absoluteRoot,
      excludedSourceRoots: workspaceBoundary.excludedRootDirs,
      admissionOrigins: [{ kind: ProjectRootAdmissionOriginKind.SingleRoot }],
    }];
  }
  if (mode !== BootProjectDiscoveryMode.ProjectMarkers) {
    throw new Error(`Unknown boot project discovery mode '${String(mode)}'.`);
  }

  const hintedRoots = normalizeProjectRootHints(
    absoluteRoot,
    host,
    workspaceBoundary,
    projectRootHints,
  );
  const discovery = discoverProjectRoots(host, workspaceBoundary, hintedRoots);
  const discoveredRoots = mergeDiscoveredProjectRoots([
    ...(discovery.workspaceScanOrigins.length === 0
      ? [{
          rootDir: absoluteRoot,
          admissionOrigins: [{ kind: ProjectRootAdmissionOriginKind.WorkspaceRootFallback }],
        } satisfies DiscoveredProjectRoot]
      : discoveredProjectRootsForMarkerOrigins(discovery.workspaceScanOrigins)),
    ...hintedRoots.map((rootDir): DiscoveredProjectRoot => ({
      rootDir,
      admissionOrigins: [{ kind: ProjectRootAdmissionOriginKind.HostProjectRootHint }],
    })),
    ...discoveredProjectRootsForMarkerOrigins(discovery.hintedScanOrigins),
  ]);
  const keyCounts = new Map<string, number>();
  return discoveredRoots.map((project) => {
    const baseKey = projectKeyForRoot(host, absoluteRoot, project.rootDir);
    const count = keyCounts.get(baseKey) ?? 0;
    keyCounts.set(baseKey, count + 1);
    const projectKey = count === 0 ? baseKey : `${baseKey}:${count + 1}`;
    const nestedProjectRoots = discoveredRoots
      .map((candidate) => candidate.rootDir)
      .filter((candidate) => candidate !== project.rootDir && isHostPathWithin(candidate, project.rootDir));
    return {
      rootDir: project.rootDir,
      projectKey,
      excludedSourceRoots: [
        ...authoredSourceExclusionsWithin(project.rootDir, workspaceBoundary.excludedRootDirs),
        ...nestedProjectRoots,
      ],
      admissionOrigins: project.admissionOrigins,
    };
  });
}

function normalizeProjectRootHints(
  workspaceRoot: string,
  host: SemanticRuntimeProjectInputHost,
  boundary: AuthoredSourceBoundary,
  hints: readonly string[],
): readonly string[] {
  const result: string[] = [];
  for (const hint of hints) {
    const absoluteHint = path.resolve(workspaceRoot, hint);
    if (!isHostPathWithin(absoluteHint, workspaceRoot)) {
      throw new Error(
        `Project root hint '${absoluteHint}' must be inside semantic-runtime workspace '${workspaceRoot}'.`,
      );
    }
    if (!boundary.contains(absoluteHint)) {
      continue;
    }
    if (!safeIsDirectory(host, absoluteHint)) {
      throw new Error(`Project root hint '${absoluteHint}' does not exist or is not a directory.`);
    }
    result.push(absoluteHint);
  }
  return uniqueProjectRoots(result);
}

function uniqueProjectRoots(roots: readonly string[]): readonly string[] {
  const rootsByIdentity = new Map<string, string>();
  for (const root of roots) {
    const absoluteRoot = path.normalize(path.resolve(root));
    const identity = canonicalTypeSystemPath(absoluteRoot);
    const existing = rootsByIdentity.get(identity);
    if (existing == null || absoluteRoot.localeCompare(existing) < 0) {
      rootsByIdentity.set(identity, absoluteRoot);
    }
  }
  return [...rootsByIdentity.values()]
    .sort((left, right) => left.localeCompare(right));
}

function discoverProjectRoots(
  host: SemanticRuntimeProjectInputHost,
  boundary: AuthoredSourceBoundary,
  hintedRoots: readonly string[],
): {
  readonly workspaceScanOrigins: readonly ProjectRootMarkerAdmissionOrigin[];
  readonly hintedScanOrigins: readonly ProjectRootMarkerAdmissionOrigin[];
} {
  const workspaceScanOrigins: ProjectRootMarkerAdmissionOrigin[] = [];
  const hintedScanOrigins: ProjectRootMarkerAdmissionOrigin[] = [];
  const minimumVisitedDepth = new Map<string, number>();

  function visit(directory: string, depth: number, projectRootHintDir: string | null): void {
    if (
      depth > MAX_PROJECT_DISCOVERY_DEPTH
      || !boundary.contains(directory)
      || !host.directoryExists(directory)
    ) {
      return;
    }
    const directoryIdentity = canonicalTypeSystemPath(directory);
    const previousDepth = minimumVisitedDepth.get(directoryIdentity);
    if (previousDepth != null && previousDepth <= depth) {
      return;
    }
    minimumVisitedDepth.set(directoryIdentity, depth);
    const markerOrigins = projectRootMarkerOrigins(host, directory, projectRootHintDir);
    (projectRootHintDir == null ? workspaceScanOrigins : hintedScanOrigins).push(...markerOrigins);

    for (const entry of safeReadDirectory(host, directory)) {
      if (
        entry.startsWith('.') ||
        DISCOVERY_EXCLUDED_DIRECTORIES.has(entry)
      ) {
        continue;
      }
      const child = path.join(directory, entry);
      if (safeIsDirectory(host, child)) {
        visit(child, depth + 1, projectRootHintDir);
      }
    }
  }

  visit(boundary.rootDir, 0, null);
  for (const hintedRoot of hintedRoots) {
    visit(hintedRoot, 0, hintedRoot);
  }
  return { workspaceScanOrigins, hintedScanOrigins };
}

function projectRootMarkerOrigins(
  host: SemanticRuntimeProjectInputHost,
  directory: string,
  projectRootHintDir: string | null,
): readonly ProjectRootMarkerAdmissionOrigin[] {
  return PROJECT_ROOT_MARKERS.flatMap(([fileName, kind]) => {
    const markerPath = path.join(directory, fileName);
    return host.fileExists(markerPath) && !host.directoryExists(markerPath)
      ? [{
          kind,
          sourceFilePath: path.normalize(markerPath),
          viaProjectRootHintDir: projectRootHintDir,
        }]
      : [];
  });
}

function discoveredProjectRootsForMarkerOrigins(
  origins: readonly ProjectRootMarkerAdmissionOrigin[],
): readonly DiscoveredProjectRoot[] {
  return origins.map((origin) => ({
    rootDir: path.dirname(origin.sourceFilePath),
    admissionOrigins: [origin],
  }));
}

function mergeDiscoveredProjectRoots(
  roots: readonly DiscoveredProjectRoot[],
): readonly DiscoveredProjectRoot[] {
  const rootsByIdentity = new Map<string, { rootDir: string; origins: ProjectRootAdmissionOrigin[] }>();
  for (const root of roots) {
    const absoluteRoot = path.normalize(path.resolve(root.rootDir));
    const identity = canonicalTypeSystemPath(absoluteRoot);
    const existing = rootsByIdentity.get(identity);
    if (existing == null) {
      rootsByIdentity.set(identity, { rootDir: absoluteRoot, origins: [...root.admissionOrigins] });
      continue;
    }
    if (absoluteRoot.localeCompare(existing.rootDir) < 0) {
      existing.rootDir = absoluteRoot;
    }
    existing.origins.push(...root.admissionOrigins);
  }
  return [...rootsByIdentity.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, root]) => ({
      rootDir: root.rootDir,
      admissionOrigins: deterministicProjectRootAdmissionOrigins(root.origins),
    }));
}

function projectKeyForRoot(host: SemanticRuntimeProjectInputHost, workspaceRoot: string, projectRoot: string): string {
  return sanitizeProjectKey(readPackageName(host, projectRoot) ?? relativeProjectPath(workspaceRoot, projectRoot));
}

function relativeProjectPath(workspaceRoot: string, projectRoot: string): string {
  const relative = path.relative(workspaceRoot, projectRoot).replace(/\\/g, '/');
  return relative.length === 0 ? path.basename(projectRoot) : relative;
}

function sanitizeProjectKey(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9_.:@/-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized.length === 0 ? 'project' : sanitized;
}
