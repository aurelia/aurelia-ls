/**
 * Import dependency graph analyzer for TypeScript monorepos.
 *
 * This projection now materializes from the shared structural claim graph
 * rather than owning its own extraction state.
 */

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

import type { ProgramReuseOptions } from '../program-reuse-options.js';
import { collectSnapshotFrontierEvidence } from '../frontier-evidence.js';
import { RepoSession } from '../repo-session.js';
import { describeSnapshotProfile } from '../snapshots.js';
import {
  buildStructuralClaimGraph,
  type StructuralClaimGraphRuntime,
} from '../structural-claim-graph.js';
import type { DepsOutput } from './schema.js';
import type { ParsedTsconfigSourceFileScanResult } from '../tsconfig-source-files.js';

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

interface UnresolvedImport {
  source: string;
  specifier: string;
  line: number;
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

interface MaterializedDepsClaims {
  analyzed: Set<string>;
  allEdges: InternalEdge[];
  allExternals: ExternalImport[];
  allUnresolved: UnresolvedImport[];
  usedTsconfigs: string[];
  barrelFiles: Set<string>;
}

export interface DepsAnalysisResult {
  output: DepsOutput;
  reportLines: string[];
  warnings: string[];
}

function toForwardSlash(pathValue: string): string {
  return pathValue.replace(/\\/g, '/');
}

function isInSubtree(filePath: string, dir: string): boolean {
  return filePath.startsWith(`${dir}/`);
}

function fileDirParts(filePath: string): string[] {
  const dir = dirname(filePath);
  return dir === '.' ? [] : dir.split('/');
}

function materializeDepsClaims(
  runtime: StructuralClaimGraphRuntime,
): MaterializedDepsClaims {
  const analyzed = new Set(
    runtime.index.sourceFiles.map((claim) => claim.attributes.filePath),
  );
  const allEdges: InternalEdge[] = [];
  const allExternals: ExternalImport[] = [];
  const allUnresolved: UnresolvedImport[] = [];
  const usedTsconfigs = runtime.index.tsconfigs
    .filter((claim) => claim.attributes.sourceFileCount > 0)
    .map((claim) => claim.attributes.tsconfigPath)
    .sort();
  const barrelFiles = new Set<string>();

  for (const importClaim of runtime.index.imports) {
    const resolution = runtime.index.resolutionByImportId.get(importClaim.id);
    if (!resolution) {
      continue;
    }

    if (resolution.attributes.status === 'internal' && resolution.attributes.targetFile) {
      const edge: InternalEdge = {
        source: importClaim.attributes.sourceFile,
        target: resolution.attributes.targetFile,
        specifier: importClaim.attributes.specifier,
        bindings: [...importClaim.attributes.bindings],
        type_only: importClaim.attributes.typeOnly,
        line: importClaim.attributes.line,
      };
      if (resolution.attributes.viaBarrel) {
        edge.via_barrel = true;
        barrelFiles.add(resolution.attributes.targetFile);
      }
      if (resolution.attributes.dtsTarget) {
        edge.dts_target = true;
      }
      allEdges.push(edge);
      continue;
    }

    if (resolution.attributes.status === 'external' && resolution.attributes.externalPackage) {
      allExternals.push({
        source: importClaim.attributes.sourceFile,
        package: resolution.attributes.externalPackage,
        specifier: importClaim.attributes.specifier,
      });
      continue;
    }

    if (resolution.attributes.status === 'unresolved') {
      allUnresolved.push({
        source: importClaim.attributes.sourceFile,
        specifier: importClaim.attributes.specifier,
        line: importClaim.attributes.line,
      });
    }
  }

  return {
    analyzed,
    allEdges,
    allExternals,
    allUnresolved,
    usedTsconfigs,
    barrelFiles,
  };
}

function computeDirectoryCrossings(
  allEdges: readonly InternalEdge[],
): DirectoryCrossing[] {
  const map = new Map<string, { count: number; type_only_count: number; edges: string[] }>();

  for (const edge of allEdges) {
    const sourceParts = fileDirParts(edge.source);
    const targetParts = fileDirParts(edge.target);

    let common = 0;
    while (
      common < sourceParts.length
      && common < targetParts.length
      && sourceParts[common] === targetParts[common]
    ) {
      common++;
    }

    if (common === sourceParts.length && common === targetParts.length) {
      continue;
    }

    const maxDepth = Math.max(sourceParts.length, targetParts.length);
    for (let depth = common + 1; depth <= maxDepth; depth++) {
      const fromDir = sourceParts.slice(0, Math.min(depth, sourceParts.length)).join('/');
      const toDir = targetParts.slice(0, Math.min(depth, targetParts.length)).join('/');
      if (fromDir === toDir) {
        continue;
      }

      const key = `${fromDir}\0${toDir}`;
      let entry = map.get(key);
      if (!entry) {
        entry = { count: 0, type_only_count: 0, edges: [] };
        map.set(key, entry);
      }
      entry.count++;
      if (edge.type_only) {
        entry.type_only_count++;
      }
      entry.edges.push(`${edge.source}:${edge.line} -> ${edge.target}`);
    }
  }

  return [...map.entries()]
    .map(([key, value]) => {
      const [from_dir = '', to_dir = ''] = key.split('\0');
      return {
        from_dir,
        to_dir,
        count: value.count,
        type_only_count: value.type_only_count,
        edges: value.edges.sort(),
      };
    })
    .sort((left, right) =>
      right.count - left.count
      || left.from_dir.localeCompare(right.from_dir)
      || left.to_dir.localeCompare(right.to_dir),
    );
}

function computeDirectoryProfiles(
  allEdges: readonly InternalEdge[],
  allExternals: readonly ExternalImport[],
  analyzed: ReadonlySet<string>,
): DirectoryProfile[] {
  const allDirs = new Set<string>();
  for (const filePath of analyzed) {
    const parts = fileDirParts(filePath);
    for (let index = 1; index <= parts.length; index++) {
      allDirs.add(parts.slice(0, index).join('/'));
    }
  }

  const profiles: DirectoryProfile[] = [];
  for (const dir of allDirs) {
    let internal = 0;
    let inbound = 0;
    let outbound = 0;
    const externalPackages = new Set<string>();

    for (const edge of allEdges) {
      const sourceIn = isInSubtree(edge.source, dir);
      const targetIn = isInSubtree(edge.target, dir);
      if (sourceIn && targetIn) {
        internal++;
      } else if (sourceIn && !targetIn) {
        outbound++;
      } else if (!sourceIn && targetIn) {
        inbound++;
      }
    }

    for (const externalImport of allExternals) {
      if (isInSubtree(externalImport.source, dir)) {
        externalPackages.add(externalImport.package);
      }
    }

    profiles.push({
      dir,
      internal_edges: internal,
      inbound_edges: inbound,
      outbound_edges: outbound,
      external_packages: [...externalPackages].sort(),
    });
  }

  return profiles.sort((left, right) => left.dir.localeCompare(right.dir));
}

function computeOrphans(
  allEdges: readonly InternalEdge[],
  analyzed: ReadonlySet<string>,
): { no_inbound: string[]; no_outbound: string[] } {
  const hasInbound = new Set<string>();
  const hasOutbound = new Set<string>();

  for (const edge of allEdges) {
    hasOutbound.add(edge.source);
    hasInbound.add(edge.target);
  }

  const noInbound: string[] = [];
  const noOutbound: string[] = [];
  for (const filePath of analyzed) {
    if (!hasInbound.has(filePath)) {
      noInbound.push(filePath);
    }
    if (!hasOutbound.has(filePath)) {
      noOutbound.push(filePath);
    }
  }

  return {
    no_inbound: noInbound.sort(),
    no_outbound: noOutbound.sort(),
  };
}

function computeCycles(
  allEdges: readonly InternalEdge[],
): CycleGroup[] {
  const directoryEdges = new Map<string, Map<string, number>>();
  for (const edge of allEdges) {
    const sourceDir = dirname(edge.source);
    const targetDir = dirname(edge.target);
    if (sourceDir === targetDir) {
      continue;
    }
    if (!directoryEdges.has(sourceDir)) {
      directoryEdges.set(sourceDir, new Map());
    }
    const targets = directoryEdges.get(sourceDir)!;
    targets.set(targetDir, (targets.get(targetDir) || 0) + 1);
  }

  const allDirNodes = new Set<string>();
  for (const [sourceDir, targets] of directoryEdges) {
    allDirNodes.add(sourceDir);
    for (const targetDir of targets.keys()) {
      allDirNodes.add(targetDir);
    }
  }

  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const stronglyConnectedComponents: string[][] = [];

  function strongConnect(node: string): void {
    indices.set(node, index);
    lowlinks.set(node, index);
    index++;
    stack.push(node);
    onStack.add(node);

    const successors = directoryEdges.get(node);
    if (successors) {
      for (const successor of successors.keys()) {
        if (!indices.has(successor)) {
          strongConnect(successor);
          lowlinks.set(node, Math.min(lowlinks.get(node)!, lowlinks.get(successor)!));
        } else if (onStack.has(successor)) {
          lowlinks.set(node, Math.min(lowlinks.get(node)!, indices.get(successor)!));
        }
      }
    }

    if (lowlinks.get(node) === indices.get(node)) {
      const component: string[] = [];
      let current: string;
      do {
        current = stack.pop()!;
        onStack.delete(current);
        component.push(current);
      } while (current !== node);
      if (component.length > 1) {
        stronglyConnectedComponents.push(component);
      }
    }
  }

  for (const node of allDirNodes) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }

