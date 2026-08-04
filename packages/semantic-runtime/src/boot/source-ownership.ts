import path from 'node:path';

import type { SemanticSourceReference } from '../api/source-reference.js';
import { SourceFileRole, type SourceFileAddress } from '../kernel/address.js';
import { canonicalTypeSystemPath } from '../type-system/source-file-path.js';
import type { ProjectBootFrame, SourceFileAdmission } from './frames.js';

/** Boot-owned exact source index shared by runtime ownership, edit planning, and checker projection. */
export class ProjectSourceOwnershipIndex {
  private readonly admissionsByCanonicalHostPath: ReadonlyMap<string, SourceFileAdmission>;

  constructor(
    rootDir: string,
    sourceFiles: readonly SourceFileAdmission[],
  ) {
    const admissions = new Map<string, SourceFileAdmission>();
    for (const admission of sourceFiles) {
      const hostPath = projectSourceAdmissionHostPath({ rootDir }, admission);
      const key = canonicalTypeSystemPath(hostPath);
      const existing = admissions.get(key);
      if (existing != null && existing.addressHandle !== admission.addressHandle) {
        throw new Error(
          `Project source admissions '${existing.path}' and '${admission.path}' resolve to the same host source '${hostPath}'.`,
        );
      }
      admissions.set(key, admission);
    }
    this.admissionsByCanonicalHostPath = admissions;
  }

  admissionForHostPath(fileName: string): SourceFileAdmission | null {
    if (!path.isAbsolute(fileName)) {
      throw new Error(`Project source ownership lookup requires an absolute host path; received '${fileName}'.`);
    }
    return this.admissionForCanonicalHostPath(canonicalTypeSystemPath(path.resolve(fileName)));
  }

  admissionForCanonicalHostPath(canonicalFileName: string): SourceFileAdmission | null {
    return this.admissionsByCanonicalHostPath.get(canonicalFileName) ?? null;
  }

  readAdmissionsByCanonicalHostPath(): ReadonlyMap<string, SourceFileAdmission> {
    return this.admissionsByCanonicalHostPath;
  }
}

/** Resolve a boot admission's project-relative path into exact host identity. */
export function projectSourceAdmissionHostPath(
  project: Pick<ProjectBootFrame, 'rootDir'>,
  admission: Pick<SourceFileAdmission, 'path'>,
): string {
  return path.resolve(project.rootDir, admission.path);
}

/** Select exact authored ownership from boot admissions; suffix/path-containment guesses are intentionally excluded. */
export function projectSourceAdmissionForHostPath(
  project: Pick<ProjectBootFrame, 'sourceOwnership'>,
  fileName: string,
): SourceFileAdmission | null {
  return project.sourceOwnership.admissionForHostPath(fileName);
}

/** Resolve one stored source address. Its relative path is workspace-relative, not project-relative. */
export function sourceFileAddressHostPath(
  workspaceRootDir: string,
  address: Pick<SourceFileAddress, 'path'>,
): string {
  return path.isAbsolute(address.path)
    ? path.resolve(address.path)
    : path.resolve(workspaceRootDir, address.path);
}

/** Resolve a public source carrier using the same workspace-relative rule as its stored source-file address. */
export function semanticSourceReferenceHostPath(
  workspaceRootDir: string,
  source: SemanticSourceReference | null,
): string | null {
  if (source == null) {
    return null;
  }
  if (source.path != null && source.path.length > 0) {
    return path.isAbsolute(source.path)
      ? path.resolve(source.path)
      : path.resolve(workspaceRootDir, source.path);
  }
  return semanticSourceReferenceHostPath(workspaceRootDir, source.anchor ?? null);
}

/** Test whether a public source carrier resolves to one exact boot-owned source admission. */
export function projectOwnsSourceReference(
  project: Pick<ProjectBootFrame, 'workspaceRootDir' | 'sourceOwnership'>,
  source: SemanticSourceReference | null,
): boolean {
  const fileName = semanticSourceReferenceHostPath(project.workspaceRootDir, source);
  return fileName != null && projectSourceAdmissionForHostPath(project, fileName) != null;
}

/**
 * Exact boot authority for edits whose replacement range is an authored template or inline-template carrier.
 * Runtime app-query cursors are canonicalized to project-relative paths; public callers may still supply an absolute
 * host path. Keep that path domain explicit before consulting the host-identity admission index.
 */
export function projectOwnsTemplateEditSourceFile(
  project: Pick<ProjectBootFrame, 'rootDir' | 'sourceOwnership'>,
  fileName: string,
): boolean {
  const hostPath = path.isAbsolute(fileName)
    ? path.resolve(fileName)
    : path.resolve(project.rootDir, fileName);
  const admission = projectSourceAdmissionForHostPath(project, hostPath);
  return admission?.role === SourceFileRole.Template || admission?.role === SourceFileRole.AppSource;
}
