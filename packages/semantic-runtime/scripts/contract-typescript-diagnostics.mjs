import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/typescript-project-diagnostics');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'typescript-project-diagnostics-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});
const profile = app.cacheSummary(8, false).profile;

const summary = app.ask({
  kind: SemanticAppQueryKind.TypeScriptDiagnosticSummary,
  page: { size: 20 },
}).value;
const diagnostics = app.ask({
  kind: SemanticAppQueryKind.TypeScriptDiagnostics,
  page: { size: 20 },
}).value;
const sourceFileDiagnostics = app.ask({
  kind: SemanticAppQueryKind.TypeScriptDiagnostics,
  sourceFile: { filePath: 'src/typescript-project-diagnostics-state.ts' },
  page: { size: 20 },
}).value;
const configFileDiagnostics = app.ask({
  kind: SemanticAppQueryKind.TypeScriptDiagnostics,
  sourceFile: { filePath: 'tsconfig.json' },
  page: { size: 20 },
}).value;
const appDiagnosticSummary = app.ask({
  kind: SemanticAppQueryKind.AppDiagnosticSummary,
  page: { size: 20 },
}).value;
const availableProductsSummary = app.ask({
  kind: SemanticAppQueryKind.AppDiagnosticSummary,
  diagnosticProjection: 'available-products',
  page: { size: 20 },
}).value;

const failures = [];
const ts2322Diagnostic = diagnostics.rows.find((row) =>
  row.diagnosticKind === 'TS2322'
  && row.source?.path.endsWith('typescript-project-diagnostics-state.ts') === true
);
const ts2769Diagnostic = diagnostics.rows.find((row) =>
  row.diagnosticKind === 'TS2769'
  && row.source?.path.endsWith('typescript-project-diagnostics-state.ts') === true
);
const ts2322Cluster = summary.rows.find((row) => row.diagnosticKind === 'TS2322');
const ts2769Cluster = summary.rows.find((row) => row.diagnosticKind === 'TS2769');
const configDiagnostic = diagnostics.rows.find((row) =>
  row.phase === 'config'
  && row.message.includes('definitelyNotACompilerOption')
);
const configCluster = summary.rows.find((row) =>
  row.phase === 'config'
  && row.sampleMessage.includes('definitelyNotACompilerOption')
);
const unifiedTypeScriptCluster = appDiagnosticSummary.rows.find((row) =>
  row.diagnosticDomain === 'typescript'
  && row.diagnosticAuthority === 'typescript'
  && row.diagnosticKind === 'TS2322'
);
const availableProductsTypeScriptCluster = availableProductsSummary.rows.find((row) =>
  row.diagnosticDomain === 'typescript'
);
const excludedFileDiagnostic = diagnostics.rows.find((row) =>
  row.source?.path.endsWith('excluded-diagnostics.ts') === true
);
const overlayGroup = profile.programRootFileGroups.find((row) => row.groupKind === 'overlay-source');
const overlayDiagnostic = diagnostics.rows.find((row) =>
  row.source?.path.includes('/.semantic-runtime/overlays/') === true
  || row.source?.path.includes('\\.semantic-runtime\\overlays\\') === true
);

