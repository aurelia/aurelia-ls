import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  registrationResourceKindFor,
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
const resourceFixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-routed-catalog-storefront');
const resourceTemplatePath = path.join(resourceFixtureRoot, 'src/routes/item-list-route.html');
const resourceDefinitionPath = path.join(resourceFixtureRoot, 'src/components/item-card.ts');
const resourceTemplateText = fs.readFileSync(resourceTemplatePath, 'utf8');
const resourceDefinitionText = fs.readFileSync(resourceDefinitionPath, 'utf8');
const conventionResourceFixtureRoot = path.join(packageRoot, 'fixtures/pressure/resource-conventions-enabled');
const conventionResourceTemplatePath = path.join(conventionResourceFixtureRoot, 'src/conventions-enabled-app.html');
const conventionResourceTemplateText = fs.readFileSync(conventionResourceTemplatePath, 'utf8');
const attributeFixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-compiler-errors');
const attributeTemplatePath = path.join(attributeFixtureRoot, 'src/template-compiler-errors-app.html');
const attributeDefinitionPath = path.join(attributeFixtureRoot, 'src/template-compiler-errors-app.ts');
const attributeTemplateText = fs.readFileSync(attributeTemplatePath, 'utf8');
const attributeDefinitionText = fs.readFileSync(attributeDefinitionPath, 'utf8');
const templateControllerFixtureRoot = path.join(packageRoot, 'fixtures/pressure/runtime-html-view-factory-provider-errors');
const templateControllerTemplatePath = path.join(templateControllerFixtureRoot, 'src/runtime-html-view-factory-provider-errors-app.html');
const templateControllerDefinitionPath = path.join(templateControllerFixtureRoot, 'src/runtime-html-view-factory-provider-errors-app.ts');
const templateControllerTemplateText = fs.readFileSync(templateControllerTemplatePath, 'utf8');
const templateControllerDefinitionText = fs.readFileSync(templateControllerDefinitionPath, 'utf8');
const templateControllerDecoratorDefinitionText = templateControllerDefinitionText
  .replace(/customAttribute,\r?\n  IViewFactory,/u, 'customAttribute,\n  IViewFactory,\n  templateController,')
  .replace(
    /@customAttribute\(\{\r?\n  name: 'view-factory-template',\r?\n  isTemplateController: true,\r?\n\}\)/u,
    "@templateController({\n  name: 'view-factory-template',\n})",
  );
const aliasedBindableRoot = path.join(packageRoot, 'fixtures/pressure/aliased-bindable-surfaces');
const aliasedBindableAppTemplatePath = path.join(aliasedBindableRoot, 'src/app.html');
const aliasedBindableProductTemplatePath = path.join(aliasedBindableRoot, 'src/product-card.html');
const aliasedBindableProductDefinitionPath = path.join(aliasedBindableRoot, 'src/product-card.ts');
const aliasedBindableDisplayHintDefinitionPath = path.join(aliasedBindableRoot, 'src/display-hint.ts');
const aliasedBindableAppTemplateText = fs.readFileSync(aliasedBindableAppTemplatePath, 'utf8');
const aliasedBindableProductTemplateText = fs.readFileSync(aliasedBindableProductTemplatePath, 'utf8');
const aliasedBindableProductDefinitionText = fs.readFileSync(aliasedBindableProductDefinitionPath, 'utf8');
const aliasedBindableDisplayHintDefinitionText = fs.readFileSync(aliasedBindableDisplayHintDefinitionPath, 'utf8');

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

const resourceRuntime = await createSemanticRuntime({
  workspaceRoot: resourceFixtureRoot,
  storeKey: 'contract:template-resource-rename',
});
const conventionResourceRuntime = await createSemanticRuntime({
  workspaceRoot: conventionResourceFixtureRoot,
  storeKey: 'contract:template-resource-rename-convention-blocker',
});
const attributeRuntime = await createSemanticRuntime({
  workspaceRoot: attributeFixtureRoot,
  storeKey: 'contract:template-attribute-resource-rename',
});
const templateControllerRuntime = await createSemanticRuntime({
  workspaceRoot: templateControllerFixtureRoot,
  storeKey: 'contract:template-controller-resource-rename',
});
const templateControllerDecoratorRuntime = await createSemanticRuntime({
  workspaceRoot: templateControllerFixtureRoot,
  storeKey: 'contract:template-controller-resource-rename-decorator-equivalence',
  sourceTextProvider: {
    readFile(fileName) {
      return samePath(fileName, templateControllerDefinitionPath) ? templateControllerDecoratorDefinitionText : undefined;
    },
    fileExists() {
      return undefined;
    },
  },
});
const aliasedBindableRuntime = await createSemanticRuntime({
  workspaceRoot: aliasedBindableRoot,
  storeKey: 'contract:template-rename:aliased-bindables',
});

