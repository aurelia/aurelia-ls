/**
 * Query tool for type-reference graph JSON. See schema.ts for the schema.
 *
 * Usage: pnpm source-analysis typerefs <command> [args] [--file path/to/typerefs.json]
 */

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

import { createRefreshCommand, createSnapshotPaths, resolveSnapshotTarget } from '../snapshot-config.js';
import { formatInspectionMembers, inspectExportRecord } from '../exports/inspect.js';
import type { ExportsOutput } from '../exports/schema.js';
import { loadJsonSnapshot, resolveCurrentSnapshotPath, type SnapshotOptions } from '../snapshots.js';
import type { TypeRefsOutput, TypeDecl } from './schema.js';

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

const command = args[0];
const commandArgs = args.slice(1);
const lockWaitMsRaw = process.env.ANALYZER_LOCK_WAIT_MS;
const lockWaitMs = lockWaitMsRaw ? Number(lockWaitMsRaw) : 5000;
const PATHS = createSnapshotPaths(import.meta.url);
const selection = resolveSnapshotTarget({
  target: targetArg,
  repoPath: repoArg,
  profilePath: profilePathArg,
});
const target = selection.target;
const refreshCommand = createRefreshCommand('typerefs', selection);
let exportsSnapshotCache: ExportsOutput | null | undefined;

if (!Number.isFinite(lockWaitMs) || lockWaitMs < 0) {
  process.stderr.write(
    `Error: ANALYZER_LOCK_WAIT_MS must be a non-negative number (got "${lockWaitMsRaw}").\n`,
  );
  process.exit(1);
}

function resolveDefaultTypeRefsJsonPath(): string {
  return resolveCurrentSnapshotPath(PATHS, {
    target,
    kind: 'typerefs',
    waitMs: lockWaitMs,
    refreshCommand,
    repoPath: selection.repoPath,
  });
}

function loadTypeRefsJson(path: string): TypeRefsOutput {
  return loadJsonSnapshot<TypeRefsOutput>(path, lockWaitMs);
}

function loadCurrentExportsSnapshot(): ExportsOutput | null {
  if (exportsSnapshotCache !== undefined) {
    return exportsSnapshotCache;
  }

  if (jsonPath) {
    const siblingExportsPath = jsonPath
      .replace(/-typerefs\.json$/i, '-exports.json')
      .replace(/typerefs\.json$/i, 'exports.json');

    if (siblingExportsPath !== jsonPath) {
      try {
        exportsSnapshotCache = loadJsonSnapshot<ExportsOutput>(siblingExportsPath, lockWaitMs);
        return exportsSnapshotCache;
      } catch {
        // Fall back to current snapshot resolution below.
      }
    }
  }

  const options: SnapshotOptions = {
    target,
    kind: 'exports',
    waitMs: lockWaitMs,
    refreshCommand: createRefreshCommand('exports', selection),
    repoPath: selection.repoPath,
  };

  try {
    const snapshotPath = resolveCurrentSnapshotPath(PATHS, options);
    exportsSnapshotCache = loadJsonSnapshot<ExportsOutput>(snapshotPath, lockWaitMs);
  } catch {
    exportsSnapshotCache = null;
  }

  return exportsSnapshotCache;
}

let data: TypeRefsOutput;
if (jsonPath) {
  try {
    data = loadTypeRefsJson(jsonPath);
  } catch (err) {
    process.stderr.write(`Error reading ${jsonPath}: ${(err as Error).message}\n`);
    process.exit(1);
  }
} else {
  try {
    jsonPath = resolveDefaultTypeRefsJsonPath();
    data = loadTypeRefsJson(jsonPath);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith("LOCK_TIMEOUT:") || msg.startsWith("CURRENT_SNAPSHOT_UNAVAILABLE:")) {
      process.stderr.write(`${msg}\n`);
    } else {
      process.stderr.write(
        `Error reading ${jsonPath ?? "<unset>"}: ${msg}\n` +
          "Stop and escalate to user; do not fallback to stale dated snapshots.\n",
      );
    }
    process.exit(1);
  }
}

// ── Build indexes ───────────────────────────────────────────────────────

// Name → declarations (may have multiple for same-name types in different files)
const byName = new Map<string, TypeDecl[]>();
for (const d of data.declarations) {
  if (!byName.has(d.name)) byName.set(d.name, []);
  byName.get(d.name)!.push(d);
}

// File → declarations in that file
const byFile = new Map<string, TypeDecl[]>();
for (const d of data.declarations) {
  if (!byFile.has(d.file)) byFile.set(d.file, []);
  byFile.get(d.file)!.push(d);
}

// File-qualified indexes (prevents name-conflation across files)
// Key format: "name\0file" — ensures same-named types in different files are distinct nodes.

function qualKey(name: string, file: string): string { return `${name}\0${file}`; }
function qualName(key: string): string { return key.split("\0")[0]!; }
function qualFile(key: string): string { return key.split("\0")[1]!; }

// Qualified inbound: "targetName\0targetFile" → set of "refererName\0refererFile"
const qualInbound = new Map<string, Set<string>>();
// Qualified outbound: "sourceName\0sourceFile" → set of "targetName\0targetFile"
const qualOutbound = new Map<string, Set<string>>();

