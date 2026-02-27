import { defaultPathCaseSensitivity, normalizePathForId, type NormalizedPath } from "@aurelia-ls/compiler/model/identity.js";
export class PathUtils {
  constructor(private readonly caseSensitive: boolean) {}

  normalize(file: string): NormalizedPath {
    return normalizePathForId(file, this.caseSensitive);
  }

  canonical(file: string): NormalizedPath {
    return this.normalize(file);
  }

  isCaseSensitive(): boolean {
    return this.caseSensitive;
  }
}

export function createPathUtils(caseSensitive = defaultPathCaseSensitivity()): PathUtils {
  return new PathUtils(caseSensitive);
}