const resourceDeclarationMarker = "name: 'item-card'";
const resourceDeclarationMarkerStart = resourceDefinitionText.indexOf(resourceDeclarationMarker);
const resourceDeclarationStart = resourceDefinitionText.indexOf('item-card', resourceDeclarationMarkerStart);
const resourceOpenTagStart = resourceTemplateText.indexOf('<item-card') + 1;
const resourceCloseTagStart = resourceTemplateText.indexOf('</item-card') + 2;
assert.notEqual(resourceDeclarationMarkerStart, -1, 'Expected item-card resource name marker.');
assert.notEqual(resourceDeclarationStart, -1, 'Expected item-card resource name declaration.');
assert.notEqual(resourceOpenTagStart, 0, 'Expected opening item-card tag.');
assert.notEqual(resourceCloseTagStart, 1, 'Expected closing item-card tag.');

const resourcePrepare = await askResourceRename(null);
assert.equal(resourcePrepare.outcome, 'hit');
assert.equal(resourcePrepare.value.status, 'available');
assert.equal(resourcePrepare.value.placeholder, 'item-card');
assert.equal(resourcePrepare.value.activeSource?.path?.replace(/\\/g, '/'), 'src/routes/item-list-route.html');
assert.equal(resourcePrepare.value.activeSource?.start, resourceOpenTagStart);

const resourceRename = await askResourceRename('product-card');
assert.equal(resourceRename.outcome, 'hit');
assert.equal(resourceRename.value.status, 'available');
assert.equal(resourceRename.value.typeScriptReferenceCount, 0);
assert.equal(resourceRename.value.templateReferenceCount, 2);
expectEdit(resourceRename.value.edits, 'resource-name-declaration', 'src/components/item-card.ts', resourceDeclarationStart, resourceDeclarationStart + 'item-card'.length, 'product-card', resourceFixtureRoot);
expectEdit(resourceRename.value.edits, 'resource-element-tag', 'src/routes/item-list-route.html', resourceOpenTagStart, resourceOpenTagStart + 'item-card'.length, 'product-card', resourceFixtureRoot);
expectEdit(resourceRename.value.edits, 'resource-element-tag', 'src/routes/item-list-route.html', resourceCloseTagStart, resourceCloseTagStart + 'item-card'.length, 'product-card', resourceFixtureRoot);

const uppercaseResourceRename = await askResourceRename('ItemCard');
assert.equal(uppercaseResourceRename.outcome, 'miss');
assert.equal(uppercaseResourceRename.value.status, 'invalid-name');
assert.equal(uppercaseResourceRename.value.reason, 'invalid-new-name');
assert.match(uppercaseResourceRename.value.displayText, /lowercased HTML/u);
assert.equal(uppercaseResourceRename.value.edits.length, 0);

const conventionResourcePrepare = await askConventionResourceRename(null);
assert.equal(conventionResourcePrepare.outcome, 'miss');
assert.equal(conventionResourcePrepare.value.status, 'not-available');
assert.equal(conventionResourcePrepare.value.reason, 'resource-name-has-no-authored-source');
assert.equal(conventionResourcePrepare.value.edits.length, 0);

const attributeDeclarationStart = attributeDefinitionText.indexOf('template-probe');
const attributeUsageStart = attributeTemplateText.indexOf('template-probe=');
assert.notEqual(attributeDeclarationStart, -1, 'Expected template-probe custom-attribute declaration.');
assert.notEqual(attributeUsageStart, -1, 'Expected template-probe custom-attribute usage.');

const attributePrepare = await askAttributeResourceRename(null);
assert.equal(attributePrepare.outcome, 'hit');
assert.equal(attributePrepare.value.status, 'available');
assert.equal(attributePrepare.value.placeholder, 'template-probe');
assert.equal(attributePrepare.value.activeSource?.start, attributeUsageStart);

