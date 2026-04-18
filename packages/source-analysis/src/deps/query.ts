/**
 * Query tool for dependency graph analysis.
 *
 * By default this command analyzes the current workspace live.
 * Use --file to inspect a materialized deps JSON artifact explicitly.
 */

// TODO: Retire this snapshot-first compatibility script in favor of thin
// adapters over `src/live-query/`. The command surface is useful; the current
// loader/index/UI architecture is not.
// TODO: After deps/typerefs/exports all share the live kernel, extract the
// reusable seam/cone/package evaluators out of these giant scripts and delete
// the duplicated query-local indexing/render layers.

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

import { createRefreshCommand, resolveSnapshotTarget } from '../snapshot-config.js';
import { createLiveQueryKernel } from '../live-query/runtime.js';
import { loadJsonSnapshot } from '../snapshots.js';
import type { DepsOutput } from './schema.js';

// ── Argument parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);
let jsonPath: string | undefined;
let targetArg: string | undefined;
let repoArg: string | undefined;
let profilePathArg: string | undefined;

const fileIdx = args.indexOf("--file");
if (fileIdx !== -1) {
  jsonPath = args[fileIdx + 1];
  args.splice(fileIdx, 2);
}

const targetIdx = args.indexOf("--target");
if (targetIdx !== -1) {
  targetArg = args[targetIdx + 1];
  args.splice(targetIdx, 2);
}

const repoIdx = args.indexOf("--repo");
if (repoIdx !== -1) {
  repoArg = args[repoIdx + 1];
  args.splice(repoIdx, 2);
}

const profilePathIdx = args.indexOf("--profile-path");
if (profilePathIdx !== -1) {
  profilePathArg = args[profilePathIdx + 1];
  args.splice(profilePathIdx, 2);
}

// Extract boolean flags before splitting positional args
const typeOnlyFlag = args.includes("--type-only");
const valueOnlyFlag = args.includes("--value-only");
const filteredArgs = args.filter((a) => a !== "--type-only" && a !== "--value-only");

const command = filteredArgs[0];
const commandArgs = filteredArgs.slice(1);
const lockWaitMsRaw = process.env.ANALYZER_LOCK_WAIT_MS;
const lockWaitMs = lockWaitMsRaw ? Number(lockWaitMsRaw) : 5000;
const selection = resolveSnapshotTarget({
  target: targetArg,
  repoPath: repoArg,
  profilePath: profilePathArg,
});
const refreshCommand = createRefreshCommand('deps', selection);

if (!Number.isFinite(lockWaitMs) || lockWaitMs < 0) {
  process.stderr.write(
    `Error: ANALYZER_LOCK_WAIT_MS must be a non-negative number (got "${lockWaitMsRaw}").\n`,
  );
  process.exit(1);
}

interface DepsQueryInput {
  readonly data: DepsOutput;
  readonly sourceKind: 'live-workspace' | 'materialized-snapshot';
  readonly sourceLabel: string;
}

function loadDepsJson(path: string): DepsOutput {
  return loadJsonSnapshot<DepsOutput>(path, lockWaitMs);
}

function loadDepsInput(): DepsQueryInput {
  if (jsonPath) {
    try {
      return {
        data: loadDepsJson(jsonPath),
        sourceKind: 'materialized-snapshot',
        sourceLabel: jsonPath,
      };
    } catch (err) {
      process.stderr.write(`Error reading ${jsonPath}: ${(err as Error).message}\n`);
      process.exit(1);
    }
  }

  try {
    const kernel = createLiveQueryKernel({
      repoPath: repoArg,
      target: targetArg,
      profilePath: profilePathArg,
    });
    return {
      data: kernel.loadOutputs().deps,
      sourceKind: 'live-workspace',
      sourceLabel: kernel.session.repoPath,
    };
  } catch (err) {
    process.stderr.write(
      `Error analyzing live deps for ${selection.repoPath ?? process.cwd()}: ${(err as Error).message}\n`,
    );
    process.exit(1);
  }
}

const loaded = loadDepsInput();
const data = loaded.data;
const querySourceKind = loaded.sourceKind;
const querySourceLabel = loaded.sourceLabel;

// ── Path resolution ─────────────────────────────────────────────────────

/**
 * Resolve short path arguments to full repo-relative paths.
 * "compiler" → "packages/compiler"
 * "model" → "packages/compiler/src/model"
 * "model/index.ts" → "packages/compiler/src/model/index.ts"
 * Already-full paths pass through unchanged.
 */
function resolvePathArg(arg: string): string {
  if (!arg || arg.startsWith("packages/")) return arg;

  // Package-level: "compiler" → "packages/compiler"
  const pkgPrefix = `packages/${arg}/`;
  if (data.edges.some((e) => e.source.startsWith(pkgPrefix) || e.target.startsWith(pkgPrefix))) {
    return `packages/${arg}`;
  }

  // Subsystem-level: "model" → "packages/compiler/src/model"
  const subSuffix = `/src/${arg}/`;
  for (const e of data.edges) {
    for (const p of [e.source, e.target]) {
      const idx = p.indexOf(subSuffix);
      if (idx >= 0 && p.startsWith("packages/")) {
        return p.slice(0, idx + subSuffix.length - 1);
      }
    }
  }

  // File suffix: "model/index.ts" → "packages/compiler/src/model/index.ts"
  const fileSuffix = "/" + arg;
  const fileMatches = new Set<string>();
  for (const e of data.edges) {
    if (e.source.endsWith(fileSuffix)) fileMatches.add(e.source);
    if (e.target.endsWith(fileSuffix)) fileMatches.add(e.target);
  }
  if (fileMatches.size === 1) return [...fileMatches][0]!;
  if (fileMatches.size > 1) {
    process.stderr.write(
      `Warning: "${arg}" matches ${fileMatches.size} files. Use a more specific path.\n`,
    );
    for (const f of [...fileMatches].sort().slice(0, 8)) {
      process.stderr.write(`  ${f}\n`);
    }
    if (fileMatches.size > 8) process.stderr.write(`  ... and ${fileMatches.size - 8} more\n`);
    return arg;
  }

  process.stderr.write(
    `Warning: "${arg}" did not match any known package or subsystem. ` +
      `Use full paths like "packages/compiler/src/model".\n`,
  );
  return arg;
}