if (ts2322Diagnostic == null) {
  failures.push('Expected TypeScript diagnostics to include TS2322 in the project-local state source file.');
}
if (ts2322Diagnostic?.sourceRole !== 'app-source') {
  failures.push(`Expected project-local TS2322 diagnostics to carry app-source role, observed ${ts2322Diagnostic?.sourceRole ?? 'missing'}.`);
}
if (ts2322Cluster == null || ts2322Cluster.count < 1) {
  failures.push('Expected TypeScript diagnostic summary to cluster TS2322.');
}
if (ts2322Cluster?.sourceRoles.some((row) => row.role === 'app-source' && row.count >= 1) !== true) {
  failures.push('Expected TS2322 summary to retain app-source role counts.');
}
if (ts2769Diagnostic == null) {
  failures.push('Expected TypeScript diagnostics to include TS2769 overload pressure in the project-local state source file.');
}
if (ts2769Diagnostic?.sourceRole !== 'app-source') {
  failures.push(`Expected project-local TS2769 diagnostics to carry app-source role, observed ${ts2769Diagnostic?.sourceRole ?? 'missing'}.`);
}
if (ts2769Cluster == null || ts2769Cluster.count < 1) {
  failures.push('Expected TypeScript diagnostic summary to cluster TS2769.');
}
if (ts2769Cluster?.sourceRoles.some((row) => row.role === 'app-source' && row.count >= 1) !== true) {
  failures.push('Expected TS2769 summary to retain app-source role counts.');
}
if (configDiagnostic == null) {
  failures.push('Expected TypeScript diagnostics to include tsconfig option diagnostics.');
}
if (configDiagnostic?.source?.path.endsWith('tsconfig.json') !== true) {
  failures.push('Expected tsconfig option diagnostics to carry the config file source path.');
}
if (configDiagnostic?.sourceRole !== 'tooling-config') {
  failures.push(`Expected tsconfig option diagnostics to carry tooling-config role, observed ${configDiagnostic?.sourceRole ?? 'missing'}.`);
}
if (configCluster == null || configCluster.count < 1) {
  failures.push('Expected TypeScript diagnostic summary to cluster tsconfig option diagnostics.');
}
if (configCluster?.sourceRoles.some((row) => row.role === 'tooling-config' && row.count >= 1) !== true) {
  failures.push('Expected tsconfig diagnostic summary to retain tooling-config role counts.');
}
if (unifiedTypeScriptCluster == null || unifiedTypeScriptCluster.count < 1) {
  failures.push('Expected app diagnostic summary to include the TypeScript TS2322 cluster.');
}
if (unifiedTypeScriptCluster?.sourceRoles.some((row) => row.role === 'app-source' && row.count >= 1) !== true) {
  failures.push('Expected unified app diagnostic summary to retain TypeScript source roles.');
}
if (availableProductsTypeScriptCluster != null) {
  failures.push('Expected available-products diagnostic projection to omit ordinary TypeScript diagnostics.');
}
if (excludedFileDiagnostic != null) {
  failures.push('Expected TypeScript diagnostics to respect tsconfig root-file selection and omit excluded source files.');
}
if (profile.programRootFiles.overlaySources < 1 || overlayGroup == null) {
  failures.push('Expected TypeSystemProject roots to include a Program-owned semantic-runtime overlay source.');
}
if (overlayDiagnostic != null) {
  failures.push('Expected semantic-runtime overlay sources to stay hidden from ordinary TypeScript diagnostics.');
}
if (ts2322Diagnostic?.severity !== 'error') {
  failures.push(`Expected TS2322 severity to be error, observed ${ts2322Diagnostic?.severity ?? 'missing'}.`);
}
if (ts2322Diagnostic?.phase !== 'semantic') {
  failures.push(`Expected TS2322 phase to be semantic, observed ${ts2322Diagnostic?.phase ?? 'missing'}.`);
}
if (
  sourceFileDiagnostics.rows.length !== 2
  || sourceFileDiagnostics.rows.some((row) => row.source?.path.endsWith('typescript-project-diagnostics-state.ts') !== true)
  || !sourceFileDiagnostics.rows.some((row) => row.diagnosticKind === 'TS2322')
  || !sourceFileDiagnostics.rows.some((row) => row.diagnosticKind === 'TS2769')
) {
  failures.push('Expected source-file TypeScript diagnostics filtering to return only the state-file TS2322 and TS2769 rows.');
}
if (configFileDiagnostics.rows.length !== 1 || configFileDiagnostics.rows[0].diagnosticKind !== 'TS5023') {
  failures.push('Expected tsconfig source-file TypeScript diagnostics filtering to return only the TS5023 row.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    summary,
    diagnostics,
    appDiagnosticSummary,
    availableProductsSummary,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      diagnosticRows: diagnostics.rows.length,
      typeScriptClusters: summary.rows.map((row) => ({
        diagnosticKind: row.diagnosticKind,
        count: row.count,
        severity: row.severity,
        phase: row.phase,
      })),
      unifiedTypeScriptCount: appDiagnosticSummary.rows
        .filter((row) => row.diagnosticDomain === 'typescript')
        .reduce((total, row) => total + row.count, 0),
      availableProductsTypeScriptCount: availableProductsSummary.rows
        .filter((row) => row.diagnosticDomain === 'typescript')
        .reduce((total, row) => total + row.count, 0),
      overlayRootSources: profile.programRootFiles.overlaySources,
    },
  }, null, 2));
}