const attributeRename = await askAttributeResourceRename('template-marker');
assert.equal(attributeRename.outcome, 'hit');
assert.equal(attributeRename.value.status, 'available');
assert.equal(attributeRename.value.typeScriptReferenceCount, 0);
assert.equal(attributeRename.value.templateReferenceCount, 1);
expectEdit(attributeRename.value.edits, 'resource-name-declaration', 'src/template-compiler-errors-app.ts', attributeDeclarationStart, attributeDeclarationStart + 'template-probe'.length, 'template-marker', attributeFixtureRoot);
expectEdit(attributeRename.value.edits, 'resource-attribute-target', 'src/template-compiler-errors-app.html', attributeUsageStart, attributeUsageStart + 'template-probe'.length, 'template-marker', attributeFixtureRoot);

const uppercaseAttributeRename = await askAttributeResourceRename('TemplateMarker');
assert.equal(uppercaseAttributeRename.outcome, 'miss');
assert.equal(uppercaseAttributeRename.value.status, 'invalid-name');
assert.equal(uppercaseAttributeRename.value.reason, 'invalid-new-name');
assert.match(uppercaseAttributeRename.value.displayText, /lowercased HTML/u);
assert.equal(uppercaseAttributeRename.value.edits.length, 0);

const templateControllerDeclarationStart = templateControllerDefinitionText.indexOf('view-factory-template');
const templateControllerUsageStart = templateControllerTemplateText.indexOf('view-factory-template');
assert.notEqual(templateControllerDeclarationStart, -1, 'Expected view-factory-template template-controller declaration.');
assert.notEqual(templateControllerUsageStart, -1, 'Expected view-factory-template template-controller usage.');

const templateControllerDefinition = await readTemplateControllerDefinition(
  templateControllerRuntime,
  templateControllerDefinitionText,
  'customAttribute+isTemplateController form',
);
const templateControllerDecoratorDefinition = await readTemplateControllerDefinition(
  templateControllerDecoratorRuntime,
  templateControllerDecoratorDefinitionText,
  'templateController decorator form',
);
assert.equal(templateControllerDefinition.resourceKind, 'template-controller');
assert.equal(templateControllerDecoratorDefinition.resourceKind, 'template-controller');
assert.equal(registrationResourceKindFor(templateControllerDefinition.resourceKind), 'custom-attribute');
assert.equal(registrationResourceKindFor(templateControllerDecoratorDefinition.resourceKind), 'custom-attribute');
assert.equal(templateControllerDefinition.key, 'au:resource:custom-attribute:view-factory-template');
assert.equal(templateControllerDecoratorDefinition.key, 'au:resource:custom-attribute:view-factory-template');

const templateControllerPrepare = await askTemplateControllerResourceRename(templateControllerRuntime, null);
assert.equal(templateControllerPrepare.outcome, 'hit');
assert.equal(templateControllerPrepare.value.status, 'available');
assert.equal(templateControllerPrepare.value.placeholder, 'view-factory-template');
assert.equal(templateControllerPrepare.value.activeSource?.start, templateControllerUsageStart);

const templateControllerRename = await askTemplateControllerResourceRename(templateControllerRuntime, 'view-factory-panel');
assert.equal(templateControllerRename.outcome, 'hit');
assert.equal(templateControllerRename.value.status, 'available');
assert.equal(templateControllerRename.value.typeScriptReferenceCount, 0);
assert.equal(templateControllerRename.value.templateReferenceCount, 1);
expectEdit(templateControllerRename.value.edits, 'resource-name-declaration', 'src/runtime-html-view-factory-provider-errors-app.ts', templateControllerDeclarationStart, templateControllerDeclarationStart + 'view-factory-template'.length, 'view-factory-panel', templateControllerFixtureRoot);
expectEdit(templateControllerRename.value.edits, 'resource-attribute-target', 'src/runtime-html-view-factory-provider-errors-app.html', templateControllerUsageStart, templateControllerUsageStart + 'view-factory-template'.length, 'view-factory-panel', templateControllerFixtureRoot);

