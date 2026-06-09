import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FixtureVerificationRequest,
  createSemanticRuntime,
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
  SemanticAppQueryKind,
  readFixtureVerificationSnapshot,
  verifyFixtureEffects,
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
  ExpectedSemanticEffect.fact(
    'Keyed load instructions reached through $this binding-context members should share the same static binding-source value path.',
    'route',
    'route',
    null,
    'present',
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=matcha'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Keyed load instructions reached through boundary this members should share the same static binding-source value path.',
    'route',
    'route',
    null,
    'present',
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=chamomile'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Inline array/object route instruction values should reduce through binding-source value flow before router consumption.',
    'route',
    'route',
    null,
    'present',
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=inline'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Conditional route instructions should use binding-source equality reduction before selecting a static branch.',
    'route',
    'route',
    null,
    'present',
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=jasmine'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Optional call route instructions should reduce nullish calls to undefined and allow nullish fallback selection.',
    'route',
    'route',
    null,
    'present',
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=oolong'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'New-expression route instructions should instantiate evaluator-local classes through binding-source value flow.',
    'route',
    'route',
    null,
    'present',
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=sencha'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Tagged-template route instructions should call evaluator-local tag functions with cooked string values.',
    'route',
    'route',
    null,
    'present',
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=genmaicha'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'DI-resolved state route href methods should reuse evaluator-local activation facts instead of treating resolve(...) as an external module boundary.',
    'route',
    'route',
    null,
    'present',
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=state-coffee'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Inline load route plus closed params multi-binding should materialize eager child route instructions with closed params.',
    'route',
    'route',
    null,
    'present',
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=espresso'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'Inline load route plus dynamic params must not treat the route id as the route parameter value.',
    'route',
    'route',
    null,
    [
      effectFilter('routeProductKind', 'route-node'),
      effectFilter('parameterValuePairs', 'productId=product-detail'),
    ],
  ),
  ExpectedSemanticEffect.atLeast(
    'Router href methods, receiver-aware object methods, direct binary load bindings, and repeated state-backed lookup methods with static route prefixes should materialize recognized dynamic route facts.',
    'route',
    'route',
    4,
    null,
    [
      effectFilter('routeProductKind', 'recognized-route'),
      effectFilter('parameterValuePairs', 'productId=__au_dynamic_0__'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Bare external-module href values with a non-current-window target should stay as explicit router open seams until intent or value closure is known.',
    'open-seam',
    'app',
    null,
    'present',
    null,
    [
      effectFilter('seamKindKey', 'router.open-instruction'),
      effectFilter('reasonKinds', 'external-module-value'),
      effectFilter('reasonKinds', 'router-href-externality-open'),
      effectFilter('reasonKinds', 'router-href-click-interception-target-open'),
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

const snapshot = readFixtureVerificationSnapshot(app);
const verification = verifyFixtureEffects(
  new FixtureVerificationRequest(null, expectedEffects),
  snapshot,
);
const failures = verification.effectResults
  .filter((result) => result.outcome !== 'satisfied')
  .map((result) => result.summary);
const typeScriptDiagnostics = app.ask({
  kind: SemanticAppQueryKind.TypeScriptDiagnostics,
  page: { size: 20 },
}).value;
const openSeams = app.ask({
  kind: SemanticAppQueryKind.OpenSeams,
  page: { size: 20 },
}).value;
const unresolvedVendorModuleDiagnostic = typeScriptDiagnostics.rows.find((row) =>
  row.diagnosticKind === 'TS2307'
  && row.message.includes('router-pressure-vendor-links')
);
const targetOpenReasonSource = openSeams.rows
  .flatMap((row) => row.reasonSources)
  .find((source) => source.reasonKind === 'router-href-click-interception-target-open');
const explicitExternalHrefOpenSeam = openSeams.rows.find((row) =>
  openSeamSourceTexts(row).some((text) => text.includes('explicitExternalHref'))
);

if (unresolvedVendorModuleDiagnostic != null) {
  failures.push('Expected no-tsconfig fallback checker roots to include local ambient module declarations.');
}
if (targetOpenReasonSource == null || targetOpenReasonSource.source == null) {
  failures.push('Expected router href target-open reason to preserve a source-bearing reasonSource row.');
}
if (explicitExternalHrefOpenSeam != null) {
  failures.push('Expected explicit external dynamic href values to bypass router instruction open seams.');
}

const summary = {
  fixture: 'router-dynamic-pattern',
  typeScriptDiagnosticRows: typeScriptDiagnostics.rows.length,
  openSeamRows: openSeams.rows.length,
  targetOpenReasonSource: targetOpenReasonSource == null ? null : {
    reasonKind: targetOpenReasonSource.reasonKind,
    hasSource: targetOpenReasonSource.source != null,
  },
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

function openSeamSourceTexts(row) {
  return [
    sourceReferenceText(row.source),
    ...row.reasonSources.map((source) => sourceReferenceText(source.source)),
  ].filter((text) => text.length > 0);
}

function sourceReferenceText(source) {
  if (source == null || source.path == null || source.start == null || source.end == null) {
    return '';
  }
  const sourcePath = path.join(fixtureRoot, source.path);
  if (!fs.existsSync(sourcePath)) {
    return '';
  }
  return fs.readFileSync(sourcePath, 'utf8').slice(source.start, source.end);
}
