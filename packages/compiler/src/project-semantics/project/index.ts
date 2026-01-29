/**
 * File Discovery Layer (Layer 0)
 *
 * Foundation for file system awareness in the resolution pipeline.
 * Provides sibling detection, project scanning, and directory conventions.
 *
 * @example
 * ```typescript
 * import {
 *   createNodeFileSystem,
 *   createProjectScanner,
 *   detectSiblings,
 * } from '../compiler.js';
 *
 * // Create file system context
 * const fileSystem = createNodeFileSystem();
 *
 * // Detect sibling templates
 * const siblings = detectSiblings('/src/foo.ts', fileSystem, {
 *   templateExtensions: ['.html'],
 * });
 *
 * // Or scan entire project
 * const scanner = createProjectScanner(fileSystem, {
 *   root: '/projects/my-app',
 * });
 * const filePairs = scanner.getFilePairs();
 * ```
 */

// === Core Types ===
export type {
  SiblingFile,
  ProjectFile,
  ProjectFileType,
  ProjectStructure,
  FilePair,
  PairingDetection,
  DirectoryConvention,
  DirectoryScope,
  DirectoryMatch,
  ProjectScannerOptions,
  ExtractionOptions as ProjectExtractionOptions,
} from "./types.js";

export {
  FILE_EXTENSIONS,
  DEFAULT_TEMPLATE_EXTENSIONS,
  DEFAULT_STYLE_EXTENSIONS,
  DEFAULT_DIRECTORY_CONVENTIONS,
  DEFAULT_SCANNER_OPTIONS,
  DEFAULT_EXTRACTION_OPTIONS,
} from "./types.js";

// === File System Context ===
export type {
  FileSystemContext,
  FileSystemContextOptions,
  GlobOptions,
  WatchCallback,
  WatchEvent,
  Disposable,
  FileStat,
} from "./context.js";

export {
  getFileType,
  createProjectFile,
  pathsEqual,
  getBaseName,
  getExtension,
  getDirectory,
} from "./context.js";

// === Node.js Implementation ===
export { createNodeFileSystem } from "./node-context.js";

// === Mock Implementation (for tests) ===
export type { MockFileSystemOptions, MockFileSystemContext } from "./mock-context.js";
export { createMockFileSystem } from "./mock-context.js";

// === Sibling Detection ===
export type { SiblingDetectionOptions, FilePairOptions } from "./sibling-detector.js";
export {
  detectSiblings,
  findTemplateSibling,
  findStylesheetSibling,
  classMatchesFileName,
  buildFilePair,
  detectSiblingsBatch,
  findOrphanTemplates,
  findSourcesWithoutTemplates,
} from "./sibling-detector.js";

// === Project Scanner ===
export type { ProjectScanner } from "./scanner.js";
export { createProjectScanner, createProjectScannerFromProgram } from "./scanner.js";

// === Directory Conventions ===
export type { DirectoryConventionListConfig, ConventionBuilder } from "./directory-conventions.js";
export {
  DEFAULT_CONVENTIONS,
  matchDirectoryConventions,
  matchDirectoryConvention,
  buildConventionList,
  describeScope,
  isGlobalScope,
  isRouterScope,
  conventionBuilder,
} from "./directory-conventions.js";
