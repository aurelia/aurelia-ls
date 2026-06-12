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
import { exactSourceSpanFailures } from './contract-source-span-assertions.mjs';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/resource-metadata-errors');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'runtime-watcher-expression-source-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const expectedEffects = [
  ExpectedSemanticEffect.fact(
    'Static property-key watches should materialize expression runtime watchers.',
    'runtime-watcher',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('watcherKind', 'expression'),
      effectFilter('expressionKind', 'property-key'),
      effectFilter('expressionPropertyKey', 'name'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Property-key watcher expressions should publish connectable observed dependencies.',
    'runtime-watcher-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('watcherKind', 'expression'),
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('expressionKind', 'AccessScope'),
      effectFilter('sourceName', 'name'),
    ],
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
const expressionWatchers = snapshot.runtimeWatchers.filter((watcher) =>
  watcher.watcherKind === 'expression' &&
  watcher.expressionKind === 'property-key' &&
  watcher.expressionPropertyKey === 'name'
);
if (expressionWatchers.length !== 2) {
  failures.push(`Expected exactly two static property-key expression watchers; observed ${expressionWatchers.length}.`);
}
failures.push(...exactSourceSpanFailures(snapshot.runtimeWatcherObservedDependencies, [
  {
    summary: 'First property-key expression watcher dependency should publish the exact string-body source span.',
    path: 'src/resource-metadata-errors-app.ts',
    match: { watchIndex: 0, sourceName: 'name' },
  },
  {
    summary: 'Second property-key expression watcher dependency should publish the exact string-body source span.',
    path: 'src/resource-metadata-errors-app.ts',
    match: { watchIndex: 1, sourceName: 'name' },
  },
]));

const summary = {
  fixture: 'resource-metadata-errors',
  expectedEffects: expectedEffects.length,
  expressionWatchers: expressionWatchers.length,
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
