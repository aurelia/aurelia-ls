import path from 'node:path';

import type { SemanticSourceReference } from '../api/source-reference.js';
import { SourceFileRole, type SourceFileAddress } from '../kernel/address.js';
import type { SemanticRuntimeProjectInputHost } from '../kernel/project-input.js';
import {
  canonicalTypeSystemPath,
  canonicalTypeSystemRelativePath,
} from '../type-system/source-file-path.js';
import type { ProjectBootFrame, SourceFileAdmission } from './frames.js';
import { workspaceSourcePathForHostPath } from './source-path.js';

export { workspaceSourcePathForHostPath } from './source-path.js';

export const PROJECT_SOURCE_PATH_BASES = [
  'absolute-host',
  'workspace-relative',
  'project-relative',
] as const;

export type ProjectSourcePathBase = typeof PROJECT_SOURCE_PATH_BASES[number];

/** One boot admission joined to every exact path domain used by public, kernel, and TypeScript consumers. */
export class ProjectSourceIdentity {
  constructor(
    readonly projectKey: string,
    readonly admission: SourceFileAdmission,
    readonly hostPath: string,
    readonly canonicalHostPath: string,
    readonly workspacePath: string,
    readonly projectPath: string,
  ) {}
}

export type ProjectSourcePathResolution =
  | {
      readonly kind: 'resolved';
      readonly source: ProjectSourceIdentity;
      readonly bases: readonly ProjectSourcePathBase[];
    }
  | {
      readonly kind: 'ambiguous';
      readonly candidates: readonly ProjectSourceIdentity[];
    }
  | {
      readonly kind: 'absent';
    };

export type ProjectSourceDomainResolution =
  | Extract<ProjectSourcePathResolution, { readonly kind: 'resolved' }>
  | Extract<ProjectSourcePathResolution, { readonly kind: 'absent' }>;

/** Exact readable interpretation of an unadmitted source path in one declared input domain. */
export class ProjectReadableSourceIdentity {
  constructor(
    readonly hostPath: string,
    readonly workspacePath: string,
    readonly bases: readonly ProjectSourcePathBase[],
  ) {}
}

/** Boot-owned exact source index shared by runtime ownership, edit planning, and checker projection. */
export class ProjectSourceOwnershipIndex {
  private readonly admissionsByCanonicalHostPath: ReadonlyMap<string, SourceFileAdmission>;
  private readonly identitiesByCanonicalHostPath: ReadonlyMap<string, ProjectSourceIdentity>;
  private readonly identitiesByProjectPath: ReadonlyMap<string, ProjectSourceIdentity>;
  private readonly identitiesByWorkspacePath: ReadonlyMap<string, ProjectSourceIdentity>;

  constructor(
    workspaceRootDir: string,
    rootDir: string,
    sourceFiles: readonly SourceFileAdmission[],
  ) {
    const admissions = new Map<string, SourceFileAdmission>();
    const identities = new Map<string, ProjectSourceIdentity>();
    const byProjectPath = new Map<string, ProjectSourceIdentity>();
    const byWorkspacePath = new Map<string, ProjectSourceIdentity>();
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
      const identity = new ProjectSourceIdentity(
        admission.projectKey,
        admission,
        hostPath,
        key,
        workspaceSourcePathForHostPath(workspaceRootDir, hostPath),
        normalizedRelativeSourcePath(admission.path),
      );
      identities.set(key, identity);
      indexProjectSourceAlias(byProjectPath, identity.projectPath, identity, 'project-relative');
      if (!path.isAbsolute(identity.workspacePath)) {
        indexProjectSourceAlias(byWorkspacePath, identity.workspacePath, identity, 'workspace-relative');
      }
    }
    this.admissionsByCanonicalHostPath = admissions;
    this.identitiesByCanonicalHostPath = identities;
    this.identitiesByProjectPath = byProjectPath;
    this.identitiesByWorkspacePath = byWorkspacePath;
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

  /** Resolve a path whose relative domain is already known to be the public workspace-relative domain. */
  resolveWorkspacePath(fileName: string): ProjectSourceDomainResolution {
    if (path.isAbsolute(fileName)) {
      return this.resolveAbsolutePath(fileName);
    }
    const source = this.identitiesByWorkspacePath.get(canonicalRelativeSourcePath(fileName)) ?? null;
    return source == null
      ? { kind: 'absent' }
      : { kind: 'resolved', source, bases: ['workspace-relative'] };
  }

  /** Resolve a path whose relative domain is already known to be the TypeScript/project-relative domain. */
  resolveProjectPath(fileName: string): ProjectSourceDomainResolution {
    if (path.isAbsolute(fileName)) {
      return this.resolveAbsolutePath(fileName);
    }
    const source = this.identitiesByProjectPath.get(canonicalRelativeSourcePath(fileName)) ?? null;
    return source == null
      ? { kind: 'absent' }
      : { kind: 'resolved', source, bases: ['project-relative'] };
  }

