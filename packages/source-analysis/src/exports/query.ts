
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

import { createRefreshCommand, createSourceAnalysisPaths, resolveSourceAnalysisTarget } from '../config.js';
import { loadJsonSnapshot, resolveCurrentSnapshotPath } from '../snapshots.js';
import { formatInspectionMembers, inspectExportRecord } from './inspect.js';
import type { ExportsOutput, PackageExportRecord, PackageExportsSummary } from './schema.js';

const args = process.argv.slice(2);
let jsonPath: string | undefined;
let targetArg: string | undefined;
let repoArg: string | undefined;

const fileIdx = args.indexOf('--file');
if (fileIdx !== -1) {
  jsonPath = args[fileIdx + 1];
  args.splice(fileIdx, 2);
}

const targetIdx = args.indexOf('--target');
if (targetIdx !== -1) {
  targetArg = args[targetIdx + 1];
  args.splice(targetIdx, 2);
}

const repoIdx = args.indexOf('--repo');
if (repoIdx !== -1) {
  repoArg = args[repoIdx + 1];
  args.splice(repoIdx, 2);
}

const command = args[0];
const commandArgs = args.slice(1);
const lockWaitMsRaw = process.env.ANALYZER_LOCK_WAIT_MS;
const lockWaitMs = lockWaitMsRaw ? Number(lockWaitMsRaw) : 5000;
const PATHS = createSourceAnalysisPaths(import.meta.url);
const selection = resolveSourceAnalysisTarget({ target: targetArg, repoPath: repoArg });
const target = selection.target;
const refreshCommand = createRefreshCommand('exports', selection);

if (!Number.isFinite(lockWaitMs) || lockWaitMs < 0) {
  process.stderr.write(
    `Error: ANALYZER_LOCK_WAIT_MS must be a non-negative number (got "${lockWaitMsRaw}").\n`,
  );
  process.exit(1);
}

function resolveDefaultExportsJsonPath(): string {
  return resolveCurrentSnapshotPath(PATHS, {
    target,
    kind: 'exports',
    waitMs: lockWaitMs,
    refreshCommand,
  });
}

function loadExportsJson(path: string): ExportsOutput {
  return loadJsonSnapshot<ExportsOutput>(path, lockWaitMs);
}

let data: ExportsOutput;
if (jsonPath) {
  try {
    data = loadExportsJson(jsonPath);
  } catch (err) {
    process.stderr.write(`Error reading ${jsonPath}: ${(err as Error).message}\n`);
    process.exit(1);
  }
} else {
  try {
    jsonPath = resolveDefaultExportsJsonPath();
    data = loadExportsJson(jsonPath);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith('LOCK_TIMEOUT:') || msg.startsWith('CURRENT_SNAPSHOT_UNAVAILABLE:')) {
      process.stderr.write(`${msg}\n`);
    } else {
      process.stderr.write(
        `Error reading ${jsonPath ?? '<unset>'}: ${msg}\n` +
          'Stop and escalate to user; do not fallback to stale dated snapshots.\n',
      );
    }
    process.exit(1);
  }
}

const recordsByPackageDir = new Map<string, PackageExportRecord[]>();
for (const record of data.exports) {
  const current = recordsByPackageDir.get(record.package_dir) ?? [];
  current.push(record);
  recordsByPackageDir.set(record.package_dir, current);
}

const recordsByName = new Map<string, PackageExportRecord[]>();
for (const record of data.exports) {
  const current = recordsByName.get(record.exported_name) ?? [];
  current.push(record);
  recordsByName.set(record.exported_name, current);
}

