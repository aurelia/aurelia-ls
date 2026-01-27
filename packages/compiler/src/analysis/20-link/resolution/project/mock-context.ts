/**
 * Mock File System Context Implementation
 *
 * In-memory file system for testing. Enables fast, deterministic tests
 * without touching the real file system.
 */

import type { NormalizedPath } from '../compiler.js';
import type {
  FileSystemContext,
  GlobOptions,
  FileStat,
  WatchCallback,
  Disposable,
} from "./context.js";
import { getBaseName, getExtension, getDirectory } from "./context.js";
import type { SiblingFile } from "./types.js";

/**
 * In-memory file entry.
 */
interface MockFileEntry {
  readonly path: string;
  readonly content: string;
  readonly mtime: number;
  readonly isDirectory: false;
}

/**
 * In-memory directory entry.
 */
interface MockDirectoryEntry {
  readonly path: string;
  readonly isDirectory: true;
}

type MockEntry = MockFileEntry | MockDirectoryEntry;

/**
 * Options for creating a mock file system.
 */
export interface MockFileSystemOptions {
  /**
   * Initial file contents.
   * Keys are file paths, values are contents.
   */
  readonly files?: Record<string, string>;

  /**
   * Platform to simulate.
   */
  readonly platform?: "win32" | "posix";

  /**
   * Case sensitivity.
   */
  readonly caseSensitive?: boolean;

  /**
   * Root directory (for relative path resolution).
   */
  readonly root?: string;
}

/**
 * Mock file system context with mutation methods.
 */
export interface MockFileSystemContext extends FileSystemContext {
  /**
   * Add a file to the mock filesystem.
   */
  addFile(path: string, content: string): void;

  /**
   * Add a directory to the mock filesystem.
   */
  addDirectory(path: string): void;

  /**
   * Remove a file or directory from the mock filesystem.
   */
  remove(path: string): void;

  /**
   * Clear all files and directories.
   */
  clear(): void;

  /**
   * Get all file paths in the mock filesystem.
   */
  getAllFiles(): string[];

  /**
   * Get all directory paths in the mock filesystem.
   */
  getAllDirectories(): string[];

  /**
   * Snapshot the current state.
   */
  snapshot(): MockFileSystemOptions;
}

/**
 * Create a mock file system context for testing.
 *
 * @example
 * ```typescript
 * const mockFs = createMockFileSystem({
 *   files: {
 *     '/src/foo.ts': 'export class Foo {}',
 *     '/src/foo.html': '<template></template>',
 *   }
 * });
 *
 * const siblings = mockFs.getSiblingFiles('/src/foo.ts', ['.html']);
 * // → [{ path: '/src/foo.html', extension: '.html', baseName: 'foo' }]
 * ```
 */