const productLabelTextDeclarationStart = aliasedBindableProductDefinitionText.indexOf('labelText');
const productLabelTextTemplateStart = aliasedBindableProductTemplateText.indexOf('labelText');
const productAliasDeclarationStart = aliasedBindableProductDefinitionText.indexOf("'display-label'") + 1;
const productAliasUsageStart = aliasedBindableAppTemplateText.indexOf('display-label.bind');
const displayHintAliasDeclarationStart = aliasedBindableDisplayHintDefinitionText.indexOf("'display-label'") + 1;
const inlineAliasUsageStart = aliasedBindableAppTemplateText.indexOf('display-label.bind: aliasLabel');
assert.notEqual(productLabelTextDeclarationStart, -1, 'Expected product labelText declaration.');
assert.notEqual(productLabelTextTemplateStart, -1, 'Expected product labelText template usage.');
assert.notEqual(productAliasDeclarationStart, 0, 'Expected product display-label alias declaration.');
assert.notEqual(productAliasUsageStart, -1, 'Expected product display-label usage.');
assert.notEqual(displayHintAliasDeclarationStart, 0, 'Expected display-hint display-label alias declaration.');
assert.notEqual(inlineAliasUsageStart, -1, 'Expected inline display-label usage.');

const aliasedPropertyRename = await askAliasedBindableRename(
  aliasedBindableProductTemplatePath,
  aliasedBindableProductTemplateText,
  '${labelText}',
  'labelText',
  'headlineText',
);
assert.equal(aliasedPropertyRename.outcome, 'hit');
assert.equal(aliasedPropertyRename.value.status, 'available');
expectEdit(aliasedPropertyRename.value.edits, 'typescript-reference', 'src/product-card.ts', productLabelTextDeclarationStart, productLabelTextDeclarationStart + 'labelText'.length, 'headlineText', aliasedBindableRoot);
expectEdit(aliasedPropertyRename.value.edits, 'template-usage', 'src/product-card.html', productLabelTextTemplateStart, productLabelTextTemplateStart + 'labelText'.length, 'headlineText', aliasedBindableRoot);
assert.equal(
  aliasedPropertyRename.value.edits.some((edit) =>
    edit.source?.path?.replace(/\\/g, '/') === 'src/app.html'
    && edit.oldText === 'display-label'
  ),
  false,
  'Property rename should not edit explicitly authored bindable aliases.',
);

const productAliasRename = await askAliasedBindableRename(
  aliasedBindableAppTemplatePath,
  aliasedBindableAppTemplateText,
  'display-label.bind="aliasLabel"',
  'display-label',
  'headline-label',
);
assert.equal(productAliasRename.outcome, 'hit');
assert.equal(productAliasRename.value.status, 'available');
assert.equal(productAliasRename.value.typeScriptReferenceCount, 0);
expectEdit(productAliasRename.value.edits, 'bindable-attribute-alias-declaration', 'src/product-card.ts', productAliasDeclarationStart, productAliasDeclarationStart + 'display-label'.length, 'headline-label', aliasedBindableRoot);
expectEdit(productAliasRename.value.edits, 'bindable-attribute', 'src/app.html', productAliasUsageStart, productAliasUsageStart + 'display-label'.length, 'headline-label', aliasedBindableRoot);
assert.equal(productAliasRename.value.edits.length, 2, 'Top-level alias rename should edit only the alias declaration and matching usage.');

const inlineAliasRename = await askAliasedBindableRename(
  aliasedBindableAppTemplatePath,
  aliasedBindableAppTemplateText,
  'display-hint="display-label.bind: aliasLabel',
  'display-label',
  'hint-label',
);
assert.equal(inlineAliasRename.outcome, 'hit');
assert.equal(inlineAliasRename.value.status, 'available');
assert.equal(inlineAliasRename.value.typeScriptReferenceCount, 0);
expectEdit(inlineAliasRename.value.edits, 'bindable-attribute-alias-declaration', 'src/display-hint.ts', displayHintAliasDeclarationStart, displayHintAliasDeclarationStart + 'display-label'.length, 'hint-label', aliasedBindableRoot);
expectEdit(inlineAliasRename.value.edits, 'bindable-attribute', 'src/app.html', inlineAliasUsageStart, inlineAliasUsageStart + 'display-label'.length, 'hint-label', aliasedBindableRoot);
assert.equal(inlineAliasRename.value.edits.length, 2, 'Inline alias rename should edit only the alias declaration and matching segment target.');

console.log(`Template rename contract passed (${
  rename.value.edits.length
  + resourceRename.value.edits.length
  + attributeRename.value.edits.length
  + templateControllerRename.value.edits.length
  + aliasedPropertyRename.value.edits.length
  + productAliasRename.value.edits.length
  + inlineAliasRename.value.edits.length
} edit row(s)).`);

