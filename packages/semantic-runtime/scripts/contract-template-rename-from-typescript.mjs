import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  NodeSemanticRuntimeProjectInputHost,
  readSemanticAppQueryCatalog,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
const templatePath = path.join(fixtureRoot, 'src/app.html');
const viewModelPath = path.join(fixtureRoot, 'src/app.ts');
const originalTemplateText = fs.readFileSync(templatePath, 'utf8');
const viewModelText = fs.readFileSync(viewModelPath, 'utf8');
const templateText = originalTemplateText.replace('${}', '${title} ${title}');
const aliasedBindableRoot = path.join(packageRoot, 'fixtures/pressure/aliased-bindable-surfaces');
const aliasedBindableAppTemplatePath = path.join(aliasedBindableRoot, 'src/app.html');
const aliasedBindableProductTemplatePath = path.join(aliasedBindableRoot, 'src/product-card.html');
const aliasedBindableProductDefinitionPath = path.join(aliasedBindableRoot, 'src/product-card.ts');
const aliasedBindableAppTemplateText = fs.readFileSync(aliasedBindableAppTemplatePath, 'utf8');
const aliasedBindableProductTemplateText = fs.readFileSync(aliasedBindableProductTemplatePath, 'utf8');
const aliasedBindableProductDefinitionText = fs.readFileSync(aliasedBindableProductDefinitionPath, 'utf8');

const catalog = readSemanticAppQueryCatalog({ queryKind: SemanticAppQueryKind.TemplateRenameFromTypeScript });
assert.equal(catalog.value.rows.length, 1, 'TemplateRenameFromTypeScript should be in the public app-query catalog.');
assert.equal(catalog.value.rows[0].requiresCursor, true, 'TemplateRenameFromTypeScript should require a source cursor.');
assert.equal(catalog.value.rows[0].minimumAnalysisDepth, 'binding-observation', 'TemplateRenameFromTypeScript should require binding-observation facts.');
assert.equal(catalog.value.rows[0].materializationPolicy, 'query-type-projection', 'TemplateRenameFromTypeScript should expose TypeChecker projection cost.');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:template-rename-from-typescript',
  projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
    readFile(fileName) {
      return samePath(fileName, templatePath) ? templateText : undefined;
    },
    fileExists(fileName) {
      return samePath(fileName, templatePath) ? true : undefined;
    },
  })),
});
const aliasedBindableRuntime = await createSemanticRuntime({
  workspaceRoot: aliasedBindableRoot,
  storeKey: 'contract:template-rename-from-typescript:aliased-bindables',
});

const firstTitleStart = templateText.indexOf('title');
const secondTitleStart = templateText.indexOf('title', firstTitleStart + 'title'.length);
const declarationStart = viewModelText.indexOf('title');
const tsUsageStart = viewModelText.indexOf('title', declarationStart + 'title'.length);

const prepare = await askRenameFromTypeScript(null, declarationStart + 1);
assert.equal(prepare.result, 'answered');
assert.equal(prepare.selection, 'exact');
assert.equal(prepare.coverage, 'complete');
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
assert.equal(invalid.result, 'answered');
assert.equal(invalid.selection, 'exact');
assert.equal(invalid.value.status, 'invalid-name');
assert.equal(invalid.value.reason, 'invalid-new-name');

const fromDeclaration = await askRenameFromTypeScript('heading', declarationStart + 1);
assertTemplateRenameEdits(fromDeclaration, 'declaration cursor');

const fromTsUsage = await askRenameFromTypeScript('heading', tsUsageStart + 1);
assertTemplateRenameEdits(fromTsUsage, 'TS usage cursor');

const titleDeclarationStart = aliasedBindableProductDefinitionText.indexOf('title');
const titleTemplateStart = aliasedBindableProductTemplateText.indexOf('title');
const titleAttributeStart = aliasedBindableAppTemplateText.indexOf('title.bind');
const labelTextDeclarationStart = aliasedBindableProductDefinitionText.indexOf('labelText');
const labelTextTemplateStart = aliasedBindableProductTemplateText.indexOf('labelText');
const displayLabelAttributeStart = aliasedBindableAppTemplateText.indexOf('display-label.bind');
assert.notEqual(titleDeclarationStart, -1, 'Expected title declaration.');
assert.notEqual(titleTemplateStart, -1, 'Expected title template usage.');
assert.notEqual(titleAttributeStart, -1, 'Expected default-derived title attribute usage.');
assert.notEqual(labelTextDeclarationStart, -1, 'Expected labelText declaration.');
assert.notEqual(labelTextTemplateStart, -1, 'Expected labelText template usage.');
assert.notEqual(displayLabelAttributeStart, -1, 'Expected explicit display-label alias usage.');

