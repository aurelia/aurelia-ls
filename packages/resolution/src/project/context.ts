/**
 * File System Context
 *
 * Abstract interface for file system operations. Consumers implement this
 * based on their environment (Node.js, Vite, LSP, tests).
 *
 * This abstraction enables:
 * - Sibling file detection (foo.ts + foo.html)
 * - Project-wide file enumeration
 * - Directory convention matching
 * - Platform-independent testing
 */

import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { SiblingFile, ProjectFile, ProjectFileType } from "./types.js";

// ============================================================================
// Core Interface
// ============================================================================

/**
 * File system context interface.
 *
 * Implementations:
 * - `createNodeFileSystem()` - Node.js fs module
 * - `createMockFileSystem()` - In-memory for tests
 * - Vite plugin - Vite's module graph
 * - Language server - TS LanguageServiceHost
 */
export interface FileSystemContext {
  // === Core Operations ===

  /**
   * Check if a file exists.
   *
   * @param path - Absolute path to check
   * @returns true if file exists and is readable
   */
  fileExists(path: string): boolean;

  /**
   * Read file contents as UTF-8 string.
   *
   * @param path - Absolute path to read
   * @returns File contents, or undefined if file doesn't exist
   */
  readFile(path: string): string | undefined;

  /**
   * List entries in a directory.
   *
   * @param path - Absolute path to directory
   * @returns Array of entry names (not full paths)
   */
  readDirectory(path: string): string[];

  /**
   * Check if a path is a directory.
   *
   * @param path - Absolute path to check
   * @returns true if path exists and is a directory
   */
  isDirectory(path: string): boolean;

  // === Convenience Operations ===

  /**
   * Get sibling files with specific extensions.
   *
   * For `foo.ts`, find adjacent files like `foo.html`, `foo.css`.
   *
   * @param sourcePath - Path to source file
   * @param extensions - Extensions to look for (including dot)
   * @returns Array of sibling files found
   */
  getSiblingFiles(sourcePath: string, extensions: readonly string[]): SiblingFile[];

  /**
   * Resolve a path relative to another file.
   *
   * @param from - Base file path
   * @param relativePath - Relative path to resolve
   * @returns Resolved absolute path
   */
  resolvePath(from: string, relativePath: string): string;

  /**
   * Normalize a path to canonical form.
   *
   * - Resolves `.` and `..` segments
   * - Normalizes separators to forward slash
   * - Lowercases on case-insensitive systems
   *
   * @param path - Path to normalize
   * @returns Normalized path
   */
  normalizePath(path: string): NormalizedPath;

  // === Advanced Operations ===

  /**
   * Find files matching a glob pattern.
   *
   * @param pattern - Glob pattern (e.g., '**\/*.ts')
   * @param options - Glob options
   * @returns Array of matching file paths
   */
  glob(pattern: string, options?: GlobOptions): string[];

  /**
   * Watch a file or directory for changes.
   *
   * @param path - Path to watch
   * @param callback - Called when changes detected
   * @returns Disposable to stop watching
   */
  watch?(path: string, callback: WatchCallback): Disposable;

  /**
   * Get file metadata.
   *
   * @param path - Path to file
   * @returns File stats or undefined if not found
   */
  stat?(path: string): FileStat | undefined;

  // === Context Info ===

  /**
   * Platform identifier.
   * Used for platform-specific path handling.
   */
  readonly platform: "win32" | "posix";

  /**
   * Whether the file system is case-sensitive.
   */
  readonly caseSensitive: boolean;
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Options for glob operations.
 */
export interface GlobOptions {
  /** Base directory for relative patterns */
  readonly cwd?: string;

  /** Patterns to exclude */
  readonly ignore?: readonly string[];

  /** Maximum depth to traverse */
  readonly maxDepth?: number;

  /** Include directories in results */
  readonly includeDirectories?: boolean;

  /** Follow symbolic links */
  readonly followSymlinks?: boolean;

  /** Use absolute paths in results */
  readonly absolute?: boolean;
}

/**
 * Callback for file watching.
 */
export type WatchCallback = (event: WatchEvent) => void;

/**
 * File watch event.
 */
export interface WatchEvent {
  /** Type of change */
  readonly type: "create" | "change" | "delete";

  /** Path that changed */
  readonly path: string;
}

/**
 * Disposable resource.
 */
export interface Disposable {
  dispose(): void;
}

/**
 * File statistics.
 */
export interface FileStat {
  /** File size in bytes */
  readonly size: number;

  /** Last modification time (ms since epoch) */
  readonly mtime: number;

  /** Creation time (ms since epoch) */
  readonly ctime: number;

  /** Whether path is a file */
  readonly isFile: boolean;

  /** Whether path is a directory */
  readonly isDirectory: boolean;

  /** Whether path is a symbolic link */
  readonly isSymbolicLink: boolean;
}

// ============================================================================
// Factory Types
// ============================================================================

/**
 * Options for creating a FileSystemContext.
 */
export interface FileSystemContextOptions {
  /**
   * Root directory for relative path resolution.
   * Defaults to process.cwd() in Node.js.
   */
  readonly root?: string;

  /**
   * Override platform detection.
   * Defaults to auto-detection.
   */
  readonly platform?: "win32" | "posix";

  /**
   * Override case sensitivity.
   * Defaults to platform default.
   */
  readonly caseSensitive?: boolean;

  /**
   * Custom path normalization function.
   */
  readonly normalizePath?: (path: string) => NormalizedPath;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get file type from extension.
 */
export function getFileType(extension: string): ProjectFileType {
  const ext = extension.toLowerCase();
  const FILE_EXT_MAP: Record<string, ProjectFileType> = {
    ".ts": "source",
    ".js": "source",
    ".tsx": "source",
    ".jsx": "source",
    ".mts": "source",
    ".mjs": "source",
    ".html": "template",
    ".htm": "template",
    ".css": "stylesheet",
    ".scss": "stylesheet",
    ".sass": "stylesheet",
    ".less": "stylesheet",
    ".styl": "stylesheet",
    ".json": "config",
  };
  return FILE_EXT_MAP[ext] ?? "other";
}

/**
 * Create a ProjectFile from path.
 */
export function createProjectFile(
  path: NormalizedPath,
  baseName: string,
  extension: string,
  directory: NormalizedPath,
): ProjectFile {
  return {
    path,
    baseName,
    extension,
    directory,
    type: getFileType(extension),
  };
}

/**
 * Check if two paths are equivalent (accounting for case sensitivity).
 */
export function pathsEqual(a: string, b: string, caseSensitive: boolean): boolean {
  if (caseSensitive) {
    return a === b;
  }
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Get the base name of a path (without extension).
 */
export function getBaseName(filePath: string): string {
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  const fileName = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

/**
 * Get the extension of a path (including dot).
 */
export function getExtension(filePath: string): string {
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  const fileName = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.slice(dotIndex) : "";
}

/**
 * Get the directory of a path.
 */
export function getDirectory(filePath: string): string {
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  return lastSlash >= 0 ? filePath.slice(0, lastSlash) : ".";
}
