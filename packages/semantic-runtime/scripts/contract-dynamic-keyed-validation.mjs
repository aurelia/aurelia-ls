import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/dynamic-keyed-validation');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'dynamic-keyed-validation-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const bindingBehaviors = app.ask({
  kind: 'binding-behavior-applications',
  page: { size: 100 },
}).value.rows;
const dataFlows = app.ask({
  kind: 'binding-data-flows',
  page: { size: 100 },
}).value.rows;
const observedDependencies = app.ask({
  kind: 'binding-observed-dependencies',
  page: { size: 200 },
}).value.rows;
const templateDiagnostics = app.ask({
  kind: 'template-diagnostics',
  page: { size: 100 },
  diagnosticProjection: 'type-projection',
}).value.rows;
const validationIssues = app.ask({
  kind: 'validation-issues',
  page: { size: 100 },
}).value.rows;

const failures = [];

const validateBehaviors = bindingBehaviors.filter((row) =>
  row.definitionName === 'dynamic-keyed-validation-app'
  && row.behaviorName === 'validate'
  && row.targetKind === 'node'
  && row.targetProperty === 'value'
);
if (validateBehaviors.length !== 3) {
  failures.push(`Expected 3 validate binding-behavior applications; observed ${validateBehaviors.length}.`);
}

for (const sourceName of [
  'person[field]',
  'person[addressField][line1Field]',
  'person[addressField][lineField]',
]) {
  expectKeyedDataFlow(`${sourceName} should remain a runtime-assignable keyed validation source.`, sourceName);
  expectObservedDependency(`${sourceName} should publish an AccessKeyed observed dependency.`, sourceName);
}

if (templateDiagnostics.length !== 0) {
  failures.push(`Expected no template diagnostics for valid dynamic keyed validation; observed ${templateDiagnostics.length}.`);
}
if (validationIssues.length !== 0) {
  failures.push(`Expected no validation issues for valid dynamic keyed validation; observed ${validationIssues.length}.`);
}

const summary = {
  fixture: 'dynamic-keyed-validation',
  validateBehaviors: validateBehaviors.map((row) => ({
    targetProperty: row.targetProperty,
    argumentCount: row.argumentCount,
    source: row.source?.label ?? null,
  })),
  keyedDataFlows: dataFlows
    .filter((row) => row.sourceName?.startsWith('person[') === true)
    .map((row) => ({
      sourceName: row.sourceName,
      sourceKind: row.sourceKind,
      sourceType: row.sourceType,
      sourceWritable: row.sourceWritable,
      sourceAssignmentKind: row.sourceAssignmentKind,
      sourceToTargetAssignable: row.sourceToTargetAssignable,
      targetToSourceAssignable: row.targetToSourceAssignable,
      frameworkErrorCode: row.frameworkErrorCode,
      openReason: row.openReason,
    })),
  keyedObservedDependencies: observedDependencies
    .filter((row) => row.sourceName?.startsWith('person[') === true)
    .map((row) => ({
      sourceName: row.sourceName,
      expressionKind: row.expressionKind,
      keyExpression: row.keyExpression,
      observedMemberSourceState: row.observedMemberSourceState,
      source: row.source?.label ?? null,
    })),
  diagnostics: templateDiagnostics.length,
  validationIssues: validationIssues.length,
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function expectKeyedDataFlow(message, sourceName) {
  const row = dataFlows.find((candidate) =>
    candidate.definitionName === 'dynamic-keyed-validation-app'
    && candidate.sourceName === sourceName
  );
  if (row == null) {
    failures.push(`${message}: missing binding-data-flow row.`);
    return;
  }
  const expected = {
    bindingKind: 'property',
    direction: 'two-way',
    sourceKind: 'keyed',
    sourceRootName: 'person',
    sourceType: 'string',
    sourceAssignmentTargetType: 'string',
    targetKind: 'node',
    targetProperty: 'value',
    targetValueType: 'string',
    valueChannelKind: 'raw-property',
    sourceWritable: true,
    sourceAssignmentKind: 'runtime-assignable',
    sourceToTargetAssignable: true,
    targetToSourceAssignable: true,
    frameworkErrorCode: null,
    openReason: null,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (row[field] !== value) {
      failures.push(`${message}: expected ${field}=${JSON.stringify(value)}, observed ${JSON.stringify(row[field])}.`);
    }
  }
}

function expectObservedDependency(message, sourceName) {
  const row = observedDependencies.find((candidate) =>
    candidate.definitionName === 'dynamic-keyed-validation-app'
    && candidate.sourceName === sourceName
    && candidate.expressionKind === 'AccessKeyed'
  );
  if (row == null) {
    failures.push(`${message}: missing binding-observed-dependency row.`);
    return;
  }
  if (row.sourceRootName !== 'person') {
    failures.push(`${message}: expected sourceRootName=person, observed ${JSON.stringify(row.sourceRootName)}.`);
  }
  if (row.observedMemberSourceState !== 'source') {
    failures.push(`${message}: expected observedMemberSourceState=source, observed ${JSON.stringify(row.observedMemberSourceState)}.`);
  }
}
