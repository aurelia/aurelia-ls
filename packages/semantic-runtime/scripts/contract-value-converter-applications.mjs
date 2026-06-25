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

assert.equal(rows.length, 2, `Expected two value-converter applications, got ${rows.length}.`);
assert.deepEqual(
  rows.map((row) => row.converterName).sort(),
  ['dynamicContextProducts', 'featuredProducts'],
  'Expected both fixture value converters to materialize as application rows.',
);

expectConverterRow('featuredProducts');
expectConverterRow('dynamicContextProducts');

console.log(`Value converter applications contract passed (${rows.length} row(s)).`);

function expectConverterRow(converterName) {
  const row = rows.find((candidate) => candidate.converterName === converterName);
  assert.ok(row, `Expected a row for value converter ${converterName}.`);
  assert.equal(row.definitionName, 'value-converter-source-value-app', `${converterName} should belong to the fixture app definition.`);
  assert.equal(row.phase, 'to-view', `${converterName} should materialize as a to-view converter application.`);
  assert.equal(row.argumentCount, 0, `${converterName} should have no authored converter arguments.`);
  assert.equal(row.source?.path, 'src/value-converter-source-value-app.html', `${converterName} should carry the template source path.`);
  assert.equal(
    templateText.slice(row.source.start, row.source.end),
    converterName,
    `${converterName} should point at the exact converter name span.`,
  );
}
