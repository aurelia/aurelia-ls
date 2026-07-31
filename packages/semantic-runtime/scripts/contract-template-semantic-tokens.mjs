import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  readSemanticAppQueryCatalog,
  SemanticAppQueryKind,
} from '../out/index.js';
import { readFieldProvenance } from '../out/kernel/provenance.js';
import { HtmlAttribute, HtmlElement } from '../out/template/html-ir.js';
import { TemplateProductDetails } from '../out/template/product-details.js';

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
  assert.equal(answer.result, 'answered', answer.summary);
  assert.equal(answer.selection, 'not-applicable', answer.summary);
  assert.equal(answer.coverage, 'complete', answer.summary);
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
expectToken('<au-compose></au-compose>', 'au-compose', 'aureliaElement', [], 1);
expectToken('<au-compose></au-compose>', 'au-compose', 'aureliaElement', [], 2);

const store = runtime.workspace.store;
const htmlDetails = store.productDetails.readBySlot(TemplateProductDetails.HtmlNode).map((entry) => entry.detail);
const firstComposeStart = templateText.indexOf('<au-compose>') + 1;
const firstCompose = htmlDetails.find((detail) =>
  detail instanceof HtmlElement
  && detail.tagName === 'au-compose'
  && store.readAddress(detail.tagNameAddressHandle)?.start === firstComposeStart
);
assert.ok(firstCompose instanceof HtmlElement, 'Expected the first au-compose HTML element detail.');
expectFieldWitness(firstCompose, 'tagName', firstCompose.tagNameAddressHandle);
expectFieldWitness(firstCompose, 'closingTagName', firstCompose.closingTagNameAddressHandle);

const htmlAttributes = store.productDetails.readBySlot(TemplateProductDetails.HtmlAttribute).map((entry) => entry.detail);
const firstValueBind = htmlAttributes.find((detail) => detail instanceof HtmlAttribute && detail.rawName === 'value.bind');
assert.ok(firstValueBind instanceof HtmlAttribute, 'Expected a value.bind HTML attribute detail.');
expectFieldWitness(firstValueBind, 'name', firstValueBind.nameAddressHandle);
expectFieldWitness(firstValueBind, 'value', firstValueBind.valueAddressHandle);

console.log(`Template semantic tokens contract passed (${rows.length} row(s)).`);

function expectToken(mark, tokenText, tokenType, modifiers = [], occurrence = 1) {
  const token = tokenForSlice(mark, tokenText, tokenType, modifiers, occurrence);
  assert.ok(token, `Expected ${tokenType} token '${tokenText}' near ${mark}.`);
  assert.equal(templateText.slice(token.source.start, token.source.end), tokenText);
}

function tokenForSlice(mark, tokenText, tokenType, modifiers, occurrence) {
  const markOffset = templateText.indexOf(mark);
  assert.notEqual(markOffset, -1, `Fixture marker not found: ${mark}`);
  let start = markOffset - 1;
  for (let index = 0; index < occurrence; index += 1) {
    start = templateText.indexOf(tokenText, start + 1);
  }
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

function expectFieldWitness(detail, field, addressHandle) {
  assert.ok(addressHandle, `Expected ${field} to carry an exact source address.`);
  const provenanceHandle = readFieldProvenance(detail.fieldProvenance, field);
  assert.ok(provenanceHandle, `Expected ${field} field provenance.`);
  const provenance = store.readProvenance(provenanceHandle);
  assert.equal(provenance?.evidenceHandles.length, 1, `Expected one direct witness for ${field}.`);
  const evidence = store.readEvidence(provenance.evidenceHandles[0]);
  assert.equal(evidence?.addressHandle, addressHandle, `Expected ${field} provenance to witness its exact source address.`);
}