  return stronglyConnectedComponents
    .map((component) => {
      const componentSet = new Set(component);
      const edges: Array<{ from: string; to: string; count: number }> = [];
      let edgeCount = 0;
      for (const dir of component) {
        const targets = directoryEdges.get(dir);
        if (!targets) {
          continue;
        }
        for (const [target, count] of targets) {
          if (componentSet.has(target)) {
            edges.push({ from: dir, to: target, count });
            edgeCount += count;
          }
        }
      }
      return {
        directories: component.sort(),
        edge_count: edgeCount,
        edges: edges.sort((left, right) =>
          right.count - left.count
          || left.from.localeCompare(right.from),
        ),
      };
    })
    .sort((left, right) => right.edge_count - left.edge_count);
}

function computeCouplingMatrices(
  analyzed: ReadonlySet<string>,
  allEdges: readonly InternalEdge[],
): CouplingMatrix[] {
  const packageSubsystems = new Map<string, Set<string>>();

  for (const filePath of analyzed) {
    const parts = filePath.split('/');
    if (parts[0] === 'packages' && parts[2] === 'src' && parts.length >= 5) {
      const pkg = `${parts[0]}/${parts[1]}`;
      const subsystem = parts[3]!;
      if (!packageSubsystems.has(pkg)) {
        packageSubsystems.set(pkg, new Set());
      }
      packageSubsystems.get(pkg)!.add(subsystem);
    }
  }

  const matrices: CouplingMatrix[] = [];

  for (const [pkg, subsystems] of packageSubsystems) {
    if (subsystems.size < 2) {
      continue;
    }

    const prefix = `${pkg}/src/`;
    const cells = new Map<string, { count: number; type_only: number; bindings: Set<string> }>();

    for (const edge of allEdges) {
      if (!edge.source.startsWith(prefix) || !edge.target.startsWith(prefix)) {
        continue;
      }
      const [sourceSubsystem = ''] = edge.source.slice(prefix.length).split('/');
      const [targetSubsystem = ''] = edge.target.slice(prefix.length).split('/');
      if (sourceSubsystem === targetSubsystem) {
        continue;
      }
      if (!subsystems.has(sourceSubsystem) || !subsystems.has(targetSubsystem)) {
        continue;
      }

      const key = `${sourceSubsystem}\0${targetSubsystem}`;
      let cell = cells.get(key);
      if (!cell) {
        cell = { count: 0, type_only: 0, bindings: new Set() };
        cells.set(key, cell);
      }
      cell.count++;
      if (edge.type_only) {
        cell.type_only++;
      }
      for (const binding of edge.bindings) {
        cell.bindings.add(binding);
      }
    }

    matrices.push({
      scope: pkg,
      cells: [...cells.entries()]
        .map(([key, value]) => {
          const [from = '', to = ''] = key.split('\0');
          return {
            from,
            to,
            edge_count: value.count,
            type_only_count: value.type_only,
            bindings: [...value.bindings].sort(),
          };
        })
        .sort((left, right) =>
          right.edge_count - left.edge_count
          || left.from.localeCompare(right.from),
        ),
    });
  }

  return matrices.sort((left, right) => left.scope.localeCompare(right.scope));
}