async function askRename(newName) {
  const answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateRename,
    sourceFilePath: templatePath,
    cursor: cursorInside(templateText, templatePath, '${title}', 'title', 1),
    ...(newName == null ? {} : { newName }),
    analysisDepth: 'binding-observation',
    diagnosticProjection: 'type-projection',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.match(answer.outcome, /^(hit|miss|partial)$/u, answer.summary);
  return answer;
}

async function askResourceRename(newName) {
  const answer = await resourceRuntime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateRename,
    sourceFilePath: resourceTemplatePath,
    cursor: cursorInside(resourceTemplateText, resourceTemplatePath, '<item-card item.bind="item">', 'item-card', 1),
    ...(newName == null ? {} : { newName }),
    analysisDepth: 'binding-observation',
    diagnosticProjection: 'type-projection',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.match(answer.outcome, /^(hit|miss|partial)$/u, answer.summary);
  return answer;
}

async function askConventionResourceRename(newName) {
  const answer = await conventionResourceRuntime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateRename,
    sourceFilePath: conventionResourceTemplatePath,
    cursor: cursorInside(
      conventionResourceTemplateText,
      conventionResourceTemplatePath,
      '<convention-card>',
      'convention-card',
      1,
    ),
    ...(newName == null ? {} : { newName }),
    analysisDepth: 'binding-observation',
    diagnosticProjection: 'type-projection',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.match(answer.outcome, /^(hit|miss|partial)$/u, answer.summary);
  return answer;
}

async function askAttributeResourceRename(newName) {
  const answer = await attributeRuntime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateRename,
    sourceFilePath: attributeTemplatePath,
    cursor: cursorInside(attributeTemplateText, attributeTemplatePath, 'template-probe="value.bind: enabled; missing.bind: enabled"', 'template-probe', 1),
    ...(newName == null ? {} : { newName }),
    analysisDepth: 'binding-observation',
    diagnosticProjection: 'type-projection',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.match(answer.outcome, /^(hit|miss|partial)$/u, answer.summary);
  return answer;
}

async function askTemplateControllerResourceRename(runtime, newName) {
  const answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateRename,
    sourceFilePath: templateControllerTemplatePath,
    cursor: cursorInside(templateControllerTemplateText, templateControllerTemplatePath, '<div view-factory-template>', 'view-factory-template', 1),
    ...(newName == null ? {} : { newName }),
    analysisDepth: 'binding-observation',
    diagnosticProjection: 'type-projection',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.match(answer.outcome, /^(hit|miss|partial)$/u, answer.summary);
  return answer;
}

async function askAliasedBindableRename(filePath, text, marker, needle, newName) {
  const answer = await aliasedBindableRuntime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateRename,
    sourceFilePath: filePath,
    cursor: cursorInside(text, filePath, marker, needle, 1),
    ...(newName == null ? {} : { newName }),
    analysisDepth: 'binding-observation',
    diagnosticProjection: 'type-projection',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  });
  assert.match(answer.outcome, /^(hit|miss|partial)$/u, answer.summary);
  return answer;
}

async function readTemplateControllerDefinition(runtime, sourceText, label) {
  const answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.ResourceDefinitions,
    detail: 'full',
    page: { size: 100 },
    appRetention: 'retain-app',
  });
  assert.match(answer.outcome, /^(hit|partial)$/u, answer.summary);
  const row = answer.value.rows.find((candidate) => candidate.name === 'view-factory-template');
  assert.ok(row, `Expected view-factory-template definition row for ${label}.`);
  const expectedNameStart = sourceText.indexOf("'view-factory-template'") + 1;
  assert.notEqual(expectedNameStart, 0, `Expected view-factory-template name literal in ${label}.`);
  assert.equal(row.nameSource?.path?.replace(/\\/g, '/'), 'src/runtime-html-view-factory-provider-errors-app.ts');
  assert.equal(row.nameSource?.start, expectedNameStart);
  assert.equal(row.nameSource?.end, expectedNameStart + 'view-factory-template'.length);
  return row;
}

function cursorInside(text, filePath, marker, needle, delta = 0) {
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
    character: lines.at(-1).length,
    offset,
  };
}

function expectEdit(edits, editKind, filePath, start, end, newText, root = fixtureRoot) {
  const expectedPath = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  const found = edits.find((edit) =>
    edit.editKind === editKind
    && edit.source?.path != null
    && samePath(path.isAbsolute(edit.source.path) ? edit.source.path : path.join(root, edit.source.path), expectedPath)
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
