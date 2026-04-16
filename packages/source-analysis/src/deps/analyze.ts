/**
 * Import dependency graph analyzer for TypeScript monorepos.
 *
 * Three edge cases in monorepo TypeScript module resolution that could
 * produce a misleading dependency graph:
 *
 * 1. Cross-package imports resolve to .d.ts declaration files, not source.
 *    In a project-reference monorepo, `@aurelia-ls/compiler` resolves through
 *    node_modules workspace symlinks to compiled declarations (out/*.d.ts),
 *    not the .ts source.
 *    → Mitigation: follow symlinks with realpathSync. If the real path is
 *      inside the repo, classify as internal (with dts_target flag if .d.ts).
 *      This surfaces cross-package edges in directory crossings and profiles.
 *
 * 2. Barrel files (index.ts re-exports) collapse the dependency graph.
 *    Importing from `schema/index.ts` records one edge to the barrel, not
 *    to the N underlying modules that define the imported symbols. The barrel
 *    becomes a false hotspot with inflated inbound edges, while the real
 *    dependency targets appear orphaned.
 *    → Mitigation: detect barrel files (index.ts with only re-export
 *      statements) and flag edges with `via_barrel: true`.
 *
 * 3. Package.json `exports` field resolution ambiguity.
 *    The `exports` map may route the same specifier to different files
 *    depending on conditions (types vs import vs require). If workspace
 *    symlinks aren't materialized or the `exports` map changes, resolution
 *    silently falls back to a different file or fails entirely.
 *    → Mitigation: use TypeScript's built-in module resolution (which
 *      respects `exports` and project references); validate that key
 *      subsystems produce plausible edge counts before accepting output.
 */