function gitHead(cwd: string): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

function gitBlobHash(filePath: string): string {
  try {
    return execFileSync('git', ['hash-object', filePath], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

export function generateDepsAnalysis(
  nextSession: RepoSession,
  options: ProgramReuseOptions = {},
  sourceFileScan?: ParsedTsconfigSourceFileScanResult,
): DepsAnalysisResult {
  void options;

  const parsedSourceFileScan = sourceFileScan;
  const runtime = buildStructuralClaimGraph(nextSession, {
    ...(parsedSourceFileScan ? { sourceFileScan: parsedSourceFileScan } : {}),
  });
  const {
    analyzed,
    allEdges,
    allExternals,
    allUnresolved,
    usedTsconfigs,
    barrelFiles,
  } = materializeDepsClaims(runtime);

  if (usedTsconfigs.length === 0) {
    throw new Error(`no tsconfig.json files produced source files in ${nextSession.repoPath}`);
  }

  const uncoveredFiles = nextSession
    .listRepoSourceFiles()
    .filter((filePath) => !analyzed.has(filePath))
    .sort();

  const directoryCrossings = computeDirectoryCrossings(allEdges);
  const directoryProfiles = computeDirectoryProfiles(allEdges, allExternals, analyzed);
  const orphans = computeOrphans(allEdges, analyzed);
  const cycles = computeCycles(allEdges);
  const couplingMatrices = computeCouplingMatrices(analyzed, allEdges);

  allEdges.sort((left, right) =>
    left.source.localeCompare(right.source)
    || left.target.localeCompare(right.target)
    || left.specifier.localeCompare(right.specifier),
  );
  allExternals.sort((left, right) =>
    left.source.localeCompare(right.source)
    || left.package.localeCompare(right.package)
    || left.specifier.localeCompare(right.specifier),
  );

  const validationErrors: string[] = [];
  const isProductRepo = [...analyzed].some((filePath) => filePath.startsWith('packages/compiler/src/'));
  const strictValidation = process.env.STRICT_VALIDATION === '1' || isProductRepo;

  if (isProductRepo) {
    const compilerFiles = [...analyzed].filter((filePath) => filePath.startsWith('packages/compiler/src/'));
    if (compilerFiles.length === 0) {
      validationErrors.push('VALIDATION FAILED: packages/compiler/src/ produced no analyzed files');
    }

    const schemaInbound = allEdges.filter((edge) =>
      isInSubtree(edge.target, 'packages/compiler/src/schema')
      && !isInSubtree(edge.source, 'packages/compiler/src/schema'),
    );
    const schemaSourceDirs = new Set(
      schemaInbound.map((edge) => {
        const parts = edge.source.split('/');
        return parts.length > 3
          ? parts.slice(0, 4).join('/')
          : dirname(edge.source);
      }),
    );
    if (schemaSourceDirs.size < 2) {
      validationErrors.push(
        'VALIDATION FAILED: packages/compiler/src/schema/ has inbound edges from '
        + `${schemaSourceDirs.size} sibling directory subtree(s) (expected >=2)`,
      );
    }
  }

  if (strictValidation && (allEdges.length < 100 || allEdges.length > 50_000)) {
    validationErrors.push(
      `VALIDATION FAILED: total internal edges = ${allEdges.length} (expected 100–50000)`,
    );
  }

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('\n'));
  }

  const frontiers = collectSnapshotFrontierEvidence(
    nextSession,
    parsedSourceFileScan,
  );
  const output: DepsOutput = {
    root: toForwardSlash(nextSession.repoPath),
    generated_at: new Date().toISOString(),
    source_commit: gitHead(nextSession.repoPath),
    analyzer_commit: gitBlobHash(resolve(import.meta.dirname!, 'analyze.js')),
    profile: describeSnapshotProfile(nextSession.profile),
    frontiers,
    tsconfigs: usedTsconfigs,
    summary: {
      files_analyzed: analyzed.size,
      internal_edges: allEdges.length,
      external_imports: allExternals.length,
      unresolved: allUnresolved.length,
      uncovered_files: uncoveredFiles.length,
    },
    edges: allEdges.map((edge) => {
      const outputEdge: OutputEdge = {
        source: edge.source,
        target: edge.target,
        specifier: edge.specifier,
        bindings: edge.bindings,
        type_only: edge.type_only,
        line: edge.line,
      };
      if (edge.via_barrel) outputEdge.via_barrel = true;
      if (edge.dts_target) outputEdge.dts_target = true;
      return outputEdge;
    }),
    external_imports: allExternals.slice(),
    unresolved_imports: allUnresolved
      .slice()
      .sort((left, right) =>
        left.source.localeCompare(right.source)
        || left.line - right.line,
      ),
    uncovered_files: uncoveredFiles,
    directory_crossings: directoryCrossings,
    directory_profiles: directoryProfiles,
    orphans,
    cycles,
    coupling_matrices: couplingMatrices,
  };

  const reportLines = [
    '',
    `Snapshot target:    ${output.profile.target}`,
    `Profile:            ${output.profile.profileId}${output.profile.profilePath ? ` (${output.profile.profilePath})` : ''}`,
    `Excluded prefixes:  ${output.profile.excludedRepoRelativePrefixes.length}`,
    `Named frontiers:    ${output.frontiers.excluded_frontiers.length}`,
    '',
    `Files analyzed:     ${analyzed.size}`,
    `Internal edges:     ${allEdges.length}`,
    `External imports:   ${allExternals.length}`,
    `Unresolved:         ${allUnresolved.length}`,
    `Uncovered files:    ${uncoveredFiles.length}`,
    `Barrel files:       ${barrelFiles.size}`,
    `Tsconfigs used:     ${usedTsconfigs.length}`,
    `Directory cycles:   ${cycles.length}`,
    '',
    'Top 20 directory crossings by edge count:',
    ...directoryCrossings
      .slice(0, 20)
      .map((crossing) =>
        `  ${crossing.count.toString().padStart(6)} edges  ${crossing.from_dir} -> ${crossing.to_dir}`,
      ),
    '',
  ];

  if (cycles.length > 0) {
    reportLines.push('Directory cycles (strongly connected components):');
    for (const cycle of cycles.slice(0, 10)) {
      reportLines.push(`  ${cycle.edge_count} edges among ${cycle.directories.length} dirs:`);
      for (const dir of cycle.directories.slice(0, 8)) {
        reportLines.push(`    ${dir}`);
      }
      if (cycle.directories.length > 8) {
        reportLines.push(`    ... and ${cycle.directories.length - 8} more`);
      }
    }
    reportLines.push('');
  }

  for (const matrix of couplingMatrices) {
    reportLines.push(`Coupling matrix: ${matrix.scope}`);
    for (const cell of matrix.cells.slice(0, 15)) {
      reportLines.push(
        `  ${cell.edge_count.toString().padStart(4)} edges  ${cell.from} -> ${cell.to}`
        + `  (${cell.bindings.length} symbols)`,
      );
    }
    if (matrix.cells.length > 15) {
      reportLines.push(`  ... and ${matrix.cells.length - 15} more`);
    }
    reportLines.push('');
  }

  reportLines.push('Top 10 files with no inbound imports:');
  reportLines.push(...orphans.no_inbound.slice(0, 10).map((filePath) => `  ${filePath}`));
  reportLines.push('');

  return {
    output,
    reportLines,
    warnings: [...runtime.graph.warnings],
  };
}

