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
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-builder-part-source-gallery');
const templatePath = path.join(fixtureRoot, 'src/my-app.html');
const templateText = fs.readFileSync(templatePath, 'utf8');

const catalog = readSemanticAppQueryCatalog({ queryKind: SemanticAppQueryKind.TemplateFoldingRanges });
assert.equal(catalog.value.rows.length, 1, 'TemplateFoldingRanges should be in the public app-query catalog.');
assert.equal(catalog.value.rows[0].supportsSourceFile, true, 'TemplateFoldingRanges should accept sourceFile filtering.');
assert.equal(catalog.value.rows[0].supportsPaging, true, 'TemplateFoldingRanges should page row results.');
assert.equal(catalog.value.rows[0].minimumAnalysisDepth, 'runtime-topology', 'TemplateFoldingRanges should only require runtime-topology facts.');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:template-folding-ranges',
});

const rows = [];
let cursor = null;
let answer = null;
do {
  answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateFoldingRanges,
    sourceFile: { filePath: templatePath },
    sourceFilePath: templatePath,
    page: { size: 25, cursor },
    analysisDepth: 'runtime-topology',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.equal(answer.result, 'answered', answer.summary);
  assert.equal(answer.selection, 'not-applicable', answer.summary);
  assert.equal(answer.coverage, 'complete', answer.summary);
  rows.push(...answer.value.rows);
  cursor = answer.page?.nextCursor ?? null;
} while (cursor != null);

assert.ok(rows.length >= 20, `Expected many gallery folding ranges, got ${rows.length}.`);

const main = rowForSlice('<main>', '</main>');
assert.equal(main.foldKind, 'element');
assert.equal(main.tagName, 'main');
assert.equal(main.selfClosing, false);
assert.ok(main.childCount > 0);

const repeatedLabel = rowForSlice(
  '<label repeat.for="option of options">\n      <input type="checkbox" checked.bind="selectedOptions" model.bind="option">',
  '</label>',
);
assert.equal(repeatedLabel.tagName, 'label');
assert.equal(repeatedLabel.foldKind, 'element');
assert.equal(templateText.slice(repeatedLabel.source.start, repeatedLabel.source.end).startsWith('<label'), true);

const singleLineInput = rows.find((row) =>
  templateText.slice(row.source.start, row.source.end) === '<input value.bind="draft.title">'
) ?? null;
assert.equal(singleLineInput, null, 'Single-line elements should not become folding rows.');

console.log(`Template folding ranges contract passed (${rows.length} row(s)).`);

function rowForSlice(startMark, endMark) {
  const start = templateText.indexOf(startMark);
  assert.notEqual(start, -1, `Fixture start marker not found: ${startMark}`);
  const endMarkOffset = templateText.indexOf(endMark, start);
  assert.notEqual(endMarkOffset, -1, `Fixture end marker not found after ${startMark}: ${endMark}`);
  const end = endMarkOffset + endMark.length;
  const row = rows.find((candidate) =>
    candidate.source?.start === start
    && candidate.source?.end === end
  ) ?? null;
  assert.ok(row, `Expected folding range for ${startMark}.`);
  assert.equal(templateText.slice(row.source.start, row.source.end), templateText.slice(start, end));
  return row;
}
