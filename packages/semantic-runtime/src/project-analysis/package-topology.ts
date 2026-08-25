import path from 'node:path';

import ts from 'typescript';

import { projectModuleHostPathKey } from './package-identity.js';

export interface ProjectPackageLocatorFileSystem {
  fileExists(fileName: string): boolean;
}

/** Receipt-local resolver for ordinary `node_modules` package locators. */
export class ProjectPackageLocator {
  private readonly packageRootByBareSpecifier = new Map<string, string | null>();

  constructor(private readonly fileSystem: ProjectPackageLocatorFileSystem) {}

  findBarePackageRoot(fromAbsolute: string, moduleSpecifier: string): string | null {
    const packageName = packageNameForBareModuleSpecifier(moduleSpecifier);
    if (packageName == null) {
      return null;
    }
    return this.findExternalPackageRoot(path.dirname(fromAbsolute), packageName);
  }

  private findExternalPackageRoot(fromDirectory: string, packageName: string): string | null {
    let current = path.resolve(fromDirectory);
    const visitedKeys: string[] = [];
    while (true) {
      const cacheKey = `${projectModuleHostPathKey(current)}::${packageName}`;
      const cached = this.packageRootByBareSpecifier.get(cacheKey);
      if (cached !== undefined) {
        this.cachePackageRootSearchResults(visitedKeys, cached);
        return cached;
      }
      visitedKeys.push(cacheKey);
      const packageRoot = path.join(current, 'node_modules', packageName);
      if (this.fileSystem.fileExists(path.join(packageRoot, 'package.json'))) {
        this.cachePackageRootSearchResults(visitedKeys, packageRoot);
        return packageRoot;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        this.cachePackageRootSearchResults(visitedKeys, null);
        return null;
      }
      current = parent;
    }
  }

  private cachePackageRootSearchResults(keys: readonly string[], packageRoot: string | null): void {
    for (const key of keys) {
      this.packageRootByBareSpecifier.set(key, packageRoot);
    }
  }
}

export function packageNameForBareModuleSpecifier(moduleSpecifier: string): string | null {
  if (moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('/') || moduleSpecifier.length === 0) {
    return null;
  }
  const segments = moduleSpecifier.split('/');
  const first = segments[0];
  if (first == null || first.length === 0 || first.startsWith('#')) {
    return null;
  }
  if (first.startsWith('@')) {
    const second = segments[1];
    return second == null || second.length === 0 ? null : `${first}/${second}`;
  }
  return first;
}

export function externalPackageRootForPath(fileName: string): string | null {
  const normalized = path.resolve(fileName).replace(/\\/g, '/');
  const segments = normalized.split('/');
  const nodeModulesIndex = segments
    .map((segment) => ts.sys.useCaseSensitiveFileNames ? segment : segment.toLowerCase())
    .lastIndexOf('node_modules');
  if (nodeModulesIndex === -1 || nodeModulesIndex + 1 >= segments.length) {
    return null;
  }
  const packageNameIndex = nodeModulesIndex + 1;
  const packageName = segments[packageNameIndex];
  if (packageName == null) {
    return null;
  }
  const endIndex = packageName.startsWith('@') ? packageNameIndex + 2 : packageNameIndex + 1;
  return endIndex <= segments.length ? segments.slice(0, endIndex).join('/') : null;
}