for (const d of data.declarations) {
  const srcKey = qualKey(d.name, d.file);
  if (!qualOutbound.has(srcKey)) qualOutbound.set(srcKey, new Set());
  for (const r of d.refs) {
    const tgtKey = qualKey(r.target, r.target_file);
    qualOutbound.get(srcKey)!.add(tgtKey);
    if (!qualInbound.has(tgtKey)) qualInbound.set(tgtKey, new Set());
    qualInbound.get(tgtKey)!.add(srcKey);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Resolve a qualified key back to its TypeDecl. */
function declFromQualKey(key: string): TypeDecl | undefined {
  return byName.get(qualName(key))?.find((d) => d.file === qualFile(key));
}

/** File-qualified inbound count for a specific declaration. */
function qualInboundCount(d: TypeDecl): number {
  return qualInbound.get(qualKey(d.name, d.file))?.size ?? 0;
}

function findDecl(name: string): TypeDecl[] {
  const exact = byName.get(name);
  if (exact) return exact;
  // Try case-insensitive
  for (const [k, v] of byName) {
    if (k.toLowerCase() === name.toLowerCase()) return v;
  }
  return [];
}

function getSubsystem(file: string): string | null {
  const parts = file.split("/");
  // packages/X/src/SUBSYSTEM/...
  if (parts[0] === "packages" && parts[2] === "src" && parts.length >= 5) {
    return `${parts[0]}/${parts[1]}/src/${parts[3]}`;
  }
  return null;
}

function getPackage(file: string): string | null {
  const parts = file.split("/");
  if (parts[0] === "packages" && parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  return null;
}

/** Match a subsystem string against a user-supplied argument (full path or short name). */
function matchesSubsystem(sub: string | null, file: string, arg: string): boolean {
  if (!sub) return false;
  // Exact match: "packages/compiler/src/model" === "packages/compiler/src/model"
  if (sub === arg) return true;
  // Short name match: "model" matches "packages/compiler/src/model"
  if (sub.endsWith("/" + arg)) return true;
  // Prefix match on file: "packages/compiler/src/model" startsWith "packages/compiler/src/model/"
  if (file.startsWith(arg + "/")) return true;
  return false;
}

// ── Commands ────────────────────────────────────────────────────────────

function printSummary(): void {
  const s = data.summary;
  const lines = [
    `Source:              ${jsonPath}`,
    `Generated:           ${data.generated_at}`,
    `Source commit:        ${data.source_commit?.slice(0, 10) ?? "unknown"}`,
    `Analyzer commit:     ${data.analyzer_commit?.slice(0, 10) ?? "unknown"}`,
    `Snapshot target:     ${data.profile.target}`,
    `Profile:             ${data.profile.profileId}${data.profile.profilePath ? ` (${data.profile.profilePath})` : ''}`,
    `Excluded prefixes:   ${data.profile.excludedRepoRelativePrefixes.length}`,
    `Files analyzed:      ${s.files_analyzed}`,
    `Type declarations:   ${s.type_declarations}`,
    `Type references:     ${s.type_references}`,
    `Root types:          ${s.root_types}`,
    `Leaf types:          ${s.leaf_types}`,
    "",
    "Declarations by kind:",
  ];

  const kindCounts = new Map<string, number>();
  for (const d of data.declarations) {
    kindCounts.set(d.kind, (kindCounts.get(d.kind) || 0) + 1);
  }
  for (const [kind, count] of [...kindCounts.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${count.toString().padStart(6)}  ${kind}`);
  }

  lines.push("", "Declarations by package:");
  const pkgCounts = new Map<string, number>();
  for (const d of data.declarations) {
    const pkg = getPackage(d.file) ?? "(root)";
    pkgCounts.set(pkg, (pkgCounts.get(pkg) || 0) + 1);
  }
  for (const [pkg, count] of [...pkgCounts.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${count.toString().padStart(6)}  ${pkg}`);
  }

  console.log(lines.join("\n"));
}

function printType(): void {
  const name = commandArgs[0];
  if (!name) {
    process.stderr.write("Usage: source-analysis typerefs type <name>\n");
    process.exit(1);
  }

  const decls = findDecl(name);
  if (decls.length === 0) {
    console.log(`No type declaration found for "${name}".`);
    // Suggest similar names
    const suggestions = [...byName.keys()]
      .filter((k) => k.toLowerCase().includes(name.toLowerCase()))
      .slice(0, 10);
    if (suggestions.length > 0) {
      console.log(`Did you mean: ${suggestions.join(", ")}?`);
    }
    return;
  }

  if (decls.length > 1) {
    console.log(`Note: ${decls.length} declarations share the name "${decls[0]!.name}" in different files.\n`);
  }

  for (const d of decls) {
    console.log(`${d.kind} ${d.name}  (${d.file}:${d.line})`);
    console.log(`  exported: ${d.exported}`);
    if (d.type_params) console.log(`  type params: <${d.type_params.join(", ")}>`);

    // Show alias body for type aliases
    if (d.alias_body) {
      console.log(`\n  Body: ${d.alias_body}`);
    }
    if (d.literal_values) {
      console.log(`\n  Literal values (${d.literal_values.length}): ${d.literal_values.map((v) => JSON.stringify(v)).join(", ")}`);
    }

    if (d.refs.length > 0) {
      console.log(`\n  References (${d.refs.length}):`);
      // Group by target
      const byTarget = new Map<string, typeof d.refs>();
      for (const r of d.refs) {
        if (!byTarget.has(r.target)) byTarget.set(r.target, []);
        byTarget.get(r.target)!.push(r);
      }
      for (const [target, refs] of [...byTarget.entries()].sort()) {
        const file = refs[0]!.target_file;
        const kinds = refs.map((r) => {
          const ctx = r.context ? ` (${r.context})` : "";
          return `${r.kind}${ctx}`;
        });
        console.log(`    → ${target}  [${file}]`);
        for (const k of kinds) console.log(`        ${k}`);
      }
    } else {
      console.log("\n  References: none (leaf type)");
    }

    // Show who references this type (file-qualified to avoid name conflation)
    const consumerKeys = qualInbound.get(qualKey(d.name, d.file));
    if (consumerKeys && consumerKeys.size > 0) {
      // Resolve to declarations and deduplicate
      const consumers: TypeDecl[] = [];
      for (const ck of consumerKeys) {
        const cd = declFromQualKey(ck);
        if (cd) consumers.push(cd);
      }
      consumers.sort((a, b) => a.name.localeCompare(b.name) || a.file.localeCompare(b.file));
      console.log(`\n  Referenced by (${consumers.length}):`);
      for (const cd of consumers.slice(0, 30)) {
        console.log(`    ← ${cd.name}  (${cd.file}:${cd.line})`);
      }
      if (consumers.length > 30) {
        console.log(`    ... and ${consumers.length - 30} more`);
      }
    } else {
      console.log("\n  Referenced by: none (root type)");
    }
    console.log();
  }
}

function printWhoRefs(): void {
  const name = commandArgs[0];
  if (!name) {
    process.stderr.write("Usage: source-analysis typerefs who-refs <name>\n");
    process.exit(1);
  }

  const decls = byName.get(name);
  if (!decls || decls.length === 0) {
    console.log(`No type declaration found for "${name}".`);
    return;
  }

  // Helper to show consumers for a specific target declaration
  function showConsumers(targetDecl: TypeDecl, label?: string): void {
    const consumerKeys = qualInbound.get(qualKey(targetDecl.name, targetDecl.file));
    if (!consumerKeys || consumerKeys.size === 0) {
      if (label) console.log(`${label}: no references.`);
      else console.log(`No types reference "${name}".`);
      return;
    }

    // Resolve to declarations
    const consumers: TypeDecl[] = [];
    for (const ck of consumerKeys) {
      const cd = declFromQualKey(ck);
      if (cd) consumers.push(cd);
    }

    if (label) console.log(`${label}: ${consumers.length} types:\n`);
    else console.log(`${consumers.length} types reference "${name}":\n`);

    // Group by package
    const byPkg = new Map<string, TypeDecl[]>();
    for (const d of consumers) {
      const pkg = getPackage(d.file) ?? "(root)";
      if (!byPkg.has(pkg)) byPkg.set(pkg, []);
      byPkg.get(pkg)!.push(d);
    }

    for (const [pkg, pkgDecls] of [...byPkg.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${pkg}/ (${pkgDecls.length}):`);
      for (const d of pkgDecls.sort((a, b) => a.name.localeCompare(b.name))) {
        // Show how it references the target — filter by target_file for accuracy
        const refKinds = d.refs
          .filter((r) => r.target === name && r.target_file === targetDecl.file)
          .map((r) => r.kind + (r.context ? `(${r.context})` : ""));
        console.log(`    ${d.name}  ${d.file}:${d.line}  [${refKinds.join(", ")}]`);
      }
    }
  }

  if (decls.length === 1) {
    showConsumers(decls[0]!);
  } else {
    console.log(`${decls.length} declarations of "${name}":\n`);
    for (const d of decls) {
      showConsumers(d, `  ${d.name}  (${d.file}:${d.line})`);
      console.log();
    }
  }
}

function printRefsOf(): void {
  const name = commandArgs[0];
  if (!name) {
    process.stderr.write("Usage: source-analysis typerefs refs-of <name>\n");
    process.exit(1);
  }

  const decls = findDecl(name);
  if (decls.length === 0) {
    console.log(`No type declaration found for "${name}".`);
    return;
  }

  for (const d of decls) {
    if (d.refs.length === 0) {
      console.log(`${d.name} (${d.file}:${d.line}) references no project types.`);
      continue;
    }

    console.log(`${d.name} (${d.file}:${d.line}) references ${d.refs.length} types:\n`);
    for (const r of d.refs) {
      const ctx = r.context ? ` (${r.context})` : "";
      console.log(`  → ${r.target}  [${r.kind}${ctx}]  ${r.target_file}`);
    }
    console.log();
  }
}

function printCone(): void {
  const name = commandArgs[0];
  if (!name) {
    process.stderr.write("Usage: source-analysis typerefs cone <type-name>\n");
    process.exit(1);
  }

  const decls = findDecl(name);
  if (decls.length === 0) {
    console.log(`No type declaration found for "${name}".`);
    return;
  }

  // BFS using file-qualified keys to avoid name-conflation
  const seedKeys = new Set(decls.map((d) => qualKey(d.name, d.file)));
  const affected = new Set<string>(seedKeys);
  const queue = [...seedKeys];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const consumers = qualInbound.get(current);
    if (!consumers) continue;
    for (const key of consumers) {
      if (!affected.has(key)) {
        affected.add(key);
        queue.push(key);
      }
    }
  }

  for (const s of seedKeys) affected.delete(s);

  if (affected.size === 0) {
    console.log(`No types transitively depend on "${name}".`);
    return;
  }

  console.log(`Type cone for "${name}": ${affected.size} transitively affected types\n`);

  // Group by package
  const byPkg = new Map<string, string[]>();
  for (const key of affected) {
    const pkg = getPackage(qualFile(key)) ?? "(root)";
    if (!byPkg.has(pkg)) byPkg.set(pkg, []);
    byPkg.get(pkg)!.push(qualName(key));
  }

  console.log("  types  package");
  for (const [pkg, types] of [...byPkg.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${types.length.toString().padStart(5)}  ${pkg}`);
  }

  // Also group by subsystem
  const bySub = new Map<string, string[]>();
  for (const key of affected) {
    const file = qualFile(key);
    const sub = getSubsystem(file) ?? file.split("/").slice(0, -1).join("/");
    if (!bySub.has(sub)) bySub.set(sub, []);
    bySub.get(sub)!.push(qualName(key));
  }

  console.log("\n  types  subsystem/directory");
  for (const [sub, types] of [...bySub.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
    console.log(`  ${types.length.toString().padStart(5)}  ${sub}`);
  }

  if (affected.size <= 60) {
    console.log("\nAll affected types:");
    for (const key of [...affected].sort()) {
      const n = qualName(key);
      const f = qualFile(key);
      const decl = byName.get(n)?.find((d) => d.file === f);
      console.log(`  ${n}  (${f}${decl ? `:${decl.line}` : ""})`);
    }
  } else {
    console.log(`\nFirst 60 affected types (of ${affected.size}):`);
    for (const key of [...affected].sort().slice(0, 60)) {
      const n = qualName(key);
      const f = qualFile(key);
      const decl = byName.get(n)?.find((d) => d.file === f);
      console.log(`  ${n}  (${f}${decl ? `:${decl.line}` : ""})`);
    }
  }
}

function printRoots(): void {
  // Types with no inbound references (file-qualified to avoid false exclusions)
  const referenced = new Set<string>();
  for (const d of data.declarations) {
    for (const r of d.refs) referenced.add(qualKey(r.target, r.target_file));
  }

  const roots = data.declarations.filter(
    (d) => !referenced.has(qualKey(d.name, d.file)) && d.refs.length > 0,
  );
  roots.sort((a, b) => b.refs.length - a.refs.length);

  console.log(`${roots.length} root types (not referenced by any other type, but reference others):\n`);
  console.log("  refs  kind       name  file");
  for (const d of roots.slice(0, 50)) {
    console.log(
      `  ${d.refs.length.toString().padStart(4)}  ${d.kind.padEnd(10)} ${d.name}  ${d.file}:${d.line}`,
    );
  }
  if (roots.length > 50) console.log(`  ... and ${roots.length - 50} more`);
}

function printLeaves(): void {
  // Types with no outbound references but have inbound
  const leaves = data.declarations.filter((d) => d.refs.length === 0);

  // File-qualified inbound counts
  const leavesWithInbound = leaves
    .map((d) => ({ ...d, inbound: qualInboundCount(d) }))
    .filter((d) => d.inbound > 0)
    .sort((a, b) => b.inbound - a.inbound);

  console.log(
    `${leavesWithInbound.length} leaf types (no outbound references, but referenced by others):\n`,
  );
  console.log("  inbound  kind       name  file");
  for (const d of leavesWithInbound.slice(0, 50)) {
    console.log(
      `  ${d.inbound.toString().padStart(7)}  ${d.kind.padEnd(10)} ${d.name}  ${d.file}:${d.line}`,
    );
  }
  if (leavesWithInbound.length > 50) {
    console.log(`  ... and ${leavesWithInbound.length - 50} more`);
  }
}

function printHubs(): void {
  // Types ranked by total reference count (inbound + outbound)
  // Use file-qualified inbound counts for accuracy
  const ranked = data.declarations
    .map((d) => {
      const inbound = qualInboundCount(d);
      return {
        ...d,
        inbound,
        outbound: d.refs.length,
        total: inbound + d.refs.length,
      };
    })
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);

  console.log(`Type hubs (ranked by total reference count):\n`);
  console.log("  total  inbound  outbound  kind       name  file");
  for (const d of ranked.slice(0, 50)) {
    console.log(
      `  ${d.total.toString().padStart(5)}` +
        `  ${d.inbound.toString().padStart(7)}` +
        `  ${d.outbound.toString().padStart(8)}` +
        `  ${d.kind.padEnd(10)} ${d.name}  ${d.file}:${d.line}`,
    );
  }
  if (ranked.length > 50) console.log(`  ... and ${ranked.length - 50} more`);
}

function printCluster(): void {
  const name = commandArgs[0];
  if (!name) {
    process.stderr.write("Usage: source-analysis typerefs cluster <type-name>\n");
    process.exit(1);
  }

  // Validate type exists
  const decls = findDecl(name);
  if (decls.length === 0) {
    console.log(`No type declaration found for "${name}".`);
    const suggestions = [...byName.keys()]
      .filter((k) => k.toLowerCase().includes(name.toLowerCase()))
      .slice(0, 10);
    if (suggestions.length > 0) {
      console.log(`Did you mean: ${suggestions.join(", ")}?`);
    }
    return;
  }

  // BFS in both directions using file-qualified keys
  const seedKeys = decls.map((d) => qualKey(d.name, d.file));
  const component = new Set<string>(seedKeys);
  const queue = [...seedKeys];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of qualOutbound.get(current) || []) {
      if (!component.has(neighbor)) {
        component.add(neighbor);
        queue.push(neighbor);
      }
    }
    for (const neighbor of qualInbound.get(current) || []) {
      if (!component.has(neighbor)) {
        component.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  console.log(`Connected component containing "${name}": ${component.size} types\n`);

  // Group by subsystem
  const bySub = new Map<string, string[]>();
  for (const key of component) {
    const file = qualFile(key);
    const sub = getSubsystem(file) ?? getPackage(file) ?? "(root)";
    if (!bySub.has(sub)) bySub.set(sub, []);
    bySub.get(sub)!.push(qualName(key));
  }

  console.log("  types  subsystem");
  for (const [sub, types] of [...bySub.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${types.length.toString().padStart(5)}  ${sub}`);
  }

  if (component.size <= 80) {
    console.log("\nAll types:");
    for (const key of [...component].sort()) {
      const n = qualName(key);
      const f = qualFile(key);
      const decl = byName.get(n)?.find((d) => d.file === f);
      console.log(`  ${n}  (${f}${decl ? `:${decl.line}` : ""})`);
    }
  }
}

function printFileTypes(): void {
  const filePath = commandArgs[0];
  if (!filePath) {
    process.stderr.write("Usage: source-analysis typerefs file <repo-relative-path>\n");
    process.exit(1);
  }

  // Find by exact match or prefix
  let decls = byFile.get(filePath);
  if (!decls) {
    // Try prefix match
    const matches: TypeDecl[] = [];
    for (const [f, ds] of byFile) {
      if (f.startsWith(filePath)) matches.push(...ds);
    }
    // Try suffix match: "model/identity.ts" → "packages/compiler/src/model/identity.ts"
    if (matches.length === 0) {
      const matchingFiles = [...byFile.keys()].filter((f) => f.endsWith("/" + filePath));
      if (matchingFiles.length === 1) {
        matches.push(...byFile.get(matchingFiles[0]!)!);
      } else if (matchingFiles.length > 1) {
        console.log(`"${filePath}" matches ${matchingFiles.length} files. Use a more specific path:`);
        for (const f of matchingFiles.sort()) console.log(`  ${f}`);
        return;
      }
    }
    if (matches.length === 0) {
      console.log(`No type declarations found in "${filePath}".`);
      return;
    }
    decls = matches;
  }

  console.log(`${decls.length} type declarations in ${filePath}:\n`);

  for (const d of decls.sort((a, b) => a.line - b.line)) {
    const inCount = qualInboundCount(d);
    console.log(
      `  :${d.line}  ${d.kind.padEnd(10)} ${d.exported ? "export " : "       "}${d.name}` +
        `  (${d.refs.length} refs out, ${inCount} refs in)`,
    );
    if (d.refs.length > 0) {
      const targets = [...new Set(d.refs.map((r) => r.target))].sort();
      console.log(`    → ${targets.join(", ")}`);
    }
  }
}

function printCrossSubsystem(): void {
  const rawScope = commandArgs[0];

  // Helper: count cross-subsystem refs within a package
  function countCrossRefs(pkgFilter?: string) {
    const crossRefs: Array<{
      fromType: string;
      fromSub: string;
      toType: string;
      toSub: string;
      kind: string;
    }> = [];

    for (const d of data.declarations) {
      const fromPkg = getPackage(d.file);
      if (!fromPkg) continue;
      if (pkgFilter && fromPkg !== pkgFilter) continue;
      const fromSub = getSubsystem(d.file);
      if (!fromSub) continue;
      // When scoped to a subsystem, filter further
      if (scope && !d.file.startsWith(scope + "/") && !matchesSubsystem(fromSub, d.file, scope)) continue;

      for (const r of d.refs) {
        const toPkg = getPackage(r.target_file);
        if (toPkg !== fromPkg) continue;
        const toSub = getSubsystem(r.target_file);
        if (!toSub || toSub === fromSub) continue;

        crossRefs.push({
          fromType: d.name,
          fromSub,
          toType: r.target,
          toSub,
          kind: r.kind,
        });
      }
    }
    return crossRefs;
  }

  // Resolve package short names: "compiler" → "packages/compiler"
  let scope = rawScope || "";
  if (scope && !scope.startsWith("packages/")) {
    const pkgCandidate = `packages/${scope}`;
    if (data.declarations.some((d) => d.file.startsWith(pkgCandidate + "/"))) {
      scope = pkgCandidate;
    }
  }

  // No scope: show all-packages summary
  if (!scope) {
    const pkgs = new Set<string>();
    for (const d of data.declarations) {
      const pkg = getPackage(d.file);
      if (pkg) pkgs.add(pkg);
    }

    let totalCross = 0;
    const pkgCounts: Array<{ pkg: string; count: number }> = [];
    for (const pkg of [...pkgs].sort()) {
      const refs = countCrossRefs(pkg);
      if (refs.length > 0) {
        pkgCounts.push({ pkg, count: refs.length });
        totalCross += refs.length;
      }
    }

    if (totalCross === 0) {
      console.log("No cross-subsystem type references found in any package.");
      return;
    }

    console.log(`${totalCross} cross-subsystem type references across all packages:\n`);
    console.log("  refs  package");
    for (const { pkg, count } of pkgCounts.sort((a, b) => b.count - a.count)) {
      console.log(`  ${count.toString().padStart(4)}  ${pkg}`);
    }
    console.log(`\nUse 'cross-subsystem <package-or-subsystem>' for details.`);
    return;
  }

  // Scoped query
  const crossRefs = countCrossRefs();

  if (crossRefs.length === 0) {
    console.log(`No cross-subsystem type references found in ${scope}.`);
    return;
  }

  // Aggregate by subsystem pair
  const pairCounts = new Map<string, { count: number; types: Set<string> }>();
  for (const cr of crossRefs) {
    const key = `${cr.fromSub} -> ${cr.toSub}`;
    if (!pairCounts.has(key)) pairCounts.set(key, { count: 0, types: new Set() });
    const entry = pairCounts.get(key)!;
    entry.count++;
    entry.types.add(cr.toType);
  }

  console.log(`${crossRefs.length} cross-subsystem type references in ${scope}:\n`);
  console.log("  refs  types  from -> to");
  for (const [key, val] of [...pairCounts.entries()].sort((a, b) => b[1].count - a[1].count)) {
    console.log(
      `  ${val.count.toString().padStart(4)}` +
        `  ${val.types.size.toString().padStart(5)}` +
        `  ${key}`,
    );
  }

  // Show the type-level detail for top pairs
  console.log("\nTop seams with referenced types:");
  let shown = 0;
  for (const [key, val] of [...pairCounts.entries()].sort((a, b) => b[1].count - a[1].count)) {
    if (shown >= 10) break;
    console.log(`\n  ${key}:`);
    for (const t of [...val.types].sort()) {
      console.log(`    ${t}`);
    }
    shown++;
  }
}

function printMembers(): void {
  const name = commandArgs[0];
  if (!name) {
    process.stderr.write("Usage: source-analysis typerefs members <name>\n");
    process.exit(1);
  }

  const decls = findDecl(name);
  if (decls.length === 0) {
    const exportsSnapshot = loadCurrentExportsSnapshot();
    const matches = exportsSnapshot
      ? exportsSnapshot.exports.filter((record) => record.exported_name.toLowerCase() === name.toLowerCase())
      : [];

    if (matches.length === 0) {
      console.log(`No type declaration found for "${name}".`);
      return;
    }

    console.log(`No type declaration found for "${name}". Showing exported value members instead:\n`);
    const repoRoot = exportsSnapshot?.root || selection.repoPath || process.cwd();
    for (const record of matches.sort((left, right) =>
      left.package_name.localeCompare(right.package_name) ||
      left.exported_name.localeCompare(right.exported_name)
    )) {
      const inspection = inspectExportRecord(record, repoRoot);
      for (const line of formatInspectionMembers(record, inspection)) {
        console.log(line);
      }
      console.log();
    }
    return;
  }

  for (const d of decls) {
    console.log(`${d.kind} ${d.name}  (${d.file}:${d.line})`);
    if (d.type_params) console.log(`  <${d.type_params.join(", ")}>`);

    // Show extends/implements
    const heritage = d.refs.filter((r) => r.kind === "extends" || r.kind === "implements");
    for (const h of heritage) {
      console.log(`  ${h.kind} ${h.target}  [${h.target_file}]`);
    }

    const members = d.members;
    if (!members || members.length === 0) {
      // Show alias body and literal values for type aliases without members
      if (d.alias_body) {
        console.log(`\n  Type alias body:\n    ${d.alias_body}`);
      }
      if (d.literal_values) {
        console.log(`\n  Literal values (${d.literal_values.length}):`);
        for (const v of d.literal_values) {
          console.log(`    ${JSON.stringify(v)}`);
        }
      }
      if (!d.alias_body && !d.literal_values) {
        console.log("\n  No direct members.");
      }
      continue;
    }

    console.log(`\n  ${members.length} members:\n`);
    for (const m of members) {
      const flags: string[] = [];
      if (m.readonly) flags.push("readonly");
      if (m.optional) flags.push("optional");
      const flagStr = flags.length > 0 ? ` [${flags.join(", ")}]` : "";

      // Show enum member values
      const valueStr = m.value ? ` = ${m.value}` : "";

      // Find type refs for this member (refs where context matches member name)
      const memberRefs = d.refs.filter((r) => r.context === m.name);
      const typeStr =
        memberRefs.length > 0
          ? `  → ${memberRefs.map((r) => `${r.target} (${r.kind})`).join(", ")}`
          : "";

      console.log(`    ${m.member_kind.padEnd(14)} ${m.name}${flagStr}${valueStr}${typeStr}`);
    }
    console.log();
  }
}

function printPath(): void {
  const from = commandArgs[0];
  const to = commandArgs[1];
  if (!from || !to) {
    process.stderr.write("Usage: source-analysis typerefs path <from-type> <to-type>\n");
    process.exit(1);
  }

  const fromDecls = findDecl(from);
  const toDecls = findDecl(to);
  if (fromDecls.length === 0) {
    console.log(`Type "${from}" not found.`);
    return;
  }
  if (toDecls.length === 0) {
    console.log(`Type "${to}" not found.`);
    return;
  }

  const fromKeys = fromDecls.map((d) => qualKey(d.name, d.file));
  const toKeySet = new Set(toDecls.map((d) => qualKey(d.name, d.file)));

  // Helper to display a qualified key with location
  function showKey(key: string): string {
    const n = qualName(key);
    const f = qualFile(key);
    const decl = byName.get(n)?.find((d) => d.file === f);
    return `${n}  (${f}${decl ? `:${decl.line}` : ""})`;
  }

  // Helper to get ref kinds between two qualified keys
  function refKindsBetween(srcKey: string, tgtKey: string): string {
    const srcName = qualName(srcKey);
    const srcFile = qualFile(srcKey);
    const tgtName = qualName(tgtKey);
    const decl = byName.get(srcName)?.find((d) => d.file === srcFile);
    if (!decl) return "";
    return decl.refs
      .filter((r) => r.target === tgtName && r.target_file === qualFile(tgtKey))
      .map((r) => r.kind + (r.context ? `(${r.context})` : ""))
      .join(", ");
  }

  // BFS from source to target via outbound refs (file-qualified)
  const parent = new Map<string, string | null>();
  for (const key of fromKeys) parent.set(key, null);
  const queue = [...fromKeys];
  let foundKey: string | null = null;

  while (queue.length > 0 && !foundKey) {
    const current = queue.shift()!;
    const targets = qualOutbound.get(current);
    if (!targets) continue;
    for (const t of targets) {
      if (parent.has(t)) continue;
      parent.set(t, current);
      if (toKeySet.has(t)) {
        foundKey = t;
        break;
      }
      queue.push(t);
    }
  }

  if (!foundKey) {
    // Try reverse: follow inbound edges
    const rParent = new Map<string, string | null>();
    for (const key of fromKeys) rParent.set(key, null);
    const rQueue = [...fromKeys];
    let rFoundKey: string | null = null;

    while (rQueue.length > 0 && !rFoundKey) {
      const current = rQueue.shift()!;
      const consumers = qualInbound.get(current);
      if (!consumers) continue;
      for (const t of consumers) {
        if (rParent.has(t)) continue;
        rParent.set(t, current);
        if (toKeySet.has(t)) {
          rFoundKey = t;
          break;
        }
        rQueue.push(t);
      }
    }

    if (rFoundKey) {
      const path: string[] = [];
      let cur: string | null = rFoundKey;
      while (cur !== null) {
        path.push(cur);
        cur = rParent.get(cur) ?? null;
      }
      path.reverse();

      console.log(
        `Path from ${from} to ${to} (${path.length - 1} hops, following inbound references):\n`,
      );
      for (let i = 0; i < path.length; i++) {
        console.log(`  ${showKey(path[i]!)}`);
        if (i < path.length - 1) {
          const kinds = refKindsBetween(path[i + 1]!, path[i]!);
          console.log(`    ↓ referenced-by [${kinds}]`);
        }
      }
    } else {
      console.log(`No type-reference path between "${from}" and "${to}" in either direction.`);
    }
    return;
  }

  // Reconstruct forward path
  const path: string[] = [];
  let cur: string | null = foundKey;
  while (cur !== null) {
    path.push(cur);
    cur = parent.get(cur) ?? null;
  }
  path.reverse();

  console.log(`Shortest path from ${from} to ${to} (${path.length - 1} hops):\n`);
  for (let i = 0; i < path.length; i++) {
    console.log(`  ${showKey(path[i]!)}`);
    if (i < path.length - 1) {
      const kinds = refKindsBetween(path[i]!, path[i + 1]!);
      console.log(`    ↓ [${kinds}]`);
    }
  }
}

function printBridging(): void {
  const sub1 = commandArgs[0];
  const sub2 = commandArgs[1];
  if (!sub1 || !sub2) {
    process.stderr.write("Usage: source-analysis typerefs bridging <subsystem1> <subsystem2>\n");
    process.stderr.write("  Accepts full paths (packages/compiler/src/model) or short names (model).\n");
    process.stderr.write("  Finds types whose refs reach into both subsystems.\n");
    process.exit(1);
  }

  const bridgers: Array<{
    decl: TypeDecl;
    sub1Types: Set<string>;
    sub2Types: Set<string>;
  }> = [];

  for (const d of data.declarations) {
    const s1Types = new Set<string>();
    const s2Types = new Set<string>();

    for (const r of d.refs) {
      const sub = getSubsystem(r.target_file);
      if (matchesSubsystem(sub, r.target_file, sub1)) {
        s1Types.add(r.target);
      }
      if (matchesSubsystem(sub, r.target_file, sub2)) {
        s2Types.add(r.target);
      }
    }

    if (s1Types.size > 0 && s2Types.size > 0) {
      bridgers.push({ decl: d, sub1Types: s1Types, sub2Types: s2Types });
    }
  }

  if (bridgers.length === 0) {
    // Warn if the subsystem names don't match any declarations
    const sub1Count = data.declarations.filter((d) => matchesSubsystem(getSubsystem(d.file), d.file, sub1)).length;
    const sub2Count = data.declarations.filter((d) => matchesSubsystem(getSubsystem(d.file), d.file, sub2)).length;
    if (sub1Count === 0) process.stderr.write(`Warning: no types found in subsystem "${sub1}".\n`);
    if (sub2Count === 0) process.stderr.write(`Warning: no types found in subsystem "${sub2}".\n`);
    console.log(`No types reference both "${sub1}" and "${sub2}".`);
    return;
  }

  bridgers.sort(
    (a, b) => b.sub1Types.size + b.sub2Types.size - (a.sub1Types.size + a.sub2Types.size),
  );

  console.log(`${bridgers.length} types reference both ${sub1} and ${sub2}:\n`);

  // Group by the bridger's own subsystem
  const byBridgerSub = new Map<string, typeof bridgers>();
  for (const b of bridgers) {
    const sub = getSubsystem(b.decl.file) ?? getPackage(b.decl.file) ?? "(root)";
    if (!byBridgerSub.has(sub)) byBridgerSub.set(sub, []);
    byBridgerSub.get(sub)!.push(b);
  }

  for (const [sub, items] of [...byBridgerSub.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    console.log(`  ${sub}/ (${items.length} bridging types):`);
    for (const b of items) {
      const { decl: d, sub1Types, sub2Types } = b;
      console.log(`    ${d.name}  (${d.file}:${d.line})`);
      console.log(
        `      → ${sub1.split("/").pop()}: ${[...sub1Types].join(", ")}`,
      );
      console.log(
        `      → ${sub2.split("/").pop()}: ${[...sub2Types].join(", ")}`,
      );
    }
  }
}

function printSearch(): void {
  const pattern = commandArgs[0];
  if (!pattern) {
    process.stderr.write("Usage: source-analysis typerefs search <regex-pattern>\n");
    process.stderr.write("  Searches type names, member names, literal values, and alias bodies.\n");
    process.exit(1);
  }

  let re: RegExp;
  try {
    re = new RegExp(pattern, "i");
  } catch (err) {
    console.log(`Invalid regex: ${(err as Error).message}`);
    return;
  }

  const nameHits: TypeDecl[] = [];
  const memberHits: Array<{ decl: TypeDecl; members: string[] }> = [];
  const valueHits: Array<{ decl: TypeDecl; values: string[] }> = [];
  const bodyHits: Array<{ decl: TypeDecl; snippet: string }> = [];

  for (const d of data.declarations) {
    // Name match
    if (re.test(d.name)) {
      nameHits.push(d);
    }

    // Member name match
    if (d.members) {
      const matched = d.members.filter((m) => re.test(m.name)).map((m) => m.name);
      if (matched.length > 0) memberHits.push({ decl: d, members: matched });
    }

    // Literal value match
    if (d.literal_values) {
      const matched = d.literal_values.filter((v) => re.test(v));
      if (matched.length > 0) valueHits.push({ decl: d, values: matched });
    }

    // Alias body match (only if not already a name or value hit)
    if (d.alias_body && re.test(d.alias_body) && !re.test(d.name)) {
      // Extract a short snippet around the match
      const match = d.alias_body.match(re);
      const idx = match?.index ?? 0;
      const start = Math.max(0, idx - 30);
      const end = Math.min(d.alias_body.length, idx + (match?.[0].length ?? 0) + 30);
      const snippet =
        (start > 0 ? "…" : "") +
        d.alias_body.slice(start, end).replace(/\n/g, " ") +
        (end < d.alias_body.length ? "…" : "");
      bodyHits.push({ decl: d, snippet });
    }
  }

  const total = nameHits.length + memberHits.length + valueHits.length + bodyHits.length;
  if (total === 0) {
    console.log(`No matches for /${pattern}/i.`);
    return;
  }

  console.log(`Search /${pattern}/i — ${total} matches:\n`);

  if (nameHits.length > 0) {
    console.log(`Type names (${nameHits.length}):`);
    for (const d of nameHits.slice(0, 30)) {
      const inCount = qualInboundCount(d);
      console.log(`  ${d.kind.padEnd(10)} ${d.name}  (${d.file}:${d.line})  [${d.refs.length} out, ${inCount} in]`);
    }
    if (nameHits.length > 30) console.log(`  ... and ${nameHits.length - 30} more`);
    console.log();
  }

  if (memberHits.length > 0) {
    console.log(`Member names (${memberHits.length} types):`);
    for (const { decl: d, members } of memberHits.slice(0, 30)) {
      console.log(`  ${d.name}  (${d.file}:${d.line})  members: ${members.join(", ")}`);
    }
    if (memberHits.length > 30) console.log(`  ... and ${memberHits.length - 30} more`);
    console.log();
  }

  if (valueHits.length > 0) {
    console.log(`Literal values (${valueHits.length} types):`);
    for (const { decl: d, values } of valueHits.slice(0, 30)) {
      console.log(`  ${d.name}  (${d.file}:${d.line})  values: ${values.map((v) => JSON.stringify(v)).join(", ")}`);
    }
    if (valueHits.length > 30) console.log(`  ... and ${valueHits.length - 30} more`);
    console.log();
  }

  if (bodyHits.length > 0) {
    console.log(`Alias bodies (${bodyHits.length} types):`);
    for (const { decl: d, snippet } of bodyHits.slice(0, 30)) {
      console.log(`  ${d.name}  (${d.file}:${d.line})`);
      console.log(`    ${snippet}`);
    }
    if (bodyHits.length > 30) console.log(`  ... and ${bodyHits.length - 30} more`);
    console.log();
  }
}

function printVocab(): void {
  const scope = commandArgs[0]; // optional subsystem filter

  // Collect all declarations with literal_values
  let candidates = data.declarations.filter((d) => d.literal_values && d.literal_values.length > 0);

  if (scope) {
    candidates = candidates.filter((d) => matchesSubsystem(getSubsystem(d.file), d.file, scope));
  }

  if (candidates.length === 0) {
    console.log(scope ? `No literal union types found in "${scope}".` : "No literal union types found.");
    return;
  }

  // Group by subsystem
  const bySub = new Map<string, TypeDecl[]>();
  for (const d of candidates) {
    const sub = getSubsystem(d.file) ?? getPackage(d.file) ?? "(root)";
    if (!bySub.has(sub)) bySub.set(sub, []);
    bySub.get(sub)!.push(d);
  }

  const totalValues = candidates.reduce((s, d) => s + (d.literal_values?.length ?? 0), 0);
  console.log(`${candidates.length} literal union types, ${totalValues} total values${scope ? ` in ${scope}` : ""}:\n`);

  for (const [sub, decls] of [...bySub.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${sub}/ (${decls.length}):`);
    for (const d of decls.sort((a, b) => a.name.localeCompare(b.name))) {
      const vals = d.literal_values!;
      const valStr = vals.length <= 6
        ? vals.map((v) => JSON.stringify(v)).join(", ")
        : vals.slice(0, 5).map((v) => JSON.stringify(v)).join(", ") + `, … +${vals.length - 5}`;
      console.log(`    ${d.name} (${vals.length}): ${valStr}`);
    }
  }
}

function printStale(): void {
  function gitHead(cwd: string): string {
    try {
      return execSync("git rev-parse HEAD", { cwd, encoding: "utf-8" }).trim();
    } catch {
      return "unknown";
    }
  }

  function gitBlobHash(filePath: string): string {
    try {
      return execSync(`git hash-object "${filePath}"`, { encoding: "utf-8" }).trim();
    } catch {
      return "unknown";
    }
  }

  const sourceRepo = data.root || process.cwd();
  const analyzerPath = resolve(import.meta.dirname!, 'generate.js');

  const currentSourceCommit = gitHead(sourceRepo);
  const currentAnalyzerCommit = gitBlobHash(analyzerPath);

  const sourceMatch = data.source_commit === currentSourceCommit;
  const analyzerMatch = data.analyzer_commit === currentAnalyzerCommit;

  if (sourceMatch && analyzerMatch) {
    console.log("FRESH");
    console.log(`  source:   ${data.source_commit?.slice(0, 10)} (match)`);
    console.log(`  analyzer: ${data.analyzer_commit?.slice(0, 10)} (match)`);
  } else {
    console.log("STALE");
    if (!sourceMatch) {
      console.log(`  source:   ${data.source_commit?.slice(0, 10)} → ${currentSourceCommit.slice(0, 10)}`);
    } else {
      console.log(`  source:   ${data.source_commit?.slice(0, 10)} (match)`);
    }
    if (!analyzerMatch) {
      console.log(`  analyzer: ${data.analyzer_commit?.slice(0, 10)} → ${currentAnalyzerCommit.slice(0, 10)}`);
    } else {
      console.log(`  analyzer: ${data.analyzer_commit?.slice(0, 10)} (match)`);
    }
    console.log(`\nRegenerate: ${refreshCommand}`);
  }
}

// ── Dispatch ────────────────────────────────────────────────────────────

const USAGE = `Usage: pnpm source-analysis typerefs <command> [args] [--target <name>] [--repo <path>] [--profile-path <path>] [--file path.json]

Overview:
  stale                         Check if typerefs JSON needs regeneration
  summary                       High-level stats
  hubs                          Types ranked by total reference count

Discovery:
  search <regex>                Search names, members, values, and alias bodies
  vocab [subsystem]             All literal union types with enumerated values

Type-level queries:
  type <name>                   Full picture: refs, consumers, location
  members <name>                All members with optionality and type refs
  who-refs <name>               All types that reference a given type
  refs-of <name>                All types referenced by a given type
  cone <name>                   Transitive "what breaks if this type changes"
  path <from> <to>              Shortest type-reference path between types
  cluster <name>                Connected component containing a type

Classification:
  roots                         Types not referenced by others (API surface)
  leaves                        Types with no outbound refs (terminal/primitive)

File and structure:
  file <path>                   All types declared in a file
  cross-subsystem [scope]       Type refs crossing subsystem boundaries
  bridging <sub1> <sub2>        Types referencing both subsystems

Use --target <name> to override the snapshot target; otherwise it is derived from the active profile or repo path.
Use --repo <path> to derive or override the current snapshot target from a repo path.
Use --profile-path <path> to select a non-default profile file relative to the repo root.
Defaults to .source-analysis/snapshots/<target>-typerefs.json under the analyzed repo.
If current is locked/missing/unreadable, query stops and must be escalated.`;

switch (command) {
  case "stale":
    printStale();
    break;
  case "summary":
    printSummary();
    break;
  case "search":
    printSearch();
    break;
  case "vocab":
    printVocab();
    break;
  case "type":
    printType();
    break;
  case "members":
    printMembers();
    break;
  case "who-refs":
    printWhoRefs();
    break;
  case "refs-of":
    printRefsOf();
    break;
  case "cone":
    printCone();
    break;
  case "path":
    printPath();
    break;
  case "roots":
    printRoots();
    break;
  case "leaves":
    printLeaves();
    break;
  case "hubs":
    printHubs();
    break;
  case "cluster":
    printCluster();
    break;
  case "file":
    printFileTypes();
    break;
  case "cross-subsystem":
    printCrossSubsystem();
    break;
  case "bridging":
    printBridging();
    break;
  default:
    console.log(USAGE);
    break;
}
