import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/typescript-program-fidelity-node-types');
const tsconfigPath = path.join(fixtureRoot, 'tsconfig.json');

const directDiagnostics = readDirectTypeScriptDiagnostics(tsconfigPath);
const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'typescript-program-fidelity-contract',
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

const failures = [];
if (directDiagnostics.length !== 0) {
  failures.push(`Expected direct TypeScript API compile to report zero diagnostics, observed ${directDiagnostics.length}.`);
}
if (diagnostics.rows.length !== directDiagnostics.length) {
  failures.push(`Expected semantic-runtime TypeScript diagnostics to match direct TypeScript diagnostics, observed semantic=${diagnostics.rows.length} direct=${directDiagnostics.length}.`);
}
if (diagnostics.rows.some((row) => row.diagnosticKind === 'TS2591' || row.message.includes('Buffer'))) {
  failures.push('Expected semantic-runtime not to report Buffer/@types/node diagnostics for a project with types=["node"].');
}
if (summary.totalDiagnosticRows !== 0) {
  failures.push(`Expected TypeScript diagnostic summary to report zero rows, observed ${summary.totalDiagnosticRows}.`);
}
if (!diagnostics.displayText.includes(`TypeScript: analyzer=${diagnostics.typeScript.analyzer.version}`)) {
  failures.push('Expected diagnostics display text to expose the analyzer TypeScript version.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    directDiagnostics,
    diagnostics,
    summary,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      directDiagnosticRows: directDiagnostics.length,
      semanticDiagnosticRows: diagnostics.rows.length,
      typeScriptRelation: diagnostics.typeScript.versionRelation,
    },
  }, null, 2));
}

function readDirectTypeScriptDiagnostics(configFileName) {
  const read = ts.readConfigFile(configFileName, ts.sys.readFile);
  if (read.error != null) {
    return [formatDiagnostic('config', read.error)];
  }
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(configFileName),
  );
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  return [
    ...parsed.errors.map((diagnostic) => formatDiagnostic('config', diagnostic)),
    ...program.getGlobalDiagnostics().map((diagnostic) => formatDiagnostic('global', diagnostic)),
    ...program.getOptionsDiagnostics().map((diagnostic) => formatDiagnostic('options', diagnostic)),
    ...program.getSyntacticDiagnostics().map((diagnostic) => formatDiagnostic('syntactic', diagnostic)),
    ...program.getSemanticDiagnostics().map((diagnostic) => formatDiagnostic('semantic', diagnostic)),
    ...program.getDeclarationDiagnostics().map((diagnostic) => formatDiagnostic('declaration', diagnostic)),
  ];
}

function formatDiagnostic(phase, diagnostic) {
  return {
    phase,
    code: diagnostic.code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    fileName: diagnostic.file?.fileName ?? null,
    start: diagnostic.start ?? null,
  };
}
