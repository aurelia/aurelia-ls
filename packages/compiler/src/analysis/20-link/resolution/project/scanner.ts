/**
 * Project Scanner
 *
 * Project-wide file enumeration and structure analysis. Discovers all source
 * and template files, detects file pairs, matches directory conventions,
 * and identifies orphans.
 */

import type ts from "typescript";
import type { NormalizedPath, CompileTrace } from '../compiler.js';
import { normalizePathForId, debug, NOOP_TRACE } from '../compiler.js';
import type { FileSystemContext } from "./context.js";
import { getBaseName, getExtension, getDirectory, getFileType, createProjectFile } from "./context.js";
import {
  DEFAULT_TEMPLATE_EXTENSIONS,
  DEFAULT_STYLE_EXTENSIONS,
  type ProjectFile,
  type ProjectFileType,
  type ProjectStructure,
  type FilePair,
  type DirectoryConvention,
  type DirectoryMatch,
  type ProjectScannerOptions,
} from "./types.js";
import { buildFilePair, findOrphanTemplates, findSourcesWithoutTemplates } from "./sibling-detector.js";
import { matchDirectoryConventions } from "./directory-conventions.js";

// ============================================================================
// Scanner Interface
// ============================================================================

/**
 * Project scanner interface.
 *
 * Provides project-wide file enumeration and analysis.
 */
export interface ProjectScanner {
  /**
   * Get all source files in the project.
   */
  getSourceFiles(): readonly ProjectFile[];

  /**
   * Get all template files in the project.
   */
  getTemplateFiles(): readonly ProjectFile[];

  /**
   * Get all stylesheet files in the project.
   */
  getStylesheetFiles(): readonly ProjectFile[];

  /**
   * Get all files of a specific type.
   */
  getFilesByType(type: ProjectFileType): readonly ProjectFile[];

  /**
   * Get all files matching a pattern.
   */
  glob(pattern: string): readonly ProjectFile[];

  /**
   * Check if a path is within the project.
   */
  isProjectFile(path: string): boolean;

  /**
   * Get file pairs (source + template + stylesheet).
   */
  getFilePairs(): readonly FilePair[];

  /**
   * Get directory convention matches.
   */
  getConventionMatches(): ReadonlyMap<NormalizedPath, DirectoryMatch>;

  /**
   * Get orphan templates (no matching source).
   */
  getOrphanTemplates(): readonly ProjectFile[];

  /**
   * Get sources without templates.
   */
  getSourcesWithoutTemplates(): readonly ProjectFile[];

  /**
   * Get the full project structure.
   */
  getProjectStructure(): ProjectStructure;

  /**
   * Refresh the scanner (re-scan files).
   */
  refresh(): void;

  /**
   * Get the scanner options.
   */
  readonly options: ProjectScannerOptions;

  /**
   * Get the file system context.
   */
  readonly fileSystem: FileSystemContext;
}

// ============================================================================
// Scanner Implementation
// ============================================================================

/**
 * Create a project scanner.
 *
 * @param fileSystem - File system context
 * @param options - Scanner options
 * @returns Project scanner instance
 *
 * @example
 * ```typescript
 * const scanner = createProjectScanner(fileSystem, {
 *   root: '/projects/my-app',
 *   sourcePatterns: ['src/**\/*.ts'],
 *   templatePatterns: ['src/**\/*.html'],
 * });
 *
 * const sources = scanner.getSourceFiles();
 * const templates = scanner.getTemplateFiles();
 * const pairs = scanner.getFilePairs();
 * ```
 */
