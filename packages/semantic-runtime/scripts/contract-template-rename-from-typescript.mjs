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

const catalog = readSemanticAppQueryCatalog({ queryKind: SemanticAppQueryKind.TemplateRenameFromTypeScript });
assert.equal(catalog.value.rows.length, 1, 'TemplateRenameFromTypeScript should be in the public app-query catalog.');
assert.equal(catalog.value.rows[0].requiresCursor, true, 'TemplateRenameFromTypeScript should require a source cursor.');
assert.equal(catalog.value.rows[0].minimumAnalysisDepth, 'binding-observation', 'TemplateRenameFromTypeScript should require binding-observation facts.');
assert.equal(catalog.value.rows[0].materializationPolicy, 'query-type-projection', 'TemplateRenameFromTypeScript should expose TypeChecker projection cost.');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:template-rename-from-typescript',
  sourceTextProvider: {
    readFile(fileName) {
      return samePath(fileName, templatePath) ? templateText : undefined;
    },
    fileExists(fileName) {
      return samePath(fileName, templatePath) ? true : undefined;
    },
  },
});

const firstTitleStart = templateText.indexOf('title');
const secondTitleStart = templateText.indexOf('title', firstTitleStart + 'title'.length);
const declarationStart = viewModelText.indexOf('title');
const tsUsageStart = viewModelText.indexOf('title', declarationStart + 'title'.length);

const prepare = await askRenameFromTypeScript(null, declarationStart + 1);
assert.equal(prepare.outcome, 'hit');
assert.equal(prepare.value.status, 'available');
assert.equal(prepare.value.placeholder, 'title');
assert.equal(prepare.value.templateReferenceCount, 2);
assert.equal(prepare.value.typeScriptReferenceCount, 0, 'TS rename propagation query should leave TS edits to the TS provider.');
assert.ok(
  samePath(prepare.value.activeSource?.path ?? '', viewModelPath),
  `Expected active TS source to point at app.ts, observed ${prepare.value.activeSource?.path ?? 'missing'}.`,
);
assert.equal(prepare.value.activeSource?.start, declarationStart);
assert.equal(prepare.value.edits.length, 0, 'Prepare rename should not emit template edits before a new name is supplied.');

const invalid = await askRenameFromTypeScript('not-valid-name', declarationStart + 1);
assert.equal(invalid.outcome, 'miss');
assert.equal(invalid.value.status, 'invalid-name');
assert.equal(invalid.value.reason, 'invalid-new-name');

const fromDeclaration = await askRenameFromTypeScript('heading', declarationStart + 1);
assertTemplateRenameEdits(fromDeclaration, 'declaration cursor');

const fromTsUsage = await askRenameFromTypeScript('heading', tsUsageStart + 1);
assertTemplateRenameEdits(fromTsUsage, 'TS usage cursor');

console.log(`Template rename-from-TypeScript contract passed (${fromDeclaration.value.edits.length} template edit row(s)).`);

async function askRenameFromTypeScript(newName, offset) {
  const answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateRenameFromTypeScript,
    sourceFilePath: viewModelPath,
    cursor: cursorAtOffset(viewModelPath, viewModelText, offset),
    ...(newName == null ? {} : { newName }),
    analysisDepth: 'binding-observation',
    diagnosticProjection: 'type-projection',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.match(answer.outcome, /^(hit|miss|partial)$/u, answer.summary);
  return answer;
}

function assertTemplateRenameEdits(answer, label) {
  assert.equal(answer.outcome, 'hit', `${label}: expected hit.`);
  assert.equal(answer.value.status, 'available', `${label}: expected available rename propagation.`);
  assert.equal(answer.value.templateReferenceCount, 2, `${label}: expected two template references.`);
  assert.equal(answer.value.typeScriptReferenceCount, 0, `${label}: TS edits should be excluded.`);
  assert.equal(answer.value.edits.length, 2, `${label}: expected two template edit rows.`);
  assert.ok(answer.value.edits.every((edit) => edit.editKind === 'template-usage'), `${label}: expected only template-usage edits.`);
  expectEdit(answer.value.edits, 'src/app.html', firstTitleStart, firstTitleStart + 'title'.length, 'heading');
  expectEdit(answer.value.edits, 'src/app.html', secondTitleStart, secondTitleStart + 'title'.length, 'heading');
}

function cursorAtOffset(filePath, text, offset) {
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return {
    filePath,
    line: lines.length - 1,
    character: lines.at(-1).length,
    offset,
  };
}

function expectEdit(edits, filePath, start, end, newText) {
  const expectedPath = path.isAbsolute(filePath) ? filePath : path.join(fixtureRoot, filePath);
  const found = edits.find((edit) =>
    edit.source?.path != null
    && samePath(path.isAbsolute(edit.source.path) ? edit.source.path : path.join(fixtureRoot, edit.source.path), expectedPath)
    && edit.source?.start === start
    && edit.source?.end === end
    && edit.newText === newText
  );
  assert.ok(found, `Expected template edit ${filePath}@${start}..${end} -> ${newText}.`);
}

function samePath(left, right) {
  return path.resolve(left).replace(/\\/g, '/').toLowerCase()
    === path.resolve(right).replace(/\\/g, '/').toLowerCase();
}
