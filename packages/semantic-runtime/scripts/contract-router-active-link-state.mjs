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
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/router-active-link-state');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'router-active-link-state-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const expectedEffects = [
  ExpectedSemanticEffect.fact(
    'Router activeClass should be visible as a router-options row for low-boilerplate active link styling.',
    'route',
    'route',
    null,
    'present',
    null,
    [
      effectFilter('routeProductKind', 'router-options'),
      effectFilter('activeClass', 'is-active'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'LoadCustomAttribute.active.bind should resolve to the router load controller active property.',
    'binding-target-access',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('targetKind', 'controller-view-model'),
      effectFilter('targetProperty', 'active'),
      effectFilter('strategy', 'setter-observer'),
      effectFilter('targetType', 'LoadCustomAttribute'),
      effectFilter('propertyType', 'boolean'),
      effectFilter('isObservable', true),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'LoadCustomAttribute.active.bind should publish a raw-property value channel.',
    'binding-value-channel',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('targetKind', 'controller-view-model'),
      effectFilter('targetProperty', 'active'),
      effectFilter('channelKind', 'raw-property'),
      effectFilter('runtimeValueType', 'boolean'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'LoadCustomAttribute.active.bind should assign active route state from the controller back into the app view-model.',
    'binding-data-flow',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('sourceName', 'homeActive'),
      effectFilter('direction', 'target-to-source'),
      effectFilter('targetKind', 'controller-view-model'),
      effectFilter('targetProperty', 'active'),
      effectFilter('valueChannelKind', 'raw-property'),
      effectFilter('sourceAssignmentKind', 'runtime-assignable'),
      effectFilter('targetToSourceAssignable', true),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'active.class should remain a normal class-toggle value channel over the active state when app state needs it.',
    'binding-data-flow',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('sourceName', 'settingsActive'),
      effectFilter('targetKind', 'node'),
      effectFilter('targetProperty', 'active'),
      effectFilter('valueChannelKind', 'class-toggle'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'Router active-link state fixture should close without open seams.',
    'open-seam-closure',
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
  fixture: 'router-active-link-state',
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
