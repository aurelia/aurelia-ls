#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { isHostedCliMode, runHostedCli } from './cli-hosted.js';
import { createSnapshotPaths } from './snapshot-config.js';

const PATHS = createSnapshotPaths(import.meta.url);

type EntryPoint = 'deps' | 'typerefs' | 'exports' | 'refresh';

const ENTRYPOINTS: Record<EntryPoint, string> = {
  deps: resolve(PATHS.toolRootPath, 'out/deps/query.js'),
  typerefs: resolve(PATHS.toolRootPath, 'out/typerefs/query.js'),
  exports: resolve(PATHS.toolRootPath, 'out/exports/query.js'),
  refresh: resolve(PATHS.toolRootPath, 'out/refresh.js'),
};

const args = process.argv.slice(2);
if (args[0] === '--') args.shift();
const entrypoint = args[0] as EntryPoint | undefined;
const forwardedArgs = args.slice(1);

function printHelp(): void {
  process.stdout.write(
    [
      'Usage: pnpm source-analysis <mode> [args]',
      '',
      'Modes:',
      '  host <start|status|stop> [--json]',
      '  describe profile [--repo <path>] [--target <name>] [--profile-path <path>] [--json]',
      '  session <open|status|close|refresh|invalidate|materialize> [--session-id <id>] [--repo <path>] [--json]',
      '  query <audit-package|route-witness|navigate> ... [--session-id <id>] [--json]',
      '  resolve <package|type|export> <locator> --session-id <id> [--json]',
      '  lookup symbol <locator> --session-id <id> [--json]',
      '  inspect <file|package-context|package-surface|package-reachability|package-audit-signals|export-trace|file-route|file-context|type-route|type-context> ... --session-id <id> [--json]',
      '  refresh [deps|typerefs|exports|all] [--target <name>] [--repo <path>] [--profile-path <path>] [--out-dir <dir>] [--wait-ms <ms>]',
      '  deps <command> [args] [--target <name>] [--repo <path>] [--profile-path <path>] [--file path.json]',
      '  typerefs <command> [args] [--target <name>] [--repo <path>] [--profile-path <path>] [--file path.json]',
      '  exports <command> [args] [--target <name>] [--repo <path>] [--profile-path <path>] [--file path.json]',
      '',
      'If --repo is omitted, the current working directory is analyzed.',
      'If --target is omitted, a target label is derived from the repo path.',
      '',
      'Examples:',
      '  pnpm source-analysis host start',
      '  pnpm source-analysis describe profile',
      '  pnpm source-analysis session open --repo /path/to/repo',
      '  pnpm source-analysis resolve package @aurelia-ls/source-analysis --session-id <id>',
      '  pnpm source-analysis lookup symbol createAnalysisViews --session-id <id>',
      '  pnpm source-analysis inspect file packages/source-analysis/src/host/runtime.ts --session-id <id>',
      '  pnpm source-analysis inspect package-context @aurelia-ls/source-analysis --session-id <id>',
      '  pnpm source-analysis inspect package-surface @aurelia-ls/source-analysis --session-id <id>',
      '  pnpm source-analysis inspect package-audit-signals @aurelia-ls/source-analysis --session-id <id>',
      '  pnpm source-analysis inspect export-trace @aurelia-ls/source-analysis createSnapshotHostRuntime --session-id <id>',
      '  pnpm source-analysis inspect file-route packages/source-analysis/src/host/runtime.ts --session-id <id>',
      '  pnpm source-analysis inspect file-context packages/source-analysis/src/host/runtime.ts --session-id <id>',
      '  pnpm source-analysis inspect type-route SnapshotHostRuntime --session-id <id>',
      '  pnpm source-analysis inspect type-context SnapshotHostRuntime --session-id <id>',
      '  pnpm source-analysis refresh all',
      '  pnpm source-analysis deps summary',
      '  pnpm source-analysis deps packages',
      '  pnpm source-analysis deps summary --repo /path/to/other-repo',
      '  pnpm source-analysis typerefs hubs',
      '  pnpm source-analysis exports package @scope/name',
    ].join('\n'),
  );
}

if (!entrypoint || !(entrypoint in ENTRYPOINTS)) {
  if (isHostedCliMode(entrypoint)) {
    process.exitCode = await runHostedCli(args);
  } else {
    printHelp();
    process.exitCode = entrypoint ? 1 : 0;
  }
} else {
  const result = spawnSync(
    process.execPath,
    [ENTRYPOINTS[entrypoint], ...forwardedArgs],
    {
      env: process.env,
      encoding: 'utf-8',
    },
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;

  process.exitCode = typeof result.status === 'number' ? result.status : 1;
}
