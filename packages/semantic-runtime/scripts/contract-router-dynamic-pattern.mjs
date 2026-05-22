import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AuthoringVerificationRequest,
  createSemanticRuntime,
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
  readAuthoringVerificationSnapshot,
  verifyAuthoringEffects,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/router-dynamic-pattern');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'router-dynamic-pattern-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const expectedEffects = [
  ExpectedSemanticEffect.fact(
    'Static load object literals should materialize eager child route instructions with closed params.',
    'route',
    'route',
    null,
    'present',
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=coffee'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Static load instructions reached through keyed binding-source values should materialize like equivalent object literals.',
    'route',
    'route',
    null,
    'present',
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=tea'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.atLeast(
    'Router href methods and direct binary load bindings with static route prefixes should materialize recognized dynamic route facts.',
    'route',
    'route',
    2,
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=__au_dynamic_0__'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Bare external-module href values should stay as explicit router open seams until intent or value closure is known.',
    'open-seam',
    'app',
    null,
    'present',
    null,
    [
      effectFilter('seamKindKey', 'router.open-instruction'),
      effectFilter('reasonKinds', 'external-module-value'),
      effectFilter('reasonKinds', 'router-href-externality-open'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'Dynamic href classification should not publish router issues when the framework behavior is genuinely runtime-open.',
    'route',
    'route',
    null,
    [
      effectFilter('routeProductKind', 'router-issue'),
    ],
  ),
];

const snapshot = readAuthoringVerificationSnapshot(app);
const verification = verifyAuthoringEffects(
  new AuthoringVerificationRequest(null, expectedEffects),
  snapshot,
);
const failures = verification.effectResults
  .filter((result) => result.outcome !== 'satisfied')
  .map((result) => result.summary);

const summary = {
  fixture: 'router-dynamic-pattern',
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
