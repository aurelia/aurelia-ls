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
const workspaceRoot = path.resolve(packageRoot, '../..');
const fixtureRoot = 'packages/semantic-runtime/fixtures/pressure/component-object-boundary';

const runtime = await createSemanticRuntime({
  workspaceRoot,
  storeKey: 'component-object-boundary-contract',
  projects: [{
    rootDir: fixtureRoot,
    projectKey: 'component-object-boundary',
  }],
});

const app = await runtime.openApp({
  projectKey: 'component-object-boundary',
  analysisDepth: 'binding-observation',
});

const expectedEffects = [
  ExpectedSemanticEffect.signatureFact(
    'Object boundary should flow a repeated Product into the child bindable.',
    'binding-data-flow',
    'template',
    'template-binding',
    'present',
    null,
    [
      effectFilter('definitionName', 'object-boundary-app'),
      effectFilter('sourceName', 'product'),
      effectFilter('sourceType', 'Product'),
      effectFilter('targetKind', 'controller-view-model'),
      effectFilter('targetProperty', 'product'),
      effectFilter('targetValueType', 'Product | null'),
    ],
  ),
  ExpectedSemanticEffect.signatureFact(
    'Child template should bind directly to the object member without a forwarding getter.',
    'binding-data-flow',
    'template',
    'template-binding',
    'present',
    null,
    [
      effectFilter('definitionName', 'product-summary-card'),
      effectFilter('sourceName', 'product.priceLabel'),
      effectFilter('sourceRootName', 'product'),
      effectFilter('sourceType', 'string'),
      effectFilter('targetProperty', 'textContent'),
    ],
  ),
  ExpectedSemanticEffect.signatureFact(
    'Child template observed dependencies should mark object getter reads as accessor members.',
    'binding-observed-dependency',
    'template',
    'template-binding',
    'present',
    null,
    [
      effectFilter('definitionName', 'product-summary-card'),
      effectFilter('sourceName', 'product.priceLabel'),
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('observedMemberKind', 'accessor'),
    ],
  ),
  ExpectedSemanticEffect.signatureFact(
    'Plain Product getter observation should be available without @computed metadata.',
    'computed-observer-source',
    'di',
    'state-model',
    'present',
    null,
    [
      effectFilter('memberName', 'priceLabel'),
      effectFilter('observerKind', 'computed-observer'),
      effectFilter('triggerKind', 'accessor-descriptor'),
      effectFilter('dependencyMode', 'proxy-auto-track'),
    ],
  ),
  ExpectedSemanticEffect.absent(
    'Object boundary fixture should not require open semantic seams.',
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

const topology = app.ask({
  kind: 'app-topology',
  includeTypeSurfaces: true,
}).value;
const objectBindableRows = topology.components
  .flatMap((component) => component.bindables.map((bindable) => ({
    component: component.className,
    bindable: bindable.name,
    valueType: bindable.valueType,
    effectiveValueTypeShapeKind: bindable.effectiveValueTypeShapeKind,
    valueTypeHasMembers: bindable.valueTypeHasMembers,
  })))
  .filter((row) => row.effectiveValueTypeShapeKind === 'class' || row.effectiveValueTypeShapeKind === 'object' || row.effectiveValueTypeShapeKind === 'interface');

if (objectBindableRows.length !== 1) {
  failures.push(`Expected exactly one object-shaped bindable row, received ${objectBindableRows.length}.`);
}

const summary = {
  fixture: 'component-object-boundary',
  expectedEffects: expectedEffects.length,
  objectBindableRows,
  verification: verification.effectResults.map((result) => ({
    effectKind: result.expectedEffect.effectKind,
    outcome: result.outcome,
    summary: result.summary,
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    summary,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary,
  }, null, 2));
}

function effectFilter(field, value) {
  return new ExpectedSemanticEffectFilter(field, value);
}
