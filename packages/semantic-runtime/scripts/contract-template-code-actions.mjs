import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  diagnosticRepairAffordanceForSuggestion,
  readSemanticAppQueryCatalog,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/guidance-truth-canaries');
const templatePath = path.join(fixtureRoot, 'src/guidance-truth-canary-app.html');
const viewModelPath = path.join(fixtureRoot, 'src/guidance-truth-canary-app.ts');
const mixedFixtureRoot = path.join(packageRoot, 'fixtures/pressure/mixed-form-surfaces');
const mixedTemplatePath = path.join(mixedFixtureRoot, 'src/app.html');
const unregisteredPluginFixtureRoot = path.join(packageRoot, 'fixtures/pressure/unregistered-plugin-resources');
const unregisteredPluginTemplatePath = path.join(unregisteredPluginFixtureRoot, 'src/unregistered-plugin-resources-app.html');
const unregisteredPluginMainPath = path.join(unregisteredPluginFixtureRoot, 'src/main.ts');
const shorthandFixtureRoot = path.join(packageRoot, 'fixtures/pressure/unregistered-shorthand-syntax');
const shorthandTemplatePath = path.join(shorthandFixtureRoot, 'src/unregistered-shorthand-syntax-app.html');
const shorthandMainPath = path.join(shorthandFixtureRoot, 'src/main.ts');
const templateText = fs.readFileSync(templatePath, 'utf8');
const viewModelText = fs.readFileSync(viewModelPath, 'utf8');
const mixedTemplateText = fs.readFileSync(mixedTemplatePath, 'utf8');
const unregisteredPluginTemplateText = fs.readFileSync(unregisteredPluginTemplatePath, 'utf8');
const shorthandTemplateText = fs.readFileSync(shorthandTemplatePath, 'utf8');

const catalog = readSemanticAppQueryCatalog({ queryKind: SemanticAppQueryKind.TemplateCodeActions });
assert.equal(catalog.value.rows.length, 1, 'TemplateCodeActions should be in the public app-query catalog.');
assert.equal(catalog.value.rows[0].requiresCursor, true, 'TemplateCodeActions should require a source cursor.');
assert.equal(catalog.value.rows[0].supportsDiagnosticProjection, true, 'TemplateCodeActions should accept diagnostic projection policy.');
assert.equal(catalog.value.rows[0].minimumAnalysisDepth, 'binding-observation', 'TemplateCodeActions should require binding-observation facts.');
assert.equal(catalog.value.rows[0].materializationPolicy, 'query-type-projection', 'TemplateCodeActions should expose TypeChecker projection cost.');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:template-code-actions',
});

const titleTypoStart = templateText.indexOf('titel');
assert.notEqual(titleTypoStart, -1, 'Expected template canary member typo.');

const answer = await runtime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateCodeActions,
  sourceFilePath: templatePath,
  cursor: cursorAt(templatePath, templateText, titleTypoStart + 1),
  analysisDepth: 'binding-observation',
  diagnosticProjection: 'type-projection',
  includeAuthoringTemplates: true,
  appRetention: 'dispose-app',
});

assert.equal(answer.outcome, 'hit');
assert.equal(answer.value.rows.length, 1, 'Expected one code action at the missing root member.');

const action = answer.value.rows[0];
assert.equal(action.title, "Declare member 'titel' on GuidanceTruthCanaryApp");
assert.equal(action.kind, 'quickfix');
assert.equal(action.diagnostics.length, 1, 'The edit plan should retain its source diagnostic evidence.');
const actionDiagnostic = action.diagnostics[0];
assert.equal(actionDiagnostic.diagnosticKind, 'missing-expression-member');
assert.equal(actionDiagnostic.suggestion?.suggestionKind, 'declare-explicit-member');
assert.equal(actionDiagnostic.suggestion?.actionKind, 'declare-member');
assert.equal(actionDiagnostic.source?.path?.replace(/\\/g, '/'), 'src/guidance-truth-canary-app.html');
assert.equal(actionDiagnostic.source?.start, titleTypoStart);
assert.deepEqual(action.repair, diagnosticRepairAffordanceForSuggestion(actionDiagnostic.suggestion));
assert.equal(action.repair.actionability, 'guided');
assert.equal('editPlanState' in action.repair, false, 'Repair affordance must not claim edit-plan availability.');
assert.equal('applicationKind' in action.repair, false, 'The code-action row and non-empty edits carry application state.');
assert.equal(action.isPreferred, true);
assert.equal(action.edits.length, 1, 'Expected a single view-model insertion edit.');

const edit = action.edits[0];
assert.equal(edit.editKind, 'declare-view-model-member');
assert.ok(edit.source?.path != null, 'Expected code-action edit source path.');
assert.ok(samePath(edit.source.path, viewModelPath), `Expected edit to target ${viewModelPath}, got ${edit.source.path}.`);
assert.equal(edit.source.start, viewModelText.lastIndexOf('\n}'));
assert.equal(edit.source.end, viewModelText.lastIndexOf('\n}'));
assert.equal(edit.newText, '\n  titel!: unknown;');

const globalOffset = templateText.indexOf('console') + 1;
const unsupported = await runtime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateCodeActions,
  sourceFilePath: templatePath,
  cursor: cursorAt(templatePath, templateText, globalOffset),
  analysisDepth: 'binding-observation',
  diagnosticProjection: 'type-projection',
  includeAuthoringTemplates: true,
  appRetention: 'dispose-app',
});
assert.equal(unsupported.outcome, 'hit');
assert.equal(unsupported.value.rows.length, 0, 'Unsupported globals have suggestions but no conservative edit plan yet.');

