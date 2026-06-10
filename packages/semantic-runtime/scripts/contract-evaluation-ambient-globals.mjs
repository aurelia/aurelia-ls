import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/evaluation-ambient-globals');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'evaluation-ambient-globals-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const allUnresolved = app.ask({
  kind: SemanticAppQueryKind.OpenSeams,
  openSeamKindKey: 'evaluation.unresolved-identifier',
  page: { size: 20 },
}).value;
const appSourceUnresolved = app.ask({
  kind: SemanticAppQueryKind.OpenSeams,
  sourceFile: { filePath: 'src/app.ts' },
  openSeamKindKey: 'evaluation.unresolved-identifier',
  page: { size: 20 },
}).value;
const summary = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSummary,
  openSeamKindKey: 'evaluation.unresolved-identifier',
  page: { size: 20 },
}).value;
const overview = app.ask({
  kind: SemanticAppQueryKind.AppOverview,
  openSeamPageSize: 10,
}).value;

const failures = [];
const unresolvedText = JSON.stringify(allUnresolved);
const summaryText = JSON.stringify(summary);

if (unresolvedText.includes('__APP_VERSION__')) {
  failures.push('Expected project-local ambient declare const __APP_VERSION__ to resolve as a host boundary, not an unresolved identifier.');
}
if (unresolvedText.includes('__FEATURE_FLAG__')) {
  failures.push('Expected declare global const __FEATURE_FLAG__ to resolve as a host boundary, not an unresolved identifier.');
}
if (!unresolvedText.includes('__MISSING_BUILD_VALUE__')) {
  failures.push('Expected the intentionally undeclared build value to remain an unresolved-identifier seam.');
}
if (allUnresolved.rows.length !== 1) {
  failures.push(`Expected exactly one unresolved-identifier seam after ambient globals are admitted, observed ${allUnresolved.rows.length}.`);
}
if (appSourceUnresolved.rows.length !== 1 || appSourceUnresolved.rows[0]?.source?.path.endsWith('src/app.ts') !== true) {
  failures.push('Expected sourceFile-filtered unresolved-identifier seams to point at src/app.ts.');
}
if (summary.rows.length !== 1 || summary.rows[0]?.seamKindKey !== 'evaluation.unresolved-identifier') {
  failures.push('Expected open-seam-summary filtering to return the unresolved-identifier cluster.');
}
if (summary.rows[0]?.sampleSources.some((source) => source.path?.endsWith('src/app.ts') === true) !== true) {
  failures.push('Expected open-seam-summary rows to carry sample source locations for cluster drill-down.');
}
if (typeof summary.displayText !== 'string') {
  failures.push('Expected open-seam-summary value to carry displayText.');
}
if (!summary.displayText.includes('src/app.ts') && !summaryText.includes('src/app.ts')) {
  failures.push('Expected open-seam-summary display or row samples to name a concrete source file.');
}
if (!overview.displayText.includes('Open seam samples:')) {
  failures.push('Expected app overview display text to include compact open seam samples.');
}
if (!overview.displayText.includes('src/app.ts')) {
  failures.push('Expected app overview open seam samples to include a concrete source file.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    allUnresolved,
    appSourceUnresolved,
    summary,
    overviewDisplayText: overview.displayText,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    unresolvedIdentifierRows: allUnresolved.rows.length,
    summaryDisplayText: summary.displayText,
    overviewDisplayText: overview.displayText,
  }, null, 2));
}
