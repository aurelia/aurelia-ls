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

const catalog = readSemanticAppQueryCatalog({ queryKind: SemanticAppQueryKind.TemplateRename });
assert.equal(catalog.value.rows.length, 1, 'TemplateRename should be in the public app-query catalog.');
assert.equal(catalog.value.rows[0].requiresCursor, true, 'TemplateRename should require a source cursor.');
assert.equal(catalog.value.rows[0].minimumAnalysisDepth, 'binding-observation', 'TemplateRename should require binding-observation facts.');
assert.equal(catalog.value.rows[0].materializationPolicy, 'query-type-projection', 'TemplateRename should expose TypeChecker projection cost.');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:template-rename',
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

const prepare = await askRename(null);
assert.equal(prepare.outcome, 'hit');
assert.equal(prepare.value.status, 'available');
assert.equal(prepare.value.placeholder, 'title');
assert.equal(prepare.value.activeSource?.path?.replace(/\\/g, '/'), 'src/app.html');
assert.equal(prepare.value.activeSource?.start, firstTitleStart);
assert.equal(prepare.value.edits.length, 0, 'Prepare rename should not invent edits before a new name is supplied.');

const invalid = await askRename('not-valid-name');
assert.equal(invalid.outcome, 'miss');
assert.equal(invalid.value.status, 'invalid-name');
assert.equal(invalid.value.reason, 'invalid-new-name');

const rename = await askRename('heading');
assert.equal(rename.outcome, 'hit');
assert.equal(rename.value.status, 'available');
assert.equal(rename.value.templateReferenceCount, 2);
assert.equal(rename.value.typeScriptReferenceCount, 2);
expectEdit(rename.value.edits, 'template-usage', 'src/app.html', firstTitleStart, firstTitleStart + 'title'.length, 'heading');
expectEdit(rename.value.edits, 'template-usage', 'src/app.html', secondTitleStart, secondTitleStart + 'title'.length, 'heading');
expectEdit(rename.value.edits, 'typescript-reference', 'src/app.ts', declarationStart, declarationStart + 'title'.length, 'heading');
expectEdit(rename.value.edits, 'typescript-reference', 'src/app.ts', tsUsageStart, tsUsageStart + 'title'.length, 'heading');

console.log(`Template rename contract passed (${rename.value.edits.length} edit row(s)).`);

async function askRename(newName) {
  const answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateRename,
    sourceFilePath: templatePath,
    cursor: cursorInside('${title}', 'title', 1),
    ...(newName == null ? {} : { newName }),
    analysisDepth: 'binding-observation',
    diagnosticProjection: 'type-projection',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.match(answer.outcome, /^(hit|miss|partial)$/u, answer.summary);
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
    character: lines.at(-1).length,
    offset,
  };
}

function expectEdit(edits, editKind, filePath, start, end, newText) {
  const expectedPath = path.isAbsolute(filePath) ? filePath : path.join(fixtureRoot, filePath);
  const found = edits.find((edit) =>
    edit.editKind === editKind
    && edit.source?.path != null
    && samePath(path.isAbsolute(edit.source.path) ? edit.source.path : path.join(fixtureRoot, edit.source.path), expectedPath)
    && edit.source?.start === start
    && edit.source?.end === end
    && edit.newText === newText
  );
  assert.ok(found, `Expected ${editKind} edit ${filePath}@${start}..${end} -> ${newText}.`);
}

function samePath(left, right) {
  return path.resolve(left).replace(/\\/g, '/').toLowerCase()
    === path.resolve(right).replace(/\\/g, '/').toLowerCase();
}