import * as ts from "typescript";
import { resolve, relative, dirname } from "node:path";
import { realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { ProgramReuseOptions } from '../program-reuse-options.js';
import type { DepsOutput } from './schema.js';
import { RepoSession } from '../repo-session.js';
import { describeSnapshotProfile } from '../snapshots.js';
import {
  scanParsedTsconfigSourceFiles,
  type ParsedTsconfigSourceFileScanResult,
} from '../tsconfig-source-files.js';

// ── Types ──────────────────────────────────────────────────────────────

interface InternalEdge {
  source: string;
  target: string;
  specifier: string;
  bindings: string[];
  type_only: boolean;
  via_barrel?: true;
  dts_target?: true;
  line: number;
}

interface ExternalImport {
  source: string;
  package: string;
  specifier: string;
}

interface DirectoryCrossing {
  from_dir: string;
  to_dir: string;
  count: number;
  type_only_count: number;
  edges: string[];
}

interface DirectoryProfile {
  dir: string;
  internal_edges: number;
  inbound_edges: number;
  outbound_edges: number;
  external_packages: string[];
}

interface OutputEdge {
  source: string;
  target: string;
  specifier: string;
  bindings: string[];
  type_only: boolean;
  line: number;
  via_barrel?: true;
  dts_target?: true;
}

interface CycleGroup {
  directories: string[];
  edge_count: number;
  edges: Array<{ from: string; to: string; count: number }>;
}

interface CouplingCell {
  from: string;
  to: string;
  edge_count: number;
  type_only_count: number;
  bindings: string[];
}

interface CouplingMatrix {
  scope: string;
  cells: CouplingCell[];
}

export interface DepsAnalysisResult {
  output: DepsOutput;
  reportLines: string[];
  warnings: string[];
}

let session: RepoSession | null = null;
let repoPath = resolve(process.cwd());
let analyzed = new Set<string>();
let allEdges: InternalEdge[] = [];
let allExternals: ExternalImport[] = [];
let allUnresolved: UnresolvedImport[] = [];
let sourceFileMap = new Map<string, ts.SourceFile>();
let usedTsconfigs: string[] = [];
let barrelFiles = new Set<string>();

// ── Utilities ──────────────────────────────────────────────────────────

function toForwardSlash(p: string): string {
  return p.replace(/\\/g, "/");
}

function toRepoRelative(absPath: string): string {
  return toForwardSlash(relative(repoPath, absPath));
}

function requireSession(): RepoSession {
  if (!session) {
    throw new Error('source-analysis deps session is not initialized');
  }
  return session;
}

function isInSubmodule(relPath: string): boolean {
  return requireSession().isInSubmodule(relPath);
}

function isExcludedRepoRelativePath(relPath: string): boolean {
  return requireSession().isExcludedRepoRelativePath(relPath);
}

function getPackageName(specifier: string): string {
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split("/")[0] ?? specifier;
}

function isInSubtree(filePath: string, dir: string): boolean {
  return filePath.startsWith(dir + "/");
}

function fileDirParts(filePath: string): string[] {
  const d = dirname(filePath);
  return d === "." ? [] : d.split("/");
}

// ── Module resolution host ─────────────────────────────────────────────

const resolutionHost: ts.ModuleResolutionHost = {
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  directoryExists: ts.sys.directoryExists,
  getCurrentDirectory: () => repoPath,
  getDirectories: ts.sys.getDirectories,
  realpath: ts.sys.realpath,
};

// ── Import extraction ──────────────────────────────────────────────────

interface UnresolvedImport {
  source: string;
  specifier: string;
  line: number;
}

function extractImports(
  sf: ts.SourceFile,
  sourceRel: string,
  options: ts.CompilerOptions,
  cache: ts.ModuleResolutionCache,
): void {
  function extractBindings(node: ts.ImportDeclaration | ts.ExportDeclaration): string[] {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      if (!clause) return []; // side-effect import: import "mod"
      const names: string[] = [];
      if (clause.name) names.push("default");
      if (clause.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) {
          names.push("*");
        } else {
          for (const el of clause.namedBindings.elements) {
            // propertyName is the exported name; name is the local alias
            names.push((el.propertyName ?? el.name).text);
          }
        }
      }
      return names.sort();
    }
    // ExportDeclaration
    if (!node.exportClause) return ["*"]; // export * from "mod"
    if (ts.isNamedExports(node.exportClause)) {
      return node.exportClause.elements
        .map((el) => (el.propertyName ?? el.name).text)
        .sort();
    }
    return [];
  }

  function processSpecifier(
    specNode: ts.Expression,
    typeOnly: boolean,
    line: number,
    bindings: string[],
  ): void {
    if (!ts.isStringLiteral(specNode)) return;
    const specifier = specNode.text;

    const resolved = ts.resolveModuleName(specifier, sf.fileName, options, resolutionHost, cache);

    if (resolved.resolvedModule) {
      const rm = resolved.resolvedModule;
      if (rm.isExternalLibraryImport) {
        // Follow symlinks: workspace packages resolve through node_modules
        // but their real path is inside the repo.
        let realTarget: string | undefined;
        try {
          const real = toForwardSlash(realpathSync(rm.resolvedFileName));
        const rel = toRepoRelative(real);
          if (
            !rel.startsWith("..") &&
            !isInSubmodule(rel) &&
            !isExcludedRepoRelativePath(rel) &&
            !rel.includes("node_modules/")
          ) {
            realTarget = rel;
          }
        } catch {
          // realpathSync can fail if the file doesn't exist on disk
        }
        if (realTarget !== undefined) {
          const edge: InternalEdge = {
            source: sourceRel,
            target: realTarget,
            specifier,
            bindings,
            type_only: typeOnly,
            line,
          };
          if (realTarget.endsWith(".d.ts")) {
            edge.dts_target = true;
          }
          allEdges.push(edge);
        } else {
          allExternals.push({ source: sourceRel, package: getPackageName(specifier), specifier });
        }
      } else {
        const targetRel = toRepoRelative(rm.resolvedFileName);
        if (
          targetRel.startsWith("..") ||
          isInSubmodule(targetRel) ||
          isExcludedRepoRelativePath(targetRel) ||
          targetRel.includes("node_modules/")
        ) {
          // Outside repo, inside a submodule, or inside node_modules → external
          if (!isExcludedRepoRelativePath(targetRel)) {
            allExternals.push({ source: sourceRel, package: getPackageName(specifier), specifier });
          }
        } else {
          const edge: InternalEdge = {
            source: sourceRel,
            target: targetRel,
            specifier,
            bindings,
            type_only: typeOnly,
            line,
          };
          if (rm.resolvedFileName.endsWith(".d.ts")) {
            edge.dts_target = true;
          }
          allEdges.push(edge);
        }
      }
    } else {
      // Relative/absolute specifier that failed to resolve → truly unresolved
      if (specifier.startsWith(".") || specifier.startsWith("/")) {
        allUnresolved.push({ source: sourceRel, specifier, line });
      } else {
        // Non-relative specifier (package name) without resolution → external
        allExternals.push({ source: sourceRel, package: getPackageName(specifier), specifier });
      }
    }
  }

  ts.forEachChild(sf, function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      const typeOnly = node.importClause?.isTypeOnly ?? false;
      const bindings = extractBindings(node);
      processSpecifier(node.moduleSpecifier, typeOnly, line, bindings);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      const bindings = extractBindings(node);
      processSpecifier(node.moduleSpecifier, node.isTypeOnly, line, bindings);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0
    ) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      processSpecifier(node.arguments[0]!, false, line, []);
    }
    ts.forEachChild(node, visit);
  });
}

