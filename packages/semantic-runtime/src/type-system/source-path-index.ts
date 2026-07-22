import path from 'node:path';

import type { ProjectBootFrame, SourceFileAdmission } from '../boot/frames.js';
import { normalizeHostPath } from '../kernel/source-address.js';
import type { TypeSystemProject } from './project.js';
import { canonicalTypeSystemPath } from './source-file-path.js';

/** Index boot admissions by every absolute path shape accepted by the project TypeScript epoch. */
export function typeSystemSourceAdmissionIndex(
  project: ProjectBootFrame,
): ReadonlyMap<string, SourceFileAdmission> {
  const admissions = new Map<string, SourceFileAdmission>();
  for (const source of project.sourceFiles) {
    admissions.set(canonicalTypeSystemPath(path.resolve(project.rootDir, source.path)), source);
    admissions.set(canonicalTypeSystemPath(path.resolve(project.workspaceRootDir, source.path)), source);
  }
  return admissions;
}

/** Build a project-source lookup for TypeScript Program source files in the current checker epoch. */
export function typeSystemSourcePathIndex(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): ReadonlyMap<string, string> {
  const paths = new Map<string, string>();
  for (const source of project.sourceFiles) {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile != null) {
      paths.set(normalizeTypeSystemSourceFileName(sourceFile.fileName), source.path);
    }
  }
  return paths;
}

/** Normalize a TypeScript source-file name for checker-epoch path maps. */
export function normalizeTypeSystemSourceFileName(fileName: string): string {
  return normalizeHostPath(fileName).toLowerCase();
}
