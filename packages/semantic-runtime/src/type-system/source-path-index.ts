import path from 'node:path';

import type { ProjectBootFrame, SourceFileAdmission } from '../boot/frames.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import { normalizeHostPath } from '../kernel/source-address.js';
import type { TypeSystemProject } from './project.js';
import { canonicalTypeSystemPath } from './source-file-path.js';
import { canonicalTypeSystemRelativePath } from './source-file-path.js';

/** Index exact boot admissions by their canonical project-relative host identity. */
export function typeSystemBootSourceAdmissionIndex(
  project: ProjectBootFrame,
): ReadonlyMap<string, SourceFileAdmission> {
  return project.sourceOwnership.readAdmissionsByCanonicalHostPath();
}

/**
 * Index every evaluator-known admission for checker identity and role projection.
 *
 * Boot admissions remain the authored ownership authority. This broader index exists only so a physical dependency
 * already admitted by the evaluator reuses that project-qualified address when the checker later projects it.
 */
export function typeSystemEvaluationSourceAdmissionIndex(
  project: ProjectBootFrame,
  evaluation: StaticProjectEvaluationResult,
): ReadonlyMap<string, SourceFileAdmission> {
  const admissions = new Map(typeSystemBootSourceAdmissionIndex(project));
  for (const source of evaluation.sources) {
    indexTypeSystemSourceAdmission(admissions, project, source.admission);
    if (source.sourceFile != null) {
      admissions.set(canonicalTypeSystemPath(source.sourceFile.fileName), source.admission);
    }
  }
  return admissions;
}

function indexTypeSystemSourceAdmission(
  admissions: Map<string, SourceFileAdmission>,
  project: ProjectBootFrame,
  source: SourceFileAdmission,
): void {
  admissions.set(canonicalTypeSystemPath(path.resolve(project.rootDir, source.path)), source);
}

/** Build a project-source lookup for TypeScript Program source files in the current checker epoch. */
export function typeSystemSourcePathIndex(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): ReadonlyMap<string, string> {
  const paths = new Map<string, string>();
  for (const source of project.sourceFiles) {
    const sourceFile = typeSystem.readProgramSourceFileByProjectPath(source.path);
    if (sourceFile != null) {
      paths.set(normalizeTypeSystemSourceFileName(sourceFile.fileName), source.path);
    }
  }
  return paths;
}

/** Normalize a TypeScript source-file name for checker-epoch path maps. */
export function normalizeTypeSystemSourceFileName(fileName: string): string {
  const normalized = normalizeHostPath(fileName);
  return path.isAbsolute(normalized)
    ? canonicalTypeSystemPath(normalized)
    : canonicalTypeSystemRelativePath(normalized);
}
