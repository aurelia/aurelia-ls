import path from 'node:path';

/** Public source-address spelling for one exact host path: workspace-relative inside, absolute outside. */
export function workspaceSourcePathForHostPath(
  workspaceRootDir: string,
  hostPath: string,
): string {
  const absolute = path.resolve(hostPath);
  const relative = path.relative(workspaceRootDir, absolute);
  return relative === ''
    ? ''
    : relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
      ? absolute.replace(/\\/g, '/')
      : path.normalize(relative).replace(/\\/g, '/').replace(/^\.\//u, '');
}
