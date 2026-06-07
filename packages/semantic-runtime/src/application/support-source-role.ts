import type { ApplicationFileRole } from './topology.js';
import type { ProjectBootFrame } from '../boot/frames.js';
import type { DiResolveCallSite } from '../di/resolve-call-recognition.js';

export type ApplicationSupportSourceRole =
  Extract<ApplicationFileRole, 'service-source' | 'state-source' | 'model-source'>;

/** Class-bearing support source role inferred from project-relative path conventions. */
export function supportSourceRoleForPath(path: string): ApplicationSupportSourceRole | null {
  const segments = path.split(/[\\/]/).map((segment) => segment.toLowerCase());
  if (segments.includes('services')) {
    return 'service-source';
  }
  if (segments.includes('state')) {
    return 'state-source';
  }
  if (segments.includes('models')) {
    return 'model-source';
  }
  return null;
}

/** Project-local support-role index for class-bearing services, state objects, and models. */
export class ApplicationSupportSourceRoleIndex {
  constructor(
    private readonly roleByPath: ReadonlyMap<string, ApplicationSupportSourceRole>,
    private readonly roleByDeclaration: ReadonlyMap<string, ApplicationSupportSourceRole>,
  ) {}

  /** Best support role for a source path before a specific class declaration is known. */
  roleForPath(path: string): ApplicationSupportSourceRole | null {
    return this.roleByPath.get(path) ?? supportSourceRoleForPath(path);
  }

  /** Best support role for a source-backed class declaration. */
  roleForDeclaration(path: string, className: string): ApplicationSupportSourceRole | null {
    return this.roleByDeclaration.get(supportSourceDeclarationKey(path, className))
      ?? this.roleForPath(path);
  }
}

/** Build the support-role view used by application topology from path and DI evidence. */
export function applicationSupportSourceRoleIndex(
  project: ProjectBootFrame,
  resolveSites: readonly DiResolveCallSite[],
): ApplicationSupportSourceRoleIndex {
  const roleByPath = new Map<string, ApplicationSupportSourceRole>();
  const roleByDeclaration = new Map<string, ApplicationSupportSourceRole>();
  for (const source of project.sourceFiles) {
    const role = supportSourceRoleForPath(source.path);
    if (role != null) {
      roleByPath.set(source.path, role);
    }
  }
  for (const site of resolveSites) {
    if (site.keyDeclarationSourcePath == null || site.keyDeclarationName == null) {
      continue;
    }
    const role = supportSourceRoleForPath(site.keyDeclarationSourcePath)
      ?? supportSourceRoleForInjectedMemberName(site.enclosingMemberName);
    if (role == null) {
      continue;
    }
    roleByDeclaration.set(
      supportSourceDeclarationKey(site.keyDeclarationSourcePath, site.keyDeclarationName),
      role,
    );
  }
  return new ApplicationSupportSourceRoleIndex(roleByPath, roleByDeclaration);
}

function supportSourceRoleForInjectedMemberName(
  memberName: string | null,
): ApplicationSupportSourceRole | null {
  if (memberName == null) {
    return null;
  }
  const normalized = memberName.toLowerCase();
  if (normalized === 'state' || normalized.endsWith('state') || normalized.endsWith('store')) {
    return 'state-source';
  }
  if (normalized === 'service' || normalized.endsWith('service')) {
    return 'service-source';
  }
  if (normalized === 'model' || normalized.endsWith('model')) {
    return 'model-source';
  }
  return null;
}

function supportSourceDeclarationKey(path: string, className: string): string {
  return `${path}\0${className}`;
}
