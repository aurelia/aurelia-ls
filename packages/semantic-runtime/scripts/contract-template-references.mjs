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
const storefrontRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-routed-catalog-storefront');
const storefrontTemplatePath = path.join(storefrontRoot, 'src/routes/item-list-route.html');
const storefrontDefinitionPath = path.join(storefrontRoot, 'src/components/item-card.ts');
const storefrontTemplateText = fs.readFileSync(storefrontTemplatePath, 'utf8');
const storefrontDefinitionText = fs.readFileSync(storefrontDefinitionPath, 'utf8');

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
const tsUsageStart = viewModelText.indexOf('title', declarationStart + 'title'.length);

assert.equal(withoutDeclaration.value.selectedMemberName, 'title');
// References share the TypeScript occurrence collector with rename, so non-declaration TS usages
// are enumerated alongside template usages.
assert.equal(withoutDeclaration.value.rows.length, 3, 'References without declaration should return template and TS usages.');
assert.deepEqual(
  withoutDeclaration.value.rows.map((row) => row.referenceKind).sort(),
  ['template-usage', 'template-usage', 'typescript-usage'],
);
const templateUsageRows = withoutDeclaration.value.rows.filter((row) => row.referenceKind === 'template-usage');
assert.deepEqual(
  templateUsageRows.map((row) => [row.source?.path, row.source?.start, row.source?.end]),
  [
    ['src/app.html', firstTitleStart, firstTitleStart + 'title'.length],
    ['src/app.html', secondTitleStart, secondTitleStart + 'title'.length],
  ],
);
const tsUsageRow = withoutDeclaration.value.rows.find((row) => row.referenceKind === 'typescript-usage');
assert.ok(samePath(tsUsageRow.source?.path ?? '', viewModelPath), 'TS usage row should point at the view-model file.');
assert.equal(tsUsageRow.source?.start, tsUsageStart);
assert.equal(tsUsageRow.source?.end, tsUsageStart + 'title'.length);

assert.equal(withDeclaration.value.rows.length, 4, 'References with declaration should include the TS member source.');
const declaration = withDeclaration.value.rows.find((row) => row.referenceKind === 'declaration');
assert.ok(declaration, 'Expected a declaration reference row.');
assert.equal(declaration.source?.path?.replace(/\\/g, '/'), 'src/app.ts');
assert.equal(declaration.source?.start, declarationStart);
assert.equal(declaration.source?.end, declarationStart + 'title'.length);
assert.equal(withDeclaration.value.targetSource?.path?.replace(/\\/g, '/'), 'src/app.ts');
assert.equal(withDeclaration.value.targetSource?.start, declarationStart);
assert.equal(withDeclaration.value.targetSource?.end, declarationStart + 'title'.length);

const storefrontRuntime = await createSemanticRuntime({
  workspaceRoot: storefrontRoot,
  storeKey: 'contract:template-references:resource-name-source',
});
const resourceReferences = await storefrontRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateReferences,
  sourceFilePath: storefrontTemplatePath,
  cursor: cursorInsideSource(storefrontTemplateText, storefrontTemplatePath, '<item-card item.bind="item">', 'item-card', 1),
  includeDeclaration: true,
  page: { size: 20 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assert.match(resourceReferences.outcome, /^(hit|partial)$/u, resourceReferences.summary);
assert.equal(resourceReferences.value.selectedMemberName, 'item-card');
const resourceNameStart = storefrontDefinitionText.indexOf("'item-card'") + 1;
assert.notEqual(resourceNameStart, 0, 'Expected item-card resource name literal in storefront component.');
const resourceDeclaration = resourceReferences.value.rows.find((row) => row.referenceKind === 'declaration');
assert.ok(resourceDeclaration, 'Expected resource references to include the resource-name declaration.');
assert.equal(resourceDeclaration.source?.path?.replace(/\\/g, '/'), 'src/components/item-card.ts');
assert.equal(resourceDeclaration.source?.start, resourceNameStart);
assert.equal(resourceDeclaration.source?.end, resourceNameStart + 'item-card'.length);
assert.equal(resourceReferences.value.targetSource?.path?.replace(/\\/g, '/'), 'src/components/item-card.ts');
assert.equal(resourceReferences.value.targetSource?.start, resourceNameStart);
assert.equal(resourceReferences.value.targetSource?.end, resourceNameStart + 'item-card'.length);

console.log(`Template references contract passed (${withDeclaration.value.rows.length + resourceReferences.value.rows.length} row(s)).`);

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
  return cursorInsideSource(templateText, templatePath, marker, needle, delta);
}

function cursorInsideSource(text, filePath, marker, needle, delta = 0) {
  const markerOffset = text.indexOf(marker);
  assert.notEqual(markerOffset, -1, `Expected marker: ${marker}`);
  const needleOffset = text.indexOf(needle, markerOffset);
  assert.notEqual(needleOffset, -1, `Expected needle ${needle} in marker ${marker}.`);
  const offset = needleOffset + delta;
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return {
    filePath,
    line: lines.length - 1,
    character: lines[lines.length - 1].length,
    offset,
  };
}

function samePath(left, right) {
  return path.resolve(left).replace(/\\/g, '/').toLowerCase()
    === path.resolve(right).replace(/\\/g, '/').toLowerCase();
}
