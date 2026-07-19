import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticOpenSeamAttemptKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/dialog-classic-with-child');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'dialog-classic-with-child-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-targets',
});

const seamSites = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  page: { size: 20 },
}).value;
const openSeams = app.ask({
  kind: SemanticAppQueryKind.OpenSeams,
  page: { size: 20 },
}).value.rows;
const childConfigurationOpenSeams = openSeams.filter((row) =>
  row.attempt.kind === SemanticOpenSeamAttemptKind.RegistrationRecognition
  || row.attempt.kind === SemanticOpenSeamAttemptKind.ConfigurationRecognition
  || (
    row.attempt.kind === SemanticOpenSeamAttemptKind.DiWorldConstruction
    && !isStandardConfigurationDiCoverageSeam(row)
  )
);
const dialogIssues = app.ask({
  kind: SemanticAppQueryKind.DialogIssues,
  page: { size: 20 },
}).value;
const diIssues = app.ask({
  kind: SemanticAppQueryKind.DiIssues,
  page: { size: 20 },
}).value;

const failures = [];
if (childConfigurationOpenSeams.length !== 0) {
  failures.push(`Expected DialogConfigurationClassic.withChild registration and DI effects to close apart from the known StandardConfiguration coverage boundary, observed ${childConfigurationOpenSeams.length} relevant seam rows.`);
}
if (dialogIssues.rows.length !== 0) {
  failures.push(`Expected valid dialog child configuration to publish no dialog issues, observed ${dialogIssues.rows.length}.`);
}
if (diIssues.rows.length !== 0) {
  failures.push(`Expected valid dialog child configuration to publish no DI issues, observed ${diIssues.rows.length}.`);
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    seamSites,
    childConfigurationOpenSeams,
    dialogIssues,
    diIssues,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    seamSites: seamSites.totalOpenSeamSites,
    childConfigurationOpenSeams: childConfigurationOpenSeams.length,
    dialogIssues: dialogIssues.rows.length,
    diIssues: diIssues.rows.length,
  }, null, 2));
}

function isStandardConfigurationDiCoverageSeam(row) {
  return row.seamKindKey === 'di.open-registry-body'
    && row.summary.startsWith('StandardConfiguration catalogs and compiler-world services are modeled');
}