// ── Program creation per tsconfig ──────────────────────────────────────

// ── Barrel detection ───────────────────────────────────────────────────

function isBarrelFile(rel: string): boolean {
  if (!rel.endsWith("/index.ts") && rel !== "index.ts") return false;
  const sf = sourceFileMap.get(rel);
  if (!sf) return false;

  let hasReExports = false;
  for (const stmt of sf.statements) {
    if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier) {
      hasReExports = true;
      continue;
    }
    // Allow import declarations (may feed into re-exports)
    if (ts.isImportDeclaration(stmt)) continue;
    // Any other statement → not a pure barrel
    return false;
  }
  return hasReExports;
}

// ── Directory crossings ────────────────────────────────────────────────

function computeDirectoryCrossings(): DirectoryCrossing[] {
  const map = new Map<string, { count: number; type_only_count: number; edges: string[] }>();

  for (const edge of allEdges) {
    const srcParts = fileDirParts(edge.source);
    const tgtParts = fileDirParts(edge.target);

    // Find common prefix length
    let common = 0;
    while (
      common < srcParts.length &&
      common < tgtParts.length &&
      srcParts[common] === tgtParts[common]
    ) {
      common++;
    }

    // Same directory → no crossing
    if (common === srcParts.length && common === tgtParts.length) continue;

    // Record crossings at each depth below the common prefix
    const maxDepth = Math.max(srcParts.length, tgtParts.length);
    for (let depth = common + 1; depth <= maxDepth; depth++) {
      const fromDir = srcParts.slice(0, Math.min(depth, srcParts.length)).join("/");
      const toDir = tgtParts.slice(0, Math.min(depth, tgtParts.length)).join("/");
      if (fromDir === toDir) continue;

      const key = `${fromDir}\0${toDir}`;
      let entry = map.get(key);
      if (!entry) {
        entry = { count: 0, type_only_count: 0, edges: [] };
        map.set(key, entry);
      }
      entry.count++;
      if (edge.type_only) entry.type_only_count++;
      entry.edges.push(`${edge.source}:${edge.line} -> ${edge.target}`);
    }
  }

  const crossings: DirectoryCrossing[] = [];
  for (const [key, val] of map) {
    const [from_dir = '', to_dir = ''] = key.split("\0");
    val.edges.sort();
    crossings.push({
      from_dir,
      to_dir,
      count: val.count,
      type_only_count: val.type_only_count,
      edges: val.edges,
    });
  }
  crossings.sort(
    (a, b) =>
      b.count - a.count ||
      a.from_dir.localeCompare(b.from_dir) ||
      a.to_dir.localeCompare(b.to_dir),
  );
  return crossings;
}

// ── Directory profiles ─────────────────────────────────────────────────

function computeDirectoryProfiles(): DirectoryProfile[] {
  // Collect every directory that contains at least one analyzed file
  const allDirs = new Set<string>();
  for (const filePath of analyzed) {
    const parts = fileDirParts(filePath);
    for (let i = 1; i <= parts.length; i++) {
      allDirs.add(parts.slice(0, i).join("/"));
    }
  }

  const profiles: DirectoryProfile[] = [];
  for (const dir of allDirs) {
    let internal = 0;
    let inbound = 0;
    let outbound = 0;
    const extPkgs = new Set<string>();

    for (const edge of allEdges) {
      const srcIn = isInSubtree(edge.source, dir);
      const tgtIn = isInSubtree(edge.target, dir);
      if (srcIn && tgtIn) internal++;
      else if (srcIn && !tgtIn) outbound++;
      else if (!srcIn && tgtIn) inbound++;
    }

    for (const ext of allExternals) {
      if (isInSubtree(ext.source, dir)) {
        extPkgs.add(ext.package);
      }
    }

    profiles.push({
      dir,
      internal_edges: internal,
      inbound_edges: inbound,
      outbound_edges: outbound,
      external_packages: [...extPkgs].sort(),
    });
  }

  profiles.sort((a, b) => a.dir.localeCompare(b.dir));
  return profiles;
}

// ── Orphans ────────────────────────────────────────────────────────────

