/**
 * Sibling File Detector
 *
 * High-level logic for detecting sibling files (templates, stylesheets)
 * adjacent to source files. Implements the sibling file convention:
 *
 * ```
 * foo.ts + foo.html = component with external template
 * foo.ts + foo.css = component with scoped stylesheet
 * ```
 */

import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { FileSystemContext } from "./context.js";
import { getBaseName, getExtension, getDirectory } from "./context.js";
import type {
  SiblingFile,
  FilePair,
  PairingDetection,
} from "./types.js";
import type { SiblingFileFact } from "../extraction/types.js";
import { debug } from "@aurelia-ls/compiler";

// ============================================================================
// Core Detection
// ============================================================================

/**
 * Detect sibling files for a source file.
 *
 * @param sourcePath - Path to the source file (.ts, .js, etc.)
 * @param fileSystem - File system context
 * @param options - Detection options
 * @returns Array of detected sibling files
 *
 * @example
 * ```typescript
 * const siblings = detectSiblings('/src/foo.ts', fileSystem, {
 *   templateExtensions: ['.html'],
 *   styleExtensions: ['.css', '.scss'],
 * });
 * // If foo.html exists: [{ path: '/src/foo.html', extension: '.html', baseName: 'foo' }]
 * ```
 */
export function detectSiblings(
  sourcePath: string,
  fileSystem: FileSystemContext,
  options?: SiblingDetectionOptions,
): SiblingFile[] {
  const templateExtensions = options?.templateExtensions ?? [".html"];
  const styleExtensions = options?.styleExtensions ?? [".css", ".scss"];

  const allExtensions = [...templateExtensions, ...styleExtensions];

  debug.resolution("sibling.detect.start", {
    sourcePath,
    extensions: allExtensions,
  });

  const siblings = fileSystem.getSiblingFiles(sourcePath, allExtensions);

  debug.resolution("sibling.detect.result", {
    sourcePath,
    found: siblings.map((s) => s.path),
  });

  return siblings;
}

/**
 * Options for sibling detection.
 */
export interface SiblingDetectionOptions {
  /** Template extensions to look for */
  readonly templateExtensions?: readonly string[];

  /** Stylesheet extensions to look for */
  readonly styleExtensions?: readonly string[];
}

// ============================================================================
// Template Matching
// ============================================================================

/**
 * Find the template sibling for a source file.
 *
 * @param sourcePath - Path to the source file
 * @param fileSystem - File system context
 * @param extensions - Template extensions to check
 * @returns Template sibling, or undefined if none found
 */
export function findTemplateSibling(
  sourcePath: string,
  fileSystem: FileSystemContext,
  extensions: readonly string[] = [".html"],
): SiblingFile | undefined {
  const siblings = fileSystem.getSiblingFiles(sourcePath, extensions);
  return siblings.find((s) => extensions.includes(s.extension));
}

/**
 * Find the stylesheet sibling for a source file.
 *
 * @param sourcePath - Path to the source file
 * @param fileSystem - File system context
 * @param extensions - Stylesheet extensions to check (priority order)
 * @returns Stylesheet sibling, or undefined if none found
 */
export function findStylesheetSibling(
  sourcePath: string,
  fileSystem: FileSystemContext,
  extensions: readonly string[] = [".css", ".scss"],
): SiblingFile | undefined {
  const siblings = fileSystem.getSiblingFiles(sourcePath, extensions);
  // Return first match in priority order
  for (const ext of extensions) {
    const match = siblings.find((s) => s.extension === ext);
    if (match) return match;
  }
  return undefined;
}

// ============================================================================
// Class Matching
// ============================================================================

/**
 * Check if a class name matches a file name for sibling convention.
 *
 * Aurelia's sibling convention requires the class name to match the file name:
 * - `foo.ts` → `Foo` (PascalCase)
 * - `foo-bar.ts` → `FooBar` (kebab-to-Pascal)
 * - `FooBar.ts` → `FooBar` (already Pascal)
 *
 * Also accepts conventional suffixes:
 * - `foo.ts` → `FooCustomElement`
 *
 * @param className - The class name to check
 * @param sourcePath - The source file path
 * @returns true if class name matches file name
 */
export function classMatchesFileName(className: string, sourcePath: string): boolean {
  const baseName = getBaseName(sourcePath);
  const expectedClassName = toPascalCase(baseName);

  // Exact match
  if (className === expectedClassName) {
    return true;
  }

  // Match with CustomElement suffix
  if (className === expectedClassName + "CustomElement") {
    return true;
  }

  // Match with Element suffix (shorter form)
  if (className === expectedClassName + "Element") {
    return true;
  }

  return false;
}

/**
 * Convert a file base name to PascalCase class name.
 *
 * - `foo` → `Foo`
 * - `foo-bar` → `FooBar`
 * - `fooBar` → `FooBar`
 * - `FooBar` → `FooBar`
 */