export function createProjectScanner(
  fileSystem: FileSystemContext,
  options: ProjectScannerOptions,
): ProjectScanner {
  // Merge with defaults
  const opts: Required<Omit<ProjectScannerOptions, "trace">> & { trace: CompileTrace } = {
    root: options.root,
    sourcePatterns: options.sourcePatterns ?? ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"],
    templatePatterns: options.templatePatterns ?? ["**/*.html"],
    exclude: options.exclude ?? ["node_modules", "dist", ".git", "coverage"],
    conventions: options.conventions ?? [],
    detectPairs: options.detectPairs ?? true,
    detectOrphans: options.detectOrphans ?? true,
    trace: options.trace ?? NOOP_TRACE,
  };

  const trace = opts.trace;

  // Cached results
  let sourceFiles: ProjectFile[] | null = null;
  let templateFiles: ProjectFile[] | null = null;
  let stylesheetFiles: ProjectFile[] | null = null;
  let filePairs: FilePair[] | null = null;
  let conventionMatches: Map<NormalizedPath, DirectoryMatch> | null = null;
  let orphanTemplates: ProjectFile[] | null = null;
  let sourcesWithoutTemplates: ProjectFile[] | null = null;

  function invalidateCache(): void {
    sourceFiles = null;
    templateFiles = null;
    stylesheetFiles = null;
    filePairs = null;
    conventionMatches = null;
    orphanTemplates = null;
    sourcesWithoutTemplates = null;
  }

  function scanSourceFiles(): ProjectFile[] {
    if (sourceFiles !== null) return sourceFiles;

    return trace.span("scanner.source", () => {
      debug.resolution("scanner.source.start", { patterns: opts.sourcePatterns });

      const files: ProjectFile[] = [];

      for (const pattern of opts.sourcePatterns) {
        const matches = fileSystem.glob(pattern, {
          cwd: opts.root,
          ignore: [...opts.exclude],
          absolute: true,
        });

        for (const match of matches) {
          const normalized = fileSystem.normalizePath(match);
          const baseName = getBaseName(normalized);
          const extension = getExtension(normalized);
          const directory = fileSystem.normalizePath(getDirectory(normalized));
          const type = getFileType(extension);

          if (type === "source") {
            files.push(createProjectFile(normalized, baseName, extension, directory));
          }
        }
      }

      debug.resolution("scanner.source.done", { count: files.length });
      trace.setAttribute("scanner.source.count", files.length);

      sourceFiles = files;
      return files;
    });
  }

  function scanTemplateFiles(): ProjectFile[] {
    if (templateFiles !== null) return templateFiles;

    return trace.span("scanner.template", () => {
      debug.resolution("scanner.template.start", { patterns: opts.templatePatterns });

      const files: ProjectFile[] = [];

      for (const pattern of opts.templatePatterns) {
        const matches = fileSystem.glob(pattern, {
          cwd: opts.root,
          ignore: [...opts.exclude],
          absolute: true,
        });

        for (const match of matches) {
          const normalized = fileSystem.normalizePath(match);
          const baseName = getBaseName(normalized);
          const extension = getExtension(normalized);
          const directory = fileSystem.normalizePath(getDirectory(normalized));
          const type = getFileType(extension);

          if (type === "template") {
            files.push(createProjectFile(normalized, baseName, extension, directory));
          }
        }
      }

      debug.resolution("scanner.template.done", { count: files.length });
      trace.setAttribute("scanner.template.count", files.length);

      templateFiles = files;
      return files;
    });
  }

  function scanStylesheetFiles(): ProjectFile[] {
    if (stylesheetFiles !== null) return stylesheetFiles;

    return trace.span("scanner.stylesheet", () => {
      debug.resolution("scanner.stylesheet.start", {});

      const files: ProjectFile[] = [];
      const stylePatterns = ["**/*.css", "**/*.scss", "**/*.sass", "**/*.less"];

      for (const pattern of stylePatterns) {
        const matches = fileSystem.glob(pattern, {
          cwd: opts.root,
          ignore: [...opts.exclude],
          absolute: true,
        });

        for (const match of matches) {
          const normalized = fileSystem.normalizePath(match);
          const baseName = getBaseName(normalized);
          const extension = getExtension(normalized);
          const directory = fileSystem.normalizePath(getDirectory(normalized));
          const type = getFileType(extension);

          if (type === "stylesheet") {
            files.push(createProjectFile(normalized, baseName, extension, directory));
          }
        }
      }

      debug.resolution("scanner.stylesheet.done", { count: files.length });
      trace.setAttribute("scanner.stylesheet.count", files.length);

      stylesheetFiles = files;
      return files;
    });
  }

  function computeFilePairs(): FilePair[] {
    if (filePairs !== null) return filePairs;
    if (!opts.detectPairs) {
      filePairs = [];
      return filePairs;
    }

    return trace.span("scanner.pairs", () => {
      debug.resolution("scanner.pairs.start", {});

      const sources = scanSourceFiles();
      const pairs: FilePair[] = [];

      for (const source of sources) {
        const pair = buildFilePair(source.path, fileSystem, {
          templateExtensions: [...DEFAULT_TEMPLATE_EXTENSIONS],
          styleExtensions: [...DEFAULT_STYLE_EXTENSIONS],
        });
        pairs.push(pair);
      }

      const withTemplate = pairs.filter((p) => p.template).length;
      const withStylesheet = pairs.filter((p) => p.stylesheet).length;

      debug.resolution("scanner.pairs.done", {
        total: pairs.length,
        withTemplate,
        withStylesheet,
      });
      trace.setAttribute("scanner.pairs.total", pairs.length);
      trace.setAttribute("scanner.pairs.withTemplate", withTemplate);
      trace.setAttribute("scanner.pairs.withStylesheet", withStylesheet);

      filePairs = pairs;
      return pairs;
    });
  }

  function computeConventionMatches(): Map<NormalizedPath, DirectoryMatch> {
    if (conventionMatches !== null) return conventionMatches;

    return trace.span("scanner.conventions", () => {
      debug.resolution("scanner.conventions.start", { count: opts.conventions.length });

      const matches = new Map<NormalizedPath, DirectoryMatch>();

      if (opts.conventions.length === 0) {
        conventionMatches = matches;
        return matches;
      }

      const sources = scanSourceFiles();

      for (const source of sources) {
        const match = matchDirectoryConventions(source.path, opts.root, opts.conventions);
        if (match) {
          matches.set(source.path, match);
        }
      }

      debug.resolution("scanner.conventions.done", { matchCount: matches.size });
      trace.setAttribute("scanner.conventions.matchCount", matches.size);

      conventionMatches = matches;
      return matches;
    });
  }

  function computeOrphans(): { orphanTemplates: ProjectFile[]; sourcesWithoutTemplates: ProjectFile[] } {
    if (orphanTemplates !== null && sourcesWithoutTemplates !== null) {
      return { orphanTemplates, sourcesWithoutTemplates };
    }

    if (!opts.detectOrphans) {
      orphanTemplates = [];
      sourcesWithoutTemplates = [];
      return { orphanTemplates, sourcesWithoutTemplates };
    }

    return trace.span("scanner.orphans", () => {
      debug.resolution("scanner.orphans.start", {});

      const sources = scanSourceFiles();
      const templates = scanTemplateFiles();

      const orphanPaths = findOrphanTemplates(
        templates.map((t) => t.path),
        sources.map((s) => s.path),
        fileSystem,
      );

      const withoutTemplatePaths = findSourcesWithoutTemplates(
        sources.map((s) => s.path),
        templates.map((t) => t.path),
        fileSystem,
      );

      orphanTemplates = templates.filter((t) => orphanPaths.includes(t.path));
      sourcesWithoutTemplates = sources.filter((s) => withoutTemplatePaths.includes(s.path));

      debug.resolution("scanner.orphans.done", {
        orphanTemplates: orphanTemplates.length,
        sourcesWithoutTemplates: sourcesWithoutTemplates.length,
      });
      trace.setAttribute("scanner.orphans.orphanTemplates", orphanTemplates.length);
      trace.setAttribute("scanner.orphans.sourcesWithoutTemplates", sourcesWithoutTemplates.length);

      return { orphanTemplates, sourcesWithoutTemplates };
    });
  }

  return {
    options: opts,
    fileSystem,

    getSourceFiles(): readonly ProjectFile[] {
      return scanSourceFiles();
    },

    getTemplateFiles(): readonly ProjectFile[] {
      return scanTemplateFiles();
    },

    getStylesheetFiles(): readonly ProjectFile[] {
      return scanStylesheetFiles();
    },

    getFilesByType(type: ProjectFileType): readonly ProjectFile[] {
      switch (type) {
        case "source":
          return scanSourceFiles();
        case "template":
          return scanTemplateFiles();
        case "stylesheet":
          return scanStylesheetFiles();
        default:
          return [];
      }
    },

    glob(pattern: string): readonly ProjectFile[] {
      const matches = fileSystem.glob(pattern, {
        cwd: opts.root,
        ignore: [...opts.exclude],
        absolute: true,
      });

      return matches.map((match) => {
        const normalized = fileSystem.normalizePath(match);
        const baseName = getBaseName(normalized);
        const extension = getExtension(normalized);
        const directory = fileSystem.normalizePath(getDirectory(normalized));
        return createProjectFile(normalized, baseName, extension, directory);
      });
    },

    isProjectFile(path: string): boolean {
      const normalized = fileSystem.normalizePath(path);
      const normalizedRoot = fileSystem.normalizePath(opts.root);

      // Check if within project root
      if (!normalized.startsWith(normalizedRoot)) {
        return false;
      }

      // Check if in excluded directory
      const relativePath = normalized.slice(normalizedRoot.length + 1);
      for (const exclude of opts.exclude) {
        if (relativePath.startsWith(exclude + "/") || relativePath === exclude) {
          return false;
        }
      }

      return true;
    },

    getFilePairs(): readonly FilePair[] {
      return computeFilePairs();
    },

    getConventionMatches(): ReadonlyMap<NormalizedPath, DirectoryMatch> {
      return computeConventionMatches();
    },

    getOrphanTemplates(): readonly ProjectFile[] {
      return computeOrphans().orphanTemplates;
    },

    getSourcesWithoutTemplates(): readonly ProjectFile[] {
      return computeOrphans().sourcesWithoutTemplates;
    },

    getProjectStructure(): ProjectStructure {
      return {
        root: opts.root,
        sourceDirs: [], // TODO: detect from tsconfig
        sourceFiles: scanSourceFiles(),
        templateFiles: scanTemplateFiles(),
        stylesheetFiles: scanStylesheetFiles(),
        filePairs: computeFilePairs(),
        conventionMatches: computeConventionMatches(),
        orphanTemplates: computeOrphans().orphanTemplates,
        orphanSources: computeOrphans().sourcesWithoutTemplates,
      };
    },

    refresh(): void {
      invalidateCache();
    },
  };
}

