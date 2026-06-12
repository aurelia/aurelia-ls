import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repoRoot = path.resolve(packageRoot, '../..');
const tempRoot = path.join(tmpdir(), 'aurelia-ls2-semantic-runtime-typescript-compat', 'typescript-5.9.3');
const tempPackageRoot = path.join(tempRoot, 'semantic-runtime');
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/typescript-program-fidelity-node-types');
const pnpmCliPath = path.join(path.dirname(process.execPath), 'node_modules/corepack/dist/pnpm.js');

rmSync(tempRoot, { recursive: true, force: true });
mkdirSync(tempPackageRoot, { recursive: true });
writeFileSync(
  path.join(tempRoot, 'package.json'),
  JSON.stringify({
    private: true,
    type: 'module',
    dependencies: {
      typescript: '5.9.3',
    },
  }, null, 2),
);

runPnpm(['install', '--dir', tempRoot, '--ignore-scripts', '--silent']);
cpSync(path.join(packageRoot, 'out'), path.join(tempPackageRoot, 'out'), { recursive: true });

const runnerPath = path.join(tempRoot, 'runner.mjs');
writeFileSync(runnerPath, `
import ts from 'typescript';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from './semantic-runtime/out/index.js';

const fixtureRoot = ${JSON.stringify(fixtureRoot)};
const failures = [];
if (ts.version !== '5.9.3') {
  failures.push(\`Expected runner TypeScript 5.9.3, observed \${ts.version}.\`);
}
const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'typescript-5-compat-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});
const diagnostics = app.ask({
  kind: SemanticAppQueryKind.TypeScriptDiagnostics,
  page: { size: 20 },
}).value;
const summary = app.ask({
  kind: SemanticAppQueryKind.TypeScriptDiagnosticSummary,
  page: { size: 20 },
}).value;
if (diagnostics.typeScript.analyzer.version !== '5.9.3') {
  failures.push(\`Expected semantic-runtime analyzer TypeScript 5.9.3, observed \${diagnostics.typeScript.analyzer.version}.\`);
}
if (diagnostics.rows.length !== 0) {
  failures.push(\`Expected node-types fixture to remain TypeScript-clean under 5.9.3, observed \${diagnostics.rows.length} diagnostics.\`);
}
if (summary.totalDiagnosticRows !== 0) {
  failures.push(\`Expected node-types summary to remain TypeScript-clean under 5.9.3, observed \${summary.totalDiagnosticRows} diagnostics.\`);
}
if (!diagnostics.displayText.includes('TypeScript: analyzer=5.9.3')) {
  failures.push('Expected diagnostics display text to expose analyzer TypeScript 5.9.3.');
}
if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    diagnostics,
    summary,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      analyzerVersion: diagnostics.typeScript.analyzer.version,
      workspaceVersion: diagnostics.typeScript.workspace?.version ?? null,
      versionRelation: diagnostics.typeScript.versionRelation,
      diagnosticRows: diagnostics.rows.length,
    },
  }, null, 2));
}
`);

run(process.execPath, [runnerPath]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: options.shell ?? false,
    stdio: 'pipe',
  });
  if ((result.stdout ?? '').length > 0) {
    process.stdout.write(result.stdout);
  }
  if ((result.stderr ?? '').length > 0) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    if (result.error != null) {
      console.error(result.error);
    }
    console.error(`Command failed: ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

function runPnpm(args) {
  if (existsSync(pnpmCliPath)) {
    run(process.execPath, [pnpmCliPath, ...args]);
    return;
  }
  run('pnpm', args, { shell: process.platform === 'win32' });
}
