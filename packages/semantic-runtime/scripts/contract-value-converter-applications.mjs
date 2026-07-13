import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  readSemanticAppQueryCatalog,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/value-converter-source-value');
const templatePath = path.join(fixtureRoot, 'src/value-converter-source-value-app.html');
const templateText = fs.readFileSync(templatePath, 'utf8');

const catalog = readSemanticAppQueryCatalog({ queryKind: SemanticAppQueryKind.ValueConverterApplications });
assert.equal(catalog.value.rows.length, 1, 'ValueConverterApplications should be in the public app-query catalog.');
assert.equal(catalog.value.rows[0].group, 'binding', 'ValueConverterApplications should live with binding projections.');
assert.equal(catalog.value.rows[0].minimumAnalysisDepth, 'binding-observation', 'ValueConverterApplications should require binding-observation facts.');
assert.equal(catalog.value.rows[0].supportsDetail, true, 'ValueConverterApplications should expose handle detail for follow-up tools.');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:value-converter-applications',
});

const rows = [];
let cursor = null;
let answer = null;
do {
  answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.ValueConverterApplications,
    page: { size: 1, cursor },
    analysisDepth: 'binding-observation',
    appRetention: 'retain-app',
  });
  assert.match(answer.outcome, /^(hit|partial)$/u, answer.summary);
  rows.push(...answer.value.rows);
  cursor = answer.page?.nextCursor ?? null;
} while (cursor != null);

assert.equal(rows.length, 12, `Expected twelve value-converter lifecycle applications, got ${rows.length}.`);
assert.deepEqual(
  [...new Set(rows.map((row) => row.converterName))].sort(),
  ['dynamicContextProducts', 'featuredProducts', 'importedSignalProducts', 'openSignalProducts'],
  'Expected every fixture value converter to materialize as lifecycle application rows.',
);

for (const converterName of [
  'dynamicContextProducts',
  'featuredProducts',
  'importedSignalProducts',
  'openSignalProducts',
]) {
  expectConverterRows(converterName);
}

expectSignalLifecycle('dynamicContextProducts', 'absent', []);
expectSignalLifecycle('featuredProducts', 'closed', ['featured-refresh']);
expectSignalLifecycle('importedSignalProducts', 'closed', ['local-refresh', 'catalog-refresh', 'catalog-theme']);
expectSignalLifecycle('openSignalProducts', 'open', ['known-refresh']);

const importedBind = converterRow('importedSignalProducts', 'bind');
assert.equal(sourceText(importedBind.lifecycleEffects.configurationSource), 'signals');
assert.equal(sourceText(importedBind.lifecycleEffects.signals[0].source), 'local-refresh');
assert.equal(sourceText(importedBind.lifecycleEffects.signals[1].source), 'catalog-refresh');
assert.equal(sourceText(importedBind.lifecycleEffects.signals[2].source), 'catalog-theme');
assert.equal(
  importedBind.lifecycleEffects.signals[1].source.path,
  'src/converter-signals.ts',
  'Imported signal provenance should remain anchored in the exporting module.',
);

const openBind = converterRow('openSignalProducts', 'bind');
assert.equal(openBind.lifecycleEffects.openReason, 'The signals array may contain additional runtime elements.');
assert.equal(sourceText(openBind.lifecycleEffects.signals[0].source), 'known-refresh');

console.log(`Value converter applications contract passed (${rows.length} row(s)).`);

function expectConverterRows(converterName) {
  const converterRows = rows.filter((candidate) => candidate.converterName === converterName);
  assert.equal(converterRows.length, 3, `Expected three lifecycle rows for value converter ${converterName}.`);
  assert.deepEqual(
    converterRows.map((row) => row.phase).sort(),
    ['bind', 'to-view', 'unbind'],
    `${converterName} should publish bind, conversion, and unbind phases.`,
  );
  for (const row of converterRows) {
    assert.equal(row.definitionName, 'value-converter-source-value-app', `${converterName} should belong to the fixture app definition.`);
    assert.equal(row.origin, 'authored', `${converterName} should retain authored application identity.`);
    assert.equal(row.authoredChainDepth, 0, `${converterName} should retain its authored chain depth.`);
    assert.equal(row.runtimeChainDepth, 0, `${converterName} should retain its runtime chain depth.`);
    assert.equal(row.phaseReachability, 'reached', `${converterName} ${row.phase} should be reached.`);
    assert.equal(row.argumentCount, 0, `${converterName} should have no authored converter arguments.`);
    assert.equal(row.source?.path, 'src/value-converter-source-value-app.html', `${converterName} should carry the template source path.`);
    assert.equal(
      templateText.slice(row.source.start, row.source.end),
      converterName,
      `${converterName} should point at the exact converter name span.`,
    );
  }
  assert.deepEqual(
    converterRow(converterName, 'to-view').lifecycleEffects.effectKinds,
    [],
    `${converterName} conversion should not duplicate bind/unbind signal effects.`,
  );
}

function expectSignalLifecycle(converterName, signalState, signalNames) {
  for (const phase of ['bind', 'unbind']) {
    const row = converterRow(converterName, phase);
    assert.equal(row.lifecycleEffects.signalState, signalState, `${converterName} ${phase} signal state should be ${signalState}.`);
    assert.deepEqual(
      row.lifecycleEffects.signals.map((signal) => signal.name),
      signalNames,
      `${converterName} ${phase} should retain its known signal names.`,
    );
    assert.deepEqual(
      row.lifecycleEffects.effectKinds,
      signalState === 'absent' ? [] : ['signal-subscription'],
      `${converterName} ${phase} should expose signal subscription effects only when signals may exist.`,
    );
  }
}

function converterRow(converterName, phase) {
  const row = rows.find((candidate) => candidate.converterName === converterName && candidate.phase === phase);
  assert.ok(row, `Expected a ${phase} row for value converter ${converterName}.`);
  return row;
}

function sourceText(source) {
  assert.ok(source?.path != null && source.start != null && source.end != null, 'Expected an authored source reference.');
  return fs.readFileSync(path.join(fixtureRoot, source.path), 'utf8').slice(source.start, source.end);
}
