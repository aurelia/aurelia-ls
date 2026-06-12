import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/i18n-translation-binding-errors');
const templatePath = path.join(fixtureRoot, 'src/i18n-translation-binding-errors-app.html');
const templateText = fs.readFileSync(templatePath, 'utf8');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:i18n-binding-lifecycle',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const diagnostics = app.ask({
  kind: SemanticAppQueryKind.TemplateDiagnostics,
  page: { size: 100 },
}).value.rows;
const i18nBindings = app.ask({
  kind: SemanticAppQueryKind.I18nTranslationBindings,
  page: { size: 100 },
}).value.rows;
const dataFlows = app.ask({
  kind: SemanticAppQueryKind.BindingDataFlows,
  page: { size: 100 },
}).value.rows;
const translationKeyCompletion = completionAtMemberDot('objectKey.');
const translationParamsCompletion = completionAtMemberDot('parameterObject.');

const failures = [];
const invalidKeyDiagnostics = diagnostics.filter((row) => row.frameworkErrorCode === 'AUR4002');
if (invalidKeyDiagnostics.length !== 2) {
  failures.push(`Expected exactly two i18n invalid-key diagnostics, got ${invalidKeyDiagnostics.length}.`);
}

const duplicateParameterDiagnostics = diagnostics.filter((row) => row.frameworkErrorCode === 'AUR4001');
if (duplicateParameterDiagnostics.length !== 1) {
  failures.push(`Expected one duplicate t-params diagnostic, got ${duplicateParameterDiagnostics.length}.`);
}

const missingKeyDiagnostics = diagnostics.filter((row) => row.frameworkErrorCode === 'AUR4000');
if (missingKeyDiagnostics.length !== 1) {
  failures.push(`Expected one missing translation key diagnostic, got ${missingKeyDiagnostics.length}.`);
}

if (!i18nBindings.some((row) =>
  row.hasParameterBinding === true
  && row.issueCount === 0
  && row.parameterSourceRootNames.includes('parameterName')
)) {
  failures.push('Expected a healthy i18n binding group with a state-scoped t-params member read.');
}

if (!dataFlows.some((row) =>
  row.bindingKind === 'translation-parameters'
  && row.sourceType === '{ name: string }'
)) {
  failures.push('Expected t-params.bind to participate in binding data-flow with the state-projected parameter object type.');
}

if (dataFlows.some((row) =>
  row.bindingKind === 'translation-parameters'
  && row.sourceType === '{ name: number }'
)) {
  failures.push('State-scoped t-params.bind should not be evaluated against the view-model parameterName number.');
}

if (!completionHasCandidate(translationKeyCompletion, 'viewName')) {
  failures.push('Dynamic t.bind key completion should use evaluate-only view-model scope and offer objectKey.viewName.');
}

if (completionHasCandidate(translationKeyCompletion, 'stateName')) {
  failures.push('Dynamic t.bind key completion must not apply & state source-scope effects.');
}

if (!completionHasCandidate(translationParamsCompletion, 'stateName')) {
  failures.push('t-params.bind completion should apply & state source-scope effects and offer parameterObject.stateName.');
}

if (completionHasCandidate(translationParamsCompletion, 'viewName')) {
  failures.push('t-params.bind completion should not evaluate the parameter object against the view-model scope.');
}

const summary = {
  diagnostics: diagnostics.map((row) => ({
    frameworkErrorCode: row.frameworkErrorCode,
    diagnosticKind: row.diagnosticKind,
    summary: row.summary,
  })),
  i18nBindings: i18nBindings.map((row) => ({
    keyExpressionKind: row.keyExpressionKind,
    hasParameterBinding: row.hasParameterBinding,
    parameterSourceRootNames: row.parameterSourceRootNames,
    parameterMemberNames: row.parameterMemberNames,
    issueCount: row.issueCount,
  })),
  translationDataFlows: dataFlows
    .filter((row) => row.bindingKind === 'translation' || row.bindingKind === 'translation-parameters')
    .map((row) => ({
      bindingKind: row.bindingKind,
      sourceRootName: row.sourceRootName,
      sourceName: row.sourceName,
      sourceType: row.sourceType,
      direction: row.direction,
    })),
  completions: {
    translationKey: completionSummary(translationKeyCompletion),
    translationParams: completionSummary(translationParamsCompletion),
  },
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function completionAtMemberDot(marker) {
  const markerOffset = templateText.indexOf(marker);
  if (markerOffset < 0) {
    return {
      answer: {
        outcome: 'missing-marker',
        value: { siteKind: null, missingInputs: [`missing-marker:${marker}`], candidates: [] },
      },
    };
  }
  const offset = markerOffset + marker.length;
  const before = templateText.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return app.ask({
    kind: SemanticAppQueryKind.TemplateCompletions,
    cursor: {
      filePath: 'src/i18n-translation-binding-errors-app.html',
      line: lines.length - 1,
      character: lines[lines.length - 1].length,
      offset,
    },
    page: { size: 20 },
  });
}

function completionHasCandidate(answer, name) {
  return answer.value.candidates.some((candidate) => candidate.name === name);
}

function completionSummary(answer) {
  return {
    outcome: answer.outcome,
    siteKind: answer.value.siteKind,
    missingInputs: answer.value.missingInputs,
    candidates: answer.value.candidates.map((candidate) => ({
      candidateKind: candidate.candidateKind,
      name: candidate.name,
      sourceKind: candidate.sourceKind,
      typeDisplay: candidate.typeDisplay,
    })),
  };
}