// ── Commands ────────────────────────────────────────────────────────────

function gitHead(cwd: string): string {
  try {
    return execSync("git rev-parse HEAD", { cwd, encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function printSummary(): void {
  const s = data.summary;
  const lines = [
    `Query mode:       ${querySourceKind === 'live-workspace' ? 'live workspace' : 'materialized snapshot'}`,
    `Source:           ${querySourceLabel}`,
    `Generated:        ${data.generated_at}`,
    `Source commit:     ${data.source_commit ?? "not recorded"}`,
    `Analyzer commit:  ${data.analyzer_commit ?? "not recorded"}`,
    `Snapshot target:  ${data.profile.target}`,
    `Profile:          ${data.profile.profileId}${data.profile.profilePath ? ` (${data.profile.profilePath})` : ''}`,
    `Excluded prefixes: ${data.profile.excludedRepoRelativePrefixes.length}`,
    `Files analyzed:   ${s.files_analyzed}`,
    `Internal edges:   ${s.internal_edges}`,
    `External imports: ${s.external_imports}`,
    `Unresolved:       ${s.unresolved}`,
    `Uncovered files:  ${s.uncovered_files ?? "n/a"}`,
    `Tsconfigs:        ${data.tsconfigs.length}`,
    `Cycles:           ${data.cycles.length}`,
    `Coupling scopes:  ${data.coupling_matrices.map((m) => m.scope).join(", ")}`,
  ];
  console.log(lines.join("\n"));
}

// Resolve a barrel target to its actual defining module for a given symbol.
// Follows star re-exports and cross-references direct producers.
function resolveBarrel(barrelPath: string, symbol: string): string | null {
  const barrelExports = data.edges.filter(
    (e) => e.source === barrelPath && (e.bindings.includes(symbol) || e.bindings.includes("*")),
  );
  if (barrelExports.length === 1) return barrelExports[0]!.target;
  if (barrelExports.length === 0) return null;

  // Prefer named exports over star exports — a named export explicitly carries
  // the symbol, while a star export may or may not.
  const namedExport = barrelExports.find((e) => e.bindings.includes(symbol));
  if (namedExport) {
    if (namedExport.via_barrel) {
      const deeper = resolveBarrel(namedExport.target, symbol);
      if (deeper) return deeper;
    }
    return namedExport.target;
  }

  // Star-export only: prefer the one that is also a direct (non-barrel)
  // producer of this symbol elsewhere in the graph
  const directProducers = new Set(
    data.edges.filter((e) => e.bindings.includes(symbol) && !e.via_barrel).map((e) => e.target),
  );
  const resolved = barrelExports.find((e) => directProducers.has(e.target));
  if (resolved) return resolved.target;
  for (const be of barrelExports) {
    if (be.via_barrel) {
      const deeper = resolveBarrel(be.target, symbol);
      if (deeper) return deeper;
    }
  }
  return barrelExports[0]!.target;
}

function applyTypeFilter(edges: typeof data.edges): typeof data.edges {
  if (typeOnlyFlag) return edges.filter((e) => e.type_only);
  if (valueOnlyFlag) return edges.filter((e) => !e.type_only);
  return edges;
}

function typeFilterLabel(): string {
  if (typeOnlyFlag) return " (type-only)";
  if (valueOnlyFlag) return " (value-only)";
  return "";
}

function printSeam(): void {
  if (!commandArgs[0] || !commandArgs[1]) {
    process.stderr.write("Usage: source-analysis deps seam <from-dir> <to-dir> [--type-only|--value-only]\n");
    process.exit(1);
  }
  const fromDir = resolvePathArg(commandArgs[0]);
  const toDir = resolvePathArg(commandArgs[1]);

  const matching = applyTypeFilter(
    data.edges.filter(
      (e) => e.source.startsWith(fromDir + "/") && e.target.startsWith(toDir + "/"),
    ),
  );

  if (matching.length === 0) {
    console.log(`No edges from ${fromDir}/ to ${toDir}/` + typeFilterLabel());
    return;
  }

  console.log(`${matching.length} edges from ${fromDir}/ to ${toDir}/` + typeFilterLabel() + "\n");

  const allBindings = new Set<string>();
  for (const e of matching) {
    for (const b of e.bindings) allBindings.add(b);
  }
  console.log(`Unique symbols (${allBindings.size}): ${[...allBindings].sort().join(", ")}\n`);

  const typeOnly = matching.filter((e) => e.type_only).length;
  const viaBarrel = matching.filter((e) => e.via_barrel).length;
  const dts = matching.filter((e) => e.dts_target).length;
  console.log(`Type-only: ${typeOnly}  Via barrel: ${viaBarrel}  DTS target: ${dts}\n`);

  console.log("Edges:");
  for (const e of matching) {
    const flags = [
      e.type_only && "type",
      e.via_barrel && "barrel",
      e.dts_target && "dts",
    ]
      .filter(Boolean)
      .join(",");
    // Resolve barrel to true definer
    let barrelNote = "";
    if (e.via_barrel && e.bindings.length > 0) {
      const resolved = resolveBarrel(e.target, e.bindings[0]!);
      if (resolved && resolved !== e.target) barrelNote = ` (→ ${resolved})`;
    }
    console.log(
      `  ${e.source}:${e.line} -> ${e.target}` +
        (flags ? ` [${flags}]` : "") +
        barrelNote +
        (e.bindings.length > 0 ? `\n    {${e.bindings.join(", ")}}` : ""),
    );
  }
}

function printBindings(): void {
  if (!commandArgs[0] || !commandArgs[1]) {
    process.stderr.write("Usage: source-analysis deps bindings <from-dir> <to-dir> [--type-only|--value-only]\n");
    process.exit(1);
  }
  const fromDir = resolvePathArg(commandArgs[0]);
  const toDir = resolvePathArg(commandArgs[1]);

  const matching = applyTypeFilter(
    data.edges.filter(
      (e) => e.source.startsWith(fromDir + "/") && e.target.startsWith(toDir + "/"),
    ),
  );

  const allBindings = new Set<string>();
  for (const e of matching) {
    for (const b of e.bindings) allBindings.add(b);
  }

  if (allBindings.size === 0) {
    console.log(`No symbols imported from ${fromDir}/ to ${toDir}/`);
    return;
  }

  console.log(
    `${allBindings.size} unique symbols across ${matching.length} edges ` +
      `from ${fromDir}/ to ${toDir}/:\n`,
  );
  for (const b of [...allBindings].sort()) {
    console.log(`  ${b}`);
  }
}

function printMatrix(): void {
  if (!commandArgs[0]) {
    console.log(`Available coupling matrices:`);
    for (const m of data.coupling_matrices) {
      console.log(`  ${m.scope} (${m.cells.length} couplings)`);
    }
    console.log(`\nUsage: matrix <scope>`);
    return;
  }
  const scope = resolvePathArg(commandArgs[0]);
  const matrix = data.coupling_matrices.find((m) => m.scope === scope);
  if (!matrix) {
    console.log(`No coupling matrix for "${scope}".`);
    console.log(`Available: ${data.coupling_matrices.map((m) => m.scope).join(", ")}`);
    return;
  }

  console.log(`Coupling matrix: ${matrix.scope}\n`);
  for (const cell of matrix.cells) {
    console.log(
      `  ${cell.edge_count.toString().padStart(4)} edges  ${cell.from} -> ${cell.to}` +
        `  (${cell.bindings.length} symbols${cell.type_only_count > 0 ? `, ${cell.type_only_count} type-only` : ""})`,
    );
    if (cell.bindings.length <= 20) {
      console.log(`         {${cell.bindings.join(", ")}}`);
    } else {
      console.log(`         {${cell.bindings.slice(0, 20).join(", ")}, ... +${cell.bindings.length - 20}}`);
    }
  }
}

function printCycles(): void {
  if (data.cycles.length === 0) {
    console.log("No directory-level cycles detected.");
    return;
  }

  console.log(`${data.cycles.length} cycle(s):\n`);
  for (const cyc of data.cycles) {
    console.log(`Cycle: ${cyc.directories.length} directories, ${cyc.edge_count} edges`);
    console.log("  Directories:");
    for (const d of cyc.directories) {
      console.log(`    ${d}`);
    }
    console.log("  Heaviest edges:");
    for (const e of cyc.edges.slice(0, 10)) {
      console.log(`    ${e.count.toString().padStart(4)} edges  ${e.from} -> ${e.to}`);
    }
    if (cyc.edges.length > 10) console.log(`    ... and ${cyc.edges.length - 10} more`);
    console.log();
  }
}

function printProfile(): void {
  if (!commandArgs[0]) {
    process.stderr.write("Usage: source-analysis deps profile <dir>\n");
    process.exit(1);
  }
  const dir = resolvePathArg(commandArgs[0]);

  const profile = data.directory_profiles.find((p) => p.dir === dir);
  if (!profile) {
    // Try prefix match
    const matches = data.directory_profiles.filter((p) => p.dir.startsWith(dir));
    if (matches.length === 0) {
      console.log(`No profile for "${dir}". Try a directory that contains analyzed files.`);
      return;
    }
    console.log(`No exact match for "${dir}". Showing ${matches.length} matching profiles:\n`);
    for (const p of matches) {
      console.log(
        `  ${p.dir}  internal=${p.internal_edges} inbound=${p.inbound_edges} outbound=${p.outbound_edges}` +
          (p.external_packages.length > 0 ? `  ext=[${p.external_packages.join(", ")}]` : ""),
      );
    }
    return;
  }

  console.log(`Directory: ${profile.dir}`);
  console.log(`  Internal edges: ${profile.internal_edges}`);
  console.log(`  Inbound edges:  ${profile.inbound_edges}`);
  console.log(`  Outbound edges: ${profile.outbound_edges}`);
  if (profile.external_packages.length > 0) {
    console.log(`  External deps:  ${profile.external_packages.join(", ")}`);
  }

  // Show top inbound sources and outbound targets
  const inbound = data.edges.filter(
    (e) => e.target.startsWith(dir + "/") && !e.source.startsWith(dir + "/"),
  );
  const outbound = data.edges.filter(
    (e) => e.source.startsWith(dir + "/") && !e.target.startsWith(dir + "/"),
  );

  if (inbound.length > 0) {
    const bySource = new Map<string, number>();
    for (const e of inbound) {
      const srcDir = e.source.split("/").slice(0, dir.split("/").length).join("/");
      bySource.set(srcDir, (bySource.get(srcDir) || 0) + 1);
    }
    console.log(`\n  Top inbound sources:`);
    for (const [d, n] of [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`    ${n.toString().padStart(4)} edges from ${d}`);
    }
  }

  if (outbound.length > 0) {
    const byTarget = new Map<string, number>();
    for (const e of outbound) {
      const tgtDir = e.target.split("/").slice(0, dir.split("/").length).join("/");
      byTarget.set(tgtDir, (byTarget.get(tgtDir) || 0) + 1);
    }
    console.log(`\n  Top outbound targets:`);
    for (const [d, n] of [...byTarget.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`    ${n.toString().padStart(4)} edges to ${d}`);
    }
  }
}

function printFile(): void {
  if (!commandArgs[0]) {
    process.stderr.write("Usage: source-analysis deps file <repo-relative-path>\n");
    process.exit(1);
  }
  const filePath = resolvePathArg(commandArgs[0]);

  const imports = data.edges.filter((e) => e.source === filePath);
  const consumers = data.edges.filter((e) => e.target === filePath);
  const externals = data.external_imports.filter((e) => e.source === filePath);

  if (imports.length === 0 && consumers.length === 0 && externals.length === 0) {
    console.log(`No edges found for "${filePath}".`);
    return;
  }

  console.log(`File: ${filePath}\n`);

  if (imports.length > 0) {
    console.log(`Imports (${imports.length}):`);
    for (const e of imports) {
      const flags = [e.type_only && "type", e.via_barrel && "barrel"].filter(Boolean).join(",");
      console.log(
        `  :${e.line} -> ${e.target}` +
          (flags ? ` [${flags}]` : "") +
          (e.bindings.length > 0 ? ` {${e.bindings.join(", ")}}` : ""),
      );
    }
    console.log();
  }

  if (externals.length > 0) {
    console.log(`External imports (${externals.length}):`);
    for (const e of externals) {
      console.log(`  ${e.package} (${e.specifier})`);
    }
    console.log();
  }

  if (consumers.length > 0) {
    console.log(`Consumed by (${consumers.length}):`);
    for (const e of consumers) {
      console.log(
        `  ${e.source}:${e.line}` +
          (e.bindings.length > 0 ? ` {${e.bindings.join(", ")}}` : ""),
      );
    }
  }
}

function printDirs(): void {
  const prefix = resolvePathArg(commandArgs[0] || "");
  const depth = parseInt(commandArgs[1] || "0", 10);

  let profiles = data.directory_profiles;
  if (prefix) {
    profiles = profiles.filter((p) => p.dir.startsWith(prefix));
  }

  if (profiles.length === 0) {
    console.log(prefix ? `No directories matching "${prefix}".` : "No directories found.");
    return;
  }

  // If depth is specified or too many results, filter to a specific depth
  if (depth > 0) {
    profiles = profiles.filter((p) => p.dir.split("/").length === depth);
  } else if (profiles.length > 40 && !prefix) {
    // Default: show top two levels to keep output manageable
    profiles = profiles.filter((p) => p.dir.split("/").length <= 2);
  }

  // Sort by total edge activity (internal + inbound + outbound), descending
  profiles.sort(
    (a, b) =>
      b.internal_edges + b.inbound_edges + b.outbound_edges -
      (a.internal_edges + a.inbound_edges + a.outbound_edges),
  );

  console.log(
    `${profiles.length} directories` + (prefix ? ` under ${prefix}` : "") + ":\n",
  );
  console.log("  internal  inbound  outbound  directory");
  for (const p of profiles) {
    console.log(
      `  ${p.internal_edges.toString().padStart(8)}` +
        `  ${p.inbound_edges.toString().padStart(7)}` +
        `  ${p.outbound_edges.toString().padStart(8)}` +
        `  ${p.dir}`,
    );
  }
}

function printPackages(): void {
  // Discover all packages from edge data (not just those with coupling matrices)
  const pkgFiles = new Map<string, number>();
  const pkgInbound = new Map<string, number>();
  const pkgOutbound = new Map<string, number>();
  const allFiles = new Set<string>();

  for (const e of data.edges) {
    allFiles.add(e.source);
    allFiles.add(e.target);
  }

  for (const f of allFiles) {
    const parts = f.split("/");
    if (parts[0] !== "packages" || parts.length < 3) continue;
    const pkg = `${parts[0]}/${parts[1]}`;
    pkgFiles.set(pkg, (pkgFiles.get(pkg) || 0) + 1);
  }

  // Count cross-package edges per package
  for (const e of data.edges) {
    const srcParts = e.source.split("/");
    const tgtParts = e.target.split("/");
    if (srcParts[0] !== "packages" || tgtParts[0] !== "packages") continue;
    const srcPkg = `${srcParts[0]}/${srcParts[1]}`;
    const tgtPkg = `${tgtParts[0]}/${tgtParts[1]}`;
    if (srcPkg !== tgtPkg) {
      pkgOutbound.set(srcPkg, (pkgOutbound.get(srcPkg) || 0) + 1);
      pkgInbound.set(tgtPkg, (pkgInbound.get(tgtPkg) || 0) + 1);
    }
  }

  // Also discover non-package top-level directories (e.g. examples/)
  const topDirs = new Map<string, number>();
  for (const f of allFiles) {
    const parts = f.split("/");
    const top = parts[0];
    if (top === undefined || top === "packages") continue;
    topDirs.set(top, (topDirs.get(top) || 0) + 1);
  }

  const matrixByScope = new Map(data.coupling_matrices.map((m) => [m.scope, m]));

  // Print packages sorted by name
  const packages = [...pkgFiles.keys()].sort();
  if (packages.length === 0 && topDirs.size === 0) {
    console.log("No packages found in edge data.");
    return;
  }

  console.log(`${packages.length} packages:\n`);

  for (const pkg of packages) {
    const files = pkgFiles.get(pkg) || 0;
    const inb = pkgInbound.get(pkg) || 0;
    const outb = pkgOutbound.get(pkg) || 0;
    const matrix = matrixByScope.get(pkg);

    if (matrix && matrix.cells.length > 0) {
      const subsystems = new Set<string>();
      for (const cell of matrix.cells) {
        subsystems.add(cell.from);
        subsystems.add(cell.to);
      }
      console.log(
        `${pkg}  (${files} files, ${subsystems.size} subsystems, ${matrix.cells.length} couplings, cross-pkg: ${inb} in / ${outb} out)`,
      );
      const sorted = [...subsystems].sort();
      for (const sub of sorted) {
        let subIn = 0;
        let subOut = 0;
        for (const cell of matrix.cells) {
          if (cell.from === sub) subOut += cell.edge_count;
          if (cell.to === sub) subIn += cell.edge_count;
        }
        console.log(`  ${sub.padEnd(24)} in=${subIn} out=${subOut}`);
      }
    } else {
      console.log(`${pkg}  (${files} files, cross-pkg: ${inb} in / ${outb} out)`);
    }
    console.log();
  }

  if (topDirs.size > 0) {
    console.log(`Other top-level directories:\n`);
    for (const [dir, count] of [...topDirs].sort()) {
      console.log(`  ${dir}/  (${count} files)`);
    }
    console.log();
  }
}

function printFiles(): void {
  const prefix = resolvePathArg(commandArgs[0] || "");

  // Collect all analyzed files with edge counts
  const fileStats = new Map<string, { imports: number; consumers: number }>();
  const allFiles = new Set<string>();

  for (const e of data.edges) {
    allFiles.add(e.source);
    allFiles.add(e.target);
  }

  for (const f of allFiles) {
    if (prefix && !f.startsWith(prefix)) continue;
    const imports = data.edges.filter((e) => e.source === f).length;
    const consumers = data.edges.filter((e) => e.target === f).length;
    fileStats.set(f, { imports, consumers });
  }

  if (fileStats.size === 0) {
    console.log(prefix ? `No files matching "${prefix}".` : "No files found.");
    return;
  }

  // Sort by total edge count descending
  const sorted = [...fileStats.entries()].sort(
    (a, b) => b[1].imports + b[1].consumers - (a[1].imports + a[1].consumers),
  );

  console.log(
    `${sorted.length} files` + (prefix ? ` under ${prefix}` : "") + ":\n",
  );
  console.log("  imports  consumed-by  file");
  for (const [f, s] of sorted.slice(0, 50)) {
    console.log(
      `  ${s.imports.toString().padStart(7)}` +
        `  ${s.consumers.toString().padStart(11)}` +
        `  ${f}`,
    );
  }
  if (sorted.length > 50) console.log(`  ... and ${sorted.length - 50} more`);
}

function gitBlobHash(filePath: string): string {
  try {
    return execSync(`git hash-object "${filePath}"`, { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function printStale(): void {
  if (querySourceKind === 'live-workspace') {
    console.log('LIVE: deps query is analyzing the current workspace directly.');
    console.log(`  repo:    ${querySourceLabel}`);
    console.log(`  target:  ${data.profile.target}`);
    console.log('  snapshot staleness does not apply unless you pass --file.');
    return;
  }

  const sourceCommit = data.source_commit;
  const analyzerCommit = data.analyzer_commit;

  if (!sourceCommit || !analyzerCommit) {
    console.log('STALE: materialized deps JSON is missing provenance fields.');
    console.log(`  rerun:    ${refreshCommand}`);
    console.log('  or use:   pnpm source-analysis deps <command> ... without --file');
    process.exitCode = 1;
    return;
  }

  const currentSource = gitHead(resolve(data.root));
  // Compare blob hash of the analyzer source file, not the meta-repo HEAD.
  // This avoids false staleness from unrelated meta-repo commits.
  const analyzerPath = resolve(import.meta.dirname!, 'generate.js');
  const currentAnalyzer = gitBlobHash(analyzerPath);

  const sourceMatch = currentSource === sourceCommit;
  const analyzerMatch = currentAnalyzer === analyzerCommit;

  if (sourceMatch && analyzerMatch) {
    console.log(`FRESH: materialized deps JSON matches both source target (${data.profile.target}) and analyzer.`);
    console.log(`  source:   ${sourceCommit.slice(0, 10)}`);
    console.log(`  analyzer: ${analyzerCommit.slice(0, 10)}`);
  } else {
    console.log('STALE: materialized deps JSON is out of date.');
    if (!sourceMatch) {
      console.log(`  source repo moved: ${sourceCommit.slice(0, 10)} -> ${currentSource.slice(0, 10)}`);
    }
    if (!analyzerMatch) {
      console.log(`  analyzer changed:  ${analyzerCommit.slice(0, 10)} -> ${currentAnalyzer.slice(0, 10)}`);
    }
    console.log(`  rerun:             ${refreshCommand}`);
    console.log('  or use:            pnpm source-analysis deps <command> ... without --file');
    process.exitCode = 1;
  }
}

function printBlindspots(): void {
  const sections: string[] = [];

  // ── Scope statement ──
  sections.push(
    "SCOPE: This graph covers static TypeScript import/export statements",
    "resolved against all tsconfig.json and tsconfig.test.json files in aurelia-ls2.",
    "",
  );

  // ── Unresolved imports ──
  const unresolved = data.unresolved_imports ?? [];
  if (unresolved.length > 0) {
    sections.push(`UNRESOLVED IMPORTS: ${unresolved.length} (edges missing from the graph)`);
    for (const u of unresolved) {
      sections.push(`  ${u.source}:${u.line}  →  ${u.specifier}`);
    }
  } else {
    sections.push("UNRESOLVED IMPORTS: 0 (all relative specifiers resolved)");
  }
  sections.push("");

  // ── Uncovered files ──
  const uncovered = data.uncovered_files ?? [];
  if (uncovered.length > 0) {
    sections.push(`UNCOVERED FILES: ${uncovered.length} (.ts/.tsx files not in any tsconfig)`);
    // Group by top-level directory
    const byDir = new Map<string, string[]>();
    for (const f of uncovered) {
      // Group by package test dir (packages/X/test) or top-level dir
      const parts = f.split("/");
      let dir: string;
      if (parts[0] === "packages" && parts.length >= 3 && parts[2] === "test") {
        dir = parts.slice(0, 3).join("/");
      } else if (parts.length > 1) {
        dir = parts.slice(0, Math.min(parts.length - 1, 2)).join("/");
      } else {
        dir = ".";
      }
      if (!byDir.has(dir)) byDir.set(dir, []);
      byDir.get(dir)!.push(f);
    }
    for (const [dir, files] of [...byDir.entries()].sort((a, b) => b[1].length - a[1].length)) {
      sections.push(`  ${dir}/ (${files.length} files)`);
      for (const f of files.slice(0, 5)) {
        sections.push(`    ${f}`);
      }
      if (files.length > 5) sections.push(`    ... and ${files.length - 5} more`);
    }
  } else {
    sections.push("UNCOVERED FILES: 0 (all .ts/.tsx files are in at least one tsconfig)");
  }
  sections.push("");

  // ── Barrel indirection ──
  const barrelEdges = data.edges.filter((e) => e.via_barrel);
  if (barrelEdges.length > 0) {
    const barrelTargets = new Map<string, number>();
    const barrelSourceDirs = new Map<string, number>();
    for (const e of barrelEdges) {
      barrelTargets.set(e.target, (barrelTargets.get(e.target) || 0) + 1);
      const srcDir = e.source.split("/").slice(0, -1).join("/");
      barrelSourceDirs.set(srcDir, (barrelSourceDirs.get(srcDir) || 0) + 1);
    }
    sections.push(
      `BARREL INDIRECTION: ${barrelEdges.length} edges (${barrelTargets.size} barrel files)`,
      "  These edges point at index.ts re-export files, not the actual defining module.",
      "  The bindings are correct but the target path obscures the real producer.",
    );
    sections.push("  Most-used barrels:");
    for (const [target, count] of [...barrelTargets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      sections.push(`    ${count.toString().padStart(4)} edges → ${target}`);
    }
    sections.push("  Directories most affected:");
    for (const [dir, count] of [...barrelSourceDirs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      sections.push(`    ${count.toString().padStart(4)} barrel imports from ${dir}`);
    }
  } else {
    sections.push("BARREL INDIRECTION: 0 edges through barrel files");
  }
  sections.push("");

  // ── Coupling matrix coverage ──
  // Find packages that have source files but no coupling matrix
  const analyzedPackages = new Set<string>();
  for (const e of data.edges) {
    const parts = e.source.split("/");
    if (parts[0] === "packages" && parts.length >= 2) {
      analyzedPackages.add(`${parts[0]}/${parts[1]}`);
    }
  }
  const matrixScopes = new Set(data.coupling_matrices.map((m) => m.scope));
  const uncoveredPackages = [...analyzedPackages].filter((p) => !matrixScopes.has(p)).sort();

  if (uncoveredPackages.length > 0) {
    sections.push(
      `COUPLING MATRIX GAPS: ${uncoveredPackages.length} packages without coupling analysis`,
      "  Coupling matrices require packages/X/src/SUBSYSTEM/... with 2+ subsystems.",
      "  Packages without matrices (may have flat src/ layout or only 1 subsystem):",
    );
    for (const p of uncoveredPackages) {
      sections.push(`    ${p}`);
    }
  } else {
    sections.push("COUPLING MATRIX GAPS: 0 (all packages have coupling matrices)");
  }

  console.log(sections.join("\n"));
}

function printWhoImports(): void {
  const symbol = commandArgs[0];
  if (!symbol) {
    process.stderr.write("Usage: source-analysis deps who-imports <symbol-name>\n");
    process.exit(1);
  }

  const matching = data.edges.filter((e) => e.bindings.includes(symbol));

  if (matching.length === 0) {
    console.log(`No imports of "${symbol}" found in the graph.`);
    return;
  }

  // Group by target (producer) to show which module exports it
  const byTarget = new Map<string, typeof matching>();
  for (const e of matching) {
    if (!byTarget.has(e.target)) byTarget.set(e.target, []);
    byTarget.get(e.target)!.push(e);
  }

  console.log(`Symbol "${symbol}": ${matching.length} imports from ${byTarget.size} producer(s)\n`);

  for (const [target, edges] of [...byTarget.entries()].sort((a, b) => b[1].length - a[1].length)) {
    // Check if this target is a barrel and resolve to true definer
    const isBarrel = edges.some((e) => e.via_barrel);
    let barrelNote = "";
    if (isBarrel) {
      const resolved = resolveBarrel(target, symbol);
      if (resolved && resolved !== target) {
        barrelNote = `  (barrel → ${resolved})`;
      }
    }

    console.log(`  Exported by: ${target}  (${edges.length} consumers)${barrelNote}`);
    for (const e of edges) {
      const flags = [e.type_only && "type", e.via_barrel && "barrel"].filter(Boolean).join(",");
      console.log(`    ${e.source}:${e.line}` + (flags ? ` [${flags}]` : ""));
    }
  }
}

function printExternals(): void {
  const prefix = resolvePathArg(commandArgs[0] || "");

  let externals = data.external_imports;
  if (prefix) {
    externals = externals.filter((e) => e.source.startsWith(prefix.endsWith("/") ? prefix : prefix + "/"));
  }

  if (externals.length === 0) {
    console.log(prefix ? `No external imports under "${prefix}".` : "No external imports found.");
    return;
  }

  // Group by package name
  const byPkg = new Map<string, Set<string>>();
  for (const e of externals) {
    if (!byPkg.has(e.package)) byPkg.set(e.package, new Set());
    byPkg.get(e.package)!.add(e.source);
  }

  console.log(
    `${externals.length} external imports of ${byPkg.size} packages` +
      (prefix ? ` under ${prefix}` : "") +
      ":\n",
  );

  for (const [pkg, sources] of [...byPkg.entries()].sort((a, b) => b[1].size - a[1].size)) {
    console.log(`  ${sources.size.toString().padStart(4)} files import  ${pkg}`);
  }
}

function printCrossPackage(): void {
  // Extract package from a repo-relative path: packages/X/... → packages/X
  function getPackage(path: string): string | null {
    const parts = path.split("/");
    if (parts[0] === "packages" && parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    return null;
  }

  const seams = new Map<string, { count: number; typeOnly: number; bindings: Set<string> }>();

  for (const e of data.edges) {
    const srcPkg = getPackage(e.source);
    const tgtPkg = getPackage(e.target);
    if (!srcPkg || !tgtPkg || srcPkg === tgtPkg) continue;

    const key = `${srcPkg} -> ${tgtPkg}`;
    if (!seams.has(key)) seams.set(key, { count: 0, typeOnly: 0, bindings: new Set() });
    const s = seams.get(key)!;
    s.count++;
    if (e.type_only) s.typeOnly++;
    for (const b of e.bindings) s.bindings.add(b);
  }

  if (seams.size === 0) {
    console.log("No cross-package edges found.");
    return;
  }

  console.log(`${seams.size} cross-package seams:\n`);
  console.log("  edges  type-only  symbols  seam");
  for (const [key, s] of [...seams.entries()].sort((a, b) => b[1].count - a[1].count)) {
    console.log(
      `  ${s.count.toString().padStart(5)}` +
        `  ${s.typeOnly.toString().padStart(9)}` +
        `  ${s.bindings.size.toString().padStart(7)}` +
        `  ${key}`,
    );
  }
}

function printCone(): void {
  if (!commandArgs[0]) {
    process.stderr.write("Usage: source-analysis deps cone <file-or-dir>\n");
    process.exit(1);
  }
  const startPath = resolvePathArg(commandArgs[0]);

  const consumers = buildConsumerMap();

  // Seed: all files matching the start path (exact file or directory prefix)
  const isDir = !startPath.endsWith(".ts") && !startPath.endsWith(".tsx");
  const prefix = isDir ? (startPath.endsWith("/") ? startPath : startPath + "/") : null;
  const seeds = new Set<string>();
  for (const e of data.edges) {
    if (prefix) {
      if (e.source.startsWith(prefix)) seeds.add(e.source);
      if (e.target.startsWith(prefix)) seeds.add(e.target);
    } else if (e.source === startPath || e.target === startPath) {
      seeds.add(startPath);
    }
  }

  if (seeds.size === 0) {
    console.log(`No files found matching "${startPath}".`);
    return;
  }

  const downstream = bfsCone(seeds, consumers);

  console.log(
    `Cone from ${startPath}: ${seeds.size} seed file(s), ${downstream.length} downstream\n`,
  );

  // Group downstream by directory
  const byDir = new Map<string, string[]>();
  for (const f of downstream) {
    const dir = f.split("/").slice(0, -1).join("/");
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)!.push(f);
  }

  console.log("  files  directory");
  for (const [dir, files] of [...byDir.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${files.length.toString().padStart(5)}  ${dir}`);
  }

  if (downstream.length <= 50) {
    console.log("\nAll affected files:");
    for (const f of downstream) console.log(`  ${f}`);
  } else {
    console.log(`\nTop 50 affected files (of ${downstream.length}):`);
    for (const f of downstream.slice(0, 50)) console.log(`  ${f}`);
    console.log(`  ... and ${downstream.length - 50} more`);
  }
}

function printOrphans(): void {
  const prefix = resolvePathArg(commandArgs[0] || "");
  const pfx = prefix ? (prefix.endsWith("/") ? prefix : prefix + "/") : "";

  const noInbound = pfx
    ? new Set([...data.orphans.no_inbound].filter((f) => f.startsWith(pfx)))
    : new Set(data.orphans.no_inbound);
  const noOutbound = pfx
    ? new Set([...data.orphans.no_outbound].filter((f) => f.startsWith(pfx)))
    : new Set(data.orphans.no_outbound);

  // Classify
  const entryPoints: string[] = []; // no inbound, has outbound
  const leaves: string[] = [];      // has inbound, no outbound
  const islands: string[] = [];     // both: no inbound AND no outbound

  for (const f of noInbound) {
    if (noOutbound.has(f)) {
      islands.push(f);
    } else {
      entryPoints.push(f);
    }
  }
  for (const f of noOutbound) {
    if (!noInbound.has(f)) {
      leaves.push(f);
    }
  }

  entryPoints.sort();
  leaves.sort();
  islands.sort();

  console.log(
    `Orphans${prefix ? ` in ${prefix}` : ""}: ${entryPoints.length} entry points, ${leaves.length} leaves, ${islands.length} islands\n`,
  );

  if (entryPoints.length > 0) {
    console.log(`Entry points (no inbound, has outbound — probable API surface or main files):`);
    for (const f of entryPoints) console.log(`  ${f}`);
    console.log();
  }

  if (leaves.length > 0) {
    console.log(`Leaves (has inbound, no outbound — terminal consumers):`);
    for (const f of leaves) console.log(`  ${f}`);
    console.log();
  }

  if (islands.length > 0) {
    console.log(`Islands (no inbound AND no outbound — potentially dead code):`);
    for (const f of islands) console.log(`  ${f}`);
  }
}

function buildConsumerMap(): Map<string, Set<string>> {
  const consumers = new Map<string, Set<string>>();
  for (const e of data.edges) {
    if (!consumers.has(e.target)) consumers.set(e.target, new Set());
    consumers.get(e.target)!.add(e.source);
  }
  return consumers;
}

function bfsCone(seeds: Set<string>, consumers: Map<string, Set<string>>): string[] {
  const affected = new Set<string>(seeds);
  const queue = [...seeds];
  while (queue.length > 0) {
    const file = queue.shift()!;
    const deps = consumers.get(file);
    if (!deps) continue;
    for (const d of deps) {
      if (!affected.has(d)) {
        affected.add(d);
        queue.push(d);
      }
    }
  }
  return [...affected].filter((f) => !seeds.has(f)).sort();
}

function printSymbolCone(): void {
  const symbol = commandArgs[0];
  if (!symbol) {
    process.stderr.write("Usage: source-analysis deps symbol-cone <symbol-name>\n");
    process.exit(1);
  }

  // Find all files that directly import this symbol
  const directImporters = new Set<string>();
  for (const e of data.edges) {
    if (e.bindings.includes(symbol)) {
      directImporters.add(e.source);
    }
  }

  if (directImporters.size === 0) {
    console.log(`No imports of "${symbol}" found in the graph.`);
    return;
  }

  const consumers = buildConsumerMap();
  const downstream = bfsCone(directImporters, consumers);

  console.log(
    `Symbol cone for "${symbol}": ${directImporters.size} direct importers, ` +
      `${downstream.length} transitively affected\n`,
  );

  // Group downstream by directory
  const byDir = new Map<string, string[]>();
  for (const f of downstream) {
    const dir = f.split("/").slice(0, -1).join("/");
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)!.push(f);
  }

  console.log("  files  directory");
  for (const [dir, files] of [...byDir.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${files.length.toString().padStart(5)}  ${dir}`);
  }

  console.log(`\nDirect importers (${directImporters.size}):`);
  for (const f of [...directImporters].sort()) console.log(`  ${f}`);
}

function printTestCoverage(): void {
  const prefix = resolvePathArg(commandArgs[0] || "");

  // Find test→production edges: source in test/, target in src/
  const testEdges = data.edges.filter((e) => {
    const parts = e.source.split("/");
    // Match packages/X/test/... → packages/X/src/... or packages/X/out/...
    const isTest =
      (parts[0] === "packages" && parts.length >= 3 && parts[2] === "test") ||
      e.source.includes("/test/");
    const isProd =
      e.target.includes("/src/") || e.target.includes("/out/");
    if (!isTest || !isProd) return false;
    if (prefix) {
      const p = prefix.endsWith("/") ? prefix : prefix + "/";
      return e.source.startsWith(p) || e.target.startsWith(p);
    }
    return true;
  });

  if (testEdges.length === 0) {
    console.log(prefix ? `No test→production edges under "${prefix}".` : "No test→production edges found.");
    return;
  }

  // Group by production file: which production files are tested?
  const byProd = new Map<string, Set<string>>();
  for (const e of testEdges) {
    if (!byProd.has(e.target)) byProd.set(e.target, new Set());
    byProd.get(e.target)!.add(e.source);
  }

  // Group by test file: what does each test exercise?
  const byTest = new Map<string, Set<string>>();
  for (const e of testEdges) {
    if (!byTest.has(e.source)) byTest.set(e.source, new Set());
    byTest.get(e.source)!.add(e.target);
  }

  console.log(
    `${testEdges.length} test→production edges: ` +
      `${byTest.size} test files exercise ${byProd.size} production files` +
      (prefix ? ` under ${prefix}` : "") +
      "\n",
  );

  console.log("Production files by test coverage (most tested first):");
  console.log("  tests  production file");
  for (const [prod, tests] of [...byProd.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 30)) {
    console.log(`  ${tests.size.toString().padStart(5)}  ${prod}`);
  }
  if (byProd.size > 30) console.log(`  ... and ${byProd.size - 30} more`);

  console.log(`\nTest files by breadth (widest imports first):`);
  console.log("  prods  test file");
  for (const [test, prods] of [...byTest.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 20)) {
    console.log(`  ${prods.size.toString().padStart(5)}  ${test}`);
  }
  if (byTest.size > 20) console.log(`  ... and ${byTest.size - 20} more`);
}

// ── Dispatch ────────────────────────────────────────────────────────────

const USAGE = `Usage: pnpm source-analysis deps <command> [args] [--repo <path>] [--target <name>] [--profile-path <path>] [--file path.json]

Calibration (start here):
  stale                         Explain live mode or check a materialized snapshot for staleness
  blindspots                    Unresolved imports, uncovered files, barrel stats

Discovery:
  summary                       High-level stats and available scopes
  packages                      List packages with their subsystem names
  dirs [prefix] [depth]         Browse directories with edge counts
  files [prefix]                List files ranked by edge count

Focused queries:
  seam <from-dir> <to-dir>      Edges crossing a boundary, with symbols
  bindings <from-dir> <to-dir>  Just the unique symbol names at a boundary
  who-imports <symbol>          All files that import a symbol (resolves barrels)
  cone <file-or-dir>            Transitive impact cone (what breaks if this changes?)
  symbol-cone <symbol>          Transitive impact cone for a symbol name
  matrix [scope]                Coupling matrix (lists available if no scope given)
  cycles                        Directory-level strongly connected components
  profile <dir>                 Coupling summary for a directory
  file <path>                   Imports from and to a specific file
  orphans [dir]                 Classified orphan files (entry points, leaves, islands)
  externals [dir]               Third-party packages imported by a directory
  cross-package                 All package-to-package seams with symbol counts
  test-coverage [dir]           Which production files are exercised by tests

Flags (for seam/bindings):
  --type-only                   Show only type-level imports
  --value-only                  Show only value-level imports

Use --repo <path> to analyze another checkout; otherwise the current working directory is analyzed.
Use --target <name> and --profile-path <path> to shape the live repo session/profile selection.
By default, deps queries analyze the current workspace live.
Use --file <path.json> only for explicit materialized/offline inspection.`;

switch (command) {
  case "summary":
    printSummary();
    break;
  case "seam":
    printSeam();
    break;
  case "bindings":
    printBindings();
    break;
  case "matrix":
    printMatrix();
    break;
  case "cycles":
    printCycles();
    break;
  case "profile":
    printProfile();
    break;
  case "file":
    printFile();
    break;
  case "dirs":
    printDirs();
    break;
  case "packages":
    printPackages();
    break;
  case "files":
    printFiles();
    break;
  case "stale":
    printStale();
    break;
  case "blindspots":
    printBlindspots();
    break;
  case "who-imports":
    printWhoImports();
    break;
  case "externals":
    printExternals();
    break;
  case "cross-package":
    printCrossPackage();
    break;
  case "cone":
    printCone();
    break;
  case "symbol-cone":
    printSymbolCone();
    break;
  case "orphans":
    printOrphans();
    break;
  case "test-coverage":
    printTestCoverage();
    break;
  default:
    console.log(USAGE);
    break;
}
