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
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
const templatePath = path.join(fixtureRoot, 'src/app.html');
const viewModelPath = path.join(fixtureRoot, 'src/app.ts');
const originalTemplateText = fs.readFileSync(templatePath, 'utf8');
const viewModelText = fs.readFileSync(viewModelPath, 'utf8');
const templateText = originalTemplateText.replace('${}', '${title} ${title}');

const catalog = readSemanticAppQueryCatalog({ queryKind: SemanticAppQueryKind.TemplateReferences });
assert.equal(catalog.value.rows.length, 1, 'TemplateReferences should be in the public app-query catalog.');
assert.equal(catalog.value.rows[0].requiresCursor, true, 'TemplateReferences should require a source cursor.');
assert.equal(catalog.value.rows[0].supportsPaging, true, 'TemplateReferences should page row results.');
assert.equal(catalog.value.rows[0].minimumAnalysisDepth, 'binding-observation', 'TemplateReferences should require binding-observation facts.');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:template-references',
  sourceTextProvider: {
    readFile(fileName) {
      return samePath(fileName, templatePath) ? templateText : undefined;
    },
    fileExists(fileName) {
      return samePath(fileName, templatePath) ? true : undefined;
    },
  },
});

const withoutDeclaration = await askReferences(false);
const withDeclaration = await askReferences(true);
const firstTitleStart = templateText.indexOf('title');
const secondTitleStart = templateText.indexOf('title', firstTitleStart + 'title'.length);
const declarationStart = viewModelText.indexOf('title');

assert.equal(withoutDeclaration.value.selectedMemberName, 'title');
assert.equal(withoutDeclaration.value.rows.length, 2, 'References without declaration should return only template usages.');
assert.deepEqual(
  withoutDeclaration.value.rows.map((row) => row.referenceKind),
  ['template-usage', 'template-usage'],
);
assert.deepEqual(
  withoutDeclaration.value.rows.map((row) => [row.source?.path, row.source?.start, row.source?.end]),
  [
    ['src/app.html', firstTitleStart, firstTitleStart + 'title'.length],
    ['src/app.html', secondTitleStart, secondTitleStart + 'title'.length],
  ],
);

assert.equal(withDeclaration.value.rows.length, 3, 'References with declaration should include the TS member source.');
const declaration = withDeclaration.value.rows.find((row) => row.referenceKind === 'declaration');
assert.ok(declaration, 'Expected a declaration reference row.');
assert.equal(declaration.source?.path?.replace(/\\/g, '/'), 'src/app.ts');
assert.equal(declaration.source?.start, declarationStart);
assert.equal(declaration.source?.end, declarationStart + 'title'.length);
assert.equal(withDeclaration.value.targetSource?.path?.replace(/\\/g, '/'), 'src/app.ts');
assert.equal(withDeclaration.value.targetSource?.start, declarationStart);
assert.equal(withDeclaration.value.targetSource?.end, declarationStart + 'title'.length);

console.log(`Template references contract passed (${withDeclaration.value.rows.length} row(s)).`);

async function askReferences(includeDeclaration) {
  const answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateReferences,
    sourceFilePath: templatePath,
    cursor: cursorInside('${title}', 'title', 1),
    includeDeclaration,
    page: { size: 20 },
    analysisDepth: 'binding-observation',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.match(answer.outcome, /^(hit|partial)$/u, answer.summary);
  return answer;
}

function cursorInside(marker, needle, delta = 0) {
  const markerOffset = templateText.indexOf(marker);
  assert.notEqual(markerOffset, -1, `Expected marker: ${marker}`);
  const needleOffset = templateText.indexOf(needle, markerOffset);
  assert.notEqual(needleOffset, -1, `Expected needle ${needle} in marker ${marker}.`);
  const offset = needleOffset + delta;
  const before = templateText.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return {
    filePath: templatePath,
    line: lines.length - 1,
    character: lines[lines.length - 1].length,
    offset,
  };
}

function samePath(left, right) {
  return path.resolve(left).replace(/\\/g, '/').toLowerCase()
    === path.resolve(right).replace(/\\/g, '/').toLowerCase();
}
