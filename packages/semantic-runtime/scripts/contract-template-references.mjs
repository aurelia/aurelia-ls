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
const mixedFormModelPath = path.join(mixedFormRoot, 'src/models/ticket.ts');
const mixedFormTemplateText = fs.readFileSync(mixedFormTemplatePath, 'utf8');
const mixedFormModelText = fs.readFileSync(mixedFormModelPath, 'utf8');
const typecheckingCorpusRoot = path.join(packageRoot, 'fixtures/pressure/template-typechecking-corpus');
const typecheckingCorpusTemplatePath = path.join(typecheckingCorpusRoot, 'src/read-expressions.html');
const typecheckingCorpusTemplateText = fs.readFileSync(typecheckingCorpusTemplatePath, 'utf8');
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
const accessUseRoot = path.join(packageRoot, 'fixtures/pressure/runtime-expression-access-uses');
const accessUseTemplatePath = path.join(accessUseRoot, 'src/runtime-expression-access-uses-app.html');
const accessUseTemplateText = fs.readFileSync(accessUseTemplatePath, 'utf8');
const bindingLifecycleRoot = path.join(packageRoot, 'fixtures/pressure/observation-binding-lifecycle');
const bindingLifecycleTemplatePath = path.join(
  bindingLifecycleRoot,
  'src/observation-binding-lifecycle-app.html',
);
const bindingLifecycleDefinitionPath = path.join(
  bindingLifecycleRoot,
  'src/observation-binding-lifecycle-app.ts',
);
const bindingLifecycleTemplateText = fs.readFileSync(bindingLifecycleTemplatePath, 'utf8');
const bindingLifecycleDefinitionText = fs.readFileSync(bindingLifecycleDefinitionPath, 'utf8');

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
assertExactReferenceAnswer(rootTitleReferences);
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
assertExactReferenceAnswer(resourceReferences);
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
  storeKey: 'contract:template-references:parent-bound-specialization',
});
const typecheckingCorpusRuntime = await createSemanticRuntime({
  workspaceRoot: typecheckingCorpusRoot,
  storeKey: 'contract:template-references:open-member-self-row',
});
const aliasedBindableRuntime = await createSemanticRuntime({
  workspaceRoot: aliasedBindableRoot,
  storeKey: 'contract:template-references:aliased-bindables',
});
const specializedMemberReferences = await mixedFormRuntime.answerAppQuery({
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
assertExactReferenceAnswer(specializedMemberReferences);
assert.equal(specializedMemberReferences.coverage, 'complete', 'Reached parent-bound value types should completely cover child repeat-local member references.');
assert.equal(specializedMemberReferences.value.selectedMemberName, 'label');
const optionLabelMarkerStart = mixedFormTemplateText.indexOf('${option.label || option}');
assert.notEqual(optionLabelMarkerStart, -1, 'Expected option.label marker in mixed-form template.');
const optionLabelStart = optionLabelMarkerStart + '${option.'.length;
assert.equal(specializedMemberReferences.value.rows.length, 2, 'Specialized member references should include the template use and TypeScript declaration.');
const specializedMemberUse = specializedMemberReferences.value.rows.find((row) => row.referenceKind === 'template-usage');
assert.ok(specializedMemberUse, 'Expected the specialized option.label template occurrence.');
assert.equal(specializedMemberUse.source?.path?.replace(/\\/g, '/'), 'src/components/loose-picklist.html');
assert.equal(specializedMemberUse.source?.start, optionLabelStart);
assert.equal(specializedMemberUse.source?.end, optionLabelStart + 'label'.length);
const specializedMemberDeclaration = specializedMemberReferences.value.rows.find((row) => row.referenceKind === 'declaration');
assert.ok(specializedMemberDeclaration, 'Expected the specialized TicketOption.label declaration.');
const ticketOptionLabelStart = mixedFormModelText.indexOf('label', mixedFormModelText.indexOf('readonly label: string'));
assert.equal(specializedMemberDeclaration.source?.path?.replace(/\\/g, '/'), 'src/models/ticket.ts');
assert.equal(specializedMemberDeclaration.source?.start, ticketOptionLabelStart);
assert.equal(specializedMemberDeclaration.source?.end, ticketOptionLabelStart + 'label'.length);

const openMemberReferences = await typecheckingCorpusRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateReferences,
  sourceFilePath: typecheckingCorpusTemplatePath,
  cursor: cursorInsideSource(typecheckingCorpusTemplateText, typecheckingCorpusTemplatePath, '${unknownValue.label}', 'label', 1),
  includeDeclaration: true,
  detail: 'handles',
  page: { size: 20 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assertExactReferenceAnswer(openMemberReferences);
assert.equal(openMemberReferences.coverage, 'open', 'Unproven member references should not claim complete coverage.');
assert.equal(openMemberReferences.value.selectedMemberName, 'label');
const unknownLabelMarkerStart = typecheckingCorpusTemplateText.indexOf('${unknownValue.label}');
assert.notEqual(unknownLabelMarkerStart, -1, 'Expected unknownValue.label marker in typechecking corpus template.');
const unknownLabelStart = unknownLabelMarkerStart + '${unknownValue.'.length;
assert.equal(openMemberReferences.value.rows.length, 1, 'Unproven member references should return only the cursor occurrence.');
const openMemberRow = openMemberReferences.value.rows[0];
assert.equal(openMemberRow.referenceKind, 'template-usage');
assert.equal(openMemberRow.source?.path?.replace(/\\/g, '/'), 'src/read-expressions.html');
assert.equal(openMemberRow.source?.start, unknownLabelStart);
assert.equal(openMemberRow.source?.end, unknownLabelStart + 'label'.length);
assert.equal(openMemberRow.targetSource?.start, unknownLabelStart);
assert.equal(openMemberRow.targetSource?.end, unknownLabelStart + 'label'.length);
assert.equal(openMemberRow.handles?.targetSourceAddressHandle ?? null, null, 'Open self-row must not expose an unproven owner source as the target handle.');
assert.equal(
  openMemberReferences.value.candidateRows.length,
  0,
  'Closed same-name misses such as string-literal member access must not masquerade as open candidates.',
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
assertExactReferenceAnswer(labelTextPropertyReferences);
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
assertExactReferenceAnswer(labelTextTypeScriptPropertyReferences);
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
assertExactReferenceAnswer(productAliasReferences);
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
assertExactReferenceAnswer(inlineAliasReferences);
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

const accessUseRuntime = await createSemanticRuntime({
  workspaceRoot: accessUseRoot,
  storeKey: 'contract:template-references:access-use-authority',
});
const accessUseReferences = await accessUseRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateReferences,
  sourceFilePath: accessUseTemplatePath,
  cursor: cursorInsideSource(
    accessUseTemplateText,
    accessUseTemplatePath,
    'value.one-time="form.name"',
    'name',
    1,
  ),
  includeDeclaration: true,
  detail: 'handles',
  page: { size: 20 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assertExactReferenceAnswer(accessUseReferences);
assert.equal(accessUseReferences.coverage, 'complete');
assert.equal(accessUseReferences.value.selectedMemberName, 'name');
assert.equal(
  accessUseReferences.value.rows.length,
  10,
  'References should conserve every authored form.name occurrence, including untracked bindings and listeners.',
);
for (const marker of [
  'value.one-time="form.name"',
  'value.two-way="form.name | suffix',
  'click.trigger="handle(form.name)"',
  'click.trigger="form.name = fallbackName"',
]) {
  const nameStart = accessUseTemplateText.indexOf('name', accessUseTemplateText.indexOf(marker));
  const row = expectReference(
    accessUseReferences.value.rows,
    'template-usage',
    'src/runtime-expression-access-uses-app.html',
    nameStart,
    nameStart + 'name'.length,
    accessUseRoot,
  );
  assert.notEqual(
    row.handles?.accessUseProductHandles?.length ?? 0,
    0,
    `Expected ${marker} to retain its access-use authority.`,
  );
}
const unobservedRows = accessUseReferences.value.rows.filter((row) =>
  row.referenceKind === 'template-usage'
  && (row.handles?.observedDependencyProductHandles?.length ?? 0) === 0
);
assert.ok(
  unobservedRows.length >= 3,
  'One-time and listener occurrences should prove that references do not depend on observation rows.',
);
assert.ok(
  unobservedRows.every((row) => (row.handles?.accessUseProductHandles?.length ?? 0) > 0),
  'Every unobserved template reference must retain its authored access-use handle.',
);

const callbackLocalReferences = await accessUseRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateReferences,
  sourceFilePath: accessUseTemplatePath,
  cursor: cursorInsideSource(
    accessUseTemplateText,
    accessUseTemplatePath,
    'filter(item => item.label)',
    'item',
    1,
  ),
  includeDeclaration: true,
  detail: 'handles',
  page: { size: 20 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assertExactReferenceAnswer(callbackLocalReferences);
assert.equal(callbackLocalReferences.coverage, 'complete');
assert.equal(callbackLocalReferences.value.selectedMemberName, 'item');
assert.equal(callbackLocalReferences.value.rows.length, 2);
const filterParameterStart = sourceTokenStart(
  accessUseTemplateText,
  'filter(item => item.label)',
  'item',
);
const filterUsageStart = sourceTokenStart(
  accessUseTemplateText,
  'item => item.label',
  'item',
  2,
  1,
);
expectReference(
  callbackLocalReferences.value.rows,
  'declaration',
  'src/runtime-expression-access-uses-app.html',
  filterParameterStart,
  filterParameterStart + 'item'.length,
  accessUseRoot,
);
const callbackUsage = expectReference(
  callbackLocalReferences.value.rows,
  'template-usage',
  'src/runtime-expression-access-uses-app.html',
  filterUsageStart,
  filterUsageStart + 'item'.length,
  accessUseRoot,
);
assert.notEqual(
  callbackUsage.handles?.accessUseProductHandles?.length ?? 0,
  0,
  'Callback-local references should retain the exact access occurrence.',
);

const accessUseRows = await readAllRuntimeExpressionAccessUses(accessUseRuntime);
const rootThis = accessUseAt(
  accessUseRows,
  '${$this} / ${items.map',
  '$this',
);
const callbackThis = accessUseAt(
  accessUseRows,
  'items.map(item => $this).length',
  '$this',
);
const repeatThis = accessUseAt(
  accessUseRows,
  '${$this} / ${$parent}',
  '$this',
);
const repeatParent = accessUseAt(
  accessUseRows,
  '${$this} / ${$parent}',
  '$parent',
);
assert.equal(rootThis.targetResolution, 'exact');
assert.equal(callbackThis.targetResolution, 'exact');
assert.equal(repeatThis.targetResolution, 'exact');
assert.equal(repeatParent.targetResolution, 'exact');
assert.equal(rootThis.authoredScopeAncestor, 0);
assert.equal(rootThis.callbackScopeDepth, 0);
assert.equal(callbackThis.authoredScopeAncestor, 0);
assert.equal(callbackThis.callbackScopeDepth, 1);
const rootContextIdentity = rootThis.targetLinks[0]?.targetIdentityHandle ?? null;
assert.notEqual(rootContextIdentity, null, 'Root $this should retain a binding-context identity.');
assert.equal(
  callbackThis.targetLinks[0]?.targetIdentityHandle ?? null,
  rootContextIdentity,
  '$this inside an Aurelia arrow callback should still target the root binding context.',
);
assert.equal(
  repeatParent.targetLinks[0]?.targetIdentityHandle ?? null,
  rootContextIdentity,
  '$parent inside the repeat scope should target the root binding context.',
);
assert.notEqual(
  repeatThis.targetLinks[0]?.targetIdentityHandle ?? null,
  rootContextIdentity,
  '$this inside the repeat scope should target the repeated binding context.',
);
const converterArgumentUses = accessUsesAt(
  accessUseRows,
  'value.two-way="form.name | suffix:converterSuffix & debounce:behaviorDelay"',
  'converterSuffix',
);
const twoWayMemberUses = accessUsesAt(
  accessUseRows,
  'value.two-way="form.name | suffix:converterSuffix & debounce:behaviorDelay"',
  'name',
);
assert.equal(twoWayMemberUses.length, 2, 'Two-way member access should retain read and write operations.');
assert.equal(
  twoWayMemberUses[0]?.handles?.accessOccurrenceHandle,
  twoWayMemberUses[1]?.handles?.accessOccurrenceHandle,
  'Read and write interpretations should share one parse-owned member occurrence.',
);
assert.notEqual(
  twoWayMemberUses[0]?.handles?.accessResolutionHandle,
  twoWayMemberUses[1]?.handles?.accessResolutionHandle,
  'Read and write binding contexts must retain distinct target resolutions.',
);
assert.deepEqual(
  twoWayMemberUses.map((row) => row.role).sort(),
  ['read', 'write-target'],
);
assert.equal(converterArgumentUses.length, 2, 'Two-way converter argument should be spent in both directions.');
assert.deepEqual(
  converterArgumentUses.map((row) => row.phase).sort(),
  ['source-assignment', 'source-evaluation'],
);
assert.notEqual(
  converterArgumentUses[0]?.handles?.accessOccurrenceHandle ?? null,
  null,
  'Authored runtime uses should link to their parse-owned occurrence.',
);
assert.equal(
  converterArgumentUses[0]?.handles?.accessOccurrenceHandle,
  converterArgumentUses[1]?.handles?.accessOccurrenceHandle,
  'Both converter phases should reuse one authored token occurrence.',
);
assert.equal(
  converterArgumentUses[0]?.handles?.accessResolutionHandle,
  converterArgumentUses[1]?.handles?.accessResolutionHandle,
  'Both converter phases should reuse one binding-context target resolution.',
);
const converterArgumentReferences = await accessUseRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateReferences,
  sourceFilePath: accessUseTemplatePath,
  cursor: cursorInsideSource(
    accessUseTemplateText,
    accessUseTemplatePath,
    'suffix:converterSuffix',
    'converterSuffix',
  ),
  includeDeclaration: true,
  detail: 'handles',
  page: { size: 20 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assertExactReferenceAnswer(converterArgumentReferences);
const converterArgumentReference = converterArgumentReferences.value.rows.find((row) =>
  row.referenceKind === 'template-usage'
  && row.source?.path?.replace(/\\/g, '/') === 'src/runtime-expression-access-uses-app.html'
  && row.source.start === sourceTokenStart(
    accessUseTemplateText,
    'suffix:converterSuffix',
    'converterSuffix',
  )
);
assert.ok(converterArgumentReference != null, 'Expected a reference row for the converter argument.');
assert.equal(
  converterArgumentReference.handles?.accessUseProductHandles?.length ?? 0,
  2,
  'A reference row must conserve both runtime phases spending one binding-context resolution.',
);

const bindingLifecycleRuntime = await createSemanticRuntime({
  workspaceRoot: bindingLifecycleRoot,
  storeKey: 'contract:template-references:non-evaluated-authored-access',
});
const inertAttributeReferences = await bindingLifecycleRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateReferences,
  sourceFilePath: bindingLifecycleTemplatePath,
  cursor: cursorInsideSource(
    bindingLifecycleTemplateText,
    bindingLifecycleTemplatePath,
    'data-lifecycle.attr="attributeFromView & fromView"',
    'attributeFromView',
    1,
  ),
  includeDeclaration: true,
  detail: 'handles',
  page: { size: 20 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assertExactReferenceAnswer(inertAttributeReferences);
assert.equal(inertAttributeReferences.coverage, 'complete');
assert.equal(inertAttributeReferences.value.selectedMemberName, 'attributeFromView');
const inertAttributeStart = sourceTokenStart(
  bindingLifecycleTemplateText,
  'data-lifecycle.attr="attributeFromView & fromView"',
  'attributeFromView',
);
const convertedInertAttributeStart = sourceTokenStart(
  bindingLifecycleTemplateText,
  'data-converted-lifecycle.attr="attributeFromView | identityValue & fromView"',
  'attributeFromView',
);
const inertAttributeDeclarationStart = bindingLifecycleDefinitionText.indexOf('attributeFromView');
expectReference(
  inertAttributeReferences.value.rows,
  'template-usage',
  'src/observation-binding-lifecycle-app.html',
  inertAttributeStart,
  inertAttributeStart + 'attributeFromView'.length,
  bindingLifecycleRoot,
);
expectReference(
  inertAttributeReferences.value.rows,
  'template-usage',
  'src/observation-binding-lifecycle-app.html',
  convertedInertAttributeStart,
  convertedInertAttributeStart + 'attributeFromView'.length,
  bindingLifecycleRoot,
);
expectReference(
  inertAttributeReferences.value.rows,
  'declaration',
  'src/observation-binding-lifecycle-app.ts',
  inertAttributeDeclarationStart,
  inertAttributeDeclarationStart + 'attributeFromView'.length,
  bindingLifecycleRoot,
);
const inertTemplateRows = inertAttributeReferences.value.rows.filter(
  (row) => row.referenceKind === 'template-usage',
);
assert.equal(inertTemplateRows.length, 2);
assert.ok(
  inertTemplateRows.every((row) =>
    (row.handles?.accessUseProductHandles?.length ?? 0) === 0
    && row.handles?.accessOccurrenceHandle != null
    && row.handles?.accessResolutionHandle != null
  ),
  'Non-evaluated authored accesses should retain occurrence and resolution provenance without fabricating a runtime use.',
);
const bindingLifecycleAccessUses = await bindingLifecycleRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.RuntimeExpressionAccessUses,
  sourceFilePath: bindingLifecycleTemplatePath,
  detail: 'handles',
  page: { size: 500 },
  analysisDepth: 'binding-observation',
  includeAuthoringTemplates: true,
  appRetention: 'retain-app',
});
assertCompleteCollectionAnswer(bindingLifecycleAccessUses);
assert.ok(
  bindingLifecycleAccessUses.value.rows.every((row) =>
    row.nameSource?.path?.replace(/\\/g, '/') !== 'src/observation-binding-lifecycle-app.html'
    || row.nameSource.start !== inertAttributeStart
    || row.nameSource.end !== inertAttributeStart + 'attributeFromView'.length
  ),
  'Reference coverage must not turn a fromView-only attribute source into a runtime read.',
);

console.log(`Template references contract passed (${
  withDeclaration.value.rows.length
  + resourceReferences.value.rows.length
  + openMemberReferences.value.rows.length
  + labelTextPropertyReferences.value.rows.length
  + labelTextTypeScriptPropertyReferences.value.rows.length
  + productAliasReferences.value.rows.length
  + inlineAliasReferences.value.rows.length
  + accessUseReferences.value.rows.length
  + callbackLocalReferences.value.rows.length
  + inertAttributeReferences.value.rows.length
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
  assertExactReferenceAnswer(answer);
  return answer;
}

function assertExactReferenceAnswer(answer) {
  assert.equal(answer.result, 'answered', answer.summary);
  assert.equal(answer.selection, 'exact', answer.summary);
  assert.ok(
    answer.coverage === 'complete' || answer.coverage === 'open',
    `Expected complete or explicitly open reference coverage, observed ${answer.coverage}.`,
  );
}

function assertCompleteCollectionAnswer(answer) {
  assert.equal(answer.result, 'answered', answer.summary);
  assert.equal(answer.selection, 'not-applicable', answer.summary);
  assert.equal(answer.coverage, 'complete', answer.summary);
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

async function readAllRuntimeExpressionAccessUses(semanticRuntime) {
  const rows = [];
  let cursor = null;
  do {
    const answer = await semanticRuntime.answerAppQuery({
      kind: SemanticAppQueryKind.RuntimeExpressionAccessUses,
      sourceFilePath: accessUseTemplatePath,
      detail: 'handles',
      page: { size: 200, cursor },
      analysisDepth: 'binding-observation',
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
    });
    assertCompleteCollectionAnswer(answer);
    rows.push(...answer.value.rows);
    cursor = answer.page?.nextCursor ?? null;
  } while (cursor != null);
  return rows;
}

function accessUseAt(rows, marker, token) {
  const matches = accessUsesAt(rows, marker, token);
  const row = matches[0] ?? null;
  assert.ok(row, `Expected access use at ${marker} / ${token}.`);
  return row;
}

function accessUsesAt(rows, marker, token) {
  const start = sourceTokenStart(accessUseTemplateText, marker, token);
  return rows.filter((candidate) =>
    candidate.nameSource?.path?.replace(/\\/g, '/') === 'src/runtime-expression-access-uses-app.html'
    && candidate.nameSource?.start === start
    && candidate.nameSource?.end === start + token.length
  );
}

function sourceTokenStart(text, marker, token, occurrence = 1, markerOccurrence = 1) {
  let markerOffset = -1;
  for (let index = 0; index < markerOccurrence; index += 1) {
    markerOffset = text.indexOf(marker, markerOffset + 1);
    assert.notEqual(markerOffset, -1, `Expected marker: ${marker}`);
  }
  let tokenOffset = markerOffset - 1;
  for (let index = 0; index < occurrence; index += 1) {
    tokenOffset = text.indexOf(token, tokenOffset + 1);
    assert.notEqual(tokenOffset, -1, `Expected token ${token} in marker ${marker}.`);
  }
  assert.ok(tokenOffset < markerOffset + marker.length, `Token ${token} escaped marker ${marker}.`);
  return tokenOffset;
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