const defaultBindablePropagation = await askAliasedBindableRenameFromTypeScript('headline', titleDeclarationStart + 1);
assert.equal(defaultBindablePropagation.result, 'answered');
assert.equal(defaultBindablePropagation.selection, 'exact');
assert.equal(defaultBindablePropagation.coverage, 'complete');
assert.equal(defaultBindablePropagation.value.status, 'available');
assert.equal(defaultBindablePropagation.value.templateReferenceCount, 2);
assert.equal(defaultBindablePropagation.value.edits.length, 2);
expectAliasedEdit(defaultBindablePropagation.value.edits, 'src/app.html', titleAttributeStart, titleAttributeStart + 'title'.length, 'headline');
expectAliasedEdit(defaultBindablePropagation.value.edits, 'src/product-card.html', titleTemplateStart, titleTemplateStart + 'title'.length, 'headline');

const explicitAliasPropagation = await askAliasedBindableRenameFromTypeScript('headlineText', labelTextDeclarationStart + 1);
assert.equal(explicitAliasPropagation.result, 'answered');
assert.equal(explicitAliasPropagation.selection, 'exact');
assert.equal(explicitAliasPropagation.coverage, 'complete');
assert.equal(explicitAliasPropagation.value.status, 'available');
assert.equal(explicitAliasPropagation.value.templateReferenceCount, 2);
assert.equal(explicitAliasPropagation.value.edits.length, 1, 'TS-origin property rename should not rewrite explicit bindable aliases.');
expectAliasedEdit(explicitAliasPropagation.value.edits, 'src/product-card.html', labelTextTemplateStart, labelTextTemplateStart + 'labelText'.length, 'headlineText');
assert.equal(
  explicitAliasPropagation.value.edits.some((edit) =>
    edit.source?.path?.replace(/\\/g, '/') === 'src/app.html'
    && edit.oldText === 'display-label'
  ),
  false,
  'TS-origin property rename must not edit explicit alias spelling.',
);

console.log(`Template rename-from-TypeScript contract passed (${
  fromDeclaration.value.edits.length
  + defaultBindablePropagation.value.edits.length
  + explicitAliasPropagation.value.edits.length
} template edit row(s)).`);

async function askRenameFromTypeScript(newName, offset) {
  const answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateRenameFromTypeScript,
    sourceFilePath: viewModelPath,
    cursor: cursorAtOffset(viewModelPath, viewModelText, offset),
    ...(newName == null ? {} : { newName }),
    analysisDepth: 'binding-observation',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.equal(answer.result, 'answered', answer.summary);
  return answer;
}

async function askAliasedBindableRenameFromTypeScript(newName, offset) {
  const answer = await aliasedBindableRuntime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateRenameFromTypeScript,
    sourceFilePath: aliasedBindableProductDefinitionPath,
    cursor: cursorAtOffset(aliasedBindableProductDefinitionPath, aliasedBindableProductDefinitionText, offset),
    ...(newName == null ? {} : { newName }),
    analysisDepth: 'binding-observation',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.equal(answer.result, 'answered', answer.summary);
  return answer;
}

function assertTemplateRenameEdits(answer, label) {
  assert.equal(answer.result, 'answered', `${label}: expected an answered query.`);
  assert.equal(answer.selection, 'exact', `${label}: expected exact TypeScript symbol selection.`);
  assert.equal(answer.coverage, 'complete', `${label}: expected complete template propagation coverage.`);
  assert.equal(answer.value.status, 'available', `${label}: expected available rename propagation.`);
  assert.equal(answer.value.templateReferenceCount, 2, `${label}: expected two template references.`);
  assert.equal(answer.value.typeScriptReferenceCount, 0, `${label}: TS edits should be excluded.`);
  assert.equal(answer.value.edits.length, 2, `${label}: expected two template edit rows.`);
  assert.ok(answer.value.edits.every((edit) => edit.editKind === 'template-usage'), `${label}: expected only template-usage edits.`);
  expectEdit(answer.value.edits, 'src/app.html', firstTitleStart, firstTitleStart + 'title'.length, 'heading');
  expectEdit(answer.value.edits, 'src/app.html', secondTitleStart, secondTitleStart + 'title'.length, 'heading');
}

function expectAliasedEdit(edits, filePath, start, end, newText) {
  const expectedPath = path.isAbsolute(filePath) ? filePath : path.join(aliasedBindableRoot, filePath);
  const found = edits.find((edit) =>
    edit.source?.path != null
    && samePath(path.isAbsolute(edit.source.path) ? edit.source.path : path.join(aliasedBindableRoot, edit.source.path), expectedPath)
    && edit.source?.start === start
    && edit.source?.end === end
    && edit.newText === newText
  );
  assert.ok(found, `Expected aliased-bindable template edit ${filePath}@${start}..${end} -> ${newText}.`);
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
