/**
 * File Discovery Types
 *
 * Core types for the file discovery layer (Layer 0 in resolution architecture).
 * This layer provides file system awareness that pure AST analysis cannot.
 */

import type { NormalizedPath, CompileTrace } from "@aurelia-ls/compiler";

// ============================================================================
// Sibling Detection
// ============================================================================

/**
 * A sibling file discovered adjacent to a source file.
 *
 * Used for template-pairing convention: `foo.ts` + `foo.html` as siblings.
 *
 * This is the canonical definition. Other modules import from here:
 * - file-facts.ts re-exports for convenience
 * - extraction/types.ts has deprecated SiblingFileFact (structurally identical)
 */
export interface SiblingFile {
  /** Full normalized path to the sibling file */
  readonly path: NormalizedPath;

  /** File extension including the dot (e.g., '.html', '.css') */
  readonly extension: string;

  /** Base name without extension, matches source file (e.g., 'cortex-devices') */
  readonly baseName: string;
}

// ============================================================================
// Project Files
// ============================================================================

/**
 * A file in the project with metadata.
 */
export interface ProjectFile {
  /** Normalized absolute path */
  readonly path: NormalizedPath;

  /** File extension including dot */
  readonly extension: string;

  /** Base name without extension */
  readonly baseName: string;

  /** Directory containing the file */
  readonly directory: NormalizedPath;

  /** File type classification */
  readonly type: ProjectFileType;
}

/**
 * Classification of project files.
 */
export type ProjectFileType =
  | "source"      // .ts, .js, .tsx, .jsx
  | "template"    // .html
  | "stylesheet"  // .css, .scss, .sass, .less
  | "config"      // tsconfig.json, package.json
  | "other";

/**
 * File extensions by type.
 */
export const FILE_EXTENSIONS: Record<ProjectFileType, readonly string[]> = {
  source: [".ts", ".js", ".tsx", ".jsx", ".mts", ".mjs"],
  template: [".html", ".htm"],
  stylesheet: [".css", ".scss", ".sass", ".less", ".styl"],
  config: [".json"],
  other: [],
};

/**
 * Default extensions for sibling detection.
 */
export const DEFAULT_TEMPLATE_EXTENSIONS = [".html"] as const;
export const DEFAULT_STYLE_EXTENSIONS = [".css", ".scss", ".sass", ".less", ".styl"] as const;

// ============================================================================
// Directory Conventions
// ============================================================================

/**
 * Directory convention configuration.
 *
 * Aurelia projects can use directory structure for resource scoping:
 * - `src/resources/` → global resources
 * - `src/components/` → component library
 * - `src/pages/` → route components
 */
export interface DirectoryConvention {
  /** Glob pattern for the directory (e.g., 'src/resources/**') */
  readonly pattern: string;

  /** Human-readable description */
  readonly description?: string;

  /** Scope for resources in this directory */
  readonly scope: DirectoryScope;

  /** Priority (higher wins when patterns overlap) */
  readonly priority: number;
}

/**
 * Scope assigned to resources in a convention directory.
 */
export type DirectoryScope =
  | { readonly kind: "global" }                           // Root container registration
  | { readonly kind: "local"; readonly parent?: string }  // Local to a component
  | { readonly kind: "router" }                           // Router-managed (routes)
  | { readonly kind: "plugin"; readonly plugin: string }; // Plugin-managed

/**
 * Result of matching a file against directory conventions.
 */
export interface DirectoryMatch {
  /** The matched convention */
  readonly convention: DirectoryConvention;

  /** Relative path within the convention directory */
  readonly relativePath: string;

  /** Derived resource scope */
  readonly scope: DirectoryScope;
}

/**
 * Default directory conventions.
 * Projects can override or extend these.
 */
export const DEFAULT_DIRECTORY_CONVENTIONS: readonly DirectoryConvention[] = [
  {
    pattern: "**/resources/**",
    description: "Global resources directory",
    scope: { kind: "global" },
    priority: 10,
  },
  {
    pattern: "**/shared/**",
    description: "Shared components directory",
    scope: { kind: "global" },
    priority: 5,
  },
];

// ============================================================================
// File Pairing
// ============================================================================

