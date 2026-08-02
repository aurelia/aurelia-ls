import path from 'node:path';
import {
  canonicalTypeSystemPath,
  isTypeSystemPathAtOrUnder,
} from '../type-system/source-file-path.js';

/** Authored project membership, distinct from dependency files reached while analyzing that project. */
export class AuthoredSourceBoundary {
  readonly rootDir: string;
  readonly excludedRootDirs: readonly string[];
  private readonly canonicalRootDir: string;
  private readonly canonicalExcludedRootDirs: readonly string[];

  constructor(rootDir: string, excludedRootDirs: readonly string[] = []) {
    this.rootDir = path.resolve(rootDir);
    this.canonicalRootDir = canonicalTypeSystemPath(this.rootDir);

    const exclusions = excludedRootDirs
      .map((entry) => path.resolve(this.rootDir, entry))
      .map((absolute) => ({
        absolute,
        canonical: canonicalTypeSystemPath(absolute),
      }))
      .sort((left, right) =>
        left.canonical.length - right.canonical.length
        || left.canonical.localeCompare(right.canonical)
      );
    const accepted: typeof exclusions = [];
    for (const exclusion of exclusions) {
      if (
        exclusion.canonical === this.canonicalRootDir
        || !isTypeSystemPathAtOrUnder(exclusion.canonical, this.canonicalRootDir)
      ) {
        throw new Error(
          `Authored source exclusion '${exclusion.absolute}' must be a strict descendant of '${this.rootDir}'.`,
        );
      }
      if (accepted.some((owner) => isTypeSystemPathAtOrUnder(exclusion.canonical, owner.canonical))) {
        continue;
      }
      accepted.push(exclusion);
    }
    this.excludedRootDirs = accepted.map((entry) => entry.absolute);
    this.canonicalExcludedRootDirs = accepted.map((entry) => entry.canonical);
  }

  contains(fileName: string): boolean {
    const candidate = canonicalTypeSystemPath(path.resolve(this.rootDir, fileName));
    return isTypeSystemPathAtOrUnder(candidate, this.canonicalRootDir)
      && !this.canonicalExcludedRootDirs.some((excluded) =>
        isTypeSystemPathAtOrUnder(candidate, excluded)
      );
  }
}

/** Select exclusions that constrain one nested project from a wider workspace boundary. */
export function authoredSourceExclusionsWithin(
  projectRootDir: string,
  excludedRootDirs: readonly string[],
): readonly string[] {
  const projectRoot = canonicalTypeSystemPath(projectRootDir);
  return excludedRootDirs.filter((entry) => {
    const candidate = canonicalTypeSystemPath(entry);
    return candidate !== projectRoot && isTypeSystemPathAtOrUnder(candidate, projectRoot);
  });
}
