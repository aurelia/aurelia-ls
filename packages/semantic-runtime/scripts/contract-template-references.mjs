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
import { readFieldProvenance } from '../out/kernel/provenance.js';
import { ResourceProductDetails } from '../out/resources/product-details.js';

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
const mixedFormRoot = path.join(packageRoot, 'fixtures/pressure/mixed-form-surfaces');
const mixedFormTemplatePath = path.join(mixedFormRoot, 'src/components/loose-picklist.html');
const mixedFormTemplateText = fs.readFileSync(mixedFormTemplatePath, 'utf8');
const aliasedBindableRoot = path.join(packageRoot, 'fixtures/pressure/aliased-bindable-surfaces');
const aliasedBindableAppTemplatePath = path.join(aliasedBindableRoot, 'src/app.html');
const aliasedBindableProductTemplatePath = path.join(aliasedBindableRoot, 'src/product-card.html');
const aliasedBindableProductDefinitionPath = path.join(aliasedBindableRoot, 'src/product-card.ts');
const aliasedBindableDisplayHintDefinitionPath = path.join(aliasedBindableRoot, 'src/display-hint.ts');
const aliasedBindableAppTemplateText = fs.readFileSync(aliasedBindableAppTemplatePath, 'utf8');
const aliasedBindableProductTemplateText = fs.readFileSync(aliasedBindableProductTemplatePath, 'utf8');
const aliasedBindableProductDefinitionText = fs.readFileSync(aliasedBindableProductDefinitionPath, 'utf8');
const aliasedBindableDisplayHintDefinitionText = fs.readFileSync(aliasedBindableDisplayHintDefinitionPath, 'utf8');
const stateScopeRoot = path.join(packageRoot, 'fixtures/pressure/template-overlay-state-binding-scope');
const stateScopeTemplatePath = path.join(stateScopeRoot, 'src/app.html');
const stateScopeDefinitionPath = path.join(stateScopeRoot, 'src/app.ts');
const stateScopeTemplateText = fs.readFileSync(stateScopeTemplatePath, 'utf8');
const stateScopeDefinitionText = fs.readFileSync(stateScopeDefinitionPath, 'utf8');

const catalog = readSemanticAppQueryCatalog({ queryKind: SemanticAppQueryKind.TemplateReferences });
assert.equal(catalog.value.rows.length, 1, 'TemplateReferences should be in the public app-query catalog.');
assert.equal(catalog.value.rows[0].requiresCursor, true, 'TemplateReferences should require a source cursor.');
assert.equal(catalog.value.rows[0].supportsPaging, true, 'TemplateReferences should page row results.');
assert.equal(catalog.value.rows[0].minimumAnalysisDepth, 'binding-observation', 'TemplateReferences should require binding-observation facts.');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:template-references',
  projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
    readFile(fileName) {
      return samePath(fileName, templatePath) ? templateText : undefined;
    },
    fileExists(fileName) {
      return samePath(fileName, templatePath) ? true : undefined;
    },
  })),
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

