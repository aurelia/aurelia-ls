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

const catalog = readSemanticAppQueryCatalog({ queryKind: SemanticAppQueryKind.TemplateInlayHints });
assert.equal(catalog.value.rows.length, 1, 'TemplateInlayHints should be in the public app-query catalog.');
assert.equal(catalog.value.rows[0].supportsSourceFile, true, 'TemplateInlayHints should accept sourceFile filtering.');
assert.equal(catalog.value.rows[0].minimumAnalysisDepth, 'binding-observation', 'TemplateInlayHints should require binding-observation facts.');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:template-inlay-hints',
});

const rows = [];
let cursor = null;
let answer = null;
do {
  answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateInlayHints,
    sourceFile: { filePath: templatePath },
    sourceFilePath: templatePath,
    page: { size: 200, cursor },
    analysisDepth: 'binding-observation',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.equal(answer.result, 'answered', answer.summary);
  assert.equal(answer.selection, 'not-applicable', answer.summary);
  assert.equal(answer.coverage, 'complete', answer.summary);
  rows.push(...answer.value.rows);
  cursor = answer.page?.nextCursor ?? null;
} while (cursor != null);

assert.ok(rows.length >= 40, `Expected many gallery inlay hints, got ${rows.length}.`);

const firstValueBind = rowForAttribute('<input type="time" value.bind="draft.title"', 'value.bind');
assert.equal(firstValueBind.targetProperty, 'value');
assert.equal(firstValueBind.authoredMode, 'default');
assert.equal(firstValueBind.effectiveMode, 'two-way');
assert.equal(firstValueBind.effectiveModeLabel, 'twoWay');
assert.equal(firstValueBind.source.role, 'name');
assert.equal(templateText.slice(firstValueBind.source.start, firstValueBind.source.end), 'value.bind');

const disabledBind = rowForAttribute('<button disabled.bind', 'disabled.bind');
assert.equal(disabledBind.targetProperty, 'disabled');
assert.equal(disabledBind.authoredMode, 'default');
assert.equal(disabledBind.effectiveMode, 'to-view');
assert.equal(disabledBind.effectiveModeLabel, 'toView');
assert.equal(templateText.slice(disabledBind.source.start, disabledBind.source.end), 'disabled.bind');

assert.equal(
  rowForAttributeOrNull('disabled.to-view', 'disabled.to-view'),
  null,
  'Explicit disabled.to-view should not produce an implicit mode inlay hint.',
);

console.log(`Template inlay hints contract passed (${rows.length} row(s)).`);

function rowForAttribute(mark, attributeName) {
  const row = rowForAttributeOrNull(mark, attributeName);
  assert.ok(row, `Expected a TemplateInlayHints row for ${mark} / ${attributeName}.`);
  return row;
}

function rowForAttributeOrNull(mark, attributeName) {
  const markOffset = templateText.indexOf(mark);
  assert.notEqual(markOffset, -1, `Fixture marker not found: ${mark}`);
  const start = templateText.indexOf(attributeName, markOffset);
  assert.notEqual(start, -1, `Fixture attribute not found after ${mark}: ${attributeName}`);
  const end = start + attributeName.length;
  return rows.find((row) =>
    row.source?.start === start
    && row.source?.end === end
  ) ?? null;
}
