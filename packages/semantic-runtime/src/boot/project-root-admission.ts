import { canonicalTypeSystemPath } from '../type-system/source-file-path.js';

/** Exact reason a project root was admitted into one booted semantic workspace. */
export const enum ProjectRootAdmissionOriginKind {
  /** The caller supplied this project in the explicit projects array. */
  ExplicitProject = 'explicit-project',
  /** The caller selected the one-frame single-root discovery strategy. */
  SingleRoot = 'single-root',
  /** Automatic discovery found no ordinary marker roots and retained the workspace root. */
  WorkspaceRootFallback = 'workspace-root-fallback',
  /** The host supplied this exact existing directory as a known project boundary. */
  HostProjectRootHint = 'host-project-root-hint',
  /** An exact-root package.json file marked this project boundary. */
  PackageJsonMarker = 'package-json-marker',
  /** An exact-root tsconfig.json file marked this project boundary. */
  TsconfigJsonMarker = 'tsconfig-json-marker',
  /** An exact-root jsconfig.json file marked this project boundary. */
  JsconfigJsonMarker = 'jsconfig-json-marker',
  /** An exact-root aurelia.project.json file marked this project boundary. */
  AureliaProjectJsonMarker = 'aurelia-project-json-marker',
}

export interface ProjectRootPolicyAdmissionOrigin {
  readonly kind:
    | ProjectRootAdmissionOriginKind.ExplicitProject
    | ProjectRootAdmissionOriginKind.SingleRoot
    | ProjectRootAdmissionOriginKind.WorkspaceRootFallback
    | ProjectRootAdmissionOriginKind.HostProjectRootHint;
}

export interface ProjectRootMarkerAdmissionOrigin {
  readonly kind:
    | ProjectRootAdmissionOriginKind.PackageJsonMarker
    | ProjectRootAdmissionOriginKind.TsconfigJsonMarker
    | ProjectRootAdmissionOriginKind.JsconfigJsonMarker
    | ProjectRootAdmissionOriginKind.AureliaProjectJsonMarker;
  /** Absolute exact-root marker file that supplied this admission witness. */
  readonly sourceFilePath: string;
  /** Host hint that restarted traversal, or null when ordinary workspace traversal found the marker. */
  readonly viaProjectRootHintDir: string | null;
}

/** Complete typed cause set for why one project frame exists. */
export type ProjectRootAdmissionOrigin =
  | ProjectRootPolicyAdmissionOrigin
  | ProjectRootMarkerAdmissionOrigin;

const PROJECT_ROOT_ADMISSION_ORIGIN_ORDER: Readonly<Record<ProjectRootAdmissionOriginKind, number>> = {
  [ProjectRootAdmissionOriginKind.ExplicitProject]: 0,
  [ProjectRootAdmissionOriginKind.SingleRoot]: 1,
  [ProjectRootAdmissionOriginKind.WorkspaceRootFallback]: 2,
  [ProjectRootAdmissionOriginKind.HostProjectRootHint]: 3,
  [ProjectRootAdmissionOriginKind.PackageJsonMarker]: 4,
  [ProjectRootAdmissionOriginKind.TsconfigJsonMarker]: 5,
  [ProjectRootAdmissionOriginKind.JsconfigJsonMarker]: 6,
  [ProjectRootAdmissionOriginKind.AureliaProjectJsonMarker]: 7,
};

export function deterministicProjectRootAdmissionOrigins(
  origins: readonly ProjectRootAdmissionOrigin[],
): readonly ProjectRootAdmissionOrigin[] {
  const byKey = new Map<string, ProjectRootAdmissionOrigin>();
  for (const origin of origins) {
    const key = projectRootAdmissionOriginIdentityKey(origin);
    const existing = byKey.get(key);
    if (existing == null) {
      byKey.set(key, origin);
    } else if (isProjectRootMarkerAdmissionOrigin(existing) && isProjectRootMarkerAdmissionOrigin(origin)) {
      byKey.set(key, preferredProjectRootMarkerOrigin(existing, origin));
    }
  }
  return [...byKey.values()].sort(compareProjectRootAdmissionOrigins);
}

function projectRootAdmissionOriginIdentityKey(origin: ProjectRootAdmissionOrigin): string {
  return isProjectRootMarkerAdmissionOrigin(origin)
    ? [origin.kind, canonicalTypeSystemPath(origin.sourceFilePath)].join('|')
    : origin.kind;
}

export function projectRootAdmissionOriginKey(origin: ProjectRootAdmissionOrigin): string {
  return isProjectRootMarkerAdmissionOrigin(origin)
    ? [
        origin.kind,
        canonicalTypeSystemPath(origin.sourceFilePath),
        origin.viaProjectRootHintDir == null
          ? ''
          : canonicalTypeSystemPath(origin.viaProjectRootHintDir),
      ].join('|')
    : origin.kind;
}

export function isProjectRootMarkerAdmissionOrigin(
  origin: ProjectRootAdmissionOrigin,
): origin is ProjectRootMarkerAdmissionOrigin {
  switch (origin.kind) {
    case ProjectRootAdmissionOriginKind.PackageJsonMarker:
    case ProjectRootAdmissionOriginKind.TsconfigJsonMarker:
    case ProjectRootAdmissionOriginKind.JsconfigJsonMarker:
    case ProjectRootAdmissionOriginKind.AureliaProjectJsonMarker:
      return true;
    case ProjectRootAdmissionOriginKind.ExplicitProject:
    case ProjectRootAdmissionOriginKind.SingleRoot:
    case ProjectRootAdmissionOriginKind.WorkspaceRootFallback:
    case ProjectRootAdmissionOriginKind.HostProjectRootHint:
      return false;
  }
}

function compareProjectRootAdmissionOrigins(
  left: ProjectRootAdmissionOrigin,
  right: ProjectRootAdmissionOrigin,
): number {
  return PROJECT_ROOT_ADMISSION_ORIGIN_ORDER[left.kind]
    - PROJECT_ROOT_ADMISSION_ORIGIN_ORDER[right.kind]
    || projectRootAdmissionOriginKey(left).localeCompare(projectRootAdmissionOriginKey(right));
}

function preferredProjectRootMarkerOrigin(
  left: ProjectRootMarkerAdmissionOrigin,
  right: ProjectRootMarkerAdmissionOrigin,
): ProjectRootMarkerAdmissionOrigin {
  if (left.viaProjectRootHintDir == null) return left;
  if (right.viaProjectRootHintDir == null) return right;
  const leftHint = canonicalTypeSystemPath(left.viaProjectRootHintDir);
  const rightHint = canonicalTypeSystemPath(right.viaProjectRootHintDir);
  return rightHint.length > leftHint.length
    || (rightHint.length === leftHint.length && rightHint.localeCompare(leftHint) < 0)
    ? right
    : left;
}
