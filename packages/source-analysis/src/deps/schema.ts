import type {
  SnapshotFrontierEvidence,
  SnapshotProfileProvenance,
} from '../snapshots.js';

/**
 * Schema for the dependency graph JSON produced by `pnpm deps`.
 *
 * ## Scope and known blind spots
 *
 * This graph captures **static TypeScript import/export statements** resolved
 * by the TypeScript compiler API against every tsconfig.json in aurelia-ls2.
 *
 * What the graph DOES cover:
 * - All `import`/`export` declarations with resolved file targets
 * - Imported symbol names (the seam surface)
 * - Cross-package edges through workspace symlinks (with `dts_target` flag)
 * - Barrel file detection (`via_barrel` flag)
 *
 * Known blind spots — run `pnpm deps:query blindspots` to inspect these:
 * - **Unresolved imports**: relative specifiers that TypeScript couldn't resolve.
 *   Listed in `unresolved_imports`; these are seam edges that should exist but don't.
 * - **Uncovered files**: `.ts`/`.tsx` files in the repo not included by any
 *   tsconfig.json. Listed in `uncovered_files`; these are invisible to the graph.
 * - **Barrel indirection**: edges flagged `via_barrel` point at an `index.ts`
 *   re-export file, not the actual defining module. The `bindings` are correct
 *   but the `target` path obscures the real producer. Use `blindspots` to see
 *   which directories are most affected.
 * - **Coupling matrix coverage**: auto-detected only for packages matching
 *   `packages/X/src/SUBSYSTEM/...` with 2+ subsystems. Packages with
 *   non-standard layouts get no coupling matrix; `blindspots` lists these.
 *
 * ## How to use this file
 *
 * Read this file to understand the JSON structure, then use `pnpm deps:query`
 * to extract focused slices. You never need to read the full JSON.
 *
 * ## Query tool (`pnpm deps:query <command> [args]`)
 *
 * Start with calibration — know what the graph can and cannot see:
 *
 *   stale                       Check if JSON needs regeneration
 *   blindspots                  Unresolved imports, uncovered files, barrel stats
 *
 * Then discover what's queryable:
 *
 *   summary                     High-level stats and available scopes
 *   packages                    List packages with their subsystem names and edge counts
 *   dirs [prefix] [depth]       Browse directories with internal/inbound/outbound stats
 *   files [prefix]              List files ranked by total edge count
 *
 * Then drill into specifics:
 *
 *   seam <from-dir> <to-dir>    Edges crossing a boundary, with imported symbols
 *   bindings <from-dir> <to-dir>  Unique symbols imported across a boundary
 *   who-imports <symbol>        All files that import a given symbol name
 *   cone <file-or-dir>         Transitive impact cone (what breaks if this changes?)
 *   symbol-cone <symbol>       Transitive impact cone for a symbol name
 *   matrix [scope]              Coupling matrix (default: packages/compiler)
 *   cycles                      Directory-level strongly connected components
 *   profile <dir>               Internal/inbound/outbound edge counts for a directory
 *   file <path>                 All imports from and to a specific file
 *   orphans                     Classified orphan files (entry points, leaves, islands)
 *   externals [dir]             Third-party packages imported by a directory
 *   cross-package               All package-to-package seams with symbol counts
 *   test-coverage [dir]         Which production files are exercised by tests
 *
 * Typical workflow:
 *   0. `blindspots`      → calibrate: know what the graph can't see
 *   1. `packages`         → learn the vocabulary (subsystem names)
 *   2. `dirs <package>`   → see which directories matter (ranked by edge activity)
 *   3. `matrix <package>` → see how subsystems couple, with symbol counts
 *   4. `bindings X Y`     → get the exact symbols at a seam you care about
 *   5. `file <path>`      → zoom into one file's full import/export picture
 *
 * Examples for derivation work:
 *
 *   # What symbols cross from analysis/ to model/ inside the compiler?
 *   pnpm deps:query bindings packages/compiler/src/analysis packages/compiler/src/model
 *
 *   # What does semantic-workspace depend on from the compiler?
 *   pnpm deps:query seam packages/semantic-workspace/src packages/compiler/out
 *
 *   # Show the compiler's internal subsystem coupling
 *   pnpm deps:query matrix packages/compiler
 *
 *   # Is there a cycle involving synthesis/ and analysis/?
 *   pnpm deps:query cycles
 *
 *   # What does a specific file import?
 *   pnpm deps:query file packages/compiler/src/analysis/10-lower/lower.ts
 *
 * ## JSON structure overview
 *
 * The output JSON has these top-level sections, each independently loadable:
 *
 * - `edges`              — every import between files inside the repo
 * - `external_imports`   — imports of third-party packages
 * - `unresolved_imports` — relative specifiers that failed to resolve (blind spot)
 * - `uncovered_files`    — .ts/.tsx files not in any tsconfig (blind spot)
 * - `directory_crossings`— aggregated edges between directory pairs at every depth
 * - `directory_profiles` — per-directory coupling summary
 * - `orphans`            — files with no inbound/outbound imports
 * - `cycles`             — directory-level strongly connected components
 * - `coupling_matrices`  — subsystem-to-subsystem coupling per package
 */