export function createMockFileSystem(options?: MockFileSystemOptions): MockFileSystemContext {
  const platform = options?.platform ?? "posix";
  const caseSensitive = options?.caseSensitive ?? true;
  const root = options?.root ?? "/";

  // Storage for mock entries
  const entries = new Map<string, MockEntry>();

  // Watch callbacks
  const watchers = new Map<string, Set<WatchCallback>>();

  // Initialize with provided files
  if (options?.files) {
    for (const [path, content] of Object.entries(options.files)) {
      addFileInternal(path, content);
    }
  }

  function normalizePath(path: string): NormalizedPath {
    // Normalize separators
    let normalized = path.replace(/\\/g, "/");

    // Handle relative paths
    if (!normalized.startsWith("/") && platform === "posix") {
      normalized = root + "/" + normalized;
    }

    // Resolve . and ..
    const parts = normalized.split("/").filter(Boolean);
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === ".") continue;
      if (part === ".." && resolved.length > 0) {
        resolved.pop();
      } else if (part !== "..") {
        resolved.push(part);
      }
    }

    // Return as NormalizedPath (preserving case for case-sensitive mode)
    return ("/" + resolved.join("/")) as NormalizedPath;
  }

  function getKey(path: string): string {
    const normalized = normalizePath(path);
    return caseSensitive ? normalized : normalized.toLowerCase();
  }

  function addFileInternal(path: string, content: string): void {
    const normalized = normalizePath(path);
    const key = getKey(path);

    // Ensure parent directories exist
    const dir = getDirectory(normalized);
    if (dir && dir !== "/" && dir !== normalized) {
      addDirectoryInternal(dir);
    }

    const entry: MockFileEntry = {
      path: normalized,
      content,
      mtime: Date.now(),
      isDirectory: false,
    };

    const existed = entries.has(key);
    entries.set(key, entry);

    // Notify watchers
    notifyWatchers(normalized, existed ? "change" : "create");
  }

  function addDirectoryInternal(path: string): void {
    const normalized = normalizePath(path);
    const key = getKey(path);

    // Already exists as directory
    const existing = entries.get(key);
    if (existing?.isDirectory) return;

    // Ensure parent directories exist
    const parent = getDirectory(normalized);
    if (parent && parent !== "/" && parent !== normalized) {
      addDirectoryInternal(parent);
    }

    const entry: MockDirectoryEntry = {
      path: normalized,
      isDirectory: true,
    };

    entries.set(key, entry);
    // Note: We don't notify watchers for auto-created directories.
    // Directory creation is an implementation detail; watchers care about files.
  }

  function notifyWatchers(path: string, type: "create" | "change" | "delete"): void {
    // Notify watchers on the exact path
    const pathWatchers = watchers.get(getKey(path));
    if (pathWatchers) {
      for (const callback of pathWatchers) {
        callback({ type, path });
      }
    }

    // Notify watchers on parent directories (recursive watchers)
    const dir = getDirectory(path);
    if (dir && dir !== path) {
      const dirWatchers = watchers.get(getKey(dir));
      if (dirWatchers) {
        for (const callback of dirWatchers) {
          callback({ type, path });
        }
      }
    }
  }

  const context: MockFileSystemContext = {
    platform,
    caseSensitive,

    fileExists(path: string): boolean {
      const entry = entries.get(getKey(path));
      return entry !== undefined && !entry.isDirectory;
    },

    readFile(path: string): string | undefined {
      const entry = entries.get(getKey(path));
      return entry && !entry.isDirectory ? entry.content : undefined;
    },

    readDirectory(path: string): string[] {
      const normalized = normalizePath(path);
      const normalizedKey = getKey(path);
      const results: string[] = [];

      for (const entry of entries.values()) {
        const entryDir = getDirectory(entry.path);
        const entryDirKey = caseSensitive ? entryDir : entryDir.toLowerCase();

        if (entryDirKey === normalizedKey && entry.path !== normalized) {
          const name = entry.path.slice(entry.path.lastIndexOf("/") + 1);
          results.push(name);
        }
      }

      return results;
    },

    isDirectory(path: string): boolean {
      const entry = entries.get(getKey(path));
      return entry !== undefined && entry.isDirectory;
    },

    getSiblingFiles(sourcePath: string, extensions: readonly string[]): SiblingFile[] {
      const dir = getDirectory(sourcePath);
      const baseName = getBaseName(sourcePath);
      const siblings: SiblingFile[] = [];

      for (const ext of extensions) {
        const siblingPath = dir + "/" + baseName + ext;
        if (context.fileExists(siblingPath)) {
          siblings.push({
            path: normalizePath(siblingPath),
            extension: ext,
            baseName,
          });
        }
      }

      return siblings;
    },

    resolvePath(from: string, relativePath: string): string {
      const dir = getDirectory(from);
      if (relativePath.startsWith("/")) {
        return normalizePath(relativePath);
      }
      return normalizePath(dir + "/" + relativePath);
    },

    normalizePath,

    glob(pattern: string, options?: GlobOptions): string[] {
      const cwd = options?.cwd ? normalizePath(options.cwd) : root;
      const ignore = new Set(options?.ignore ?? []);
      const absolute = options?.absolute ?? true;
      const results: string[] = [];

      for (const entry of entries.values()) {
        // Skip directories unless requested
        if (entry.isDirectory && !options?.includeDirectories) continue;

        // Get relative path from cwd
        if (!entry.path.startsWith(cwd)) continue;
        const relativePath = entry.path.slice(cwd.length + 1);

        // Check ignore patterns
        if (shouldIgnore(relativePath, ignore)) continue;

        // Check pattern match
        if (matchesPattern(relativePath, pattern)) {
          results.push(absolute ? entry.path : relativePath);
        }
      }

      return results;
    },

    watch(path: string, callback: WatchCallback): Disposable {
      const key = getKey(path);
      let pathWatchers = watchers.get(key);
      if (!pathWatchers) {
        pathWatchers = new Set();
        watchers.set(key, pathWatchers);
      }
      pathWatchers.add(callback);

      return {
        dispose() {
          pathWatchers!.delete(callback);
          if (pathWatchers!.size === 0) {
            watchers.delete(key);
          }
        },
      };
    },

    stat(path: string): FileStat | undefined {
      const entry = entries.get(getKey(path));
      if (!entry) return undefined;

      return {
        size: entry.isDirectory ? 0 : entry.content.length,
        mtime: entry.isDirectory ? 0 : entry.mtime,
        ctime: entry.isDirectory ? 0 : entry.mtime,
        isFile: !entry.isDirectory,
        isDirectory: entry.isDirectory,
        isSymbolicLink: false,
      };
    },

    // Mock-specific methods

    addFile(path: string, content: string): void {
      addFileInternal(path, content);
    },

    addDirectory(path: string): void {
      addDirectoryInternal(path);
    },

    remove(path: string): void {
      const key = getKey(path);
      const existed = entries.delete(key);
      if (existed) {
        notifyWatchers(normalizePath(path), "delete");
      }
    },

    clear(): void {
      entries.clear();
    },

    getAllFiles(): string[] {
      return Array.from(entries.values())
        .filter((e) => !e.isDirectory)
        .map((e) => e.path);
    },

    getAllDirectories(): string[] {
      return Array.from(entries.values())
        .filter((e) => e.isDirectory)
        .map((e) => e.path);
    },

    snapshot(): MockFileSystemOptions {
      const files: Record<string, string> = {};
      for (const entry of entries.values()) {
        if (!entry.isDirectory) {
          files[entry.path] = entry.content;
        }
      }
      return { files, platform, caseSensitive, root };
    },
  };

  return context;
}

