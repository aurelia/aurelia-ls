import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/evaluation-tooling-script-source-role');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'evaluation-tooling-script-source-role-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const scriptDiagnostics = app.ask({
  kind: SemanticAppQueryKind.TypeScriptDiagnostics,
  sourceFile: { filePath: 'scripts/build.ts' },
  page: { size: 20 },
}).value;
const diagnosticSummary = app.ask({
  kind: SemanticAppQueryKind.TypeScriptDiagnosticSummary,
  page: { size: 20 },
}).value;
const scriptSeamSites = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  sourceFile: { filePath: 'scripts/build.ts' },
  page: { size: 20 },
}).value;
const mjsScriptSeamSites = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  sourceFile: { filePath: 'scripts/generate-map.mjs' },
  page: { size: 20 },
}).value;
const allSeamSites = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  page: { size: 20 },
}).value;

const failures = [];
const ts2322 = scriptDiagnostics.rows.find((row) => row.diagnosticKind === 'TS2322');
const ts2304 = scriptDiagnostics.rows.find((row) => row.diagnosticKind === 'TS2304');
const toolingScriptSummaryRole = diagnosticSummary.rows.some((row) =>
  row.sourceRoles.some((sourceRole) => sourceRole.role === 'tooling-script' && sourceRole.count >= 1)
);

if (scriptDiagnostics.rows.length < 2) {
  failures.push(`Expected tooling script TypeScript diagnostics to remain visible, observed ${scriptDiagnostics.rows.length}.`);
}
if (ts2322 == null) {
  failures.push('Expected tooling script diagnostics to include TS2322.');
}
if (ts2304 == null) {
  failures.push('Expected tooling script diagnostics to include TS2304.');
}
for (const row of scriptDiagnostics.rows) {
  if (row.source?.path.endsWith('scripts/build.ts') !== true) {
    failures.push(`Expected tooling script diagnostics to stay source-filtered, observed ${row.source?.path ?? 'missing'}.`);
  }
  if (row.sourceRole !== 'tooling-script') {
    failures.push(`Expected tooling script diagnostics to carry tooling-script role, observed ${row.sourceRole ?? 'missing'} for ${row.diagnosticKind}.`);
  }
}
if (!toolingScriptSummaryRole) {
  failures.push('Expected TypeScript diagnostic summary to retain tooling-script source role counts.');
}
if (scriptSeamSites.totalOpenSeamRows !== 0 || scriptSeamSites.totalOpenSeamSites !== 0 || scriptSeamSites.rows.length !== 0) {
  failures.push(`Expected tooling script source to be excluded from app-world open seams, observed ${scriptSeamSites.totalOpenSeamRows} raw rows and ${scriptSeamSites.totalOpenSeamSites} sites.`);
}
if (mjsScriptSeamSites.totalOpenSeamRows !== 0 || mjsScriptSeamSites.totalOpenSeamSites !== 0 || mjsScriptSeamSites.rows.length !== 0) {
  failures.push(`Expected .mjs tooling script source to be excluded from app-world open seams, observed ${mjsScriptSeamSites.totalOpenSeamRows} raw rows and ${mjsScriptSeamSites.totalOpenSeamSites} sites.`);
}
if (allSeamSites.rows.some((row) => row.source?.path.endsWith('scripts/build.ts') === true)) {
  failures.push('Expected global open-seam site overview to omit tooling script source rows.');
}
if (allSeamSites.rows.some((row) => row.source?.path.endsWith('scripts/generate-map.mjs') === true)) {
  failures.push('Expected global open-seam site overview to omit .mjs tooling script source rows.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    scriptDiagnostics,
    diagnosticSummary,
    scriptSeamSites,
    allSeamSites,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    scriptDiagnostics: scriptDiagnostics.rows.map((row) => ({
      diagnosticKind: row.diagnosticKind,
      sourceRole: row.sourceRole,
      source: row.source?.label,
    })),
    seamSitesForScript: scriptSeamSites.totalOpenSeamSites,
    seamSitesForMjsScript: mjsScriptSeamSites.totalOpenSeamSites,
    allSeamSites: allSeamSites.totalOpenSeamSites,
  }, null, 2));
}