const stateScopeRuntime = await createSemanticRuntime({
  workspaceRoot: stateScopeRoot,
  storeKey: 'contract:template-references:state-scope-isolation',
});
const rootTitleReferences = await stateScopeRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateReferences,
  sourceFilePath: stateScopeDefinitionPath,
  cursor: cursorInsideSource(
    stateScopeDefinitionText,
    stateScopeDefinitionPath,
    "readonly title = 'Host'",
    'title',
    1,
  ),
  includeDeclaration: true,
  detail: 'handles',
  page: { size: 20 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assert.match(rootTitleReferences.outcome, /^(hit|partial)$/u, rootTitleReferences.summary);
const rootTitleDeclarationStart = stateScopeDefinitionText.indexOf('title');
const stateOwnedTitleStart = stateScopeTemplateText.indexOf('title & state');
const parentTitleStart = stateScopeTemplateText.indexOf('$parent.title') + '$parent.'.length;
expectReference(
  rootTitleReferences.value.rows,
  'declaration',
  'src/app.ts',
  rootTitleDeclarationStart,
  rootTitleDeclarationStart + 'title'.length,
  stateScopeRoot,
);
expectReference(
  rootTitleReferences.value.rows,
  'template-usage',
  'src/app.html',
  parentTitleStart,
  parentTitleStart + 'title'.length,
  stateScopeRoot,
);
assert.ok(
  rootTitleReferences.value.rows.every((row) =>
    row.source?.path?.replace(/\\/g, '/') !== 'src/app.html'
    || row.source.start !== stateOwnedTitleStart
  ),
  'A state-owned title expression must not be reported as a reference to the root view-model member.',
);

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

const mixedFormRuntime = await createSemanticRuntime({
  workspaceRoot: mixedFormRoot,
  storeKey: 'contract:template-references:open-member-self-row',
});
const aliasedBindableRuntime = await createSemanticRuntime({
  workspaceRoot: aliasedBindableRoot,
  storeKey: 'contract:template-references:aliased-bindables',
});
const openMemberReferences = await mixedFormRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateReferences,
  sourceFilePath: mixedFormTemplatePath,
  cursor: cursorInsideSource(mixedFormTemplateText, mixedFormTemplatePath, '${option.label || option}', 'label', 1),
  includeDeclaration: true,
  detail: 'handles',
  page: { size: 20 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assert.match(openMemberReferences.outcome, /^(hit|partial)$/u, openMemberReferences.summary);
assert.equal(openMemberReferences.closure, 'open', 'Unproven member references should not claim complete coverage.');
assert.equal(openMemberReferences.value.selectedMemberName, 'label');
const optionLabelMarkerStart = mixedFormTemplateText.indexOf('${option.label || option}');
assert.notEqual(optionLabelMarkerStart, -1, 'Expected option.label marker in mixed-form template.');
const optionLabelStart = optionLabelMarkerStart + '${option.'.length;
assert.equal(openMemberReferences.value.rows.length, 1, 'Unproven member references should return only the cursor occurrence.');
const openMemberRow = openMemberReferences.value.rows[0];
assert.equal(openMemberRow.referenceKind, 'template-usage');
assert.equal(openMemberRow.source?.path?.replace(/\\/g, '/'), 'src/components/loose-picklist.html');
assert.equal(openMemberRow.source?.start, optionLabelStart);
assert.equal(openMemberRow.source?.end, optionLabelStart + 'label'.length);
assert.equal(openMemberRow.targetSource?.start, optionLabelStart);
assert.equal(openMemberRow.targetSource?.end, optionLabelStart + 'label'.length);
assert.equal(openMemberRow.handles?.targetSourceAddressHandle ?? null, null, 'Open self-row must not expose an unproven owner source as the target handle.');
assert.ok(openMemberReferences.value.candidateRows.length > 0, 'Same-name unproven candidates should stay outside returned rows.');
assert.ok(
  openMemberReferences.value.candidateRows.every((row) =>
    row.source?.path?.replace(/\\/g, '/') !== 'src/components/loose-picklist.html'
    || row.source.start !== optionLabelStart
  ),
  'The cursor occurrence should not also appear in candidateRows.',
);

const labelTextPropertyReferences = await aliasedBindableRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateReferences,
  sourceFilePath: aliasedBindableProductTemplatePath,
  cursor: cursorInsideSource(aliasedBindableProductTemplateText, aliasedBindableProductTemplatePath, '${labelText}', 'labelText', 1),
  includeDeclaration: true,
  detail: 'handles',
  page: { size: 20 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assert.match(labelTextPropertyReferences.outcome, /^(hit|partial)$/u, labelTextPropertyReferences.summary);
assert.equal(labelTextPropertyReferences.value.selectedMemberName, 'labelText');
const productLabelTextDeclarationStart = aliasedBindableProductDefinitionText.indexOf('labelText');
const productLabelTextTemplateStart = aliasedBindableProductTemplateText.indexOf('labelText');
const productDisplayLabelUsageStart = aliasedBindableAppTemplateText.indexOf('display-label.bind');
assert.notEqual(productLabelTextDeclarationStart, -1, 'Expected product labelText declaration.');
assert.notEqual(productLabelTextTemplateStart, -1, 'Expected product labelText template usage.');
assert.notEqual(productDisplayLabelUsageStart, -1, 'Expected product display-label usage.');
expectReference(labelTextPropertyReferences.value.rows, 'declaration', 'src/product-card.ts', productLabelTextDeclarationStart, productLabelTextDeclarationStart + 'labelText'.length, aliasedBindableRoot);
expectReference(labelTextPropertyReferences.value.rows, 'template-usage', 'src/product-card.html', productLabelTextTemplateStart, productLabelTextTemplateStart + 'labelText'.length, aliasedBindableRoot);
const productAliasPropertyReference = expectReference(
  labelTextPropertyReferences.value.rows,
  'bindable-attribute',
  'src/app.html',
  productDisplayLabelUsageStart,
  productDisplayLabelUsageStart + 'display-label'.length,
  aliasedBindableRoot,
);
assert.equal(productAliasPropertyReference.bindableAttributeSourceKind, 'explicit-alias');
assert.equal(productAliasPropertyReference.targetSource?.path?.replace(/\\/g, '/'), 'src/product-card.ts');
assert.equal(productAliasPropertyReference.targetSource?.start, productLabelTextDeclarationStart);
assert.equal(productAliasPropertyReference.targetSource?.end, productLabelTextDeclarationStart + 'labelText'.length);

const labelTextTypeScriptPropertyReferences = await aliasedBindableRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateReferences,
  sourceFilePath: aliasedBindableProductDefinitionPath,
  cursor: cursorInsideSource(aliasedBindableProductDefinitionText, aliasedBindableProductDefinitionPath, 'labelText =', 'labelText', 1),
  includeDeclaration: true,
  detail: 'handles',
  page: { size: 20 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assert.match(labelTextTypeScriptPropertyReferences.outcome, /^(hit|partial)$/u, labelTextTypeScriptPropertyReferences.summary);
assert.equal(labelTextTypeScriptPropertyReferences.value.selectedMemberName, 'labelText');
expectReference(labelTextTypeScriptPropertyReferences.value.rows, 'declaration', 'src/product-card.ts', productLabelTextDeclarationStart, productLabelTextDeclarationStart + 'labelText'.length, aliasedBindableRoot);
expectReference(labelTextTypeScriptPropertyReferences.value.rows, 'template-usage', 'src/product-card.html', productLabelTextTemplateStart, productLabelTextTemplateStart + 'labelText'.length, aliasedBindableRoot);
const productAliasTypeScriptReference = expectReference(
  labelTextTypeScriptPropertyReferences.value.rows,
  'bindable-attribute',
  'src/app.html',
  productDisplayLabelUsageStart,
  productDisplayLabelUsageStart + 'display-label'.length,
  aliasedBindableRoot,
);
assert.equal(productAliasTypeScriptReference.bindableAttributeSourceKind, 'explicit-alias');

const productAliasReferences = await aliasedBindableRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateReferences,
  sourceFilePath: aliasedBindableAppTemplatePath,
  cursor: cursorInsideSource(aliasedBindableAppTemplateText, aliasedBindableAppTemplatePath, 'display-label.bind="aliasLabel"', 'display-label', 1),
  includeDeclaration: true,
  detail: 'handles',
  page: { size: 20 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assert.match(productAliasReferences.outcome, /^(hit|partial)$/u, productAliasReferences.summary);
assert.equal(productAliasReferences.value.selectedMemberName, 'display-label');
const productAliasDeclarationStart = aliasedBindableProductDefinitionText.indexOf("'display-label'") + 1;
assert.notEqual(productAliasDeclarationStart, 0, 'Expected product display-label alias declaration.');
expectReference(productAliasReferences.value.rows, 'declaration', 'src/product-card.ts', productAliasDeclarationStart, productAliasDeclarationStart + 'display-label'.length, aliasedBindableRoot);
expectReference(productAliasReferences.value.rows, 'bindable-attribute', 'src/app.html', productDisplayLabelUsageStart, productDisplayLabelUsageStart + 'display-label'.length, aliasedBindableRoot);
assert.equal(productAliasReferences.value.rows.length, 2, 'Alias references should stay on the alias surface.');

const inlineAliasReferences = await aliasedBindableRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateReferences,
  sourceFilePath: aliasedBindableAppTemplatePath,
  cursor: cursorInsideSource(aliasedBindableAppTemplateText, aliasedBindableAppTemplatePath, 'display-hint="display-label.bind: aliasLabel', 'display-label', 1),
  includeDeclaration: true,
  detail: 'handles',
  page: { size: 20 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assert.match(inlineAliasReferences.outcome, /^(hit|partial)$/u, inlineAliasReferences.summary);
assert.equal(inlineAliasReferences.value.selectedMemberName, 'display-label');
const displayHintAliasDeclarationStart = aliasedBindableDisplayHintDefinitionText.indexOf("'display-label'") + 1;
const inlineDisplayLabelUsageStart = aliasedBindableAppTemplateText.indexOf('display-label.bind: aliasLabel');
assert.notEqual(displayHintAliasDeclarationStart, 0, 'Expected display-hint display-label alias declaration.');
assert.notEqual(inlineDisplayLabelUsageStart, -1, 'Expected inline display-label usage.');
expectReference(inlineAliasReferences.value.rows, 'declaration', 'src/display-hint.ts', displayHintAliasDeclarationStart, displayHintAliasDeclarationStart + 'display-label'.length, aliasedBindableRoot);
expectReference(inlineAliasReferences.value.rows, 'bindable-attribute', 'src/app.html', inlineDisplayLabelUsageStart, inlineDisplayLabelUsageStart + 'display-label'.length, aliasedBindableRoot);
assert.equal(inlineAliasReferences.value.rows.length, 2, 'Inline alias references should stay on the segment alias surface.');
expectBindableAliasFieldProvenance(aliasedBindableRuntime, 'product-card', 'labelText');
expectBindableAliasFieldProvenance(aliasedBindableRuntime, 'display-hint', 'labelText');

console.log(`Template references contract passed (${
  withDeclaration.value.rows.length
  + resourceReferences.value.rows.length
  + openMemberReferences.value.rows.length
  + labelTextPropertyReferences.value.rows.length
  + labelTextTypeScriptPropertyReferences.value.rows.length
  + productAliasReferences.value.rows.length
  + inlineAliasReferences.value.rows.length
} row(s)).`);

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

function expectReference(rows, referenceKind, filePath, start, end, root = fixtureRoot) {
  const expectedPath = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  const found = rows.find((row) =>
    row.referenceKind === referenceKind
    && row.source?.path != null
    && samePath(path.isAbsolute(row.source.path) ? row.source.path : path.join(root, row.source.path), expectedPath)
    && row.source?.start === start
    && row.source?.end === end
  );
  assert.ok(found, `Expected ${referenceKind} reference ${filePath}@${start}..${end}.`);
  return found;
}

function expectBindableAliasFieldProvenance(runtime, resourceName, bindableName) {
  const store = runtime.workspace.store;
  const definition = store.productDetails.readBySlot(ResourceProductDetails.Definition)
    .map((entry) => entry.detail)
    .find((candidate) => candidate.name === resourceName);
  assert.ok(definition, `Expected resource definition detail for ${resourceName}.`);
  const bindable = definition.bindables.find((candidate) => candidate.name === bindableName);
  assert.ok(bindable, `Expected bindable ${bindableName} on ${resourceName}.`);
  assert.ok(bindable.attributeSourceAddressHandle, `Expected explicit alias source for ${resourceName}.${bindableName}.`);
  const provenanceHandle = readFieldProvenance(bindable.fieldProvenance, 'attribute');
  assert.ok(provenanceHandle, `Expected attribute field provenance for ${resourceName}.${bindableName}.`);
  const provenance = store.readProvenance(provenanceHandle);
  assert.ok(provenance, `Expected provenance record ${provenanceHandle}.`);
  assert.equal(provenance.evidenceHandles.length, 1, `Expected one direct evidence handle for ${resourceName}.${bindableName} alias.`);
  const evidence = store.readEvidence(provenance.evidenceHandles[0]);
  assert.ok(evidence, `Expected evidence record ${provenance.evidenceHandles[0]}.`);
  assert.equal(
    evidence.addressHandle,
    bindable.attributeSourceAddressHandle,
    `Expected alias field provenance evidence to point at ${resourceName}.${bindableName} attribute source.`,
  );
}

function samePath(left, right) {
  return path.resolve(left).replace(/\\/g, '/').toLowerCase()
    === path.resolve(right).replace(/\\/g, '/').toLowerCase();
}