function computeOrphans(): { no_inbound: string[]; no_outbound: string[] } {
  const hasInbound = new Set<string>();
  const hasOutbound = new Set<string>();

  for (const edge of allEdges) {
    hasOutbound.add(edge.source);
    hasInbound.add(edge.target);
  }

  const noInbound: string[] = [];
  const noOutbound: string[] = [];
  for (const file of analyzed) {
    if (!hasInbound.has(file)) noInbound.push(file);
    if (!hasOutbound.has(file)) noOutbound.push(file);
  }

  noInbound.sort();
  noOutbound.sort();
  return { no_inbound: noInbound, no_outbound: noOutbound };
}

// ── Cycle detection (Tarjan's SCC) ──────────────────────────────────────

function computeCycles(): CycleGroup[] {
  // Build directed graph at leaf directory level
  const dirEdges = new Map<string, Map<string, number>>();
  for (const edge of allEdges) {
    const srcDir = dirname(edge.source);
    const tgtDir = dirname(edge.target);
    if (srcDir === tgtDir) continue;
    if (!dirEdges.has(srcDir)) dirEdges.set(srcDir, new Map());
    const targets = dirEdges.get(srcDir)!;
    targets.set(tgtDir, (targets.get(tgtDir) || 0) + 1);
  }

  const allDirNodes = new Set<string>();
  for (const [src, targets] of dirEdges) {
    allDirNodes.add(src);
    for (const tgt of targets.keys()) allDirNodes.add(tgt);
  }

  // Tarjan's algorithm
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const sccs: string[][] = [];

  function strongConnect(v: string): void {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    const successors = dirEdges.get(v);
    if (successors) {
      for (const w of successors.keys()) {
        if (!indices.has(w)) {
          strongConnect(w);
          lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
        } else if (onStack.has(w)) {
          lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
        }
      }
    }

    if (lowlinks.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      if (scc.length > 1) sccs.push(scc);
    }
  }

  for (const node of allDirNodes) {
    if (!indices.has(node)) strongConnect(node);
  }

  // Build output with edge detail per cycle
  return sccs.map((scc) => {
    const sccSet = new Set(scc);
    const edges: Array<{ from: string; to: string; count: number }> = [];
    let totalEdges = 0;
    for (const dir of scc) {
      const targets = dirEdges.get(dir);
      if (!targets) continue;
      for (const [tgt, count] of targets) {
        if (sccSet.has(tgt)) {
          edges.push({ from: dir, to: tgt, count });
          totalEdges += count;
        }
      }
    }
    edges.sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));
    return {
      directories: scc.sort(),
      edge_count: totalEdges,
      edges,
    };
  }).sort((a, b) => b.edge_count - a.edge_count);
}

// ── Coupling matrices ───────────────────────────────────────────────────

function computeCouplingMatrices(): CouplingMatrix[] {
  // Auto-detect package scopes: find all unique "packages/X/src" prefixes
  // and build a coupling matrix for each package that has subsystem dirs
  const packageSubsystems = new Map<string, Set<string>>();

  for (const file of analyzed) {
    const parts = file.split("/");
    // Match packages/X/src/SUBSYSTEM/... pattern
    if (parts[0] === "packages" && parts[2] === "src" && parts.length >= 5) {
      const pkg = `${parts[0]}/${parts[1]}`;
      const subsystem = parts[3]!;
      if (!packageSubsystems.has(pkg)) packageSubsystems.set(pkg, new Set());
      packageSubsystems.get(pkg)!.add(subsystem);
    }
  }

  const matrices: CouplingMatrix[] = [];

  for (const [pkg, subsystems] of packageSubsystems) {
    if (subsystems.size < 2) continue; // no coupling to report

    const prefix = `${pkg}/src/`;
    const cells = new Map<string, { count: number; type_only: number; bindings: Set<string> }>();

    for (const edge of allEdges) {
      if (!edge.source.startsWith(prefix) || !edge.target.startsWith(prefix)) continue;
      const [srcSub = ''] = edge.source.slice(prefix.length).split("/");
      const [tgtSub = ''] = edge.target.slice(prefix.length).split("/");
      if (srcSub === tgtSub) continue;
      if (!subsystems.has(srcSub) || !subsystems.has(tgtSub)) continue;

      const key = `${srcSub}\0${tgtSub}`;
      let cell = cells.get(key);
      if (!cell) {
        cell = { count: 0, type_only: 0, bindings: new Set() };
        cells.set(key, cell);
      }
      cell.count++;
      if (edge.type_only) cell.type_only++;
      for (const b of edge.bindings) cell.bindings.add(b);
    }

    const cellList: CouplingCell[] = [];
    for (const [key, val] of cells) {
      const [from = '', to = ''] = key.split("\0");
      cellList.push({
        from,
        to,
        edge_count: val.count,
        type_only_count: val.type_only,
        bindings: [...val.bindings].sort(),
      });
    }
    cellList.sort((a, b) => b.edge_count - a.edge_count || a.from.localeCompare(b.from));

    matrices.push({ scope: pkg, cells: cellList });
  }

  matrices.sort((a, b) => a.scope.localeCompare(b.scope));
  return matrices;
}