/**
 * Check if a path should be ignored.
 */
function shouldIgnore(path: string, ignoreSet: Set<string>): boolean {
  const segments = path.split("/");
  for (const segment of segments) {
    if (ignoreSet.has(segment)) return true;
  }
  return false;
}

/**
 * Glob pattern matching with proper globstar handling.
 */
function matchesPattern(path: string, pattern: string): boolean {
  const normalizedPath = path.replace(/\\/g, "/");
  const normalizedPattern = pattern.replace(/\\/g, "/");

  let regex = "^";
  let i = 0;

  while (i < normalizedPattern.length) {
    const char = normalizedPattern[i]!;
    const next = normalizedPattern[i + 1];
    const next2 = normalizedPattern[i + 2];

    if (char === "*" && next === "*") {
      if (next2 === "/") {
        // **/ - match zero or more path segments followed by /
        if (i === 0) {
          // At very start: optional path prefix
          regex += "(?:.*/)?";
        } else if (normalizedPattern[i - 1] === "/") {
          // After a /: remove the / we added and make path segments optional
          regex = regex.slice(0, -1);
          regex += "(?:/.*)?/";
        } else {
          // ** not after / - treat as literal (unusual case)
          regex += "\\*\\*/";
        }
        i += 3;
      } else if (i + 2 >= normalizedPattern.length || next2 === undefined) {
        // ** at end of pattern - match anything remaining
        regex += ".*";
        i += 2;
      } else {
        // ** followed by something other than / - match anything
        regex += ".*";
        i += 2;
      }
    } else if (char === "*") {
      // Single * - match any characters except /
      regex += "[^/]*";
      i += 1;
    } else if (char === "?") {
      // ? - match single non-separator character
      regex += "[^/]";
      i += 1;
    } else if (".+^${}()|[]\\".includes(char)) {
      // Escape regex special characters
      regex += "\\" + char;
      i += 1;
    } else {
      regex += char;
      i += 1;
    }
  }

  regex += "$";

  return new RegExp(regex).test(normalizedPath);
}
