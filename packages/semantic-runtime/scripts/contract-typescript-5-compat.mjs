import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repoRoot = path.resolve(packageRoot, '../..');
const tempRoot = path.join(tmpdir(), 'aurelia-ls2-semantic-runtime-typescript-compat', 'typescript-5.9.3');
const tempPackageRoot = path.join(tempRoot, 'semantic-runtime');
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/typescript-program-fidelity-node-types');
const relatedMemberFixtureRoot = path.join(packageRoot, 'fixtures/pressure/typescript-related-member-closure');
const pnpmCliPath = path.join(path.dirname(process.execPath), 'node_modules/corepack/dist/pnpm.js');
const packageManifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

rmSync(tempRoot, { recursive: true, force: true });
mkdirSync(tempPackageRoot, { recursive: true });
writeFileSync(
  path.join(tempRoot, 'package.json'),
  JSON.stringify({
    private: true,
    type: 'module',
    dependencies: {
      ...packageManifest.dependencies,
      typescript: '5.9.3',
    },
  }, null, 2),
);

runPnpm(['install', '--dir', tempRoot, '--ignore-scripts', '--silent']);
cpSync(path.join(packageRoot, 'out'), path.join(tempPackageRoot, 'out'), { recursive: true });

const runnerPath = path.join(tempRoot, 'runner.mjs');
writeFileSync(runnerPath, `
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from './semantic-runtime/out/index.js';

const fixtureRoot = ${JSON.stringify(fixtureRoot)};
const relatedMemberFixtureRoot = ${JSON.stringify(relatedMemberFixtureRoot)};
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
const relatedTemplatePath = path.join(relatedMemberFixtureRoot, 'src/app.html');
const relatedTemplateText = readFileSync(relatedTemplatePath, 'utf8');
const relatedRuntime = await createSemanticRuntime({
  workspaceRoot: relatedMemberFixtureRoot,
  storeKey: 'typescript-5-related-member-contract',
});
const valueReferences = await relatedRuntime.answerAppQuery({
  ...relatedMemberQuery('value'),
  kind: SemanticAppQueryKind.TemplateReferences,
  includeDeclaration: true,
  page: { size: 100 },
});
const valueRename = await relatedRuntime.answerAppQuery({
  ...relatedMemberQuery('value'),
  kind: SemanticAppQueryKind.TemplateRename,
  newName: 'valueNext',
});
const lengthPrepare = await relatedRuntime.answerAppQuery({
  ...relatedMemberQuery('length'),
  kind: SemanticAppQueryKind.TemplateRename,
});
if (valueReferences.coverage !== 'complete' || valueReferences.value?.rows?.length !== 11) {
  failures.push(\`Expected TypeScript 5.9 to preserve the 11-site value related-symbol family, observed \${valueReferences.value?.rows?.length ?? 0} row(s) with \${valueReferences.coverage} coverage.\`);
}
if (valueRename.value?.status !== 'available' || valueRename.value?.edits?.length !== 11) {
  failures.push(\`Expected TypeScript 5.9 to preserve all 11 value rename sites, observed \${valueRename.value?.edits?.length ?? 0} edit(s) with status \${valueRename.value?.status ?? 'missing'}.\`);
}
if (lengthPrepare.value?.status !== 'not-available' || lengthPrepare.value?.reason !== 'typescript-rename-not-allowed') {
  failures.push(\`Expected TypeScript 5.9 to refuse template-origin Array.length rename, observed \${lengthPrepare.value?.status ?? 'missing'} / \${lengthPrepare.value?.reason ?? 'missing'}.\`);
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
      relatedMemberReferences: valueReferences.value.rows.length,
      relatedMemberRenameEdits: valueRename.value.edits.length,
      nativeMemberRenameReason: lengthPrepare.value.reason,
    },
  }, null, 2));
}

function relatedMemberQuery(name) {
  const offset = relatedTemplateText.indexOf(name);
  return {
    sourceFilePath: relatedTemplatePath,
    cursor: { filePath: relatedTemplatePath, offset: offset + 1 },
    detail: 'handles',
    analysisDepth: 'binding-observation',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  };
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
