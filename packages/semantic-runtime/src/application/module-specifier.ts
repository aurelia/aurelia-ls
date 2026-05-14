/** Build a relative module specifier from one project-relative authored source path to another. */
export function moduleSpecifier(
  fromPath: string,
  toPath: string,
  keepExtension: boolean,
): string {
  const fromDir = pathDirectory(fromPath);
  const toModule = keepExtension ? toPath : stripExtension(toPath);
  const fromParts = pathParts(fromDir);
  const toParts = pathParts(toModule);
  let index = 0;
  while (index < fromParts.length && index < toParts.length && fromParts[index] === toParts[index]) {
    index += 1;
  }
  const up = fromParts.slice(index).map(() => '..');
  const down = toParts.slice(index);
  const joined = [...up, ...down].join('/');
  if (joined === '') {
    return './';
  }
  return joined.startsWith('.') ? joined : `./${joined}`;
}

function pathDirectory(sourcePath: string): string {
  const normalized = normalizePath(sourcePath);
  const slash = normalized.lastIndexOf('/');
  return slash < 0 ? '' : normalized.slice(0, slash);
}

function stripExtension(sourcePath: string): string {
  const normalized = normalizePath(sourcePath);
  const slash = normalized.lastIndexOf('/');
  const dot = normalized.lastIndexOf('.');
  return dot > slash ? normalized.slice(0, dot) : normalized;
}

function pathParts(sourcePath: string): readonly string[] {
  const normalized = normalizePath(sourcePath);
  return normalized === '' ? [] : normalized.split('/').filter((part) => part.length > 0);
}

function normalizePath(sourcePath: string): string {
  return sourcePath.replace(/\\/g, '/').replace(/^\.\/+/, '');
}
