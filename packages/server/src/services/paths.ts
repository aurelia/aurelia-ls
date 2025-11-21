import ts from "typescript";

export class PathUtils {
  constructor(private readonly caseSensitive: boolean) {}

  normalize(file: string): string {
    return file.replace(/\\/g, "/");
  }

  canonical(file: string): string {
    const normalized = this.normalize(file);
    return this.caseSensitive ? normalized : normalized.toLowerCase();
  }

  isCaseSensitive(): boolean {
    return this.caseSensitive;
  }
}

export function createPathUtils(): PathUtils {
  return new PathUtils(ts.sys.useCaseSensitiveFileNames ?? false);
}
