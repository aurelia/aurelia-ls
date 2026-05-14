import type { ProjectBootFrame } from '../boot/frames.js';
import { normalizeHostPath } from '../kernel/source-address.js';
import type { TypeSystemProject } from './project.js';

/** Build a project-source lookup for TypeScript Program source files in the current checker epoch. */
export function typeSystemSourcePathIndex(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): ReadonlyMap<string, string> {
  const paths = new Map<string, string>();
  for (const source of project.sourceFiles) {
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
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