// ── Core edge types ─────────────────────────────────────────────────────

/** A resolved import between two files inside the repo. */
export interface OutputEdge {
  /** Repo-relative path of the importing file. */
  source: string;
  /** Repo-relative path of the imported file. */
  target: string;
  /** The raw import specifier as written in source (e.g. `"./model/ir.js"`). */
  specifier: string;
  /**
   * Exported symbol names consumed by this import.
   * - Named imports: `["Foo", "Bar"]` (uses the exported name, not local alias)
   * - Default import: `["default"]`
   * - Namespace import: `["*"]`
   * - Star re-export: `["*"]`
   * - Side-effect import (`import "mod"`): `[]`
   * - Dynamic `import()`: `[]` (symbols not statically extractable)
   *
   * For derivation work, this is the seam surface — the specific API points
   * that a consumer depends on from a producer.
   */
  bindings: string[];
  /** True if the import uses `import type` / `export type`. */
  type_only: boolean;
  /** Source line number of the import statement (1-based). */
  line: number;
  /** True if `target` is a barrel file (index.ts with only re-exports). */
  via_barrel?: true;
  /** True if `target` is a `.d.ts` declaration file (cross-package via workspace symlink). */
  dts_target?: true;
}

/** An import of a third-party (non-workspace) package. */
export interface ExternalImport {
  source: string;
  /** Package name (e.g. `"typescript"`, `"@aurelia/runtime-html"`). */
  package: string;
  specifier: string;
}

/** A relative import specifier that TypeScript could not resolve.
 *  These represent edges that should exist in the graph but don't. */
export interface UnresolvedImport {
  /** Repo-relative path of the file containing the import. */
  source: string;
  /** The import specifier that failed to resolve (always relative). */
  specifier: string;
  /** Source line number of the import statement (1-based). */
  line: number;
}

// ── Aggregated analyses ─────────────────────────────────────────────────

/**
 * Edges between a directory pair, aggregated at a specific depth.
 * Sorted by count descending. Used to identify high-traffic integration seams.
 */
export interface DirectoryCrossing {
  from_dir: string;
  to_dir: string;
  count: number;
  type_only_count: number;
  /** Individual edges as `"source:line -> target"` strings. */
  edges: string[];
}

/** Per-directory coupling summary. */
export interface DirectoryProfile {
  dir: string;
  /** Edges where both source and target are inside this directory. */
  internal_edges: number;
  /** Edges where only the target is inside this directory. */
  inbound_edges: number;
  /** Edges where only the source is inside this directory. */
  outbound_edges: number;
  /** Third-party packages imported by files in this directory. */
  external_packages: string[];
}

/**
 * A strongly connected component in the directory-level dependency graph.
 * Any cycle group with >1 directory means circular dependencies exist.
 * Sorted by edge_count descending.
 */
export interface CycleGroup {
  directories: string[];
  edge_count: number;
  edges: Array<{ from: string; to: string; count: number }>;
}

/**
 * Subsystem-to-subsystem coupling within a package.
 * Auto-detected for packages with 2+ subdirectories under `src/`.
 * Each cell shows how many edges cross from one subsystem to another,
 * plus the union of all imported symbol names.
 */
export interface CouplingCell {
  from: string;
  to: string;
  edge_count: number;
  type_only_count: number;
  /** Union of all bindings across edges in this cell. The seam surface. */
  bindings: string[];
}

export interface CouplingMatrix {
  /** Package path (e.g. `"packages/compiler"`). */
  scope: string;
  cells: CouplingCell[];
}

// ── Root output ─────────────────────────────────────────────────────────

export interface DepsOutput {
  root: string;
  generated_at: string;
  /** HEAD commit of the analyzed repo (aurelia-ls2) when this was generated. */
  source_commit: string;
  /** Git blob hash of src/dependency-graph.ts when this was generated. */
  analyzer_commit: string;
  /** Profile and exclusion regime used to derive this snapshot. */
  profile: SnapshotProfileProvenance;
  /** Explicit frontier evidence named during snapshot generation. */
  frontiers: SnapshotFrontierEvidence;
  tsconfigs: string[];
  summary: {
    files_analyzed: number;
    internal_edges: number;
    external_imports: number;
    unresolved: number;
    /** Count of .ts/.tsx files in the repo not included by any tsconfig. */
    uncovered_files: number;
  };
  edges: OutputEdge[];
  external_imports: ExternalImport[];
  /** Relative import specifiers that failed to resolve — missing graph edges. */
  unresolved_imports: UnresolvedImport[];
  /** Repo-relative paths of .ts/.tsx files not included by any tsconfig. */
  uncovered_files: string[];
  directory_crossings: DirectoryCrossing[];
  directory_profiles: DirectoryProfile[];
  orphans: {
    no_inbound: string[];
    no_outbound: string[];
  };
  cycles: CycleGroup[];
  coupling_matrices: CouplingMatrix[];
}
