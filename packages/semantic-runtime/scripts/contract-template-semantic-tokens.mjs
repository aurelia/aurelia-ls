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

const catalog = readSemanticAppQueryCatalog({ queryKind: SemanticAppQueryKind.TemplateSemanticTokens });
assert.equal(catalog.value.rows.length, 1, 'TemplateSemanticTokens should be in the public app-query catalog.');
assert.equal(catalog.value.rows[0].supportsSourceFile, true, 'TemplateSemanticTokens should accept sourceFile filtering.');
assert.equal(catalog.value.rows[0].supportsPaging, true, 'TemplateSemanticTokens should page row results.');
assert.equal(catalog.value.rows[0].minimumAnalysisDepth, 'runtime-topology', 'TemplateSemanticTokens should only require runtime-topology facts.');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:template-semantic-tokens',
});

const rows = [];
let cursor = null;
let answer = null;
do {
  answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateSemanticTokens,
    sourceFile: { filePath: templatePath },
    sourceFilePath: templatePath,
    page: { size: 200, cursor },
    analysisDepth: 'runtime-topology',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.match(answer.outcome, /^(hit|partial)$/u, answer.summary);
  rows.push(...answer.value.rows);
  cursor = answer.page?.nextCursor ?? null;
} while (cursor != null);

assert.ok(rows.length >= 100, `Expected many gallery semantic tokens, got ${rows.length}.`);

expectToken('<input value.bind="draft.title">', 'bind', 'aureliaCommand');
expectToken('<label repeat.for="option of options">', 'repeat', 'aureliaController');
expectToken('<label repeat.for="option of options">', 'for', 'aureliaCommand');
expectToken('<let item.bind="selectedItem"></let>', 'let', 'aureliaMetaElement');
expectToken('<let item.bind="selectedItem"></let>', 'item', 'variable', ['declaration']);
expectToken('<input value.bind="draft.title">', 'draft', 'variable');
expectToken('<input value.bind="draft.title">', 'title', 'property');
expectToken('<input value.bind="draft.title & debounce">', 'debounce', 'aureliaBehavior');
expectToken('<span>${descriptionHtml | sanitize}</span>', 'sanitize', 'aureliaConverter');

console.log(`Template semantic tokens contract passed (${rows.length} row(s)).`);

function expectToken(mark, tokenText, tokenType, modifiers = []) {
  const token = tokenForSlice(mark, tokenText, tokenType, modifiers);
  assert.ok(token, `Expected ${tokenType} token '${tokenText}' near ${mark}.`);
  assert.equal(templateText.slice(token.source.start, token.source.end), tokenText);
}

function tokenForSlice(mark, tokenText, tokenType, modifiers) {
  const markOffset = templateText.indexOf(mark);
  assert.notEqual(markOffset, -1, `Fixture marker not found: ${mark}`);
  const start = templateText.indexOf(tokenText, markOffset);
  assert.notEqual(start, -1, `Fixture token text not found after ${mark}: ${tokenText}`);
  const end = start + tokenText.length;
  const wantedModifiers = [...modifiers].sort().join(',');
  return rows.find((row) =>
    row.tokenType === tokenType
    && [...row.tokenModifiers].sort().join(',') === wantedModifiers
    && row.source?.start === start
    && row.source?.end === end
  ) ?? null;
}
