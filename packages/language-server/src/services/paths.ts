import ts from "typescript";
import { normalizePathForId, type NormalizedPath } from "@aurelia-ls/compiler";

export class PathUtils {
  constructor(private readonly caseSensitive: boolean) {}

  normalize(file: string): NormalizedPath {
    return normalizePathForId(file);
  }

  canonical(file: string): NormalizedPath {
    const normalized = this.normalize(file);
    return this.caseSensitive ? normalized : normalizePathForId(normalized.toLowerCase());
  }

  isCaseSensitive(): boolean {
    return this.caseSensitive;
  }
}

export function createPathUtils(): PathUtils {
  return new PathUtils(ts.sys.useCaseSensitiveFileNames ?? false);
}