/**
 * A paired set of files that form a component.
 *
 * Aurelia components can consist of:
 * - View-model (.ts) + Template (.html)
 * - View-model (.ts) + Template (.html) + Stylesheet (.css)
 */
export interface FilePair {
  /** Primary source file (view-model) */
  readonly source: ProjectFile;

  /** Associated template file (optional - may be inline) */
  readonly template?: ProjectFile;

  /** Associated stylesheet (optional) */
  readonly stylesheet?: ProjectFile;

  /** How the pairing was detected */
  readonly detection: PairingDetection;
}

/**
 * How file pairing was detected.
 */
export type PairingDetection =
  | { readonly kind: "import"; readonly importPath: string }  // import template from './foo.html'
  | { readonly kind: "sibling" }                               // foo.ts + foo.html as adjacent files
  | { readonly kind: "decorator"; readonly property: string }  // @customElement({ template: ... })
  | { readonly kind: "static-au" };                            // static $au = { template: ... }

// ============================================================================
// Project Structure
// ============================================================================

/**
 * Detected project structure information.
 */
export interface ProjectStructure {
  /** Project root directory */
  readonly root: NormalizedPath;

  /** Source directories (from tsconfig include) */
  readonly sourceDirs: readonly NormalizedPath[];

  /** All source files */
  readonly sourceFiles: readonly ProjectFile[];

  /** All template files */
  readonly templateFiles: readonly ProjectFile[];

  /** All stylesheet files */
  readonly stylesheetFiles: readonly ProjectFile[];

  /** Detected file pairs */
  readonly filePairs: readonly FilePair[];

  /** Matched directory conventions */
  readonly conventionMatches: ReadonlyMap<NormalizedPath, DirectoryMatch>;

  /** Orphan templates (no matching source file) */
  readonly orphanTemplates: readonly ProjectFile[];

  /** Orphan sources (no matching template, may be intentional) */
  readonly orphanSources: readonly ProjectFile[];
}

// ============================================================================
// Scanner Options
// ============================================================================

/**
 * Options for project scanning.
 */
export interface ProjectScannerOptions {
  /** Project root directory */
  readonly root: NormalizedPath;

  /** Source file patterns (globs) */
  readonly sourcePatterns?: readonly string[];

  /** Template file patterns (globs) */
  readonly templatePatterns?: readonly string[];

  /** Directories to exclude */
  readonly exclude?: readonly string[];

  /** Directory conventions to apply */
  readonly conventions?: readonly DirectoryConvention[];

  /** Whether to detect file pairs */
  readonly detectPairs?: boolean;

  /** Whether to detect orphans */
  readonly detectOrphans?: boolean;

  /** Optional trace for performance instrumentation */
  readonly trace?: CompileTrace;
}

/**
 * Default scanner options.
 */
export const DEFAULT_SCANNER_OPTIONS: Omit<Required<ProjectScannerOptions>, "root" | "trace"> = {
  sourcePatterns: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"],
  templatePatterns: ["**/*.html"],
  exclude: ["node_modules", "dist", ".git", "coverage"],
  conventions: DEFAULT_DIRECTORY_CONVENTIONS,
  detectPairs: true,
  detectOrphans: true,
};

// ============================================================================
// Project-Level Extraction Options
// ============================================================================

/**
 * Base extraction options for project-level file system operations.
 *
 * This is the TypeScript-agnostic version used at the project layer.
 * For TypeScript-aware extraction, use ExtractionOptions from extraction/.
 *
 * Exported as ProjectExtractionOptions from project/index.ts.
 */
export interface ExtractionOptions {
  /** File system context for sibling detection */
  readonly fileSystem?: import("./context.js").FileSystemContext;

  /** Template extensions to look for as siblings */
  readonly templateExtensions?: readonly string[];

  /** Style extensions to look for as siblings */
  readonly styleExtensions?: readonly string[];

  /** Whether to resolve import paths */
  readonly resolveImports?: boolean;
}

/**
 * Default extraction options.
 */
export const DEFAULT_EXTRACTION_OPTIONS: Required<Omit<ExtractionOptions, "fileSystem">> = {
  templateExtensions: DEFAULT_TEMPLATE_EXTENSIONS,
  styleExtensions: DEFAULT_STYLE_EXTENSIONS,
  resolveImports: true,
};
