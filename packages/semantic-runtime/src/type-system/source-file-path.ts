import path from 'node:path';
import ts from 'typescript';

export function normalizeTypeSystemPath(fileName: string): string {
  return path.normalize(fileName).replace(/\\/g, '/');
}

export function canonicalTypeSystemPath(fileName: string): string {
  const normalized = normalizeTypeSystemPath(path.resolve(fileName));
  return ts.sys.useCaseSensitiveFileNames ? normalized : normalized.toLowerCase();
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
