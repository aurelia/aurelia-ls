import path from 'node:path';
import ts from 'typescript';

export function normalizeTypeSystemPath(fileName: string): string {
  return path.normalize(fileName).replace(/\\/g, '/');
}

export function canonicalTypeSystemPath(fileName: string): string {
  const normalized = normalizeTypeSystemPath(path.resolve(fileName));
  return ts.sys.useCaseSensitiveFileNames ? normalized : normalized.toLowerCase();
}

/** Canonicalize a deliberately relative source alias without resolving it against process cwd. */
export function canonicalTypeSystemRelativePath(fileName: string): string {
  if (path.isAbsolute(fileName)) {
    throw new Error(`Relative TypeScript source identity cannot canonicalize absolute path '${fileName}'.`);
  }
  const normalized = normalizeTypeSystemPath(fileName).replace(/^\.\//u, '');
  return ts.sys.useCaseSensitiveFileNames ? normalized : normalized.toLowerCase();
}

/** Canonicalize a source path while preserving whether its declared domain is absolute or relative. */
export function canonicalTypeSystemSourcePath(fileName: string): string {
  return path.isAbsolute(fileName)
    ? canonicalTypeSystemPath(fileName)
    : canonicalTypeSystemRelativePath(fileName);
}

/** Compare source paths only inside the same explicit absolute or relative path domain. */
export function sameTypeSystemSourcePath(left: string, right: string): boolean {
  const leftAbsolute = path.isAbsolute(left);
  if (leftAbsolute !== path.isAbsolute(right)) {
    return false;
  }
  return leftAbsolute
    ? canonicalTypeSystemPath(left) === canonicalTypeSystemPath(right)
    : canonicalTypeSystemRelativePath(left) === canonicalTypeSystemRelativePath(right);
}

export function isTypeSystemPathAtOrUnder(
  candidatePath: string,
  parentPath: string,
): boolean {
  return candidatePath === parentPath || candidatePath.startsWith(`${parentPath}/`);
}

export function isDefaultLibrarySourceFile(normalizedFileName: string): boolean {
  return /(^|\/)typescript\/lib\/lib\.[^/]+\.d\.ts$/u.test(normalizedFileName)
    || /(^|\/)node_modules\/typescript\/lib\/lib\.[^/]+\.d\.ts$/u.test(normalizedFileName);
}