function gitHead(cwd: string): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: "utf-8",
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return "unknown";
  }
}

function gitBlobHash(filePath: string): string {
  try {
    return execFileSync('git', ['hash-object', filePath], {
      encoding: "utf-8",
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return "unknown";
  }
}

export function generateDepsAnalysis(
  nextSession: RepoSession,
  options: ProgramReuseOptions = {},
  sourceFileScan?: ParsedTsconfigSourceFileScanResult,
): DepsAnalysisResult {
  void options;
  session = nextSession;
  repoPath = nextSession.repoPath;
  analyzed = new Set();
  allEdges = [];
  allExternals = [];
  allUnresolved = [];
  sourceFileMap = new Map();
  usedTsconfigs = [];
  barrelFiles = new Set();

  const warnings: string[] = [];
  const { batches, warnings: scanWarnings } = sourceFileScan ?? scanParsedTsconfigSourceFiles(nextSession);
  warnings.push(...scanWarnings);
  if (batches.length === 0) {
    throw new Error(`no tsconfig.json files found in ${repoPath}`);
  }

  for (const batch of batches) {
    const { snapshot } = batch;
    usedTsconfigs.push(snapshot.relPath);

    const resolutionCache = ts.createModuleResolutionCache(
      snapshot.configDir,
      (f) => f.toLowerCase(),
      snapshot.parsed.options,
    );

    for (const file of batch.sourceFiles) {
      if (analyzed.has(file.relPath)) continue;
      analyzed.add(file.relPath);
      sourceFileMap.set(file.relPath, file.sourceFile);

      extractImports(file.sourceFile, file.relPath, snapshot.parsed.options, resolutionCache);
    }
  }

  if (usedTsconfigs.length === 0) {
    throw new Error(`no tsconfig.json files produced source files in ${repoPath}`);
  }

  const uncoveredFiles = nextSession
    .listRepoSourceFiles()
    .filter((filePath) => !analyzed.has(filePath))
    .sort();

  for (const rel of analyzed) {
    if (isBarrelFile(rel)) barrelFiles.add(rel);
  }

  for (const edge of allEdges) {
    if (barrelFiles.has(edge.target)) {
      edge.via_barrel = true;
    }
  }

  const dirCrossings = computeDirectoryCrossings();
  const dirProfiles = computeDirectoryProfiles();
  const orphans = computeOrphans();
  const cycles = computeCycles();
  const couplingMatrices = computeCouplingMatrices();

  allEdges.sort(
    (a, b) =>
      a.source.localeCompare(b.source) ||
      a.target.localeCompare(b.target) ||
      a.specifier.localeCompare(b.specifier),
  );
  allExternals.sort(
    (a, b) =>
      a.source.localeCompare(b.source) ||
      a.package.localeCompare(b.package) ||
      a.specifier.localeCompare(b.specifier),
  );

  const validationErrors: string[] = [];
  const isProductRepo = [...analyzed].some((filePath) => filePath.startsWith("packages/compiler/src/"));
  const strictValidation = process.env.STRICT_VALIDATION === '1' || isProductRepo;

  if (isProductRepo) {
    const compilerFiles = [...analyzed].filter((filePath) => filePath.startsWith("packages/compiler/src/"));
    if (compilerFiles.length === 0) {
      validationErrors.push("VALIDATION FAILED: packages/compiler/src/ produced no analyzed files");
    }

    const schemaInbound = allEdges.filter(
      (edge) =>
        isInSubtree(edge.target, "packages/compiler/src/schema") &&
        !isInSubtree(edge.source, "packages/compiler/src/schema"),
    );
    const schemaSourceDirs = new Set(
      schemaInbound.map((edge) => {
        const parts = edge.source.split("/");
        return parts.length > 3 ? parts.slice(0, 4).join("/") : dirname(edge.source);
      }),
    );
    if (schemaSourceDirs.size < 2) {
      validationErrors.push(
        `VALIDATION FAILED: packages/compiler/src/schema/ has inbound edges from ` +
          `${schemaSourceDirs.size} sibling directory subtree(s) (expected >=2)`,
      );
    }
  }

  if (strictValidation && (allEdges.length < 100 || allEdges.length > 50_000)) {
    validationErrors.push(
      `VALIDATION FAILED: total internal edges = ${allEdges.length} (expected 100–50000)`,
    );
  }

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join("\n"));
  }

  const output: DepsOutput = {
    root: toForwardSlash(repoPath),
    generated_at: new Date().toISOString(),
    source_commit: gitHead(repoPath),
    analyzer_commit: gitBlobHash(resolve(import.meta.dirname!, 'analyze.js')),
    profile: describeSnapshotProfile(nextSession.profile),
    tsconfigs: usedTsconfigs.slice().sort(),
    summary: {
      files_analyzed: analyzed.size,
      internal_edges: allEdges.length,
      external_imports: allExternals.length,
      unresolved: allUnresolved.length,
      uncovered_files: uncoveredFiles.length,
    },
    edges: allEdges.map((edge) => {
      const out: OutputEdge = {
        source: edge.source,
        target: edge.target,
        specifier: edge.specifier,
        bindings: edge.bindings,
        type_only: edge.type_only,
        line: edge.line,
      };
      if (edge.via_barrel) out.via_barrel = true;
      if (edge.dts_target) out.dts_target = true;
      return out;
    }),
    external_imports: allExternals.slice(),
    unresolved_imports: allUnresolved
      .slice()
      .sort((a, b) => a.source.localeCompare(b.source) || a.line - b.line),
    uncovered_files: uncoveredFiles,
    directory_crossings: dirCrossings,
    directory_profiles: dirProfiles,
    orphans,
    cycles,
    coupling_matrices: couplingMatrices,
  };

  const reportLines = [
    "",
    `Snapshot target:    ${output.profile.target}`,
    `Profile:            ${output.profile.profileId}${output.profile.profilePath ? ` (${output.profile.profilePath})` : ''}`,
    `Excluded prefixes:  ${output.profile.excludedRepoRelativePrefixes.length}`,
    "",
    `Files analyzed:     ${analyzed.size}`,
    `Internal edges:     ${allEdges.length}`,
    `External imports:   ${allExternals.length}`,
    `Unresolved:         ${allUnresolved.length}`,
    `Uncovered files:    ${uncoveredFiles.length}`,
    `Barrel files:       ${barrelFiles.size}`,
    `Tsconfigs used:     ${usedTsconfigs.length}`,
    `Directory cycles:   ${cycles.length}`,
    "",
    "Top 20 directory crossings by edge count:",
    ...dirCrossings
      .slice(0, 20)
      .map((crossing) => `  ${crossing.count.toString().padStart(6)} edges  ${crossing.from_dir} -> ${crossing.to_dir}`),
    "",
  ];

  if (cycles.length > 0) {
    reportLines.push("Directory cycles (strongly connected components):");
    for (const cyc of cycles.slice(0, 10)) {
      reportLines.push(`  ${cyc.edge_count} edges among ${cyc.directories.length} dirs:`);
      for (const dir of cyc.directories.slice(0, 8)) {
        reportLines.push(`    ${dir}`);
      }
      if (cyc.directories.length > 8) {
        reportLines.push(`    ... and ${cyc.directories.length - 8} more`);
      }
    }
    reportLines.push("");
  }

  for (const matrix of couplingMatrices) {
    reportLines.push(`Coupling matrix: ${matrix.scope}`);
    for (const cell of matrix.cells.slice(0, 15)) {
      reportLines.push(
        `  ${cell.edge_count.toString().padStart(4)} edges  ${cell.from} -> ${cell.to}` +
          `  (${cell.bindings.length} symbols)`,
      );
    }
    if (matrix.cells.length > 15) {
      reportLines.push(`  ... and ${matrix.cells.length - 15} more`);
    }
    reportLines.push("");
  }

  reportLines.push("Top 10 files with no inbound imports:");
  reportLines.push(...orphans.no_inbound.slice(0, 10).map((filePath) => `  ${filePath}`));
  reportLines.push("");

  analyzed = new Set();
  allEdges = [];
  allExternals = [];
  allUnresolved = [];
  sourceFileMap = new Map();
  usedTsconfigs = [];
  barrelFiles = new Set();

  return {
    output,
    reportLines,
    warnings,
  };
}