  /** Resolve only exact absolute, project-relative, or workspace-relative aliases; never choose by suffix or order. */
  resolvePath(fileName: string): ProjectSourcePathResolution {
    if (path.isAbsolute(fileName)) {
      return this.resolveAbsolutePath(fileName);
    }
    const key = canonicalRelativeSourcePath(fileName);
    const matches = new Map<ProjectSourceIdentity, Set<ProjectSourcePathBase>>();
    for (const [base, source] of [
      ['workspace-relative', this.identitiesByWorkspacePath.get(key) ?? null],
      ['project-relative', this.identitiesByProjectPath.get(key) ?? null],
    ] as const) {
      if (source == null) continue;
      const bases = matches.get(source) ?? new Set<ProjectSourcePathBase>();
      bases.add(base);
      matches.set(source, bases);
    }
    if (matches.size === 0) {
      return { kind: 'absent' };
    }
    if (matches.size > 1) {
      return {
        kind: 'ambiguous',
        candidates: [...matches.keys()].sort((left, right) =>
          left.canonicalHostPath.localeCompare(right.canonicalHostPath)
        ),
      };
    }
    const [source, bases] = [...matches][0]!;
    return {
      kind: 'resolved',
      source,
      bases: [...bases].sort(),
    };
  }

  private resolveAbsolutePath(fileName: string): ProjectSourceDomainResolution {
    const source = this.identitiesByCanonicalHostPath.get(canonicalTypeSystemPath(fileName)) ?? null;
    return source == null
      ? { kind: 'absent' }
      : { kind: 'resolved', source, bases: ['absolute-host'] };
  }
}

/**
 * Enumerate exact readable host identities only after boot admission lookup is absent.
 * Relative input is interpreted in both documented domains; two distinct readable files remain ambiguous.
 */
export function readableUnownedProjectSourceIdentities(
  project: Pick<ProjectBootFrame, 'workspaceRootDir' | 'rootDir'>,
  fileName: string,
  inputHost: SemanticRuntimeProjectInputHost,
): readonly ProjectReadableSourceIdentity[] {
  const candidates = path.isAbsolute(fileName)
    ? [{ hostPath: path.resolve(fileName), base: 'absolute-host' as const }]
    : [
        { hostPath: path.resolve(project.workspaceRootDir, fileName), base: 'workspace-relative' as const },
        { hostPath: path.resolve(project.rootDir, fileName), base: 'project-relative' as const },
      ];
  const byCanonicalHost = new Map<string, { hostPath: string; bases: Set<ProjectSourcePathBase> }>();
  for (const candidate of candidates) {
    const canonicalHost = canonicalTypeSystemPath(candidate.hostPath);
    const existing = byCanonicalHost.get(canonicalHost) ?? {
      hostPath: candidate.hostPath,
      bases: new Set<ProjectSourcePathBase>(),
    };
    existing.bases.add(candidate.base);
    byCanonicalHost.set(canonicalHost, existing);
  }
  return [...byCanonicalHost.entries()]
    .filter(([, candidate]) => inputHost.readFile(candidate.hostPath) != null)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, candidate]) => new ProjectReadableSourceIdentity(
      candidate.hostPath,
      workspaceSourcePathForHostPath(project.workspaceRootDir, candidate.hostPath),
      [...candidate.bases].sort(),
    ));
}

function indexProjectSourceAlias(
  index: Map<string, ProjectSourceIdentity>,
  alias: string,
  source: ProjectSourceIdentity,
  domain: 'project-relative' | 'workspace-relative',
): void {
  const key = canonicalRelativeSourcePath(alias);
  const existing = index.get(key) ?? null;
  if (existing != null && existing.admission.addressHandle !== source.admission.addressHandle) {
    throw new Error(
      `Project sources '${existing.projectPath}' and '${source.projectPath}' share ${domain} alias '${alias}'.`,
    );
  }
  index.set(key, source);
}

function normalizedRelativeSourcePath(value: string): string {
  return path.normalize(value).replace(/\\/g, '/').replace(/^\.\//u, '');
}

function canonicalRelativeSourcePath(value: string): string {
  return canonicalTypeSystemRelativePath(normalizedRelativeSourcePath(value));
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
 * Runtime app-query cursors are canonicalized to workspace-relative paths; public callers may still supply an
 * absolute host path. Keep that path domain explicit before consulting the host-identity admission index.
 */
export function projectOwnsTemplateEditSourceFile(
  project: Pick<ProjectBootFrame, 'sourceOwnership'>,
  fileName: string,
): boolean {
  const resolution = project.sourceOwnership.resolveWorkspacePath(fileName);
  const admission = resolution.kind === 'resolved' ? resolution.source.admission : null;
  return admission?.role === SourceFileRole.Template || admission?.role === SourceFileRole.AppSource;
}