// ============================================================================
// TypeScript Integration
// ============================================================================

/**
 * Create a project scanner from a TypeScript program.
 *
 * Uses the program's source files and respects tsconfig.json settings.
 *
 * @param program - TypeScript program
 * @param fileSystem - File system context
 * @param options - Additional scanner options
 * @returns Project scanner instance
 */
export function createProjectScannerFromProgram(
  program: ts.Program,
  fileSystem: FileSystemContext,
  options?: Partial<Omit<ProjectScannerOptions, "root">>,
): ProjectScanner {
  // Get root from first source file's directory (heuristic)
  const sourceFiles = program.getSourceFiles().filter((sf) => !sf.isDeclarationFile);
  const firstSourceFile = sourceFiles[0];
  const root = firstSourceFile
    ? fileSystem.normalizePath(getDirectory(firstSourceFile.fileName))
    : fileSystem.normalizePath(process.cwd());

  // Create base scanner
  const baseScanner = createProjectScanner(fileSystem, {
    root,
    ...options,
  });

  // Override source file enumeration to use program
  const programSourceFiles: ProjectFile[] = sourceFiles
    .filter((sf) => !sf.fileName.includes("node_modules"))
    .map((sf) => {
      const normalized = fileSystem.normalizePath(sf.fileName);
      const baseName = getBaseName(normalized);
      const extension = getExtension(normalized);
      const directory = fileSystem.normalizePath(getDirectory(normalized));
      return createProjectFile(normalized, baseName, extension, directory);
    });

  return {
    ...baseScanner,

    getSourceFiles(): readonly ProjectFile[] {
      return programSourceFiles;
    },
  };
}
