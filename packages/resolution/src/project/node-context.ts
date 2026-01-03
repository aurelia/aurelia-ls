/**
 * Node.js File System Context Implementation
 *
 * Production implementation using Node.js fs module.
 * Used by CLI tools, Vite plugin, and tests running in Node.
 */

import * as fs from "node:fs";
import * as nodePath from "node:path";
import { normalizePathForId, type NormalizedPath } from "@aurelia-ls/compiler";
import type {
  FileSystemContext,
  FileSystemContextOptions,
  GlobOptions,
  FileStat,
  WatchCallback,
  Disposable,
} from "./context.js";
import { getBaseName, getExtension, getDirectory } from "./context.js";
import type { SiblingFile } from "./types.js";

/**
 * Create a Node.js file system context.
 *
 * @example
 * ```typescript
 * const fileSystem = createNodeFileSystem();
 *
 * // Check for sibling template
 * const siblings = fileSystem.getSiblingFiles('/src/foo.ts', ['.html']);
 * // → [{ path: '/src/foo.html', extension: '.html', baseName: 'foo' }]
 * ```
 */
export function createNodeFileSystem(options?: FileSystemContextOptions): FileSystemContext {
  const root = options?.root ?? process.cwd();
  const platform = options?.platform ?? (process.platform === "win32" ? "win32" : "posix");
  const caseSensitive = options?.caseSensitive ?? (platform !== "win32");

  const normalizePath = options?.normalizePath ?? ((p: string) => normalizePathForId(p));

  return {
    platform,
    caseSensitive,

    fileExists(path: string): boolean {
      try {
        const stats = fs.statSync(path);
        return stats.isFile();
      } catch {
        return false;
      }
    },

    readFile(path: string): string | undefined {
      try {
        return fs.readFileSync(path, "utf-8");
      } catch {
        return undefined;
      }
    },

    readDirectory(path: string): string[] {
      try {
        return fs.readdirSync(path);
      } catch {
        return [];
      }
    },

    isDirectory(path: string): boolean {
      try {
        const stats = fs.statSync(path);
        return stats.isDirectory();
      } catch {
        return false;
      }
    },

    getSiblingFiles(sourcePath: string, extensions: readonly string[]): SiblingFile[] {
      const dir = getDirectory(sourcePath);
      const baseName = getBaseName(sourcePath);
      const siblings: SiblingFile[] = [];

      for (const ext of extensions) {
        const siblingPath = nodePath.join(dir, baseName + ext);
        try {
          const stats = fs.statSync(siblingPath);
          if (stats.isFile()) {
            siblings.push({
              path: normalizePath(siblingPath),
              extension: ext,
              baseName,
            });
          }
        } catch {
          // File doesn't exist, skip
        }
      }

      return siblings;
    },

    resolvePath(from: string, relativePath: string): string {
      const dir = getDirectory(from);
      return nodePath.resolve(dir, relativePath);
    },

    normalizePath(path: string): NormalizedPath {
      return normalizePath(path);
    },

    glob(pattern: string, options?: GlobOptions): string[] {
      // Use a simple recursive implementation
      // For production, consider using fast-glob or similar
      const cwd = options?.cwd ?? root;
      const ignore = new Set(options?.ignore ?? []);
      const maxDepth = options?.maxDepth ?? Infinity;
      const absolute = options?.absolute ?? true;

      const results: string[] = [];

      function walk(dir: string, depth: number): void {
        if (depth > maxDepth) return;

        let entries: string[];
        try {
          entries = fs.readdirSync(dir);
        } catch {
          return;
        }

        for (const entry of entries) {
          const fullPath = nodePath.join(dir, entry);
          const relativePath = nodePath.relative(cwd, fullPath);

          // Check ignore patterns
          if (shouldIgnore(relativePath, ignore)) continue;

          try {
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
              if (options?.includeDirectories && matchesPattern(relativePath, pattern)) {
                results.push(absolute ? fullPath : relativePath);
              }
              walk(fullPath, depth + 1);
            } else if (stats.isFile()) {
              if (matchesPattern(relativePath, pattern)) {
                results.push(absolute ? fullPath : relativePath);
              }
            }
          } catch {
            // Skip inaccessible entries
          }
        }
      }

      walk(cwd, 0);
      return results;
    },

    watch(path: string, callback: WatchCallback): Disposable {
      const watcher = fs.watch(path, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        const fullPath = nodePath.join(path, filename);
        const type = eventType === "rename"
          ? (fs.existsSync(fullPath) ? "create" : "delete")
          : "change";

        callback({ type, path: fullPath });
      });

      return {
        dispose() {
          watcher.close();
        },
      };
    },

    stat(path: string): FileStat | undefined {
      try {
        const stats = fs.statSync(path);
        return {
          size: stats.size,
          mtime: stats.mtimeMs,
          ctime: stats.ctimeMs,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          isSymbolicLink: stats.isSymbolicLink(),
        };
      } catch {
        return undefined;
      }
    },
  };
}

/**
 * Check if a path should be ignored.
 */
function shouldIgnore(path: string, ignoreSet: Set<string>): boolean {
  // Check each segment against ignore patterns
  const segments = path.split(/[/\\]/);
  for (const segment of segments) {
    if (ignoreSet.has(segment)) return true;
  }

  // Check full path patterns
  for (const pattern of ignoreSet) {
    if (pattern.includes("/") || pattern.includes("\\")) {
      if (matchesPattern(path, pattern)) return true;
    }
  }

  return false;
}

/**
 * Simple glob pattern matching.
 *
 * Supports:
 * - `*` - matches any characters except path separator
 * - `**` - matches any characters including path separator
 * - `?` - matches single character
 *
 * For production, consider using micromatch or similar.
 */
function matchesPattern(path: string, pattern: string): boolean {
  // Normalize separators
  const normalizedPath = path.replace(/\\/g, "/");
  const normalizedPattern = pattern.replace(/\\/g, "/");

  // Convert glob to regex
  let regex = normalizedPattern
    // Escape regex special chars (except * and ?)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    // Convert ** to special placeholder
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    // Convert * to non-separator match
    .replace(/\*/g, "[^/]*")
    // Convert ? to single char match
    .replace(/\?/g, ".")
    // Convert globstar back
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");

  // Match at end of path for patterns without leading path
  if (!normalizedPattern.startsWith("/") && !normalizedPattern.includes("/")) {
    regex = "(?:^|/)" + regex + "$";
  } else {
    regex = "^" + regex + "$";
  }

  return new RegExp(regex).test(normalizedPath);
}