function toPascalCase(name: string): string {
  // Split on hyphens, underscores, or existing camelCase boundaries
  const parts = name.split(/[-_]|(?<=[a-z])(?=[A-Z])/);

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

// ============================================================================
// Fact Conversion
// ============================================================================

/**
 * Convert SiblingFile array to SiblingFileFact array for SourceFacts.
 */
export function toSiblingFacts(siblings: readonly SiblingFile[]): SiblingFileFact[] {
  return siblings.map((s) => ({
    path: s.path,
    extension: s.extension,
    baseName: s.baseName,
  }));
}

// ============================================================================
// File Pair Building
// ============================================================================

/**
 * Build a file pair from a source file.
 *
 * @param sourcePath - Path to the source file
 * @param fileSystem - File system context
 * @param options - Pairing options
 * @returns File pair with detected siblings
 */
export function buildFilePair(
  sourcePath: NormalizedPath,
  fileSystem: FileSystemContext,
  options?: FilePairOptions,
): FilePair {
  const templateExtensions = options?.templateExtensions ?? [".html"];
  const styleExtensions = options?.styleExtensions ?? [".css", ".scss"];

  const baseName = getBaseName(sourcePath);
  const extension = getExtension(sourcePath);
  const directory = fileSystem.normalizePath(getDirectory(sourcePath));

  const source = {
    path: sourcePath,
    baseName,
    extension,
    directory,
    type: "source" as const,
  };

  // Find template sibling
  const templateSibling = findTemplateSibling(sourcePath, fileSystem, templateExtensions);
  const template = templateSibling
    ? {
        path: templateSibling.path,
        baseName: templateSibling.baseName,
        extension: templateSibling.extension,
        directory,
        type: "template" as const,
      }
    : undefined;

  // Find stylesheet sibling
  const styleSibling = findStylesheetSibling(sourcePath, fileSystem, styleExtensions);
  const stylesheet = styleSibling
    ? {
        path: styleSibling.path,
        baseName: styleSibling.baseName,
        extension: styleSibling.extension,
        directory,
        type: "stylesheet" as const,
      }
    : undefined;

  const detection: PairingDetection = { kind: "sibling" };

  return {
    source,
    template,
    stylesheet,
    detection,
  };
}

/**
 * Options for file pair building.
 */
export interface FilePairOptions {
  /** Template extensions to check */
  readonly templateExtensions?: readonly string[];

  /** Stylesheet extensions to check */
  readonly styleExtensions?: readonly string[];
}

// ============================================================================
// Batch Detection
// ============================================================================

/**
 * Detect siblings for multiple source files.
 *
 * More efficient than calling detectSiblings individually
 * when processing many files.
 *
 * @param sourcePaths - Paths to source files
 * @param fileSystem - File system context
 * @param options - Detection options
 * @returns Map from source path to siblings
 */
export function detectSiblingsBatch(
  sourcePaths: readonly string[],
  fileSystem: FileSystemContext,
  options?: SiblingDetectionOptions,
): Map<string, SiblingFile[]> {
  const results = new Map<string, SiblingFile[]>();

  for (const sourcePath of sourcePaths) {
    const siblings = detectSiblings(sourcePath, fileSystem, options);
    if (siblings.length > 0) {
      results.set(sourcePath, siblings);
    }
  }

  return results;
}

/**
 * Find all orphan templates (templates with no matching source file).
 *
 * @param templatePaths - All template paths in the project
 * @param sourcePaths - All source paths in the project
 * @param fileSystem - File system context
 * @returns Array of orphan template paths
 */
export function findOrphanTemplates(
  templatePaths: readonly string[],
  sourcePaths: readonly string[],
  fileSystem: FileSystemContext,
): string[] {
  // Build a set of base names from source files
  const sourceBaseNames = new Set<string>();
  for (const sourcePath of sourcePaths) {
    const baseName = getBaseName(sourcePath);
    const key = fileSystem.caseSensitive ? baseName : baseName.toLowerCase();
    sourceBaseNames.add(key);
  }

  // Find templates without matching source
  const orphans: string[] = [];
  for (const templatePath of templatePaths) {
    const baseName = getBaseName(templatePath);
    const key = fileSystem.caseSensitive ? baseName : baseName.toLowerCase();
    if (!sourceBaseNames.has(key)) {
      orphans.push(templatePath);
    }
  }

  return orphans;
}

/**
 * Find all source files without templates (may be intentional).
 *
 * @param sourcePaths - All source paths in the project
 * @param templatePaths - All template paths in the project
 * @param fileSystem - File system context
 * @returns Array of source paths without templates
 */
export function findSourcesWithoutTemplates(
  sourcePaths: readonly string[],
  templatePaths: readonly string[],
  fileSystem: FileSystemContext,
): string[] {
  // Build a set of base names from template files
  const templateBaseNames = new Set<string>();
  for (const templatePath of templatePaths) {
    const baseName = getBaseName(templatePath);
    const key = fileSystem.caseSensitive ? baseName : baseName.toLowerCase();
    templateBaseNames.add(key);
  }

  // Find sources without matching template
  const withoutTemplates: string[] = [];
  for (const sourcePath of sourcePaths) {
    const baseName = getBaseName(sourcePath);
    const key = fileSystem.caseSensitive ? baseName : baseName.toLowerCase();
    if (!templateBaseNames.has(key)) {
      withoutTemplates.push(sourcePath);
    }
  }

  return withoutTemplates;
}
