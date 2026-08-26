import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/source-observation-effects');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'runtime-effect-observation-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const effects = app.ask({
  kind: 'runtime-effects',
  page: { size: 100 },
}).value.rows;
const observedDependencies = app.ask({
  kind: 'runtime-effect-observed-dependencies',
  detail: 'handles',
  page: { size: 100 },
}).value.rows;

const failures = [
  effectCountExpectation(effects, 8),
  effectExpectation(
    'Run effect should use the RunEffect connectable branch and execute immediately.',
    effects,
    'connectable-run',
    true,
  ),
  effectExpectation(
    'Function getter watch should use the ObserverLocator function-key branch and run immediately by default.',
    effects,
    'observer-locator-function-key',
    true,
  ),
  effectExpectation(
    'String expression watch should use astEvaluate through getExpressionObserver and preserve immediate:false.',
    effects,
    'ast-evaluate',
    false,
  ),
  openEffectExpectation(
    'Dynamic watch expression should preserve the source effect but leave dependency evaluation open.',
    effects,
  ),
  dependencyExpectation(
    'Function getter watch should publish a proxy-observed property read for the getter body.',
    observedDependencies,
    'observer-locator-function-key',
    'proxy-property-read',
    'profile.name',
  ),
  dependencyExpectation(
    'Container.get(IObservation).watch should use TypeChecker-backed container recognition, not a .get-name heuristic.',
    observedDependencies,
    'observer-locator-function-key',
    'proxy-property-read',
    'profile.address.city',
  ),
  dependencyExpectation(
    'String expression watch should publish a template-expression read for the expression observer path.',
    observedDependencies,
    'ast-evaluate',
    'template-expression-read',
    'address.city',
  ),
  dependencyExpectation(
    'Resolver-wrapped static inject should expose IObservation through the canonical class dependency plan.',
    observedDependencies,
    'observer-locator-function-key',
    'proxy-property-read',
    'status.label',
  ),
  dependencyExpectation(
    'Run effect should publish synchronous @observable getter reads from the active connectable window.',
    observedDependencies,
    'connectable-run',
    'observable-property-read',
    'this.state.tracker.coord',
  ),
  nestedAccessUseHandleExpectation(
    'Detailed source-effect dependencies should retain handles on nested access-use targets.',
    observedDependencies,
    'status.label',
  ),
].filter(Boolean);
const getterCollection = observedDependencies.find((row) =>
  row.dependencyEvaluationKind === 'observer-locator-function-key'
    && row.occurrence.dependencyKind === 'proxy-collection-read'
    && row.occurrence.methodName === 'filter'
);
if (
  getterCollection?.occurrence.accessUse.accessForm !== 'member-call'
  || getterCollection.occurrence.accessUse.role !== 'call'
) {
  failures.push('Getter-based source effects should retain the authored filter member-call access.');
}
const expressionCollection = observedDependencies.find((row) =>
  row.dependencyEvaluationKind === 'ast-evaluate'
    && row.occurrence.dependencyKind === 'template-collection-read'
    && row.occurrence.methodName === 'filter'
);
if (
  expressionCollection?.occurrence.accessUse.accessForm !== 'member-call'
  || expressionCollection.occurrence.accessUse.role !== 'call'
) {
  failures.push('String source effects should retain the authored filter member-call access.');
}

const summary = {
  fixture: 'source-observation-effects',
  effects: effects.map((row) => ({
    effectKind: row.effectKind,
    dependencyEvaluationKind: row.dependencyEvaluationKind,
    immediate: row.immediate,
    observedDependencies: row.observedDependencies,
    source: row.source?.label ?? null,
  })),
  observedDependencies: observedDependencies.map((row) => ({
    dependencyEvaluationKind: row.dependencyEvaluationKind,
    dependencyKind: row.occurrence.dependencyKind,
    expressionKind: row.occurrence.expressionKind,
    sourceName: row.occurrence.sourceName,
    sourceRootName: row.occurrence.sourceRootName,
    memberName: row.occurrence.memberName,
    observedMemberKind: row.occurrence.observedMemberKind,
    source: row.occurrence.source?.label ?? null,
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function effectCountExpectation(rows, count) {
  return rows.length === count
    ? null
    : `Expected ${count} source-level runtime effects; observed ${rows.length}.`;
}

function effectExpectation(summary, rows, dependencyEvaluationKind, immediate) {
  const row = rows.find((candidate) =>
    candidate.dependencyEvaluationKind === dependencyEvaluationKind
  );
  if (row == null) {
    return `${summary}: missing ${dependencyEvaluationKind} effect.`;
  }
  if (row.immediate !== immediate) {
    return `${summary}: expected immediate=${immediate}, got ${row.immediate}.`;
  }
  if (row.observedDependencies < 1) {
    return `${summary}: expected at least one observed dependency.`;
  }
  return null;
}

function openEffectExpectation(summary, rows) {
  const row = rows.find((candidate) =>
    candidate.effectKind === 'watch'
    && candidate.dependencyEvaluationKind === 'open'
  );
  if (row == null) {
    return `${summary}: missing open watch effect.`;
  }
  if (row.immediate !== true) {
    return `${summary}: expected immediate=true, got ${row.immediate}.`;
  }
  if (row.observedDependencies !== 0) {
    return `${summary}: expected no observed dependencies, got ${row.observedDependencies}.`;
  }
  return null;
}

function dependencyExpectation(summary, rows, dependencyEvaluationKind, dependencyKind, sourceName) {
  const row = rows.find((candidate) =>
    candidate.dependencyEvaluationKind === dependencyEvaluationKind
    && candidate.occurrence.dependencyKind === dependencyKind
    && candidate.occurrence.sourceName === sourceName
  );
  return row == null
    ? `${summary}: missing ${dependencyEvaluationKind}/${dependencyKind}/${sourceName}.`
    : null;
}

function nestedAccessUseHandleExpectation(summary, rows, sourceName) {
  const row = rows.find((candidate) => candidate.occurrence.sourceName === sourceName);
  return row?.occurrence.accessUse?.targetLinks?.some((target) =>
    target.authorityProductHandle != null
    && target.targetIdentityHandle != null
    && target.declarationSourceAddressHandle != null
  )
    ? null
    : summary;
}
