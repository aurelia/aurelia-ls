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
  page: { size: 100 },
}).value.rows;

const failures = [
  effectCountExpectation(effects, 5),
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
    'Run effect should publish synchronous @observable getter reads from the active connectable window.',
    observedDependencies,
    'connectable-run',
    'observable-property-read',
    'this.state.tracker.coord',
  ),
].filter(Boolean);

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
    dependencyKind: row.dependencyKind,
    expressionKind: row.expressionKind,
    sourceName: row.sourceName,
    sourceRootName: row.sourceRootName,
    memberName: row.memberName,
    observedMemberKind: row.observedMemberKind,
    source: row.source?.label ?? null,
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
    && candidate.dependencyKind === dependencyKind
    && candidate.sourceName === sourceName
  );
  return row == null
    ? `${summary}: missing ${dependencyEvaluationKind}/${dependencyKind}/${sourceName}.`
    : null;
}
