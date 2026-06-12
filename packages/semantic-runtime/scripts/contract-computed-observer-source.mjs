import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FixtureVerificationRequest,
  createSemanticRuntime,
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
  readFixtureVerificationSnapshot,
  verifyFixtureEffects,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/computed-decorator-contexts');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'computed-observer-source-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const expectedEffects = [
  ExpectedSemanticEffect.exactly(
    'The fixture should expose eight getter observer sources: seven decorator-owned and one plain getter descriptor.',
    'computed-observer-source',
    'app',
    8,
    null,
    [],
    'signature',
  ),
  ExpectedSemanticEffect.exactly(
    'Plain configurable getter observation should use ComputedObserver through the getter descriptor path.',
    'computed-observer-source',
    'app',
    1,
    null,
    [
      effectFilter('observerKind', 'computed-observer'),
      effectFilter('triggerKind', 'accessor-descriptor'),
      effectFilter('memberName', 'plainTotal'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.exactly(
    'Explicit @computed getter dependencies should use ControlledComputedObserver through the getter-owned observer hook.',
    'computed-observer-source',
    'app',
    1,
    null,
    [
      effectFilter('observerKind', 'controlled-computed-observer'),
      effectFilter('triggerKind', 'getter-owned-observer'),
      effectFilter('dependencyMode', 'explicit-property-keys'),
      effectFilter('memberName', 'doubled'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.atLeast(
    'Plain getter proxy observation should read both value and another getter through the computed observer body.',
    'computed-observer-observed-dependency',
    'app',
    2,
    null,
    [
      effectFilter('observerKind', 'computed-observer'),
      effectFilter('memberName', 'plainTotal'),
      effectFilter('dependencyKind', 'proxy-property-read'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.exactly(
    'Template connectable reads of a plain getter should identify the observed member as an accessor.',
    'binding-observed-dependency',
    'template',
    1,
    null,
    [
      effectFilter('sourceName', 'plainTotal'),
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('observedMemberKind', 'accessor'),
      effectFilter('observedMemberSource.path', 'src/computed-decorator-contexts-app.ts'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.exactly(
    'The explicit string dependency should preserve an exact dependency-literal source row.',
    'computed-observer-observed-dependency',
    'app',
    1,
    null,
    [
      effectFilter('observerKind', 'controlled-computed-observer'),
      effectFilter('memberName', 'doubled'),
      effectFilter('sourceName', 'value'),
      effectFilter('dependencyKind', 'template-expression-read'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.atLeast(
    'Deep explicit computed dependencies should publish type-shaped nested property observer rows.',
    'computed-observer-observed-dependency',
    'app',
    1,
    null,
    [
      effectFilter('observerKind', 'controlled-computed-observer'),
      effectFilter('memberName', 'nestedSummary'),
      effectFilter('dependencyKind', 'deep-property-read'),
      effectFilter('sourceName', 'nested.detail'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.atLeast(
    'Deep explicit computed dependencies should publish collection observer rows for nested collection values.',
    'computed-observer-observed-dependency',
    'app',
    1,
    null,
    [
      effectFilter('observerKind', 'controlled-computed-observer'),
      effectFilter('memberName', 'nestedSummary'),
      effectFilter('dependencyKind', 'deep-collection-read'),
      effectFilter('sourceName', 'nested.tags'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.exactly(
    'A partially open explicit dependency declaration should still select ControlledComputedObserver.',
    'computed-observer-source',
    'app',
    1,
    null,
    [
      effectFilter('observerKind', 'controlled-computed-observer'),
      effectFilter('triggerKind', 'getter-owned-observer'),
      effectFilter('dependencyMode', 'open'),
      effectFilter('memberName', 'partiallyOpenDependency'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.exactly(
    'A partially open explicit dependency declaration should preserve its closed string dependency row.',
    'computed-observer-observed-dependency',
    'app',
    1,
    null,
    [
      effectFilter('observerKind', 'controlled-computed-observer'),
      effectFilter('memberName', 'partiallyOpenDependency'),
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'value'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'A partially open explicit dependency declaration should not fall back to getter-body proxy observation.',
    'computed-observer-observed-dependency',
    'app',
    null,
    [
      effectFilter('memberName', 'partiallyOpenDependency'),
      effectFilter('dependencyKind', 'proxy-property-read'),
    ],
  ),
  ExpectedSemanticEffect.exactly(
    'Mixed string and dependency-function declarations should keep the getter on the dependency-function controlled path.',
    'computed-observer-source',
    'app',
    1,
    null,
    [
      effectFilter('observerKind', 'controlled-computed-observer'),
      effectFilter('dependencyMode', 'dependency-function'),
      effectFilter('dependencyFunctionCount', 1),
      effectFilter('memberName', 'mixedDependency'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.atLeast(
    'Mixed string and dependency-function declarations should publish dependency-function proxy rows.',
    'computed-observer-observed-dependency',
    'app',
    1,
    null,
    [
      effectFilter('observerKind', 'controlled-computed-observer'),
      effectFilter('memberName', 'mixedDependency'),
      effectFilter('dependencyKind', 'proxy-property-read'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.exactly(
    'Mixed string and dependency-function declarations should preserve their string dependency rows too.',
    'computed-observer-observed-dependency',
    'app',
    1,
    null,
    [
      effectFilter('observerKind', 'controlled-computed-observer'),
      effectFilter('memberName', 'mixedDependency'),
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'value'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.exactly(
    'Nullish computed deps config should behave like omitted deps and select ComputedObserver.',
    'computed-observer-source',
    'app',
    1,
    null,
    [
      effectFilter('observerKind', 'computed-observer'),
      effectFilter('triggerKind', 'getter-owned-observer'),
      effectFilter('dependencyMode', 'proxy-auto-track'),
      effectFilter('memberName', 'nullishConfigDependency'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.atLeast(
    'Nullish computed deps config should proxy-observe the getter body.',
    'computed-observer-observed-dependency',
    'app',
    1,
    null,
    [
      effectFilter('observerKind', 'computed-observer'),
      effectFilter('memberName', 'nullishConfigDependency'),
      effectFilter('dependencyKind', 'proxy-property-read'),
      effectFilter('sourceName', 'this.value'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.exactly(
    'Decorator metadata should remain a separate definition lane and still include the method declaration.',
    'computed-observation-definition',
    'app',
    8,
    null,
    [],
    'signature',
  ),
];

const snapshot = readFixtureVerificationSnapshot(app);
const verification = verifyFixtureEffects(
  new FixtureVerificationRequest(null, expectedEffects),
  snapshot,
);
const failures = verification.effectResults
  .filter((result) => result.outcome !== 'satisfied')
  .map((result) => result.summary);

const summary = {
  fixture: 'computed-decorator-contexts',
  expectedEffects: expectedEffects.length,
  verification: verification.effectResults.map((result) => ({
    effectKind: result.expectedEffect.effectKind,
    outcome: result.outcome,
    summary: result.summary,
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function effectFilter(field, value) {
  return new ExpectedSemanticEffectFilter(field, value);
}