const mixedRuntime = await createSemanticRuntime({
  workspaceRoot: mixedFixtureRoot,
  storeKey: 'contract:template-code-actions:mixed-form',
});
const weakMetadataStart = mixedTemplateText.indexOf('weakMetadata.source');
assert.notEqual(weakMetadataStart, -1, 'Expected mixed-form weakMetadata.source canary.');
const weakMetadataSource = weakMetadataStart + 'weakMetadata.'.length + 1;
const ownerTypeRepair = await mixedRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateCodeActions,
  sourceFilePath: mixedTemplatePath,
  cursor: cursorAt(mixedTemplatePath, mixedTemplateText, weakMetadataSource),
  analysisDepth: 'binding-observation',
  diagnosticProjection: 'type-projection',
  includeAuthoringTemplates: true,
  appRetention: 'dispose-app',
});
assert.equal(ownerTypeRepair.outcome, 'hit');
assert.equal(ownerTypeRepair.value.rows.length, 0, 'Owner-type repairs must not be exposed as view-model member declarations.');

const unregisteredPluginRuntime = await createSemanticRuntime({
  workspaceRoot: unregisteredPluginFixtureRoot,
  storeKey: 'contract:template-code-actions:framework-registration',
});
const loadStart = unregisteredPluginTemplateText.indexOf('load="orders"');
assert.notEqual(loadStart, -1, 'Expected unregistered router load canary.');
const routerRegistration = await unregisteredPluginRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateCodeActions,
  sourceFilePath: unregisteredPluginTemplatePath,
  cursor: cursorAt(unregisteredPluginTemplatePath, unregisteredPluginTemplateText, loadStart + 1),
  analysisDepth: 'binding-observation',
  diagnosticProjection: 'type-projection',
  includeAuthoringTemplates: true,
  appRetention: 'dispose-app',
});
assert.equal(routerRegistration.outcome, 'hit');
assert.equal(routerRegistration.value.rows.length, 1, 'Expected one router registration code action.');
const routerAction = routerRegistration.value.rows[0];
assert.equal(routerAction.title, 'Register RouterConfiguration for router.default-resources');
assert.equal(routerAction.diagnostics.length, 1);
assert.equal(routerAction.repair.readiness, 'source-edit-policy-open');
assert.equal(routerAction.edits.length, 1, 'Router fixture already imports RouterConfiguration, so only the chain edit should remain.');
assertFrameworkRegistrationEdit(routerAction.edits[0], unregisteredPluginMainPath, '', '.register(RouterConfiguration)\n  ');

const shorthandRuntime = await createSemanticRuntime({
  workspaceRoot: shorthandFixtureRoot,
  storeKey: 'contract:template-code-actions:framework-registration-shorthand',
});
const shorthandStart = shorthandTemplateText.indexOf(':value');
assert.notEqual(shorthandStart, -1, 'Expected unregistered shorthand syntax canary.');
const shorthandRegistration = await shorthandRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.TemplateCodeActions,
  sourceFilePath: shorthandTemplatePath,
  cursor: cursorAt(shorthandTemplatePath, shorthandTemplateText, shorthandStart + 1),
  analysisDepth: 'binding-observation',
  diagnosticProjection: 'type-projection',
  includeAuthoringTemplates: true,
  appRetention: 'dispose-app',
});
assert.equal(shorthandRegistration.outcome, 'hit');
assert.equal(shorthandRegistration.value.rows.length, 1, 'Expected one shorthand registration code action.');
const shorthandAction = shorthandRegistration.value.rows[0];
assert.equal(shorthandAction.title, 'Register ShortHandBindingSyntax for runtime-html.short-hand-binding-syntax');
assert.equal(shorthandAction.diagnostics.length, 1);
assert.equal(shorthandAction.repair.readiness, 'source-edit-policy-open');
assert.equal(shorthandAction.edits.length, 2, 'Shorthand syntax should add an import and a register-chain edit.');
assertFrameworkRegistrationEdit(
  shorthandAction.edits[0],
  shorthandMainPath,
  '{ Aurelia, StandardConfiguration }',
  '{ Aurelia, StandardConfiguration, ShortHandBindingSyntax }',
);
assertFrameworkRegistrationEdit(shorthandAction.edits[1], shorthandMainPath, '', '.register(ShortHandBindingSyntax)\n  ');

console.log('Template code actions contract passed.');

function cursorAt(filePath, text, offset) {
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return {
    filePath,
    line: lines.length - 1,
    character: lines.at(-1).length,
    offset,
  };
}

function samePath(left, right) {
  return path.resolve(left).replace(/\\/g, '/').toLowerCase()
    === path.resolve(right).replace(/\\/g, '/').toLowerCase();
}

function assertFrameworkRegistrationEdit(edit, expectedPath, oldText, newText) {
  assert.equal(edit.editKind, 'register-framework-capability');
  assert.ok(edit.source?.path != null, 'Expected framework registration edit source path.');
  assert.ok(samePath(edit.source.path, expectedPath), `Expected edit to target ${expectedPath}, got ${edit.source.path}.`);
  assert.equal(edit.oldText, oldText);
  assert.equal(edit.newText, newText);
}
