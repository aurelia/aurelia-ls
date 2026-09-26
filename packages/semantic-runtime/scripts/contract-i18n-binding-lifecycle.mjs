import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import { instructionScopeLookup, runtimeBindingSourceExpression } from '../out/observation/runtime-binding-expression.js';
import { RuntimeBindingSourceExpressionContextProjector } from '../out/observation/runtime-binding-source-expression-context.js';

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
const converterApplications = app.ask({
  kind: SemanticAppQueryKind.ValueConverterApplications,
  page: { size: 100 },
}).value.rows;
const behaviorApplications = app.ask({
  kind: SemanticAppQueryKind.BindingBehaviorApplications,
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
  failures.push('Expected a healthy i18n binding group with a view-model t-params member read.');
}

if (!dataFlows.some((row) =>
  row.bindingKind === 'translation-parameters'
  && row.sourceType === '{ name: number }'
)) {
  failures.push('Expected t-params.bind & state to keep the view-model parameterName type: ParameterBinding has no useScope.');
}

for (const [expression, expected] of [
  ['parameterName & oneTime', 'untracked-read'],
  ['parameterName', 'connectable-read'],
  ["parameterName & signal:'refresh'", 'connectable-read'],
]) {
  const row = dataFlows.find((row) => row.bindingKind === 'state' && expressionText(row) === expression);
  if (row?.sourceEvaluationKind !== expected || row.sourceEvaluationReachability !== 'reached') {
    failures.push(`Expected state source '${expression}' to be reached as ${expected}.`);
  }
}
const parameterSignal = dataFlows.find((row) => expressionText(row) === "{ name: customerName } & signal:'refresh'");
if (parameterSignal?.sourceEvaluationReachability !== 'reached') {
  failures.push('ParameterBinding has handleChange and must accept signal at bind time.');
}
if (diagnostics.some((row) => ['AUR0817', 'AUR0101', 'AUR9996'].includes(row.frameworkErrorCode))) {
  failures.push('Concrete plugin capabilities must not produce false signal or evaluate-only binding-behavior errors.');
}
const parameterRates = behaviorApplications.filter((row) => row.bindingKind === 'translation-parameters'
  && ['throttle', 'debounce'].includes(row.behaviorName));
if (parameterRates.length !== 4 || parameterRates.some((row) => row.lifecycleEffects.effectKinds.length > 0)) {
  failures.push('ParameterBinding has no limit hook: throttle/debounce must not manufacture rate-limit effects or conflict.');
}
const phaseSplit = dataFlows.find((row) => row.bindingKind === 'attribute' && expressionText(row) === 'parameterName & state');
const phaseControl = dataFlows.find((row) => row.bindingKind === 'attribute' && expressionText(row) === 'parameterName');
const analysis = app.emission.templates.resources[0].runtimeAnalysis;
const phaseBinding = analysis.runtimeRendering.bindings.find((binding) => {
  if (binding.bindingKind !== 'attribute') return false;
  const expression = runtimeBindingSourceExpression(analysis.expressionWorld.projector.publication, binding);
  return expression != null && templateText.slice(expression.span.start, expression.span.end) === 'parameterName & state';
});
const phaseProjection = new RuntimeBindingSourceExpressionContextProjector(
  analysis.runtimeRendering,
  instructionScopeLookup(analysis.scopes.instructionScopes),
  analysis.scopes.bindingExpressionScopes,
  analysis.expressionResourcePlan,
).projectSource({
  binding: phaseBinding,
  expressionProductHandle: phaseBinding.expressionProductHandle,
  expressionChainIndex: 0,
  expression: runtimeBindingSourceExpression(analysis.expressionWorld.projector.publication, phaseBinding),
  localKey: 'contract:phase-dependent-state-scope',
});
if (phaseSplit?.sourceKind !== 'open' || !phaseSplit.sourceTypeOpenReason?.includes('initial evaluation')
  || phaseControl?.sourceType !== 'number' || phaseControl.sourceTypeOpenReason != null
  || phaseProjection.kind !== 'open' || !phaseProjection.openReason.includes('initial evaluation')) {
  failures.push('Only reached state behavior on AttributeBinding needs phase-dependent scope pressure.');
}
const keyConverters = converterApplications.filter((row) => row.bindingKind === 'translation' && row.converterName === 't');
if (!keyConverters.some((row) => row.phase === 'to-view')
  || keyConverters.some((row) => row.phase === 'bind' || row.bindReachability !== null)) {
  failures.push('Translation key converters evaluate without a fabricated astBind phase.');
}
const keyBehaviors = behaviorApplications.filter((row) => row.bindingKind === 'translation');
if (!keyBehaviors.some((row) => row.behaviorName === 'missingBehavior')
  || keyBehaviors.some((row) => row.phase !== 'unbind' || row.bindReachability !== null)) {
  failures.push('Translation-key behavior demand must survive for native astUnbind, without fabricating Bind reachability.');
}

if (!completionHasCandidate(translationKeyCompletion, 'viewName')) {
  failures.push('Dynamic t.bind key completion should use evaluate-only view-model scope and offer objectKey.viewName.');
}

if (completionHasCandidate(translationKeyCompletion, 'stateName')) {
  failures.push('Dynamic t.bind key completion must not apply & state source-scope effects.');
}

if (!completionHasCandidate(translationParamsCompletion, 'viewName')) {
  failures.push('t-params.bind completion should keep the view-model scope and offer parameterObject.viewName.');
}

if (completionHasCandidate(translationParamsCompletion, 'stateName')) {
  failures.push('t-params.bind completion must not fabricate a state source-scope handoff.');
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

function expressionText(row) {
  return row.expressionSource == null ? null : templateText.slice(row.expressionSource.start, row.expressionSource.end);
}

function completionHasCandidate(answer, name) {
  return answer.value.candidates.some((candidate) => candidate.name === name);
}

function completionSummary(answer) {
  return {
    result: answer.result,
    selection: answer.selection,
    coverage: answer.coverage,
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