function gitHead(cwd: string): string {
  try {
    return execSync('git rev-parse HEAD', { cwd, encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function gitBlobHash(filePath: string): string {
  try {
    return execSync(`git hash-object "${filePath}"`, { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function classifyCapability(record: PackageExportRecord): string {
  if (record.type_only) return 'type-only';
  if (record.type_exported && record.value_exported) return 'type+value';
  if (record.value_exported) return 'value';
  if (record.type_exported) return 'type';
  return 'unknown';
}

function formatFace(record: PackageExportRecord): string {
  if (record.face_kind !== 'merged') return record.face_kind;
  return `merged(${record.face_kinds.join(',')})`;
}

function formatDeclaration(record: PackageExportRecord): string {
  if (!record.declaration_file) return '(unresolved declaration)';
  return `${record.declaration_file}:${record.declaration_line ?? '?'}`;
}

function resolvePackages(query: string): PackageExportsSummary[] {
  const normalized = query.toLowerCase();
  const exact = data.packages.filter((pkg) =>
    pkg.package_name.toLowerCase() === normalized ||
    pkg.package_dir.toLowerCase() === normalized,
  );
  if (exact.length > 0) return exact;

  const shortMatches = data.packages.filter((pkg) =>
    pkg.package_name.split('/').at(-1)?.toLowerCase() === normalized ||
    pkg.package_dir.split('/').at(-1)?.toLowerCase() === normalized,
  );
  if (shortMatches.length > 0) return shortMatches;

  return data.packages.filter((pkg) =>
    pkg.package_name.toLowerCase().includes(normalized) ||
    pkg.package_dir.toLowerCase().includes(normalized),
  );
}

function resolveSinglePackage(query: string): PackageExportsSummary | null {
  const matches = resolvePackages(query);
  if (matches.length === 0) {
    console.log(`No package matching "${query}".`);
    return null;
  }
  if (matches.length > 1) {
    console.log(`Ambiguous package query "${query}" (${matches.length} matches):`);
    for (const match of matches.slice(0, 10)) {
      console.log(`  ${match.package_name}  (${match.package_dir})`);
    }
    if (matches.length > 10) console.log(`  ... and ${matches.length - 10} more`);
    return null;
  }
  return matches[0]!;
}

function sortRecords(records: PackageExportRecord[]): PackageExportRecord[] {
  return [...records].sort((left, right) =>
    left.package_name.localeCompare(right.package_name) ||
    left.exported_name.localeCompare(right.exported_name)
  );
}

function printSummary(): void {
  const summary = data.summary;
  console.log(`Source:            ${jsonPath}`);
  console.log(`Generated:         ${data.generated_at}`);
  console.log(`Source commit:     ${data.source_commit ?? 'unknown'}`);
  console.log(`Analyzer commit:   ${data.analyzer_commit ?? 'unknown'}`);
  console.log(`Packages analyzed: ${summary.packages_analyzed}`);
  console.log(`Exports:           ${summary.exports}`);
  console.log(`Type-only exports: ${summary.type_only_exports}`);
  console.log(`Value exports:     ${summary.value_exports}`);
  console.log(`Merged exports:    ${summary.merged_exports}`);
  console.log('');
  console.log('Per package:');
  for (const pkg of data.packages) {
    console.log(
      `  ${pkg.package_name}  exports=${pkg.export_count}  type-only=${pkg.type_only_export_count}  value=${pkg.value_export_count}  merged=${pkg.merged_export_count}`,
    );
  }
}

function printPackages(): void {
  for (const pkg of data.packages) {
    console.log(`${pkg.package_name}`);
    console.log(`  dir:         ${pkg.package_dir}`);
    console.log(`  revision:    ${pkg.package_revision.slice(0, 12)}`);
    console.log(`  basis:       ${pkg.analysis_basis}`);
    console.log(`  entrypoint:  ${pkg.analysis_entrypoint}`);
    if (pkg.public_types_entrypoint) console.log(`  types:       ${pkg.public_types_entrypoint}`);
    console.log(`  exports:     ${pkg.export_count}`);
    console.log(`  type-only:   ${pkg.type_only_export_count}`);
    console.log(`  value:       ${pkg.value_export_count}`);
    console.log(`  merged:      ${pkg.merged_export_count}`);
    console.log('');
  }
}

function printPackage(): void {
  const query = commandArgs[0];
  if (!query) {
    process.stderr.write('Usage: source-analysis exports package <name>\n');
    process.exit(1);
  }

  const pkg = resolveSinglePackage(query);
  if (!pkg) return;

  console.log(`Package:             ${pkg.package_name}`);
  console.log(`Directory:           ${pkg.package_dir}`);
  console.log(`Package revision:    ${pkg.package_revision}`);
  console.log(`Analysis basis:      ${pkg.analysis_basis}`);
  console.log(`Analysis entrypoint: ${pkg.analysis_entrypoint}`);
  if (pkg.source_entrypoint) console.log(`Source entrypoint:   ${pkg.source_entrypoint}`);
  if (pkg.public_types_entrypoint) console.log(`Types entrypoint:    ${pkg.public_types_entrypoint}`);
  console.log(`Exports:             ${pkg.export_count}`);
  console.log(`Type-only exports:   ${pkg.type_only_export_count}`);
  console.log(`Value exports:       ${pkg.value_export_count}`);
  console.log(`Merged exports:      ${pkg.merged_export_count}`);
  console.log('');

  for (const record of sortRecords(recordsByPackageDir.get(pkg.package_dir) ?? [])) {
    const alias = record.exported_name === record.original_name ? '' : ` <= ${record.original_name}`;
    console.log(
      `  ${record.exported_name}${alias}  ${classifyCapability(record)}  ${formatFace(record)}  ${formatDeclaration(record)}`,
    );
  }
}

function printSymbol(): void {
  const query = commandArgs[0];
  if (!query) {
    process.stderr.write('Usage: source-analysis exports symbol <name>\n');
    process.exit(1);
  }

  const exactMatches = recordsByName.get(query) ?? [];
  const matches = exactMatches.length > 0
    ? exactMatches
    : data.exports.filter((record) => record.exported_name.toLowerCase() === query.toLowerCase());

  if (matches.length === 0) {
    console.log(`No exported symbol named "${query}".`);
    return;
  }

  for (const record of sortRecords(matches)) {
    console.log(`${record.package_name} :: ${record.exported_name}`);
    console.log(`  original:     ${record.original_name}`);
    console.log(`  capability:   ${classifyCapability(record)}`);
    console.log(`  face:         ${formatFace(record)}`);
    console.log(`  declaration:  ${formatDeclaration(record)}`);
    console.log(`  basis:        ${record.analysis_basis}`);
    console.log(`  entrypoint:   ${record.analysis_entrypoint}`);
    console.log('  chain:');
    for (const step of record.chain) {
      const details = [
        `${step.file}:${step.line}`,
        step.kind,
        step.exported_name === (step.original_name ?? step.exported_name)
          ? step.exported_name
          : `${step.exported_name} <= ${step.original_name}`,
        step.specifier ? `from ${step.specifier}` : null,
      ].filter(Boolean);
      console.log(`    ${details.join('  ')}`);
    }
    console.log('');
  }
}

function printMembers(): void {
  const query = commandArgs[0];
  if (!query) {
    process.stderr.write('Usage: source-analysis exports members <name>\n');
    process.exit(1);
  }

  const exactMatches = recordsByName.get(query) ?? [];
  const matches = exactMatches.length > 0
    ? exactMatches
    : data.exports.filter((record) => record.exported_name.toLowerCase() === query.toLowerCase());

  if (matches.length === 0) {
    console.log(`No exported symbol named "${query}".`);
    return;
  }

  const repoRoot = data.root || selection.repoPath || process.cwd();

  for (const record of sortRecords(matches)) {
    const inspection = inspectExportRecord(record, repoRoot);
    for (const line of formatInspectionMembers(record, inspection)) {
      console.log(line);
    }
    console.log('');
  }
}

function printSearch(): void {
  const query = commandArgs[0];
  if (!query) {
    process.stderr.write('Usage: source-analysis exports search <pattern>\n');
    process.exit(1);
  }

  let matcher: RegExp;
  try {
    matcher = new RegExp(query, 'i');
  } catch {
    matcher = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  const matches = sortRecords(
    data.exports.filter((record) =>
      matcher.test(record.exported_name) || matcher.test(record.original_name),
    ),
  );

  if (matches.length === 0) {
    console.log(`No exported symbols matched "${query}".`);
    return;
  }

  console.log(`${matches.length} matching exports:\n`);
  for (const record of matches) {
    const alias = record.exported_name === record.original_name ? '' : ` <= ${record.original_name}`;
    console.log(
      `${record.package_name}  ${record.exported_name}${alias}  ${classifyCapability(record)}  ${formatFace(record)}  ${formatDeclaration(record)}`,
    );
  }
}

function printStale(): void {
  const sourceRepo = data.root || process.cwd();
  const analyzerPath = resolve(import.meta.dirname!, 'generate.js');
  const currentSourceCommit = gitHead(sourceRepo);
  const currentAnalyzerCommit = gitBlobHash(analyzerPath);
  const sourceMatch = data.source_commit === currentSourceCommit;
  const analyzerMatch = data.analyzer_commit === currentAnalyzerCommit;

  if (sourceMatch && analyzerMatch) {
    console.log('FRESH');
    console.log(`  source:   ${data.source_commit?.slice(0, 10)} (match)`);
    console.log(`  analyzer: ${data.analyzer_commit?.slice(0, 10)} (match)`);
    return;
  }

  console.log('STALE');
  console.log(
    sourceMatch
      ? `  source:   ${data.source_commit?.slice(0, 10)} (match)`
      : `  source:   ${data.source_commit?.slice(0, 10)} -> ${currentSourceCommit.slice(0, 10)}`,
  );
  console.log(
    analyzerMatch
      ? `  analyzer: ${data.analyzer_commit?.slice(0, 10)} (match)`
      : `  analyzer: ${data.analyzer_commit?.slice(0, 10)} -> ${currentAnalyzerCommit.slice(0, 10)}`,
  );
  console.log(`\nRegenerate: ${refreshCommand}`);
}

const USAGE = `Usage: pnpm source-analysis exports <command> [args] [--target <name>] [--repo <path>] [--file path.json]

Overview:
  stale                         Check if exports JSON needs regeneration
  summary                       High-level package/export counts
  packages                      List packages, entrypoints, and counts

Export queries:
  package <name>                Full export inventory for one package
  symbol <name>                 Resolve one exported symbol across packages
  members <name>                Resolve members for one exported value or merged surface
  search <pattern>              Reverse lookup by exported/original name regex

Use --target <name> to select a named repo target (default: aurelia-ls2).
Use --repo <path> to derive or override the current snapshot target from a repo path.
Defaults to data/generated/source-analysis/current/<target>-exports.json.
If current is locked/missing/unreadable, query stops and must be escalated.`;

switch (command) {
  case 'stale':
    printStale();
    break;
  case 'summary':
    printSummary();
    break;
  case 'packages':
    printPackages();
    break;
  case 'package':
    printPackage();
    break;
  case 'symbol':
    printSymbol();
    break;
  case 'members':
    printMembers();
    break;
  case 'search':
    printSearch();
    break;
  default:
    console.log(USAGE);
    process.exitCode = command ? 1 : 0;
    break;
}
