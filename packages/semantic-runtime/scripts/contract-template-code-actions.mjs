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
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/guidance-truth-canaries');
const templatePath = path.join(fixtureRoot, 'src/guidance-truth-canary-app.html');
const viewModelPath = path.join(fixtureRoot, 'src/guidance-truth-canary-app.ts');
const templateText = fs.readFileSync(templatePath, 'utf8');
const viewModelText = fs.readFileSync(viewModelPath, 'utf8');

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
  cursor: cursorAt(titleTypoStart + 1),
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
assert.equal(action.diagnosticKind, 'missing-expression-member');
assert.equal(action.suggestionKind, 'declare-explicit-member');
assert.equal(action.actionKind, 'declare-member');
assert.equal(action.diagnosticSource?.path?.replace(/\\/g, '/'), 'src/guidance-truth-canary-app.html');
assert.equal(action.diagnosticSource?.start, titleTypoStart);
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
  cursor: cursorAt(globalOffset),
  analysisDepth: 'binding-observation',
  diagnosticProjection: 'type-projection',
  includeAuthoringTemplates: true,
  appRetention: 'dispose-app',
});
assert.equal(unsupported.outcome, 'hit');
assert.equal(unsupported.value.rows.length, 0, 'Unsupported globals have suggestions but no conservative edit plan yet.');

console.log(`Template code actions contract passed (${answer.value.rows.length} action row(s)).`);

function cursorAt(offset) {
  const before = templateText.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return {
    filePath: templatePath,
    line: lines.length - 1,
    character: lines.at(-1).length,
    offset,
  };
}

function samePath(left, right) {
  return path.resolve(left).replace(/\\/g, '/').toLowerCase()
    === path.resolve(right).replace(/\\/g, '/').toLowerCase();
}
